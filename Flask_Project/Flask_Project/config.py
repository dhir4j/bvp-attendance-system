import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'replace-with-secure-key')
    SQLALCHEMY_DATABASE_URI = (
        os.environ.get('DATABASE_URL')
        or 'postgresql://dhir4j:m4dc0d3r@hard4j-4630.postgres.pythonanywhere-services.com:14630/bvpattnedance'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

     # instruct SQLAlchemy pool to pre-ping, recycle, and require SSL
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,                   # a bit under PythonAnywhere’s ~300s timeout
        "connect_args": {"sslmode": "require"}  # enforce SSL on every new connection
    }
