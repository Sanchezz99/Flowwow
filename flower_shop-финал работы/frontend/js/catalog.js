let allProducts = [];
let cachedFavorites = [];
let cart = [];
let cartCount = 0;

function getHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    const token = window.getToken ? window.getToken() : localStorage.getItem('auth_token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const csrfToken = window.getCookie ? window.getCookie('csrftoken') : null;
    if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
    }
    
    return headers;
}

function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showToast(message) {
    if (window.showToast) {
        window.showToast(message);
        return;
    }
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


function isLoggedIn() {
    return !!localStorage.getItem('auth_token');
}

function getToken() {
    return localStorage.getItem('auth_token');
}

function getUserId() {
    const userStr = localStorage.getItem('user_data');
    if (userStr) {
        try {
            const userData = JSON.parse(userStr);
            if (userData && userData.id) {
                return userData.id;
            }
        } catch(e) {
            console.error('Error parsing user_data:', e);
        }
    }
    
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.user_id;
    } catch {
        return null;
    }
}

function getUserData() {
    const userStr = localStorage.getItem('user_data');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    }
    return null;
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

function getUrlParameter(name) {
    const regex = new RegExp('[?&]' + name + '=([^&#]*)');
    const results = regex.exec(window.location.href);
    return results ? decodeURIComponent(results[1]) : null;
}

function updateCartCounter() {
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => {
        if (el) el.textContent = cartCount;
    });
}

//Загрузка товаров

async function loadProductsFromDB() {
    try {
        const response = await fetch(`${API_BASE_URL}/flowers/`);
        if (response.ok) {
            allProducts = await response.json();
            window.allProducts = allProducts;
            console.log('Загружено товаров:', allProducts.length);
            return true;
        } else {
            console.error('Ошибка загрузки товаров:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        return false;
    }
}

//Избранное

async function loadFavorites() {
    if (!isLoggedIn()) {
        cachedFavorites = [];
        return [];
    }
    
    const userId = getUserId();
    if (!userId) {
        cachedFavorites = [];
        return [];
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/favorites/?userId=${userId}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            cachedFavorites = data.favorites || [];
            console.log('Избранное загружено:', cachedFavorites.length);
        } else {
            cachedFavorites = [];
        }
    } catch(e) {
        console.error('Ошибка загрузки избранного:', e);
        cachedFavorites = [];
    }
    return cachedFavorites;
}

async function toggleFavorite(productId) {
    if (!isLoggedIn()) {
        showToast('Войдите в аккаунт');
        return false;
    }
    
    const isFav = cachedFavorites.includes(productId);
    const endpoint = isFav ? `${API_BASE_URL}/favorites/remove/` : `${API_BASE_URL}/favorites/add/`;
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId: getUserId(), productId: productId })
        });
        
        if (response.ok) {
            if (isFav) {
                cachedFavorites = cachedFavorites.filter(id => id !== productId);
            } else {
                cachedFavorites.push(productId);
            }
            updateWishlistButton(productId, !isFav);
            return true;
        }
    } catch(e) {
        console.error('Ошибка:', e);
    }
    return false;
}

function isFavorite(productId) {
    return cachedFavorites.includes(productId);
}

function updateWishlistButton(productId, isFav) {
    const btn = document.querySelector(`.wishlist-btn[data-id="${productId}"]`);
    if (btn) {
        btn.classList.toggle('active', isFav);
        btn.innerHTML = `<i class="${isFav ? 'fas' : 'far'} fa-heart"></i>`;
    }
}

//Корзина

async function loadCart() {
    if (!isLoggedIn()) {
        cart = [];
        cartCount = 0;
        updateCartCounter();
        return;
    }
    
    const userId = getUserId();
    if (!userId) {
        cart = [];
        cartCount = 0;
        updateCartCounter();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/?userId=${userId}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            cart = data.cart || [];
            cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            console.log('Корзина загружена:', cartCount, 'товаров');
            updateCartCounter();
        } else {
            cart = [];
            cartCount = 0;
        }
    } catch(e) {
        console.error('Ошибка загрузки корзины:', e);
        cart = [];
        cartCount = 0;
    }
}

async function addToCart(product) {
    if (!isLoggedIn()) {
        showToast('Войдите в аккаунт');
        return false;
    }
    
    const userId = getUserId();
    if (!userId) {
        showToast('Ошибка: пользователь не найден');
        return false;
    }
    
    console.log('Добавление в корзину:', {
        userId: userId,
        productId: product.id,
        productName: product.name
    });
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/add/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ 
                userId: userId,
                productId: product.id, 
                quantity: 1 
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Успешно добавлено:', data);
            showToast(`${product.name} добавлен в корзину`);
            await loadCart();
            return true;
        } else {
            const error = await response.json();
            console.error('Ошибка:', error);
            showToast(`Ошибка: ${error.error || 'Не удалось добавить'}`);
            return false;
        }
    } catch(e) {
        console.error('Ошибка добавления:', e);
        showToast('Ошибка соединения');
        return false;
    }
}

