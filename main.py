"""
Main application entry point
RestoBoost - Restaurant booking platform with dynamic discounts
"""
from fastapi import FastAPI, Header
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.config import settings
from app.api import restaurants, bookings, photos
from app.api.bookings import router as bookings_router

# ============================================
# ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
# ============================================
 
app = FastAPI(
    title="RestoBoost API",
    description="Restaurant booking platform with dynamic discounts",
    version="2.0.0",
    debug=settings.DEBUG
)


# CORS для Next.js фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://restoboost-front.onrender.com",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Статические файлы
app.mount("/static", StaticFiles(directory="static"), name="static")


# ============================================
# MODELS
# ============================================

class RegisterRequest(BaseModel):
    """Модель для регистрации"""
    email: EmailStr
    password: str
    full_name: str
    phone: str
    role: str = "customer"  # customer, restaurant_owner, admin

class LoginRequest(BaseModel):
    """Модель для логина"""
    email: EmailStr
    password: str


# ============================================
# ПОДКЛЮЧЕНИЕ РОУТОВ
# ============================================

# API endpoints
app.include_router(restaurants.router, prefix="/api/restaurants", tags=["Restaurants"])
app.include_router(bookings_router, prefix="/api/bookings")
app.include_router(photos.router, prefix="/api", tags=["Photos"])


# ============================================
# AUTH ENDPOINTS
# ============================================

@app.post("/api/auth/register", response_model=dict)
async def register(request: RegisterRequest):
    """
    Регистрация нового пользователя
    
    - **email**: Email адрес
    - **password**: Пароль (минимум 6 символов)
    - **full_name**: Полное имя
    - **phone**: Номер телефона
    - **role**: Роль (customer, restaurant_owner, admin)
    """
    try:
        from app.services.auth_service import auth_service
        
        result = await auth_service.register(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            phone=request.phone,
            role=request.role
        )
        return result
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/auth/login", response_model=dict)
async def login(request: LoginRequest):
    """
    Логин пользователя
    
    - **email**: Email адрес
    - **password**: Пароль
    
    Возвращает JWT токен
    """
    try:
        from app.services.auth_service import auth_service
        
        result = await auth_service.login(
            email=request.email,
            password=request.password
        )
        return result
    except Exception as e:
        return {"error": str(e)}, 401


@app.get("/api/auth/user", response_model=dict)
async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Получить текущего пользователя
    
    Требуется JWT токен в заголовке Authorization: Bearer <token>
    """
    try:
        from app.services.auth_service import auth_service
        
        if not authorization:
            return {"error": "Authorization header required"}, 401
        
        # Извлекаем токен из "Bearer <token>"
        token = authorization.replace("Bearer ", "")
        
        result = await auth_service.verify_token(token)
        return result
    except Exception as e:
        return {"error": str(e)}, 401


@app.post("/api/auth/logout", response_model=dict)
async def logout():
    """
    Логаут пользователя (просто удалить токен на фронтенде)
    """
    return {"message": "Logged out successfully"}


# ============================================
# СЛУЖЕБНЫЕ ENDPOINTS
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "version": "2.0.0",
        "supabase": "connected" if settings.SUPABASE_URL else "not configured"
    }


@app.get("/api/categories")
async def get_categories():
    """Возвращает категории"""
    try:
        from app.services.restaurant_service import restaurant_service
        
        # Добавляем таймаут 5 секунд
        import asyncio
        restaurants = await asyncio.wait_for(
            restaurant_service.get_all(),
            timeout=5.0
        )
        
        if not restaurants:
            # Если нет ресторанов, возвращаем нули
            return [
                {"id": "all", "name": "Все", "count": 0},
                {"id": "restaurant", "name": "Рестораны", "count": 0},
                {"id": "cafe", "name": "Кофе", "count": 0},
                {"id": "street_food", "name": "Street Food", "count": 0},
                {"id": "bar", "name": "Бары", "count": 0},
                {"id": "bakery", "name": "Пекарни", "count": 0}
            ]
        
        categories = [
            {"id": "all", "name": "Все", "count": len(restaurants)},
            {"id": "restaurant", "name": "Рестораны", "count": len([r for r in restaurants if r.get("category") == "restaurant"])},
            {"id": "cafe", "name": "Кофе", "count": len([r for r in restaurants if r.get("category") == "cafe"])},
            {"id": "street_food", "name": "Street Food", "count": len([r for r in restaurants if r.get("category") == "street_food"])},
            {"id": "bar", "name": "Бары", "count": len([r for r in restaurants if r.get("category") == "bar"])},
            {"id": "bakery", "name": "Пекарни", "count": len([r for r in restaurants if r.get("category") == "bakery"])}
        ]
        
        return categories
        
    except asyncio.TimeoutError:
        print("❌ Timeout при получении ресторанов!")
        return [
            {"id": "all", "name": "Все", "count": 0},
            {"id": "restaurant", "name": "Рестораны", "count": 0},
            {"id": "cafe", "name": "Кофе", "count": 0},
            {"id": "street_food", "name": "Street Food", "count": 0},
            {"id": "bar", "name": "Бары", "count": 0},
            {"id": "bakery", "name": "Пекарни", "count": 0}
        ]
    except Exception as e:
        print(f"❌ Ошибка в get_categories: {e}")
        import traceback
        traceback.print_exc()
        return [
            {"id": "all", "name": "Все", "count": 0},
            {"id": "restaurant", "name": "Рестораны", "count": 0},
            {"id": "cafe", "name": "Кофе", "count": 0},
            {"id": "street_food", "name": "Street Food", "count": 0},
            {"id": "bar", "name": "Бары", "count": 0},
            {"id": "bakery", "name": "Пекарни", "count": 0}
        ]


# ============================================
# EVENTS
# ============================================

@app.on_event("startup")
async def startup_event():
    """Application startup event"""
    print("\n" + "="*50)
    print(f"🚀 {app.title} v{app.version}")
    print(f"📍 Starting server...")
    print(f"🗄️  Supabase: {'✅ Connected' if settings.SUPABASE_URL else '❌ Not configured'}")
    print(f"🔧 Debug mode: {'✅ Enabled' if settings.DEBUG else '❌ Disabled'}")
    print("="*50 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event"""
    print("\n👋 RestoBoost shutting down...")


# ============================================
# ЗАПУСК ПРИЛОЖЕНИЯ
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    # Pretty startup banner
    print(f"""
    ╔═══════════════════════════════════════════╗
    ║   🍽️  RestoBoost API v2.0.0               ║
    ║   📍 http://127.0.0.1:8000                ║
    ║   🔧 Debug: {'✅ ON' if settings.DEBUG else '❌ OFF'}                        ║
    ║   🗄️  Supabase: {'✅ Connected' if settings.SUPABASE_URL else '❌ Not configured'}            ║
    ╚═══════════════════════════════════════════╝
    
    📖 API Docs: http://127.0.0.1:8000/docs
    🏥 Health: http://127.0.0.1:8000/health
    🍽️  Restaurants: http://127.0.0.1:8000/api/restaurants
    """)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
