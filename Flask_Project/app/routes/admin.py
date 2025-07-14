from flask import Blueprint, request, jsonify, session
from sqlalchemy.exc import IntegrityError, OperationalError
from ..models import Staff, Subject, Classroom, Assignment, Department, Batch, Student, student_batches
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

    data = request.json or {}
    for field in ('username', 'password', 'full_name'):
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    pwd_hash = bcrypt.generate_password_hash(data['password']).decode()
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
    return jsonify({'message': 'Staff added', 'id': new_staff.id}), 201

@admin_bp.route('/staff/<int:staff_id>', methods=['PUT', 'DELETE'])
@admin_required
def update_delete_staff(staff_id):
    staff = Staff.query.get_or_404(staff_id)
    if request.method == 'PUT':
        data = request.json or {}
        if 'full_name' in data:
            staff.full_name = data['full_name']
        if 'password' in data:
            staff.password_hash = bcrypt.generate_password_hash(data['password']).decode()
        db.session.commit()
        return jsonify({'message': 'Staff updated'}), 200

    db.session.delete(staff)
    db.session.commit()
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

    data = request.json or {}
    for field in ('dept_code', 'dept_name'):
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    if Department.query.get(data['dept_code']):
        return jsonify({'error': 'Dept code already exists'}), 400

    dept = Department(dept_code=data['dept_code'], dept_name=data['dept_name'])
    db.session.add(dept)
    db.session.commit()
    return jsonify({'message': 'Department added', 'dept_code': dept.dept_code}), 201

@admin_bp.route('/departments/<string:dept_code>', methods=['PUT', 'DELETE'])
@admin_required
def update_delete_department(dept_code):
    dept = Department.query.get_or_404(dept_code)
    if request.method == 'PUT':
        data = request.json or {}
        if 'dept_name' in data:
            dept.dept_name = data['dept_name']
        db.session.commit()
        return jsonify({'message': 'Department updated'}), 200

    db.session.delete(dept)
    db.session.commit()
    return jsonify({'message': 'Department deleted'}), 200


# -- Subject CRUD --
@admin_bp.route('/subjects', methods=['GET', 'POST'])
@admin_required
def manage_subjects():
    if request.method == 'GET':
        result = [{
            'id': sub.id,
            'course_code': sub.course_code,
            'dept_code': sub.dept_code,
            'semester': sub.semester_number,
            'subject_code': sub.subject_code,
            'subject_name': sub.subject_name
        } for sub in Subject.query.all()]
        return jsonify(result), 200

    data = request.json or {}
    for field in ('course_code','dept_code','semester_number','subject_code','subject_name'):
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
    sub = Subject(**data)
    db.session.add(sub)
    db.session.commit()
    return jsonify({'message': 'Subject added', 'id': sub.id}), 201

@admin_bp.route('/subjects/<int:sub_id>', methods=['PUT', 'DELETE'])
@admin_required
def update_delete_subject(sub_id):
    sub = Subject.query.get_or_404(sub_id)
    if request.method == 'PUT':
        data = request.json or {}
        if 'subject_name' in data: sub.subject_name = data['subject_name']
        if 'subject_code' in data: sub.subject_code = data['subject_code']
        db.session.commit()
        return jsonify({'message': 'Subject updated'}), 200

    db.session.delete(sub)
    db.session.commit()
    return jsonify({'message': 'Subject deleted'}), 200

# -- Classroom CRUD --
@admin_bp.route('/classrooms', methods=['GET', 'POST'])
@admin_required
def manage_classrooms():
    if request.method == 'GET':
        result = [{
            'id': c.id,
            'dept_code': c.dept_code,
            'class_name': c.class_name,
            'batch_id': c.batch_id
        } for c in Classroom.query.all()]
        return jsonify(result), 200

    data = request.json or {}
    for field in ('dept_code','class_name'):
        if field not in data: return jsonify({'error': f'{field} is required'}), 400
    
    new_classroom = Classroom(
        dept_code=data['dept_code'],
        class_name=data['class_name'],
        batch_id=data.get('batch_id')
    )
    db.session.add(new_classroom)
    db.session.commit()
    return jsonify({'message': 'Classroom added', 'id': new_classroom.id}), 201

@admin_bp.route('/classrooms/<int:cls_id>', methods=['PUT', 'DELETE'])
@admin_required
def update_delete_classroom(cls_id):
    c = Classroom.query.get_or_404(cls_id)
    if request.method == 'PUT':
        data = request.json or {}
        c.dept_code = data.get('dept_code', c.dept_code)
        c.class_name = data.get('class_name', c.class_name)
        c.batch_id = data.get('batch_id', c.batch_id)
        db.session.commit()
        return jsonify({'message': 'Classroom updated'}), 200

    db.session.delete(c)
    db.session.commit()
    return jsonify({'message': 'Classroom deleted'}), 200

# -- Assignment CRUD --
@admin_bp.route('/assignments', methods=['GET', 'POST'])
@admin_required
def manage_assignments():
    if request.method == 'GET':
        assignments = Assignment.query.all()
        result = [{
            'id': a.id, 'staff_id': a.staff_id, 'subject_id': a.subject_id,
            'lecture_type': a.lecture_type, 'batch_number': a.batch_number,
            'classroom_id': a.classroom_id
        } for a in assignments]
        return jsonify(result), 200

    data = request.json or {}
    for field in ('staff_id','subject_id','lecture_type','classroom_id'):
        if field not in data: return jsonify({'error': f'{field} is required'}), 400
    
    new_assignment = Assignment(
        staff_id=data['staff_id'], subject_id=data['subject_id'],
        lecture_type=data['lecture_type'], classroom_id=data['classroom_id'],
        batch_number=data.get('batch_number')
    )
    db.session.add(new_assignment)
    db.session.commit()
    return jsonify({'message': 'Assignment created', 'id': new_assignment.id}), 201

