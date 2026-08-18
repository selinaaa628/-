import sys
import os
import traceback
import json

root_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, root_dir)
sys.path.insert(0, os.path.join(root_dir, "backend"))

def app(environ, start_response):
    try:
        from backend.main import app as main_app
        body = json.dumps({
            "status": "success_imported_main",
            "cwd": os.getcwd(),
        }).encode('utf-8')
        status = '200 OK'
    except BaseException as e:
        body = traceback.format_exc().encode('utf-8')
        status = '500 Internal Server Error'

    response_headers = [
        ('Content-type', 'application/json' if status == '200 OK' else 'text/plain'),
        ('Content-Length', str(len(body)))
    ]
    start_response(status, response_headers)
    return [body]
