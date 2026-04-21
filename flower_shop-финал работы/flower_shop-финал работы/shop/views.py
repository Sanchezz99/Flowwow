

import json
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import User, Flower, Cart, CartItem, Favorite, Order, OrderItem
from .serializers import FlowerSerializer

logger = logging.getLogger(__name__)
import logging


logger = logging.getLogger(__name__)


logger.info("=" * 50)
logger.info("МОДУЛЬ VIEWS ЗАГРУЖЕН")
logger.info("=" * 50)

@api_view(['GET'])
@permission_classes([AllowAny])
def test_api(request):
    """Тестовый эндпоинт с логированием"""
    
    # ТЕСТОВЫЕ ЛОГИ
    logger.debug("DEBUG: Вызван test_api")
    logger.info("INFO: Вызван test_api")
    logger.warning("WARNING: Вызван test_api")
    logger.error("ERROR: Вызван test_api")
    
    print("PRINT: test_api вызван") 
    
    return Response({
        'status': 'ok',
        'message': 'API работает',
        'logs_written': True
    })



@api_view(['GET'])
@permission_classes([AllowAny])
def test_api(request):
    return Response({
        'status': 'ok',
        'message': 'API работает',
        'endpoints': [
            '/api/register/',
            '/api/login/',
            '/api/flowers/',
            '/api/cart/',
            '/api/cart/add/',
            '/api/favorites/',
            '/api/orders/',
            '/api/orders/create/'
        ]
    })



