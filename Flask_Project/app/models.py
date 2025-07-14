from . import db

class Department(db.Model):
    __tablename__ = 'departments'
    dept_code = db.Column(db.String, primary_key=True)
    dept_name = db.Column(db.String, nullable=False)

class Semester(db.Model):
    __tablename__ = 'semesters'
    id              = db.Column(db.Integer, primary_key=True)
    dept_code       = db.Column(db.String, db.ForeignKey('departments.dept_code'), nullable=False)
    semester_number = db.Column(db.Integer, nullable=False)
    __table_args__ = (db.UniqueConstraint('dept_code','semester_number'),)

class Subject(db.Model):
    __tablename__ = 'subjects'
    id               = db.Column(db.Integer, primary_key=True)
    course_code      = db.Column(db.String, nullable=False)
    dept_code        = db.Column(db.String, db.ForeignKey('departments.dept_code'), nullable=False)
    semester_number  = db.Column(db.Integer, nullable=False)
    subject_code     = db.Column(db.String, nullable=False)
    subject_name     = db.Column(db.String, nullable=False)
    __table_args__ = (db.UniqueConstraint('course_code','dept_code','semester_number'),)

class Staff(db.Model):
    __tablename__ = 'staff'
    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String, unique=True, nullable=False)
    password_hash = db.Column(db.String, nullable=False)
    full_name     = db.Column(db.String, nullable=False)

class Classroom(db.Model):
    __tablename__ = 'classrooms'
    id         = db.Column(db.Integer, primary_key=True)
    dept_code  = db.Column(db.String, db.ForeignKey('departments.dept_code'), nullable=False)
    class_name = db.Column(db.String, nullable=False)
    __table_args__ = (db.UniqueConstraint('dept_code','class_name'),)

class Assignment(db.Model):
    __tablename__ = 'staff_subject_assignment'
    id             = db.Column(db.Integer, primary_key=True)
    staff_id       = db.Column(db.Integer, db.ForeignKey('staff.id'), nullable=False)
    subject_id     = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    lecture_type   = db.Column(db.String, nullable=False)
    batch_number   = db.Column(db.Integer)
    classroom_name = db.Column(db.String, nullable=False)
    worksheet_name = db.Column(db.String, nullable=False, server_default='DefaultSheet') # Added with a default
    __table_args__ = (db.UniqueConstraint('staff_id','subject_id','lecture_type','batch_number','classroom_name'),)
