

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
from datetime import datetime

admin_bp = Blueprint('admin', __name__)
#process multiple csv data in a dictonary instead of line by line.
def _process_student_csv(file_stream, batch_id):
    """
    Helper function to process a student CSV file and associate students with a batch.
    This version includes validation to prevent duplicate roll numbers both within
    the CSV and in the existing database.
    """
    try:
        content = file_stream.read().decode('utf-8-sig')
        stream = io.StringIO(content)
        reader = csv.reader(stream)

        try:
            header = [h.strip() for h in next(reader)]
        except StopIteration:
            return # Handle empty file

        students_to_associate = []
        processed_roll_nos = set()
        processed_enrollment_nos = set()

        # Create a list of dictionaries from the CSV rows
        student_data = [dict(zip(header, (cell.strip() for cell in row))) for row in reader]

        for i, row_data in enumerate(student_data, start=2): # start=2 for header row
            enrollment_no = row_data.get('enrollment_no')
            roll_no = row_data.get('roll_no')

            if not enrollment_no or not roll_no:
                continue

            if roll_no in processed_roll_nos:
                raise ValueError(f"Duplicate roll number '{roll_no}' found in CSV at row {i}.")
            if enrollment_no in processed_enrollment_nos:
                raise ValueError(f"Duplicate enrollment number '{enrollment_no}' found in CSV at row {i}.")

            processed_roll_nos.add(roll_no)
            processed_enrollment_nos.add(enrollment_no)

            # Check if a student with this enrollment number already exists
            student = Student.query.filter_by(enrollment_no=enrollment_no).first()

            if student:
                # Student exists. Check if the roll number in the CSV matches the one in the DB.
                if student.roll_no != roll_no:
                    raise ValueError(f"Student with enrollment '{enrollment_no}' (Row {i}) exists with a different roll no ('{student.roll_no}').")
            else:
                # Student doesn't exist by enrollment_no. Check if the roll_no is taken.
                existing_student_by_roll = Student.query.filter_by(roll_no=roll_no).first()
                if existing_student_by_roll:
                     raise ValueError(f"Roll number '{roll_no}' (Row {i}) already belongs to another student ('{existing_student_by_roll.name}').")

                # Create a new student if they don't exist by either identifier
                student = Student(
                    roll_no=roll_no,
                    enrollment_no=enrollment_no,
                    name=row_data.get('name')
                )
                db.session.add(student)

            # Update student details
            if 'name' in row_data and row_data['name']:
                student.name = row_data['name']
            if 'batch_number' in row_data and row_data['batch_number']:
                try:
                    student.batch_number = int(row_data['batch_number'])
                except (ValueError, TypeError):
                    student.batch_number = None

            students_to_associate.append(student)

        # Flush to get IDs for any new students
        db.session.flush()

        # Associate all processed students with the batch
        batch = Batch.query.get(batch_id)
        if batch:
            existing_student_ids = {s.id for s in batch.students}
            for student in students_to_associate:
                if student.id not in existing_student_ids:
                    batch.students.append(student)

        db.session.commit()

    except ValueError as e:
        db.session.rollback()
        raise e
    except (IntegrityError, OperationalError) as e:
        db.session.rollback()
        raise e
    except Exception as e:
        db.session.rollback()
        raise IOError(f"Failed to process CSV file: {e}")


# --- Admin Login/Logout ---
@admin_bp.route('/login', methods=['POST'])
def admin_login():
    data = request.json or {}
    # Use environment variables for admin credentials in a real app
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
    try:
        # Before deleting staff, delete their assignments and related records
        assignments_to_delete = Assignment.query.filter_by(staff_id=staff.id).all()
        for assignment in assignments_to_delete:
            AttendanceRecord.query.filter_by(assignment_id=assignment.id).delete()
            TotalLectures.query.filter_by(assignment_id=assignment.id).delete()
            db.session.delete(assignment)
            
        db.session.delete(staff)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Cannot delete staff as they are referenced elsewhere.'}), 400
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
    try:
        # Check if any subjects are linked to this department
        if Subject.query.filter_by(dept_code=dept_code).first():
            return jsonify({'error': 'Cannot delete department with subjects assigned to it.'}), 400
        
        db.session.delete(dept)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Cannot delete department as it is referenced elsewhere.'}), 400
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
        try:
            db.session.commit()
        except OperationalError:
            db.session.rollback()
            return jsonify({'error': 'Database connection error, please retry'}), 500
        return jsonify({'message': 'Subject updated'}), 200

    # DELETE
    try:
        # Before deleting subject, delete its assignments and related records
        assignments_to_delete = Assignment.query.filter_by(subject_id=sub.id).all()
        for assignment in assignments_to_delete:
            AttendanceRecord.query.filter_by(assignment_id=assignment.id).delete()
            TotalLectures.query.filter_by(assignment_id=assignment.id).delete()
            db.session.delete(assignment)

        db.session.delete(sub)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Cannot delete subject as it is referenced elsewhere.'}), 400
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500
        
    return jsonify({'message': 'Subject deleted'}), 200

