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
        this.currentFilter = 'all';
        this.draggedTask = null;
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

        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.setFilter(tab.dataset.filter);
            });
        });

        document.getElementById('clearCompleted').addEventListener('click', () => this.clearCompleted());
        document.getElementById('exportTasks').addEventListener('click', () => this.exportTasks());
        document.getElementById('importTasks').addEventListener('click', () => this.importTasks());
        document.getElementById('exitApp').addEventListener('click', () => this.exitApp());

        this.importInput = document.createElement('input');
        this.importInput.type = 'file';
        this.importInput.accept = '.json';
        this.importInput.style.display = 'none';
        this.importInput.addEventListener('change', (e) => this.handleFileImport(e));
        document.body.appendChild(this.importInput);

        const tasksContainer = document.getElementById('tasksContainer');
        tasksContainer.addEventListener('click', (e) => this.handleTaskClick(e));
        tasksContainer.addEventListener('change', (e) => this.handleTaskChange(e));
        
        this.setupDragAndDrop();

        window.addEventListener('beforeunload', () => this.shutdownServer());
    }

    setupDragAndDrop() {
        const container = document.getElementById('tasksContainer');
        
        container.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('drag-handle') || e.target.classList.contains('task-card')) {
                const taskCard = e.target.classList.contains('task-card') ? e.target : e.target.closest('.task-card');
                
                if (taskCard) {
                    this.draggedTask = taskCard;
                    taskCard.classList.add('dragging');
                    
                    e.dataTransfer.setData('text/plain', taskCard.dataset.uuid);
                    e.dataTransfer.effectAllowed = 'move';
                    
                    setTimeout(() => {
                        taskCard.style.opacity = '0.5';
                    }, 0);
                }
            }
        });
        
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!this.draggedTask) return;
            
            const afterElement = this.getDragAfterElement(container, e.clientY);
            
            if (afterElement == null) {
                container.appendChild(this.draggedTask);
            } else {
                container.insertBefore(this.draggedTask, afterElement);
            }
        });
        
        container.addEventListener('dragend', (e) => {
            if (this.draggedTask) {
                this.draggedTask.classList.remove('dragging');
                this.draggedTask.style.opacity = '1';
                this.saveNewOrder();
                this.draggedTask = null;
            }
        });

        container.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (this.draggedTask && e.target.classList.contains('task-card')) {
                e.target.classList.add('drag-over');
            }
        });

        container.addEventListener('dragleave', (e) => {
            if (e.target.classList.contains('task-card')) {
                e.target.classList.remove('drag-over');
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            document.querySelectorAll('.task-card').forEach(card => {
                card.classList.remove('drag-over');
            });
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
        
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

    handleTaskClick(e) {
        const taskElement = e.target.closest('.task-card');
        if (!taskElement) return;

        const taskUuid = taskElement.dataset.uuid;
        const task = this.tasks.find(t => t.uuid === taskUuid);
        if (!task) return;

        if (e.target.classList.contains('drag-handle')) {
            return;
        }

        if (e.target.closest('.edit-task')) {
            this.enableEditMode(taskElement, task);
            return;
        }

        if (e.target.closest('.delete-task')) {
            this.deleteTask(taskUuid);
            return;
        }

        if (e.target.closest('.save-edit')) {
            this.saveEdit(taskElement, task);
            return;
        }

        if (e.target.closest('.cancel-edit')) {
            this.disableEditMode(taskElement);
            return;
        }
    }

    handleTaskChange(e) {
        if (e.target.classList.contains('task-completed')) {
            const taskElement = e.target.closest('.task-card');
            const taskUuid = taskElement.dataset.uuid;
            this.updateTask(taskUuid, { completed: e.target.checked });
        }
    }

    async loadTasks() {
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) throw new Error('Failed to fetch tasks');
            
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

    async saveNewOrder() {
        const container = document.getElementById('tasksContainer');
        const taskElements = container.querySelectorAll('.task-card');
        const newOrder = Array.from(taskElements).map(task => task.dataset.uuid);
        
        try {
            const response = await fetch('/api/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: newOrder })
            });

            if (!response.ok) throw new Error('Failed to save order');
            
            this.tasks.sort((a, b) => newOrder.indexOf(a.uuid) - newOrder.indexOf(b.uuid));
            this.showNotification('Tasks reordered', 'success');
            
        } catch (error) {
            console.error('Failed to save task order:', error);
            this.showNotification('Failed to save task order', 'error');
            await this.loadTasks();
        }
    }

    enableEditMode(taskElement, task) {
        const content = taskElement.querySelector('.task-content');
        const edit = taskElement.querySelector('.task-edit');
        const input = taskElement.querySelector('.edit-input');

        if (!content || !edit || !input) return;

        content.style.display = 'none';
        edit.style.display = 'block';
        input.value = task.name;
        input.focus();
        input.select();
    }

    disableEditMode(taskElement) {
        const content = taskElement.querySelector('.task-content');
        const edit = taskElement.querySelector('.task-edit');

        if (content && edit) {
            content.style.display = 'flex';
            edit.style.display = 'none';
        }
    }

    saveEdit(taskElement, task) {
        const input = taskElement.querySelector('.edit-input');
        if (!input) return;
        
        const newName = input.value.trim();
        
        if (newName && newName !== task.name) {
            this.updateTask(task.uuid, { name: newName });
        } else if (!newName) {
            this.showNotification('Task name cannot be empty', 'warning');
        }
        this.disableEditMode(taskElement);
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });

        this.renderTasks();
    }

    renderTasks() {
        const container = document.getElementById('tasksContainer');
        const emptyState = document.getElementById('emptyState');
        const template = document.getElementById('taskTemplate');

        if (!container || !emptyState || !template) return;

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
            const taskCard = taskElement.querySelector('.task-card');
            
            taskCard.dataset.uuid = task.uuid;
            
            if (task.completed) {
                taskCard.classList.add('completed');
            }

            const taskName = taskElement.querySelector('.task-name');
            const taskDate = taskElement.querySelector('.task-date');
            const checkbox = taskElement.querySelector('.task-completed');

            if (taskName) taskName.textContent = task.name;
            if (taskDate) taskDate.textContent = this.formatDate(task.created_date);
            if (checkbox) checkbox.checked = task.completed;

            container.appendChild(taskElement);
        });
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

        this.updateElementText('totalTasks', total);
        this.updateElementText('activeTasks', active);
        this.updateElementText('completedTasks', completed);
        this.updateElementText('completionRate', `${completionRate}%`);
        this.updateElementText('todayTasks', `${today} today`);

        this.updateElementText('allCount', total);
        this.updateElementText('activeCount', active);
        this.updateElementText('completedCount', completed);

        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = `${completionRate}%`;
        }
    }

    updateElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '';
        }
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

    async clearCompleted() {
        const completedTasks = this.tasks.filter(task => task.completed);
        if (completedTasks.length === 0) {
            this.showNotification('No completed tasks to clear', 'info');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${completedTasks.length} completed task(s)?`)) return;

        try {
            await Promise.all(
                completedTasks.map(task => 
                    fetch(`/api/tasks/${task.uuid}`, {
                        method: 'DELETE'
                    })
                )
            );
            
            await this.loadTasks();
            this.showNotification(`Cleared ${completedTasks.length} completed tasks`, 'success');
            
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

    async exitApp() {
        if (!confirm('Are you sure you want to exit? The server will be shut down.')) {
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
            await fetch('/api/shutdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.log('Server shutdown request sent');
        }
    }

    showNotification(message, type = 'info') {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
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
}

document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});