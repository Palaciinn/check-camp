// app.js - Check&Camp PWA Logic

// --- Constants & Config ---
const SUPABASE_URL = 'https://crqzssldrpvabddfrosq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycXpzc2xkcnB2YWJkZGZyb3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDgwOTQsImV4cCI6MjA5MTIyNDA5NH0.p4JGIXuCt5nc3UYLZiC-b9QvzMwlbVjNaVOUUqA073w';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const LS_USER_KEY = 'checkandcamp_user';

// --- State ---
let usersList = [];
let selectedUser = null;
let isSettingPassword = false;
let rawItems = [];

const DEFAULT_PERSONAL_ITEMS = [
    "Bañador",
    "Gorra o sombrero",
    "Crema solar",
    "Productos de higiene",
    "Chanclas",
    "Zapatillas de deporte",
    "Cangrejeras/escarpines",
    "Ropa cómoda",
    "Toalla",
    "Bajera colchón",
    "Almohada"
];

// --- Database Logic (Auth Service) ---
const AuthDB = {
    async fetchUsers() {
        try {
            const { data, error } = await supabaseClient
                .from('app_users')
                .select('*');

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error fetching users:', err.message);
            return [];
        }
    },

    async setPassword(userId, password) {
        try {
            const { error } = await supabaseClient
                .from('app_users')
                .update({ password: password })
                .eq('id', userId);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Error updating password:', err.message);
            return false;
        }
    }
};

// --- Database Logic (Items Service) ---
const ItemsDB = {
    async fetchItems() {
        try {
            const { data, error } = await supabaseClient
                .from('camping_items')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error fetching items', err);
            return [];
        }
    },
    async addItem(name, priority, quantity, icon = '', claimed_by = null) {
        const inserts = [];
        for (let i = 0; i < quantity; i++) {
            inserts.push({ name, priority, icon, claimed_by });
        }
        try {
            const { error } = await supabaseClient
                .from('camping_items')
                .insert(inserts);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Add item err', err);
            return false;
        }
    },
    async claimItem(itemId, userId, currentClaim) {
        // Toggle logic requested: If already owned by user, set to null
        const newClaim = currentClaim === userId ? null : userId;
        try {
            const { error } = await supabaseClient
                .from('camping_items')
                .update({ claimed_by: newClaim })
                .eq('id', itemId);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Claim err', err);
            return false;
        }
    },
    async deleteItem(itemId) {
        try {
            const { error } = await supabaseClient
                .from('camping_items')
                .delete()
                .eq('id', itemId);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Del err', err);
            return false;
        }
    }
};

