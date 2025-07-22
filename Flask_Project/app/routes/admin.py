

from flask import Blueprint, request, jsonify, session
from sqlalchemy.exc import IntegrityError, OperationalError
from ..models import (
    Staff, Subject, Assignment, Department,
    Batch, Student, student_batches, TotalLectures, AttendanceRecord
)
from .. import db, bcrypt
from ..auth import admin_required
import csv
import io

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/login', methods=['POST'])
def admin_login():
    data = request.json or {}
    if data.get('username') == 'bvp@admin' and data.get('password') == 'bvp@pass':
        session['is_admin'] = True
        return jsonify({'message': 'Admin logged in'}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

# -- Staff CRUD --
@admin_bp.route('/staff', methods=['GET', 'POST'])
@admin_required
def manage_staff():
    if request.method == 'GET':
        result = [
            {'id': s.id, 'username': s.username, 'full_name': s.full_name}
            for s in Staff.query.all()
        ]
        return jsonify(result), 200

    # POST → create new staff
    data = request.json or {}
    if 'username' not in data or 'full_name' not in data:
        return jsonify({'error': 'Username and full_name are required'}), 400

    password = data.get('password') # Password is optional for creation now
    if not password:
        password = "defaultpassword" # Or any other logic you prefer

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


@admin_bp.route('/staff/<int:staff_id>', methods=['PUT', 'DELETE'])
@admin_required
def update_delete_staff(staff_id):
    staff = Staff.query.get_or_404(staff_id)

    if request.method == 'PUT':
        data = request.json or {}
        if 'full_name' in data:
            staff.full_name = data['full_name']
        if 'password' in data and data['password']:
            staff.password_hash = bcrypt.generate_password_hash(data['password']).decode()
        try:
            db.session.commit()
        except OperationalError:
            db.session.rollback()
            return jsonify({'error': 'Database connection error, please retry'}), 500
        return jsonify({'message': 'Staff updated'}), 200

    # DELETE
    db.session.delete(staff)
    try:
        db.session.commit()
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500
    return jsonify({'message': 'Staff deleted'}), 200

# -- Department CRUD --
@admin_bp.route('/departments', methods=['GET', 'POST'])
@admin_required
def manage_departments():
    if request.method == 'GET':
        result = [
            {'dept_code': d.dept_code, 'dept_name': d.dept_name}
            for d in Department.query.all()
        ]
        return jsonify(result), 200

    # POST → create new department
    data = request.json or {}
    for field in ('dept_code', 'dept_name'):
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    if Department.query.get(data['dept_code']):
        return jsonify({'error': 'Dept code already exists'}), 400

    dept = Department(dept_code=data['dept_code'], dept_name=data['dept_name'])
    db.session.add(dept)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Dept code already exists'}), 400
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500

    return jsonify({'message': 'Department added', 'dept_code': dept.dept_code}), 201

@admin_bp.route('/departments/<string:dept_code>', methods=['PUT', 'DELETE'])
@admin_required
def update_delete_department(dept_code):
    dept = Department.query.get_or_404(dept_code)

    if request.method == 'PUT':
        data = request.json or {}
        if 'dept_name' in data:
            dept.dept_name = data['dept_name']
        try:
            db.session.commit()
        except OperationalError:
            db.session.rollback()
            return jsonify({'error': 'Database connection error, please retry'}), 500
        return jsonify({'message': 'Department updated'}), 200

    # DELETE
    db.session.delete(dept)
    try:
        db.session.commit()
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500
    return jsonify({'message': 'Department deleted'}), 200

# -- Subject CRUD --
@admin_bp.route('/subjects', methods=['GET', 'POST'])
@admin_required
def manage_subjects():
    if request.method == 'GET':
        subjects = Subject.query.all()
        result = [{
            'id': sub.id,
            'course_code': sub.course_code,
            'dept_code': sub.dept_code,
            'semester_number': sub.semester_number,
            'subject_code': sub.subject_code,
            'subject_name': sub.subject_name
        } for sub in subjects]
        return jsonify(result), 200

    data = request.json or {}
    for field in ('course_code','dept_code','semester_number','subject_code','subject_name'):
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    if not Department.query.get(data['dept_code']):
        return jsonify({'error': f"Department '{data['dept_code']}' not found"}), 400

    sub = Subject(
        course_code     = data['course_code'],
        dept_code       = data['dept_code'],
        semester_number = data['semester_number'],
        subject_code    = data['subject_code'],
        subject_name    = data['subject_name']
    )
    db.session.add(sub)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'That subject already exists'}), 400
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500

    return jsonify({'message': 'Subject added', 'id': sub.id}), 201

