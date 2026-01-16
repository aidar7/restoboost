"""
API Endpoints for Bookings - TheFork-style Architecture
Works with new DB structure: restaurant_hours, restaurant_services, service_capacity, discount_rules
Returns format: {time, available, discount} for frontend compatibility
"""
from fastapi import APIRouter, HTTPException, Query, Form, Request
from typing import Optional, Dict, Tuple, List
from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo


from app.services.booking_service import booking_service
from app.core.database import db

router = APIRouter()

# 🔥 Простой кэш для async функций с TTL
_slots_cache: Dict[Tuple[int, str], list] = {}
_cache_timestamps: Dict[Tuple[int, str], datetime] = {}
CACHE_TTL = timedelta(minutes=5)

def invalidate_cache(restaurant_id: int = None):
    """Очистить кэш слотов"""
    global _slots_cache, _cache_timestamps
    
    if restaurant_id:
        # Очистить кэш только для конкретного ресторана
        keys_to_delete = [k for k in _slots_cache.keys() if k[0] == restaurant_id]
        for key in keys_to_delete:
            del _slots_cache[key]
            del _cache_timestamps[key]
        print(f"✅ Кэш очищен для ресторана {restaurant_id}")
    else:
        # Очистить весь кэш
        _slots_cache.clear()
        _cache_timestamps.clear()
        print("✅ Весь кэш очищен")





