class DB_API {
    constructor(dbName) {
        this.dbName = dbName;
        if (!localStorage.getItem(this.dbName)) {
            localStorage.setItem(this.dbName, JSON.stringify([]));
        }
    }

    getAll() {
        return JSON.parse(localStorage.getItem(this.dbName));
    }

    getById(id) {
        const data = this.getAll();
        return data.find(item => item.id === id);
    }

    findBy(key, value) {
        const data = this.getAll();
        return data.find(item => item[key] === value);
    }

    insert(record) {
        const data = this.getAll();
        record.id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        data.push(record);
        localStorage.setItem(this.dbName, JSON.stringify(data));
        return record;
    }

    update(id, updatedRecord) {
        const data = this.getAll();
        const index = data.findIndex(item => item.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updatedRecord, id: id };
            localStorage.setItem(this.dbName, JSON.stringify(data));
            return data[index];
        }
        return null;
    }

    delete(id) {
        const data = this.getAll();
        const filteredData = data.filter(item => item.id !== id);
        if (data.length !== filteredData.length) {
            localStorage.setItem(this.dbName, JSON.stringify(filteredData));
            return true;
        }
        return false;
    }
}

const usersDB = new DB_API('todolist_users');
const tasksDB = new DB_API('todolist_tasks');