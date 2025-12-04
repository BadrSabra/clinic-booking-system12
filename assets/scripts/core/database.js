/**
 * Database Service
 * Handles all IndexedDB operations
 */
class DatabaseService {
    constructor(config) {
        this.config = config;
        this.db = null;
        this.init();
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.config.name, this.config.version);
            
            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB initialized successfully');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                this.config.stores.forEach(storeConfig => {
                    if (!db.objectStoreNames.contains(storeConfig.name)) {
                        const store = db.createObjectStore(
                            storeConfig.name, 
                            { keyPath: storeConfig.keyPath }
                        );
                        
                        // Create indexes
                        storeConfig.indexes?.forEach(index => {
                            store.createIndex(
                                index.name,
                                index.keyPath,
                                { unique: index.unique }
                            );
                        });
                    }
                });
            };
        });
    }
    
    /**
     * Add item to store
     */
    async add(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(item);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Get item by key
     */
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Get all items from store
     */
    async getAll(storeName, indexName = null, query = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            let store = transaction.objectStore(storeName);
            
            if (indexName) {
                store = store.index(indexName);
            }
            
            const request = query ? store.getAll(query) : store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Update item
     */
    async update(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(item);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Delete item
     */
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Clear store
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Save all data
     */
    async saveAll(data) {
        const promises = [];
        
        // Save doctors
        if (data.doctors) {
            for (const doctor of data.doctors) {
                promises.push(this.update('doctors', doctor));
            }
        }
        
        // Save patients
        if (data.patients) {
            for (const patient of data.patients) {
                promises.push(this.update('patients', patient));
            }
        }
        
        // Save appointments
        if (data.appointments) {
            for (const appointment of data.appointments) {
                promises.push(this.update('appointments', appointment));
            }
        }
        
        return Promise.all(promises);
    }
    
    /**
     * Export database
     */
    async export() {
        const data = {
            doctors: await this.getAll('doctors'),
            patients: await this.getAll('patients'),
            appointments: await this.getAll('appointments'),
            exportedAt: new Date().toISOString(),
            version: this.config.version
        };
        
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * Import database
     */
    async import(jsonData) {
        const data = JSON.parse(jsonData);
        
        // Clear existing data
        await this.clear('doctors');
        await this.clear('patients');
        await this.clear('appointments');
        
        // Import new data
        const promises = [];
        
        if (data.doctors) {
            for (const doctor of data.doctors) {
                promises.push(this.add('doctors', doctor));
            }
        }
        
        if (data.patients) {
            for (const patient of data.patients) {
                promises.push(this.add('patients', patient));
            }
        }
        
        if (data.appointments) {
            for (const appointment of data.appointments) {
                promises.push(this.add('appointments', appointment));
            }
        }
        
        return Promise.all(promises);
    }
}