@admin_bp.route('/subjects/<int:sub_id>', methods=['PUT', 'DELETE'])
@admin_required
def update_delete_subject(sub_id):
    sub = Subject.query.get_or_404(sub_id)

    if request.method == 'PUT':
        data = request.json or {}
        if 'subject_name' in data:
            sub.subject_name = data['subject_name']
        if 'subject_code' in data:
            sub.subject_code = data['subject_code']
        db.session.commit()
        return jsonify({'message': 'Subject updated'}), 200

    db.session.delete(sub)
    db.session.commit()
    return jsonify({'message': 'Subject deleted'}), 200

# -- Batch and Student Management --
@admin_bp.route('/batches', methods=['GET', 'POST'])
@admin_required
def manage_batches():
    if request.method == 'GET':
        batches = Batch.query.all()
        result = [{
            'id': b.id,
            'dept_name': b.dept_name,
            'class_number': b.class_number,
            'academic_year': b.academic_year,
            'semester': b.semester,
            'student_count': len(b.students)
        } for b in batches]
        return jsonify(result)

    # POST
    data = request.form
    
    # Check for existing batch to prevent UniqueViolation error
    existing_batch = Batch.query.filter_by(
        dept_name=data['dept_name'],
        class_number=data['class_number'],
        academic_year=data['academic_year'],
        semester=int(data['semester'])
    ).first()

    if existing_batch:
        return jsonify({'error': 'A batch with these details already exists.'}), 409

    new_batch = Batch(
        dept_name=data['dept_name'],
        class_number=data['class_number'],
        academic_year=data['academic_year'],
        semester=int(data['semester'])
    )
    db.session.add(new_batch)
    db.session.commit() # Commit to get the new_batch.id

    if 'student_csv' in request.files:
        file = request.files['student_csv']
        if file.filename != '':
            stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
            # Use DictReader to handle headers automatically
            csv_reader = csv.DictReader(stream)
            for row in csv_reader:
                student = Student.query.filter_by(enrollment_no=row['enrollment_no']).first()
                if not student:
                    student = Student(
                        roll_no=row['roll_no'],
                        enrollment_no=row['enrollment_no'],
                        name=row['name']
                    )
                    db.session.add(student)
                
                # Add/update batch_number if present in CSV
                if 'batch_number' in row and row['batch_number']:
                    try:
                        student.batch_number = int(row['batch_number'])
                    except (ValueError, TypeError):
                        # Handle cases where batch_number is not a valid integer
                        student.batch_number = None

                # Associate student with the batch
                new_batch.students.append(student)
            db.session.commit()

    return jsonify({'message': 'Batch created', 'id': new_batch.id}), 201


@admin_bp.route('/batches/<int:batch_id>', methods=['GET', 'DELETE'])
@admin_required
def manage_single_batch(batch_id):
    batch = Batch.query.get_or_404(batch_id)
    if request.method == 'GET':
        students = Student.query.join(student_batches).filter(student_batches.c.batch_id == batch_id).all()
        return jsonify({
            'id': batch.id,
            'dept_name': batch.dept_name,
            'class_number': batch.class_number,
            'academic_year': batch.academic_year,
            'semester': batch.semester,
            'students': [{'id': s.id, 'name': s.name, 'roll_no': s.roll_no, 'enrollment_no': s.enrollment_no, 'batch_number': s.batch_number} for s in students]
        })

    # DELETE
    # This will also delete associations in student_batches due to cascade settings
    db.session.delete(batch)
    db.session.commit()
    return jsonify({'message': 'Batch deleted'})


# -- Assignment CRUD --
@admin_bp.route('/assignments', methods=['GET', 'POST'])
@admin_required
def manage_assignments():
    if request.method == 'GET':
        assignments = db.session.query(
            Assignment, Staff.full_name, Subject.subject_name, Subject.subject_code, 
            Batch.dept_name, Batch.class_number, Batch.academic_year, Batch.semester
        ).join(Staff, Assignment.staff_id == Staff.id)\
         .join(Subject, Assignment.subject_id == Subject.id)\
         .join(Batch, Assignment.batch_id == Batch.id).all()

        result = []
        for a, staff_name, subject_name, subject_code, dept_name, class_number, academic_year, semester in assignments:
            batch_name = f"{dept_name} {class_number} ({academic_year} Sem {semester})"
            result.append({
                'id': a.id,
                'staff_id': a.staff_id,
                'staff_name': staff_name,
                'subject_id': a.subject_id,
                'subject_name': f"{subject_name} ({subject_code})",
                'batch_id': a.batch_id,
                'batch_name': batch_name,
                'lecture_type': a.lecture_type,
                'batch_number': a.batch_number,
            })
        return jsonify(result), 200

    data = request.json or {}
    required_fields = ['staff_id', 'subject_id', 'batch_id', 'lecture_type']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    # Check for duplicate assignment
    existing_assignment = Assignment.query.filter_by(
        subject_id=data['subject_id'],
        batch_id=data['batch_id'],
        lecture_type=data['lecture_type'],
        batch_number=data.get('batch_number') # This will be None if not provided, which is correct
    ).first()

    if existing_assignment:
        return jsonify({'error': 'This assignment (subject, batch, type, and sub-batch) already exists.'}), 409

    new_assignment = Assignment(
        staff_id=data['staff_id'],
        subject_id=data['subject_id'],
        batch_id=data['batch_id'],
        lecture_type=data['lecture_type'],
        batch_number=data.get('batch_number')
    )
    db.session.add(new_assignment)
    db.session.commit()
    return jsonify({'message': 'Assignment created', 'id': new_assignment.id}), 201

