from flask import Blueprint, request, jsonify, session
from ..models import Staff, Subject, Assignment, AttendanceRecord
from .. import db, bcrypt
from ..auth import staff_required
from sqlalchemy.exc import IntegrityError
import datetime

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
    assigns = Assignment.query.filter_by(staff_id=sid).all()
    out = {}
    for a in assigns:
        subj = Subject.query.get(a.subject_id)
        ent  = out.setdefault(a.subject_id,{
            'subject_code': subj.subject_code,
            'subject_name': subj.subject_name,
            'lecture_types':{}
        })
        ent['lecture_types'].setdefault(a.lecture_type, []).append(a.batch_number)
    return jsonify(out)

@staff_bp.route('/attendance', methods=['POST'])
@staff_required
def mark_attendance():
    d = request.json
    
    # Basic validation
    required_fields = ['subject_id', 'lecture_type', 'absent_rolls']
    if not all(field in d for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    new_record = AttendanceRecord(
        staff_id=session['staff_id'],
        subject_id=d['subject_id'],
        lecture_type=d['lecture_type'],
        batch_number=d.get('batch_number'),
        absent_rolls=d.get('absent_rolls', []),
        date=datetime.date.today()
    )

    db.session.add(new_record)
    try:
        db.session.commit()
        return jsonify({'message': 'Attendance recorded successfully'}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Database integrity error.'}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'An unexpected error occurred: ' + str(e)}), 500
