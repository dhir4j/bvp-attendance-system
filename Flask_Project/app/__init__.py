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

    # --- create tables if they don't exist ---
    with app.app_context():
        # This will create any missing tables without dropping existing ones.
        db.create_all()

        # Seed default departments if they are missing
        from .models import Department

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

        db.session.commit()

    # --- register your blueprints ---
    from .routes.admin import admin_bp
    from .routes.staff import staff_bp
    from .routes.main import main_bp

    app.register_blueprint(admin_bp,   url_prefix='/admin')
    app.register_blueprint(staff_bp,   url_prefix='/staff')
    app.register_blueprint(main_bp,    url_prefix='')

    return app
