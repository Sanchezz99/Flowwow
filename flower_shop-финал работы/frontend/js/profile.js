let userCart = [];
let userOrders = [];
let userFavorites = [];
let selectedItems = new Set();

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


//Чекбоксы + заказ

function toggleSelectAll() {
    if (selectedItems.size === userCart.length && userCart.length > 0) {
        selectedItems.clear();
    } else {
        userCart.forEach(item => {
            selectedItems.add(item.id);
        });
    }
    renderCart();
}

function orderSingleItem(item) {
    if (!isLoggedIn()) {
        showToast('Войдите в аккаунт для заказа');
        return;
    }
    
    if (typeof window.openOrderModal === 'function') {
        // Устанавливаем флаг, что заказ ИЗ КОРЗИНЫ
        window.orderFromCart = true;
        window.openOrderModal(item.id);
    } else {
        showToast('Форма заказа временно недоступна');
    }
}


async function loadCart() {
    const container = document.getElementById('cart-container');
    if (!container) return;
    
    console.log('loadCart вызван');
    
    if (!isLoggedIn()) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Ваша корзина пуста</p>
                <a href="catalog.html" class="btn btn-small">Перейти в каталог</a>
            </div>
        `;
        return;
    }
    
    const userId = window.currentUserId || getUserId();
    console.log('userId в loadCart:', userId);
    
    if (!userId) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Ошибка загрузки пользователя. Пожалуйста, <button class="btn btn-small" onclick="logout()">выйдите</button> и войдите снова.</p>
            </div>
        `;
        return;
    }
    
    try {
        console.log('Запрос корзины для userId:', userId);
        const response = await fetch(`${API_BASE_URL}/cart/?userId=${userId}`, {
            headers: getHeaders()
        });
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            userCart = data.cart || [];
            console.log('Корзина загружена:', userCart.length, 'товаров');
        } else {
            userCart = [];
        }
    } catch(e) {
        console.error('Ошибка загрузки корзины:', e);
        userCart = [];
    }
    renderCart();
}

async function updateCartQuantity(productId, delta) {
    const item = userCart.find(i => i.id === productId);
    if (!item) return;
    
    const newQuantity = (item.quantity || 1) + delta;
    if (newQuantity < 1) {
        await removeFromCart(productId);
        return;
    }
    
    const userId = window.currentUserId || getUserId();
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/update/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                userId: userId,
                productId: productId,
                quantity: newQuantity
            })
        });
        
        if (response.ok) {
            await loadCart();
        }
    } catch(e) {
        console.error('Ошибка обновления:', e);
    }
}

async function removeFromCart(productId) {
    const userId = window.currentUserId || getUserId();
    
    try {
        const response = await fetch(`${API_BASE_URL}/cart/remove/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                userId: userId,
                productId: productId
            })
        });
        
        if (response.ok) {
            selectedItems.delete(productId);
            await loadCart();
        }
    } catch(e) {
        console.error('Ошибка удаления:', e);
    }
}

async function checkout() {
    // Получаем выбранные товары
    const selectedProducts = userCart.filter(item => selectedItems.has(item.id));
    
    if (!selectedProducts.length) {
        showToast('Выберите товары для оформления заказа');
        return;
    }
    
    if (typeof window.openOrderModalForCart === 'function') {
        window.openOrderModalForCart(selectedProducts);
    } else {
        showToast('Форма заказа временно недоступна');
    }
}

//Рендеринг корзины

function renderCart() {
    const container = document.getElementById('cart-container');
    if (!container) return;
    
    if (!userCart.length) {
        selectedItems.clear();
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Ваша корзина пуста</p>
                <a href="catalog.html" class="btn btn-small">Перейти в каталог</a>
            </div>
        `;
        return;
    }
    
    let total = 0;
    let allSelected = selectedItems.size === userCart.length && userCart.length > 0;
    
    let html = `
        <div class="cart-controls">
            <button class="cart-select-all-btn" id="select-all-btn">
                ${allSelected ? 'Снять все' : 'Выбрать все'}
            </button>
        </div>
        <div class="cart-items">
    `;
    
    userCart.forEach(item => {
        const quantity = item.quantity || 1;
        const itemTotal = (item.price || 0) * quantity;
        total += itemTotal;
        const isSelected = selectedItems.has(item.id);
        const imageUrl = item.image || 'https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg';
        
        html += `
            <div class="cart-item ${isSelected ? 'cart-item-selected' : ''}" data-id="${item.id}">
                <div class="cart-item-checkbox">
                    <input type="checkbox" class="cart-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
                </div>
                <img class="cart-item-image" src="${imageUrl}" alt="${escapeHTML(item.name)}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${escapeHTML(item.name)}</div>
                    <div class="cart-item-price">${(item.price || 0).toLocaleString()} ₽</div>
                    <div class="cart-item-total">Сумма: ${itemTotal.toLocaleString()} ₽</div>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-control">
                        <button class="quantity-btn minus" data-id="${item.id}">-</button>
                        <span class="quantity-value">${quantity}</span>
                        <button class="quantity-btn plus" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-item" data-id="${item.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <button class="cart-order-single-btn" data-id="${item.id}">
                        Заказать
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    html += `
        <div class="cart-summary">
            <div class="cart-summary-row total">
                <span>Итого к оплате</span>
                <span>${total.toLocaleString()} ₽</span>
            </div>
            <button class="btn cart-checkout-btn" id="checkout-btn">
                Оформить заказ
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Обработчик кнопки "Выбрать все"/"Снять все"
    const selectAllBtn = document.getElementById('select-all-btn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', toggleSelectAll);
    }
    
    // Обработчики чекбоксов
    document.querySelectorAll('.cart-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const productId = parseInt(checkbox.dataset.id);
            if (checkbox.checked) {
                selectedItems.add(productId);
            } else {
                selectedItems.delete(productId);
            }
            renderCart();
        });
    });
    
    // Обработчики количества
    document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
        btn.addEventListener('click', () => updateCartQuantity(parseInt(btn.dataset.id), -1));
    });
    document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
        btn.addEventListener('click', () => updateCartQuantity(parseInt(btn.dataset.id), 1));
    });
    
    // Обработчики удаления
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)));
    });
    
    // Обработчики кнопок "Заказать"
    document.querySelectorAll('.cart-order-single-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const productId = parseInt(btn.dataset.id);
            const product = userCart.find(p => p.id === productId);
            if (product) {
                orderSingleItem(product);
            }
        });
    });
    
    // Обработчик кнопки оформления заказа
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => checkout());
    }
}

