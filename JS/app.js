import router from './router.js';
import FAJAX from './fajax.js';

// --- ÉTAPE 1 : Structure de base ---

// Raccourci utilitaire pour document.querySelector (façon jQuery)
const $ = (selector) => document.querySelector(selector);

// Vide le contenu HTML d'un élément (pratique pour nettoyer une section avant un nouveau rendu)
const clearElement = (element) => {
    if (element) {
        element.innerHTML = '';
    }
};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // 1. On restaure la session existante si l'utilisateur est déjà passé
    loadSession();
    // 2. On démarre le routeur qui gérera l'URL actuelle
    if (router && typeof router.init === 'function') {
        router.init();
    }
});

// --- ÉTAPE 2 : Gestion de Session Client ---

// État centralisé de l'application (contient le token et les infos de l'utilisateur)
const state = {
    token: null,
    user: null
};

// Sauvegarde dans sessionStorage et met à jour l'objet state
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

// Charge les données depuis le sessionStorage pour réhydrater le state au rechargement de la page
const loadSession = () => {
    const storedToken = sessionStorage.getItem('token');
    const storedUser = sessionStorage.getItem('user');

    if (storedToken) {
        state.token = storedToken;
    }
    
    if (storedUser) {
        try {
            // Repassage en objet JavaScript
            state.user = JSON.parse(storedUser);
        } catch (e) {
            // En cas d'erreur de format JSON, on purge la valeur
            state.user = null;
        }
    }
};

// Déconnecte l'utilisateur en nettoyant l'état et le sessionStorage
const clearSession = () => {
    state.token = null;
    state.user = null;
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
};

// Vérifie rapidement si l'utilisateur est authentifié avec un token valide
const isLoggedIn = () => {
    return !!state.token && state.token.trim() !== '';
};

// --- ÉTAPE 3 : Wrapper d'API HTTP ---

/**
 * Fonction générique pour effectuer toutes les requêtes réseau (via le faux ajax "FAJAX").
 * @param {string} method   - Méthode HTTP (GET, POST, PUT, DELETE)
 * @param {string} url      - L'URL de destination du faux serveur
 * @param {object|null} body - L'objet de données à envoyer (null par défaut)
 * @param {boolean} auth    - Doit-on joindre le token d'authentification ? (false par défaut)
 * @returns {Promise<object>} Un objet structuré contenant ok, status, data, et error.
 */
const apiRequest = async ({ method, url, body = null, auth = false }) => {
    // Si la route est protégée mais qu'on a pas de token, on rejette tout de suite
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
            
            // On ne définit le type de contenu QUE si on envoie effectivement des données (ex: POST/PUT)
            if (body !== null && body !== undefined) {
                xhr.setRequestHeader('Content-Type', 'application/json');
            }
            
            // Attache le jeton d'authentification si la route est protégée
            if (auth) {
                xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);
            }

            // Callback lors de la réception de la "réponse" du serveur
            xhr.onload = () => {
                let data = null;
                
                // Parsing sécurisé : on s'assure qu'il y a du texte (évite l'erreur JSON.parse sur un retour vide)
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
                
                // Codes de succès HTTP classiques (200 à 299)
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve({
                        ok: true,
                        status: xhr.status,
                        data: data,
                        error: null
                    });
                } else {
                    // Erreur HTTP, on tente de récupérer le message d'erreur depuis le serveur s'il existe
                    resolve({
                        ok: false,
                        status: xhr.status,
                        data: data,
                        error: data?.message || data?.error || 'HTTP error'
                    });
                }
            };

            // Callback en cas d'erreur "réseau" empêchant la complétion
            xhr.onerror = () => {
                resolve({
                    ok: false,
                    status: 0,
                    data: null,
                    error: 'Network failure'
                });
            };

            // Exécution finale de la requête, avec ou sans body
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

// Exportation ciblée des utilitaires nécessaires à l'extérieur
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
