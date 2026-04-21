

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django import forms
from django.utils.html import format_html, mark_safe
from .models import User, Flower, Cart, CartItem, Favorite, Order, OrderItem



class FlowerAdminForm(forms.ModelForm):
    category = forms.ChoiceField(
        choices=Flower.CATEGORY_CHOICES,
        label='Категория',
        widget=forms.Select(attrs={'class': 'vTextField', 'style': 'width: 300px;'})
    )
    
    class Meta:
        model = Flower
        fields = '__all__'



class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'phone', 'address', 'is_staff', 'created_at')
    list_filter = ('is_staff', 'is_active', 'created_at')
    search_fields = ('username', 'email', 'phone')
    readonly_fields = ('created_at',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('Дополнительная информация', {
            'fields': ('phone', 'address', 'avatar', 'created_at')
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('groups', 'user_permissions')



class FlowerAdmin(admin.ModelAdmin):
    form = FlowerAdminForm
    list_display = ('get_image_preview', 'name', 'get_category_display', 'price', 'old_price', 'rating', 'stock', 'is_popular', 'is_new', 'created_at')
    list_filter = ('category', 'is_popular', 'is_new', 'created_at', 'rating')
    search_fields = ('name', 'description')
    list_editable = ('price', 'old_price', 'stock', 'rating', 'is_popular', 'is_new')
    list_per_page = 20
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'description', 'category', 'image')
        }),
        ('Цены и наличие', {
            'fields': ('price', 'old_price', 'stock', 'rating', 'reviews')
        }),
        ('Дополнительные метки', {
            'fields': ('is_popular', 'is_new'),
            'classes': ('wide',),
            'description': 'Отметьте, если товар популярный или новинка'
        }),
        ('Системная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 50px; height: 50px; object-fit: cover;" />', obj.image.url)
        return mark_safe('<span>Нет фото</span>')
    get_image_preview.short_description = 'Фото'
    
    def get_category_display(self, obj):
        return obj.get_category_display()
    get_category_display.short_description = 'Категория'
    get_category_display.admin_order_field = 'category'
    
    actions = ['mark_as_popular', 'mark_as_not_popular', 'mark_as_new', 'mark_as_not_new', 'increase_price', 'decrease_price']
    
    def mark_as_popular(self, request, queryset):
        updated = queryset.update(is_popular=True)
        self.message_user(request, f'{updated} товар(ов) отмечены как популярные')
    mark_as_popular.short_description = 'Отметить как популярные'
    
    def mark_as_not_popular(self, request, queryset):
        updated = queryset.update(is_popular=False)
        self.message_user(request, f'{updated} товар(ов) убраны из популярных')
    mark_as_not_popular.short_description = 'Убрать из популярных'
    
    def mark_as_new(self, request, queryset):
        updated = queryset.update(is_new=True)
        self.message_user(request, f'{updated} товар(ов) отмечены как новинки')
    mark_as_new.short_description = 'Отметить как новинки'
    
    def mark_as_not_new(self, request, queryset):
        updated = queryset.update(is_new=False)
        self.message_user(request, f'{updated} товар(ов) убраны из новинок')
    mark_as_not_new.short_description = 'Убрать из новинок'
    
    def increase_price(self, request, queryset):
        for flower in queryset:
            flower.price = flower.price * 1.1
            flower.save()
        self.message_user(request, f'Цены увеличены на 10% для {queryset.count()} товаров')
    increase_price.short_description = 'Увеличить цену на 10 процентов'
    
    def decrease_price(self, request, queryset):
        for flower in queryset:
            flower.price = flower.price * 0.9
            flower.save()
        self.message_user(request, f'Цены уменьшены на 10% для {queryset.count()} товаров')
    decrease_price.short_description = 'Уменьшить цену на 10 процентов'



class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 1
    raw_id_fields = ('flower',)
    readonly_fields = ('flower_name', 'get_total_price', 'added_at')
    fields = ('flower', 'flower_name', 'quantity', 'get_total_price', 'added_at')
    
    def flower_name(self, obj):
        return obj.flower.name if obj.flower else '-'
    flower_name.short_description = 'Товар'
    
    def get_total_price(self, obj):
        if obj.id:
            return f'{obj.get_total_price():.2f} ₽'
        return '0 ₽'
    get_total_price.short_description = 'Сумма'
    
    def has_add_permission(self, request, obj=None):
        return True
    
    def has_delete_permission(self, request, obj=None):
        return True

