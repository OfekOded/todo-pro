class ServerApp {
    
    handleRequest(method, endpoint, data, token) {
        
        const userId = serverAuth.verifyAuth(token);
        
        if (!userId) {
            return {
                status: 401,
                success: false,
                message: "Access denied. You must be logged in to perform this action."
            };
        }

        if (method === 'GET' && endpoint === '/api/tasks') {
            return this._getTasks(userId);
        }

        if (method === 'POST' && endpoint === '/api/tasks') {
            return this._createTask(userId, data);
        }

        const taskMatch = endpoint.match(/^\/api\/tasks\/(.+)$/);
        
        if (taskMatch) {
            const taskId = taskMatch[1];

            if (method === 'GET') {
                return this._getTaskById(userId, taskId);
            }

            if (method === 'PUT') {
                return this._updateTask(userId, taskId, data);
            }

            if (method === 'DELETE') {
                return this._deleteTask(userId, taskId);
            }
        }

        return {
            status: 404,
            success: false,
            message: "API route not found."
        };
    }

    _getTasks(userId) {
        const allTasks = tasksDB.getAll();
        
        const userTasks = allTasks.filter(task => task.userId === userId);
        
        return {
            status: 200,
            success: true,
            data: userTasks,
            message: "Tasks retrieved successfully."
        };
    }

    _getTaskById(userId, taskId) {
        const task = tasksDB.getById(taskId);

        if (!task || task.userId !== userId) {
            return {
                status: 404,
                success: false,
                message: "Task not found."
            };
        }

        return {
            status: 200,
            success: true,
            data: task,
            message: "Task retrieved successfully."
        };
    }

    _createTask(userId, taskData) {
        if (!taskData || !taskData.title) {
            return {
                status: 400,
                success: false,
                message: "Task title is required."
            };
        }

        const newTask = {
            userId: userId,
            title: taskData.title,
            description: taskData.description || "",
            category: taskData.category || "personal",
            priority: taskData.priority || "normal",
            dueDate: taskData.dueDate || null,
            completed: false,
            createdAt: new Date().toISOString()
        };

        const savedTask = tasksDB.insert(newTask);

        return {
            status: 201,
            success: true,
            data: savedTask,
            message: "Task created successfully!"
        };
    }

    _updateTask(userId, taskId, updateData) {
        const task = tasksDB.getById(taskId);

        if (!task) {
            return { status: 404, success: false, message: "Task not found." };
        }
        
        if (task.userId !== userId) {
            return { 
                status: 403,
                success: false, 
                message: "Access denied. This task does not belong to you." 
            };
        }

        delete updateData.id; 
        delete updateData.userId;

        const updatedTask = tasksDB.update(taskId, updateData);

        return {
            status: 200,
            success: true,
            data: updatedTask,
            message: "Task updated successfully."
        };
    }

    _deleteTask(userId, taskId) {
        const task = tasksDB.getById(taskId);

        if (!task) {
            return { status: 404, success: false, message: "Task not found." };
        }
        
        if (task.userId !== userId) {
            return { 
                status: 403, 
                success: false, 
                message: "Access denied. This task does not belong to you." 
            };
        }

        const isDeleted = tasksDB.delete(taskId);

        if (isDeleted) {
            return {
                status: 200,
                success: true,
                message: "Task deleted successfully."
            };
        } else {
            return {
                status: 500,
                success: false,
                message: "An error occurred during deletion."
            };
        }
    }
}

const serverApp = new ServerApp();
