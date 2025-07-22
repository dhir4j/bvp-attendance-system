from flask import Blueprint, request, jsonify, session
from ..models import Staff, Subject, Assignment, Classroom, Student, AttendanceRecord
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
        Assignment, Subject.subject_name, Subject.subject_code, Classroom.class_name
    ).filter_by(staff_id=sid)\
     .join(Subject, Assignment.subject_id == Subject.id)\
     .join(Classroom, Assignment.classroom_id == Classroom.id).all()

    out = {}
    for a, subject_name, subject_code, classroom_name in assignments:
        key = f"{a.subject_id}-{a.classroom_id}"
        entry = out.setdefault(key, {
            'subject_id': a.subject_id,
            'subject_name': subject_name,
            'subject_code': subject_code,
            'classroom_id': a.classroom_id,
            'classroom_name': classroom_name,
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
    classroom_id = data.get('classroom_id')
    lecture_type = data.get('lecture_type')
    batch_number = data.get('batch_number') # Can be None
    absent_rolls = [r.strip() for r in data.get('absent_rolls', [])]

    # 2. Find the correct assignment
    assignment_query = Assignment.query.filter_by(
        staff_id=staff_id,
        subject_id=subject_id,
        classroom_id=classroom_id,
        lecture_type=lecture_type
    )
    if batch_number is not None:
        assignment_query = assignment_query.filter_by(batch_number=batch_number)
    
    assignment = assignment_query.first_or_404(
        description="No assignment found for the given criteria."
    )

    # 3. Get the list of students for this attendance session
    classroom = Classroom.query.get(classroom_id)
    if not classroom or not classroom.batch:
        return jsonify({'error': 'Classroom is not associated with a batch.'}), 400
    
    all_students_in_batch = classroom.batch.students

    # If it's a batch-specific lecture, filter students by batch_number
    if batch_number:
        # This assumes Student model has a batch_number, which it might not.
        # A better approach is needed if students can be in multiple sub-batches.
        # For now, we assume all students in the main batch are eligible.
        # A more complex system would have a student-to-sub_batch mapping.
        pass # Not filtering for now, all students in class batch are considered.

    student_map = {s.roll_no: s.id for s in all_students_in_batch}
    
    # 4. Record attendance
    today = date.today()

    # Increment total lectures count
    total_record = AttendanceRecord(
        assignment_id=assignment.id,
        student_id=-1, # Using -1 or another convention for total lecture entries
        date=today,
        status='total',
        lecture_count=1
    )
    db.session.add(total_record)

    # Record for each student
    for student in all_students_in_batch:
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
