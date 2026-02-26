class ServerAuth {
    constructor() {
    }

    _generateToken(userId) {
        return 'token_' + userId + '_' + Math.random().toString(36).substr(2, 9);
    }

    register(userData) {
        if (!userData.name || !userData.email || !userData.password) {
            return {
                status: 400,
                success: false,
                message: "All fields are required."
            };
        }

        const existingUser = usersDB.findBy('email', userData.email);
        if (existingUser) {
            return {
                status: 409,
                success: false,
                message: "An account with this email already exists."
            };
        }

        const hashedPassword = btoa(userData.password);

        const newUser = {
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        usersDB.insert(newUser);

        return {
            status: 201,
            success: true,
            message: "Registration successful! You can now log in."
        };
    }

    login(credentials) {
        if (!credentials.email || !credentials.password) {
            return {
                status: 400,
                success: false,
                message: "Email and password are required."
            };
        }

        const user = usersDB.findBy('email', credentials.email);
        if (!user) {
            return {
                status: 401,
                success: false,
                message: "Incorrect email or password."
            };
        }

        const hashedInputPassword = btoa(credentials.password);
        if (user.password !== hashedInputPassword) {
            return {
                status: 401,
                success: false,
                message: "Incorrect email or password."
            };
        }

        const token = this._generateToken(user.id);
        
        sessionStorage.setItem('server_session_' + token, user.id);

        return {
            status: 200,
            success: true,
            message: "Login successful.",
            data: {
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            }
        };
    }

    verifyAuth(token) {
        if (!token) return null;

        const userId = sessionStorage.getItem('server_session_' + token);
        
        if (userId) {
            return userId;
        }
        
        return null;
    }
    
    logout(token) {
        if (token) {
            sessionStorage.removeItem('server_session_' + token);
        }
        return { status: 200, success: true, message: "Logged out successfully" };
    }
}

const serverAuth = new ServerAuth();
