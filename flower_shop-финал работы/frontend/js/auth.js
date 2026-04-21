// Дефолтная аватарка
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=e83e8c&color=fff&bold=true&size=40&font-size=20&name=🌸';

// Элементы модального окна авторизации
const authModal = document.getElementById('auth-modal');
const authCloseBtn = authModal?.querySelector('.auth-modal-close');
const authTabs = authModal?.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

// Элементы модального окна профиля
const profileModal = document.getElementById('profile-modal');
const profileCloseBtn = document.getElementById('closeProfileModalBtn');
const cancelProfileBtn = document.getElementById('cancelProfileModalBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const avatarUpload = document.getElementById('avatarUpload');
const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
const modalAvatarPreview = document.getElementById('modalAvatarPreview');
const profileUsername = document.getElementById('profile-username');
const currentPasswordInput = document.getElementById('currentPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

let tempAvatarFile = null;

// Работа с куки

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Авторизация

function getHeaders() {
    const headers = {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
    };
    
    const token = localStorage.getItem('auth_token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

function getToken() {
    return localStorage.getItem('auth_token') || null;
}

function getUserId() {
    const user = getUserData();
    return user?.id || user?.user_id || null;
}

function getUserData() {
    const userStr = localStorage.getItem('user_data');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            console.error('Error parsing user_data:', e);
            return null;
        }
    }
    return null;
}

function saveUserData(user) {
    localStorage.setItem('user_data', JSON.stringify(user));
}

function isLoggedIn() {
    const user = getUserData();
    return !!user && (!!user.id || !!user.user_id);
}

// UI шапочка

function updateHeaderAuth() {
    const headerIcons = document.querySelector('.header-icons');
    if (!headerIcons) return;
    
    const existingAuthBtn = headerIcons.querySelector('.auth-header-btn');
    const existingUserAvatar = headerIcons.querySelector('.user-avatar-header');
    
    if (isLoggedIn()) {
        const user = getUserData();
        
        if (existingAuthBtn) existingAuthBtn.remove();
        if (existingUserAvatar) existingUserAvatar.remove();
        
        const userAvatar = document.createElement('div');
        userAvatar.className = 'user-avatar-header';
        userAvatar.innerHTML = `
            <img class="user-avatar-img" src="${user?.avatar || DEFAULT_AVATAR}" alt="avatar" onerror="this.src='${DEFAULT_AVATAR}'">
            <span class="user-avatar-name">${user?.username || 'User'}</span>
            <div class="profile-dropdown">
                <div class="profile-dropdown-item" id="dropdown-profile">Профиль</div>
                <div class="profile-dropdown-item" id="dropdown-edit-profile">Редактировать</div>
                <div class="profile-dropdown-divider"></div>
                <div class="profile-dropdown-item" id="dropdown-logout">Выйти</div>
            </div>
        `;
        headerIcons.appendChild(userAvatar);
        
        userAvatar.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = userAvatar.querySelector('.profile-dropdown');
            document.querySelectorAll('.profile-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('show');
            });
            dropdown.classList.toggle('show');
        });
        
        document.getElementById('dropdown-profile')?.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
        
        document.getElementById('dropdown-edit-profile')?.addEventListener('click', () => {
            openProfileModal();
        });
        
        document.getElementById('dropdown-logout')?.addEventListener('click', logout);
        
        document.addEventListener('click', () => {
            document.querySelectorAll('.profile-dropdown').forEach(d => {
                d.classList.remove('show');
            });
        });
        
    } else {
        if (existingUserAvatar) existingUserAvatar.remove();
        
        if (!existingAuthBtn) {
            const authBtn = document.createElement('button');
            authBtn.className = 'auth-header-btn';
            authBtn.textContent = 'Войти / Регистрация';
            authBtn.addEventListener('click', openAuthModal);
            headerIcons.appendChild(authBtn);
        }
    }
}


