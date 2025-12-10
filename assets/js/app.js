// Main Application Controller
class WorshipApp {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUserData();
    }

    bindEvents() {
        // Database update listeners
        window.addEventListener('databaseUpdate', (event) => {
            this.handleDataUpdate(event.detail.table);
        });

        // Window focus/blur events
        window.addEventListener('focus', () => this.onWindowFocus());
        window.addEventListener('blur', () => this.onWindowBlur());
    }

    handleDataUpdate(table) {
        console.log(`Database updated: ${table}`);
        
        // Refresh relevant parts of UI
        switch(table) {
            case 'announcements':
                this.refreshAnnouncements();
                break;
            case 'events':
                this.refreshEvents();
                break;
            case 'songs':
                this.refreshSongs();
                break;
        }
    }

    loadUserData() {
        const user = auth.getCurrentUser();
        if (user) {
            this.updateUserUI(user);
            this.loadDashboardData();
        }
    }

    updateUserUI(user) {
        // Update user display elements
        const userNameElements = document.querySelectorAll('#userName, .user-name');
        const userRoleElements = document.querySelectorAll('#userRole, .user-role');
        
        userNameElements.forEach(el => {
            if (el) el.textContent = user.name;
        });
        
        userRoleElements.forEach(el => {
            if (el) el.textContent = user.role.replace('_', ' ').toUpperCase();
        });

        // Show/hide admin section
        const adminSection = document.getElementById('adminSection');
        if (adminSection) {
            adminSection.style.display = user.role === 'pastor' ? 'block' : 'none';
        }
    }

    async loadDashboardData() {
        // Load statistics
        const stats = {
            totalMembers: churchDB.read('users').filter(u => u.status === 'active').length,
            upcomingEvents: churchDB.getUpcomingEvents().length,
            totalSongs: churchDB.read('songs').length,
            liveViewers: Math.floor(Math.random() * 100) // Mock data
        };

        // Update UI
        Object.keys(stats).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = stats[key];
            }
        });

        // Load announcements
        this.refreshAnnouncements();

        // Load teams
        this.refreshTeams();
    }

    refreshAnnouncements() {
        const container = document.getElementById('announcementsList');
        if (!container) return;

        const announcements = churchDB.read('announcements')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);

        container.innerHTML = announcements.map(ann => `
            <div class="announcement-item">
                <div class="announcement-header">
                    <h4>${ann.title}</h4>
                    <span class="announcement-date">${this.formatDate(ann.created_at)}</span>
                </div>
                <p>${ann.content}</p>
                ${ann.priority === 'high' ? '<span class="priority-badge">HIGH PRIORITY</span>' : ''}
            </div>
        `).join('');
    }

    refreshTeams() {
        const container = document.getElementById('teamsGrid');
        if (!container) return;

        const teams = churchDB.read('teams');
        
        container.innerHTML = teams.map(team => {
            const members = churchDB.getTeamMembers(team.name);
            const leader = churchDB.read('users', team.leader_id);
            
            return `
                <div class="team-card">
                    <h4><i class="fas fa-users"></i> ${team.name}</h4>
                    <div class="team-leader">
                        <strong>Leader:</strong> ${leader ? leader.name : 'Not assigned'}
                    </div>
                    <div class="team-members">
                        <strong>Members:</strong> ${members.length}
                    </div>
                    <div class="team-requirements">
                        <small>${team.requirements || 'No special requirements'}</small>
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="viewTeam('${team.id}')">
                        View Details
                    </button>
                </div>
            `;
        }).join('');
    }

    refreshEvents() {
        // Implement in events page
    }

    refreshSongs() {
        // Implement in songs page
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    onWindowFocus() {
        console.log('App focused');
        // Refresh data when user returns to app
        this.loadDashboardData();
    }

    onWindowBlur() {
        console.log('App blurred');
        // Auto-save or pause activities
    }

    // Notification System
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        document.body.appendChild(notification);

        // Remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Reminder System
    sendReminders() {
        const teams = churchDB.read('teams');
        const nextService = this.getNextServiceDate();
        
        teams.forEach(team => {
            if (team.reminders) {
                this.sendTeamReminder(team, nextService);
            }
        });
        
        this.showNotification('Reminders sent to all teams', 'success');
    }

    sendTeamReminder(team, serviceDate) {
        const members = churchDB.getTeamMembers(team.name);
        const deadline = this.getTeamDeadline(team.name, serviceDate);
        
        members.forEach(member => {
            // In real app, send email/SMS
            console.log(`Reminder sent to ${member.name}: ${team.requirements}`);
        });
    }

    getTeamDeadline(teamName, serviceDate) {
        const deadline = new Date(serviceDate);
        
        switch(teamName.toLowerCase()) {
            case 'choir':
                deadline.setDate(deadline.getDate() - 1); // 24 hours before
                break;
            case 'leadership':
                deadline.setDate(deadline.getDate() - 2); // 48 hours before
                break;
            default:
                deadline.setDate(deadline.getDate() - 1);
        }
        
        return deadline;
    }

    getNextServiceDate() {
        const today = new Date();
        const day = today.getDay();
        const daysUntilSunday = day === 0 ? 7 : 7 - day;
        const nextSunday = new Date(today);
        nextSunday.setDate(today.getDate() + daysUntilSunday);
        return nextSunday;
    }

    // File Management
    async handleFileUpload(file, category) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    category: category,
                    data: event.target.result,
                    uploaded_by: auth.getCurrentUser().id,
                    uploaded_at: new Date().toISOString()
                };
                
                const saved = churchDB.addMediaFile(fileData);
                resolve(saved);
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsDataURL(file);
        });
    }

    downloadFile(data, filename, type) {
        const blob = new Blob([data], { type: type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

// Initialize app
const worshipApp = new WorshipApp();

// Global helper functions
function updateTime() {
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
}

function newAnnouncement() {
    if (!checkPermission('manage_announcements')) return;
    
    const title = prompt('Enter announcement title:');
    if (!title) return;
    
    const content = prompt('Enter announcement content:');
    if (!content) return;
    
    const announcement = {
        title: title,
        content: content,
        author: auth.getCurrentUser().id,
        priority: 'normal'
    };
    
    churchDB.create('announcements', announcement);
    worshipApp.showNotification('Announcement created', 'success');
}

function viewTeam(teamId) {
    const team = churchDB.read('teams', teamId);
    if (!team) return;
    
    const members = churchDB.getTeamMembers(team.name);
    const leader = churchDB.read('users', team.leader_id);
    
    const details = `
        <h3>${team.name} Team</h3>
        <p><strong>Leader:</strong> ${leader ? leader.name : 'Not assigned'}</p>
        <p><strong>Description:</strong> ${team.description || 'No description'}</p>
        <p><strong>Requirements:</strong> ${team.requirements || 'None'}</p>
        <hr>
        <h4>Team Members (${members.length})</h4>
        <ul>
            ${members.map(m => `<li>${m.name} - ${m.role}</li>`).join('')}
        </ul>
    `;
    
    alert(details);
}

function sendReminders() {
    if (!checkPermission('send_reminders')) return;
    worshipApp.sendReminders();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication for protected pages
    const protectedPages = [
        'dashboard.html',
        'production.html',
        'camera-setup.html',
        'songs.html',
        'media.html',
        'bible.html'
    ];
    
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        checkAuth();
    }
    
    // Update time every second
    setInterval(updateTime, 1000);
});