@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """Регистрация нового пользователя"""
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({'error': 'Логин и пароль обязательны'}, status=400)
        
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Пользователь с таким логином уже существует'}, status=400)
        
        if len(username) < 3:
            return Response({'error': 'Логин должен содержать не менее 3 символов'}, status=400)
        
        if len(password) < 4:
            return Response({'error': 'Пароль должен содержать не менее 4 символов'}, status=400)
        
        user = User.objects.create_user(username=username, password=password)
        refresh = RefreshToken.for_user(user)
        
        # Создаем корзину для пользователя
        Cart.objects.get_or_create(user=user)
        
        return Response({
            'token': str(refresh.access_token),
            'user_id': user.id,
            'username': user.username,
            'avatar': user.avatar.url if user.avatar else None
        }, status=201)
    except Exception as e:
        logger.error(f"Register error: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """Вход пользователя"""
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(username=username, password=password)
        
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'token': str(refresh.access_token),
                'user_id': user.id,
                'username': user.username,
                'avatar': user.avatar.url if user.avatar else None,
                'is_superuser': user.is_superuser
            })
        else:
            return Response({'error': 'Неверный логин или пароль'}, status=401)
    except Exception as e:
        logger.error(f"Login error: {e}")
        return Response({'error': str(e)}, status=500)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request, user_id):
    """Смена пароля"""
    try:
        if request.user.id != int(user_id):
            return Response({'error': 'Нет прав'}, status=403)
        
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not request.user.check_password(current_password):
            return Response({'error': 'Текущий пароль неверен'}, status=400)
        
        if len(new_password) < 4:
            return Response({'error': 'Новый пароль должен содержать не менее 4 символов'}, status=400)
        
        request.user.set_password(new_password)
        request.user.save()
        
        return Response({'status': 'success'})
    except Exception as e:
        logger.error(f"Change password error: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request, user_id):
    """Загрузка аватара"""
    try:
        if request.user.id != int(user_id):
            return Response({'error': 'Нет прав'}, status=403)
        
        avatar_file = request.FILES.get('avatar')
        if avatar_file:
            request.user.avatar = avatar_file
            request.user.save()
            return Response({'avatar': request.user.avatar.url})
        
        return Response({'error': 'Файл не загружен'}, status=400)
    except Exception as e:
        logger.error(f"Upload avatar error: {e}")
        return Response({'error': str(e)}, status=500)



class FlowerViewSet(viewsets.ModelViewSet):
    queryset = Flower.objects.all()
    serializer_class = FlowerSerializer
    permission_classes = [AllowAny]



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cart(request):
    """Получение корзины пользователя"""
    try:
        user_id = request.query_params.get('userId')
        
        if not user_id:
            return Response({'cart': []})
        
        if int(user_id) != request.user.id:
            return Response({'error': 'Нет прав'}, status=403)
        
        cart, created = Cart.objects.get_or_create(user=request.user)
        cart_items = cart.cart_items.select_related('flower').all()
        
        items = []
        for item in cart_items:
            items.append({
                'id': item.flower.id,
                'name': item.flower.name,
                'price': float(item.flower.price),
                'quantity': item.quantity,
                'image': item.flower.image.url if item.flower.image else None,
                'description': item.flower.description
            })
        
        return Response({'cart': items})
    except Exception as e:
        logger.error(f"Get cart error: {e}")
        return Response({'cart': []}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    """Добавление товара в корзину"""
    try:
        user_id = request.data.get('userId')
        product_id = request.data.get('productId')
        quantity = request.data.get('quantity', 1)
        
        if not user_id or not product_id:
            return Response({'error': 'Не указан userId или productId'}, status=400)
        
        if int(user_id) != request.user.id:
            return Response({'error': 'Нет прав'}, status=403)
        
        flower = get_object_or_404(Flower, id=product_id)
        cart, created = Cart.objects.get_or_create(user=request.user)
        
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            flower=flower,
            defaults={'quantity': quantity}
        )
        
        if not created:
            cart_item.quantity += quantity
            cart_item.save()
        
        return Response({'status': 'added', 'quantity': cart_item.quantity})
    except Exception as e:
        logger.error(f"Add to cart error: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_cart_item(request):
    """Обновление количества товара в корзине"""
    try:
        user_id = request.data.get('userId')
        product_id = request.data.get('productId')
        quantity = request.data.get('quantity')
        
        if not user_id or not product_id or quantity is None:
            return Response({'error': 'Не все параметры указаны'}, status=400)
        
        if int(user_id) != request.user.id:
            return Response({'error': 'Нет прав'}, status=403)
        
        cart = get_object_or_404(Cart, user=request.user)
        cart_item = get_object_or_404(CartItem, cart=cart, flower_id=product_id)
        
        if quantity <= 0:
            cart_item.delete()
            return Response({'status': 'removed'})
        else:
            cart_item.quantity = quantity
            cart_item.save()
            return Response({'status': 'updated', 'quantity': cart_item.quantity})
    except Exception as e:
        logger.error(f"Update cart error: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request):
    """Удаление товара из корзины"""
    try:
        user_id = request.data.get('userId')
        product_id = request.data.get('productId')
        
        if not user_id or not product_id:
            return Response({'error': 'Не указан userId или productId'}, status=400)
        
        if int(user_id) != request.user.id:
            return Response({'error': 'Нет прав'}, status=403)
        
        cart = get_object_or_404(Cart, user=request.user)
        CartItem.objects.filter(cart=cart, flower_id=product_id).delete()
        
        return Response({'status': 'removed'})
    except Exception as e:
        logger.error(f"Remove from cart error: {e}")
        return Response({'error': str(e)}, status=500)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_favorites(request):
    """Получение избранного пользователя"""
    try:
        user_id = request.query_params.get('userId')
        
        if not user_id:
            return Response({'favorites': []})
        
        if int(user_id) != request.user.id:
            return Response({'error': 'Нет прав'}, status=403)
        
        favorites = Favorite.objects.filter(user=request.user).values_list('flower_id', flat=True)
        return Response({'favorites': list(favorites)})
    except Exception as e:
        logger.error(f"Get favorites error: {e}")
        return Response({'favorites': []}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_favorites(request):
    """Добавление в избранное"""
    try:
        user_id = request.data.get('userId')
        product_id = request.data.get('productId')
        
        if not user_id or not product_id:
            return Response({'error': 'Не указан userId или productId'}, status=400)
        
        if int(user_id) != request.user.id:
            return Response({'error': 'Нет прав'}, status=403)
        
        flower = get_object_or_404(Flower, id=product_id)
        Favorite.objects.get_or_create(user=request.user, flower=flower)
        
        return Response({'status': 'added'})
    except Exception as e:
        logger.error(f"Add to favorites error: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_from_favorites(request):
    """Удаление из избранного"""
    try:
        user_id = request.data.get('userId')
        product_id = request.data.get('productId')
        
        if not user_id or not product_id:
            return Response({'error': 'Не указан userId или productId'}, status=400)
        
        if int(user_id) != request.user.id:
            return Response({'error': 'Нет прав'}, status=403)
        
        Favorite.objects.filter(user=request.user, flower_id=product_id).delete()
        
        return Response({'status': 'removed'})
    except Exception as e:
        logger.error(f"Remove from favorites error: {e}")
        return Response({'error': str(e)}, status=500)





@api_view(['GET', 'POST'])  
@permission_classes([IsAuthenticated])
def get_orders(request):
   
    if request.method == 'POST':
        return create_order(request)
    
    
    try:
        user_id = request.query_params.get('userId')
        
        if not user_id:
            return Response({'orders': []})
        
        if int(user_id) != request.user.id:
            return Response({'error': 'Нет прав'}, status=403)
        
        orders = Order.objects.filter(user=request.user).order_by('-created_at')
        
        result = []
        for order in orders:
            items = []
            for item in order.order_items.select_related('flower').all():
                items.append({
                    'productName': item.flower.name,
                    'productImage': item.flower.image.url if item.flower.image else None,
                    'quantity': item.quantity,
                    'price': float(item.price_at_time)
                })
            
            result.append({
                'id': order.id,
                'totalAmount': float(order.total_price),
                'address': order.address,
                'phone': order.phone,
                'customerName': order.user.username,
                'comment': order.comment,
                'created_at': order.created_at.isoformat(),
                'items': items
            })
        
        return Response({'orders': result})
    except Exception as e:
        logger.error(f"Get orders error: {e}")
        return Response({'orders': []}, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    """Создание заказа"""
    print("=" * 50)
    print("CREATE ORDER CALLED")
    print(f"User: {request.user.username} (ID: {request.user.id})")
    print(f"Request data: {request.data}")
    print("=" * 50)
    
    try:
        data = request.data
        user_id = data.get('userId')
        
        if not user_id:
            return Response({'error': 'Не указан userId'}, status=400)
        
        if int(user_id) != request.user.id:
            return Response({'error': 'Нет прав'}, status=403)
        
        items = data.get('items', [])
        
        if not items:
            return Response({'error': 'Нет товаров для заказа'}, status=400)
        
        # Создаем заказ
        order = Order.objects.create(
            user=request.user,
            address=data.get('address', ''),
            phone=data.get('phone', ''),
            comment=data.get('comment', ''),
            total_price=0
        )
        
        print(f"Order created: #{order.id}")
        
        total = 0
        for item in items:
            flower_id = item.get('productId')
            quantity = item.get('quantity', 1)
            
            if flower_id:
                flower = get_object_or_404(Flower, id=flower_id)
                price = float(flower.price)
                name = flower.name
            else:
                price = float(item.get('price', 0))
                name = item.get('productName', 'Товар')
                flower = None
            
            OrderItem.objects.create(
                order=order,
                flower=flower,
                quantity=quantity,
                price_at_time=price
            )
            total += price * quantity
            print(f"Added item: {name} x{quantity} = {price * quantity} ₽")
        
        order.total_price = total
        order.save()
        
        print(f"Order total: {total} ₽")
        print("=" * 50)
        
        return Response({
            'status': 'success',
            'order_id': order.id,
            'message': f'Заказ #{order.id} успешно создан'
        }, status=201)
        
    except Exception as e:
        print(f"Error creating order: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)