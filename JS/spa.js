class Router {
    constructor(routes, containerId) {
        this.routes = routes;
        this.container = document.getElementById(containerId);
        window.addEventListener('hashchange', this.navigate.bind(this));
        window.addEventListener('load', this.navigate.bind(this));
    }

    navigate() {
        let hash = window.location.hash.substring(1) || '/';
        const route = this.routes[hash];

        if (route) {
            this.loadTemplate(route.templateId);
            if (route.initFunction) {
                route.initFunction();
            }
        } else {
            this.container.innerHTML = '<h1>404 - Page Not Found</h1>';
        }
    }

    loadTemplate(templateId) {
        const template = document.getElementById(templateId);
        if (template) {
            const clone = template.content.cloneNode(true);
            this.container.innerHTML = '';
            this.container.appendChild(clone);
        } else {
            this.container.innerHTML = '<h1>Error Loading Template</h1>';
        }
    }
}

const appRoutes = {
    '/': { templateId: 'login-template', initFunction: null },
    '/register': { templateId: 'register-template', initFunction: null },
    '/tasks': { templateId: 'tasks-template', initFunction: null }
};

const appRouter = new Router(appRoutes, 'app-container');