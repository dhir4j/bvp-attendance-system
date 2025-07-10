from flask import Flask, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from functools import wraps
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import string

# --- Configuration ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'replace-with-secure-key'
app.config['SQLALCHEMY_DATABASE_URI'] = (
    'postgresql://dhir4j:m4dc0d3r@hard4j-4630.postgres.pythonanywhere-services.com:14630/bvpattnedance'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# --- Google Sheets Setup ---
SHEET_KEY = '1E5L6Vo8jJugszPiYzximSMYTuV3nBuhD7JOX6feTB2E'
SERVICE_JSON = 'sheets.json'

def get_sheet():
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]
    creds = ServiceAccountCredentials.from_json_keyfile_name(SERVICE_JSON, scope)
    client = gspread.authorize(creds)
    return client.open_by_key(SHEET_KEY).worksheet('sem 3 / an sheet')

# --- Helpers for Sheets ---
def col_letter_to_index(letter):
    return string.ascii_uppercase.index(letter) + 1

def cell_value_to_int(val):
    try:
        return int(val)
    except:
        return 0

def get_batch_rolls(batch):
    sheet = get_sheet()
    all_rows = sheet.col_values(1)[4:71]
    header_idxs = [i for i, v in enumerate(all_rows) if not v.isdigit()]
    start_idxs = [0] + [idx+1 for idx in header_idxs]
    end_idxs = header_idxs + [len(all_rows)]
    if batch < 1 or batch > len(start_idxs):
        return []
    start = start_idxs[batch-1]
    end = end_idxs[batch-1]
    return [r for r in all_rows[start:end] if r.isdigit()]

# --- Column Mapping for Sem 3 ---
subject_column_map = {
    "DMS": {
        "TH": { None: ("D", "E4") },
        "PR": {1: ("F", "G4"), 2: ("F", "G28"), 3: ("F", "G52")},
        "TU": {1: ("H", "I4"), 2: ("H", "I28"), 3: ("H", "I52")},
    },
    "DTE": {
        "TH": { None: ("J", "K4") },
        "PR": {1: ("L", "M4"), 2: ("L", "M28"), 3: ("L", "M52")},
    },
    "DSP": {
        "TH": { None: ("N", "O4") },
        "PR": {1: ("P", "Q4"), 2: ("P", "Q28"), 3: ("P", "Q52")},
    },
    "SML": {
        "TH": { None: ("R", "S4") },
        "PR": {1: ("T", "U4"), 2: ("T", "U28"), 3: ("T", "U52")},
        "TU": {1: ("V", "W4"), 2: ("V", "W28"), 3: ("V", "W52")},
    },
    "DST": {
        "TH": { None: ("Z", "AA4") },
        "PR": {1: ("AB", "AC4"),2: ("AB", "AC28"),3: ("AB", "AC52")},
    },
    "EIC": {
        "TH": { None: ("X", "Y4") },
    },
}

# --- Models ---
class Department(db.Model):
    __tablename__ = 'departments'
    dept_code = db.Column(db.String, primary_key=True)
    dept_name = db.Column(db.String, nullable=False)

class Semester(db.Model):
    __tablename__ = 'semesters'
    id = db.Column(db.Integer, primary_key=True)
    dept_code = db.Column(db.String, db.ForeignKey('departments.dept_code'), nullable=False)
    semester_number = db.Column(db.Integer, nullable=False)
    __table_args__ = (db.UniqueConstraint('dept_code','semester_number'),)

class Subject(db.Model):
    __tablename__ = 'subjects'
    id = db.Column(db.Integer, primary_key=True)
    course_code = db.Column(db.String, nullable=False)
    dept_code = db.Column(db.String, db.ForeignKey('departments.dept_code'), nullable=False)
    semester_number = db.Column(db.Integer, nullable=False)
    subject_code = db.Column(db.String, nullable=False)
    subject_name = db.Column(db.String, nullable=False)
    __table_args__ = (db.UniqueConstraint('course_code','dept_code','semester_number'),)

class Staff(db.Model):
    __tablename__ = 'staff'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, unique=True, nullable=False)
    password_hash = db.Column(db.String, nullable=False)
    full_name = db.Column(db.String, nullable=False)

