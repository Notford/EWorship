// Church Database Management System
class ChurchDatabase {
    constructor() {
        this.data = {
            users: [],
            scriptures: [],
            songs: [],
            announcements: [],
            cell_groups: [],
            events: [],
            media: [],
            teams: [],
            settings: []
        };
        this.storageKey = 'church_worship_db_';
        this.initialize();
    }

    async initialize() {
        await this.loadAllData();
        this.setupSync();
        console.log('Database initialized');
    }

    // Load data from localStorage or create default
    async loadAllData() {
        try {
            const tables = Object.keys(this.data);
            
            for (const table of tables) {
                const savedData = localStorage.getItem(this.storageKey + table);
                
                if (savedData) {
                    this.data[table] = JSON.parse(savedData);
                } else {
                    // Load from CSV files if available
                    await this.loadFromCSV(table);
                    
                    if (this.data[table].length === 0) {
                        // Create sample data if no data exists
                        this.createSampleData(table);
                    }
                    
                    this.saveToStorage(table);
                }
            }
            
            // Initialize sample data for first time
            if (this.data.users.length === 0) {
                this.initializeSampleDatabase();
            }
            
        } catch (error) {
            console.error('Error loading database:', error);
            this.initializeSampleDatabase();
        }
    }

    async loadFromCSV(table) {
        try {
            const response = await fetch(`assets/data/${table}.csv`);
            if (response.ok) {
                const csvText = await response.text();
                this.data[table] = this.csvToJSON(csvText);
            }
        } catch (error) {
            console.log(`No CSV file for ${table}, using empty array`);
        }
    }

    csvToJSON(csv) {
        const lines = csv.split('\n');
        const result = [];
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const obj = {};
            const currentline = lines[i].split(',');
            
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentline[j] ? currentline[j].trim() : '';
            }
            
