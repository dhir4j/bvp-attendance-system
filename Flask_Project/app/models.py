from . import db
from sqlalchemy.orm import relationship

# Association table for the many-to-many relationship between students and batches
student_batches = db.Table('student_batches',
    db.Column('student_id', db.Integer, db.ForeignKey('students.id'), primary_key=True),
    db.Column('batch_id', db.Integer, db.ForeignKey('batches.id'), primary_key=True)
)

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
    batch_id   = db.Column(db.Integer, db.ForeignKey('batches.id'), nullable=True) # Link classroom to a batch
    batch      = relationship("Batch", back_populates="classrooms")
    __table_args__ = (db.UniqueConstraint('dept_code','class_name'),)


class Assignment(db.Model):
    __tablename__ = 'staff_subject_assignment'
    id             = db.Column(db.Integer, primary_key=True)
    staff_id       = db.Column(db.Integer, db.ForeignKey('staff.id'), nullable=False)
    subject_id     = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    lecture_type   = db.Column(db.String, nullable=False)
    batch_number   = db.Column(db.Integer) # For practicals/tutorials within a larger batch
    classroom_id   = db.Column(db.Integer, db.ForeignKey('classrooms.id'), nullable=False)
    classroom      = relationship("Classroom")
    __table_args__ = (db.UniqueConstraint('staff_id','subject_id','lecture_type','batch_number','classroom_id'),)


# --- New Models for Student and Batch Management ---

class Student(db.Model):
    __tablename__ = 'students'
    id            = db.Column(db.Integer, primary_key=True)
    roll_no       = db.Column(db.String, nullable=False)
    enrollment_no = db.Column(db.String, unique=True, nullable=False)
    name          = db.Column(db.String, nullable=False)
    # This field will store the practical/tutorial batch number (e.g., 1, 2, 3)
    # It's not a foreign key, just data associated with the student for a given context.
    batch_number  = db.Column(db.Integer, nullable=True)
    
    # A student can be in multiple batches over time, but usually one active batch per semester
    batches = relationship('Batch', secondary=student_batches, back_populates='students')


class Batch(db.Model):
    __tablename__ = 'batches'
    id            = db.Column(db.Integer, primary_key=True)
    dept_code     = db.Column(db.String, db.ForeignKey('departments.dept_code'), nullable=False)
    class_name    = db.Column(db.String, nullable=False) # e.g. "CO2", "AN1"
    academic_year = db.Column(db.String, nullable=False) # e.g. "2024-2025"
    semester      = db.Column(db.Integer, nullable=False)
    
    students = relationship('Student', secondary=student_batches, back_populates='batches')
    classrooms = relationship("Classroom", back_populates="batch")
    
    __table_args__ = (db.UniqueConstraint('dept_code', 'class_name', 'academic_year', 'semester'),)


class AttendanceRecord(db.Model):
    __tablename__ = 'attendance_records'
    id             = db.Column(db.Integer, primary_key=True)
    assignment_id  = db.Column(db.Integer, db.ForeignKey('staff_subject_assignment.id'), nullable=False)
    attendance_date= db.Column(db.Date, nullable=False)
    absent_rolls   = db.Column(db.JSON, nullable=False) # Store list of absent roll numbers
    lecture_type   = db.Column(db.String, nullable=False)
    # This stores the practical/tutorial batch number for which attendance was taken
    batch_number   = db.Column(db.Integer, nullable=True) 
    
    assignment     = relationship("Assignment")
    __table_args__ = (db.UniqueConstraint('assignment_id', 'attendance_date', 'batch_number'),)
