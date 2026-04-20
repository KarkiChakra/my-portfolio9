let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let editingIndex = null;
let currentFilter = localStorage.getItem("taskFilter") || "all";
let theme = localStorage.getItem("theme") || "system";
let dragFromIndex = null;
let pendingEnterIndex = null;

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function matchesCurrentFilter(task) {
    if (currentFilter === "active") return !task.done;
    if (currentFilter === "completed") return task.done;
    return true;
}

function reorderTasks(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= tasks.length || toIndex >= tasks.length) return;

    if (currentFilter === "all") {
        const [moved] = tasks.splice(fromIndex, 1);
        tasks.splice(toIndex, 0, moved);
        return;
    }

    const visibleIndices = tasks
        .map((task, index) => (matchesCurrentFilter(task) ? index : null))
        .filter((index) => index !== null);

    const fromPos = visibleIndices.indexOf(fromIndex);
    const toPos = visibleIndices.indexOf(toIndex);
    if (fromPos === -1 || toPos === -1) return;

    const visibleTasks = visibleIndices.map((index) => tasks[index]);
    const [moved] = visibleTasks.splice(fromPos, 1);
    visibleTasks.splice(toPos, 0, moved);

    let visibleCursor = 0;
    tasks = tasks.map((task) => (matchesCurrentFilter(task) ? visibleTasks[visibleCursor++] : task));
}

function setFilter(nextFilter) {
    if (nextFilter !== "all" && nextFilter !== "active" && nextFilter !== "completed") return;
    currentFilter = nextFilter;
    localStorage.setItem("taskFilter", currentFilter);
    editingIndex = null;
    updateFilterUI();
    renderTasks();
}

function updateFilterUI() {
    const allBtn = document.getElementById("filterAll");
    const activeBtn = document.getElementById("filterActive");
    const completedBtn = document.getElementById("filterCompleted");

    if (!allBtn || !activeBtn || !completedBtn) return;

    allBtn.classList.toggle("active", currentFilter === "all");
    activeBtn.classList.toggle("active", currentFilter === "active");
    completedBtn.classList.toggle("active", currentFilter === "completed");
}

function renderTasks() {
    const list = document.getElementById("taskList");
    list.innerHTML = "";
    updateTaskCounter();

    const entries = tasks.map((task, index) => ({ task, index }));
    const filtered = entries.filter(({ task }) => {
        return matchesCurrentFilter(task);
    });

    updateEmptyState(filtered.length);

    filtered.forEach(({ task, index }) => {
        const li = document.createElement("li");
        li.dataset.index = String(index);

        if (editingIndex === index) {
            const input = document.createElement("input");
            input.type = "text";
            input.value = task.text;
            input.className = "edit-input";
            input.id = `editInput-${index}`;
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") saveEdit(index);
                if (e.key === "Escape") cancelEdit();
            });

            const actions = document.createElement("div");
            actions.className = "task-actions";

            const saveBtn = document.createElement("button");
            saveBtn.textContent = "Save";
            saveBtn.className = "btn btn-save";
            saveBtn.addEventListener("click", () => saveEdit(index));

            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "Cancel";
            cancelBtn.className = "btn btn-cancel";
            cancelBtn.addEventListener("click", () => cancelEdit());

            actions.appendChild(saveBtn);
            actions.appendChild(cancelBtn);
            li.appendChild(input);
            li.appendChild(actions);
        } else {
            const handle = document.createElement("span");
            handle.className = "drag-handle";
            handle.textContent = "⠿";
            handle.draggable = true;
            handle.addEventListener("dragstart", (e) => {
                editingIndex = null;
                dragFromIndex = index;
                li.classList.add("dragging");
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(index));
            });
            handle.addEventListener("dragend", () => {
                dragFromIndex = null;
                li.classList.remove("dragging");
                li.classList.remove("drag-over");
            });

            const span = document.createElement("span");
            span.textContent = task.text;
            span.className = task.done ? "completed" : "";
            span.addEventListener("click", () => toggleTask(index));

            const actions = document.createElement("div");
            actions.className = "task-actions";

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.className = "btn btn-edit";
            editBtn.addEventListener("click", () => startEdit(index));

            const deleteBtn = document.createElement("button");
            deleteBtn.textContent = "X";
            deleteBtn.className = "btn btn-delete";
            deleteBtn.addEventListener("click", () => deleteTask(index));

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            li.appendChild(handle);
            li.appendChild(span);
            li.appendChild(actions);
        }

        li.addEventListener("dragover", (e) => {
            if (dragFromIndex === null) return;
            e.preventDefault();
            li.classList.add("drag-over");
            e.dataTransfer.dropEffect = "move";
        });
        li.addEventListener("dragleave", () => {
            li.classList.remove("drag-over");
        });
        li.addEventListener("drop", (e) => {
            if (dragFromIndex === null) return;
            e.preventDefault();
            li.classList.remove("drag-over");

            const rawFrom = e.dataTransfer.getData("text/plain");
            const fromIndex = rawFrom !== "" ? Number(rawFrom) : dragFromIndex;
            const toIndex = Number(li.dataset.index);
            if (Number.isNaN(fromIndex) || Number.isNaN(toIndex)) return;

            reorderTasks(fromIndex, toIndex);
            dragFromIndex = null;
            saveTasks();
            renderTasks();
        });

        list.appendChild(li);
    });

    if (pendingEnterIndex !== null) {
        const li = list.querySelector(`li[data-index="${pendingEnterIndex}"]`);
        if (li) {
            li.classList.add("task-enter");
            requestAnimationFrame(() => {
                li.classList.remove("task-enter");
            });
        }
        pendingEnterIndex = null;
    }
}

