from flask import Blueprint, jsonify

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return jsonify({
        'status': 'ok',
        'message': 'Welcome to the BVP Attendance API - Now with SQL Backend!'
    })
