
from flask import Blueprint, request, jsonify, session
from ..models import Staff, Subject, Assignment, Batch, Student, AttendanceRecord, TotalLectures, HOD, Department
from .. import db, bcrypt
from ..auth import hod_required
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError, OperationalError
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
        session['staff_id'] = hod_staff.id # Also log in as staff
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
    # An HOD's department is identified by a code (e.g., 'AN'), but the Batch model stores the full department name (e.g., 'Animation').
    # We need to get the HOD's department name to filter the batches correctly.
    hod_dept_code = session.get('department_code')
    department = Department.query.filter_by(dept_code=hod_dept_code).first()

    if not department:
        return jsonify({'error': 'Could not determine HOD department.'}), 404

    hod_dept_name = department.dept_name
    
    # Filter batches by the HOD's department name
    batches = Batch.query.filter_by(dept_name=hod_dept_name).order_by(Batch.semester, Batch.class_number).all()
    result = [{
        'id': b.id, 'dept_name': b.dept_name, 'class_number': b.class_number,
        'academic_year': b.academic_year, 'semester': b.semester,
        'student_count': len(b.students)
    } for b in batches]
    return jsonify(result)


@hod_bp.route('/staff', methods=['GET', 'POST'])
@hod_required
def manage_hod_staff():
    if request.method == 'GET':
        staff = Staff.query.order_by(Staff.full_name).all()
        result = [{'id': s.id, 'username': s.username, 'full_name': s.full_name} for s in staff]
        return jsonify(result), 200
    
    # POST - HOD can add new staff
    data = request.json or {}
    if 'username' not in data or 'full_name' not in data:
        return jsonify({'error': 'Username and full_name are required'}), 400

    password = data.get('password')
    if not password:
        password = "defaultpassword"

    pwd_hash = bcrypt.generate_password_hash(password).decode()
    new_staff = Staff(
        username=data['username'],
        full_name=data['full_name'],
        password_hash=pwd_hash
    )
    db.session.add(new_staff)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Username already exists'}), 400
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500

    return jsonify({'message': 'Staff added', 'id': new_staff.id}), 201


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


# --- Read-only data for HOD panel ---

@hod_bp.route('/staff-assignments', methods=['GET'])
@hod_required
def get_staff_assignments_report():
    dept_code = session['department_code']
    
    assignments_query = db.session.query(
        Assignment, Staff, Subject, Batch
    ).join(Staff, Assignment.staff_id == Staff.id)\
     .join(Subject, Assignment.subject_id == Subject.id)\
     .join(Batch, Assignment.batch_id == Batch.id)\
     .filter(Subject.dept_code == dept_code)\
     .order_by(Staff.full_name, Subject.subject_name).all()

    staff_assignments = {}

    for assignment, staff, subject, batch in assignments_query:
        if staff.id not in staff_assignments:
            staff_assignments[staff.id] = {
                'staff_id': staff.id,
                'staff_name': staff.full_name,
                'assignments': []
            }
        
        staff_assignments[staff.id]['assignments'].append({
            'id': assignment.id,
            'subject_name': f"{subject.subject_name} ({subject.subject_code})",
            'batch_name': f"{batch.dept_name} {batch.class_number} ({batch.academic_year} Sem {batch.semester})",
            'lecture_type': assignment.lecture_type,
            'batch_number': assignment.batch_number
        })
    
    return jsonify(list(staff_assignments.values()))

@hod_bp.route('/attendance-report', methods=['GET'])
@hod_required
def get_attendance_report():
    # This logic is identical to the admin route, but we could add HOD-specific constraints if needed
    batch_id = request.args.get('batch_id')
    subject_id = request.args.get('subject_id')
    lecture_type = request.args.get('lecture_type')
    dept_code = session['department_code']

    if not all([batch_id, subject_id, lecture_type]):
        return jsonify({'error': 'batch_id, subject_id, and lecture_type are required'}), 400

    # Authorization check: Ensure the subject belongs to the HOD's department
    subject = Subject.query.get(subject_id)
    if not subject or subject.dept_code != dept_code:
        return jsonify({'error': 'You can only view reports for your department.'}), 403

    batch = Batch.query.get_or_404(batch_id)
    base_assignments_query = Assignment.query.filter_by(
        batch_id=batch_id,
        subject_id=subject_id,
        lecture_type=lecture_type
    )

    all_filtered_assignments = base_assignments_query.all()
    if not all_filtered_assignments:
        return jsonify([])

    report = []
    for student in batch.students:
        total_lectures = 0
        attended_lectures = 0
        
        student_specific_assignments = []
        if lecture_type == 'TH':
            student_specific_assignments = all_filtered_assignments
        else:
            if student.batch_number:
                student_specific_assignments = [a for a in all_filtered_assignments if a.batch_number == student.batch_number]

        if student_specific_assignments:
            assignment_ids = [a.id for a in student_specific_assignments]
            total_lectures = db.session.query(db.func.sum(TotalLectures.lecture_count)).filter(TotalLectures.assignment_id.in_(assignment_ids)).scalar() or 0
            attended_lectures = db.session.query(db.func.sum(AttendanceRecord.lecture_count)).filter(
                AttendanceRecord.assignment_id.in_(assignment_ids),
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.status == 'present'
            ).scalar() or 0

        percentage = (attended_lectures / total_lectures * 100) if total_lectures > 0 else 0
        
        if lecture_type == 'TH' or student.batch_number is not None:
             report.append({
                'student_id': student.id,
                'name': student.name,
                'roll_no': student.roll_no,
                'attended_lectures': attended_lectures,
                'total_lectures': total_lectures,
                'percentage': round(percentage, 2)
            })
    return jsonify(report)


