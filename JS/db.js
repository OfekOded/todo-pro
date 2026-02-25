class Database {
    constructor(dbName) {
        this.dbName = dbName;
        this.init();
    }

    init() {
        if (!localStorage.getItem(this.dbName)) {
            localStorage.setItem(this.dbName, JSON.stringify([]));
        }
    }

    getAll() {
        return JSON.parse(localStorage.getItem(this.dbName));
    }

    saveAll(data) {
        localStorage.setItem(this.dbName, JSON.stringify(data));
    }

    getById(id) {
        const data = this.getAll();
        return data.find(item => item.id === id);
    }

    add(item) {
        const data = this.getAll();
        item.id = Date.now().toString(36) + Math.random().toString(36).substring(2);
        data.push(item);
        this.saveAll(data);
        return item;
    }

    update(id, updatedFields) {
        const data = this.getAll();
        const index = data.findIndex(item => item.id === id);
        
        if (index !== -1) {
            data[index] = { ...data[index], ...updatedFields };
            this.saveAll(data);
            return data[index];
        }
        return null;
    }

    delete(id) {
        let data = this.getAll();
        const initialLength = data.length;
        data = data.filter(item => item.id !== id);
        this.saveAll(data);
        return data.length !== initialLength;
    }
}

const usersDB = new Database('todo_pro_users');
const tasksDB = new Database('todo_pro_tasks');

const dbAPI = {
    users: {
        getAll: () => usersDB.getAll(),
        getById: (id) => usersDB.getById(id),
        getByUsername: (username) => usersDB.getAll().find(u => u.username === username),
        add: (user) => usersDB.add(user),
        update: (id, user) => usersDB.update(id, user),
        delete: (id) => usersDB.delete(id)
    },
    tasks: {
        getAll: () => tasksDB.getAll(),
        getByUserId: (userId) => tasksDB.getAll().filter(t => t.userId === userId),
        getById: (id) => tasksDB.getById(id),
        add: (task) => tasksDB.add(task),
        update: (id, task) => tasksDB.update(id, task),
        delete: (id) => tasksDB.delete(id)
    }
};