/**
 * ClinicPro - Professional Clinic Management System
 * Core Application Module
 * Version: 2.0.0
 */

class ClinicProApp {
    constructor() {
        this.config = {
            appName: 'ClinicPro',
            version: '2.0.0',
            apiEndpoint: 'https://api.clinicpro.com/v1',
            defaultTheme: 'dark',
            defaultLanguage: 'ar',
            storagePrefix: 'clinicpro_',
            encryptionKey: 'clinicpro-secure-key-2024'
        };
        
        this.state = {
            user: null,
            clinic: null,
            doctors: [],
            patients: [],
            appointments: [],
            notifications: [],
            isLoading: false,
            currentPage: 'dashboard',
            sidebarCollapsed: false,
            theme: 'dark'
        };
        
        this.services = {};
        this.ui = {};
        this.modules = {};
        
        this.init();
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            // Show loading overlay
            this.showLoading();
            
            // Initialize core modules
            await this.initCoreModules();
            
            // Initialize UI components
            await this.initUIComponents();
            
            // Load application data
            await this.loadAppData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Hide loading overlay
            setTimeout(() => {
                this.hideLoading();
                this.showToast('success', 'تم تحميل النظام بنجاح', 'مرحباً بك في ClinicPro');
            }, 1000);
            
        } catch (error) {
            console.error('Application initialization failed:', error);
            this.showToast('error', 'خطأ في التهيئة', error.message);
            this.hideLoading();
        }
    }
    
    /**
     * Initialize core modules
     */
    async initCoreModules() {
        // Initialize database
        this.db = new DatabaseService({
            name: 'clinicpro_db',
            version: 2,
            stores: [
                {
                    name: 'doctors',
                    keyPath: 'id',
                    indexes: [
                        { name: 'name', keyPath: 'name', unique: false },
                        { name: 'specialty', keyPath: 'specialty', unique: false },
                        { name: 'isActive', keyPath: 'isActive', unique: false }
                    ]
                },
                {
                    name: 'patients',
                    keyPath: 'id',
                    indexes: [
                        { name: 'name', keyPath: 'name', unique: false },
                        { name: 'phone', keyPath: 'phone', unique: true },
                        { name: 'createdAt', keyPath: 'createdAt', unique: false }
                    ]
                },
                {
                    name: 'appointments',
                    keyPath: 'id',
                    indexes: [
                        { name: 'date', keyPath: 'date', unique: false },
                        { name: 'status', keyPath: 'status', unique: false },
                        { name: 'doctorId', keyPath: 'doctorId', unique: false },
                        { name: 'patientId', keyPath: 'patientId', unique: false }
                    ]
                }
            ]
        });
        
        // Initialize services
        this.services = {
            doctors: new DoctorService(this.db),
            patients: new PatientService(this.db),
            appointments: new AppointmentService(this.db),
            reports: new ReportService(this.db),
            auth: new AuthService()
        };
        
        // Initialize UI managers
        this.ui = {
            modal: new ModalManager(),
            toast: new ToastManager(),
            table: new TableManager(),
            chart: new ChartManager()
        };
        
        // Initialize modules
        this.modules = {
            dashboard: new DashboardModule(this),
            doctors: new DoctorsModule(this),
            patients: new PatientsModule(this),
            appointments: new AppointmentsModule(this)
        };
    }
    
    /**
     * Initialize UI components
     */
    async initUIComponents() {
        // Setup theme
        const savedTheme = localStorage.getItem(`${this.config.storagePrefix}theme`) || this.config.defaultTheme;
        this.setTheme(savedTheme);
        
        // Setup language
        const savedLang = localStorage.getItem(`${this.config.storagePrefix}language`) || this.config.defaultLanguage;
        document.documentElement.lang = savedLang;
        
        // Initialize charts
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = 'Cairo, sans-serif';
            Chart.defaults.font.size = 12;
            Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
        }
        
        // Setup date pickers
        this.setupDatePickers();
        
        // Setup search functionality
        this.setupSearch();
        
        // Setup notifications
        this.setupNotifications();
    }
    
    /**
     * Load application data
     */
    async loadAppData() {
        try {
            // Load doctors
            this.state.doctors = await this.services.doctors.getAll();
            
            // Load patients
            this.state.patients = await this.services.patients.getAll();
            
            // Load appointments
            this.state.appointments = await this.services.appointments.getAll();
            
            // Load notifications
            this.state.notifications = await this.loadNotifications();
            
            // Update UI
            this.updateStats();
            this.updateDashboard();
            
        } catch (error) {
            console.error('Failed to load app data:', error);
            throw error;
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Global search
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleGlobalSearch(e.target.value));
            searchInput.addEventListener('focus', () => this.showSearchResults());
            searchInput.addEventListener('blur', () => {
                setTimeout(() => this.hideSearchResults(), 200);
            });
        }
        
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('href').substring(1);
                this.navigateTo(page);
            });
        });
        
        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Window events
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }
    
    /**
     * Update statistics
     */
    updateStats() {
        // Doctor count
        const activeDoctors = this.state.doctors.filter(d => d.isActive).length;
        document.getElementById('doctorsCount').textContent = activeDoctors;
        document.getElementById('activeDoctors').textContent = activeDoctors;
        
        // Patient count
        document.getElementById('patientsCount').textContent = this.state.patients.length;
        document.getElementById('totalPatients').textContent = this.state.patients.length;
        
        // Appointment count
        const totalAppointments = this.state.appointments.length;
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = this.state.appointments.filter(a => a.date === today).length;
        
        document.getElementById('appointmentsCount').textContent = totalAppointments;
        document.getElementById('todayAppointments').textContent = todayAppointments;
        document.getElementById('totalAppointments').textContent = totalAppointments;
        
        // Update badges
        document.getElementById('dashboardBadge').textContent = todayAppointments;
        document.getElementById('pendingAppointments').textContent = 
            this.state.appointments.filter(a => a.status === 'pending').length;
        document.getElementById('notificationCount').textContent = 
            this.state.notifications.filter(n => !n.read).length;
    }
    
    /**
     * Update dashboard
     */
    updateDashboard() {
        // Update upcoming appointments table
        this.updateUpcomingAppointments();
        
        // Update activity list
        this.updateActivityList();
        
        // Update charts
        this.updateCharts();
    }
    
    /**
     * Update upcoming appointments table
     */
    updateUpcomingAppointments() {
        const table = document.getElementById('upcomingAppointmentsTable');
        if (!table) return;
        
        const today = new Date().toISOString().split('T')[0];
        const upcoming = this.state.appointments
            .filter(a => a.date >= today)
            .sort((a, b) => {
                if (a.date === b.date) return a.time.localeCompare(b.time);
                return a.date.localeCompare(b.date);
            })
            .slice(0, 10);
        
        table.innerHTML = upcoming.map(appointment => {
            const doctor = this.state.doctors.find(d => d.id === appointment.doctorId);
            const patient = this.state.patients.find(p => p.id === appointment.patientId);
            
            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar-sm">
                                <i class="fas fa-user-injured"></i>
                            </div>
                            <div class="ms-3">
                                <strong>${patient?.name || 'غير معروف'}</strong>
                                <div class="text-muted small">${patient?.phone || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td>${doctor?.name || 'غير معروف'}</td>
                    <td>
                        <div>${this.formatDate(appointment.date)}</div>
                        <div class="text-muted small">${appointment.time}</div>
                    </td>
                    <td>
                        <span class="badge bg-info">${appointment.type}</span>
                    </td>
                    <td>
                        <span class="status-badge status-${appointment.status}">
                            ${this.getStatusText(appointment.status)}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-outline" onclick="app.confirmAppointment('${appointment.id}')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="app.rescheduleAppointment('${appointment.id}')">
                                <i class="fas fa-calendar-alt"></i>
                            </button>
                            <button class="btn btn-sm btn-outline text-danger" onclick="app.cancelAppointment('${appointment.id}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        if (upcoming.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="fas fa-calendar-times fa-2x mb-3"></i>
                        <div>لا توجد مواعيد قادمة</div>
                    </td>
                </tr>
            `;
        }
    }
    
    /**
     * Update activity list
     */
    updateActivityList() {
        const container = document.getElementById('activityList');
        if (!container) return;
        
        const activities = this.generateActivities();
        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon bg-${activity.color}">
                    <i class="fas fa-${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Update charts
     */
    updateCharts() {
        // Appointments chart
        this.updateAppointmentsChart();
        
        // Patients chart
        this.updatePatientsChart();
    }
    
    /**
     * Update appointments chart
     */
    updateAppointmentsChart() {
        const ctx = document.getElementById('appointmentsChart');
        if (!ctx) return;
        
        const data = this.getAppointmentsChartData('monthly');
        
        if (this.appointmentsChart) {
            this.appointmentsChart.destroy();
        }
        
        this.appointmentsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'عدد المواعيد',
                    data: data.values,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            borderDash: [3]
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Update patients chart
     */
    updatePatientsChart() {
        const ctx = document.getElementById('patientsChart');
        if (!ctx) return;
        
        const data = this.getPatientsChartData('age');
        
        if (this.patientsChart) {
            this.patientsChart.destroy();
        }
        
        this.patientsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        '#3B82F6',
                        '#10B981',
                        '#F59E0B',
                        '#EF4444',
                        '#8B5CF6'
                    ],
                    borderWidth: 1,
                    borderColor: 'var(--bg-primary)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Get appointments chart data
     */
    getAppointmentsChartData(period = 'monthly') {
        const now = new Date();
        let labels = [];
        let values = [];
        
        if (period === 'monthly') {
            // Last 6 months
            for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const month = date.toLocaleDateString('ar-SA', { month: 'short' });
                labels.push(month);
                
                const monthStr = date.toISOString().substring(0, 7);
                const count = this.state.appointments.filter(a => 
                    a.date.startsWith(monthStr)
                ).length;
                values.push(count);
            }
        } else if (period === 'weekly') {
            // Last 4 weeks
            for (let i = 3; i >= 0; i--) {
                const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
                labels.push(`الأسبوع ${i + 1}`);
                // Simplified count for demo
                values.push(Math.floor(Math.random() * 20) + 10);
            }
        }
        
        return { labels, values };
    }
    
    /**
     * Get patients chart data
     */
    getPatientsChartData(type = 'age') {
        if (type === 'age') {
            const groups = {
                'أقل من 18': 0,
                '18-30': 0,
                '31-45': 0,
                '46-60': 0,
                'أكثر من 60': 0
            };
            
            this.state.patients.forEach(patient => {
                if (patient.age < 18) groups['أقل من 18']++;
                else if (patient.age <= 30) groups['18-30']++;
                else if (patient.age <= 45) groups['31-45']++;
                else if (patient.age <= 60) groups['46-60']++;
                else groups['أكثر من 60']++;
            });
            
            return {
                labels: Object.keys(groups),
                values: Object.values(groups)
            };
        } else {
            // Gender distribution
            const male = this.state.patients.filter(p => p.gender === 'male').length;
            const female = this.state.patients.filter(p => p.gender === 'female').length;
            
            return {
                labels: ['ذكور', 'إناث'],
                values: [male, female]
            };
        }
    }
    
    /**
     * Generate activities
     */
    generateActivities() {
        const activities = [];
        const now = new Date();
        
        // Add appointment activities
        this.state.appointments.slice(0, 5).forEach(appointment => {
            const patient = this.state.patients.find(p => p.id === appointment.patientId);
            activities.push({
                icon: 'calendar-plus',
                color: 'primary',
                text: `موعد جديد للمريض ${patient?.name || 'غير معروف'}`,
                time: this.formatTimeAgo(appointment.createdAt)
            });
        });
        
        // Add patient activities
        this.state.patients.slice(0, 3).forEach(patient => {
            activities.push({
                icon: 'user-plus',
                color: 'success',
                text: `مريض جديد: ${patient.name}`,
                time: this.formatTimeAgo(patient.createdAt)
            });
        });
        
        // Sort by time
        return activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    }
    
    /**
     * Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    /**
     * Format time ago
     */
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        if (hours < 24) return `منذ ${hours} ساعة`;
        if (days < 7) return `منذ ${days} يوم`;
        
        return this.formatDate(dateString);
    }
    
    /**
     * Get status text
     */
    getStatusText(status) {
        const statusMap = {
            'pending': 'قيد الانتظار',
            'confirmed': 'مؤكد',
            'completed': 'مكتمل',
            'cancelled': 'ملغي',
            'no-show': 'لم يحضر'
        };
        
        return statusMap[status] || status;
    }
    
    /**
     * Set theme
     */
    setTheme(theme) {
        this.state.theme = theme;
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(`${theme}-mode`);
        localStorage.setItem(`${this.config.storagePrefix}theme`, theme);
        
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
    
    /**
     * Toggle theme
     */
    toggleTheme() {
        const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
    
    /**
     * Navigate to page
     */
    navigateTo(page) {
        // Update current page
        this.state.currentPage = page;
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${page}`) {
                link.classList.add('active');
            }
        });
        
        // Update breadcrumb
        const currentPageEl = document.getElementById('currentPage');
        if (currentPageEl) {
            const pageNames = {
                'dashboard': 'لوحة التحكم',
                'appointments': 'المواعيد',
                'patients': 'المرضى',
                'doctors': 'الأطباء',
                'billing': 'الفواتير',
                'inventory': 'المخزون',
                'reports': 'التقارير',
                'analytics': 'التحليلات',
                'settings': 'الإعدادات'
            };
            currentPageEl.textContent = pageNames[page] || page;
        }
        
        // Show/hide page sections
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
            if (section.id === page) {
                section.classList.add('active');
            }
        });
        
        // Load module if exists
        if (this.modules[page]) {
            this.modules[page].load();
        }
    }
    
    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    }
    
    /**
     * Toggle user menu
     */
    toggleUserMenu() {
        const menu = document.getElementById('userMenu');
        if (menu) {
            menu.classList.toggle('show');
        }
    }
    
    /**
     * Toggle notifications
     */
    toggleNotifications() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.toggle('show');
        }
    }
    
    /**
     * Show loading overlay
     */
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    /**
     * Show toast notification
     */
    showToast(type, title, message) {
        this.ui.toast.show(type, title, message);
    }
    
    /**
     * Handle global search
     */
    handleGlobalSearch(query) {
        if (!query.trim()) {
            this.hideSearchResults();
            return;
        }
        
        const results = this.searchData(query);
        this.showSearchResults(results);
    }
    
    /**
     * Search data
     */
    searchData(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();
        
        // Search doctors
        this.state.doctors.forEach(doctor => {
            if (doctor.name.toLowerCase().includes(lowerQuery) || 
                doctor.specialty.toLowerCase().includes(lowerQuery)) {
                results.push({
                    type: 'doctor',
                    icon: 'user-md',
                    title: doctor.name,
                    subtitle: doctor.specialty,
                    action: () => this.viewDoctor(doctor.id)
                });
            }
        });
        
        // Search patients
        this.state.patients.forEach(patient => {
            if (patient.name.toLowerCase().includes(lowerQuery) || 
                patient.phone.includes(query)) {
                results.push({
                    type: 'patient',
                    icon: 'user-injured',
                    title: patient.name,
                    subtitle: patient.phone,
                    action: () => this.viewPatient(patient.id)
                });
            }
        });
        
        return results.slice(0, 10); // Limit results
    }
    
    /**
     * Show search results
     */
    showSearchResults(results = []) {
        const container = document.getElementById('searchResults');
        if (!container) return;
        
        if (results.length === 0) {
            container.innerHTML = `
                <div class="search-result-empty">
                    <i class="fas fa-search"></i>
                    <div>اكتب للبحث عن أطباء، مرضى، أو مواعيد</div>
                </div>
            `;
        } else {
            container.innerHTML = results.map(result => `
                <div class="search-result-item" onclick="app.executeSearchResult(${JSON.stringify(result.action)})">
                    <div class="search-result-icon">
                        <i class="fas fa-${result.icon}"></i>
                    </div>
                    <div class="search-result-content">
                        <div class="search-result-title">${result.title}</div>
                        <div class="search-result-subtitle">${result.subtitle}</div>
                    </div>
                    <div class="search-result-arrow">
                        <i class="fas fa-chevron-left"></i>
                    </div>
                </div>
            `).join('');
        }
        
        container.classList.add('show');
    }
    
    /**
     * Hide search results
     */
    hideSearchResults() {
        const container = document.getElementById('searchResults');
        if (container) {
            container.classList.remove('show');
        }
    }
    
    /**
     * Execute search result action
     */
    executeSearchResult(action) {
        if (typeof action === 'function') {
            action();
        }
        this.hideSearchResults();
        document.getElementById('globalSearch').value = '';
    }
    
    /**
     * Setup date pickers
     */
    setupDatePickers() {
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) startDateInput.value = '2024-01-01';
        if (endDateInput) endDateInput.value = today;
    }
    
    /**
     * Setup notifications
     */
    setupNotifications() {
        // Check for new notifications every 30 seconds
        setInterval(() => this.checkNewNotifications(), 30000);
    }
    
    /**
     * Check for new notifications
     */
    async checkNewNotifications() {
        // In a real app, this would fetch from server
        const newNotifications = await this.loadNewNotifications();
        if (newNotifications.length > 0) {
            this.state.notifications = [...newNotifications, ...this.state.notifications];
            this.updateNotificationBadge();
            this.showNewNotifications(newNotifications);
        }
    }
    
    /**
     * Load notifications
     */
    async loadNotifications() {
        // Mock data for demo
        return [
            {
                id: '1',
                type: 'appointment',
                title: 'موعد قريب',
                message: 'لديك موعد مع أحمد محمد خلال ساعة',
                time: new Date(Date.now() - 3600000).toISOString(),
                read: false
            },
            {
                id: '2',
                type: 'patient',
                title: 'مريض جديد',
                message: 'سارة الخالد سجلت كـ مريضة جديدة',
                time: new Date(Date.now() - 7200000).toISOString(),
                read: true
            }
        ];
    }
    
    /**
     * Load new notifications
     */
    async loadNewNotifications() {
        // Mock data for demo
        const shouldAdd = Math.random() > 0.7;
        if (!shouldAdd) return [];
        
        return [{
            id: Date.now().toString(),
            type: 'reminder',
            title: 'تذكير',
            message: 'لا تنسى مراجعة تقرير الأسبوع',
            time: new Date().toISOString(),
            read: false
        }];
    }
    
    /**
     * Show new notifications
     */
    showNewNotifications(notifications) {
        notifications.forEach(notification => {
            this.showToast('info', notification.title, notification.message);
        });
    }
    
    /**
     * Update notification badge
     */
    updateNotificationBadge() {
        const unreadCount = this.state.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notificationCount');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    }
    
    /**
     * Mark all notifications as read
     */
    markAllAsRead() {
        this.state.notifications.forEach(n => n.read = true);
        this.updateNotificationBadge();
        this.toggleNotifications();
        this.showToast('success', 'تم', 'تم تعيين جميع الإشعارات كمقروءة');
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        if (window.innerWidth < 768) {
            document.getElementById('sidebar')?.classList.add('collapsed');
            this.state.sidebarCollapsed = true;
        }
    }
    
    /**
     * Handle before unload
     */
    handleBeforeUnload(e) {
        // Save data before leaving
        this.saveData();
        
        // Show confirmation if there are unsaved changes
        if (this.hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = 'لديك تغييرات غير محفوظة. هل تريد المغادرة؟';
        }
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + S: Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveData();
            this.showToast('success', 'تم الحفظ', 'تم حفظ جميع البيانات');
        }
        
        // Ctrl/Cmd + K: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('globalSearch')?.focus();
        }
        
        // Escape: Close modals/panels
        if (e.key === 'Escape') {
            this.hideSearchResults();
            document.getElementById('userMenu')?.classList.remove('show');
            document.getElementById('notificationPanel')?.classList.remove('show');
        }
    }
    
    /**
     * Check for unsaved changes
     */
    hasUnsavedChanges() {
        // Implementation depends on your data structure
        return false;
    }
    
    /**
     * Save data
     */
    async saveData() {
        try {
            // Save to IndexedDB
            await this.db.saveAll({
                doctors: this.state.doctors,
                patients: this.state.patients,
                appointments: this.state.appointments
            });
            
            // Save to localStorage as backup
            localStorage.setItem(`${this.config.storagePrefix}backup`, 
                JSON.stringify(this.state));
                
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }
    
    /**
     * Create backup
     */
    async saveBackup() {
        try {
            const data = {
                timestamp: new Date().toISOString(),
                version: this.config.version,
                data: this.state
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clinicpro-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showToast('success', 'تم النسخ الاحتياطي', 'تم حفظ نسخة احتياطية من جميع البيانات');
            
        } catch (error) {
            this.showToast('error', 'خطأ', 'فشل في إنشاء النسخة الاحتياطية');
        }
    }
    
    /**
     * Show help
     */
    showHelp() {
        this.ui.modal.show({
            title: 'مساعدة',
            content: `
                <h3>دليل الاستخدام السريع</h3>
                <p><strong>اختصارات لوحة المفاتيح:</strong></p>
                <ul>
                    <li><kbd>Ctrl/Cmd + S</kbd> - حفظ البيانات</li>
                    <li><kbd>Ctrl/Cmd + K</kbd> - البحث</li>
                    <li><kbd>Escape</kbd> - إغلاق النوافذ</li>
                </ul>
                <p><strong>إضافة موعد سريع:</strong></p>
                <p>استخدم زر "موعد سريع" في الشريط العلوي</p>
            `,
            size: 'md'
        });
    }
    
    /**
     * Close alert
     */
    closeAlert() {
        const banner = document.getElementById('alertBanner');
        if (banner) {
            banner.style.display = 'none';
        }
    }
    
    /**
     * Refresh dashboard
     */
    async refreshDashboard() {
        this.showLoading();
        await this.loadAppData();
        this.hideLoading();
        this.showToast('success', 'تم التحديث', 'تم تحديث جميع البيانات');
    }
    
    /**
     * Apply date range
     */
    applyDateRange() {
        this.showToast('info', 'تم التطبيق', 'تم تطبيق النطاق الزمني المحدد');
        this.updateCharts();
    }
    
    /**
     * Open new appointment modal
     */
    openNewAppointmentModal() {
        this.modules.appointments.showNewAppointmentModal();
    }
    
    /**
     * Confirm appointment
     */
    confirmAppointment(id) {
        this.modules.appointments.confirmAppointment(id);
    }
    
    /**
     * Reschedule appointment
     */
    rescheduleAppointment(id) {
        this.modules.appointments.rescheduleAppointment(id);
    }
    
    /**
     * Cancel appointment
     */
    cancelAppointment(id) {
        this.modules.appointments.cancelAppointment(id);
    }
    
    /**
     * View doctor
     */
    viewDoctor(id) {
        this.navigateTo('doctors');
        this.modules.doctors.viewDoctor(id);
    }
    
    /**
     * View patient
     */
    viewPatient(id) {
        this.navigateTo('patients');
        this.modules.patients.viewPatient(id);
    }
    
    /**
     * Quick add
     */
    quickAdd(type) {
        switch (type) {
            case 'appointment':
                this.openNewAppointmentModal();
                break;
            case 'patient':
                this.modules.patients.showNewPatientModal();
                break;
            case 'doctor':
                this.modules.doctors.showNewDoctorModal();
                break;
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ClinicProApp();
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful');
        }).catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    });
}