//Избранное

async function loadFavorites() {
    const container = document.getElementById('favorites-container');
    if (!container) return;
    
    console.log('loadFavorites вызван');
    
    if (!isLoggedIn()) {
        container.innerHTML = `
            <div class="empty-favorites">
                <i class="fas fa-heart"></i>
                <p>У вас пока нет избранных товаров</p>
                <a href="catalog.html" class="btn btn-small">Перейти в каталог</a>
            </div>
        `;
        return;
    }
    
    const userId = window.currentUserId || getUserId();
    console.log('favorites userId:', userId);
    
    if (!userId) {
        container.innerHTML = `
            <div class="empty-favorites">
                <i class="fas fa-heart"></i>
                <p>Ошибка загрузки пользователя</p>
                <a href="catalog.html" class="btn btn-small">Перейти в каталог</a>
            </div>
        `;
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/favorites/?userId=${userId}`, {
            headers: getHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            const favoriteIds = data.favorites || [];
            console.log('Избранное IDs:', favoriteIds);
            
            if (favoriteIds.length > 0) {
                const productsResponse = await fetch(`${API_BASE_URL}/flowers/`);
                if (productsResponse.ok) {
                    const allProducts = await productsResponse.json();
                    userFavorites = allProducts.filter(p => favoriteIds.includes(p.id));
                    console.log('Товары в избранном:', userFavorites.length);
                } else {
                    userFavorites = [];
                }
            } else {
                userFavorites = [];
            }
        } else {
            userFavorites = [];
        }
    } catch(e) {
        console.error('Ошибка загрузки избранного:', e);
        userFavorites = [];
    }
    renderFavorites();
}

function renderFavorites() {
    const container = document.getElementById('favorites-container');
    if (!container) return;
    
    if (!userFavorites.length) {
        container.innerHTML = `
            <div class="empty-favorites">
                <i class="fas fa-heart"></i>
                <p>У вас пока нет избранных товаров</p>
                <a href="catalog.html" class="btn btn-small">Перейти в каталог</a>
            </div>
        `;
        return;
    }
    
    let html = '<div class="products-grid favorites-grid">';
    
    userFavorites.forEach(product => {
        const safePrice = (product.price || 0).toLocaleString();
        const safeOldPrice = product.old_price ? product.old_price.toLocaleString() : '';
        const rating = product.rating || 5;
        const reviews = product.reviews || 0;
        const imageUrl = product.image || 'https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg';
        
        html += `
            <div class="product-card" data-id="${product.id}">
                <div class="product-img" style="background-image: url('${imageUrl}'); position: relative;">
                    <button class="wishlist-btn active favorite-remove-btn" data-id="${product.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="product-info">
                    <h3>${escapeHTML(product.name)}</h3>
                    <p>${escapeHTML(product.description || 'Красивый букет из свежих цветов')}</p>
                    <div class="product-rating">
                        ${'<i class="fas fa-star"></i>'.repeat(Math.floor(rating))}
                        ${rating % 1 ? '<i class="fas fa-star-half-alt"></i>' : ''}
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
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    document.querySelectorAll('#favorites-container .order-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const productId = parseInt(btn.dataset.id);
            if (typeof window.openOrderModal === 'function') {
                window.openOrderModal(productId);
            }
        });
    });
    
    document.querySelectorAll('#favorites-container .cart-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const productId = parseInt(btn.dataset.id);
            const product = userFavorites.find(p => p.id === productId);
            if (product && typeof window.addToCart === 'function') {
                await window.addToCart(product);
                await loadCart();
            }
        });
    });
    
    document.querySelectorAll('#favorites-container .favorite-remove-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const productId = parseInt(btn.dataset.id);
            if (typeof window.toggleFavorite === 'function') {
                await window.toggleFavorite(productId);
                await loadFavorites();
            }
        });
    });
}

