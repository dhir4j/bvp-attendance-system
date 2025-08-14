from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from sqlalchemy import text, inspect as sqlalchemy_inspect

db     = SQLAlchemy()
bcrypt = Bcrypt()

def create_app(config_name=None): # Added optional argument
    app = Flask(__name__)
    app.config.from_object('config.Config')

    # allow only your front-end origin
    CORS(app, resources={r"/*": {"origins": ["https://bvp.scrape.ink", "https://www.attendance.scrape.ink"]}})

    # Import models here so they are registered with SQLAlchemy
    from .models import Student, Staff, Subject, Department, Batch, Assignment, AttendanceRecord, TotalLectures, HOD
    
    db.init_app(app)
    bcrypt.init_app(app)

    # --- create tables if they don't exist and perform schema migration ---
    with app.app_context():
        # First, ensure all tables defined in models are created
        db.create_all()

        # Now, perform alterations if needed
        inspector = sqlalchemy_inspect(db.engine)
        
        # --- Migrate 'students' table ---
        try:
            student_columns = [col['name'] for col in inspector.get_columns('students')]
            if 'batch_number' not in student_columns:
                with db.engine.connect() as connection:
                    connection.execute(text('ALTER TABLE students ADD COLUMN batch_number INTEGER'))
                    connection.commit()
        except Exception as e:
            app.logger.error(f"Could not inspect/migrate students table: {e}")


        # --- Migrate 'staff_subject_assignment' table ---
        try:
            assignment_columns = [col['name'] for col in inspector.get_columns('staff_subject_assignment')]
            with db.engine.connect() as connection:
                if 'batch_id' not in assignment_columns:
                    # The batch_id needs to reference the 'batches' table's primary key 'id'
                    connection.execute(text('ALTER TABLE staff_subject_assignment ADD COLUMN batch_id INTEGER REFERENCES batches(id)'))
                
                if 'classroom_id' in assignment_columns:
                    connection.execute(text('ALTER TABLE staff_subject_assignment DROP COLUMN classroom_id'))
                
                connection.commit()
        except Exception as e:
            app.logger.error(f"Could not inspect/migrate staff_subject_assignment table: {e}")


    # --- register your blueprints ---
    from .routes.admin import admin_bp
    from .routes.staff import staff_bp
    from .routes.main import main_bp
    from .routes.hod import hod_bp

    app.register_blueprint(admin_bp,   url_prefix='/admin')
    app.register_blueprint(staff_bp,   url_prefix='/staff')
    app.register_blueprint(main_bp,    url_prefix='')
    app.register_blueprint(hod_bp,     url_prefix='/hod')

    return app
