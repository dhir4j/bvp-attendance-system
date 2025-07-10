from flask import Blueprint, request, jsonify, session
from ..models import Staff, Subject, Classroom, Assignment
from .. import db, bcrypt
from ..auth import admin_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/login', methods=['POST'])
def admin_login():
    d = request.json
    if d.get('username')=='bvp@admin' and d.get('password')=='bvp@pass':
        session['is_admin'] = True
        return jsonify({'message':'Admin logged in'})
    return jsonify({'error':'Invalid credentials'}),401

# -- Staff CRUD --
@admin_bp.route('/staff', methods=['GET','POST'])
@admin_required
def manage_staff():
    if request.method=='GET':
        return jsonify([{'id':s.id,'username':s.username,'full_name':s.full_name} for s in Staff.query.all()])
    d=request.json
    pwd=bcrypt.generate_password_hash(d['password']).decode()
    s=Staff(username=d['username'], full_name=d['full_name'], password_hash=pwd)
    db.session.add(s); db.session.commit()
    return jsonify({'message':'Staff added','id':s.id})

@admin_bp.route('/staff/<int:id>', methods=['PUT','DELETE'])
@admin_required
def upd_del_staff(id):
    s=Staff.query.get_or_404(id)
    if request.method=='PUT':
        d=request.json
        s.full_name = d.get('full_name',s.full_name)
        if 'password' in d:
            s.password_hash = bcrypt.generate_password_hash(d['password']).decode()
        db.session.commit()
        return jsonify({'message':'Staff updated'})
    db.session.delete(s); db.session.commit()
    return jsonify({'message':'Staff deleted'})

# -- Subject CRUD --
@admin_bp.route('/subjects', methods=['GET','POST'])
@admin_required
def manage_subjects():
    if request.method=='GET':
        return jsonify([{
            'id':sub.id,'course_code':sub.course_code,'dept_code':sub.dept_code,
            'semester':sub.semester_number,'code':sub.subject_code,'name':sub.subject_name
        } for sub in Subject.query.all()])
    d=request.json
    sub=Subject(
      course_code=d['course_code'], dept_code=d['dept_code'],
      semester_number=d['semester_number'],
      subject_code=d['subject_code'], subject_name=d['subject_name']
    )
    db.session.add(sub); db.session.commit()
    return jsonify({'message':'Subject added','id':sub.id})

@admin_bp.route('/subjects/<int:id>', methods=['PUT','DELETE'])
@admin_required
def upd_del_subject(id):
    sub=Subject.query.get_or_404(id)
    if request.method=='PUT':
        d=request.json
        sub.subject_name = d.get('subject_name',sub.subject_name)
        sub.subject_code = d.get('subject_code',sub.subject_code)
        db.session.commit()
        return jsonify({'message':'Subject updated'})
    db.session.delete(sub); db.session.commit()
    return jsonify({'message':'Subject deleted'})

# -- Classroom CRUD --
@admin_bp.route('/classrooms', methods=['GET','POST'])
@admin_required
def manage_classrooms():
    if request.method=='GET':
        return jsonify([{'id':c.id,'dept_code':c.dept_code,'class_name':c.class_name}
                        for c in Classroom.query.all()])
    d = request.json
    c = Classroom(dept_code=d['dept_code'], class_name=d['class_name'])
    db.session.add(c); db.session.commit()
    return jsonify({'message':'Classroom added','id':c.id})

@admin_bp.route('/classrooms/<int:id>', methods=['DELETE'])
@admin_required
def del_classroom(id):
    c = Classroom.query.get_or_404(id)
    db.session.delete(c); db.session.commit()
    return jsonify({'message':'Classroom deleted'})

# -- Assignment CRUD --
@admin_bp.route('/assignments', methods=['GET','POST'])
@admin_required
def manage_assignments():
    if request.method=='GET':
        return jsonify([{
            'id':a.id,'staff_id':a.staff_id,'subject_id':a.subject_id,
            'lecture_type':a.lecture_type,'batch_number':a.batch_number,
            'classroom_name':a.classroom_name
        } for a in Assignment.query.all()])
    d=request.json
    a=Assignment(
      staff_id=d['staff_id'], subject_id=d['subject_id'],
      lecture_type=d['lecture_type'], batch_number=d.get('batch_number'),
      classroom_name=d['classroom_name']
    )
    db.session.add(a); db.session.commit()
    return jsonify({'message':'Assignment created','id':a.id})

@admin_bp.route('/assignments/<int:id>', methods=['DELETE'])
@admin_required
def del_assignment(id):
    a=Assignment.query.get_or_404(id)
    db.session.delete(a); db.session.commit()
    return jsonify({'message':'Assignment deleted'})