@admin_bp.route('/assignments/<int:assign_id>', methods=['DELETE'])
@admin_required
def delete_assignment(assign_id):
    assignment = Assignment.query.get_or_404(assign_id)
    
    # Manually delete dependent records before deleting the assignment
    try:
        AttendanceRecord.query.filter_by(assignment_id=assign_id).delete()
        TotalLectures.query.filter_by(assignment_id=assign_id).delete()
        
        db.session.delete(assignment)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete assignment and its related records', 'details': str(e)}), 500

    return jsonify({'message': 'Assignment deleted successfully'}), 200

# --- Attendance Reports ---
@admin_bp.route('/attendance-report', methods=['GET'])
@admin_required
def get_attendance_report():
    batch_id = request.args.get('batch_id')
    subject_id = request.args.get('subject_id')
    lecture_type = request.args.get('lecture_type')

    if not all([batch_id, subject_id, lecture_type]):
        return jsonify({'error': 'batch_id, subject_id, and lecture_type are required'}), 400

    batch = Batch.query.get_or_404(batch_id)
    
    # Base query for assignments, filtered by all required parameters from the start
    base_assignments_query = Assignment.query.filter_by(
        batch_id=batch_id,
        subject_id=subject_id,
        lecture_type=lecture_type
    )

    # All assignments that match the filter criteria
    all_filtered_assignments = base_assignments_query.all()
    if not all_filtered_assignments:
        return jsonify([]) # No assignments match, so return empty report

    report = []

    for student in batch.students:
        total_lectures = 0
        attended_lectures = 0
        
        # Determine which assignments apply to this specific student
        student_specific_assignments = []
        if lecture_type == 'TH':
            # Theory lectures apply to all students in the batch
            student_specific_assignments = all_filtered_assignments
        else: # For PR/TU, it only applies if the student is in a matching sub-batch
            if student.batch_number:
                student_specific_assignments = [
                    a for a in all_filtered_assignments if a.batch_number == student.batch_number
                ]

        if not student_specific_assignments:
            # This student has no lectures for this filtered type (e.g., they are not in a PR batch)
            # You might want to decide if they should appear in the report with 0/0 or be excluded.
            # Here we'll include them with 0/0.
            pass
        else:
            assignment_ids = [a.id for a in student_specific_assignments]

            # Calculate total lectures for this student's specific assignments
            total_lectures = db.session.query(db.func.sum(TotalLectures.lecture_count))\
                .filter(TotalLectures.assignment_id.in_(assignment_ids)).scalar() or 0

            # Calculate attended lectures for this student
            attended_lectures = db.session.query(db.func.sum(AttendanceRecord.lecture_count)).filter(
                AttendanceRecord.assignment_id.in_(assignment_ids),
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.status == 'present'
            ).scalar() or 0

        percentage = (attended_lectures / total_lectures * 100) if total_lectures > 0 else 0
        
        # Only include students in the report if they were supposed to have lectures of the specified type
        # This prevents students not in a practical batch from showing up in a 'PR' report
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


@admin_bp.route('/subjects-by-batch/<int:batch_id>', methods=['GET'])
@admin_required
def get_subjects_by_batch(batch_id):
    """
    Returns a list of unique subjects assigned to a specific batch.
    """
    subjects = db.session.query(
        Subject.id, Subject.subject_name, Subject.subject_code
    ).join(Assignment, Subject.id == Assignment.subject_id)\
     .filter(Assignment.batch_id == batch_id)\
     .distinct().all()
    
    result = [{'id': s.id, 'name': f"{s.subject_name} ({s.subject_code})"} for s in subjects]
    return jsonify(result)

@admin_bp.route('/staff-assignments', methods=['GET'])
@admin_required
def get_staff_assignments_report():
    # Query all assignments with staff, subject, and batch info
    assignments_query = db.session.query(
        Assignment, Staff, Subject, Batch
    ).join(Staff, Assignment.staff_id == Staff.id)\
     .join(Subject, Assignment.subject_id == Subject.id)\
     .join(Batch, Assignment.batch_id == Batch.id)\
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
    
    