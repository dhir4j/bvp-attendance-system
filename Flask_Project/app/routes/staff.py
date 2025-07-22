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
        session['staff_full_name'] = u.full_name
        return jsonify({'message':'Login successful', 'full_name': u.full_name})
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
            # Logic for a student who already has an attendance record today
            if status == 'present':
                # If they were marked absent before, now they are present
                if existing_record.status == 'absent':
                    existing_record.status = 'present'
                # Increment attended lecture count because they are present for this lecture
                existing_record.lecture_count += 1
            else: # status is 'absent'
                # If they were present before, now they are absent for this lecture.
                # Just update the status. DO NOT change the lecture_count, as that
                # tracks their previously attended lectures for the day.
                if existing_record.status == 'present':
                    existing_record.status = 'absent'
                # If they were already absent, nothing changes.
            
        else:
            # Create a new record if one doesn't exist for the student today
            record = AttendanceRecord(
                assignment_id=assignment.id,
                student_id=student.id,
                date=today,
                status=status,
                # If present for this first lecture, count is 1. If absent, it's 0.
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

    # All filters must be present
    if not all([batch_id, subject_id, lecture_type]):
        return jsonify({'error': 'batch_id, subject_id, and lecture_type are required'}), 400

    # Authorization Check: Does this staff teach this subject to this batch?
    auth_query = Assignment.query.filter_by(
        staff_id=staff_id, 
        batch_id=batch_id, 
        subject_id=subject_id
    )
    if not auth_query.first():
        return jsonify({'error': 'You are not authorized to view this report'}), 403

    batch = Batch.query.get_or_404(batch_id)

    # Base query for assignments, filtered by all required parameters from the start
    base_assignments_query = Assignment.query.filter_by(
        staff_id=staff_id,
        batch_id=batch_id,
        subject_id=subject_id,
        lecture_type=lecture_type
    )

    all_filtered_assignments = base_assignments_query.all()
    if not all_filtered_assignments:
        return jsonify([]) # This staff has no assignments for the selected lecture type

    report = []
    
    # Determine the pool of students this staff teaches for this lecture type
    students_in_scope = []
    if lecture_type == 'TH':
        students_in_scope = batch.students # For theory, all students are in scope
    else: # For PR/TU, only students in the sub-batches taught by this staff
        staff_sub_batches = {a.batch_number for a in all_filtered_assignments if a.batch_number is not None}
        students_in_scope = [s for s in batch.students if s.batch_number in staff_sub_batches]

    for student in students_in_scope:
        total_lectures = 0
        attended_lectures = 0
        
        # Determine which assignments apply to this specific student
        student_specific_assignments = []
        if lecture_type == 'TH':
            student_specific_assignments = all_filtered_assignments
        else: # For PR/TU, it only applies if the student is in a matching sub-batch
            if student.batch_number:
                student_specific_assignments = [
                    a for a in all_filtered_assignments if a.batch_number == student.batch_number
                ]

        if student_specific_assignments:
            assignment_ids = [a.id for a in student_specific_assignments]

            total_lectures = db.session.query(db.func.sum(TotalLectures.lecture_count))\
                .filter(TotalLectures.assignment_id.in_(assignment_ids)).scalar() or 0

            attended_lectures = db.session.query(db.func.sum(AttendanceRecord.lecture_count)).filter(
                AttendanceRecord.assignment_id.in_(assignment_ids),
                AttendanceRecord.student_id == student.id
            ).scalar() or 0

        percentage = (attended_lectures / total_lectures * 100) if total_lectures > 0 else 0
        
        report.append({
            'student_id': student.id,
            'name': student.name,
            'roll_no': student.roll_no,
            'attended_lectures': attended_lectures,
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

@staff_bp.route('/roster/<int:batch_id>', methods=['GET'])
@staff_required
def get_roster(batch_id):
    batch = Batch.query.get_or_404(batch_id)
    
    # Check if this staff is assigned to this batch
    staff_id = session['staff_id']
    is_assigned = Assignment.query.filter_by(staff_id=staff_id, batch_id=batch_id).first()
    if not is_assigned:
        return jsonify({'error': 'You are not assigned to this batch.'}), 403

    # Filter by sub-batch if parameters are provided
    lecture_type = request.args.get('lecture_type')
    batch_number_str = request.args.get('batch_number')

    students = batch.students
    if lecture_type and lecture_type != 'TH' and batch_number_str:
        try:
            batch_number = int(batch_number_str)
            students = [s for s in batch.students if s.batch_number == batch_number]
        except (ValueError, TypeError):
            # Ignore invalid batch_number
            pass

    return jsonify([{'id': s.id, 'name': s.name, 'roll_no': s.roll_no, 'enrollment_no': s.enrollment_no, 'batch_number': s.batch_number} for s in students])