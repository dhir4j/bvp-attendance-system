from flask import session, jsonify
from functools import wraps

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('is_admin'):
            return jsonify({'error': 'Admin login required'}), 401
        return f(*args, **kwargs)
    return decorated

def staff_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('staff_id'):
            return jsonify({'error': 'Login required'}), 401
        return f(*args, **kwargs)
    return decorated

def hod_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('hod_id') or session.get('role') != 'hod':
            return jsonify({'error': 'HOD login required'}), 401
        return f(*args, **kwargs)
    return decorated
