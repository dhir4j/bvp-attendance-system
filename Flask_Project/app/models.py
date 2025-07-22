from . import db
from sqlalchemy.orm import relationship

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

# --- Student & Batch Models ---

student_batches = db.Table('student_batches',
    db.Column('student_id', db.Integer, db.ForeignKey('students.id'), primary_key=True),
    db.Column('batch_id', db.Integer, db.ForeignKey('batches.id'), primary_key=True)
)

class Student(db.Model):
    __tablename__ = 'students'
    id            = db.Column(db.Integer, primary_key=True)
    roll_no       = db.Column(db.String, nullable=False)
    enrollment_no = db.Column(db.String, unique=True, nullable=False)
    name          = db.Column(db.String, nullable=False)
    batch_number  = db.Column(db.Integer, nullable=True) # For PR/TU batches (1, 2, 3)
    batches       = relationship("Batch", secondary=student_batches, back_populates="students")

class Batch(db.Model):
    __tablename__ = 'batches'
    id            = db.Column(db.Integer, primary_key=True)
    dept_name     = db.Column(db.String, nullable=False)
    class_number  = db.Column(db.String, nullable=False)
    academic_year = db.Column(db.String, nullable=False)
    semester      = db.Column(db.Integer, nullable=False)
    students      = relationship("Student", secondary=student_batches, back_populates="batches")
    __table_args__ = (db.UniqueConstraint('dept_name', 'class_number', 'academic_year', 'semester'),)

class Assignment(db.Model):
    __tablename__ = 'staff_subject_assignment'
    id             = db.Column(db.Integer, primary_key=True)
    staff_id       = db.Column(db.Integer, db.ForeignKey('staff.id'), nullable=False)
    subject_id     = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    batch_id       = db.Column(db.Integer, db.ForeignKey('batches.id'), nullable=False)
    lecture_type   = db.Column(db.String, nullable=False) # TH, PR, TU
    batch_number   = db.Column(db.Integer, nullable=True) # For PR/TU batches (1, 2, 3)

class AttendanceRecord(db.Model):
    __tablename__ = 'attendance_records'
    id           = db.Column(db.Integer, primary_key=True)
    assignment_id= db.Column(db.Integer, db.ForeignKey('staff_subject_assignment.id'), nullable=False)
    student_id   = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    date         = db.Column(db.Date, nullable=False)
    status       = db.Column(db.String, nullable=False) # present, absent
    lecture_count= db.Column(db.Integer, default=1, nullable=False)