async def get_cached_slots(restaurant_id: int, date_str: str):
    """
    Получить доступные слоты для бронирования.
    
    ✅ Алгоритм (TheFork-style):
    1. Получить часы работы ресторана на день недели
    2. Получить сервисы (услуги) в рамках часов работы
    3. Получить capacity для каждого сервиса
    4. Получить discount_rules для каждого сервиса
    5. Получить брони на эту дату
    6. Сгенерировать слоты и вычислить load
    
    ✅ Возвращает формат для фронтенда:
    {time, available, discount}
    """
    cache_key = (restaurant_id, date_str)
    now = datetime.now()
    
    # Проверяем кэш
    # if cache_key in _slots_cache and cache_key in _cache_timestamps:
    #     cache_time = _cache_timestamps[cache_key]
    # if (now - cache_time) < CACHE_TTL:
    #     return _slots_cache[cache_key]


    
    tz = ZoneInfo("Asia/Almaty")
    
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return []
    
    weekday = target_date.weekday()  # 0=Monday, 6=Sunday
    
    try:
        # 1️⃣ Получить часы работы ресторана на этот день недели
        hours_result = await db.get(
            table="restaurant_hours",
            filters={
                "restaurant_id": f"eq.{restaurant_id}",
                "weekday": f"eq.{weekday}",
                "is_closed": "eq.false"
            }
        )
        
        if not hours_result:
            print(f"⚠️ Нет restaurant_hours для ресторана {restaurant_id} на день {weekday}")
            # ✅ FALLBACK: Используем discount_rules напрямую!
            # Не возвращаем пустой список, продолжаем дальше
            hours = None
        else:
            hours = hours_result[0]

        if hours:
            open_time_str = hours.get("open_time", "10:00:00")
            close_time_str = hours.get("close_time", "23:00:00")
        else:
            # Используем время из discount_rules
            open_time_str = "10:00:00"
            close_time_str = "23:00:00"

        
        # 2️⃣ Получить сервисы (услуги) в рамках часов работы
        services_result = await db.get(
            table="restaurant_services",
            filters={
                "restaurant_id": f"eq.{restaurant_id}",
                "is_active": "eq.true"
            }
        )

        # FALLBACK: Если нет сервисов, используем discount_rules напрямую
        if not services_result:
            discount_result = await db.get(
                table="discount_rules",
                filters={
                    "restaurant_id": f"eq.{restaurant_id}",
                    "is_active": "eq.true",
                    "valid_from": f"lte.{date_str}",
                    "valid_to": f"gte.{date_str}"
                }
            )
            
            if not discount_result:
                return []
            
            # Генерируем слоты из discount_rules
            all_slots = []
            for rule in discount_result:
                time_start = rule.get("time_start", "10:00:00")
                time_end = rule.get("time_end", "23:00:00")
                discount = rule.get("discount", 0)
                
                # Парсим время и генерируем слоты каждый час
                try:
                    start_time = datetime.strptime(time_start, "%H:%M:%S").time()
                    end_time = datetime.strptime(time_end, "%H:%M:%S").time()
                except ValueError:
                    start_time = datetime.strptime(time_start, "%H:%M").time()
                    end_time = datetime.strptime(time_end, "%H:%M").time()
                
                slot_start = datetime.combine(target_date, start_time)  # ✅ ПРАВИЛЬНО!
                slot_end = datetime.combine(target_date, end_time)      # ✅ ПРАВИЛЬНО!

                step = timedelta(minutes=60)  # 60 мин интервал
                current = slot_start
                
                while current + step <= slot_end:
                    all_slots.append({
                        "time": current.strftime("%H:%M"),
                        "available": True,
                        "discount": discount
                    })
                    current += step
            
            _slots_cache[cache_key] = all_slots
            _cache_timestamps[cache_key] = now
            return all_slots
        

        
        # 3️⃣ Получить capacity для каждого сервиса
        all_slots = []
        
        for service in services_result:
            service_id = service.get("id")
            slot_step = service.get("slot_step_minutes", 60)
            
            # Получить capacity для этого сервиса
            capacity_result = await db.get(
                table="service_capacity",
                filters={
                    "service_id": f"eq.{service_id}",
                    "date": "is.null"
                }
            )
            
            if not capacity_result:
                capacity = 16
            else:
                capacity = capacity_result[0].get("capacity_seats", 16)
            
            # 4️⃣ Получить discount_rules для этого сервиса ПЕРЕД генерацией слотов!
            print(f"🔍 Ищу скидки для сервиса {service_id}, дата: {date_str}")
            discount_result = await db.get(
                table="discount_rules",
                filters={
                    "service_id": f"eq.{service_id}",
                    "is_active": "eq.true",
                    "valid_from": f"lte.{date_str}",
                    "valid_to": f"gte.{date_str}"
                }
            )

            print(f"📊 Найдено скидок: {len(discount_result)}")
            for rule in discount_result:
                print(f"  - {rule.get('valid_from')} до {rule.get('valid_to')}: {rule.get('discount')}%")
                print(f"    Время: {rule.get('time_start')} - {rule.get('time_end')}")
            
            # FALLBACK: Если нет по service_id, ищем по restaurant_id
            if not discount_result:
                print(f"⚠️ FALLBACK: Нет скидок по service_id, ищу по restaurant_id")
                discount_result = await db.get(
                    table="discount_rules",
                    filters={
                        "restaurant_id": f"eq.{restaurant_id}",
                        "is_active": "eq.true",
                        "valid_from": f"lte.{date_str}",
                        "valid_to": f"gte.{date_str}"
                    }
                )
                print(f"📊 FALLBACK: Найдено скидок: {len(discount_result)}")
            
            discount = 0
            if discount_result:
                discount = discount_result[0].get("discount", 0)
            
            # ✅ НОВОЕ: Используй время из discount_rules, если есть
            if discount_result:
                start_time_str = discount_result[0].get("time_start", "10:00:00")
                end_time_str = discount_result[0].get("time_end", "23:00:00")
                print(f"✅ Используем время из discount_rules: {start_time_str} - {end_time_str}")
            else:
                start_time_str = service.get("start_time", "10:00:00")
                end_time_str = service.get("end_time", "15:00:00")
                print(f"✅ Используем время из service: {start_time_str} - {end_time_str}")
            
            # Парсим время
            try:
                slot_start_time = datetime.strptime(start_time_str, "%H:%M:%S").time()
                slot_end_time = datetime.strptime(end_time_str, "%H:%M:%S").time()
            except ValueError:
                try:
                    slot_start_time = datetime.strptime(start_time_str, "%H:%M").time()
                    slot_end_time = datetime.strptime(end_time_str, "%H:%M").time()
                except ValueError:
                    continue
            
            # Создаём datetime объекты
            slot_start = datetime.combine(target_date, slot_start_time).replace(tzinfo=tz)
            slot_end = datetime.combine(target_date, slot_end_time).replace(tzinfo=tz)
            
            # 5️⃣ Получить брони на эту дату
            bookings = await booking_service.get_all(
                restaurant_id=restaurant_id,
                limit=500
            )
            
            # Фильтруем брони на нужную дату и статус
            target_bookings = [
                b for b in bookings
                if b.get("status") in ["confirmed", "completed"]
                and b.get("booking_datetime", "").startswith(date_str)
            ]
            
            # 6️⃣ Генерируем слоты
            step = timedelta(minutes=slot_step)
            current = slot_start
            
            while current + step <= slot_end:
                slot_time_start = current
                slot_time_end = current + step
                
                # Считаем гостей в этом слоте
                booked_guests = 0
                for booking in target_bookings:
                    booking_datetime_str = booking.get("booking_datetime", "")
                    if not booking_datetime_str:
                        continue
                    
                    try:
                        booking_start = datetime.fromisoformat(
                            booking_datetime_str.replace("+00", "+00:00")
                        )
                        booking_duration = booking.get("duration_minutes", 60)
                        booking_end = booking_start + timedelta(minutes=booking_duration)
                        
                        # Проверяем пересечение
                        if booking_start < slot_time_end and booking_end > slot_time_start:
                            booked_guests += booking.get("party_size", 1)
                    except (ValueError, TypeError):
                        continue
                
                # Рассчитываем load
                load = booked_guests / capacity if capacity > 0 else 0
                
                # Определяем статус
                is_available = load < 0.9
                
                all_slots.append({
                    "time": current.strftime("%H:%M"),
                    "available": is_available,
                    "discount": discount,
                    "service_id": service_id if service_id else None,
                    "booked_guests": booked_guests,
                    "capacity": capacity,
                    "load": round(load * 100)
                })
                
                current += step

        
        # Удаляем дубликаты по времени (берём первый слот с максимальной скидкой)
        seen_times = {}
        unique_slots = []
        
        for slot in all_slots:
            time_key = slot["time"]
            if time_key not in seen_times:
                seen_times[time_key] = slot
                unique_slots.append(slot)
            else:
                # Если уже есть слот на это время, берём с большей скидкой
                if slot["discount"] > seen_times[time_key]["discount"]:
                    # Заменяем старый слот на новый
                    idx = next(i for i, s in enumerate(unique_slots) if s["time"] == time_key)
                    unique_slots[idx] = slot
                    seen_times[time_key] = slot
        
        # Сохраняем в кэш
        _slots_cache[cache_key] = unique_slots
        _cache_timestamps[cache_key] = now
        
        return unique_slots
    
    except Exception as e:
        print(f"❌ Ошибка в get_cached_slots: {e}")
        import traceback
        traceback.print_exc()
        return []