//Отображение товаров

function displayBouquets(category) {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) return;
    
    productsContainer.innerHTML = '';
    
    let productsToShow = allProducts;
    
    if (category && category !== 'all') {
        productsToShow = allProducts.filter(p => p.category_slug === category || p.category === category);
    }
    
    if (productsToShow.length === 0) {
        productsContainer.innerHTML = '<p style="text-align:center; padding:40px;">Товары не найдены</p>';
        return;
    }
    
    productsToShow.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        const isFav = isFavorite(product.id);
        const safePrice = (product.price || 0).toLocaleString();
        const safeOldPrice = product.old_price ? product.old_price.toLocaleString() : '';
        const rating = product.rating || 5;
        const reviews = product.reviews || 0;
        
        let badges = '';
        if (product.is_popular) badges += '<span class="product-badge">Хит продаж</span>';
        if (product.is_new) badges += '<span class="product-badge new">Новинка</span>';
        
        const imageUrl = product.image || 'https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg';
        
        productCard.innerHTML = `
            <div class="product-img" style="background-image: url('${imageUrl}'); position: relative;">
                ${badges}
                <button class="wishlist-btn ${isFav ? 'active' : ''}" data-id="${product.id}">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
            <div class="product-info">
                <h3>${escapeHTML(product.name)}</h3>
                <p>${escapeHTML(product.description || 'Красивый букет из свежих цветов')}</p>
                <div class="product-rating">
                    ${'<i class="fas fa-star"></i>'.repeat(Math.floor(rating))}
                    ${rating % 1 ? '<i class="fas fa-star-half-alt"></i>' : ''}
                    ${'<i class="far fa-star"></i>'.repeat(5 - Math.ceil(rating))}
                    <span>(${reviews})</span>
                </div>
                <div class="product-price">
                    <span class="current-price">${safePrice} ₽</span>
                    ${safeOldPrice ? `<span class="old-price">${safeOldPrice} ₽</span>` : ''}
                </div>
                <div class="product-buttons">
                    <button class="btn btn-small order-btn" data-id="${product.id}">Заказать</button>
                    <button class="btn btn-small cart-btn" data-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i> В корзину
                    </button>
                </div>
            </div>
        `;
        productsContainer.appendChild(productCard);
    });
    
    attachEventHandlers();
}

function attachEventHandlers() {
    // Избранное
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await toggleFavorite(parseInt(btn.dataset.id));
        };
    });
    
    // Заказать
    document.querySelectorAll('.order-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Кнопка "Заказать" нажата, productId:', btn.dataset.id);
            
            if (!isLoggedIn()) {
                showToast('Войдите в аккаунт для заказа');
                return;
            }
            
            const productId = parseInt(btn.dataset.id);
            const product = allProducts.find(p => p.id === productId);
            
            if (product) {
                console.log('Товар найден:', product.name);
                if (typeof window.openOrderModal === 'function') {
                    window.openOrderModal(productId);
                } else {
                    console.error('Функция openOrderModal не найдена!');
                    showToast('Ошибка: форма заказа не загружена');
                }
            } else {
                console.error('Товар не найден, ID:', productId);
                showToast('Товар не найден');
            }
        };
    });
    
    // В корзину
    document.querySelectorAll('.cart-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const productId = parseInt(btn.dataset.id);
            const product = allProducts.find(p => p.id === productId);
            if (product) {
                await addToCart(product);
            }
        };
    });
}

//Инициализация

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Catalog.js загружен');
    console.log('Проверка модального окна заказа:', document.getElementById('order-modal') ? 'есть' : 'нет');
    
    await loadProductsFromDB();
    await loadFavorites();
    await loadCart();
    
    const filterTabs = document.querySelectorAll('.filter-tab');
    const categoryFromUrl = getUrlParameter('cat');
    let activeCategory = 'all';
    
    if (categoryFromUrl) {
        activeCategory = categoryFromUrl;
    }
    
    filterTabs.forEach(btn => {
        const btnCategory = btn.getAttribute('data-category');
        if (btnCategory === activeCategory) {
            btn.classList.add('active');
        }
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            filterTabs.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            displayBouquets(this.getAttribute('data-category'));
        });
    });
    
    displayBouquets(activeCategory);
});

//Глобальные функции

window.allProducts = allProducts;
window.isLoggedIn = isLoggedIn;
window.getToken = getToken;
window.getUserId = getUserId;
window.getUserData = getUserData;
window.toggleFavorite = toggleFavorite;
window.isFavorite = isFavorite;
window.addToCart = addToCart;
window.loadCart = loadCart;
window.loadFavorites = loadFavorites;
window.showToast = showToast;
window.loadProductsFromDB = loadProductsFromDB;
window.allProducts = allProducts;