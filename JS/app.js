import router from './router.js';
import FAJAX from './fajax.js';

const $ = (selector) => document.querySelector(selector);

const clearElement = (element) => {
    if (element) {
        element.innerHTML = '';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadSession();
    if (router && typeof router.init === 'function') {
        router.init();
    }
});

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

const apiRequest = async ({ method, url, body = null, auth = false }) => {
    if (auth && !isLoggedIn()) {
        return {
            ok: false,
            status: 401,
            data: null,
            error: 'Missing token'
        };
    }

    return new Promise((resolve) => {
        try {
            const xhr = new FAJAX();
            xhr.open(method, url);
            
            if (body !== null && body !== undefined) {
                xhr.setRequestHeader('Content-Type', 'application/json');
            }
            
            if (auth) {
                xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);
            }

            xhr.onload = () => {
                let data = null;
                
                if (xhr.responseText && xhr.responseText.trim() !== '') {
                    try {
                        data = JSON.parse(xhr.responseText);
                    } catch (e) {
                        return resolve({
                            ok: false,
                            status: xhr.status,
                            data: null,
                            error: 'Invalid JSON'
                        });
                    }
                }
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve({
                        ok: true,
                        status: xhr.status,
                        data: data,
                        error: null
                    });
                } else {
                    resolve({
                        ok: false,
                        status: xhr.status,
                        data: data,
                        error: data?.message || data?.error || 'HTTP error'
                    });
                }
            };

            xhr.onerror = () => {
                resolve({
                    ok: false,
                    status: 0,
                    data: null,
                    error: 'Network failure'
                });
            };

            if (body !== null && body !== undefined) {
                xhr.send(JSON.stringify(body));
            } else {
                xhr.send();
            }
        } catch (error) {
            resolve({
                ok: false,
                status: 0,
                data: null,
                error: 'Network failure'
            });
        }
    });
};

export {
    $,
    clearElement,
    state,
    saveSession,
    loadSession,
    clearSession,
    isLoggedIn,
    apiRequest
};
