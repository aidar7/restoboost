"""
Web pages router
Handles all HTML page rendering
"""
import json
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional
from fastapi import APIRouter, Request, Query
from fastapi.responses import HTMLResponse
from app.services.restaurant_service import restaurant_service
from app.services.booking_service import booking_service

router = APIRouter()


def get_templates():
    """Get templates instance from main app"""
    from main import templates
    return templates


@router.get("/", response_class=HTMLResponse)
async def index(
    request: Request, 
    category: str = Query("all", pattern=r"^(all|restaurant|cafe|street_food|bar|bakery)?$")
):
    """
    Main page with restaurants list
    """
    templates_ = get_templates()
    
    # Get all active restaurants (include_deleted=False по умолчанию)
    restaurants = await restaurant_service.get_all(
        # category=category if category != "all" else None,
        limit=50
    )
    
    return templates_.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "restaurants": restaurants,
            "category": category,
            "categories": ["all", "restaurant", "cafe", "street_food", "bar", "bakery"]
        }
    )


@router.get("/restaurant/{rid}", response_class=HTMLResponse)
async def restaurant(request: Request, rid: int):
    """
    Restaurant details page with booking form
    """
    templates_ = get_templates()
    
    restaurant = await restaurant_service.get_by_id(rid)
    
    if not restaurant:
        return HTMLResponse(
            content="""
            <html>
                <head>
                    <title>Ресторан не найден</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            text-align: center; 
                            padding: 50px;
                            background: #f9fafb;
                        }
                        h1 { color: #ef4444; font-size: 48px; margin-bottom: 20px; }
                        p { font-size: 18px; color: #6b7280; }
                        a { 
                            color: #3b82f6; 
                            text-decoration: none; 
                            font-weight: bold;
                            font-size: 18px;
                        }
                        a:hover { text-decoration: underline; }
                    </style>
                </head>
                <body>
                    <h1>🍽️ Ресторан не найден</h1>
                    <p>К сожалению, такого ресторана не существует.</p>
                    <p style="margin-top: 30px;">
                        <a href="/">← Вернуться на главную</a>
                    </p>
                </body>
            </html>
            """,
            status_code=404
        )
    
    # Current date for booking form (Kazakhstan timezone)
    now = datetime.now(ZoneInfo("Asia/Almaty")).strftime("%Y-%m-%d")
    
    # Photos for lightbox
    photos_json = json.dumps(restaurant.get("photos", []))
    
    return templates_.TemplateResponse(
        request=request,
        name="restaurant.html",
        context={
            "restaurant": restaurant,
            "now": now,
            "photos_json": photos_json,
            "timeslots": restaurant.get("timeslots", [])
        }
    )


@router.get("/my-bookings", response_class=HTMLResponse)
async def my_bookings(request: Request, phone: Optional[str] = Query(None)):
    """
    User bookings page
    """
    templates_ = get_templates()
    
    bookings = []
    
    if phone:
        # Эффективный запрос через сервис
        bookings = await booking_service.get_all(phone=phone.strip(), limit=50)
        # Сервис уже сортирует по created_at.desc
    
    return templates_.TemplateResponse(
        request=request,
        name="my_bookings.html",
        context={
            "bookings": bookings,
            "phone": phone or "",
            "empty_message": "Введите номер телефона для просмотра броней" if not phone else None
        }
    )
