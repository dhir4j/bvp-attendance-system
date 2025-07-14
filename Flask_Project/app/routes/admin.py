from flask import Blueprint, request, jsonify, session
from sqlalchemy.exc import IntegrityError, OperationalError
from ..models import Staff, Subject, Classroom, Assignment, Department
from .. import db, bcrypt
from ..auth import admin_required

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
        if 'password' in data:
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
        result = [{
            'id': sub.id,
            'course_code': sub.course_code,
            'dept_code': sub.dept_code,
            'semester': sub.semester_number,
            'subject_code': sub.subject_code,
            'subject_name': sub.subject_name
        } for sub in Subject.query.all()]
        return jsonify(result), 200

    # POST → create new subject
    data = request.json or {}
    for field in ('course_code','dept_code','semester_number','subject_code','subject_name'):
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    # ensure department exists
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
    db.session.delete(sub)
    try:
        db.session.commit()
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500
    return jsonify({'message': 'Subject deleted'}), 200

# -- Classroom CRUD --
@admin_bp.route('/classrooms', methods=['GET', 'POST'])
@admin_required
def manage_classrooms():
    if request.method == 'GET':
        result = [{
            'id': c.id,
            'dept_code': c.dept_code,
            'class_name': c.class_name
        } for c in Classroom.query.all()]
        return jsonify(result), 200

    # POST → create new classroom
    data = request.json or {}
    for field in ('dept_code','class_name'):
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    if not Department.query.get(data['dept_code']):
        return jsonify({'error': f"Department '{data['dept_code']}' not found"}), 400

    c = Classroom(dept_code=data['dept_code'], class_name=data['class_name'])
    db.session.add(c)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'That classroom already exists'}), 400
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500

    return jsonify({'message': 'Classroom added', 'id': c.id}), 201

@admin_bp.route('/classrooms/<int:cls_id>', methods=['DELETE'])
@admin_required
def delete_classroom(cls_id):
    c = Classroom.query.get_or_404(cls_id)
    db.session.delete(c)
    try:
        db.session.commit()
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500
    return jsonify({'message': 'Classroom deleted'}), 200

# -- Assignment CRUD --
@admin_bp.route('/assignments', methods=['GET', 'POST'])
@admin_required
def manage_assignments():
    if request.method == 'GET':
        assignments = Assignment.query.all()
        # Handle cases where worksheet_name might not exist in older rows
        result = []
        for a in assignments:
            result.append({
                'id': a.id,
                'staff_id': a.staff_id,
                'subject_id': a.subject_id,
                'lecture_type': a.lecture_type,
                'batch_number': a.batch_number,
                'classroom_name': a.classroom_name,
                'worksheet_name': getattr(a, 'worksheet_name', 'DefaultSheet'),
            })
        return jsonify(result), 200

    # POST → create new assignment
    data = request.json or {}
    for field in ('staff_id','subject_id','lecture_type','classroom_name', 'worksheet_name'):
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    if not Staff.query.get(data['staff_id']):
        return jsonify({'error': 'Staff not found'}), 400
    if not Subject.query.get(data['subject_id']):
        return jsonify({'error': 'Subject not found'}), 400

    a = Assignment(
        staff_id       = data['staff_id'],
        subject_id     = data['subject_id'],
        lecture_type   = data['lecture_type'],
        batch_number   = data.get('batch_number'),
        classroom_name = data['classroom_name'],
        worksheet_name = data['worksheet_name']
    )
    db.session.add(a)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'That assignment already exists'}), 400
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500

    return jsonify({'message': 'Assignment created', 'id': a.id}), 201

@admin_bp.route('/assignments/<int:assign_id>', methods=['DELETE'])
@admin_required
def delete_assignment(assign_id):
    a = Assignment.query.get_or_404(assign_id)
    db.session.delete(a)
    try:
        db.session.commit()
    except OperationalError:
        db.session.rollback()
        return jsonify({'error': 'Database connection error, please retry'}), 500
    return jsonify({'message': 'Assignment deleted'}), 200