# app/api/bookings.py

@router.get("/")
async def get_bookings(
    phone: Optional[str] = Query(None),
    restaurant_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100, le=500)
):
    """
    Получить все брони с фильтрацией
    
    ✅ Возвращает массив броней напрямую (не объект!)
    """
    try:
        print("=== DEBUG get_bookings ===")
        print(f"Phone filter: {phone}")
        print(f"Restaurant ID filter: {restaurant_id}")
        print(f"Status filter: {status}")
        
        bookings = await booking_service.get_all(
            phone=phone,
            restaurant_id=restaurant_id,
            status=status,
            limit=limit
        )
        
        print(f"✅ Bookings loaded: {len(bookings)}")
        
        # ✅ ИСПРАВЛЕНИЕ: Возвращаем массив напрямую
        return bookings  # НЕ {"count": ..., "bookings": ...}
        
    except Exception as e:
        print(f"❌ Error getting bookings: {e}")
        import traceback
        traceback.print_exc()
        return []  # Возвращаем пустой массив в случае ошибки



@router.get("/available-slots")
async def available_slots(
    restaurant_id: int = Query(...),
    date: str = Query(...)
):
    """Получить доступные слоты"""
    slots = await get_cached_slots(restaurant_id, date)
    return slots


@router.get("/completed")
async def get_completed_bookings(limit: int = 50):
    """Get recently completed bookings for admin dashboard"""
    try:
        bookings = await db.get(
            "bookings",
            filters={"status": "eq.completed"},
            order="completed_at.desc",
            limit=limit
        )
        
        if not bookings:
            return []
        
        # Get restaurant names for all bookings
        booking_ids = [b["restaurant_id"] for b in bookings]
        restaurants = await db.get(
            "restaurants",
            filters={"id": f"in.({','.join(map(str, booking_ids))})"}
        )
        
        restaurant_map = {r["id"]: r["name"] for r in restaurants or []}
        
        # Enrich bookings with restaurant names
        for booking in bookings:
            booking["restaurant_name"] = restaurant_map.get(booking["restaurant_id"], "Unknown")
        
        return bookings
    except Exception as e:
        print(f"Error getting completed bookings: {e}")
        return []