function logout() {
    fetch(`${API_BASE_URL}/logout/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Authorization': `Bearer ${getToken()}`
        },
        credentials: 'include'
    }).catch(console.error).finally(() => {
        localStorage.removeItem('user_data');
        localStorage.removeItem('auth_token');
        updateHeaderAuth();
        showToast(`Вы вышли из аккаунта`);
        
        if (window.location.pathname.includes('profile.html')) {
            window.location.href = 'index.html';
        } else {
            setTimeout(() => window.location.reload(), 500);
        }
    });
}

//Модальные окна

function openAuthModal() {
    if (!authModal) return;
    authModal.classList.add('active');
    loginForm?.reset();
    registerForm?.reset();
    loginError?.classList.remove('active');
    registerError?.classList.remove('active');
    
    const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
    if (loginTab) loginTab.click();
}

function closeAuthModal() {
    if (!authModal) return;
    authModal.classList.remove('active');
}

function openProfileModal() {
    if (!profileModal) return;
    const user = getUserData();
    if (profileUsername) profileUsername.value = user?.username || '';
    if (modalAvatarPreview) modalAvatarPreview.src = user?.avatar || DEFAULT_AVATAR;
    if (currentPasswordInput) currentPasswordInput.value = '';
    if (newPasswordInput) newPasswordInput.value = '';
    if (confirmPasswordInput) confirmPasswordInput.value = '';
    tempAvatarFile = null;
    
    profileModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProfileModal() {
    if (!profileModal) return;
    profileModal.classList.remove('active');
    document.body.style.overflow = '';
    tempAvatarFile = null;
}

//Загрузка аватара

async function uploadAvatar(file) {
    const userId = getUserId();
    if (!userId) return null;
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('Файл не должен превышать 5 МБ');
        return null;
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Допустимы только изображения (JPEG, PNG, GIF)');
        return null;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/upload-avatar/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Authorization': `Bearer ${getToken()}`
            },
            credentials: 'include',
            body: formData
        });
        if (response.ok) {
            const data = await response.json();
            return data.avatar;
        }
        return null;
    } catch (error) {
        console.error('Ошибка загрузки аватара:', error);
        return null;
    }
}

//Смена пароля

async function changePassword(currentPassword, newPassword) {
    const userId = getUserId();
    if (!userId) return false;
    
    if (newPassword.length < 8) {
        showToast('Пароль должен содержать не менее 8 символов');
        return false;
    }
    
    if (/^\d+$/.test(newPassword)) {
        showToast('Пароль не может состоять только из цифр');
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/change-password/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
                'Authorization': `Bearer ${getToken()}`
            },
            credentials: 'include',
            body: JSON.stringify({ 
                current_password: currentPassword, 
                new_password: newPassword 
            })
        });
        
        if (response.ok) return true;
        
        const error = await response.json();
        showToast(error.error || 'Неверный текущий пароль');
        return false;
    } catch (error) {
        console.error('Ошибка смены пароля:', error);
        return false;
    }
}

async function saveProfile() {
    const currentPwd = currentPasswordInput?.value || '';
    const newPwd = newPasswordInput?.value || '';
    const confirmPwd = confirmPasswordInput?.value || '';
    
    const hasPasswordChange = newPwd.length > 0;
    const hasAvatarChange = !!tempAvatarFile;
    
    if (!hasPasswordChange && !hasAvatarChange) {
        closeProfileModal();
        return;
    }
    
    if (hasPasswordChange) {
        if (!currentPwd) {
            showToast(`Введите текущий пароль`);
            return;
        }
        if (newPwd !== confirmPwd) {
            showToast(`Новые пароли не совпадают`);
            return;
        }
    }
    
    if (saveProfileBtn) {
        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = 'Сохранение...';
    }
    
    try {
        if (hasAvatarChange) {
            const newAvatarUrl = await uploadAvatar(tempAvatarFile);
            if (newAvatarUrl) {
                const user = getUserData();
                user.avatar = newAvatarUrl;
                saveUserData(user);
                const avatarImg = document.querySelector('.user-avatar-img');
                if (avatarImg) avatarImg.src = newAvatarUrl;
                showToast('Аватар обновлен');
            }
        }
        
        if (hasPasswordChange) {
            const passwordChanged = await changePassword(currentPwd, newPwd);
            if (!passwordChanged) {
                if (saveProfileBtn) {
                    saveProfileBtn.disabled = false;
                    saveProfileBtn.textContent = 'Сохранить';
                }
                return;
            }
            showToast('Пароль изменен');
        }
        
        closeProfileModal();
        
        if (hasPasswordChange) {
            setTimeout(() => {
                showToast(`Войдите с новым паролем`);
                logout();
            }, 1500);
        } else {
            updateHeaderAuth();
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast(`Произошла ошибка при сохранении`);
    } finally {
        if (saveProfileBtn) {
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = 'Сохранить';
        }
    }
}

//Вход

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.classList.remove('active');
        
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            loginError.textContent = 'Заполните все поля';
            loginError.classList.add('active');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                localStorage.setItem('auth_token', data.token);
                saveUserData({
                    id: data.user_id,
                    username: username,
                    avatar: data.avatar || DEFAULT_AVATAR
                });
                
                closeAuthModal();
                updateHeaderAuth();
                showToast(`Добро пожаловать, ${username}!`);
                
                if (data.is_superuser) {
                    showToast(`Вы вошли как администратор`);
                    setTimeout(() => {
                        window.location.href = 'http://127.0.0.1:8000/admin/';
                    }, 1500);
                } else {
                    setTimeout(() => window.location.reload(), 500);
                }
            } else {
                const error = await response.json();
                loginError.textContent = error.error || 'Неверный логин или пароль';
                loginError.classList.add('active');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            loginError.textContent = 'Ошибка соединения';
            loginError.classList.add('active');
        }
    });
}

//Регистрация

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerError.classList.remove('active');
        
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        
        if (!username || !password) {
            registerError.textContent = 'Заполните все поля';
            registerError.classList.add('active');
            return;
        }
        
        if (username.length < 3) {
            registerError.textContent = 'Логин должен содержать не менее 3 символов';
            registerError.classList.add('active');
            return;
        }
        
        if (password.length < 8) {
            registerError.textContent = 'Пароль должен содержать не менее 8 символов';
            registerError.classList.add('active');
            return;
        }
        
        if (/^\d+$/.test(password)) {
            registerError.textContent = 'Пароль не может состоять только из цифр';
            registerError.classList.add('active');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                localStorage.setItem('auth_token', data.token);
                saveUserData({
                    id: data.user_id,
                    username: username,
                    avatar: DEFAULT_AVATAR
                });
                
                closeAuthModal();
                updateHeaderAuth();
                showToast(`Регистрация прошла успешно! Добро пожаловать, ${username}`);
                
                setTimeout(() => window.location.reload(), 500);
            } else {
                const error = await response.json();
                registerError.textContent = error.error || 'Ошибка регистрации';
                registerError.classList.add('active');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            registerError.textContent = 'Ошибка соединения';
            registerError.classList.add('active');
        }
    });
}

//Инициализация модальных окон

if (authTabs) {
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (tabName === 'login') {
                loginForm?.classList.remove('hidden');
                registerForm?.classList.add('hidden');
            } else {
                loginForm?.classList.add('hidden');
                registerForm?.classList.remove('hidden');
            }
            
            loginError?.classList.remove('active');
            registerError?.classList.remove('active');
        });
    });
}

if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);
if (profileCloseBtn) profileCloseBtn.addEventListener('click', closeProfileModal);
if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', closeProfileModal);

if (authModal) {
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeAuthModal();
    });
}

if (profileModal) {
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) closeProfileModal();
    });
}

if (uploadAvatarBtn) {
    uploadAvatarBtn.addEventListener('click', () => avatarUpload?.click());
}

if (avatarUpload) {
    avatarUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showToast(`Файл не должен превышать 5 МБ`);
                avatarUpload.value = '';
                return;
            }
            
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                showToast(`Допустимы только изображения`);
                avatarUpload.value = '';
                return;
            }
            
            tempAvatarFile = file;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (modalAvatarPreview) modalAvatarPreview.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', saveProfile);
}

function showToast(message) {
    const existingToasts = document.querySelectorAll('.toast-notification');
    if (existingToasts.length >= 3) {
        existingToasts[0].remove();
    }
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
            }, 300);
        }
    }, 3000);
}

//Инициализация

document.addEventListener('DOMContentLoaded', () => {
    updateHeaderAuth();
});

window.isLoggedIn = isLoggedIn;
window.getToken = getToken;
window.getUserId = getUserId;
window.getUserData = getUserData;
window.logout = logout;
window.openAuthModal = openAuthModal;
window.showToast = showToast;
window.getCookie = getCookie;
window.getHeaders = getHeaders;
window.updateHeaderAuth = updateHeaderAuth;