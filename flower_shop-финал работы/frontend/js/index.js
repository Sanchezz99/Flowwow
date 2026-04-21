async function loadPopularProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/flowers/`);
        if (response.ok) {
            const allProducts = await response.json();
            const popularProducts = allProducts.filter(product => product.is_popular === true).slice(0, 3);
            displayPopularProducts(popularProducts);
        } else {
            console.error('Ошибка загрузки товаров:', response.status);
            displayPopularProducts([]);
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        displayPopularProducts([]);
    }
}

function displayPopularProducts(products) {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) return;
    
    if (!products.length) {
        productGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Популярные товары не найдены</p>';
        return;
    }
    
    productGrid.innerHTML = '';
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        const hasOldPrice = product.old_price ? `<span class="old-price">${product.old_price.toLocaleString()} ₽</span>` : '';
        const rating = product.rating || 5;
        const reviews = product.reviews || 0;
        const isFav = window.isFavorite ? window.isFavorite(product.id) : false;
        
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
                    <span class="current-price">${product.price.toLocaleString()} ₽</span>
                    ${hasOldPrice}
                </div>
            </div>
        `;
        productGrid.appendChild(productCard);
    });
    
    attachWishlistHandlers();
}

function attachWishlistHandlers() {
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.removeEventListener('click', handleWishlistClick);
        btn.addEventListener('click', handleWishlistClick);
    });
}

async function handleWishlistClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const btn = this;
    const productId = parseInt(btn.dataset.id);
    
    if (!window.isLoggedIn || !window.isLoggedIn()) {
        showToast('Войдите в аккаунт, чтобы добавить в избранное');
        if (typeof window.openAuthModal === 'function') {
            window.openAuthModal();
        }
        return;
    }
    
    if (typeof window.toggleFavorite === 'function') {
        const success = await window.toggleFavorite(productId);
        if (success) {
            const isFav = window.isFavorite ? window.isFavorite(productId) : false;
            btn.classList.toggle('active', isFav);
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isFav ? 'fas fa-heart' : 'far fa-heart';
            }
            showToast(isFav ? 'Добавлено в избранное' : 'Удалено из избранного');
        }
    }
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

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Index.js загружен');
    
    setTimeout(async () => {
        if (window.isLoggedIn && window.isLoggedIn() && window.loadFavorites) {
            await window.loadFavorites();
        }
        loadPopularProducts();
    }, 500);
});