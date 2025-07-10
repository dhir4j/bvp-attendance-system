import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'replace-with-secure-key')
    SQLALCHEMY_DATABASE_URI = (
        os.environ.get('DATABASE_URL')
        or 'postgresql://dhir4j:m4dc0d3r@hard4j-4630.postgres.pythonanywhere-services.com:14630/bvpattnedance'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Google Sheets
    SHEET_KEY    = '1E5L6Vo8jJugszPiYzximSMYTuV3nBuhD7JOX6feTB2E'
    SERVICE_JSON = os.environ.get('SERVICE_JSON', 'sheets.json')