@admin_bp.route('/assignments/<int:assign_id>', methods=['DELETE'])
@admin_required
def delete_assignment(assign_id):
    a = Assignment.query.get_or_404(assign_id)
    db.session.delete(a)
    db.session.commit()
    return jsonify({'message': 'Assignment deleted'}), 200

# --- Batch Management ---
@admin_bp.route('/batches', methods=['GET', 'POST'])
@admin_required
def manage_batches():
    if request.method == 'POST':
        data = request.json
        required = ['dept_code', 'class_name', 'academic_year', 'semester']
        if not all(k in data for k in required):
            return jsonify({'error': 'Missing required fields'}), 400
        new_batch = Batch(**data)
        db.session.add(new_batch)
        db.session.commit()
        return jsonify({'id': new_batch.id, 'message': 'Batch created'}), 201

    batches = Batch.query.all()
    result = [{
        'id': b.id, 'dept_code': b.dept_code, 'class_name': b.class_name,
        'academic_year': b.academic_year, 'semester': b.semester,
        'student_count': len(b.students)
    } for b in batches]
    return jsonify(result)

@admin_bp.route('/batches/<int:batch_id>', methods=['GET', 'PUT', 'DELETE'])
@admin_required
def manage_single_batch(batch_id):
    batch = Batch.query.get_or_404(batch_id)
    if request.method == 'PUT':
        data = request.json
        batch.dept_code = data.get('dept_code', batch.dept_code)
        batch.class_name = data.get('class_name', batch.class_name)
        batch.academic_year = data.get('academic_year', batch.academic_year)
        batch.semester = data.get('semester', batch.semester)
        db.session.commit()
        return jsonify({'message': 'Batch updated'})
    elif request.method == 'DELETE':
        db.session.delete(batch)
        db.session.commit()
        return jsonify({'message': 'Batch deleted'})
    
    # GET
    students = [{'id': s.id, 'roll_no': s.roll_no, 'name': s.name, 'enrollment_no': s.enrollment_no} for s in batch.students]
    return jsonify({
        'id': batch.id, 'dept_code': batch.dept_code, 'class_name': batch.class_name,
        'academic_year': batch.academic_year, 'semester': batch.semester,
        'students': students
    })

@admin_bp.route('/batches/<int:batch_id>/students', methods=['POST', 'DELETE'])
@admin_required
def manage_batch_students(batch_id):
    batch = Batch.query.get_or_404(batch_id)
    data = request.json
    if 'student_id' not in data:
        return jsonify({'error': 'student_id is required'}), 400
    
    student = Student.query.get(data['student_id'])
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    if request.method == 'POST':
        if student in batch.students:
            return jsonify({'error': 'Student already in batch'}), 400
        batch.students.append(student)
        db.session.commit()
        return jsonify({'message': 'Student added to batch'})
    
    elif request.method == 'DELETE':
        if student not in batch.students:
            return jsonify({'error': 'Student not in batch'}), 400
        batch.students.remove(student)
        db.session.commit()
        return jsonify({'message': 'Student removed from batch'})

# --- Student Management ---
@admin_bp.route('/students', methods=['GET', 'POST'])
@admin_required
def manage_students():
    if request.method == 'POST':
        data = request.json
        required = ['roll_no', 'enrollment_no', 'name']
        if not all(k in data for k in required):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if Student.query.filter_by(enrollment_no=data['enrollment_no']).first():
            return jsonify({'error': 'Enrollment number already exists'}), 400
            
        new_student = Student(**data)
        db.session.add(new_student)
        db.session.commit()
        return jsonify({'id': new_student.id, 'message': 'Student created'}), 201

    students = Student.query.all()
    result = [{'id': s.id, 'roll_no': s.roll_no, 'name': s.name, 'enrollment_no': s.enrollment_no} for s in students]
    return jsonify(result)

@admin_bp.route('/students/upload_csv', methods=['POST'])
@admin_required
def upload_students_csv():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and file.filename.endswith('.csv'):
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.DictReader(stream)
        
        added_count = 0
        updated_count = 0
        errors = []

        for row_idx, row in enumerate(csv_input):
            try:
                roll_no = row.get('roll_no')
                enrollment_no = row.get('enrollment_no')
                name = row.get('name')

                if not all([roll_no, enrollment_no, name]):
                    errors.append(f"Row {row_idx+1}: Missing required values.")
                    continue

                student = Student.query.filter_by(enrollment_no=enrollment_no).first()
                if student:
                    student.name = name
                    student.roll_no = roll_no
                    updated_count += 1
                else:
                    student = Student(roll_no=roll_no, enrollment_no=enrollment_no, name=name)
                    db.session.add(student)
                    added_count += 1
            except Exception as e:
                errors.append(f"Row {row_idx+1}: Error processing row - {str(e)}")

        db.session.commit()
        return jsonify({
            'message': 'CSV processed.',
            'added': added_count,
            'updated': updated_count,
            'errors': errors
        }), 200

    return jsonify({'error': 'Invalid file type, please upload a CSV'}), 400


@admin_bp.route('/students/<int:student_id>', methods=['PUT', 'DELETE'])
@admin_required
def update_delete_student(student_id):
    student = Student.query.get_or_404(student_id)
    if request.method == 'PUT':
        data = request.json
        student.roll_no = data.get('roll_no', student.roll_no)
        student.enrollment_no = data.get('enrollment_no', student.enrollment_no)
        student.name = data.get('name', student.name)
        db.session.commit()
        return jsonify({'message': 'Student updated'})
    elif request.method == 'DELETE':
        db.session.delete(student)
        db.session.commit()
        return jsonify({'message': 'Student deleted'})
