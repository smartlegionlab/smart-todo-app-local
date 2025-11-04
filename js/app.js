// --------------------------------------------------------
// Licensed under the terms of the BSD 3-Clause License
// (see LICENSE for details).
// Copyright © 2024-2025, Alexander Suvorov
// All rights reserved.
// --------------------------------------------------------
// https://github.com/smartlegionlab/
// --------------------------------------------------------

class TodoApp {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'active';
        this.draggedTask = null;
        this.activeTaskUuid = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTasks();
    }

    bindEvents() {
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.setFilter(tab.dataset.filter);
            });
        });

        document.getElementById('clearCompleted').addEventListener('click', () => this.clearCompleted());
        document.getElementById('exportTasks').addEventListener('click', () => this.exportTasks());
        document.getElementById('importTasks').addEventListener('click', () => this.importTasks());

        this.importInput = document.createElement('input');
        this.importInput.type = 'file';
        this.importInput.accept = '.json';
        this.importInput.style.display = 'none';
        this.importInput.addEventListener('change', (e) => this.handleFileImport(e));
        document.body.appendChild(this.importInput);

        document.getElementById('tasksContainer').addEventListener('click', (e) => {
            this.handleTaskContainerClick(e);
        });

        document.getElementById('tasksContainer').addEventListener('change', (e) => {
            this.handleTaskContainerChange(e);
        });


        document.getElementById('exitApp').addEventListener('click', () => this.exitApp())

        window.addEventListener('beforeunload', () => this.shutdownServer());
        this.setupDragAndDrop();

    }

    setupDragAndDrop() {
        const container = document.getElementById('tasksContainer');
        
        container.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('task-item')) {
                e.target.classList.add('dragging');
                this.draggedTask = e.target;
                this.activeTaskUuid = e.target.dataset.uuid;
            }
        });
        
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(container, e.clientY);
            const draggable = document.querySelector('.dragging');
            if (draggable) {
                if (afterElement == null) {
                    container.appendChild(draggable);
                } else {
                    container.insertBefore(draggable, afterElement);
                }
            }
        });
        
        container.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            this.saveNewOrder();
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    async saveNewOrder() {
        const container = document.getElementById('tasksContainer');
        const taskElements = container.querySelectorAll('.task-item');
        const newOrder = Array.from(taskElements).map(task => task.dataset.uuid);
        
        
        try {
            const response = await fetch('/api/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: newOrder })
            });

            if (!response.ok) throw new Error('Failed to save order');
            
            this.tasks.sort((a, b) => newOrder.indexOf(a.uuid) - newOrder.indexOf(b.uuid));
            this.renderTasks();
            
        } catch (error) {
            console.error('Failed to save task order:', error);
            this.showNotification('Failed to save task order', 'error');
            await this.loadTasks();
        }
    }

    async exitApp() {
        if (!confirm('Are you sure you want to log out? The server will be shut down.')) {
            return;
        }

        try {
            await this.shutdownServer();
            setTimeout(() => {
                window.close();
            }, 500);
        } catch (error) {
            console.log('Server already stopped, closing tab...');
            window.close();
        }
    }

    async shutdownServer() {
        try {
            fetch('/api/shutdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(1000)
            }).catch(() => {
                console.log('Server shutdown initiated');
            });
        } catch (error) {
            console.log('Server shutdown request sent');
        }
    }


    handleTaskContainerClick(e) {
        const taskElement = e.target.closest('.task-item');
        if (!taskElement) return;

        const taskUuid = taskElement.dataset.uuid;
        const task = this.tasks.find(t => t.uuid === taskUuid);
        if (!task) return;

        if (e.target.closest('.move-up')) {
            this.moveTask(taskUuid, 'up');
        } else if (e.target.closest('.move-down')) {
            this.moveTask(taskUuid, 'down');
        } else if (e.target.closest('.edit-task')) {
            this.enableEditMode(taskElement, task);
        } else if (e.target.closest('.delete-task')) {
            this.deleteTask(taskUuid);
        } else if (e.target.closest('.save-edit')) {
            this.saveEdit(taskElement, task);
        } else if (e.target.closest('.cancel-edit')) {
            this.disableEditMode(taskElement);
        } else if (e.target.closest('.checkmark')) {
            const checkbox = taskElement.querySelector('.task-completed');
            checkbox.checked = !checkbox.checked;
            this.updateTask(taskUuid, { completed: checkbox.checked });
        }
    }

    handleTaskContainerChange(e) {
        if (e.target.classList.contains('task-completed')) {
            const taskElement = e.target.closest('.task-item');
            const taskUuid = taskElement.dataset.uuid;
            this.updateTask(taskUuid, { completed: e.target.checked });
        }
    }

    async loadTasks() {
        try {
            const response = await fetch('/api/tasks');
            const data = await response.json();
            this.tasks = data.tasks || [];
            this.renderTasks();
            this.updateStats();
        } catch (error) {
            console.error('Failed to load tasks:', error);
            this.showNotification('Failed to load tasks', 'error');
        }
    }

    async addTask() {
        const input = document.getElementById('taskInput');
        const name = input.value.trim();

        if (!name) {
            this.showNotification('Please enter a task name', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                input.value = '';
                await this.loadTasks();
                this.showNotification('Task added successfully', 'success');
            } else {
                throw new Error('Failed to add task');
            }
        } catch (error) {
            console.error('Failed to add task:', error);
            this.showNotification('Failed to add task', 'error');
        }
    }

    async updateTask(uuid, updates) {
        try {
            const response = await fetch(`/api/tasks/${uuid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Failed to update task');
            
            const taskIndex = this.tasks.findIndex(task => task.uuid === uuid);
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
            }
            
            this.renderTasks();
            this.updateStats();
            this.showNotification('Task updated', 'success');
        } catch (error) {
            console.error('Failed to update task:', error);
            this.showNotification('Failed to update task', 'error');
        }
    }

    async deleteTask(uuid) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const response = await fetch(`/api/tasks/${uuid}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadTasks();
                this.showNotification('Task deleted', 'success');
            } else {
                throw new Error('Failed to delete task');
            }
        } catch (error) {
            console.error('Failed to delete task:', error);
            this.showNotification('Failed to delete task', 'error');
        }
    }

    async moveTask(uuid, direction) {
        const taskIndex = this.tasks.findIndex(task => task.uuid === uuid);
        if (taskIndex === -1) return;

        const newIndex = direction === 'up' ? taskIndex - 1 : taskIndex + 1;
        if (newIndex < 0 || newIndex >= this.tasks.length) return;

        [this.tasks[taskIndex], this.tasks[newIndex]] = [this.tasks[newIndex], this.tasks[taskIndex]];

        this.activeTaskUuid = uuid;

        try {
            const response = await fetch('/api/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order: this.tasks.map(task => task.uuid)
                })
            });

            if (!response.ok) throw new Error('Failed to reorder tasks');
            
            this.renderTasks();
        } catch (error) {
            console.error('Failed to reorder tasks:', error);
            this.showNotification('Failed to reorder tasks', 'error');
            await this.loadTasks();
        }
    }

    async clearCompleted() {
        const completedTasks = this.tasks.filter(task => task.completed);
        if (completedTasks.length === 0) {
            this.showNotification('No completed tasks to clear', 'info');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${completedTasks.length} completed task(s)? This action cannot be undone.`)) return;

        try {
            await Promise.all(
                completedTasks.map(task => 
                    fetch(`/api/tasks/${task.uuid}`, {
                        method: 'DELETE'
                    })
                )
            );
            
            await this.loadTasks();
            this.showNotification(`Successfully deleted ${completedTasks.length} completed tasks`, 'success');
            
        } catch (error) {
            console.error('Failed to clear completed tasks:', error);
            this.showNotification('Failed to clear completed tasks', 'error');
        }
    }

    async importTasks() {
        this.importInput.click();
    }

    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        event.target.value = '';

        try {
            const text = await this.readFileAsText(file);
            const data = JSON.parse(text);

            if (!this.isValidImportData(data)) {
                this.showNotification('Invalid file format', 'error');
                return;
            }

            if (!confirm(`Import ${data.tasks.length} tasks? This will replace all current tasks.`)) {
                return;
            }

            await this.clearAllTasks();

            await this.importTasksData(data.tasks);

            this.showNotification(`Successfully imported ${data.tasks.length} tasks`, 'success');
            await this.loadTasks();

        } catch (error) {
            console.error('Import failed:', error);
            this.showNotification('Failed to import tasks: ' + error.message, 'error');
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('File reading failed'));
            reader.readAsText(file);
        });
    }

    isValidImportData(data) {
        return data && 
               Array.isArray(data.tasks) && 
               data.tasks.every(task => 
                   task.name && 
                   typeof task.completed === 'boolean'
               );
    }

    async clearAllTasks() {
        try {
            for (const task of this.tasks) {
                await fetch(`/api/tasks/${task.uuid}`, {
                    method: 'DELETE'
                });
            }
        } catch (error) {
            console.error('Failed to clear tasks:', error);
            throw new Error('Failed to clear existing tasks');
        }
    }

    async importTasksData(tasks) {
        try {
            for (const task of tasks) {
                await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        name: task.name,
                        completed: task.completed 
                    })
                });
            }
        } catch (error) {
            console.error('Failed to import tasks:', error);
            throw new Error('Failed to import tasks');
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });

        this.renderTasks();
    }

    renderTasks() {
        const container = document.getElementById('tasksContainer');
        const emptyState = document.getElementById('emptyState');
        const template = document.getElementById('taskTemplate');

        container.innerHTML = '';

        let filteredTasks = this.tasks;
        if (this.currentFilter === 'active') {
            filteredTasks = this.tasks.filter(task => !task.completed);
        } else if (this.currentFilter === 'completed') {
            filteredTasks = this.tasks.filter(task => task.completed);
        }

        emptyState.style.display = filteredTasks.length === 0 ? 'block' : 'none';

        filteredTasks.forEach((task) => {
            const taskElement = template.content.cloneNode(true);
            const taskItem = taskElement.querySelector('.task-item');
            
            taskItem.dataset.uuid = task.uuid;
            taskItem.draggable = true;
            taskItem.tabIndex = 0;
            
            if (task.uuid === this.activeTaskUuid) {
                taskItem.classList.add('active');
            }
            
            if (task.completed) {
                taskItem.classList.add('completed');
            }

            taskItem.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-action')) {
                    this.setActiveTask(task.uuid);
                }
            });

            taskItem.querySelector('.task-name').textContent = task.name;
            taskItem.querySelector('.task-date').textContent = this.formatDate(task.created_date);
            
            const checkbox = taskItem.querySelector('.task-completed');
            checkbox.checked = task.completed;

            container.appendChild(taskElement);
        });
    }

    setActiveTask(uuid) {
        this.activeTaskUuid = uuid;
        this.renderTasks();
    }

    enableEditMode(taskElement, task) {
        const content = taskElement.querySelector('.task-content');
        const edit = taskElement.querySelector('.task-edit');
        const input = taskElement.querySelector('.edit-input');

        content.style.display = 'none';
        edit.style.display = 'block';
        input.value = task.name;
        input.focus();
        input.select();
    }

    disableEditMode(taskElement) {
        const content = taskElement.querySelector('.task-content');
        const edit = taskElement.querySelector('.task-edit');

        content.style.display = 'flex';
        edit.style.display = 'none';
    }

    saveEdit(taskElement, task) {
        const input = taskElement.querySelector('.edit-input');
        const newName = input.value.trim();
        
        if (newName && newName !== task.name) {
            this.updateTask(task.uuid, { name: newName });
        }
        this.disableEditMode(taskElement);
    }

    updateStats() {
        const total = this.tasks.length;
        const active = this.tasks.filter(task => !task.completed).length;
        const completed = total - active;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        const today = this.tasks.filter(task => {
            const taskDate = new Date(task.created_date).toDateString();
            const today = new Date().toDateString();
            return taskDate === today;
        }).length;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('activeTasks').textContent = active;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('completionRate').textContent = `${completionRate}%`;
        document.getElementById('todayTasks').textContent = today;

        document.getElementById('allCount').textContent = total;
        document.getElementById('activeCount').textContent = active;
        document.getElementById('completedCount').textContent = completed;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    exportTasks() {
        const data = {
            exportedAt: new Date().toISOString(),
            totalTasks: this.tasks.length,
            tasks: this.tasks.map(task => ({
                name: task.name,
                completed: task.completed,
                created_date: task.created_date
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todo-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Tasks exported successfully', 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            success: '#198754',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#0dcaf0'
        };
        return colors[type] || '#0dcaf0';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});