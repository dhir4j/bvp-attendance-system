
from flask import Blueprint, request, jsonify, session
from ..models import Staff, Subject, Assignment
from .. import bcrypt
from ..auth import staff_required
from ..sheets import (
    get_sheet, col_letter_to_index,
    cell_value_to_int, get_batch_rolls,
    subject_column_map
)
from google.auth.exceptions import RefreshError

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
        ent  = out.setdefault(str(a.subject_id),{
            'subject_code': subj.subject_code,
            'subject_name': subj.subject_name,
            'classroom_name': a.classroom_name,
            'lecture_types':{}
        })
        lecture_type_key = a.lecture_type or 'OTH'
        ent['lecture_types'].setdefault(lecture_type_key, []).append(a.batch_number)
    return jsonify(out)

@staff_bp.route('/attendance', methods=['POST'])
@staff_required
def mark_attendance():
    d              = request.json
    staff_id       = session['staff_id']
    subject_id     = d['subject_id']
    lecture_type   = d.get('lecture_type')
    batch_number   = d.get('batch_number')
    absentees      = set(map(str, d.get('absent_rolls', [])))

    # Find the specific assignment to get the worksheet_name
    assignment = Assignment.query.filter_by(
        staff_id=staff_id,
        subject_id=subject_id,
        lecture_type=lecture_type,
        batch_number=batch_number
    ).first()

    if not assignment:
        return jsonify({'error': 'Could not find a matching assignment for this lecture.'}), 404

    # Use getattr for safe access to worksheet_name, with a fallback.
    worksheet_name = getattr(assignment, 'worksheet_name', None)
    if not worksheet_name:
         return jsonify({'error': 'Assignment is missing a worksheet name. Please ask an admin to update it.'}), 400


    try:
        # get the specific worksheet using the name from the assignment
        sheet = get_sheet(worksheet_name)
        subj = Subject.query.get(subject_id)

        # validate batch rolls
        if lecture_type != 'TH' and batch_number is not None:
            valid_rolls = set(map(str, get_batch_rolls(sheet, batch_number)))
            invalid = absentees - valid_rolls
            if invalid:
                return jsonify({'error':f'Invalid roll numbers for this batch: {list(invalid)}'}),400
            absentees &= valid_rolls

        mapping = subject_column_map.get(subj.subject_code, {}).get(lecture_type)
        if not mapping:
            return jsonify({'error':'No column mapping found for this lecture/subject combination'}),400

        key = None if lecture_type=='TH' else batch_number
        if key not in mapping:
            return jsonify({'error':'No column mapping found for this batch'}),400

        col_letter, count_cell = mapping[key]
        col_idx = col_letter_to_index(col_letter)
        rolls   = sheet.col_values(1)[4:71]

        # decrement attendance for absentees
        for idx, r in enumerate(rolls):
            if str(r) in absentees:
                row     = idx + 5
                curr    = cell_value_to_int(sheet.cell(row, col_idx).value)
                sheet.update_cell(row, col_idx, curr - 1)

        # increment lecture count
        total = cell_value_to_int(sheet.acell(count_cell).value)
        sheet.update_acell(count_cell, total + 1)

        return jsonify({'message':'Attendance updated'})
    except RefreshError as e:
        # Catch the specific Google auth error
        return jsonify({'error': 'Could not authenticate with Google Sheets. Check server clock or credentials: ' + str(e)}), 500
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': 'An unexpected error occurred: ' + str(e)}), 500
