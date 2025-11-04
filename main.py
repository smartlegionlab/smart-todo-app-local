#!/usr/bin/env python3
# --------------------------------------------------------
# Licensed under the terms of the BSD 3-Clause License
# (see LICENSE for details).
# Copyright © 2024-2025, Alexander Suvorov
# All rights reserved.
# --------------------------------------------------------
# https://github.com/smartlegionlab/
# --------------------------------------------------------

from http.server import HTTPServer
import webbrowser
import threading
import time
import socket

from core.todo_app import TodoHandler


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

def main():
    port = find_available_port(8000)
    
    server = HTTPServer(('localhost', port), TodoHandler)
    
    print("🚀 Smart ToDo App Server Started!")
    print(f"📍 Local: http://localhost:{port}")
    print("💾 Automatic database backup enabled")
    print("⏹️  Press Ctrl+C to stop the server")
    print("🔴 Use 'Exit' button in app to shutdown server")
    print("=" * 50)
    
    browser_thread = threading.Thread(target=open_browser, args=(port,))
    browser_thread.daemon = True
    browser_thread.start()
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user (Ctrl+C)")
    finally:
        print("🔒 Closing server...")
        server.server_close()

if __name__ == '__main__':
    main()