class Assignment(db.Model):
    __tablename__ = 'staff_subject_assignment'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('staff.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    lecture_type = db.Column(db.String, nullable=False)
    batch_number = db.Column(db.Integer)
    classroom_name = db.Column(db.String, nullable=False)
    __table_args__ = (db.UniqueConstraint('staff_id','subject_id','lecture_type','batch_number','classroom_name'),)

# --- Auth Helpers ---
def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('is_admin'):
            return jsonify({'error':'Admin login required'}), 401
        return f(*args, **kwargs)
    return decorated

# --- Admin Routes ---
@app.route('/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    # Hard-coded admin credentials
    if data.get('username') == 'bvp@admin' and data.get('password') == 'bvp@pass':
        session['is_admin'] = True
        return jsonify({'message':'Admin logged in'})
    return jsonify({'error':'Invalid credentials'}), 401

@app.route('/admin/staff', methods=['GET','POST'])
@admin_required
def manage_staff():
    if request.method == 'GET':
        return jsonify([{'id':s.id,'username':s.username,'full_name':s.full_name} for s in Staff.query.all()])
    data = request.json
    pwd_hash = bcrypt.generate_password_hash(data['password']).decode()
    new_staff = Staff(username=data['username'], full_name=data['full_name'], password_hash=pwd_hash)
    db.session.add(new_staff)
    db.session.commit()
    return jsonify({'message':'Staff added','id':new_staff.id})

@app.route('/admin/staff/<int:id>', methods=['PUT','DELETE'])
@admin_required
def update_delete_staff(id):
    staff = Staff.query.get_or_404(id)
    if request.method == 'PUT':
        data = request.json
        staff.full_name = data.get('full_name',staff.full_name)
        if 'password' in data:
            staff.password_hash = bcrypt.generate_password_hash(data['password']).decode()
        db.session.commit()
        return jsonify({'message':'Staff updated'})
    db.session.delete(staff)
    db.session.commit()
    return jsonify({'message':'Staff deleted'})

@app.route('/admin/subjects', methods=['GET','POST'])
@admin_required
def manage_subjects():
    if request.method == 'GET':
        return jsonify([{'id':sub.id,'course_code':sub.course_code,'dept_code':sub.dept_code,'semester':sub.semester_number,'code':sub.subject_code,'name':sub.subject_name} for sub in Subject.query.all()])
    data = request.json
    new_sub = Subject(course_code=data['course_code'],dept_code=data['dept_code'],semester_number=data['semester_number'],subject_code=data['subject_code'],subject_name=data['subject_name'])
    db.session.add(new_sub)
    db.session.commit()
    return jsonify({'message':'Subject added','id':new_sub.id})

@app.route('/admin/subjects/<int:id>', methods=['PUT','DELETE'])
@admin_required
def update_delete_subject(id):
    sub = Subject.query.get_or_404(id)
    if request.method=='PUT':
        data = request.json
        sub.subject_name = data.get('subject_name',sub.subject_name)
        sub.subject_code = data.get('subject_code',sub.subject_code)
        db.session.commit()
        return jsonify({'message':'Subject updated'})
    db.session.delete(sub)
    db.session.commit()
    return jsonify({'message':'Subject deleted'})

@app.route('/admin/assignments', methods=['GET','POST'])
@admin_required
def manage_assignments():
    if request.method=='GET':
        return jsonify([{'id':a.id,'staff_id':a.staff_id,'subject_id':a.subject_id,'lecture_type':a.lecture_type,'batch_number':a.batch_number,'classroom_name':a.classroom_name} for a in Assignment.query.all()])
    data = request.json
    new_a = Assignment(staff_id=data['staff_id'],subject_id=data['subject_id'],lecture_type=data['lecture_type'],batch_number=data.get('batch_number'),classroom_name=data['classroom_name'])
    db.session.add(new_a)
    db.session.commit()
    return jsonify({'message':'Assignment created','id':new_a.id})

@app.route('/admin/assignments/<int:id>', methods=['DELETE'])
@admin_required
def delete_assignment(id):
    a = Assignment.query.get_or_404(id)
    db.session.delete(a)
    db.session.commit()
    return jsonify({'message':'Assignment deleted'})

# --- Staff Routes ---
@app.route('/staff/login', methods=['POST'])
def staff_login():
    data = request.json
    staff = Staff.query.filter_by(username=data['username']).first()
    if staff and bcrypt.check_password_hash(staff.password_hash, data['password']):
        session['staff_id'] = staff.id
        return jsonify({'message':'Login successful'})
    return jsonify({'error':'Invalid credentials'}), 401

@app.route('/staff/assignments', methods=['GET'])
def staff_assignments():
    sid = session.get('staff_id')
    if not sid: return jsonify({'error':'Login required'}), 401
    rows = Assignment.query.join(Subject,Assignment.subject_id==Subject.id).filter(Assignment.staff_id==sid).all()
    out = {}
    for a in rows:
        out.setdefault(a.subject_id, {'code':a.subject.subject_code,'lecture_types':{}})
        out[a.subject_id]['lecture_types'].setdefault(a.lecture_type,[]).append(a.batch_number)
    return jsonify(out)

@app.route('/staff/attendance', methods=['POST'])
def mark_attendance():
    sid = session.get('staff_id')
    if not sid: return jsonify({'error':'Login required'}), 401
    data = request.json
    subj = Subject.query.get_or_404(data['subject_id'])
    lecture_type = data.get('lecture_type')
    batch = data.get('batch_number')
    absentees = set(data.get('absent_rolls', []))

    if lecture_type != 'TH' and batch is not None:
        valid = set(get_batch_rolls(batch))
        if diff := (absentees - valid):
            return jsonify({'error':f'Invalid rolls for batch {batch}: {diff}'}), 400
        absentees &= valid

    sheet = get_sheet()
    subj_code = subj.subject_code
    mapping = subject_column_map.get(subj_code, {}).get(lecture_type)
    if not mapping:
        return jsonify({'error':f'No mapping for subject {subj_code} lecture {lecture_type}'}), 400
    key = None if lecture_type == 'TH' else batch
    if key not in mapping:
        return jsonify({'error':f'No mapping entry for {lecture_type} batch {batch}'}), 400
    col_letter, count_cell = mapping[key]
    col_idx = col_letter_to_index(col_letter)

    rolls = sheet.col_values(1)[4:71]
    for i, r in enumerate(rolls):
        if r in absentees:
            row = i + 5
            current = cell_value_to_int(sheet.cell(row, col_idx).value)
            sheet.update_cell(row, col_idx, current - 1)

    current_total = cell_value_to_int(sheet.acell(count_cell).value)
    sheet.update_acell(count_cell, current_total + 1)

    return jsonify({'message':'Attendance updated'})

if __name__ == '__main__':
    db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)
