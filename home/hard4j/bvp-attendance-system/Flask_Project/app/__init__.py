from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS

db     = SQLAlchemy()
bcrypt = Bcrypt()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    # allow only your front-end origin
    CORS(app, resources={r"/*": {"origins": ["https://bvp.scrape.ink"]}})

    db.init_app(app)
    bcrypt.init_app(app)

    # --- create tables and seed default departments ---
    with app.app_context():
        from .models import Department, Assignment, Classroom, AttendanceRecord, Batch, Student, student_batches
        
        # This is a temporary and aggressive way to handle schema changes in development.
        # For production, a migration tool like Alembic would be used.
        # We must drop tables in the correct order of dependency.
        AttendanceRecord.__table__.drop(db.engine, checkfirst=True)
        Assignment.__table__.drop(db.engine, checkfirst=True)
        Classroom.__table__.drop(db.engine, checkfirst=True)
        
        # Drop the join table first, then the students and batches tables.
        student_batches.drop(db.engine, checkfirst=True)
        Student.__table__.drop(db.engine, checkfirst=True)
        Batch.__table__.drop(db.engine, checkfirst=True)
        
        # 1) create any missing tables or columns
        db.create_all()

        # 2) seed only-if-missing the five depts
        default_depts = [
            ("AN", "Artificial Intelligence and Machine Learning"),
            ("CE", "Civil Engineering"),
            ("CO", "Computer Engineering"),
            ("BD", "Cloud Computing And Big Data"),
            ("ME", "Mechanical Engineering"),
        ]

        for code, name in default_depts:
            if not Department.query.get(code):
                db.session.add(Department(dept_code=code, dept_name=name))

        # commit all at once
        db.session.commit()

    # --- register your blueprints ---
    from .routes.admin import admin_bp
    from .routes.staff import staff_bp
    from .routes.main import main_bp

    app.register_blueprint(admin_bp,   url_prefix='/admin')
    app.register_blueprint(staff_bp,   url_prefix='/staff')
    app.register_blueprint(main_bp,    url_prefix='')

    return app
