from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from sqlalchemy import text

db     = SQLAlchemy()
bcrypt = Bcrypt()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    # allow only your front-end origin
    CORS(app, resources={r"/*": {"origins": ["https://bvp.scrape.ink"]}})

    db.init_app(app)
    bcrypt.init_app(app)

    # --- create tables if they don't exist and perform schema migration ---
    with app.app_context():
        db.create_all()

        # Add batch_number column to students table if it doesn't exist
        # This is a simple migration to handle schema evolution without a full migration tool.
        inspector = db.inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('students')]
        if 'batch_number' not in columns:
            with db.engine.connect() as connection:
                connection.execute(text('ALTER TABLE students ADD COLUMN batch_number INTEGER'))
                connection.commit()


    # --- register your blueprints ---
    from .routes.admin import admin_bp
    from .routes.staff import staff_bp
    from .routes.main import main_bp

    app.register_blueprint(admin_bp,   url_prefix='/admin')
    app.register_blueprint(staff_bp,   url_prefix='/staff')
    app.register_blueprint(main_bp,    url_prefix='')

    return app
