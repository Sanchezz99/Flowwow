# shop/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'flowers', views.FlowerViewSet)

urlpatterns = [
    
    path('api/register/', views.register_user, name='register'),
    path('api/login/', views.login_user, name='login'),
    
    
    path('api/users/<int:user_id>/change-password/', views.change_password, name='change_password'),
    path('api/users/<int:user_id>/upload-avatar/', views.upload_avatar, name='upload_avatar'),
    
    
    path('api/cart/', views.get_cart, name='get_cart'),
    path('api/cart/add/', views.add_to_cart, name='add_to_cart'),
    path('api/cart/update/', views.update_cart_item, name='update_cart'),
    path('api/cart/remove/', views.remove_from_cart, name='remove_from_cart'),
    
    
    path('api/favorites/', views.get_favorites, name='get_favorites'),
    path('api/favorites/add/', views.add_to_favorites, name='add_to_favorites'),
    path('api/favorites/remove/', views.remove_from_favorites, name='remove_from_favorites'),
    
    
    path('api/orders/create/', views.create_order, name='create_order'),  # POST - сначала create
    path('api/orders/', views.get_orders, name='get_orders'),              # GET - потом get
    
    
    path('api/test/', views.test_api, name='test_api'),
    
    
    path('api/', include(router.urls)),
]