            result.push(obj);
        }
        
        return result;
    }

    jsonToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        csvRows.push(headers.join(','));
        
        for (const row of data) {
            const values = headers.map(header => {
                const escaped = ('' + row[header]).replace(/"/g, '\\"');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    saveToStorage(table) {
        localStorage.setItem(this.storageKey + table, JSON.stringify(this.data[table]));
    }

    // CRUD Operations
    create(table, item) {
        item.id = this.generateId();
        item.created_at = new Date().toISOString();
        item.updated_at = new Date().toISOString();
        
        this.data[table].push(item);
        this.saveToStorage(table);
        this.triggerUpdate(table);
        
        return item;
    }

    read(table, id = null) {
        if (id) {
            return this.data[table].find(item => item.id == id);
        }
        return this.data[table];
    }

    update(table, id, updates) {
        const index = this.data[table].findIndex(item => item.id == id);
        if (index !== -1) {
            updates.updated_at = new Date().toISOString();
            this.data[table][index] = { ...this.data[table][index], ...updates };
            this.saveToStorage(table);
            this.triggerUpdate(table);
            return true;
        }
        return false;
    }

    delete(table, id) {
        const index = this.data[table].findIndex(item => item.id == id);
        if (index !== -1) {
            this.data[table].splice(index, 1);
            this.saveToStorage(table);
            this.triggerUpdate(table);
            return true;
        }
        return false;
    }

    query(table, conditions) {
        return this.data[table].filter(item => {
            return Object.entries(conditions).every(([key, value]) => {
                return item[key] == value;
            });
        });
    }

    // User Management
    getUserByEmail(email) {
        return this.data.users.find(user => user.email === email);
    }

    getUserPermissions(userId) {
        const user = this.read('users', userId);
        if (!user) return [];
        
        if (user.role === 'pastor') {
            return ['all'];
        }
        
        return user.permissions ? user.permissions.split('|') : [];
    }

    // Team Management
    getTeamMembers(teamName) {
        return this.data.users.filter(user => 
            user.team === teamName && user.status === 'active'
        );
    }

    // Media Management
    addMediaFile(fileData) {
        return this.create('media', fileData);
    }

    getMediaByCategory(category) {
        return this.data.media.filter(item => item.category === category);
    }

    // Event Management
    getUpcomingEvents() {
        const today = new Date().toISOString().split('T')[0];
        return this.data.events.filter(event => event.date >= today)
                              .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Song Management
    searchSongs(query) {
        const lowerQuery = query.toLowerCase();
        return this.data.songs.filter(song => 
            song.title.toLowerCase().includes(lowerQuery) ||
            song.artist.toLowerCase().includes(lowerQuery) ||
            song.lyrics.toLowerCase().includes(lowerQuery)
        );
    }

    // Scripture Management
    getScriptures(translation = 'KJV', book = '') {
        return this.data.scriptures.filter(s => 
            s.translation === translation && 
            (!book || s.book === book)
        );
    }

    // Utility Methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    triggerUpdate(table) {
        // Dispatch event for other parts of app to know data changed
        const event = new CustomEvent('databaseUpdate', {
            detail: { table: table }
        });
        window.dispatchEvent(event);
    }

    setupSync() {
        // Auto-save every minute
        setInterval(() => {
            Object.keys(this.data).forEach(table => {
                this.saveToStorage(table);
            });
        }, 60000);

        // Backup to file every hour
        setInterval(() => {
            this.exportToFile();
        }, 3600000);
    }

    exportToFile() {
        const backup = {};
        Object.keys(this.data).forEach(table => {
            backup[table] = this.data[table];
        });
        
        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // In a real app, this would upload to server
        localStorage.setItem('church_backup_' + Date.now(), dataStr);
    }

    importFromFile(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            Object.keys(data).forEach(table => {
                if (this.data[table] !== undefined) {
                    this.data[table] = data[table];
                    this.saveToStorage(table);
                }
            });
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    // Initialize Sample Database
    initializeSampleDatabase() {
        console.log('Initializing sample database...');
        
        // Sample Users
        this.data.users = [
            {
                id: '1',
                name: 'Pastor John Doe',
                email: 'pastor@church.org',
                role: 'pastor',
                team: 'leadership',
                permissions: 'all',
                phone: '1234567890',
                cell_group: 'A1',
                status: 'active',
                created_at: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Media Team Lead',
                email: 'media@church.org',
                role: 'media_lead',
                team: 'media',
                permissions: 'production|camera|media|upload',
                phone: '1234567891',
                cell_group: 'B2',
                status: 'active',
                created_at: new Date().toISOString()
            },
            {
                id: '3',
                name: 'Choir Director',
                email: 'choir@church.org',
                role: 'choir_lead',
                team: 'choir',
                permissions: 'songs|schedule|upload',
                phone: '1234567892',
                cell_group: 'C3',
                status: 'active',
                created_at: new Date().toISOString()
            }
        ];

        // Sample Scriptures
        this.data.scriptures = [
            {
                id: '1',
                book: 'John',
                chapter: '3',
                verse: '16',
                text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
                translation: 'KJV',
                tags: 'salvation,love',
                date_added: new Date().toISOString()
            },
            {
                id: '2',
                book: 'Psalm',
                chapter: '23',
                verse: '1',
                text: 'The LORD is my shepherd; I shall not want.',
                translation: 'KJV',
                tags: 'comfort,guidance',
                date_added: new Date().toISOString()
            }
        ];

        // Sample Songs
        this.data.songs = [
            {
                id: '1',
                title: 'Amazing Grace',
                artist: 'Traditional',
                category: 'Worship',
                lyrics: 'Amazing grace, how sweet the sound...',
                chords: 'G C D G',
                bpm: '75',
                key: 'G',
                duration: '4:30',
                added_by: '1',
                date_added: new Date().toISOString()
            }
        ];

        // Sample Teams
        this.data.teams = [
            {
                id: '1',
                name: 'Choir',
                leader_id: '3',
                description: 'Worship and praise team',
                requirements: '24hrs song submission before service',
                reminders: true
            },
            {
                id: '2',
                name: 'Media',
                leader_id: '2',
                description: 'Audio/Video production team',
                requirements: 'Production access required',
                reminders: false
            }
        ];

        // Save all data
        Object.keys(this.data).forEach(table => {
            this.saveToStorage(table);
        });
    }

    createSampleData(table) {
        const sampleData = {
            users: [
                {
                    id: 'sample1',
                    name: 'Sample User',
                    email: 'user@example.com',
                    role: 'member',
                    team: 'congregation',
                    permissions: 'view',
                    status: 'active'
                }
            ],
            announcements: [
                {
                    id: 'sample1',
                    title: 'Welcome to Church System',
                    content: 'This is a sample announcement',
                    author: '1',
                    priority: 'normal',
                    created_at: new Date().toISOString()
                }
            ],
            events: [
                {
                    id: 'sample1',
                    title: 'Sunday Service',
                    date: new Date().toISOString().split('T')[0],
                    time: '09:00',
                    location: 'Main Sanctuary',
                    description: 'Weekly worship service'
                }
            ]
        };

        if (sampleData[table]) {
            this.data[table] = sampleData[table];
        } else {
            this.data[table] = [];
        }
    }
}

// Initialize global database instance
const churchDB = new ChurchDatabase();