class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'get_total_items', 'get_total_price', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at', 'get_total_price', 'get_total_items', 'get_items_list')
    inlines = [CartItemInline]
    
    fieldsets = (
        ('Информация о корзине', {
            'fields': ('user', 'get_total_items', 'get_total_price', 'get_items_list')
        }),
        ('Системная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_total_price(self, obj):
        return f'{obj.get_total_price():.2f} ₽'
    get_total_price.short_description = 'Общая сумма'
    
    def get_total_items(self, obj):
        return obj.get_total_items()
    get_total_items.short_description = 'Количество товаров'
    
    def get_items_list(self, obj):
        items = obj.cart_items.all()
        if not items:
            return mark_safe('<span>Корзина пуста</span>')
        
        html = '<table style="width:100%; border-collapse: collapse;">'
        html += '<tr style="background-color: #f2f2f2;"><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><tr>'
        
        for item in items:
            html += '<tr>'
            html += '<td style="padding: 8px; border-bottom: 1px solid #ddd;">' + str(item.flower.name) + '</td>'
            html += '<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">' + str(item.quantity) + '</td>'
            html += '<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">' + f'{item.flower.price:.2f}' + ' ₽</td>'
            html += '<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><strong>' + f'{item.get_total_price():.2f}' + ' ₽</strong></td>'
            html += '</tr>'
        
        html += '</table>'
        return mark_safe(html)
    get_items_list.short_description = 'Состав корзины'
    
    actions = ['clear_cart']
    
    def clear_cart(self, request, queryset):
        for cart in queryset:
            cart.cart_items.all().delete()
        self.message_user(request, f'Корзины очищены для {queryset.count()} пользователей')
    clear_cart.short_description = 'Очистить выбранные корзины'



class FavoriteAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'flower', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'user__email', 'flower__name')
    raw_id_fields = ('user', 'flower')
    readonly_fields = ('created_at',)



class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('flower', 'flower_name', 'quantity', 'price_at_time', 'get_total_price')
    raw_id_fields = ('flower',)
    can_delete = True
    fields = ('flower', 'flower_name', 'quantity', 'price_at_time', 'get_total_price')
    
    def flower_name(self, obj):
        return obj.flower.name if obj.flower else '-'
    flower_name.short_description = 'Товар'
    
    def get_total_price(self, obj):
        if obj.id:
            return f'{obj.get_total_price():.2f} ₽'
        return '0 ₽'
    get_total_price.short_description = 'Сумма'
    
    def has_add_permission(self, request, obj=None):
        return True
    
    def has_delete_permission(self, request, obj=None):
        return True

class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total_price', 'status', 'get_items_count', 'phone', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'user__email', 'address', 'phone', 'id')
    list_editable = ('status',)
    readonly_fields = ('total_price', 'created_at', 'updated_at', 'get_items_display')
    inlines = [OrderItemInline]
    
    actions = ['confirm_orders', 'cancel_orders', 'mark_as_delivered']
    
    fieldsets = (
        ('Информация о заказе', {
            'fields': ('user', 'status', 'total_price', 'get_items_display')
        }),
        ('Данные для доставки', {
            'fields': ('address', 'phone', 'comment')
        }),
        ('Системная информация', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_items_count(self, obj):
        return obj.order_items.count()
    get_items_count.short_description = 'Товаров'
    
    def get_items_display(self, obj):
        items = obj.order_items.select_related('flower').all()
        if not items:
            return mark_safe('<span>Нет товаров</span>')
        
        html = '<table style="width:100%; border-collapse: collapse;">'
        html += '<tr style="background-color: #f2f2f2;"><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr>'
        
        for item in items:
            html += '<tr>'
            html += '<td style="padding: 8px; border-bottom: 1px solid #ddd;">' + str(item.flower.name) + '</td>'
            html += '<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">' + str(item.quantity) + '</td>'
            html += '<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">' + f'{item.price_at_time:.2f}' + ' ₽</td>'
            html += '<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;"><strong>' + f'{item.get_total_price():.2f}' + ' ₽</strong></td>'
            html += '</tr>'
        
        html += '<tr style="background-color: #f9f9f9; font-weight: bold;">'
        html += '<td colspan="3" style="padding: 8px; text-align: right;">ИТОГО:</td>'
        html += '<td style="padding: 8px; text-align: right;">' + f'{obj.total_price:.2f}' + ' ₽</td>'
        html += '</tr>'
        html += '</table>'
        return mark_safe(html)
    get_items_display.short_description = 'Состав заказа'
    
    def confirm_orders(self, request, queryset):
        updated = queryset.update(status='confirmed')
        self.message_user(request, f'{updated} заказ(ов) подтверждены')
    confirm_orders.short_description = 'Подтвердить выбранные заказы'
    
    def cancel_orders(self, request, queryset):
        updated = queryset.update(status='cancelled')
        self.message_user(request, f'{updated} заказ(ов) отменены')
    cancel_orders.short_description = 'Отменить выбранные заказы'
    
    def mark_as_delivered(self, request, queryset):
        updated = queryset.update(status='delivered')
        self.message_user(request, f'{updated} заказ(ов) отмечены как доставленные')
    mark_as_delivered.short_description = 'Отметить как доставленные'



admin.site.register(User, CustomUserAdmin)
admin.site.register(Flower, FlowerAdmin)
admin.site.register(Cart, CartAdmin)
admin.site.register(Favorite, FavoriteAdmin)
admin.site.register(Order, OrderAdmin)