class ServerApp {
    
    handleRequest(method, endpoint, data, token) {
        
        const userId = serverAuth.verifyAuth(token);
        
        if (!userId) {
            return {
                status: 401,
                success: false,
                message: "Accès refusé. Vous devez être connecté pour effectuer cette action."
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
            message: "Route API non trouvée."
        };
    }

    _getTasks(userId) {
        const allTasks = tasksDB.getAll();
        
        const userTasks = allTasks.filter(task => task.userId === userId);
        
        return {
            status: 200,
            success: true,
            data: userTasks,
            message: "Tâches récupérées avec succès."
        };
    }

    _createTask(userId, taskData) {
        if (!taskData || !taskData.title) {
            return {
                status: 400,
                success: false,
                message: "Le titre de la tâche est obligatoire."
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
            message: "Tâche ajoutée avec succès !"
        };
    }

    _updateTask(userId, taskId, updateData) {
        const task = tasksDB.getById(taskId);

        if (!task) {
            return { status: 404, success: false, message: "Tâche introuvable." };
        }
        
        if (task.userId !== userId) {
            return { 
                status: 403,
                success: false, 
                message: "Accès refusé. Cette tâche ne vous appartient pas." 
            };
        }

        delete updateData.id; 
        delete updateData.userId;

        const updatedTask = tasksDB.update(taskId, updateData);

        return {
            status: 200,
            success: true,
            data: updatedTask,
            message: "Tâche mise à jour avec succès."
        };
    }

    _deleteTask(userId, taskId) {
        const task = tasksDB.getById(taskId);

        if (!task) {
            return { status: 404, success: false, message: "Tâche introuvable." };
        }
        
        if (task.userId !== userId) {
            return { 
                status: 403, 
                success: false, 
                message: "Accès refusé. Cette tâche ne vous appartient pas." 
            };
        }

        const isDeleted = tasksDB.delete(taskId);

        if (isDeleted) {
            return {
                status: 200,
                success: true,
                message: "Tâche supprimée avec succès."
            };
        } else {
            return {
                status: 500,
                success: false,
                message: "Une erreur est survenue lors de la suppression."
            };
        }
    }
}

const serverApp = new ServerApp();
