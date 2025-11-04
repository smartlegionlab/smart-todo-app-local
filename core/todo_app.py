#!/usr/bin/env python3
# --------------------------------------------------------
# Licensed under the terms of the BSD 3-Clause License
# (see LICENSE for details).
# Copyright © 2024-2025, Alexander Suvorov
# All rights reserved.
# --------------------------------------------------------
# https://github.com/smartlegionlab/
# --------------------------------------------------------

from http.server import BaseHTTPRequestHandler
import json
import webbrowser
import time
from datetime import datetime
import os
import socket

from core.database import Database


class TodoAPI:
    def __init__(self):
        self.db = Database()

    def handle_request(self, path, method, body=None):
        try:
            if path == '/api/tasks' and method == 'GET':
                return self.get_tasks()
            elif path == '/api/tasks' and method == 'POST':
                return self.add_task(body)
            elif path.startswith('/api/tasks/') and method == 'PUT':
                return self.update_task(path, body)
            elif path.startswith('/api/tasks/') and method == 'DELETE':
                return self.delete_task(path)
            elif path == '/api/reorder' and method == 'POST':
                return self.reorder_tasks(body)
            elif path == '/api/shutdown' and method == 'POST':
                return self.shutdown_server()
            else:
                return {'error': 'Not found'}, 404
        except Exception as e:
            return {'error': str(e)}, 500

    def get_tasks(self):
        tasks = self.db.get_all_tasks()
        return {'tasks': tasks}, 200

    def add_task(self, data):
        if not data or 'name' not in data:
            return {'error': 'Task name is required'}, 400
        
        task_uuid = self.db.add_task(data['name'])
        return {'uuid': task_uuid}, 201

    def update_task(self, path, data):
        task_uuid = path.split('/')[-1]
        
        if 'name' in data and 'completed' in data:
            self.db.update_task(task_uuid, data['name'], data['completed'])
        elif 'name' in data:
            self.db.update_task(task_uuid, name=data['name'])
        elif 'completed' in data:
            self.db.update_task(task_uuid, completed=data['completed'])
        
        return {'success': True}, 200

    def delete_task(self, path):
        task_uuid = path.split('/')[-1]
        self.db.delete_task(task_uuid)
        self.db.reorder_tasks()
        return {'success': True}, 200

    def reorder_tasks(self, data):
        if 'order' not in data:
            return {'error': 'Order list is required'}, 400
        
        self.db.set_tasks_order(data['order'])
        return {'success': True}, 200

    def shutdown_server(self):
        print("🛑 Server shutdown requested via API")
        os._exit(0)

class TodoHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.api = TodoAPI()
        super().__init__(*args, **kwargs)

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.handle_api_request()
        else:
            self.serve_static_file()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self.handle_api_request()

    def do_PUT(self):
        if self.path.startswith('/api/'):
            self.handle_api_request()

    def do_DELETE(self):
        if self.path.startswith('/api/'):
            self.handle_api_request()

    def handle_api_request(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = None
            if content_length > 0:
                body_data = self.rfile.read(content_length)
                body = json.loads(body_data.decode('utf-8'))

            response, status_code = self.api.handle_request(self.path, self.command, body)
            
            self.send_response(status_code)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            self.wfile.write(json.dumps(response).encode('utf-8'))
        except BrokenPipeError:
            pass
        except Exception as e:
            print(f"API error: {e}")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def serve_static_file(self):
        if self.path == '/':
            self.path = '/index.html'
        
        try:
            file_path = f'.{self.path}'
            if not os.path.exists(file_path):
                self.send_error(404, 'File not found')
                return

            with open(file_path, 'rb') as file:
                content = file.read()

            content_type = 'text/html'
            if self.path.endswith('.css'):
                content_type = 'text/css'
            elif self.path.endswith('.js'):
                content_type = 'application/javascript'
            elif self.path.endswith('.png'):
                content_type = 'image/png'
            elif self.path.endswith('.jpg') or self.path.endswith('.jpeg'):
                content_type = 'image/jpeg'

            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.end_headers()
            self.wfile.write(content)

        except BrokenPipeError:
            pass
        except Exception as e:
            try:
                self.send_error(500, f'Server error: {str(e)}')
            except BrokenPipeError:
                pass

    def log_message(self, format, *args):
        if not self.path.startswith('/api/'):
            return
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {format % args}")
    
    def log_request(self, code='-', size='-'):
        if self.command != 'OPTIONS':
            super().log_request(code, size)

def find_available_port(start_port=8000, max_attempts=10):
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', port))
                return port
        except OSError:
            continue
    return start_port

def open_browser(port):
    time.sleep(1.5)
    webbrowser.open(f'http://localhost:{port}')