# -- Batch and Student Management --
@admin_bp.route('/batches', methods=['GET', 'POST'])
@admin_required
def manage_batches():
    if request.method == 'GET':
        # ... (GET logic remains the same) ...
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
    
    try:
        # ... (Batch creation logic remains the same) ...
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
        db.session.commit()

        if 'student_csv' in request.files:
            file = request.files['student_csv']
            if file and file.filename != '':
                _process_student_csv(file.stream, new_batch.id)

        return jsonify({'message': 'Batch created', 'id': new_batch.id}), 201
    
    # --- CATCH BLOCK UPDATED ---
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400 # Catches the duplicate roll_no error
    except (IntegrityError, OperationalError) as e:
        db.session.rollback()
        return jsonify({'error': f'A database error occurred: {e}'}), 500
    except IOError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'An unexpected error occurred: {e}'}), 500


@admin_bp.route('/batches/<int:batch_id>', methods=['GET', 'DELETE'])
@admin_required
def manage_single_batch(batch_id):
    batch = Batch.query.get_or_404(batch_id)
    if request.method == 'GET':
        students = sorted(batch.students, key=lambda s: s.roll_no)
        return jsonify({
            'id': batch.id,
            'dept_name': batch.dept_name,
            'class_number': batch.class_number,
            'academic_year': batch.academic_year,
            'semester': batch.semester,
            'students': [{'id': s.id, 'name': s.name, 'roll_no': s.roll_no, 'enrollment_no': s.enrollment_no, 'batch_number': s.batch_number} for s in students]
        })

    # DELETE
    try:
        # Manually delete assignments and their related records first
        assignments_to_delete = Assignment.query.filter_by(batch_id=batch.id).all()
        for assignment in assignments_to_delete:
            AttendanceRecord.query.filter_by(assignment_id=assignment.id).delete()
            TotalLectures.query.filter_by(assignment_id=assignment.id).delete()
            db.session.delete(assignment)

        # Get students BEFORE disassociating them
        students_to_delete = list(batch.students)

        # Disassociate students from the batch (clears the join table)
        batch.students = []
        db.session.commit() # Commit disassociation

        # Now delete the students
        for student in students_to_delete:
            # We must delete attendance records for the student across ALL their assignments,
            # not just the ones for this batch, because the student record is being deleted.
            AttendanceRecord.query.filter_by(student_id=student.id).delete()
            db.session.delete(student)
        
        # Finally, delete the batch itself
        db.session.delete(batch)
        db.session.commit()
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({'error': 'Cannot delete batch due to a data conflict.', 'details': str(e)}), 400
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500
        
    return jsonify({'message': 'Batch and all its students deleted'})


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
    try:
        db.session.commit()
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500
        
    return jsonify({'message': 'Assignment created', 'id': new_assignment.id}), 201

@admin_bp.route('/assignments/<int:assign_id>', methods=['DELETE'])
@admin_required
def delete_assignment(assign_id):
    assignment = Assignment.query.get_or_404(assign_id)
    
    try:
        # Manually delete dependent records before deleting the assignment
        AttendanceRecord.query.filter_by(assignment_id=assign_id).delete(synchronize_session=False)
        TotalLectures.query.filter_by(assignment_id=assign_id).delete(synchronize_session=False)
        
        db.session.delete(assignment)
        db.session.commit()
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500
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
            pass
        else:
            assignment_ids = [a.id for a in student_specific_assignments]

            # Calculate total lectures for this student's specific assignments
            total_lectures = db.session.query(db.func.sum(TotalLectures.lecture_count))\
                .filter(TotalLectures.assignment_id.in_(assignment_ids)).scalar() or 0

            # Calculate attended lectures for this student (CORRECTED)
            attended_lectures = db.session.query(db.func.sum(AttendanceRecord.lecture_count)).filter(
                AttendanceRecord.assignment_id.in_(assignment_ids),
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.status == 'present' # Only count 'present' records
            ).scalar() or 0

        percentage = (attended_lectures / total_lectures * 100) if total_lectures > 0 else 0
        
        # Only include students in the report if they were supposed to have lectures of the specified type
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

# --- Student Management in Batches ---

