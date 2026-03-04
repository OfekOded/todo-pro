const $ = (selector) => document.querySelector(selector);

const state = {
    token: null,
    user: null
};

const saveSession = (token, user) => {
    state.token = token || null;
    state.user = user || null;

    if (token) {
        sessionStorage.setItem('token', token);
    } else {
        sessionStorage.removeItem('token');
    }

    if (user) {
        sessionStorage.setItem('user', JSON.stringify(user));
    } else {
        sessionStorage.removeItem('user');
    }
};

const loadSession = () => {
    const storedToken = sessionStorage.getItem('token');
    const storedUser = sessionStorage.getItem('user');

    if (storedToken) {
        state.token = storedToken;
    }

    if (storedUser) {
        try {
            state.user = JSON.parse(storedUser);
        } catch (e) {
            state.user = null;
        }
    }
};

const clearSession = () => {
    state.token = null;
    state.user = null;
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
};

const isLoggedIn = () => {
    return !!state.token && state.token.trim() !== '';
};

const _doSingleRequest = ({ method, url, body, auth }) => {
    return new Promise((resolve) => {
        const xhr = new FAJAX();
        xhr.open(method, url);

        if (auth) {
            xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);
        }

        xhr.onload = () => {
            let data = null;
            if (xhr.responseText && xhr.responseText.trim() !== '') {
                try {
                    data = JSON.parse(xhr.responseText);
                } catch (e) {
                    resolve({ ok: false, status: xhr.status, data: null, error: 'Invalid server response' });
                    return;
                }
            }

            if (xhr.status === 401) {
                clearSession();
                window.location.hash = '/';
                resolve({ ok: false, status: 401, data: null, error: 'Session expired' });
                return;
            }

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve({ ok: true, status: xhr.status, data, error: null });
            } else {
                resolve({ ok: false, status: xhr.status, data, error: data?.message || 'Erreur serveur' });
            }
        };

        // status 0 = perte réseau (drop simulé ou échec réel)
        xhr.onerror = () => resolve({ ok: false, status: 0, data: null, error: 'Network failure' });

        xhr.send(body ? JSON.stringify(body) : null);
    });
};

const MAX_RETRIES = 2;
const apiRequest = async ({ method, url, body = null, auth = false }) => {
    if (auth && !isLoggedIn()) {
        return { ok: false, status: 401, data: null, error: 'Missing token' };
    }

    let lastResult;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        lastResult = await _doSingleRequest({ method, url, body, auth });

        if (lastResult.status !== 0) break;

        if (attempt < MAX_RETRIES) {
            showToast(`Unstable network, retrying (${attempt + 1}/${MAX_RETRIES})…`, false);
        }
    }

    if (lastResult.status === 0) {
        showToast('Unable to reach the server. Please check your connection.', true);
    }

    return lastResult;
};


const showToast = (message, isError = false) => {
    const container = $('#toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
};

const initLogin = () => {
    if (isLoggedIn()) {
        window.location.hash = '/tasks';
        return;
    }

    const form = $('#login-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = $('#login-email').value;
            const password = $('#login-password').value;
            const btn = form.querySelector('button[type="submit"]');

            btn.disabled = true;

            const response = await apiRequest({
                method: 'POST',
                url: '/api/auth/login',
                body: { email, password }
            });

            btn.disabled = false;

            if (response.ok && response.data.success) {
                saveSession(response.data.data.token, response.data.data.user);
                showToast('Logged in successfully!');
                window.location.hash = '/tasks';
            } else {
                showToast(response.error || 'Login failed', true);
            }
        });
    }
};

const initRegister = () => {
    if (isLoggedIn()) {
        window.location.hash = '/tasks';
        return;
    }

    const form = $('#register-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = $('#reg-name').value;
            const email = $('#reg-email').value;
            const password = $('#reg-password').value;
            const passwordConfirm = $('#reg-password-confirm').value;

            if (password !== passwordConfirm) {
                showToast('Passwords do not match', true);
                return;
            }

            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;

            const response = await apiRequest({
                method: 'POST',
                url: '/api/auth/register',
                body: { name, email, password }
            });

            btn.disabled = false;

            if (response.ok && response.data.success) {
                showToast('Registration successful! Please log in.');
                window.location.hash = '/';
            } else {
                showToast(response.error || 'Registration failed', true);
            }
        });
    }
};

const setupHeader = () => {
    const greeting = $('#user-greeting');
    if (greeting && state.user) {
        greeting.textContent = `Hello, ${state.user.name}`;
    }

    const logoutBtn = $('#btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await apiRequest({ method: 'POST', url: '/api/auth/logout', auth: true });
            clearSession();
            window.location.hash = '/';
        });
    }
};

