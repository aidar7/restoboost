"""
Main application entry point
RestoBoost - Restaurant booking platform with dynamic discounts
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

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


# main.py - обнови CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL' ) else "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
 )





# Статические файлы
app.mount("/static", StaticFiles(directory="static"), name="static")


# ============================================
# ПОДКЛЮЧЕНИЕ РОУТОВ
# ============================================

# API endpoints
app.include_router(restaurants.router, prefix="/api/restaurants", tags=["Restaurants"])
app.include_router(bookings_router, prefix="/api/bookings")
app.include_router(photos.router, prefix="/api", tags=["Photos"])

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
    
    📖 Docs: http://127.0.0.1:8000/docs
    🏠 Home: http://127.0.0.1:8000/
    👨‍💼 Admin: http://127.0.0.1:8000/admin
    📊 Dashboard: http://127.0.0.1:8000/admin/dashboard
    """)
    
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=settings.DEBUG
    )
