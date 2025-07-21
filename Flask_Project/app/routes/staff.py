from flask import Blueprint, request, jsonify, session
from sqlalchemy import func, and_
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
    assigns = db.session.query(Assignment, Subject, Classroom).\
        join(Subject, Assignment.subject_id == Subject.id).\
        join(Classroom, Assignment.classroom_id == Classroom.id).\
        filter(Assignment.staff_id == sid).all()

    out = {}
    for a, subj, classroom in assigns:
        # Use a composite key of subject_id and classroom_id to group assignments
        key = f"{subj.id}-{classroom.id}"
        
        ent = out.setdefault(key, {
            'subject_id': subj.id,
            'subject_code': subj.subject_code,
            'subject_name': subj.subject_name,
            'classroom_id': classroom.id,
            'classroom_name': classroom.class_name,
            'batch_id': classroom.batch_id,
            'lecture_types': {}
        })

        lecture_type_key = a.lecture_type or 'OTH'
        
        # Ensure the list for a lecture type is initialized
        if lecture_type_key not in ent['lecture_types']:
            ent['lecture_types'][lecture_type_key] = []
        
        # Append the specific assignment details for this lecture type/batch
        ent['lecture_types'][lecture_type_key].append({
            'assignment_id': a.id,
            'batch_number': a.batch_number
        })

    return jsonify(list(out.values()))


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

    attendance_date = date.today()
    batch_number = data.get('batch_number')

    # Check for existing record for this assignment, date, and batch
    existing_record = AttendanceRecord.query.filter_by(
        assignment_id=assignment.id,
        attendance_date=attendance_date,
        batch_number=batch_number
    ).first()

    if existing_record:
        # Update existing record
        existing_record.absent_rolls = data['absent_rolls']
        record_id = existing_record.id
        message = 'Attendance updated successfully'
    else:
        # Create new attendance record
        new_record = AttendanceRecord(
            assignment_id=assignment.id,
            attendance_date=attendance_date,
            absent_rolls=data['absent_rolls'], # Expects a list of roll numbers
            lecture_type=data['lecture_type'],
            batch_number=batch_number
        )
        db.session.add(new_record)
        db.session.commit()
        record_id = new_record.id
        message = 'Attendance recorded successfully'
    
    db.session.commit()

    return jsonify({'message': message, 'record_id': record_id}), 201


@staff_bp.route('/batches/<int:batch_id>/students', methods=['GET'])
@staff_required
def get_batch_students(batch_id):
    batch = Batch.query.get_or_404(batch_id)
    # The batch number for practicals/tutorials is now a query parameter
    practical_batch_num = request.args.get('batch_number', type=int)

    query = db.session.query(Student).join(student_batches).filter(student_batches.c.batch_id == batch.id)
    
    if practical_batch_num is not None:
        query = query.filter(Student.batch_number == practical_batch_num)
        
    students = query.order_by(Student.roll_no).all()

    result = [{'id': s.id, 'roll_no': s.roll_no, 'name': s.name, 'batch_number': s.batch_number} for s in students]
    return jsonify(result)


@staff_bp.route('/defaulters', methods=['GET'])
@staff_required
def get_defaulters():
    staff_id = session['staff_id']
    subject_id = request.args.get('subject_id', type=int)
    threshold = request.args.get('threshold', default=75, type=int)

    if not subject_id:
        return jsonify({'error': 'Subject ID is required'}), 400

    # 1. Find all assignments for the staff and subject
    assignments = Assignment.query.filter_by(staff_id=staff_id, subject_id=subject_id).all()
    if not assignments:
        return jsonify([]) # No assignments, so no defaulters

    assignment_ids = [a.id for a in assignments]
    classroom_id = assignments[0].classroom_id
    classroom = Classroom.query.get(classroom_id)
    if not classroom or not classroom.batch_id:
        return jsonify({'error': 'No batch associated with the classroom for this subject'}), 400

    # 2. Get all students in the main batch for this classroom
    main_batch_students = Student.query.join(student_batches).filter(student_batches.c.batch_id == classroom.batch_id).all()
    if not main_batch_students:
        return jsonify([])

    student_map = {s.roll_no: {'name': s.name, 'enrollment_no': s.enrollment_no, 'roll_no': s.roll_no} for s in main_batch_students}
    
    # 3. Get total lectures held for each batch_number
    total_lectures_query = db.session.query(
        AttendanceRecord.batch_number,
        func.count(AttendanceRecord.id).label('total')
    ).filter(
        AttendanceRecord.assignment_id.in_(assignment_ids)
    ).group_by(AttendanceRecord.batch_number).all()
    
    total_lectures = {batch_num: total for batch_num, total in total_lectures_query}

    # 4. Get lectures attended by each student
    # This is complex because absences are stored, not presences.
    # We count the number of times a student was absent.
    
    # Unnest the JSON array of absent_rolls and count occurrences
    absences_query = db.session.query(
        func.json_array_elements_text(AttendanceRecord.absent_rolls).label('roll_no'),
        AttendanceRecord.batch_number,
        func.count().label('absent_count')
    ).filter(
        AttendanceRecord.assignment_id.in_(assignment_ids)
    ).group_by('roll_no', AttendanceRecord.batch_number).subquery()

    # 5. Join with students to get their batch number and calculate attendance
    student_attendance_data = db.session.query(
        Student.roll_no,
        Student.name,
        Student.batch_number,
        func.coalesce(absences_query.c.absent_count, 0).label('absences')
    ).select_from(Student).outerjoin(
        absences_query, and_(
            Student.roll_no == absences_query.c.roll_no,
            Student.batch_number == absences_query.c.batch_number
        )
    ).filter(
        Student.id.in_([s.id for s in main_batch_students])
    ).all()
    
    # 6. Calculate percentage and filter defaulters
    defaulters = []
    for roll_no, name, batch_num, absences in student_attendance_data:
        total_held = total_lectures.get(batch_num, 0)
        if total_held == 0:
            continue
            
        attended = total_held - absences
        percentage = (attended / total_held) * 100 if total_held > 0 else 0
        
        if percentage < threshold:
            defaulters.append({
                'roll_no': roll_no,
                'name': name,
                'batch_number': batch_num,
                'lectures_attended': attended,
                'lectures_held': total_held,
                'attendance_percentage': round(percentage, 2)
            })

    return jsonify(defaulters)