@hod_bp.route('/subjects-by-batch/<int:batch_id>', methods=['GET'])
@hod_required
def get_subjects_by_batch(batch_id):
    dept_code = session['department_code']
    subjects = db.session.query(
        Subject.id, Subject.subject_name, Subject.subject_code
    ).join(Assignment, Subject.id == Assignment.subject_id)\
     .filter(Assignment.batch_id == batch_id)\
     .filter(Subject.dept_code == dept_code)\
     .distinct().all()
    
    result = [{'id': s.id, 'name': f"{s.subject_name} ({s.subject_code})"} for s in subjects]
    return jsonify(result)
    
@hod_bp.route('/attendance/session', methods=['GET'])
@hod_required
def get_attendance_for_session():
    # This logic is identical to the admin route, but we could add HOD-specific constraints if needed
    batch_id = request.args.get('batch_id')
    subject_id = request.args.get('subject_id')
    lecture_type = request.args.get('lecture_type')
    date_str = request.args.get('date')
    dept_code = session['department_code']

    if not all([batch_id, subject_id, lecture_type, date_str]):
        return jsonify({'error': 'All filter parameters are required'}), 400

    # Authorization check
    subject = Subject.query.get(subject_id)
    if not subject or subject.dept_code != dept_code:
        return jsonify({'error': 'Unauthorized to access this subject.'}), 403

    try:
        attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    assignments = Assignment.query.filter_by(
        batch_id=batch_id, subject_id=subject_id, lecture_type=lecture_type
    ).all()
    if not assignments:
        return jsonify({'error': 'No matching assignments found.'}), 404

    assignment_ids = [a.id for a in assignments]
    
    total_lectures_on_day = db.session.query(db.func.sum(TotalLectures.lecture_count)).filter(
        TotalLectures.assignment_id.in_(assignment_ids), TotalLectures.date == attendance_date
    ).scalar() or 0

    batch = Batch.query.get_or_404(batch_id)
    students = sorted(batch.students, key=lambda s: s.roll_no)
    
    records = AttendanceRecord.query.filter(
        AttendanceRecord.assignment_id.in_(assignment_ids), AttendanceRecord.date == attendance_date
    ).all()
    records_by_student = {r.student_id: r for r in records}

    result = []
    for s in students:
        record = records_by_student.get(s.id)
        assignment_for_student = None
        for a in assignments:
            if lecture_type == 'TH' or a.batch_number == s.batch_number:
                assignment_for_student = a
                break

        if assignment_for_student:
             result.append({
                'student_id': s.id, 'name': s.name, 'roll_no': s.roll_no,
                'status': record.status if record else 'absent',
                'attended_lectures': record.lecture_count if record else 0,
                'total_lectures': total_lectures_on_day,
                'assignment_id': record.assignment_id if record else assignment_for_student.id,
            })
    return jsonify(result)

@hod_bp.route('/attendance/session', methods=['POST'])
@hod_required
def update_attendance_for_session():
    data = request.json
    date_str = data.get('date')
    updates = data.get('updates', [])
    dept_code = session['department_code']

    if not date_str or not updates:
        return jsonify({'error': 'Date and updates are required'}), 400
        
    try:
        attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    # Authorization check for the first assignment to ensure it's in the HOD's department
    if updates:
        first_assignment_id = updates[0].get('assignment_id')
        assignment = Assignment.query.get(first_assignment_id)
        if not assignment:
             return jsonify({'error': 'Invalid assignment ID provided.'}), 400
        subject = Subject.query.get(assignment.subject_id)
        if not subject or subject.dept_code != dept_code:
            return jsonify({'error': 'You are not authorized to modify attendance for this department.'}), 403

    for update in updates:
        record = AttendanceRecord.query.filter_by(
            student_id=update['student_id'],
            assignment_id=update['assignment_id'],
            date=attendance_date
        ).first()
        
        attended_count = int(update.get('attended_lectures', 0))

        if record:
            record.lecture_count = attended_count
            record.status = 'present' if attended_count > 0 else 'absent'
        else:
            new_record = AttendanceRecord(
                student_id=update['student_id'],
                assignment_id=update['assignment_id'],
                date=attendance_date,
                status='present' if attended_count > 0 else 'absent',
                lecture_count=attended_count
            )
            db.session.add(new_record)

    db.session.commit()
    return jsonify({'message': 'Attendance updated successfully'}), 200
