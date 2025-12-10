// Authentication and Session Management
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.sessionKey = 'church_worship_session';
        this.init();
    }

    init() {
        this.restoreSession();
        this.setupAutoLogout();
    }

    login(email, password, role) {
        const user = churchDB.getUserByEmail(email);
        
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        // In real app, verify password hash
        if (password !== 'demo123') { // Default password for demo
            return { success: false, message: 'Invalid password' };
        }

        if (role && user.role !== role) {
            return { success: false, message: 'Role mismatch' };
        }

        this.currentUser = user;
        this.saveSession();
        
        return { success: true, user: user };
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.sessionKey);
        window.location.href = 'index.html';
    }

    saveSession() {
        const session = {
            user: this.currentUser,
            timestamp: Date.now()
        };
        localStorage.setItem(this.sessionKey, JSON.stringify(session));
    }

    restoreSession() {
        const sessionData = localStorage.getItem(this.sessionKey);
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                // Check if session is less than 24 hours old
                if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
                    this.currentUser = session.user;
                } else {
                    localStorage.removeItem(this.sessionKey);
                }
            } catch (error) {
                console.error('Error restoring session:', error);
            }
        }
    }

    setupAutoLogout() {
        // Auto logout after 30 minutes of inactivity
        let inactivityTimer;
        
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            if (this.currentUser) {
                inactivityTimer = setTimeout(() => {
                    this.logout();
                }, 30 * 60 * 1000);
            }
        };

        // Reset timer on user activity
        ['mousemove', 'keypress', 'click', 'scroll'].forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        resetTimer();
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        if (this.currentUser.role === 'pastor') {
            return true;
        }

        const permissions = churchDB.getUserPermissions(this.currentUser.id);
        return permissions.includes('all') || permissions.includes(permission);
    }

    getUserRole() {
        return this.currentUser ? this.currentUser.role : 'guest';
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Initialize auth system
const auth = new AuthSystem();

// Global login function
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }

    const result = auth.login(email, password, role);
    
    if (result.success) {
        // Redirect based on role
        switch(result.user.role) {
            case 'pastor':
            case 'media_lead':
                window.location.href = 'dashboard.html';
                break;
            case 'choir_lead':
            case 'usher_lead':
                window.location.href = 'dashboard.html';
                break;
            default:
                window.location.href = 'events.html';
        }
    } else {
        alert(result.message);
    }
}

function logout() {
    auth.logout();
}

function checkAuth() {
    if (!auth.isAuthenticated()) {
        window.location.href = 'index.html';
    }
}

function checkPermission(permission) {
    if (!auth.hasPermission(permission)) {
        alert('You do not have permission to access this feature');
        return false;
    }
    return true;
}
