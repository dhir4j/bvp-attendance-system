from flask import Blueprint, request, jsonify, session
from ..models import Staff, Subject, Assignment, Classroom, Student, AttendanceRecord, Batch
from .. import bcrypt, db
from ..auth import staff_required
from datetime import date


staff_bp = Blueprint('staff', __name__)

@staff_bp.route('/login', methods=['POST'])
def staff_login():
    d = request.json
    u = Staff.query.filter_by(username=d['username']).first()
    if u and bcrypt.check_password_hash(u.password_hash, d['password']):
        session['staff_id'] = u.id
        return jsonify({'message':'Login successful'})
    return jsonify({'error':'Invalid credentials'}),401

@staff_bp.route('/assignments', methods=['GET'])
@staff_required
def get_assignments():
    sid = session['staff_id']
    assigns = db.session.query(Assignment, Subject, Classroom, Batch).\
        join(Subject, Assignment.subject_id == Subject.id).\
        join(Classroom, Assignment.classroom_id == Classroom.id).\
        join(Batch, Classroom.batch_id == Batch.id).\
        filter(Assignment.staff_id == sid).all()

    out = {}
    for a, subj, classroom, batch in assigns:
        ent = out.setdefault(str(a.id),{
            'assignment_id': a.id,
            'subject_code': subj.subject_code,
            'subject_name': subj.subject_name,
            'classroom_name': classroom.class_name,
            'batch_id': batch.id,
            'lecture_types':{}
        })
        lecture_type_key = a.lecture_type or 'OTH'
        ent['lecture_types'].setdefault(lecture_type_key, []).append(a.batch_number)
    
    # The frontend expects a dictionary of subjects, let's re-format
    # This is a bit complex, might need frontend refactor later
    # For now, let's group by subject
    
    subject_centric_out = {}
    for assignment_details in out.values():
      sub_id = next((a.subject_id for a in Assignment.query.filter_by(id=assignment_details['assignment_id'])), None)
      if sub_id:
        key = str(sub_id)
        entry = subject_centric_out.setdefault(key, {
          'subject_code': assignment_details['subject_code'],
          'subject_name': assignment_details['subject_name'],
          'assignments': []
        })
        entry['assignments'].append({
          'assignment_id': assignment_details['assignment_id'],
          'classroom_name': assignment_details['classroom_name'],
          'lecture_types': assignment_details['lecture_types']
        })

    return jsonify(subject_centric_out)


@staff_bp.route('/attendance', methods=['POST'])
@staff_required
def mark_attendance():
    data = request.json
    required_fields = ['assignment_id', 'absent_rolls', 'lecture_type']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    assignment = Assignment.query.get(data['assignment_id'])
    if not assignment or assignment.staff_id != session['staff_id']:
        return jsonify({'error': 'Invalid or unauthorized assignment ID'}), 403

    # Create new attendance record
    new_record = AttendanceRecord(
        assignment_id=assignment.id,
        attendance_date=date.today(),
        absent_rolls=data['absent_rolls'], # Expects a list of roll numbers
        lecture_type=data['lecture_type'],
        batch_number=data.get('batch_number')
    )
    db.session.add(new_record)
    db.session.commit()

    return jsonify({'message': 'Attendance recorded successfully', 'record_id': new_record.id}), 201


@staff_bp.route('/batches/<int:batch_id>/students', methods=['GET'])
@staff_required
def get_batch_students(batch_id):
    batch = Batch.query.get_or_404(batch_id)
    students = [{'id': s.id, 'roll_no': s.roll_no, 'name': s.name} for s in batch.students]
    return jsonify(students)