const createLock = () => {
    let inFlight = false;
    const withLock = async (fn) => {
        if (inFlight) {
            showToast('An action is already in progress, please wait.', false);
            return;
        }
        inFlight = true;
        try {
            await fn();
        } finally {
            inFlight = false;
        }
    };
    return { withLock };
};

const createLoadingController = () => {
    const setLoading = (isLoading) => {
        const container = $('#tasks-container');
        if (!container) return;
        if (isLoading) {
            container.classList.add('loading');
        } else {
            container.classList.remove('loading');
        }
        container.querySelectorAll('.task-checkbox, .btn-edit, .btn-delete').forEach(el => {
            el.disabled = isLoading;
        });
    };
    return { setLoading };
};

const getPriorityLabel = (priority) => {
    const labels = { low: 'Low', normal: 'Normal', high: 'High' };
    return labels[priority] || priority;
};

const getCategoryLabel = (category) => {
    const labels = { personal: 'Personal', work: 'Work', shopping: 'Shopping' };
    return labels[category] || category;
};

const createRenderer = (context, { withLock, setLoading, fetchAndRender }) => {
    const renderTasks = (tasks) => {
        const container = $('#tasks-container');
        const emptyState = $('#empty-state');
        const pendingCount = $('#pending-count');

        let filtered = [...tasks];

        if (context.activeFilter === 'pending') {
            filtered = filtered.filter(t => !t.completed);
        } else if (context.activeFilter === 'completed') {
            filtered = filtered.filter(t => t.completed);
        }

        if (context.searchQuery.trim() !== '') {
            const q = context.searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (t.description && t.description.toLowerCase().includes(q))
            );
        }

        if (context.sortMode === 'date-asc') {
            filtered.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
        } else if (context.sortMode === 'date-desc') {
            filtered.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(b.dueDate) - new Date(a.dueDate);
            });
        } else if (context.sortMode === 'priority') {
            const order = { high: 0, normal: 1, low: 2 };
            filtered.sort((a, b) => (order[a.priority] ?? 1) - (order[b.priority] ?? 1));
        }

        const pending = tasks.filter(t => !t.completed).length;
        if (pendingCount) {
            pendingCount.textContent = pending === 0
                ? 'All tasks completed ✓'
                : `${pending} task${pending > 1 ? 's' : ''} pending`;
        }

        container.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');

            filtered.forEach(task => {
                const template = $('#task-item-template').content.cloneNode(true);

                template.querySelector('.task-title').textContent = task.title;
                template.querySelector('.task-description').textContent = task.description || '';

                const meta = template.querySelector('.task-meta');
                const priorityClass = `priority-badge priority-${task.priority}`;
                meta.innerHTML = `
                    <span class="category-badge">${getCategoryLabel(task.category)}</span>
                    <span class="${priorityClass}">${getPriorityLabel(task.priority)}</span>
                    ${task.dueDate ? `<span class="due-date">📅 ${task.dueDate}</span>` : ''}
                `;

                const checkbox = template.querySelector('.task-checkbox');
                checkbox.checked = task.completed;

                const taskItem = template.querySelector('.task-item');
                if (task.completed) {
                    taskItem.classList.add('completed');
                }

                checkbox.addEventListener('change', async (e) => {
                    await withLock(async () => {
                        setLoading(true);
                        const res = await apiRequest({
                            method: 'PUT',
                            url: `/api/tasks/${task.id}`,
                            body: { completed: e.target.checked },
                            auth: true
                        });
                        if (!res.ok) showToast('Failed to update task', true);
                        await fetchAndRender();
                    });
                });

                template.querySelector('.btn-delete').addEventListener('click', async () => {
                    if (!confirm('Are you sure you want to delete this task?')) return;
                    await withLock(async () => {
                        setLoading(true);
                        const res = await apiRequest({
                            method: 'DELETE',
                            url: `/api/tasks/${task.id}`,
                            auth: true
                        });
                        if (res.ok) {
                            showToast('Task deleted.');
                            await fetchAndRender();
                        } else {
                            showToast(res.error || 'Failed to delete task', true);
                            setLoading(false);
                        }
                    });
                });

                template.querySelector('.btn-edit').addEventListener('click', () => {
                    const taskIdInput = $('#task-id');
                    const modal = $('#add-task-modal');
                    taskIdInput.value = task.id;
                    $('#task-title').value = task.title;
                    $('#task-desc').value = task.description || '';
                    $('#task-category').value = task.category || 'personal';
                    $('#task-priority').value = task.priority || 'normal';
                    $('#task-date').value = task.dueDate || '';
                    modal.classList.remove('hidden');
                });

                container.appendChild(template);
            });
        }
    };

    return { renderTasks };
};

