
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
            if status == 'present':
                # If they were absent, mark present and set count to 1.
                # If they were already present, increment their count.
                if existing_record.status == 'absent':
                    existing_record.status = 'present'
                    existing_record.lecture_count = 1
                else: # was present
                    existing_record.lecture_count += 1
            else: # status is 'absent'
                # If they were previously present, mark as absent.
                # The attended lecture count remains from the earlier lecture.
                if existing_record.status == 'present':
                    existing_record.status = 'absent'
                # If they were already absent, do nothing.
            
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

    auth_query = Assignment.query.filter_by(staff_id=staff_id, batch_id=batch_id)
    if subject_id:
        auth_query = auth_query.filter_by(subject_id=subject_id)
    if not auth_query.first():
        return jsonify({'error': 'You are not authorized to view this report'}), 403

    batch = Batch.query.get_or_404(batch_id)
    
    base_assignments_query = Assignment.query.filter_by(batch_id=batch_id, staff_id=staff_id)
    if subject_id:
        base_assignments_query = base_assignments_query.filter_by(subject_id=subject_id)

    theory_assignments = base_assignments_query.filter_by(lecture_type='TH').all()
    practical_assignments = base_assignments_query.filter(Assignment.lecture_type.in_(['PR', 'TU'])).all()
    
    report = []

    sub_batch_students = {}
    for s in batch.students:
        if s.batch_number:
            sub_batch_students.setdefault(s.batch_number, []).append(s)

    for student in batch.students:
        total_lectures = 0
        attended_lectures = 0

        # Calculate Theory attendance (applies to all students)
        if theory_assignments and (not lecture_type or lecture_type == 'TH'):
            th_assignment_ids = [a.id for a in theory_assignments]
            th_total = db.session.query(db.func.sum(TotalLectures.lecture_count)).filter(TotalLectures.assignment_id.in_(th_assignment_ids)).scalar() or 0
            th_attended = db.session.query(db.func.sum(AttendanceRecord.lecture_count)).filter(
                AttendanceRecord.assignment_id.in_(th_assignment_ids),
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.status == 'present'
            ).scalar() or 0
            total_lectures += th_total
            attended_lectures += th_attended

        # Calculate Practical/Tutorial attendance (applies only if student is in a sub-batch)
        if student.batch_number and practical_assignments and (not lecture_type or lecture_type in ['PR', 'TU']):
            # Filter assignments for this student's specific sub-batch and lecture type
            student_pr_assignments_query = base_assignments_query.filter(
                Assignment.lecture_type.in_(['PR', 'TU']),
                Assignment.batch_number == student.batch_number
            )
            if lecture_type:
                student_pr_assignments_query = student_pr_assignments_query.filter_by(lecture_type=lecture_type)
            
            student_pr_assignments = student_pr_assignments_query.all()
            
            if student_pr_assignments:
                pr_assignment_ids = [a.id for a in student_pr_assignments]
                pr_total = db.session.query(db.func.sum(TotalLectures.lecture_count)).filter(TotalLectures.assignment_id.in_(pr_assignment_ids)).scalar() or 0
                pr_attended = db.session.query(db.func.sum(AttendanceRecord.lecture_count)).filter(
                    AttendanceRecord.assignment_id.in_(pr_assignment_ids),
                    AttendanceRecord.student_id == student.id,
                    AttendanceRecord.status == 'present'
                ).scalar() or 0
                total_lectures += pr_total
                attended_lectures += pr_attended

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
