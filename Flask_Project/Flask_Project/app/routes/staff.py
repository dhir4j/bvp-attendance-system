from flask import Blueprint, request, jsonify, session
from ..models import Staff, Subject, Assignment
from .. import bcrypt
from ..auth import staff_required
from ..sheets import (
    get_sheet, col_letter_to_index,
    cell_value_to_int, get_batch_rolls,
    subject_column_map
)

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
            'subject_name': subj.subject_name, # <-- ADD THIS LINE
            'lecture_types':{}
        })
        ent['lecture_types'].setdefault(a.lecture_type, []).append(a.batch_number)
    return jsonify(out)

@staff_bp.route('/attendance', methods=['POST'])
@staff_required
def mark_attendance():
    d            = request.json
    subj         = Subject.query.get_or_404(d['subject_id'])
    lec_type     = d.get('lecture_type')
    batch        = d.get('batch_number')
    absentees    = set(d.get('absent_rolls', []))

    # validate batch rolls
    if lec_type!='TH' and batch is not None:
        valid   = set(get_batch_rolls(batch))
        invalid = absentees - valid
        if invalid:
            return jsonify({'error':f'Invalid rolls: {list(invalid)}'}),400
        absentees &= valid

    sheet   = get_sheet()
    mapping = subject_column_map.get(subj.subject_code, {}).get(lec_type)
    if not mapping:
        return jsonify({'error':'No mapping for this lecture/subject'}),400

    key = None if lec_type=='TH' else batch
    if key not in mapping:
        return jsonify({'error':'No mapping entry for this batch'}),400

    col_letter, count_cell = mapping[key]
    col_idx = col_letter_to_index(col_letter)
    rolls   = sheet.col_values(1)[4:71]

    # decrement attendance for absentees
    for idx, r in enumerate(rolls):
        if r in absentees:
            row     = idx + 5
            curr    = cell_value_to_int(sheet.cell(row, col_idx).value)
            sheet.update_cell(row, col_idx, curr - 1)

    # increment lecture count
    total = cell_value_to_int(sheet.acell(count_cell).value)
    sheet.update_acell(count_cell, total + 1)

    return jsonify({'message':'Attendance updated'})
