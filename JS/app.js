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

const apiRequest = ({ method, url, body = null, auth = false }) => {
    return new Promise((resolve) => {
        if (auth && !isLoggedIn()) {
            resolve({
                ok: false,
                status: 401,
                data: null,
                error: 'Missing token'
            });
            return;
        }

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
                    resolve({
                        ok: false,
                        status: xhr.status,
                        data: null,
                        error: 'Invalid JSON'
                    });
                    return;
                }
            }
            
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve({ ok: true, status: xhr.status, data: data, error: null });
            } else {
                resolve({ ok: false, status: xhr.status, data: data, error: data?.message || 'Error' });
            }
        };

        xhr.onerror = () => {
            resolve({ ok: false, status: 0, data: null, error: 'Network failure' });
        };

        xhr.send(body ? JSON.stringify(body) : null);
    });
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
                showToast('התחברת בהצלחה');
                window.location.hash = '/tasks';
            } else {
                showToast(response.error || 'שגיאה בהתחברות', true);
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
                showToast('הסיסמאות אינן תואמות', true);
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
                showToast('נרשמת בהצלחה! אנא התחבר');
                window.location.hash = '/';
            } else {
                showToast(response.error || 'שגיאה בהרשמה', true);
            }
        });
    }
};

const initTasks = async () => {
    if (!isLoggedIn()) {
        window.location.hash = '/';
        return;
    }
    
    const greeting = $('#user-greeting');
    if (greeting && state.user) {
        greeting.textContent = `שלום, ${state.user.name}`;
    }

    const logoutBtn = $('#btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await apiRequest({ method: 'POST', url: '/api/auth/logout', auth: true });
            clearSession();
            window.location.hash = '/';
        });
    }

    const loadTasks = async () => {
        const response = await apiRequest({ method: 'GET', url: '/api/tasks', auth: true });
        const container = $('#tasks-container');
        const emptyState = $('#empty-state');
        
        if (response.ok && response.data.success) {
            const tasks = response.data.data;
            container.innerHTML = '';
            
            if (tasks.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
                
                tasks.forEach(task => {
                    const template = $('#task-item-template').content.cloneNode(true);
                    
                    template.querySelector('.task-title').textContent = task.title;
                    template.querySelector('.task-description').textContent = task.description || '';
                    
                    const checkbox = template.querySelector('.task-checkbox');
                    checkbox.checked = task.completed;
                    
                    if (task.completed) {
                        template.querySelector('.task-item').classList.add('completed');
                    }

                    checkbox.addEventListener('change', async (e) => {
                        await apiRequest({
                            method: 'PUT',
                            url: `/api/tasks/${task.id}`,
                            body: { completed: e.target.checked },
                            auth: true
                        });
                        loadTasks();
                    });

                    template.querySelector('.btn-delete').addEventListener('click', async () => {
                        await apiRequest({
                            method: 'DELETE',
                            url: `/api/tasks/${task.id}`,
                            auth: true
                        });
                        showToast('המשימה נמחקה');
                        loadTasks();
                    });

                    container.appendChild(template);
                });
            }
        }
    };

    await loadTasks();

    const modal = $('#add-task-modal');
    const openModalBtn = $('#btn-open-modal');
    const closeModalBtn = $('#btn-close-modal');
    const cancelTaskBtn = $('#btn-cancel-task');
    const taskForm = $('#task-form');

    const closeModal = () => {
        modal.classList.add('hidden');
        taskForm.reset();
    };

    if (openModalBtn) openModalBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', closeModal);

    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = $('#task-title').value;
            const description = $('#task-desc').value;
            const category = $('#task-category').value;
            const priority = $('#task-priority').value;
            const dueDate = $('#task-date').value;

            const btn = taskForm.querySelector('button[type="submit"]');
            btn.disabled = true;

            const response = await apiRequest({
                method: 'POST',
                url: '/api/tasks',
                body: { title, description, category, priority, dueDate },
                auth: true
            });

            btn.disabled = false;

            if (response.ok && response.data.success) {
                showToast('המשימה נוצרה בהצלחה');
                closeModal();
                loadTasks();
            } else {
                showToast(response.error || 'שגיאה ביצירת המשימה', true);
            }
        });
    }
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