//Заказы

async function loadOrders() {
    const container = document.getElementById('orders-container');
    if (!container) return;
    
    console.log('loadOrders вызван');
    
    if (!isLoggedIn()) {
        container.innerHTML = `
            <div class="empty-orders">
                <i class="fas fa-box-open"></i>
                <p>У вас пока нет заказов</p>
                <a href="catalog.html" class="btn btn-small">Сделать первый заказ</a>
            </div>
        `;
        return;
    }
    
    const userId = window.currentUserId || getUserId();
    console.log('orders userId:', userId);
    
    if (!userId) {
        container.innerHTML = `
            <div class="empty-orders">
                <i class="fas fa-box-open"></i>
                <p>Ошибка загрузки пользователя</p>
                <a href="catalog.html" class="btn btn-small">Сделать первый заказ</a>
            </div>
        `;
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/?userId=${userId}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            userOrders = data.orders || [];
            console.log('Заказы загружены:', userOrders.length);
        } else {
            userOrders = [];
        }
    } catch(e) {
        console.error('Ошибка загрузки заказов:', e);
        userOrders = [];
    }
    renderOrders();
}

function renderOrders() {
    const container = document.getElementById('orders-container');
    if (!container) return;
    
    if (!userOrders.length) {
        container.innerHTML = `
            <div class="empty-orders">
                <i class="fas fa-box-open"></i>
                <p>У вас пока нет заказов</p>
                <a href="catalog.html" class="btn btn-small">Сделать первый заказ</a>
            </div>
        `;
        return;
    }
    
    let html = '<div class="orders-list">';
    
    userOrders.forEach(order => {
        let items = order.items || [];
        let totalAmount = order.totalAmount || 0;
        const orderDate = new Date(order.created_at).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        html += `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-header-left">
                        <div class="order-header-item">
                            <span class="order-header-label">Заказ №</span>
                            <span class="order-header-value order-id">${order.id}</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Дата</span>
                            <span class="order-header-value">${orderDate}</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Товаров</span>
                            <span class="order-header-value">${items.length} шт.</span>
                        </div>
                        <div class="order-header-item">
                            <span class="order-header-label">Сумма</span>
                            <span class="order-header-value order-total">${totalAmount.toLocaleString()} ₽</span>
                        </div>
                    </div>
                    <button class="order-toggle" data-order-id="${order.id}">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="order-body" id="order-body-${order.id}" style="display: none;">
                    <div class="order-products">
        `;
        
        items.forEach(item => {
            const itemPrice = item.price || 0;
            const itemQuantity = item.quantity || 1;
            const itemTotal = itemPrice * itemQuantity;
            const imageUrl = item.productImage || 'https://i.pinimg.com/736x/97/78/33/9778339cf8a1e1e1851e6b6ed4ce81c6.jpg';
            
            html += `
                <div class="order-product">
                    <img class="order-product-image" src="${imageUrl}" alt="${escapeHTML(item.productName)}">
                    <div class="order-product-info">
                        <div class="order-product-name">${escapeHTML(item.productName)}</div>
                        <div class="order-product-quantity">Количество: ${itemQuantity}</div>
                        <div class="order-product-price-item">${itemPrice.toLocaleString()} ₽ / шт.</div>
                    </div>
                    <div class="order-product-price">${itemTotal.toLocaleString()} ₽</div>
                </div>
            `;
        });
        
        html += `
                    </div>
                    <div class="order-total">
                        Итого: <span>${totalAmount.toLocaleString()} ₽</span>
                    </div>
                    <div class="order-delivery-info">
                        <div><strong>Доставка:</strong> ${order.address || 'не указан'}</div>
                        <div><strong>Телефон:</strong> ${order.phone || 'не указан'}</div>
                        <div><strong>Имя получателя:</strong> ${order.customerName || 'не указано'}</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    document.querySelectorAll('.order-toggle').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const orderId = this.dataset.orderId;
            const orderBody = document.getElementById(`order-body-${orderId}`);
            if (orderBody) {
                if (orderBody.style.display === 'none') {
                    orderBody.style.display = 'block';
                    this.querySelector('i').style.transform = 'rotate(180deg)';
                } else {
                    orderBody.style.display = 'none';
                    this.querySelector('i').style.transform = 'rotate(0deg)';
                }
            }
        });
    });
}

//Вкладки

function initTabs() {
    const cartBtn = document.querySelector('.profile-tab-btn[data-tab="cart"]');
    const favoritesBtn = document.querySelector('.profile-tab-btn[data-tab="favorites"]');
    const ordersBtn = document.querySelector('.profile-tab-btn[data-tab="orders"]');
    const cartTab = document.getElementById('tab-cart');
    const favoritesTab = document.getElementById('tab-favorites');
    const ordersTab = document.getElementById('tab-orders');
    
    if (cartBtn && favoritesBtn && ordersBtn && cartTab && favoritesTab && ordersTab) {
        const newCartBtn = cartBtn.cloneNode(true);
        const newFavoritesBtn = favoritesBtn.cloneNode(true);
        const newOrdersBtn = ordersBtn.cloneNode(true);
        
        cartBtn.parentNode.replaceChild(newCartBtn, cartBtn);
        favoritesBtn.parentNode.replaceChild(newFavoritesBtn, favoritesBtn);
        ordersBtn.parentNode.replaceChild(newOrdersBtn, ordersBtn);
        
        newCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            cartTab.classList.add('active');
            favoritesTab.classList.remove('active');
            ordersTab.classList.remove('active');
            newCartBtn.classList.add('active');
            newFavoritesBtn.classList.remove('active');
            newOrdersBtn.classList.remove('active');
            loadCart();
        });
        
        newFavoritesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            favoritesTab.classList.add('active');
            cartTab.classList.remove('active');
            ordersTab.classList.remove('active');
            newFavoritesBtn.classList.add('active');
            newCartBtn.classList.remove('active');
            newOrdersBtn.classList.remove('active');
            loadFavorites();
        });
        
        newOrdersBtn.addEventListener('click', function(e) {
            e.preventDefault();
            ordersTab.classList.add('active');
            cartTab.classList.remove('active');
            favoritesTab.classList.remove('active');
            newOrdersBtn.classList.add('active');
            newCartBtn.classList.remove('active');
            newFavoritesBtn.classList.remove('active');
            loadOrders();
        });
    }
}

//Инициализация

document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    
    let userData = null;
    const userStr = localStorage.getItem('user_data');
    
    if (userStr) {
        try {
            userData = JSON.parse(userStr);
            console.log('Raw user_data:', userData);
            
            if (!userData.id && userData.user_id) {
                userData.id = userData.user_id;
                localStorage.setItem('user_data', JSON.stringify(userData));
                console.log('Fixed user_data - added id:', userData.id);
            }
            if (!userData.id && userData.userId) {
                userData.id = userData.userId;
                localStorage.setItem('user_data', JSON.stringify(userData));
                console.log('Fixed user_data - added id:', userData.id);
            }
        } catch(e) {
            console.error('Error parsing user_data:', e);
        }
    }
    
    const token = getToken();
    if (!token || !userData || !userData.id) {
        console.log('Not authorized or invalid user data');
        const container = document.querySelector('.profile-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-lock" style="font-size: 64px; color: #e83e8c; margin-bottom: 20px;"></i>
                    <h2>Требуется авторизация</h2>
                    <p>Пожалуйста, войдите в аккаунт</p>
                    <button class="btn" onclick="window.location.href='index.html'">На главную</button>
                </div>
            `;
        }
        return;
    }
    
    const userId = userData.id;
    console.log('Final userId:', userId);
    
    if (!userId) {
        console.error('Still cannot get userId, please re-login');
        return;
    }
    
    window.currentUserId = userId;
    
    initTabs();
    loadCart();
    loadFavorites();
    loadOrders();
});

//Глрбальные функции

window.logout = function() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.href = 'index.html';
};

window.addToCart = async function(product) {
    const userId = window.currentUserId || getUserId();
    if (!userId) return false;
    
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
            showToast(`${product.name} добавлен в корзину`);
            await loadCart();
            return true;
        }
        return false;
    } catch(e) {
        console.error('Ошибка добавления:', e);
        return false;
    }
};

window.toggleFavorite = async function(productId) {
    const userId = window.currentUserId || getUserId();
    if (!userId) return false;
    
    const isFav = userFavorites.some(p => p.id === productId);
    const endpoint = isFav ? `${API_BASE_URL}/favorites/remove/` : `${API_BASE_URL}/favorites/add/`;
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId: userId, productId: productId })
        });
        
        if (response.ok) {
            await loadFavorites();
            return true;
        }
        return false;
    } catch(e) {
        console.error('Ошибка:', e);
        return false;
    }
};