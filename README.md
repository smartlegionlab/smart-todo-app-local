# Smart ToDo App

![Smart ToDo App](https://github.com/smartlegionlab/smart-todo-app-local/blob/master/images/todo.png)

*Application Screenshot*

## 🚀 About

**Smart ToDo App** is a modern, full-featured web-based task management application built with pure Python and JavaScript. The application offers an intuitive interface with dark theme and a complete set of features for productive task management.

## ✨ Features

- ✅ **Complete Task Management** - create, edit, delete, mark as completed
- 🖱️ **Drag & Drop Reordering** - intuitively rearrange tasks with mouse
- ⬆️⬇️ **Manual Reordering** - move tasks up/down with buttons
- 🏷️ **Smart Filtering** - view active, completed, or all tasks
- 💾 **Local Database** - SQLite for reliable data storage
- 📱 **Responsive Design** - works perfectly on all devices
- 🎨 **Dark Theme** - modern eye-friendly interface
- 📊 **Real-time Statistics** - track progress with live counters
- 📥📤 **Import/Export** - backup and restore your tasks in JSON format
- 💽 **Auto Backup** - automatic database backups with retention
- ⚡ **Fast & Lightweight** - no external dependencies required
- 🔄 **Persistent Order** - task order saved between sessions

## 🛠️ Technology Stack

- **Backend**: Pure Python 3, HTTP server, SQLite
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Icons**: Font Awesome 6
- **Database**: SQLite with automatic schema management

## 📋 Requirements

- Python 3.6+
- Modern web browser

## 🚀 Quick Start

### Installation & Running



1. **Run the application:**
   ```bash
   python main.py
   ```

2. **The application will:**
   - Start the local server on available port (8000, 8001, etc.)
   - Automatically open your default browser
   - Create the SQLite database automatically
   - Create backup directory for database backups
   - Be ready to use immediately

### Manual Access
If the browser doesn't open automatically, visit:
```
http://localhost:8000
```

## 🎯 Usage

### Adding Tasks
- Type your task in the input field
- Press Enter or click "Add Task"
- Tasks are saved instantly to the database

### Managing Tasks
- **Checkbox**: Mark tasks as completed/incomplete
- **Edit** (✏️): Modify task text with inline editing
- **Delete** (🗑️): Remove tasks with confirmation
- **Drag & Drop**: Reorder tasks by dragging them
- **Arrows** (⬆️⬇️): Reorder tasks by moving them up/down

### Filtering
- **Active**: Show only pending tasks
- **All**: Display all tasks
- **Completed**: View finished tasks only

### Data Management
- **Export**: Download all tasks as JSON file
- **Import**: Replace current tasks with JSON backup
- **Clear Completed**: Remove all finished tasks at once
- **Exit**: Shut down the server and close the app

## 📁 Project Structure

```
smart-todo-app/
├── main.py                 # Main server launcher
├── core/
│   ├── database.py         # Database operations & backup system
│   └── todo_app.py         # HTTP handler & API routes
├── index.html              # Web interface
├── js/
│   └── app.js              # Frontend functionality
├── styles/
│   └── styles.css          # Styling & responsive design
├── backups/                # Automatic database backups
└── todo.db                 # SQLite database (auto-created)
```

## 🔧 API Endpoints

The application provides a RESTful API:

- `GET /api/tasks` - Retrieve all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/{uuid}` - Update task
- `DELETE /api/tasks/{uuid}` - Delete task
- `POST /api/reorder` - Update task order
- `POST /api/shutdown` - Shutdown server

## 🎨 Customization

### Color Scheme
The application uses CSS variables for easy theming:
```css
:root {
    --primary: #0d1117;
    --secondary: #161b22;
    --accent: #0d6efd;
    --success: #198754;
    /* ... more variables */
}
```

## 📱 Mobile Support

Fully responsive design with optimized layouts for:
- Mobile phones (320px+)
- Tablets (768px+)
- Desktop (1024px+)

## 🔒 Data Safety

- **Automatic Backups**: Database backed up on every startup
- **Backup Retention**: Keeps last 3 backups, removes older ones
- **Data Persistence**: Task order and status preserved between sessions

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Server automatically finds next available port (8000, 8001, 8002...)
# Or kill process using port (Unix/Linux/Mac)
lsof -ti:8000 | xargs kill -9
```

**Browser doesn't open automatically:**
- Manually navigate to `http://localhost:8000` (or next available port)
- Check if your firewall allows Python applications

**Tasks not saving:**
- Ensure write permissions in the application directory
- Check browser console for JavaScript errors

## 📄 License

Licensed under the terms of the BSD 3-Clause License.  
Copyright © 2024-2025, Alexander Suvorov. All rights reserved.

## 🔗 Links

- **GitHub**: [https://github.com/smartlegionlab/](https://github.com/smartlegionlab/)
- **Documentation**: Included in source code headers

---

**Ready to get organized?** Run `python main.py` and start managing your tasks efficiently!

---

Termux:

```bash
pkg update

pkg upgrade

pkg install python

pkg install git

git clone https://github.com/smartlegionlab/smart-todo-app-local.git

cd smart-todo-app-local

python main.py

```

---
