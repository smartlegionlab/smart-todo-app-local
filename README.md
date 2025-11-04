# Smart ToDo App

![Smart ToDo App](https://github.com/smartlegionlab/smart-todo-app-local/blob/master/smart_todo_app_local.png)
*Application Screenshot*

## 🚀 About

**Smart ToDo App** is a modern, full-featured web-based task management application built with pure Python and JavaScript. The application offers an intuitive interface with dark theme and a complete set of features for productive task management.

## ✨ Features

- ✅ **Complete Task Management** - create, edit, delete, mark as completed
- 🔄 **Task Reordering** - change task order with up/down buttons
- 🏷️ **Smart Filtering** - view active, completed, or all tasks
- 💾 **Local Database** - SQLite for reliable data storage
- 📱 **Responsive Design** - works perfectly on all devices
- 🎨 **Dark Theme** - modern eye-friendly interface
- 📊 **Real-time Statistics** - track progress with live counters
- 📥📤 **Import/Export** - backup and restore your tasks in JSON format
- ⚡ **Fast & Lightweight** - no external dependencies required

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

1. **Clone or download the project files:**
   - `main.py` - Python server
   - `index.html` - Web interface
   - `styles.css` - Styling
   - `app.js` - Frontend logic

2. **Run the application:**
   ```bash
   python main.py
   ```

3. **The application will:**
   - Start the local server on port 8000
   - Automatically open your default browser
   - Create the SQLite database automatically
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
- **Arrows** (⬆️⬇️): Reorder tasks by moving them up/down

### Filtering
- **Active**: Show only pending tasks
- **All**: Display all tasks
- **Completed**: View finished tasks only

### Data Management
- **Export**: Download all tasks as JSON file
- **Import**: Replace current tasks with JSON backup
- **Clear Completed**: Remove all finished tasks at once

## 📁 Project Structure

```
smart-legion-todo/
├── main.py          # Python server & database
├── index.html       # Web interface
├── styles.css       # Styling & responsive design
├── app.js           # Frontend functionality
└── todo.db          # SQLite database (auto-created)
```

## 🔧 API Endpoints

The application provides a RESTful API:

- `GET /api/tasks` - Retrieve all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/{uuid}` - Update task
- `DELETE /api/tasks/{uuid}` - Delete task
- `POST /api/reorder` - Update task order

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

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Kill process using port 8000 (Unix/Linux/Mac)
lsof -ti:8000 | xargs kill -9

# Or run on different port
python main.py  # Edit port in main.py if needed
```

**Browser doesn't open automatically:**
- Manually navigate to `http://localhost:8000`
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

## 🤝 Contributing

This is a personal project showcasing modern web application development with minimal dependencies.

---

**Ready to get organized?** Run `python main.py` and start managing your tasks efficiently!
