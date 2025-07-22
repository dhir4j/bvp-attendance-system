from flask import Blueprint, request, jsonify, session
from ..models import Staff, Subject, Assignment, Batch, Student, AttendanceRecord, TotalLectures
from .. import db, bcrypt
from ..auth import staff_required
from datetime import date
from sqlalchemy.orm import joinedload


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

@staff_bp.route('/attendance/validate-absentees', methods=['POST'])
@staff_required
def validate_absentees():
    data = request.json
    batch_id = data.get('batch_id')
    batch_number = data.get('batch_number') # For PR/TU
    absent_rolls = [r.strip() for r in data.get('absent_rolls', [])]

    batch = Batch.query.get(batch_id)
    if not batch:
        return jsonify({'error': 'Batch not found'}), 404
    
    # Get all students for this specific session
    if batch_number:
        students_for_session = [s for s in batch.students if s.batch_number == batch_number]
    else:
        students_for_session = batch.students
        
    student_roll_map = {s.roll_no: s for s in students_for_session}
    
    valid_absentees = []
    invalid_rolls = []
    
    for roll in absent_rolls:
        if roll in student_roll_map:
            student = student_roll_map[roll]
            valid_absentees.append({
                'id': student.id,
                'name': student.name,
                'roll_no': student.roll_no,
                'enrollment_no': student.enrollment_no,
                'batch_number': student.batch_number
            })
        else:
            invalid_rolls.append(roll)
            
    return jsonify({
        'valid_absentees': valid_absentees,
        'invalid_rolls': invalid_rolls
    })


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
    if not batch:
        return jsonify({'error': 'Batch not found'}), 404
        
    all_students_in_batch = batch.students

    # Filter students by specific sub-batch if batch_number is provided (for PR/TU)
    if batch_number:
        students_for_session = [s for s in all_students_in_batch if s.batch_number == batch_number]
    else: # For Theory (TH), all students in the main batch attend
        students_for_session = all_students_in_batch
    
    # 4. Record attendance
    today = date.today()

    # Increment total lectures count for this specific assignment
    total_record = TotalLectures.query.filter_by(
        assignment_id=assignment.id,
        date=today
    ).first()

    if total_record:
        total_record.lecture_count += 1
    else:
        total_record = TotalLectures(
            assignment_id=assignment.id,
            date=today,
            lecture_count=1
        )
        db.session.add(total_record)

    # Record for each student in the session
    for student in students_for_session:
        status = 'absent' if student.roll_no in absent_rolls else 'present'
        
        # Check if a record for this student, for this assignment, on this day exists
        existing_record = AttendanceRecord.query.filter_by(
            assignment_id=assignment.id,
            student_id=student.id,
            date=today
        ).first()

        if existing_record:
            # If student was present and is still present, increment their lecture count
            if existing_record.status == 'present' and status == 'present':
                 existing_record.lecture_count += 1
            # If student was absent, but is now present for this lecture, update status and set count to 1
            elif existing_record.status == 'absent' and status == 'present':
                existing_record.status = 'present'
                existing_record.lecture_count = 1
            # If student was present but now marked absent, update status. Lecture count stays from previous present records.
            elif existing_record.status == 'present' and status == 'absent':
                existing_record.status = 'absent'
            # If student was absent and is still absent, do nothing.
            
        else:
            # Create a new record if one doesn't exist
            record = AttendanceRecord(
                assignment_id=assignment.id,
                student_id=student.id,
                date=today,
                status=status,
                # if present, starts with 1 lecture, if absent, it's 0 as they missed it.
                lecture_count=1 if status == 'present' else 0
            )
            db.session.add(record)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to save attendance', 'details': str(e)}), 500

    return jsonify({'message': 'Attendance marked successfully'})


@staff_bp.route('/attendance-report', methods=['GET'])
@staff_required
def get_staff_attendance_report():
    staff_id = session['staff_id']
    batch_id = request.args.get('batch_id')
    subject_id = request.args.get('subject_id')
    lecture_type = request.args.get('lecture_type')

    if not batch_id:
        return jsonify({'error': 'batch_id is required'}), 400

    # Ensure the staff is assigned to this batch
    auth_query = Assignment.query.filter_by(staff_id=staff_id, batch_id=batch_id)
    if subject_id:
        auth_query = auth_query.filter_by(subject_id=subject_id)
    if not auth_query.first():
        return jsonify({'error': 'You are not authorized to view this report'}), 403

    batch = Batch.query.get_or_404(batch_id)
    students = batch.students
    
    # Base query for assignments for the report
    assignments_query = Assignment.query.filter_by(batch_id=batch_id)
    if subject_id:
        assignments_query = assignments_query.filter_by(subject_id=subject_id)
    if lecture_type:
        assignments_query = assignments_query.filter_by(lecture_type=lecture_type)

    assignments = assignments_query.all()
    if not assignments:
        return jsonify([])

    assignment_ids = [a.id for a in assignments]

    total_lectures = db.session.query(
        db.func.sum(TotalLectures.lecture_count)
    ).filter(
        TotalLectures.assignment_id.in_(assignment_ids)
    ).scalar() or 0
    
    student_attendance = db.session.query(
        AttendanceRecord.student_id,
        db.func.sum(AttendanceRecord.lecture_count)
    ).filter(
        AttendanceRecord.assignment_id.in_(assignment_ids),
        AttendanceRecord.status == 'present'
    ).group_by(AttendanceRecord.student_id).all()

    student_attendance_map = dict(student_attendance)

    report = []
    for student in students:
        attended = student_attendance_map.get(student.id, 0)
        percentage = (attended / total_lectures * 100) if total_lectures > 0 else 0
        report.append({
            'student_id': student.id,
            'name': student.name,
            'roll_no': student.roll_no,
            'attended_lectures': attended,
            'total_lectures': total_lectures,
            'percentage': round(percentage, 2)
        })

    return jsonify(report)

@staff_bp.route('/assigned-subjects/<int:batch_id>', methods=['GET'])
@staff_required
def get_staff_assigned_subjects(batch_id):
    staff_id = session['staff_id']
    subjects = db.session.query(
        Subject.id, Subject.subject_name, Subject.subject_code
    ).join(Assignment, Subject.id == Assignment.subject_id)\
     .filter(Assignment.staff_id == staff_id)\
     .filter(Assignment.batch_id == batch_id)\
     .distinct().all()
    
    result = [{'id': s.id, 'name': f"{s.subject_name} ({s.subject_code})"} for s in subjects]
    return jsonify(result)

    