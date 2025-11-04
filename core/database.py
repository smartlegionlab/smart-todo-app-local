#!/usr/bin/env python3
# --------------------------------------------------------
# Licensed under the terms of the BSD 3-Clause License
# (see LICENSE for details).
# Copyright © 2024-2025, Alexander Suvorov
# All rights reserved.
# --------------------------------------------------------
# https://github.com/smartlegionlab/
# --------------------------------------------------------

import sqlite3
from datetime import datetime
import uuid
import os
import shutil

class Database:
    def __init__(self, db_name='todo.db'):
        self.db_name = db_name
        self.backup_dir = 'backups'
        self.ensure_backup_dir()
        self.backup_database()
        self.init_db()

    def ensure_backup_dir(self):
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)
            print(f"📁 Created backup directory: {self.backup_dir}")

    def backup_database(self):
        if os.path.exists(self.db_name):
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_name = f"todo_backup_{timestamp}.db"
            backup_path = os.path.join(self.backup_dir, backup_name)
            
            shutil.copy2(self.db_name, backup_path)
            print(f"💾 Database backed up: {backup_path}")
            
            self.clean_old_backups()

    def clean_old_backups(self):
        try:
            backups = []
            for f in os.listdir(self.backup_dir):
                if f.startswith('todo_backup_') and f.endswith('.db'):
                    file_path = os.path.join(self.backup_dir, f)
                    backups.append((file_path, os.path.getctime(file_path)))
            
            backups.sort(key=lambda x: x[1])
            
            if len(backups) > 3:
                for old_backup in backups[:-3]:
                    os.remove(old_backup[0])
                    print(f"🗑️ Removed old backup: {os.path.basename(old_backup[0])}")
        except Exception as e:
            print(f"⚠️ Error cleaning backups: {e}")

    def init_db(self):
        with sqlite3.connect(self.db_name) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS tasks (
                    uuid TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    completed BOOLEAN NOT NULL DEFAULT 0,
                    created_date TEXT NOT NULL,
                    sort_order INTEGER NOT NULL DEFAULT 0
                )
            ''')
            conn.commit()
            print("✅ Database initialized")

    def get_all_tasks(self):
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.execute(
                'SELECT uuid, name, completed, created_date, sort_order FROM tasks ORDER BY sort_order'  # ← МЕНЯЕМ НА sort_order!
            )
            tasks = []
            for row in cursor.fetchall():
                task = {
                    'uuid': row[0],
                    'name': row[1], 
                    'completed': bool(row[2]),
                    'created_date': row[3],
                    'sort_order': row[4]
                }
                tasks.append(task)
            
            print(f"📊 Loaded {len(tasks)} tasks")
            return tasks

    def add_task(self, name):
        task_uuid = str(uuid.uuid4())
        created_date = datetime.now().isoformat()
        
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.execute('SELECT COALESCE(MAX(sort_order), 0) FROM tasks')
            max_order = cursor.fetchone()[0]
            sort_order = max_order + 1
            
            conn.execute(
                'INSERT INTO tasks (uuid, name, completed, created_date, sort_order) VALUES (?, ?, ?, ?, ?)',
                (task_uuid, name, False, created_date, sort_order)
            )
            print(f"✅ Added task: {name}")
            return task_uuid

    def update_task(self, task_uuid, name=None, completed=None):
        with sqlite3.connect(self.db_name) as conn:
            if name is not None and completed is not None:
                conn.execute(
                    'UPDATE tasks SET name = ?, completed = ? WHERE uuid = ?',
                    (name, completed, task_uuid)
                )
            elif name is not None:
                conn.execute('UPDATE tasks SET name = ? WHERE uuid = ?', (name, task_uuid))
            elif completed is not None:
                conn.execute('UPDATE tasks SET completed = ? WHERE uuid = ?', (completed, task_uuid))
            
            print(f"✏️ Updated task: {task_uuid}")

    def delete_task(self, task_uuid):
        with sqlite3.connect(self.db_name) as conn:
            conn.execute('DELETE FROM tasks WHERE uuid = ?', (task_uuid,))
            print(f"🗑️ Deleted task: {task_uuid}")

    def update_task_order(self, task_uuid, sort_order):
        with sqlite3.connect(self.db_name) as conn:
            conn.execute('UPDATE tasks SET sort_order = ? WHERE uuid = ?', (sort_order, task_uuid))

    def reorder_tasks(self):
        with sqlite3.connect(self.db_name) as conn:
            cursor = conn.execute('SELECT uuid FROM tasks ORDER BY sort_order')
            tasks = cursor.fetchall()
            for index, (task_uuid,) in enumerate(tasks):
                conn.execute('UPDATE tasks SET sort_order = ? WHERE uuid = ?', (index, task_uuid))

    def set_tasks_order(self, new_order):
        with sqlite3.connect(self.db_name) as conn:
            for index, task_uuid in enumerate(new_order):
                conn.execute('UPDATE tasks SET sort_order = ? WHERE uuid = ?', (index, task_uuid))
            print(f"🔀 Set new order for {len(new_order)} tasks")
