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
    # This ensures tables are created before the app starts handling requests.
    with app.app_context():
        db.create_all()

    # --- register your blueprints ---
    from .routes.admin import admin_bp
    from .routes.staff import staff_bp
    from .routes.main import main_bp

    app.register_blueprint(admin_bp,   url_prefix='/admin')
    app.register_blueprint(staff_bp,   url_prefix='/staff')
    app.register_blueprint(main_bp,    url_prefix='')

    return app
