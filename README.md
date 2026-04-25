# Taskr
TASKR — A full-stack task manager with a Go CLI backend, REST API, and a dark-themed web UI. Add, complete, and delete tasks with due-time countdowns and browser push notifications. Data persists to JSON, accessible via both terminal and browser.

# TASKR — CLI Task Manager

A Go backend that powers both a **CLI** and a **web UI** from a single binary.
All data lives in `tasks.json` — changes from the browser and the terminal stay in sync.

---

## Setup

```bash
cd task
go build -o task .
```

---

## Run the web UI

```bash
./task serve          # → http://localhost:8080
./task serve 3000     # custom port
```

Open your browser at the printed URL. The frontend talks to the Go server via REST API.

---

## CLI commands (still work alongside the server)

```bash
./task add "Finish Go project"
./task list
./task done 1
./task delete 2
```

---

## REST API

| Method   | Path              | Body                  | Description        |
|----------|-------------------|-----------------------|--------------------|
| GET      | /api/tasks        | —                     | List all tasks     |
| POST     | /api/tasks        | `{"title":"..."}`     | Create a task      |
| PATCH    | /api/tasks/{id}   | `{"done": true}`      | Toggle done        |
| DELETE   | /api/tasks/{id}   | —                     | Delete a task      |

---

## Project structure

```
task/
├── main.go       # Go server + CLI + REST API
├── go.mod        # Module definition
├── index.html    # Web UI (served by Go)
├── style.css     # Styles
├── app.js        # Frontend — calls /api/tasks
└── tasks.json    # Auto-created, shared by CLI + browser
```


## Author
**Raymond**