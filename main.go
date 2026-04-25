package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

// ─── Data Model ───────────────────────────────────────────────────────────────

type Task struct {
	ID        int    `json:"id"`
	Title     string `json:"title"`
	Done      bool   `json:"done"`
	CreatedAt string `json:"created_at"`
	DueAt     string `json:"due_at"` // RFC3339 datetime or empty
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const dataFile = "tasks.json"

func loadTasks() ([]Task, error) {
	data, err := os.ReadFile(dataFile)
	if os.IsNotExist(err) {
		return []Task{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", dataFile, err)
	}
	var tasks []Task
	if err := json.Unmarshal(data, &tasks); err != nil {
		return nil, fmt.Errorf("parsing tasks: %w", err)
	}
	return tasks, nil
}

func saveTasks(tasks []Task) error {
	data, err := json.MarshalIndent(tasks, "", "  ")
	if err != nil {
		return fmt.Errorf("encoding tasks: %w", err)
	}
	return os.WriteFile(dataFile, data, 0644)
}

func nextID(tasks []Task) int {
	max := 0
	for _, t := range tasks {
		if t.ID > max {
			max = t.ID
		}
	}
	return max + 1
}

// ─── CLI Commands ─────────────────────────────────────────────────────────────

func cliAdd(title string) error {
	tasks, err := loadTasks()
	if err != nil {
		return err
	}
	task := Task{
		ID:        nextID(tasks),
		Title:     title,
		Done:      false,
		CreatedAt: time.Now().Format("02 Jan 2006, 15:04"),
	}
	tasks = append(tasks, task)
	if err := saveTasks(tasks); err != nil {
		return err
	}
	fmt.Printf("✅ Added task #%d: %q\n", task.ID, title)
	return nil
}

func cliList() error {
	tasks, err := loadTasks()
	if err != nil {
		return err
	}
	if len(tasks) == 0 {
		fmt.Println("No tasks yet. Add one with: task add \"Your task\"")
		return nil
	}
	fmt.Printf("\n%-4s %-6s %-40s %s\n", "ID", "Done", "Title", "Created")
	fmt.Println("─────────────────────────────────────────────────────────")
	for _, t := range tasks {
		status := "[ ]"
		if t.Done {
			status = "[✓]"
		}
		fmt.Printf("%-4d %-6s %-40s %s\n", t.ID, status, t.Title, t.CreatedAt)
	}
	fmt.Println()
	return nil
}

func cliDone(id int) error {
	tasks, err := loadTasks()
	if err != nil {
		return err
	}
	for i, t := range tasks {
		if t.ID == id {
			if tasks[i].Done {
				fmt.Printf("Task #%d is already done.\n", id)
				return nil
			}
			tasks[i].Done = true
			if err := saveTasks(tasks); err != nil {
				return err
			}
			fmt.Printf("✅ Task #%d marked as done: %q\n", id, t.Title)
			return nil
		}
	}
	return fmt.Errorf("task #%d not found", id)
}

func cliDelete(id int) error {
	tasks, err := loadTasks()
	if err != nil {
		return err
	}
	for i, t := range tasks {
		if t.ID == id {
			tasks = append(tasks[:i], tasks[i+1:]...)
			if err := saveTasks(tasks); err != nil {
				return err
			}
			fmt.Printf("🗑️  Deleted task #%d: %q\n", id, t.Title)
			return nil
		}
	}
	return fmt.Errorf("task #%d not found", id)
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

func jsonOK(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func jsonErr(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func cors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

// ─── API Handlers ─────────────────────────────────────────────────────────────

// GET /api/tasks
func handleGetTasks(w http.ResponseWriter, r *http.Request) {
	tasks, err := loadTasks()
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, tasks)
}

// POST /api/tasks   body: {"title":"...", "due_at":"..."}
func handleCreateTask(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Title string `json:"title"`
		DueAt string `json:"due_at"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Title) == "" {
		jsonErr(w, "title is required", http.StatusBadRequest)
		return
	}
	tasks, err := loadTasks()
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	task := Task{
		ID:        nextID(tasks),
		Title:     strings.TrimSpace(body.Title),
		Done:      false,
		CreatedAt: time.Now().Format("02 Jan 2006, 15:04"),
		DueAt:     strings.TrimSpace(body.DueAt),
	}
	tasks = append(tasks, task)
	if err := saveTasks(tasks); err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	jsonOK(w, task)
}

// PATCH /api/tasks/{id}   body: {"done": true/false, "due_at": "..."}
func handleUpdateTask(w http.ResponseWriter, r *http.Request, id int) {
	var body struct {
		Done  *bool   `json:"done"`
		DueAt *string `json:"due_at"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonErr(w, "invalid request body", http.StatusBadRequest)
		return
	}
	tasks, err := loadTasks()
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	for i, t := range tasks {
		if t.ID == id {
			if body.Done != nil {
				tasks[i].Done = *body.Done
			}
			if body.DueAt != nil {
				tasks[i].DueAt = *body.DueAt
			}
			if err := saveTasks(tasks); err != nil {
				jsonErr(w, err.Error(), http.StatusInternalServerError)
				return
			}
			jsonOK(w, tasks[i])
			return
		}
	}
	jsonErr(w, fmt.Sprintf("task #%d not found", id), http.StatusNotFound)
}

// DELETE /api/tasks/{id}
func handleDeleteTask(w http.ResponseWriter, r *http.Request, id int) {
	tasks, err := loadTasks()
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	for i, t := range tasks {
		if t.ID == id {
			tasks = append(tasks[:i], tasks[i+1:]...)
			if err := saveTasks(tasks); err != nil {
				jsonErr(w, err.Error(), http.StatusInternalServerError)
				return
			}
			jsonOK(w, map[string]string{"message": fmt.Sprintf("task #%d deleted", t.ID)})
			return
		}
	}
	jsonErr(w, fmt.Sprintf("task #%d not found", id), http.StatusNotFound)
}

// ─── Router ───────────────────────────────────────────────────────────────────

func apiRouter(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/tasks")
	path = strings.Trim(path, "/")

	if path == "" {
		switch r.Method {
		case http.MethodGet:
			handleGetTasks(w, r)
		case http.MethodPost:
			handleCreateTask(w, r)
		default:
			jsonErr(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	id, err := strconv.Atoi(path)
	if err != nil {
		jsonErr(w, "invalid task id", http.StatusBadRequest)
		return
	}
	switch r.Method {
	case http.MethodPatch:
		handleUpdateTask(w, r, id)
	case http.MethodDelete:
		handleDeleteTask(w, r, id)
	default:
		jsonErr(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

// ─── Server ───────────────────────────────────────────────────────────────────

func startServer(port string) {
	// Serve static files from the current working directory
	dir, err := os.Getwd()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Cannot get working directory: %v\n", err)
		os.Exit(1)
	}
	fs := http.FileServer(http.Dir(dir))

	http.HandleFunc("/api/tasks", cors(apiRouter))
	http.HandleFunc("/api/tasks/", cors(apiRouter))
	http.Handle("/", fs)

	addr := ":" + port
	fmt.Printf("\n🚀 TASKR running at http://localhost%s\n", addr)
	fmt.Printf("   API  →  http://localhost%s/api/tasks\n\n", addr)

	if err := http.ListenAndServe(addr, nil); err != nil {
		fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
		os.Exit(1)
	}
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

func usage() {
	fmt.Println(`
TASKR — CLI Task Manager

Usage:
  task serve [port]        Start the web server (default port: 8080)
  task add "<title>"       Add a new task
  task list                List all tasks
  task done <id>           Mark a task as done
  task delete <id>         Delete a task
`)
}

func run() error {
	args := os.Args[1:]
	if len(args) == 0 {
		usage()
		return nil
	}

	switch args[0] {
	case "serve":
		port := "8080"
		if len(args) >= 2 {
			port = args[1]
		}
		startServer(port)

	case "add":
		if len(args) < 2 {
			return fmt.Errorf("usage: task add \"<title>\"")
		}
		return cliAdd(args[1])

	case "list":
		return cliList()

	case "done":
		if len(args) < 2 {
			return fmt.Errorf("usage: task done <id>")
		}
		id, err := strconv.Atoi(args[1])
		if err != nil {
			return fmt.Errorf("invalid id %q: must be an integer", args[1])
		}
		return cliDone(id)

	case "delete":
		if len(args) < 2 {
			return fmt.Errorf("usage: task delete <id>")
		}
		id, err := strconv.Atoi(args[1])
		if err != nil {
			return fmt.Errorf("invalid id %q: must be an integer", args[1])
		}
		return cliDelete(id)

	default:
		usage()
		return fmt.Errorf("unknown command: %q", args[0])
	}
	return nil
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