function updateEmptyState(visibleCount) {
    const empty = document.getElementById("emptyState");
    if (!empty) return;
    empty.hidden = visibleCount !== 0;
}

function updateTaskCounter() {
    const counter = document.getElementById("taskCounter");
    if (!counter) return;
    const left = tasks.filter((t) => !t.done).length;
    counter.textContent = `${left} ${left === 1 ? "task" : "tasks"} left`;

    const clearBtn = document.getElementById("clearCompletedBtn");
    if (clearBtn) {
        const completedCount = tasks.filter((t) => t.done).length;
        clearBtn.disabled = completedCount === 0;
    }
}

function deleteTaskWithAnimation(index) {
    const list = document.getElementById("taskList");
    const li = list ? list.querySelector(`li[data-index="${index}"]`) : null;
    if (!li) {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
        return;
    }

    li.classList.add("task-exit");
    setTimeout(() => {
        if (index < 0 || index >= tasks.length) return;
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    }, 220);
}

function clearCompleted() {
    const hadCompleted = tasks.some((t) => t.done);
    if (!hadCompleted) return;
    editingIndex = null;
    dragFromIndex = null;

    const list = document.getElementById("taskList");
    if (list) {
        const nodes = Array.from(list.querySelectorAll("li")).filter((li) => {
            const index = Number(li.dataset.index);
            return !Number.isNaN(index) && tasks[index] && tasks[index].done;
        });
        nodes.forEach((li) => li.classList.add("task-exit"));
    }

    setTimeout(() => {
        tasks = tasks.filter((t) => !t.done);
        saveTasks();
        renderTasks();
    }, 220);
}

function addTask() {
    const input = document.getElementById("taskInput");
    const text = input.value.trim();

    if (text === "") return;

    tasks.push({ text: text, done: false });
    pendingEnterIndex = tasks.length - 1;
    input.value = "";

    saveTasks();
    if (currentFilter === "completed") {
        setFilter("active");
        return;
    }
    renderTasks();
}

function toggleTask(index) {
    if (editingIndex === index) return;
    tasks[index].done = !tasks[index].done;
    saveTasks();
    renderTasks();
}

function deleteTask(index) {
    if (editingIndex === index) editingIndex = null;
    if (editingIndex !== null && index < editingIndex) editingIndex -= 1;
    deleteTaskWithAnimation(index);
}

function startEdit(index) {
    editingIndex = index;
    renderTasks();
    const input = document.getElementById(`editInput-${index}`);
    if (input) input.focus();
}

function cancelEdit() {
    editingIndex = null;
    renderTasks();
}

function saveEdit(index) {
    const input = document.getElementById(`editInput-${index}`);
    if (!input) return;
    const nextText = input.value.trim();
    if (nextText === "") return;
    tasks[index].text = nextText;
    editingIndex = null;
    saveTasks();
    renderTasks();
}

function attachEnterKeySupport() {
    const input = document.getElementById("taskInput");
    if (!input) return;

    input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        addTask();
    });
}

function applyTheme(nextTheme) {
    theme = nextTheme;
    localStorage.setItem("theme", theme);

    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = theme === "dark" || (theme === "system" && prefersDark);

    document.body.classList.toggle("dark", useDark);

    const toggleBtn = document.getElementById("themeToggle");
    if (toggleBtn) {
        toggleBtn.textContent = useDark ? "☀️" : "🌙";
        toggleBtn.setAttribute("aria-label", useDark ? "Switch to light mode" : "Switch to dark mode");
        toggleBtn.title = useDark ? "Light mode" : "Dark mode";
    }
}

function attachThemeToggle() {
    const toggleBtn = document.getElementById("themeToggle");
    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
        const isDark = document.body.classList.contains("dark");
        applyTheme(isDark ? "light" : "dark");
    });

    applyTheme(theme);
}

// Load tasks on start
attachThemeToggle();
attachEnterKeySupport();
updateFilterUI();
renderTasks();
