import sys
import os
import traceback
import json

def app(environ, start_response):
    try:
        import fastapi
        import pydantic
        import uvicorn
        body = json.dumps({
            "status": "success",
            "sys_path": sys.path,
            "fastapi": fastapi.__version__,
            "cwd": os.getcwd(),
        }).encode('utf-8')
        status = '200 OK'
    except Exception as e:
        body = traceback.format_exc().encode('utf-8')
        status = '500 Internal Server Error'

    response_headers = [
        ('Content-type', 'application/json' if status == '200 OK' else 'text/plain'),
        ('Content-Length', str(len(body)))
    ]
    start_response(status, response_headers)
    return [body]
