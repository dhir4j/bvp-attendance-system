from flask import Blueprint, request, jsonify, session
from ..models import Staff, Subject, Assignment, Batch, Student, AttendanceRecord
from .. import db, bcrypt
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
    
    assignments = db.session.query(
        Assignment, Subject.subject_name, Subject.subject_code, 
        Batch.dept_name, Batch.class_number, Batch.academic_year, Batch.semester
    ).filter_by(staff_id=sid)\
     .join(Subject, Assignment.subject_id == Subject.id)\
     .join(Batch, Assignment.batch_id == Batch.id).all()

    out = {}
    for a, subject_name, subject_code, dept_name, class_number, academic_year, semester in assignments:
        key = f"{a.subject_id}-{a.batch_id}"
        batch_name = f"{dept_name} {class_number} ({academic_year} Sem {semester})"
        entry = out.setdefault(key, {
            'subject_id': a.subject_id,
            'subject_name': subject_name,
            'subject_code': subject_code,
            'batch_id': a.batch_id,
            'batch_name': batch_name,
            'lecture_types': {}
        })
        
        lecture_type_entry = entry['lecture_types'].setdefault(a.lecture_type, [])
        if a.batch_number not in lecture_type_entry:
             lecture_type_entry.append(a.batch_number)

    return jsonify(list(out.values()))


@staff_bp.route('/mark-attendance', methods=['POST'])
@staff_required
def mark_attendance():
    data = request.json
    staff_id = session['staff_id']

    # 1. Get required fields
    subject_id = data.get('subject_id')
    batch_id = data.get('batch_id')
    lecture_type = data.get('lecture_type')
    batch_number = data.get('batch_number') # Can be None for TH
    absent_rolls = [r.strip() for r in data.get('absent_rolls', [])]

    # 2. Find the correct assignment
    assignment_query = Assignment.query.filter_by(
        staff_id=staff_id,
        subject_id=subject_id,
        batch_id=batch_id,
        lecture_type=lecture_type
    )

    # For PR/TU, must match batch_number. For TH, it must be null.
    if batch_number is not None:
        assignment_query = assignment_query.filter_by(batch_number=batch_number)
    else:
        assignment_query = assignment_query.filter(Assignment.batch_number.is_(None))

    assignment = assignment_query.first_or_404(
        description="No assignment found for the given criteria."
    )

    # 3. Get the list of students for this attendance session
    batch = Batch.query.get(batch_id)
    all_students_in_batch = batch.students

    # Filter students by specific sub-batch if batch_number is provided (for PR/TU)
    if batch_number:
        students_for_session = [s for s in all_students_in_batch if s.batch_number == batch_number]
    else: # For Theory (TH), all students in the main batch attend
        students_for_session = all_students_in_batch
    
    # 4. Record attendance
    today = date.today()

    # Increment total lectures count
    total_record = AttendanceRecord(
        assignment_id=assignment.id,
        student_id=-1, # Using -1 convention for total lecture entries
        date=today,
        status='total',
        lecture_count=1
    )
    db.session.add(total_record)

    # Record for each student in the session
    for student in students_for_session:
        status = 'absent' if student.roll_no in absent_rolls else 'present'
        record = AttendanceRecord(
            assignment_id=assignment.id,
            student_id=student.id,
            date=today,
            status=status
        )
        db.session.add(record)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to save attendance', 'details': str(e)}), 500

    return jsonify({'message': 'Attendance marked successfully'})
