from typing import List, Optional, Dict, Any
from datetime import datetime
from zoneinfo import ZoneInfo
from app.core.database import db
from app.core.config import settings
import traceback


class BookingService:
    """Сервис для работы с бронированиями"""
    
    @staticmethod
    async def get_all(
        phone: Optional[str] = None,
        restaurant_id: Optional[int] = None,
        status: Optional[str] = None,
        date: Optional[str] = None,
        limit: int = 100
    ) -> List[dict]:
        """Получить список броней"""
        filters = {}
        
        if phone:
            filters["guest_phone"] = f"eq.{phone.strip()}"
        
        if restaurant_id:
            filters["restaurant_id"] = f"eq.{restaurant_id}"
        
        if status:
            filters["status"] = f"eq.{status}"
        
        bookings = await db.get(
            "bookings",
            filters=filters,
            order="created_at.desc",
            limit=limit
        )
        
        return bookings or []
    
    @staticmethod
    async def get_by_id(booking_id: int) -> Optional[dict]:
        """Получить бронь по ID"""
        filters = {"id": f"eq.{booking_id}"}
        bookings = await db.get("bookings", filters=filters)
        
        if bookings and len(bookings) > 0:
            return bookings[0]
        return None
    
    @staticmethod
    async def create(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Создать бронь"""
        print("=== DEBUG booking_service.create ===")
        print("Input data:", data)
    
        # Добавляем дефолтные значения
        data.setdefault('status', 'confirmed')
        data.setdefault('discount_applied', 0)
        
        print("Data after defaults:", data)
    
        try:
            result = await db.post("bookings", data, return_rep=True)
            print("Supabase db.post result:", result)
            print("Result type:", type(result))
            
            # result это список [{}] или None
            if result and isinstance(result, list) and len(result) > 0:
                print("✅ SUCCESS, returning first item:", result[0])
                return result[0]
            else:
                print("❌ EMPTY result или None")
                print("Full result object:", result)
                return None
                
        except Exception as e:
            print("❌ EXCEPTION in db.post:", str(e))
            traceback.print_exc()
            return None

    
    @staticmethod
    async def update_status(booking_id: int, status: str) -> bool:
        """Обновить статус брони"""
        valid_statuses = ["confirmed", "cancelled", "completed", "no_show"]
        
        if status not in valid_statuses:
            return False
        
        filters = {"id": f"eq.{booking_id}"}
        return await db.patch("bookings", filters, {"status": status})
    
    @staticmethod
    async def cancel(booking_id: int) -> bool:
        """Отменить бронь"""
        return await BookingService.update_status(booking_id, "cancelled")
    
    @staticmethod
    async def delete(booking_id: int) -> bool:
        """Удалить бронь"""
        filters = {"id": f"eq.{booking_id}"}
        return await db.delete("bookings", filters)


booking_service = BookingService()
