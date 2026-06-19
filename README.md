# Kanban

A lightweight, browser-based Kanban board for managing tasks locally.

## Features
- Create, drag, and drop tasks between columns
- Persistent state (local) for simple usage
- Minimal, dependency-free HTML/CSS/JS implementation

## Project Structure

- index.html — main app UI
- css/style.css — styles
- js/app.js — UI logic
- js/dragdrop.js — drag & drop helpers
- js/state.js — local state persistence

## Getting Started

1. Open `index.html` in your browser (double-click or serve via a static server).
2. Add tasks and move them between columns.

Optional: serve with a simple static server during development:

```
python3 -m http.server 8000
open http://localhost:8000
```

## Contributing
Feel free to open issues or submit pull requests. Keep changes small and focused.

## License
MIT