@router.post("")
async def create_booking(
    restaurant_id: int = Form(),
    restaurant_name: str = Form("Demo"),
    # ← УБРАЛ date/time, добавил booking_datetime:
    booking_datetime: str = Form(),
    party_size: int = Form(default=2),
    guest_name: str = Form(),
    phone: str = Form(),
    guest_email: Optional[str] = Form(default=""),
    special_requests: Optional[str] = Form(default=""),
):
    """Создание брони"""
    
    # Парсинг booking_datetime (формат "2026-01-08T18:00:00")
    try:
        booking_dt = datetime.fromisoformat(booking_datetime.replace('Z', '+00:00'))
        almaty_tz = ZoneInfo("Asia/Almaty")
        booking_datetime_parsed = booking_dt.replace(tzinfo=almaty_tz)
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат booking_datetime (ожидается YYYY-MM-DDTHH:MM:SS)")

    # Получаем ресторан (для discount)
    restaurant = await db.get(
        table="restaurants",
        filters={"id": f"eq.{restaurant_id}"}
    )
    
    discount = 0
    if restaurant:
        # Твоя логика discount (оставил как есть)
        services = await db.get(
            table="restaurant_services",
            filters={"restaurant_id": f"eq.{restaurant_id}"}
        )
        
        if services:
            service = services[0]
            service_id = service.get("id")
            
            discount_rules = await db.get(
                table="discount_rules",
                filters={
                    "service_id": f"eq.{service_id}",
                    "is_active": "eq.true",
                    "valid_from": f"lte.{booking_datetime_parsed.date().isoformat()}",
                    "valid_to": f"gte.{booking_datetime_parsed.date().isoformat()}"
                }
            )
            
            if discount_rules:
                rule = discount_rules[0]
                time_start = datetime.strptime(rule.get("time_start", ""), "%H:%M:%S").time()
                time_end = datetime.strptime(rule.get("time_end", ""), "%H:%M:%S").time()
                booking_time = booking_datetime_parsed.time()
                
                if time_start <= booking_time < time_end:
                    discount = rule.get("discount", 0)

    # Данные брони (совпадает с фронтом)
    booking_data = {
        "restaurant_id": restaurant_id,
        "restaurant_name": restaurant_name,
        "guest_name": guest_name,
        "guest_phone": phone.strip(),
        "guest_email": guest_email.strip() if guest_email else None,
        "booking_datetime": booking_datetime_parsed.isoformat(),  # для Supabase
        "party_size": party_size,
        "special_requests": special_requests,
        "discount_applied": discount,
        "status": "confirmed",
        # ← NULL для FK (MVP)
        "user_id": None,
        "table_id": None,
    }
    
    booking = await booking_service.create(booking_data)
    
    if not booking or (isinstance(booking, list) and len(booking) == 0):
        raise HTTPException(status_code=400, detail="Ошибка создания брони")
    
    # Если это список, берём первый элемент
    booking_record = booking[0] if isinstance(booking, list) else booking
    
    return {
        "success": True,
        "message": "Бронь успешно создана",
        "data": {
            "id": booking_record.get("id"),
            "confirmation_code": booking_record.get("confirmation_code"),
            "restaurant_name": restaurant_name,
            "guest_name": guest_name,
            "booking_datetime": booking_datetime,
            "party_size": party_size,
            "phone": phone,
            "guest_email": guest_email if guest_email else None,
            "discount": discount
    }
}