@admin_bp.route('/batches/<int:batch_id>/students', methods=['POST'])
@admin_required
def add_student_to_batch(batch_id):
    batch = Batch.query.get_or_404(batch_id)
    data = request.json
    
    # Validation
    if not all(k in data for k in ['name', 'roll_no', 'enrollment_no']):
        return jsonify({'error': 'Missing required student data'}), 400

    # Check if student with enrollment no already exists
    student = Student.query.filter_by(enrollment_no=data['enrollment_no']).first()
    if not student:
        student = Student(
            name=data['name'],
            roll_no=data['roll_no'],
            enrollment_no=data['enrollment_no'],
            batch_number=data.get('batch_number')
        )
        db.session.add(student)
        # Flush to get an ID for the new student
        db.session.flush()

    if student not in batch.students:
        batch.students.append(student)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Student with that roll number or enrollment number may already exist in another context.'}), 409
    
    return jsonify({
        'id': student.id,
        'name': student.name,
        'roll_no': student.roll_no,
        'enrollment_no': student.enrollment_no,
        'batch_number': student.batch_number
    }), 201

@admin_bp.route('/students/<int:student_id>', methods=['PUT'])
@admin_required
def update_student(student_id):
    student = Student.query.get_or_404(student_id)
    data = request.json
    
    if 'name' in data:
        student.name = data['name']
    if 'roll_no' in data:
        student.roll_no = data['roll_no']
    if 'batch_number' in data:
        student.batch_number = data.get('batch_number') # Handles null/empty string
        
    db.session.commit()
    return jsonify({'message': 'Student updated'}), 200

@admin_bp.route('/batches/<int:batch_id>/students/<int:student_id>', methods=['DELETE'])
@admin_required
def remove_student_from_batch(batch_id, student_id):
    batch = Batch.query.get_or_404(batch_id)
    student = Student.query.get_or_404(student_id)

    if student in batch.students:
        batch.students.remove(student)
        db.session.commit()
        return jsonify({'message': 'Student removed from batch'}), 200
    
    return jsonify({'error': 'Student not found in this batch'}), 404

# --- Manual Attendance Editing ---
@admin_bp.route('/attendance/session', methods=['GET'])
@admin_required
def get_attendance_for_session():
    # 1. Get query parameters
    batch_id = request.args.get('batch_id')
    subject_id = request.args.get('subject_id')
    lecture_type = request.args.get('lecture_type')
    date_str = request.args.get('date') # YYYY-MM-DD

    if not all([batch_id, subject_id, lecture_type, date_str]):
        return jsonify({'error': 'batch_id, subject_id, lecture_type, and date are required'}), 400

    try:
        attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    # 2. Find relevant assignments
    assignments = Assignment.query.filter_by(
        batch_id=batch_id,
        subject_id=subject_id,
        lecture_type=lecture_type
    ).all()

    if not assignments:
        return jsonify({'error': 'No matching assignments found for this class/subject/type.'}), 404

    assignment_ids = [a.id for a in assignments]

    # 3. Get all students for the batch
    batch = Batch.query.get_or_404(batch_id)
    students = sorted(batch.students, key=lambda s: s.roll_no)
    
    # 4. Get existing attendance records for that day
    records = AttendanceRecord.query.filter(
        AttendanceRecord.assignment_id.in_(assignment_ids),
        AttendanceRecord.date == attendance_date
    ).all()
    
    records_by_student = {r.student_id: r for r in records}

    # 5. Build response
    result = []
    for s in students:
        record = records_by_student.get(s.id)
        # Check if student belongs to the specific sub-batch for PR/TU
        assignment_for_student = None
        for a in assignments:
            if lecture_type == 'TH' or a.batch_number == s.batch_number:
                assignment_for_student = a
                break

        if assignment_for_student:
             result.append({
                'student_id': s.id,
                'name': s.name,
                'roll_no': s.roll_no,
                'status': record.status if record else 'absent', # Default to absent if no record found
                'assignment_id': record.assignment_id if record else assignment_for_student.id,
            })

    return jsonify(result)

@admin_bp.route('/attendance/session', methods=['POST'])
@admin_required
def update_attendance_for_session():
    data = request.json
    date_str = data.get('date')
    updates = data.get('updates', []) # List of {'student_id', 'status', 'assignment_id'}

    if not date_str or not updates:
        return jsonify({'error': 'Date and updates are required'}), 400
        
    try:
        attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    for update in updates:
        record = AttendanceRecord.query.filter_by(
            student_id=update['student_id'],
            assignment_id=update['assignment_id'],
            date=attendance_date
        ).first()

        if record:
            # If status changes, adjust lecture count
            if record.status == 'present' and update['status'] == 'absent':
                record.lecture_count = 0 # Or handle multi-lecture days differently if needed
            elif record.status == 'absent' and update['status'] == 'present':
                record.lecture_count = 1 # Assuming 1 for simplicity
            record.status = update['status']
        else:
            # Create a new record if one doesn't exist
            new_record = AttendanceRecord(
                student_id=update['student_id'],
                assignment_id=update['assignment_id'],
                date=attendance_date,
                status=update['status'],
                lecture_count=1 if update['status'] == 'present' else 0
            )
            db.session.add(new_record)

    db.session.commit()
    return jsonify({'message': 'Attendance updated successfully'}), 200

    