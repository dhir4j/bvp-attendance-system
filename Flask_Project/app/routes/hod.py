
from flask import Blueprint, request, jsonify, session
from ..models import Staff, Subject, Assignment, Batch, Student, AttendanceRecord, TotalLectures, HOD
from .. import db, bcrypt
from ..auth import hod_required
from sqlalchemy import or_
from datetime import datetime

hod_bp = Blueprint('hod', __name__)

@hod_bp.route('/login', methods=['POST'])
def hod_login():
    data = request.json
    hod_staff = Staff.query.filter_by(username=data['username']).first()

    if not hod_staff:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Check if this staff member is an HOD
    hod_details = HOD.query.filter_by(staff_id=hod_staff.id).first()
    if not hod_details:
        return jsonify({'error': 'You are not registered as an HOD.'}), 403

    if bcrypt.check_password_hash(hod_staff.password_hash, data['password']):
        session['role'] = 'hod'
        session['hod_id'] = hod_details.id
        session['staff_id'] = hod_staff.id
        session['department_code'] = hod_details.dept_code
        session['staff_full_name'] = hod_staff.full_name
        
        return jsonify({
            'message': 'HOD Login successful',
            'full_name': hod_staff.full_name,
            'department_code': hod_details.dept_code
        })
    return jsonify({'error':'Invalid credentials'}), 401

# --- Department-Scoped Read Operations ---

@hod_bp.route('/subjects', methods=['GET'])
@hod_required
def get_hod_subjects():
    dept_code = session['department_code']
    subjects = Subject.query.filter_by(dept_code=dept_code).order_by(Subject.subject_name).all()
    result = [{
        'id': sub.id, 'course_code': sub.course_code, 'dept_code': sub.dept_code,
        'semester_number': sub.semester_number, 'subject_code': sub.subject_code,
        'subject_name': sub.subject_name
    } for sub in subjects]
    return jsonify(result), 200

@hod_bp.route('/batches', methods=['GET'])
@hod_required
def get_hod_batches():
    # HOD needs to see all batches to assign them, but can only manage students of their dept.
    # The frontend can filter by department name if needed.
    # For now, return all batches. A stricter implementation could filter by dept_name.
    batches = Batch.query.order_by(Batch.dept_name, Batch.semester, Batch.class_number).all()
    result = [{
        'id': b.id, 'dept_name': b.dept_name, 'class_number': b.class_number,
        'academic_year': b.academic_year, 'semester': b.semester,
        'student_count': len(b.students)
    } for b in batches]
    return jsonify(result)


@hod_bp.route('/staff', methods=['GET'])
@hod_required
def get_all_staff_for_hod():
    # HOD can view all staff to assign them to subjects in their department.
    staff = Staff.query.order_by(Staff.full_name).all()
    result = [{'id': s.id, 'username': s.username, 'full_name': s.full_name} for s in staff]
    return jsonify(result), 200


# --- Department-Scoped Write/Update Operations ---

@hod_bp.route('/subjects', methods=['POST'])
@hod_required
def create_hod_subject():
    dept_code = session['department_code']
    data = request.json or {}
    
    # Enforce department scope
    if data.get('dept_code') != dept_code:
        return jsonify({'error': f"You can only add subjects to your department ({dept_code})."}), 403

    for field in ('course_code','semester_number','subject_code','subject_name'):
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    
    sub = Subject(
        course_code=data['course_code'], dept_code=dept_code,
        semester_number=data['semester_number'], subject_code=data['subject_code'],
        subject_name=data['subject_name']
    )
    db.session.add(sub)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'That subject already exists'}), 400
    return jsonify({'message': 'Subject added', 'id': sub.id}), 201

@hod_bp.route('/subjects/<int:sub_id>', methods=['PUT'])
@hod_required
def update_hod_subject(sub_id):
    dept_code = session['department_code']
    sub = Subject.query.get_or_404(sub_id)

    if sub.dept_code != dept_code:
        return jsonify({'error': 'You cannot modify subjects outside your department.'}), 403

    data = request.json or {}
    if 'subject_name' in data:
        sub.subject_name = data['subject_name']
    if 'subject_code' in data:
        sub.subject_code = data['subject_code']
    db.session.commit()
    return jsonify({'message': 'Subject updated'}), 200

# HODs can't delete subjects directly, should be an admin task to prevent data loss.
# If deletion is needed, the logic from admin route can be copied here with the dept check.

@hod_bp.route('/assignments', methods=['GET', 'POST'])
@hod_required
def manage_hod_assignments():
    dept_code = session['department_code']
    if request.method == 'GET':
        assignments = db.session.query(
            Assignment, Staff.full_name, Subject.subject_name, Subject.subject_code, 
            Batch.dept_name, Batch.class_number, Batch.academic_year, Batch.semester
        ).join(Staff, Assignment.staff_id == Staff.id)\
         .join(Subject, Assignment.subject_id == Subject.id)\
         .join(Batch, Assignment.batch_id == Batch.id)\
         .filter(Subject.dept_code == dept_code).all() # Filter by HOD's department

        result = []
        for a, staff_name, subject_name, subject_code, dept_name, class_number, academic_year, semester in assignments:
            batch_name = f"{dept_name} {class_number} ({academic_year} Sem {semester})"
            result.append({
                'id': a.id, 'staff_id': a.staff_id, 'staff_name': staff_name,
                'subject_id': a.subject_id, 'subject_name': f"{subject_name} ({subject_code})",
                'batch_id': a.batch_id, 'batch_name': batch_name,
                'lecture_type': a.lecture_type, 'batch_number': a.batch_number,
            })
        return jsonify(result), 200
    
    # POST
    data = request.json or {}
    required_fields = ['staff_id', 'subject_id', 'batch_id', 'lecture_type']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    # Authorization Check: Can HOD assign this subject?
    subject = Subject.query.get(data['subject_id'])
    if not subject or subject.dept_code != dept_code:
        return jsonify({'error': "You can only create assignments for subjects in your department."}), 403

    # Check for duplicate assignment
    existing_assignment = Assignment.query.filter_by(
        subject_id=data['subject_id'], batch_id=data['batch_id'],
        lecture_type=data['lecture_type'], batch_number=data.get('batch_number')
    ).first()
    if existing_assignment:
        return jsonify({'error': 'This exact assignment already exists.'}), 409

    new_assignment = Assignment(
        staff_id=data['staff_id'], subject_id=data['subject_id'],
        batch_id=data['batch_id'], lecture_type=data['lecture_type'],
        batch_number=data.get('batch_number')
    )
    db.session.add(new_assignment)
    db.session.commit()
    return jsonify({'message': 'Assignment created', 'id': new_assignment.id}), 201

@hod_bp.route('/assignments/<int:assign_id>', methods=['DELETE'])
@hod_required
def delete_hod_assignment(assign_id):
    dept_code = session['department_code']
    assignment = Assignment.query.get_or_404(assign_id)
    
    # Authorization Check
    subject = Subject.query.get(assignment.subject_id)
    if not subject or subject.dept_code != dept_code:
        return jsonify({'error': "You cannot delete assignments outside your department."}), 403

    # Deletion logic (same as admin)
    AttendanceRecord.query.filter_by(assignment_id=assign_id).delete()
    TotalLectures.query.filter_by(assignment_id=assign_id).delete()
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({'message': 'Assignment deleted'}), 200

    