const createTaskFetcher = (context, { withLock, setLoading, renderTasks }) => {
    const _fetchAndRender = async () => {
        setLoading(true);
        try {
            const response = await apiRequest({ method: 'GET', url: '/api/tasks', auth: true });
            if (response.status === 401) return;
            if (response.ok && response.data.success) {
                context.allTasks = response.data.data;
                renderTasks(context.allTasks);
            } else {
                showToast('Failed to load tasks', true);
            }
        } finally {
            setLoading(false);
        }
    };

    const loadTasks = async () => {
        await withLock(_fetchAndRender);
    };

    return { _fetchAndRender, loadTasks };
};

const bindFilters = (context, renderTasks) => {
    const defaultTab = document.querySelector('.tab[data-filter="all"]');
    if (defaultTab) defaultTab.classList.add('active');

    const searchInput = $('#search-input');
    const clearSearchBtn = $('#btn-clear-search');
    const sortSelect = $('#task-sort');
    const tabs = document.querySelectorAll('.tab');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            context.searchQuery = searchInput.value;
            if (clearSearchBtn) {
                clearSearchBtn.classList.toggle('hidden', context.searchQuery === '');
            }
            renderTasks(context.allTasks);
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            context.searchQuery = '';
            clearSearchBtn.classList.add('hidden');
            renderTasks(context.allTasks);
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            context.sortMode = sortSelect.value;
            renderTasks(context.allTasks);
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            context.activeFilter = tab.dataset.filter;
            renderTasks(context.allTasks);
        });
    });
};

const bindModal = ({ withLock, fetchAndRender }) => {
    const modal = $('#add-task-modal');
    const openModalBtn = $('#btn-open-modal');
    const closeModalBtn = $('#btn-close-modal');
    const cancelTaskBtn = $('#btn-cancel-task');
    const taskForm = $('#task-form');

    const closeModal = () => {
        modal.classList.add('hidden');
        taskForm.reset();
        $('#task-id').value = '';
    };

    if (openModalBtn) openModalBtn.addEventListener('click', () => {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = $('#task-date');
        if (dateInput) dateInput.min = today;
        modal.classList.remove('hidden');
    });

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', closeModal);

    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const taskId = $('#task-id').value;
            const title = $('#task-title').value;
            const description = $('#task-desc').value;
            const category = $('#task-category').value;
            const priority = $('#task-priority').value;
            const dueDate = $('#task-date').value;

            if (dueDate) {
                const today = new Date().toISOString().split('T')[0];
                if (dueDate < today) {
                    showToast('Due date cannot be in the past', true);
                    return;
                }
            }

            await withLock(async () => {
                const btn = taskForm.querySelector('button[type="submit"]');
                btn.disabled = true;

                let response;
                if (taskId) {
                    response = await apiRequest({
                        method: 'PUT',
                        url: `/api/tasks/${taskId}`,
                        body: { title, description, category, priority, dueDate },
                        auth: true
                    });
                } else {
                    response = await apiRequest({
                        method: 'POST',
                        url: '/api/tasks',
                        body: { title, description, category, priority, dueDate },
                        auth: true
                    });
                }

                btn.disabled = false;

                if (response.ok && response.data.success) {
                    showToast(taskId ? 'Task updated successfully!' : 'Task created successfully!');
                    closeModal();
                    await fetchAndRender();
                } else {
                    showToast(response.error || 'Failed to save task', true);
                }
            });
        });
    }
};

const initTasks = async () => {
    if (!isLoggedIn()) {
        window.location.hash = '/';
        return;
    }

    setupHeader();

    const context = {
        allTasks: [],
        searchQuery: '',
        sortMode: 'date-asc',
        activeFilter: 'all',
    };

    const { withLock } = createLock();
    const { setLoading } = createLoadingController();

    const apiFns = { withLock, setLoading, fetchAndRender: null };

    const { renderTasks } = createRenderer(context, apiFns);

    const { _fetchAndRender, loadTasks } = createTaskFetcher(context, { withLock, setLoading, renderTasks });

    apiFns.fetchAndRender = _fetchAndRender;

    bindFilters(context, renderTasks);
    bindModal({ withLock, fetchAndRender: _fetchAndRender });

    await loadTasks();
};

document.addEventListener('DOMContentLoaded', () => {
    loadSession();

    appRoutes['/'].initFunction = initLogin;
    appRoutes['/register'].initFunction = initRegister;
    appRoutes['/tasks'].initFunction = initTasks;

    if (appRouter && typeof appRouter.navigate === 'function') {
        appRouter.navigate();
    }
});