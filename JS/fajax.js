class FAJAX {
    constructor() {
        this.method = '';
        this.url = '';
        this.headers = {};
        this.body = null;
        this.status = 0;
        this.responseText = '';
        this.onload = null;
        this.onerror = null;
    }

    open(method, url) {
        this.method = method;
        this.url = url;
    }

    setRequestHeader(header, value) {
        this.headers[header] = value;
    }

    send(body) {
        this.body = body ? JSON.parse(body) : null;
        
        const request = {
            method: this.method,
            url: this.url,
            body: this.body,
            token: this.headers['Authorization'] ? this.headers['Authorization'].replace('Bearer ', '') : null
        };

        network.sendRequest(request, (error, response) => {
            if (error) {
                this.status = error.status;
                if (typeof this.onerror === 'function') {
                    this.onerror();
                }
            } else {
                this.status = response.status;
                this.responseText = JSON.stringify(response);
                if (typeof this.onload === 'function') {
                    this.onload();
                }
            }
        });
    }
}