// --- UI Logic ---
const UI = {
    elements: {
        overlay: document.getElementById('login-overlay'),
        usersGrid: document.getElementById('users-grid'),
        passwordInput: document.getElementById('user-password'),
        loginBtn: document.getElementById('login-btn'),
        errorMsg: document.getElementById('login-error'),
        tabButtons: document.querySelectorAll('.tab-item'),
        sections: document.querySelectorAll('.tab-section'),
        addForm: document.getElementById('add-item-form'),
        itemsContainer: document.getElementById('items-container'),
        fabAdd: document.getElementById('fab-add'),
        addModalOverlay: document.getElementById('add-modal-overlay'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        passwordModal: document.getElementById('password-modal-overlay'),
        passwordSubtitle: document.getElementById('password-modal-subtitle'),
        backAvatarBtn: document.getElementById('back-avatar-btn'),
        forgotPasswordLink: document.getElementById('forgot-password-link'),
        userIntroVideo: document.getElementById('user-intro-video'),
        logoutBtn: document.getElementById('logout-btn'),
        backHomeBtn: document.getElementById('back-home-btn'),
        menuGeneralBtn: document.getElementById('menu-general-btn'),
        menuPersonalBtn: document.getElementById('menu-personal-btn'),
        menuAlbumBtn: document.getElementById('menu-album-btn'),
        menuPagosBtn: document.getElementById('menu-pagos-btn'),
        menuInstallBtn: document.getElementById('menu-install-btn'),
        progressBar: document.getElementById('progress-bar-container'),
        personalItemsContainer: document.getElementById('personal-items-container'),
        customAlertOverlay: document.getElementById('custom-alert-overlay'),
        customAlertMessage: document.getElementById('custom-alert-message'),
        customAlertBtn: document.getElementById('custom-alert-btn'),
        customConfirmOverlay: document.getElementById('custom-confirm-overlay'),
        customConfirmMessage: document.getElementById('custom-confirm-message'),
        customConfirmCancel: document.getElementById('custom-confirm-cancel'),
        customConfirmAccept: document.getElementById('custom-confirm-accept')
    },

    customAlert(message) {
        return new Promise((resolve) => {
            this.elements.customAlertMessage.textContent = message;
            this.elements.customAlertOverlay.classList.remove('hidden');

            const onAccept = () => {
                this.elements.customAlertBtn.removeEventListener('click', onAccept);
                this.elements.customAlertOverlay.classList.add('hidden');
                resolve();
            };

            this.elements.customAlertBtn.addEventListener('click', onAccept);
        });
    },

    customConfirm(message, cancelText = 'Cancelar', acceptText = 'Eliminar') {
        return new Promise((resolve) => {
            this.elements.customConfirmMessage.textContent = message;
            this.elements.customConfirmCancel.textContent = cancelText;
            this.elements.customConfirmAccept.textContent = acceptText;
            this.elements.customConfirmOverlay.classList.remove('hidden');

            const cleanup = () => {
                this.elements.customConfirmCancel.removeEventListener('click', onCancel);
                this.elements.customConfirmAccept.removeEventListener('click', onAccept);
                this.elements.customConfirmOverlay.classList.add('hidden');
            };

            const onCancel = () => { cleanup(); resolve(false); };
            const onAccept = () => { cleanup(); resolve(true); };

            this.elements.customConfirmCancel.addEventListener('click', onCancel);
            this.elements.customConfirmAccept.addEventListener('click', onAccept);
        });
    },

    async init() {
        // ALWAYS fetch users first so avatar resolution works globally
        let allUsers = await AuthDB.fetchUsers();
        usersList = allUsers.filter(u => u.name !== 'Usuario' && u.name !== 'User');

        // Custom sort order based on requested layout
        const customOrder = ['Angel', 'Lily', 'Andrada', 'Edurdo', 'Noe', 'Dani', 'Maria', 'Oscar', 'Marta', 'Michi'];
        usersList.sort((a, b) => {
            const nameA = a.name ? a.name.split(' ')[0] : '';
            const nameB = b.name ? b.name.split(' ')[0] : '';
            let idxA = customOrder.indexOf(nameA);
            let idxB = customOrder.indexOf(nameB);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            return idxA - idxB;
        });

        this.checkAuth();
        this.bindEvents();
        this.startCountdown();
    },

    bindEvents() {
        // Auth events
        this.elements.loginBtn.addEventListener('click', () => this.handleLoginClick());

        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        if (this.elements.menuGeneralBtn) {
            this.elements.menuGeneralBtn.addEventListener('click', () => this.showSubSection('section-list'));
        }

        if (this.elements.menuPersonalBtn) {
            this.elements.menuPersonalBtn.addEventListener('click', () => this.showSubSection('section-personallist'));
        }

        if (this.elements.menuAlbumBtn) {
            this.elements.menuAlbumBtn.addEventListener('click', () => this.showSubSection('section-construction'));
        }

        if (this.elements.menuPagosBtn) {
            this.elements.menuPagosBtn.addEventListener('click', () => this.showSubSection('section-construction'));
        }

        if (this.elements.menuInstallBtn) {
            this.elements.menuInstallBtn.addEventListener('click', () => this.showSubSection('section-install'));
        }

        if (this.elements.backHomeBtn) {
            this.elements.backHomeBtn.addEventListener('click', () => this.showHomeSection());
        }

        if (this.elements.backAvatarBtn) {
            this.elements.backAvatarBtn.addEventListener('click', () => {
                if (this.elements.passwordModal) this.elements.passwordModal.classList.add('hidden');

                if (this.elements.userIntroVideo) {
                    this.elements.userIntroVideo.pause();
                    this.elements.userIntroVideo.src = '';
                    this.elements.userIntroVideo.style.display = 'none';
                }

                document.getElementById('password-modal-title').style.display = 'none';
                this.elements.passwordSubtitle.style.display = 'none';
                this.elements.passwordInput.style.display = 'none';
                this.elements.loginBtn.style.display = 'none';
                if (this.elements.forgotPasswordLink) this.elements.forgotPasswordLink.style.display = 'none';

                this.elements.passwordInput.value = '';
                const allAvatars = this.elements.usersGrid.querySelectorAll('.user-avatar-btn');
                allAvatars.forEach(b => b.classList.remove('selected'));
                this.elements.errorMsg.style.display = 'none';
            });
        }

        // Hide error when typing
        this.elements.passwordInput.addEventListener('input', () => {
            this.elements.errorMsg.style.display = 'none';
        });

        // Navigation events
        this.elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });

        // Inventory events
        if (this.elements.addForm) {
            this.elements.addForm.addEventListener('submit', (e) => this.handleAddItem(e));
        }

        // Modal Events
        if (this.elements.fabAdd) {
            this.elements.fabAdd.addEventListener('click', () => {
                const isPersonal = document.getElementById('section-personallist').classList.contains('active');
                
                const priorityWrapper = document.getElementById('custom-priority-wrapper');
                if (priorityWrapper) {
                    priorityWrapper.style.display = isPersonal ? 'none' : 'block';
                }
                
                this.elements.addForm.setAttribute('data-personal', isPersonal);
                
                if (this.elements.addModalOverlay) {
                    this.elements.addModalOverlay.classList.remove('hidden');
                    setTimeout(() => document.getElementById('item-name').focus(), 50);
                }
            });
        }
        
        const customSelectTrigger = document.getElementById('custom-priority-trigger');
        const customSelectOptions = document.getElementById('custom-priority-options');
        const priorityHiddenInput = document.getElementById('item-priority');
        
        if (customSelectTrigger && customSelectOptions) {
            customSelectTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                customSelectOptions.classList.toggle('hidden');
            });
            
            document.querySelectorAll('.custom-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const value = option.getAttribute('data-value');
                    if(priorityHiddenInput) priorityHiddenInput.value = value;
                    
                    const cloneTag = option.querySelector('.mypack-tag').cloneNode(true);
                    customSelectTrigger.innerHTML = '';
                    customSelectTrigger.appendChild(cloneTag);
                    
                    const arrow = document.createElement('span');
                    arrow.className = 'material-symbols-rounded';
                    arrow.textContent = 'arrow_drop_down';
                    customSelectTrigger.appendChild(arrow);
                    
                    customSelectOptions.classList.add('hidden');
                });
            });
            
            document.addEventListener('click', (e) => {
                if (!customSelectTrigger.contains(e.target) && !customSelectOptions.contains(e.target)) {
                    customSelectOptions.classList.add('hidden');
                }
            });
        }

        if (this.elements.closeModalBtn) {
            this.elements.closeModalBtn.addEventListener('click', () => {
                this.elements.addModalOverlay.classList.add('hidden');
            });
        }

        if (this.elements.addModalOverlay) {
            this.elements.addModalOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.addModalOverlay) {
                    this.elements.addModalOverlay.classList.add('hidden');
                }
            });
        }
    },

    startCountdown() {
        const targetDate = new Date('2026-07-17T00:00:00').getTime();
        const elDays = document.getElementById('cd-days');
        const elHours = document.getElementById('cd-hours');
        const elMins = document.getElementById('cd-mins');
        const elSecs = document.getElementById('cd-secs');
        
        if (!elDays) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                elDays.textContent = '00';
                elHours.textContent = '00';
                elMins.textContent = '00';
                elSecs.textContent = '00';
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            elDays.textContent = days.toString().padStart(2, '0');
            elHours.textContent = hours.toString().padStart(2, '0');
            elMins.textContent = minutes.toString().padStart(2, '0');
            elSecs.textContent = seconds.toString().padStart(2, '0');
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    },

    checkAuth() {
        const storedUser = localStorage.getItem(LS_USER_KEY);
        if (storedUser) {
            selectedUser = JSON.parse(storedUser);
            this.hideOverlay();
        } else {
            this.renderUsersGrid();
        }
    },

    renderUsersGrid() {
        this.elements.usersGrid.innerHTML = '';

        usersList.forEach(user => {
            const btn = document.createElement('button');
            btn.className = 'user-avatar-btn';

            const circle = document.createElement('div');
            circle.className = 'user-avatar-circle';

            const firstName = user.name ? user.name.split(' ')[0] : 'User';
            const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';

            const img = document.createElement('img');
            img.className = 'user-avatar-img';
            img.src = `avatars/Avatar${firstName}.png`;
            img.alt = user.name;

            img.onerror = () => {
                img.style.display = 'none';
                circle.textContent = initial;
            };

            circle.appendChild(img);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'user-avatar-name';
            nameSpan.textContent = firstName;

            btn.appendChild(circle);
            btn.appendChild(nameSpan);

            btn.addEventListener('click', () => this.handleAvatarClick(user.id, btn));
            this.elements.usersGrid.appendChild(btn);
        });
    },

    handleAvatarClick(userId, btnElement) {
        // Manage selected visual state
        const allAvatars = this.elements.usersGrid.querySelectorAll('.user-avatar-btn');
        allAvatars.forEach(b => b.classList.remove('selected'));
        btnElement.classList.add('selected');

        selectedUser = usersList.find(u => u.id == userId);
        this.elements.errorMsg.style.display = 'none';

        if (this.elements.passwordModal) {
            this.elements.passwordModal.classList.remove('hidden');
            this.elements.passwordSubtitle.textContent = `Para ${selectedUser.name.split(' ')[0]}`;
        }

        document.getElementById('password-modal-title').style.display = 'none';
        this.elements.passwordSubtitle.style.display = 'none';
        this.elements.passwordInput.style.display = 'none';
        this.elements.loginBtn.style.display = 'none';
        if (this.elements.forgotPasswordLink) this.elements.forgotPasswordLink.style.display = 'none';
        this.elements.passwordInput.value = '';

        if (this.elements.userIntroVideo) {
            const videoSrc = `videos/Video${selectedUser.name.split(' ')[0]}.mp4`;
            this.elements.userIntroVideo.src = videoSrc;
            this.elements.userIntroVideo.style.display = 'block';

            this.elements.userIntroVideo.play().catch(e => console.log('Autoplay bloqueado', e));
        }

        const title = document.getElementById('password-modal-title');
        title.style.display = 'block';
        title.classList.add('fade-in-form');

        this.elements.passwordSubtitle.style.display = 'block';
        this.elements.passwordSubtitle.classList.add('fade-in-form');

        this.elements.passwordInput.style.display = 'block';
        this.elements.passwordInput.classList.add('fade-in-form');

        this.elements.loginBtn.style.display = 'block';
        this.elements.loginBtn.classList.add('fade-in-form');

        if (selectedUser.password && this.elements.forgotPasswordLink) {
            this.elements.forgotPasswordLink.style.display = 'block';
            this.elements.forgotPasswordLink.classList.add('fade-in-form');
        }

        setTimeout(() => this.elements.passwordInput.focus(), 50);

        // Check password stat and update UI
        if (!selectedUser.password) {
            isSettingPassword = true;
            this.elements.passwordInput.placeholder = 'Crea una contraseña';
            this.elements.loginBtn.textContent = 'Guardar y Entrar';
        } else {
            isSettingPassword = false;
            this.elements.passwordInput.placeholder = 'Tu contraseña';
            this.elements.loginBtn.textContent = 'Entrar';
        }
    },

    async handleLoginClick() {
        if (!selectedUser) return;

        const enteredPassword = this.elements.passwordInput.value.trim();
        this.elements.errorMsg.style.display = 'none';

        if (isSettingPassword) {
            // Saving new password
            if (enteredPassword.length < 3) {
                this.showError('La contraseña es muy corta');
                return;
            }
            this.elements.loginBtn.textContent = 'Guardando...';
            this.elements.loginBtn.disabled = true;

            const success = await AuthDB.setPassword(selectedUser.id, enteredPassword);
            if (success) {
                selectedUser.password = enteredPassword; // Update local list
                this.loginSuccess();
            } else {
                this.showError('Error al guardar en el servidor');
                this.elements.loginBtn.textContent = 'Guardar y Entrar';
                this.elements.loginBtn.disabled = false;
            }
        } else {
            // Validating existing password
            if (enteredPassword === selectedUser.password) {
                this.loginSuccess();
            } else {
                this.showError('Contraseña incorrecta');
            }
        }
    },

    showError(msg) {
        this.elements.errorMsg.textContent = msg;
        this.elements.errorMsg.style.display = 'block';
    },

    loginSuccess() {
        localStorage.setItem(LS_USER_KEY, JSON.stringify({ id: selectedUser.id, name: selectedUser.name }));
        this.hideOverlay();
    },

    hideOverlay() {
        this.elements.overlay.classList.add('hidden');
        if (this.elements.passwordModal) {
            this.elements.passwordModal.classList.add('hidden');

            if (this.elements.userIntroVideo) {
                this.elements.userIntroVideo.pause();
                this.elements.userIntroVideo.src = '';
                this.elements.userIntroVideo.style.display = 'none';
            }

            document.getElementById('password-modal-title').style.display = 'none';
            this.elements.passwordSubtitle.style.display = 'none';
            this.elements.passwordInput.style.display = 'none';
            this.elements.loginBtn.style.display = 'none';
            if (this.elements.forgotPasswordLink) this.elements.forgotPasswordLink.style.display = 'none';
        }
        this.loadItems();
    },

    handleLogout() {
        // Clear local storage and state
        localStorage.removeItem(LS_USER_KEY);
        selectedUser = null;

        // Show login overlay and re-render grid
        this.elements.overlay.classList.remove('hidden');
        this.renderUsersGrid();

        // Reset tabs to default (Home view)
        this.elements.tabButtons.forEach(btn => btn.classList.remove('active'));
        if (this.elements.tabButtons[0]) this.elements.tabButtons[0].classList.add('active');

        this.elements.sections.forEach(sec => sec.classList.remove('active'));
        const defaultSection = document.getElementById('section-home');
        if (defaultSection) defaultSection.classList.add('active');
        if (this.elements.backHomeBtn) this.elements.backHomeBtn.style.display = 'none';
        if (this.elements.fabAdd) this.elements.fabAdd.style.display = 'none';
        if (this.elements.progressBar) this.elements.progressBar.style.display = 'none';
    },

    // --- Inventory System ---

    async loadItems() {
        let allItems = await ItemsDB.fetchItems();

        rawItems = allItems.filter(item => item.priority !== 'Personal');
        const dbPersonalItems = allItems.filter(item => item.priority === 'Personal' && item.claimed_by === selectedUser?.id);
        
        const defaultPersonalItems = selectedUser ? DEFAULT_PERSONAL_ITEMS.map((name, index) => ({
            id: `default_${index}_${selectedUser.id}`,
            name: name,
            priority: 'Personal',
            claimed_by: selectedUser.id,
            is_default: true,
            qty: 1
        })) : [];

        const personalItems = [...defaultPersonalItems, ...dbPersonalItems];

        // Sorting logic based on priority and name
        const priorityWeight = { 'Essential': 1, 'Extra': 2, 'Others': 3 };

        rawItems.sort((a, b) => {
            const weightA = priorityWeight[a.priority] || 3;
            const weightB = priorityWeight[b.priority] || 3;
            if (weightA !== weightB) {
                return weightA - weightB;
            }

            // Alphabetical tie breaker
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;

            // Deterministic exact tie breaker to stop shifting on reload
            if (a.id < b.id) return -1;
            if (a.id > b.id) return 1;

            return 0;
        });

        this.renderItems();
        this.updateProgressBar();
        this.renderPersonalList(personalItems);
        this.renderMyPack(personalItems);
    },

    updateProgressBar() {
        const essentials = rawItems.filter(item => item.priority === 'Essential');
        const fill = document.getElementById('progress-fill');
        if (!fill) return;

        if (essentials.length === 0) {
            fill.style.width = '0%';
            const textElement = document.getElementById('progress-text');
            if (textElement) textElement.textContent = `0%`;
            return;
        }

        const claimed = essentials.filter(item => item.claimed_by !== null).length;
        const percentage = Math.round((claimed / essentials.length) * 100);

        fill.style.width = `${percentage}%`;
        const textElement = document.getElementById('progress-text');
        if (textElement) textElement.textContent = `${percentage}%`;

        if (percentage <= 30) {
            fill.style.backgroundColor = 'var(--alert)';
        } else if (percentage <= 60) {
            fill.style.backgroundColor = 'var(--accent-orange)';
        } else if (percentage <= 90) {
            fill.style.backgroundColor = 'var(--primary)';
        } else {
            fill.style.backgroundColor = 'var(--accent-yellow)';
        }
    },

    renderPersonalList(personalItems = []) {
        const container = this.elements.personalItemsContainer;
        if (!container) return;

        // --- Preserve Expanded Accordeons ---
        const expandedNames = new Set();
        const existingHeaders = container.querySelectorAll('.mypack-item.accordion-header');
        existingHeaders.forEach(header => {
            const content = header.nextElementSibling;
            if (content && content.classList.contains('expanded')) {
                const nameSpan = header.querySelector('.mypack-name');
                if (nameSpan) {
                    const baseName = nameSpan.textContent.split(' (')[0];
                    expandedNames.add(baseName);
                }
            }
        });

        container.innerHTML = '';

        if (!selectedUser) return;

        if (personalItems.length === 0) {
            container.innerHTML = '<p class="placeholder-text">Aún no tienes elementos en tu lista personal. Pulsa el botón + para añadir.</p>';
            return;
        }

        // Group by name
        const groupsMap = new Map();
        personalItems.forEach(item => {
            const nameKey = item.name.trim().toLowerCase();
            if (!groupsMap.has(nameKey)) groupsMap.set(nameKey, []);
            groupsMap.get(nameKey).push(item);
        });

        for (let [key, items] of groupsMap) {
            const originalName = items[0].name;

            if (items.length === 1) {
                const cell = this.createMyPackCell(items[0]);
                container.appendChild(cell);
            } else {
                const accordContainer = document.createElement('div');
                
                const wrapper = document.createElement('div');
                wrapper.className = 'swipe-wrapper';

                const bgUnclaimLeft = document.createElement('div');
                bgUnclaimLeft.className = 'swipe-bg swipe-bg-delete';
                bgUnclaimLeft.innerHTML = `<span class="material-symbols-rounded" style="opacity:0; transform:scale(0.5); transition: none;">delete</span>`;
                const bgUnclaimRight = document.createElement('div');
                bgUnclaimRight.className = 'swipe-bg swipe-bg-delete';
                bgUnclaimRight.innerHTML = `<span class="material-symbols-rounded" style="opacity:0; transform:scale(0.5); transition: none;">delete</span>`;

                const header = document.createElement('div');
                header.className = 'mypack-item accordion-header';
                const info = document.createElement('div');
                info.className = 'mypack-info';

                info.innerHTML = `<span class="mypack-name">${originalName} (x${items.length})</span><span class="mypack-tag personal">Personal</span>`;

                const chevron = document.createElement('span');
                chevron.className = 'material-symbols-rounded';
                chevron.textContent = 'expand_more';
                chevron.style.color = 'var(--text-color)';
                chevron.style.opacity = '0.5';

                header.appendChild(info);
                header.appendChild(chevron);
                
                let elementToAppend = header;
                const isGroupDefault = items.some(i => i.is_default);
                
                if (!isGroupDefault) {
                    wrapper.appendChild(bgUnclaimLeft);
                    wrapper.appendChild(bgUnclaimRight);
                    wrapper.appendChild(header);
                    this.addSwipeListeners(header, items, 'personal');
                    elementToAppend = wrapper;
                }

                const content = document.createElement('div');
                content.className = 'accordion-content';

                if (expandedNames.has(originalName)) {
                    content.classList.add('expanded');
                    chevron.textContent = 'expand_less';
                }

                items.forEach((item, index) => {
                    const subItem = { ...item, name: `${item.name} #${index + 1}` };
                    content.appendChild(this.createMyPackCell(subItem, true));
                });

                let wasSwipingFlag = false;
                header.addEventListener('touchstart', () => wasSwipingFlag = false, { passive: true });
                header.addEventListener('touchmove', (e) => {
                    if (header.classList.contains('swiping')) wasSwipingFlag = true;
                }, { passive: true });
                header.addEventListener('click', (e) => {
                    if (wasSwipingFlag || header.classList.contains('swiping') || (header.style.transform !== '' && header.style.transform !== 'translateX(0px)')) return;
                    content.classList.toggle('expanded');
                    chevron.textContent = content.classList.contains('expanded') ? 'expand_less' : 'expand_more';
                });

                accordContainer.appendChild(elementToAppend);
                accordContainer.appendChild(content);
                container.appendChild(accordContainer);
            }
        }
    },

    renderMyPack(personalItems = []) {
        const container = document.getElementById('mypack-list');
        if (!container) return;

        // --- Preserve Expanded Accordeons ---
        const expandedNames = new Set();
        const existingHeaders = container.querySelectorAll('.mypack-item.accordion-header');
        existingHeaders.forEach(header => {
            const content = header.nextElementSibling;
            if (content && content.classList.contains('expanded')) {
                const nameSpan = header.querySelector('.mypack-name');
                if (nameSpan) {
                    const baseName = nameSpan.textContent.split(' (')[0];
                    expandedNames.add(baseName);
                }
            }
        });

        container.innerHTML = '';

        if (!selectedUser) return;

        const generalClaimed = rawItems.filter(item => item.claimed_by === selectedUser.id);
        
        if (generalClaimed.length === 0 && personalItems.length === 0) {
            container.innerHTML = '<p class="placeholder-text">Aún no tienes elementos asignados que llevar.</p>';
            return;
        }

        this.createMainAccordion('Lista General', generalClaimed, expandedNames, container);
        this.createMainAccordion('Lista Personal', personalItems, expandedNames, container);
    },

    createMainAccordion(title, items, expandedNames, container) {
        if (items.length === 0) return;

        const header = document.createElement('div');
        header.className = 'mypack-item accordion-header';
        header.style.backgroundColor = 'var(--background-color)';
        header.style.border = '1px solid var(--border-color)';
        header.style.borderRadius = '12px';
        header.style.marginBottom = '8px';

        const info = document.createElement('div');
        info.className = 'mypack-info';
        info.innerHTML = `<span class="mypack-name" style="font-weight: 700; font-size: 16px;">${title} (${items.length})</span>`;

        const chevron = document.createElement('span');
        chevron.className = 'material-symbols-rounded';
        chevron.textContent = expandedNames.has(title) ? 'expand_less' : 'expand_more';
        chevron.style.color = 'var(--text-color)';
        chevron.style.opacity = '0.5';

        header.appendChild(info);
        header.appendChild(chevron);

        const content = document.createElement('div');
        content.className = 'accordion-content';
        if (expandedNames.has(title)) {
            content.classList.add('expanded');
        }

        header.addEventListener('click', () => {
            content.classList.toggle('expanded');
            chevron.textContent = content.classList.contains('expanded') ? 'expand_less' : 'expand_more';
        });

        container.appendChild(header);
        container.appendChild(content);

        this.renderMyPackItems(items, expandedNames, content);
    },

    renderMyPackItems(myItems, expandedNames, container) {
        // Group by name while preserving sorted order
        const groupsMap = new Map();
        myItems.forEach(item => {
            const nameKey = item.name.trim().toLowerCase();
            if (!groupsMap.has(nameKey)) groupsMap.set(nameKey, []);
            groupsMap.get(nameKey).push(item);
        });

        // Loop over grouped items
        for (let [key, items] of groupsMap) {
            const originalName = items[0].name;

            if (items.length === 1) {
                // simple card with checkbox
                const cell = this.createMyPackCell(items[0]);
                container.appendChild(cell);
            } else {
                // Accordion logic for multiples
                const accordContainer = document.createElement('div');
                
                const wrapper = document.createElement('div');
                wrapper.className = 'swipe-wrapper';
                
                const isPersonal = items[0].priority === 'Personal';
                const bgUnclaimLeft = document.createElement('div');
                bgUnclaimLeft.className = isPersonal ? 'swipe-bg swipe-bg-delete' : 'swipe-bg swipe-bg-unclaim-left';
                bgUnclaimLeft.innerHTML = `<span class="material-symbols-rounded" style="opacity:0; transform:scale(0.5); transition: none;">${isPersonal ? 'delete' : 'remove_circle'}</span>`;

                const bgUnclaimRight = document.createElement('div');
                bgUnclaimRight.className = isPersonal ? 'swipe-bg swipe-bg-delete' : 'swipe-bg swipe-bg-unclaim-right';
                bgUnclaimRight.innerHTML = `<span class="material-symbols-rounded" style="opacity:0; transform:scale(0.5); transition: none;">${isPersonal ? 'delete' : 'remove_circle'}</span>`;

                const header = document.createElement('div');
                header.className = 'mypack-item accordion-header';

                const info = document.createElement('div');
                info.className = 'mypack-info';

                const pClass = items[0].priority ? items[0].priority.toLowerCase() : 'others';
                let tagText = 'Otros';
                if (pClass === 'essential') tagText = 'Esencial';
                if (pClass === 'extra') tagText = 'Extra';

                info.innerHTML = `<span class="mypack-name">${originalName} (x${items.length})</span><span class="mypack-tag ${pClass}">${tagText}</span>`;

                const chevron = document.createElement('span');
                chevron.className = 'material-symbols-rounded';
                chevron.textContent = 'expand_more';
                chevron.style.color = 'var(--text-color)';
                chevron.style.opacity = '0.5';

                header.appendChild(info);
                header.appendChild(chevron);
                
                let elementToAppend = header;
                const isGroupDefault = items.some(i => i.is_default);
                
                if (!isGroupDefault) {
                    wrapper.appendChild(bgUnclaimLeft);
                    wrapper.appendChild(bgUnclaimRight);
                    wrapper.appendChild(header);
                    this.addSwipeListeners(header, items, 'mypack');
                    elementToAppend = wrapper;
                }

                const content = document.createElement('div');
                content.className = 'accordion-content';

                if (expandedNames.has(originalName)) {
                    content.classList.add('expanded');
                    chevron.textContent = 'expand_less';
                }

                items.forEach((item, index) => {
                    const subItem = { ...item, name: `${item.name} #${index + 1}` };
                    content.appendChild(this.createMyPackCell(subItem, true));
                });

                let wasSwipingFlag = false;
                header.addEventListener('touchstart', () => wasSwipingFlag = false, { passive: true });
                header.addEventListener('touchmove', (e) => {
                    if (header.classList.contains('swiping')) wasSwipingFlag = true;
                }, { passive: true });
                header.addEventListener('click', (e) => {
                    if (wasSwipingFlag || header.classList.contains('swiping') || (header.style.transform !== '' && header.style.transform !== 'translateX(0px)')) return;
                    content.classList.toggle('expanded');
                    chevron.textContent = content.classList.contains('expanded') ? 'expand_less' : 'expand_more';
                });

                accordContainer.appendChild(elementToAppend);
                accordContainer.appendChild(content);
                container.appendChild(accordContainer);
            }
        }
    },

    addSwipeListeners(cardElement, itemData, currentView) {
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let isSwiping = false;

        cardElement.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            currentX = startX;
            isSwiping = false;
        }, { passive: true });

        cardElement.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
            let currentY = e.touches[0].clientY;
            let deltaX = currentX - startX;
            let deltaY = Math.abs(currentY - startY);

            if (!isSwiping && deltaY > Math.abs(deltaX)) {
                return; // Let native vertical scroll happen
            }

            // Consider it a swipe if moved horizontally more than a tiny threshold
            if (Math.abs(deltaX) > 10) {
                isSwiping = true;
                cardElement.classList.add('swiping');
                cardElement.style.transform = `translateX(${deltaX}px)`;

                // Visual feedback icon scale
                const wrapper = cardElement.parentElement;
                if (wrapper && wrapper.classList.contains('swipe-wrapper')) {
                    const bgLeft = wrapper.querySelector('.swipe-bg:first-child');
                    const bgRight = wrapper.querySelector('.swipe-bg:nth-child(2)');

                    if (deltaX > 0) { // Right swipe
                        if (bgLeft) bgLeft.style.zIndex = '1';
                        if (bgRight) bgRight.style.zIndex = '0';

                        const iconLeft = bgLeft?.querySelector('.material-symbols-rounded');
                        if (iconLeft) {
                            iconLeft.style.transform = `scale(${Math.min(1.2, deltaX / 60)})`;
                            iconLeft.style.opacity = Math.min(1, deltaX / 40);
                        }
                    } else { // Left swipe
                        if (bgLeft) bgLeft.style.zIndex = '0';
                        if (bgRight) bgRight.style.zIndex = '1';

                        const iconRight = bgRight?.querySelector('.material-symbols-rounded');
                        if (iconRight) {
                            iconRight.style.transform = `scale(${Math.min(1.2, Math.abs(deltaX) / 60)})`;
                            iconRight.style.opacity = Math.min(1, Math.abs(deltaX) / 40);
                        }
                    }
                }
            }
        }, { passive: true });

        cardElement.addEventListener('touchend', async (e) => {
            if (!isSwiping) return; // If tap, abort swipe logic

            isSwiping = false;
            cardElement.classList.remove('swiping');

            const deltaX = currentX - startX;
            const items = Array.isArray(itemData) ? itemData : [itemData];
            const isGroup = Array.isArray(itemData);
            const firstName = items[0].name.split(' (')[0].trim();

            // Deslizar hacia la izquierda (<-)
            if (deltaX < -80) {
                if (currentView === 'list') {
                    const msg = isGroup ? `¿Seguro que quieres borrar TODOS los artículos de "${firstName}" de la lista general?` : `¿Seguro que quieres borrar "${items[0].name}" de la lista general?`;
                    if (await UI.customConfirm(msg)) {
                        for (let it of items) {
                            await ItemsDB.deleteItem(it.id);
                        }
                        await this.loadItems();
                        return;
                    }
                } else if (currentView === 'mypack' || currentView === 'personal') {
                    if (items[0].priority === 'Personal') {
                        const msg = isGroup ? `¿Seguro que quieres borrar TODOS los artículos de "${firstName}" de tu lista personal?` : `¿Seguro que quieres borrar "${items[0].name}" de tu lista personal?`;
                        if (await UI.customConfirm(msg)) {
                            for (let it of items) {
                                await ItemsDB.deleteItem(it.id);
                            }
                            await this.loadItems();
                            return;
                        }
                    } else {
                        for (let it of items) {
                            await ItemsDB.claimItem(it.id, selectedUser.id, selectedUser.id);
                        }
                        await this.loadItems();
                        return;
                    }
                }
            }
            // Deslizar hacia la derecha (->)
            else if (deltaX > 80) {
                if (items[0].priority === 'Personal') {
                    // Do nothing for personal items on right swipe, left swipe is for delete
                } else {
                    for (let it of items) {
                        await ItemsDB.claimItem(it.id, selectedUser.id, it.claimed_by);
                    }
                    await this.loadItems();
                    return;
                }
            }

            cardElement.style.transform = 'translateX(0)';
        });
    },

    createMyPackCell(item, isChild = false) {
        const cell = document.createElement('div');
        cell.className = 'mypack-item';
        if (isChild) {
            cell.style.boxShadow = 'none';
            cell.style.border = '1px solid var(--border-color)';
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'mypack-checkbox';

        // Personal check state in local storage
        const lsKey = `checkandcamp_checked_${item.id}`;
        checkbox.checked = localStorage.getItem(lsKey) === 'true';

        checkbox.addEventListener('change', () => {
            localStorage.setItem(lsKey, checkbox.checked);
        });

        const info = document.createElement('div');
        info.className = 'mypack-info';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'mypack-name';
        nameSpan.textContent = item.name;

        const tag = document.createElement('span');
        const pClass = item.priority ? item.priority.toLowerCase() : 'others';
        tag.className = `mypack-tag ${pClass}`;

        let tagText = 'Otros';
        if (pClass === 'essential') tagText = 'Esencial';
        if (pClass === 'extra') tagText = 'Extra';
        if (pClass === 'personal') {
            tagText = 'Personal';
        }

        tag.textContent = tagText;

        info.appendChild(nameSpan);
        info.appendChild(tag);

        const wrapper = document.createElement('div');
        wrapper.className = `swipe-wrapper ${isChild ? 'is-child' : ''}`;

        const isPersonal = item.priority === 'Personal';

        const bgUnclaimLeft = document.createElement('div');
        bgUnclaimLeft.className = isPersonal ? 'swipe-bg swipe-bg-delete' : 'swipe-bg swipe-bg-unclaim-left';
        bgUnclaimLeft.innerHTML = `<span class="material-symbols-rounded" style="opacity:0; transform:scale(0.5); transition: none;">${isPersonal ? 'delete' : 'remove_circle'}</span>`;

        const bgUnclaimRight = document.createElement('div');
        bgUnclaimRight.className = isPersonal ? 'swipe-bg swipe-bg-delete' : 'swipe-bg swipe-bg-unclaim-right';
        bgUnclaimRight.innerHTML = `<span class="material-symbols-rounded" style="opacity:0; transform:scale(0.5); transition: none;">${isPersonal ? 'delete' : 'remove_circle'}</span>`;

        cell.appendChild(checkbox);
        cell.appendChild(info);
        
        if (!item.is_default) {
            wrapper.appendChild(bgUnclaimLeft);
            wrapper.appendChild(bgUnclaimRight);
            wrapper.appendChild(cell);
            this.addSwipeListeners(cell, item, 'mypack');
            return wrapper;
        }

        return cell;
    },

    renderItems() {
        const container = this.elements.itemsContainer;

        // --- Preserve Expanded Accordeons ---
        const expandedNames = new Set();
        const existingHeaders = container.querySelectorAll('.item-cell.accordion-header');
        existingHeaders.forEach(header => {
            const content = header.nextElementSibling;
            if (content && content.classList.contains('expanded')) {
                const nameSpan = header.querySelector('.item-name');
                if (nameSpan) {
                    const baseName = nameSpan.textContent.split(' (')[0];
                    expandedNames.add(baseName);
                }
            }
        });

        container.innerHTML = '';
        if (!rawItems.length) {
            container.innerHTML = '<p class="placeholder-text">Aún no hay elementos añadidos a la lista general.</p>';
            return;
        }

        // Group by name preserving sorted order
        const groupsMap = new Map();
        rawItems.forEach(item => {
            const nameKey = item.name.trim().toLowerCase();
            if (!groupsMap.has(nameKey)) groupsMap.set(nameKey, []);
            groupsMap.get(nameKey).push(item);
        });

        // Loop over grouped items
        for (let [key, items] of groupsMap) {
            const originalName = items[0].name;

            if (items.length === 1) {
                // simple card
                const cell = this.createItemCell(items[0]);
                container.appendChild(cell);
            } else {
                // Accordion logic for multiples
                const claimedCount = items.filter(i => i.claimed_by).length;

                const accordContainer = document.createElement('div');
                
                const wrapper = document.createElement('div');
                wrapper.className = 'swipe-wrapper';

                const bgClaim = document.createElement('div');
                bgClaim.className = 'swipe-bg swipe-bg-claim';
                bgClaim.innerHTML = '<span class="material-symbols-rounded" style="opacity:0; transform:scale(0.5); transition: none;">check_circle</span>';

                const bgDelete = document.createElement('div');
                bgDelete.className = 'swipe-bg swipe-bg-delete';
                bgDelete.innerHTML = '<span class="material-symbols-rounded" style="opacity:0; transform:scale(0.5); transition: none;">delete</span>';

                const header = document.createElement('div');
                header.className = 'item-cell accordion-header';

                const info = document.createElement('div');
                info.className = 'item-info';

                const priorityClass = items[0].priority ? items[0].priority.toLowerCase() : 'others';
                let tagText = 'Otros';
                if (priorityClass === 'essential') tagText = 'Esencial';
                if (priorityClass === 'extra') tagText = 'Extra';
                info.innerHTML = `<span class="mypack-tag ${priorityClass}">${tagText}</span><span class="item-name">${originalName} (${claimedCount}/${items.length})</span>`;

                const chevron = document.createElement('span');
                chevron.className = 'material-symbols-rounded';
                chevron.textContent = 'expand_more';
                chevron.style.color = 'var(--text-color)';
                chevron.style.opacity = '0.5';

                header.appendChild(info);
                header.appendChild(chevron);
                
                wrapper.appendChild(bgClaim);
                wrapper.appendChild(bgDelete);
                wrapper.appendChild(header);

                this.addSwipeListeners(header, items, 'list');

                const content = document.createElement('div');
                content.className = 'accordion-content';

                if (expandedNames.has(originalName)) {
                    content.classList.add('expanded');
                    chevron.textContent = 'expand_less';
                }

                items.forEach((item, index) => {
                    const subItem = { ...item, name: `${item.name} #${index + 1}` };
                    content.appendChild(this.createItemCell(subItem, true));
                });

                let wasSwipingFlag = false;
                header.addEventListener('touchstart', () => wasSwipingFlag = false, { passive: true });
                header.addEventListener('touchmove', (e) => {
                    if (header.classList.contains('swiping')) wasSwipingFlag = true;
                }, { passive: true });
                header.addEventListener('click', (e) => {
                    if (wasSwipingFlag || header.classList.contains('swiping')) return;
                    content.classList.toggle('expanded');
                    chevron.textContent = content.classList.contains('expanded') ? 'expand_less' : 'expand_more';
                });

                accordContainer.appendChild(wrapper);
                accordContainer.appendChild(content);
                container.appendChild(accordContainer);
            }
        }
    },

    createItemCell(item, isChild = false) {
        const cell = document.createElement('div');
        cell.className = 'item-cell';
        if (isChild) {
            cell.style.boxShadow = 'none';
            cell.style.border = '1px solid var(--border-color)';
        }

        const info = document.createElement('div');
        info.className = 'item-info';
        const priorityClass = item.priority ? item.priority.toLowerCase() : 'others';
        let tagText = 'Otros';
        if (priorityClass === 'essential') tagText = 'Esencial';
        if (priorityClass === 'extra') tagText = 'Extra';

        info.innerHTML = `<span class="mypack-tag ${priorityClass}">${tagText}</span><span class="item-name">${item.name}</span>`;

        const btn = document.createElement('button');
        btn.className = 'claim-btn';

        let claimingUser = null;
        if (item.claimed_by) {
            claimingUser = usersList.find(u => u.id === item.claimed_by);
        }

        if (claimingUser) {
            btn.style.border = 'none';
            const firstName = claimingUser.name.split(' ')[0];
            const img = document.createElement('img');
            img.src = `avatars/Avatar${firstName}.png`;
            img.alt = firstName;
            img.onerror = () => {
                img.style.display = 'none';
                btn.textContent = firstName.charAt(0);
                btn.style.border = '2px solid var(--primary)';
            };
            btn.appendChild(img);
        } else {
            btn.textContent = '+';
        }

        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!selectedUser) return;
            const success = await ItemsDB.claimItem(item.id, selectedUser.id, item.claimed_by);
            if (success) {
                await this.loadItems();
            }
        });

        const wrapper = document.createElement('div');
        wrapper.className = `swipe-wrapper ${isChild ? 'is-child' : ''}`;

        const claimIconName = (item.claimed_by === selectedUser?.id) ? 'remove_circle' : 'add_circle';

        const bgClaim = document.createElement('div');
        bgClaim.className = 'swipe-bg swipe-bg-claim';
        bgClaim.innerHTML = '<span class="material-symbols-rounded" style="opacity:0; transform:scale(0.5); transition: none;">' + claimIconName + '</span>';

        const bgDelete = document.createElement('div');
        bgDelete.className = 'swipe-bg swipe-bg-delete';
        bgDelete.innerHTML = '<span class="material-symbols-rounded" style="opacity:0; transform:scale(0.5); transition: none;">delete</span>';

        cell.appendChild(info);
        cell.appendChild(btn);

        wrapper.appendChild(bgClaim);
        wrapper.appendChild(bgDelete);
        wrapper.appendChild(cell);

        this.addSwipeListeners(cell, item, 'list');
        return wrapper;
    },

    async handleAddItem(e) {
        e.preventDefault();
        const nameInput = document.getElementById('item-name');
        const priorityInput = document.getElementById('item-priority');
        const qtyInput = document.getElementById('item-quantity');

        const name = nameInput.value.trim();
        const isPersonal = this.elements.addForm.getAttribute('data-personal') === 'true';
        const priority = isPersonal ? 'Personal' : (priorityInput ? priorityInput.value : '');
        const qtyStr = qtyInput ? qtyInput.value : '1';
        const qty = parseInt(qtyStr, 10);
        const claimedBy = isPersonal && selectedUser ? selectedUser.id : null;

        if (!name) {
            await UI.customAlert('Por favor, introduce el nombre del artículo.');
            return;
        }
        
        if (isNaN(qty) || qty < 1) {
            await UI.customAlert('Por favor, indica una cantidad válida (mínimo 1).');
            return;
        }

        if (!isPersonal && !priority) {
            await UI.customAlert('Por favor, selecciona una categoría.');
            return;
        }

        const subBtn = this.elements.addForm.querySelector('button[type="submit"]');
        subBtn.disabled = true;
        subBtn.textContent = '...';

        const success = await ItemsDB.addItem(name, priority, qty, '', claimedBy);
        if (success) {
            this.elements.addForm.reset();
            if (priorityInput) priorityInput.value = '';
            const customTrigger = document.getElementById('custom-priority-trigger');
            if (customTrigger) {
                customTrigger.innerHTML = '<span class="placeholder-text" style="margin:0; opacity: 0.6;">Categoría</span><span class="material-symbols-rounded">arrow_drop_down</span>';
            }
            if (this.elements.addModalOverlay) {
                this.elements.addModalOverlay.classList.add('hidden');
            }
            // trigger reload
            await this.loadItems();
        }
        subBtn.disabled = false;
        subBtn.textContent = 'Añadir';
    },

    // --- Tab Navigation ---
    switchTab(event) {
        const clickedBtn = event.target.closest('.tab-item');
        if (!clickedBtn) return;

        const targetId = clickedBtn.getAttribute('data-target');

        if (this.elements.backHomeBtn) this.elements.backHomeBtn.style.display = 'none';
        if (this.elements.fabAdd) this.elements.fabAdd.style.display = 'none';
        if (this.elements.progressBar) this.elements.progressBar.style.display = 'none';

        this.elements.tabButtons.forEach(btn => btn.classList.remove('active'));
        this.elements.sections.forEach(sec => sec.classList.remove('active'));

        clickedBtn.classList.add('active');
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    },

    showSubSection(sectionId) {
        this.elements.sections.forEach(sec => sec.classList.remove('active'));
        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.add('active');

        if (this.elements.backHomeBtn) {
            this.elements.backHomeBtn.style.display = 'block';
        }

        if (this.elements.progressBar) {
            this.elements.progressBar.style.display = sectionId === 'section-list' ? 'block' : 'none';
        }

        if (this.elements.fabAdd) {
            if (sectionId === 'section-list' || sectionId === 'section-personallist') {
                this.elements.fabAdd.style.display = 'flex';
            } else {
                this.elements.fabAdd.style.display = 'none';
            }
        }
    },

    showHomeSection() {
        this.elements.sections.forEach(sec => sec.classList.remove('active'));
        const targetSection = document.getElementById('section-home');
        if (targetSection) targetSection.classList.add('active');

        if (this.elements.backHomeBtn) {
            this.elements.backHomeBtn.style.display = 'none';
        }

        if (this.elements.fabAdd) {
            this.elements.fabAdd.style.display = 'none';
        }

        if (this.elements.progressBar) {
            this.elements.progressBar.style.display = 'none';
        }

        this.elements.tabButtons.forEach(btn => btn.classList.remove('active'));
        if (this.elements.tabButtons[0]) this.elements.tabButtons[0].classList.add('active');
    }
};

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    UI.init();
});