@router.get("/test")
async def test_bookings(phone: str = "+77012201180"):
    """Тест получения броней"""
    bookings = await booking_service.get_all(phone=phone)
    
    return {
        "phone": phone,
        "count": len(bookings),
        "bookings": bookings
    }

# app/api/bookings.py

@router.post("/verify-qr")
async def verify_booking_qr(data: dict):
    """Verify booking by QR code and mark as completed"""
    try:
        code = data.get("code", "").upper().strip()
        
        if not code:
            raise HTTPException(status_code=400, detail="Код подтверждения не указан")
        
        print(f"Verifying code: {code}")
        
        # Get booking by confirmation code
        booking_response = await db.get(
            "bookings",
            filters={"confirmation_code": f"eq.{code}"}
        )
        
        print(f"Booking response: {booking_response}")
        
        # FIX: Supabase возвращает список, берем первый элемент
        if not booking_response or len(booking_response) == 0:
            raise HTTPException(status_code=404, detail="Бронь не найдена")
        
        booking_data = booking_response[0]  # ← Берем первый элемент!
        
        # Check if already completed
        if booking_data.get("status") == "completed":
            completed_time = booking_data.get("completed_at")
            raise HTTPException(
                status_code=400, 
                detail=f"Эта бронь уже была использована {completed_time}"
            )
        
        # Check if confirmed
        if booking_data.get("status") != "confirmed":
            raise HTTPException(
                status_code=400, 
                detail=f"Бронь имеет статус: {booking_data.get('status')}"
            )
        
        # Get restaurant info
        restaurant_response = await db.get(
            "restaurants",
            filters={"id": f"eq.{booking_data['restaurant_id']}"}
        )
        
        if not restaurant_response or len(restaurant_response) == 0:
            raise HTTPException(status_code=404, detail="Ресторан не найден")
        
        restaurant_data = restaurant_response[0]
        
        # Calculate discount based on booking time
        booking_time = datetime.fromisoformat(booking_data["booking_datetime"].replace("Z", "+00:00"))
        discount = booking_data.get("discount_applied", 0)
        
        # Update booking: mark as completed and save actual discount
        now = datetime.utcnow().isoformat()
        await db.update(
            "bookings",
            filters={"id": f"eq.{booking_data['id']}"},
            data={
                "status": "completed",
                "completed_at": now,  # ← Фиксируем время посещения
                "discount_applied": discount,  # ← Сохраняем примененную скидку
                "updated_at": now
            }
        )
        
        return {
            "success": True,
            "booking": {
                "id": booking_data["id"],
                "guest_name": booking_data["guest_name"],
                "restaurant_name": restaurant_data["name"],
                "booking_datetime": booking_data["booking_datetime"],
                "party_size": booking_data["party_size"],
                "discount_applied": discount,
                "status": "completed",
                "completed_at": now
            },
            "discount": discount,
            "message": f"Бронь подтверждена! Применена скидка {discount}%"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error verifying booking: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ошибка проверки брони: {str(e)}")

# ✅ НОВЫЕ ENDPOINTS ДЛЯ СКИДОК

@router.get("/discount_rules")
async def get_discount_rules(restaurant_id: int = Query(...)):
    """Получить скидки для ресторана"""
    try:
        print(f"🔍 Getting discounts for restaurant: {restaurant_id}")
        discounts = await db.get(
            "discount_rules",
            filters={"restaurant_id": f"eq.{restaurant_id}"},
            order="valid_from.desc"
        )
        print(f"✅ Found {len(discounts or [])} discounts")
        return discounts or []
    except Exception as e:
        print(f"❌ Error getting discounts: {e}")
        import traceback
        traceback.print_exc()
        return []





@router.post("/discount_rules")  # ✅ ИСПРАВЛЕНО!
async def create_discount_rule(
    restaurant_id: int = Form(...),
    service_id: str = Form(default=""),
    discount: int = Form(...),
    time_start: str = Form(...),
    time_end: str = Form(...),
    valid_from: str = Form(...),
    valid_to: str = Form(...),
    description: str = Form(default=""),
):
    """Создать новую скидку"""
    try:
        
        data = {
            "restaurant_id": restaurant_id,
            "service_id": service_id if service_id and service_id.strip() else None,
            "discount": discount,
            "time_start": time_start,
            "time_end": time_end,
            "valid_from": valid_from,
            "valid_to": valid_to,
            "description": description,
            "is_active": True,
        }
        
        result = await db.post("discount_rules", data)
        invalidate_cache(restaurant_id)
        return result
    except Exception as e:
        print(f"❌ Error creating discount: {e}")
        raise HTTPException(status_code=400, detail=str(e))



@router.patch("/{booking_id}/status")
async def update_booking_status(booking_id: int, request: Request):
    """Обновить статус брони"""
    data = await request.json()
    status = data.get("status")
    
    if status not in ["confirmed", "cancelled", "completed", "no_show"]:
        raise HTTPException(status_code=400, detail="Неверный статус")
    
    # Получаем текущую бронь для инвалидации кэша
    booking = await booking_service.get_by_id(booking_id)
    
    success = await booking_service.update_status(booking_id, status)
    
    if not success:
        raise HTTPException(status_code=400, detail="Ошибка обновления статуса")
    
    # 🔥 Инвалидируем кэш
    if booking:
        invalidate_cache(booking.get("restaurant_id"))
    
    return {"success": True, "message": "Статус обновлен"}


@router.delete("/{booking_id}")
async def cancel_booking(booking_id: int):
    """Отменить бронь"""
    # Получаем текущую бронь для инвалидации кэша
    booking = await booking_service.get_by_id(booking_id)
    
    success = await booking_service.delete(booking_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Ошибка отмены брони")
    
    # 🔥 Инвалидируем кэш
    if booking:
        invalidate_cache(booking.get("restaurant_id"))
    
    return {"success": True, "message": "Бронь отменена"}

@router.put("/discount_rules/{discount_id}")  # ✅ ИСПРАВЛЕНО!
async def update_discount_rule(
    discount_id: int,
    restaurant_id: int = Form(...),
    service_id: str = Form(default=""),
    discount: int = Form(...),
    time_start: str = Form(...),
    time_end: str = Form(...),
    valid_from: str = Form(...),
    valid_to: str = Form(...),
    description: str = Form(default=""),
):
    """Обновить скидку"""
    try:
        data = {
            "restaurant_id": restaurant_id,
            "service_id": service_id if service_id and service_id.strip() else None,
            "discount": discount,
            "time_start": time_start,
            "time_end": time_end,
            "valid_from": valid_from,
            "valid_to": valid_to,
            "description": description,
            "is_active": True,
        }
        
        result = await db.update(
            "discount_rules",
            filters={"id": f"eq.{discount_id}"},
            data=data
        )
        invalidate_cache(restaurant_id)
        return result
    except Exception as e:
        print(f"❌ Error updating discount: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/discount_rules/{discount_id}")  # ✅ ИСПРАВЛЕНО!
async def delete_discount_rule(discount_id: int, restaurant_id: int = Query(...)):
    """Удалить скидку"""
    try:
        result = await db.delete(
            "discount_rules",
            filters={"id": f"eq.{discount_id}"}
        )
        invalidate_cache(restaurant_id)
        return {"success": True}
    except Exception as e:
        print(f"❌ Error deleting discount: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{booking_id}")
async def get_booking(booking_id: int):
    """Получить бронь по ID"""
    booking = await booking_service.get_by_id(booking_id)
    
    if not booking:
        raise HTTPException(status_code=404, detail="Бронь не найдена")
    
    return booking