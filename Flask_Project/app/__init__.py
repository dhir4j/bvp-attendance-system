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

    with app.app_context():
        db.create_all()

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
