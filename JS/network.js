class Network {
    constructor() {
        this.dropProbability = 0.2;
    }

    sendRequest(request, callback) {
        const delay = Math.floor(Math.random() * 2000) + 1000;
        const isDropped = Math.random() < this.dropProbability;

        setTimeout(() => {
            if (isDropped) {
                callback({ status: 0, message: "Network Error: Message Dropped" }, null);
                return;
            }

            this.routeToServer(request, (response) => {
                const returnDelay = Math.floor(Math.random() * 2000) + 1000;
                const isReturnDropped = Math.random() < this.dropProbability;

                setTimeout(() => {
                    if (isReturnDropped) {
                        callback({ status: 0, message: "Network Error: Response Dropped" }, null);
                        return;
                    }
                    callback(null, response);
                }, returnDelay);
            });
        }, delay);
    }

    routeToServer(request, sendBack) {
        let response;
        try {
            if (request.url.startsWith('/api/auth')) {
                if (request.url === '/api/auth/login' && request.method === 'POST') {
                    response = serverAuth.login(request.body);
                } else if (request.url === '/api/auth/register' && request.method === 'POST') {
                    response = serverAuth.register(request.body);
                } else if (request.url === '/api/auth/logout') {
                    response = serverAuth.logout(request.token);
                } else {
                    response = { status: 404, success: false, message: "Not Found" };
                }
            } else if (request.url.startsWith('/api/tasks')) {
                response = serverApp.handleRequest(request.method, request.url, request.body, request.token);
            } else {
                response = { status: 404, success: false, message: "Not Found" };
            }
        } catch (error) {
            response = { status: 500, success: false, message: "Internal Server Error" };
        }
        sendBack(response);
    }
}

const network = new Network();