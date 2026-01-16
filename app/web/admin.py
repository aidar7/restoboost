from fastapi import APIRouter, Request, Query
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from datetime import datetime, timedelta
from typing import Optional, List
from zoneinfo import ZoneInfo

from app.services.restaurant_service import restaurant_service, timeslot_service
from app.services.booking_service import booking_service

router = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.get("/", response_class=HTMLResponse)
async def admin(
    request: Request,
    category: Optional[str] = Query(None),
    deleted_only: bool = Query(False)
):
    """Админка для добавления ресторанов"""
    kwargs = {"include_deleted": True}
    
    if category and category != "all":
        kwargs["category"] = category
    
    if deleted_only:
        kwargs["include_deleted"] = False  # только неактивные
    
    restaurants = await restaurant_service.get_all(**kwargs)
    
    return templates.TemplateResponse(
        request=request,
        name="admin.html",
        context={
            "restaurants": restaurants,
            "category": category,
            "deleted_only": deleted_only
        }
    )


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    """Dashboard для администратора"""
    
    # Сегодняшние брони (Asia/Almaty)
    today_str = datetime.now(ZoneInfo("Asia/Almaty")).strftime("%Y-%m-%d")
    today_bookings = await booking_service.get_all(date=today_str, limit=100)
    
    # Последние 500 броней для недельной статистики
    recent_bookings = await booking_service.get_all(limit=500)
    
    # Все рестораны
    restaurants = await restaurant_service.get_all(include_deleted=True)
    
    # Статистика
    today_count = len(today_bookings)
    
    # Неделя назад
    week_ago = datetime.now(ZoneInfo("Asia/Almaty")) - timedelta(days=7)
    week_count = sum(1 for b in recent_bookings 
                    if datetime.fromisoformat(b['created_at'].replace('Z', '+00:00')).date() >= week_ago.date())
    
    total_guests = sum(b.get("party_size", 2) for b in today_bookings)
    active_restaurants = len([r for r in restaurants if r.get("is_active")])
    
    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={
            "today_bookings": today_bookings,
            "total": len(today_bookings),
            "today_count": today_count,
            "week_count": week_count,
            "total_guests": total_guests,
            "active_restaurants": active_restaurants,
            "restaurants": restaurants[:10]  # первые 10 для превью
        }
    )
