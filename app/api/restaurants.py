# -*- coding: utf-8 -*-
"""
Restaurant API endpoints
Handles CRUD operations for restaurants
"""
from fastapi import APIRouter, HTTPException, Query, Request, Form, UploadFile, File
from typing import Optional, List
import json
import uuid
from app.api.bookings import invalidate_cache
from datetime import datetime, timedelta 
from app.services.restaurant_service import restaurant_service, timeslot_service
from app.core.database import db

router = APIRouter()

@router.get("/")
async def get_restaurants(
    search: Optional[str] = None,
    category: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """
    Получает все рестораны. Использует RPC-вызов для поиска и фильтрацию по категории в Python.
    (ВОССТАНОВЛЕННАЯ РАБОЧАЯ ВЕРСИЯ)
    """
    print("\n" + "="*50)
    print(f"🔍 GET /api/restaurants/ (ВОССТАНОВЛЕННАЯ ВЕРСИЯ)")
    print(f"📊 Category: {category}, Search: {search}, City: {city}")
    print("="*50)
    
    try:
        # Используем старую, проверенную RPC-функцию 'search_restaurants'
        print("📡 Step 1: Calling RPC 'search_restaurants'...")
        search_term = search if search else ''
        
        # Убедитесь, что ваша старая функция называлась именно 'search_restaurants'
        rpc_result = await db.rpc(
            'search_restaurants',
            params={'search_term': search_term}
        )

        restaurants = rpc_result if rpc_result is not None else []
        print(f"✅ Step 1 DONE: Got {len(restaurants)} restaurants via RPC")
        
        # Фильтрация по городу на стороне Python
        if city and city != 'all' and restaurants:
            print(f"Filtering by city '{city}' in Python...")
            restaurants = [r for r in restaurants if r.get('city') == city]
            print(f"✅ Found {len(restaurants)} restaurants in city '{city}'.")
        
        # Фильтрация по категории на стороне Python (как это было раньше)
        if category and category != 'all' and restaurants:
            print(f"Filtering by category '{category}' in Python...")
            restaurants = [r for r in restaurants if r.get('category') == category]
            print(f"✅ Found {len(restaurants)} restaurants in category.")

        # Логика для таймслотов (остается без изменений)
        if restaurants:
            print("📡 Step 2: Fetching timeslots...")
            today = datetime.now().strftime("%Y-%m-%d")
            restaurant_ids = [r["id"] for r in restaurants]
            
            try:
                all_timeslots = await db.get(
                    "discount_rules",
                    filters={"restaurant_id": f"in.({','.join(map(str, restaurant_ids))})"},
                    limit=1000
                )
                
                timeslots_by_restaurant = {}
                if all_timeslots:
                    for slot in all_timeslots:
                        rid = slot["restaurant_id"]
                        if rid not in timeslots_by_restaurant:
                            timeslots_by_restaurant[rid] = []
                        timeslots_by_restaurant[rid].append(slot)
                
                for r in restaurants:
                    r["timeslots"] = timeslots_by_restaurant.get(r.get("id"), [])
                
            except Exception as e:
                print(f"⚠️ Could not batch load timeslots: {e}")

        print(f"🎉 RETURNING {len(restaurants)} restaurants\n")
        return restaurants
    
    except Exception as e:
        print(f"❌ UNEXPECTED FATAL ERROR in get_restaurants: {e}")
        import traceback
        traceback.print_exc()
        return []




@router.get("/{restaurant_id}")
async def get_restaurant(restaurant_id: int):
    """
    Get restaurant by ID
    """
    print("\n" + "="*50)
    print(f"🔍 GET /api/restaurants/{{id}} CALLED")
    print(f"📊 ID: {restaurant_id}")
    print("="*50)

    try:
        print(f"📡 Step 1: Fetching restaurant with ID {restaurant_id} directly from DB...")
        
        # --- ВРЕМЕННОЕ ИЗМЕНЕНИЕ ДЛЯ ДИАГНОСТИКИ ---
        # Идем напрямую в базу, минуя service, чтобы исключить его из уравнения
        restaurants = await db.get(
            "restaurants", 
            filters={"id": f"eq.{restaurant_id}"}, 
            limit=1
        )
        
        if not restaurants:
            print(f"❌ Restaurant with ID {restaurant_id} NOT FOUND in database.")
            raise HTTPException(status_code=404, detail="Ресторан не найден в базе данных")
        
        restaurant = restaurants[0]
        print(f"✅ Step 1 DONE: Found restaurant: {restaurant.get('name')}")
        
        # --- ДОБАВЛЯЕМ ТАЙМСЛОТЫ (как на главной) ---
        # Этот код нужен, чтобы страница не сломалась, если ожидает таймслоты
        print("📡 Step 2: Fetching timeslots for this restaurant...")
        today = datetime.now().strftime("%Y-%m-%d")
        try:
            timeslots = await db.get(
                "discount_rules",
                filters={
                    "restaurant_id": f"eq.{restaurant_id}",
                    "is_active": "eq.true",
                    "valid_from": f"lte.{today}",
                    "valid_to": f"gte.{today}"
                }
            )
            restaurant["timeslots"] = timeslots or []
            print(f"✅ Step 2 DONE: Found {len(timeslots or [])} timeslots.")
        except Exception as e:
            print(f"⚠️ Could not load timeslots: {e}")
            restaurant["timeslots"] = []

        print(f"🎉 RETURNING restaurant data for ID {restaurant_id}\n")
        return restaurant

    except HTTPException:
        # Пробрасываем ошибку 404, чтобы не попасть в общую обработку
        raise
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR in get_restaurant: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")




@router.post("/")
async def create_restaurant(
    name: str = Form(...),
    category: str = Form(...),
    rating: float = Form(...),
    avg_check: int = Form(...),
    address: str = Form(...),
    phone: str = Form(...),
    cuisine: str = Form(...),  # JSON string
    city: str = Form(default="Astana"),
    description: Optional[str] = Form(""),
    discount: int = Form(...),
    time_start: str = Form(...),
    time_end: str = Form(...),
    photos: List[UploadFile] = File(default=[])
):
    """
    Create new restaurant - handles FormData from admin panel
    """
    try:
        try:
            cuisine_list = json.loads(cuisine)
            if not isinstance(cuisine_list, list):
                cuisine_list = [cuisine]
        except json.JSONDecodeError:
            cuisine_list = [cuisine]
        
        print(f"📝 Creating restaurant: {name}")
        print(f"   Cuisine: {cuisine_list}")
        print(f"   City: {city}")
        print(f"   Photos: {len(photos)} files")
        
        restaurant_data = {
            "name": name.strip(),
            "category": category,
            "rating": float(rating),
            "avg_check": int(avg_check),
            "address": address.strip(),
            "phone": phone.strip(),
            "cuisine": cuisine_list,
            "city": city.strip(),
            "description": description.strip() if description else "",
            "photos": []
        }
        
        result = await db.post(
            table="restaurants",
            data=restaurant_data,
            return_rep=True
        )

        if not result:
            raise HTTPException(status_code=400, detail="Ошибка создания ресторана")

        restaurant = result[0] if result else None
        if not restaurant:
            raise HTTPException(status_code=400, detail="Не удалось получить данные после создания ресторана")

        restaurant_id = restaurant["id"]

        print(f"📝 Creating restaurant_service for restaurant {restaurant_id}...")
        service_id = str(uuid.uuid4())

        service_data = {
            "id": service_id,
            "restaurant_id": restaurant_id,
            "name": "Основной зал",
            "start_time": time_start,
            "end_time": time_end,
            "slot_step_minutes": 60,
            "is_active": True
        }

        service_result = await db.post("restaurant_services", service_data, return_rep=True)
        if not service_result:
            raise HTTPException(status_code=400, detail="Ошибка создания сервиса ресторана")

        print(f"✅ Service created: {service_id}")

        print(f"📝 Creating service_capacity...")
        capacity_data = {
            "service_id": service_id,
            "restaurant_id": restaurant_id,
            "capacity_seats": 16,
            "date": None
        }

        capacity_result = await db.post("service_capacity", capacity_data, return_rep=True)
        if not capacity_result:
            raise HTTPException(status_code=400, detail="Ошибка создания вместимости")

        print(f"✅ Capacity created")

        print(f"📝 Creating discount_rules...")
        today = datetime.now().date()
        end_date = today + timedelta(days=30)

        timeslot_data = {
            "service_id": service_id,
            "restaurant_id": restaurant_id,
            "start_time": time_start,
            "end_time": time_end,
            "discount_percentage": int(discount),
            "description": "на все меню",
            "is_active": True,
            "valid_from": today.isoformat(),
            "valid_to": end_date.isoformat()
        }

        timeslot_result = await db.post("discount_rules", timeslot_data, return_rep=True)
        if not timeslot_result:
            raise HTTPException(status_code=400, detail="Ошибка создания скидки")

        print(f"✅ Discount rule created")

        photos_uploaded = 0
        photo_urls = []
        
        if photos and photos[0].filename:
            print(f"📸 Uploading {len(photos)} photos...")
            
            for photo in photos:
                try:
                    if not photo.content_type.startswith('image/'):
                        print(f"⚠️ Skipping non-image file: {photo.filename}")
                        continue
                    
                    file_ext = photo.filename.split('.')[-1].lower()
                    unique_filename = f"{restaurant_id}/{uuid.uuid4()}.{file_ext}"
                    file_content = await photo.read()
                    
                    bucket_name = "restaurant-photos"
                    public_url = await db.storage_upload(
                        bucket=bucket_name,
                        path=unique_filename,
                        file_bytes=file_content,
                        content_type=photo.content_type
                    )
                    
                    if public_url:
                        photo_urls.append(public_url)
                        photos_uploaded += 1
                        print(f"✅ Photo {photos_uploaded} uploaded: {unique_filename}")
                    else:
                        print(f"⚠️ Failed to upload photo: {photo.filename}")
                
                except Exception as e:
                    print(f"⚠️ Error uploading photo {photo.filename}: {e}")
        
        if photo_urls:
            await db.patch(
                "restaurants",
                filters={"id": f"eq.{restaurant_id}"},
                data={"photos": photo_urls}
            )
            print(f"✅ Photos saved to restaurant: {len(photo_urls)} files")
        
        print(f"🎉 Restaurant created successfully: {restaurant_id}")
        return {
            "success": True,
            "message": f"Ресторан '{name}' успешно создан",
            "restaurant_id": restaurant_id,
            "photos_uploaded": photos_uploaded
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Create restaurant error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Ошибка создания: {str(e)}")


@router.post("/{restaurant_id}/upload-photo")
async def upload_restaurant_photo(restaurant_id: int, file: UploadFile = File(...)):
    """
    Upload single photo to restaurant and update photos array
    """
    try:
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Файл должен быть изображением")
        
        restaurant = await restaurant_service.get_by_id(restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Ресторан не найден")
        
        file_ext = file.filename.split('.')[-1].lower()
        unique_filename = f"{restaurant_id}/{uuid.uuid4()}.{file_ext}"
        file_content = await file.read()
        
        bucket_name = "restaurant-photos"
        public_url = await db.storage_upload(
            bucket=bucket_name,
            path=unique_filename,
            file_bytes=file_content,
            content_type=file.content_type
        )
        
        if not public_url:
            raise HTTPException(status_code=500, detail="Ошибка загрузки в хранилище")
        
        print(f"✅ Photo uploaded: {unique_filename} -> {public_url}")
        
        current_photos = restaurant.get("photos", [])
        current_photos.append(public_url)
        
        await restaurant_service.update(restaurant_id, photos=current_photos)
        
        return {
            "success": True,
            "message": "Фото загружено",
            "url": public_url,
            "photo_count": len(current_photos)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Upload photo error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки фото: {str(e)}")


@router.delete("/{restaurant_id}/photos/{photo_index}")
async def delete_restaurant_photo(restaurant_id: int, photo_index: int):
    """
    Delete photo from restaurant by index
    """
    try:
        restaurant = await restaurant_service.get_by_id(restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Ресторан не найден")
        
        photos = restaurant.get("photos", [])
        
        if photo_index < 0 or photo_index >= len(photos):
            raise HTTPException(status_code=400, detail="Неверный индекс фото")
        
        photo_url = photos[photo_index]
        
        try:
            if '/restaurant-photos/' in photo_url:
                path = photo_url.split('/restaurant-photos/')[-1]
            else:
                path = photo_url.split('/object/public/')[-1].replace('restaurant-photos/', '')
            
            bucket_name = "restaurant-photos"
            success = await db.storage_delete(bucket=bucket_name, path=path)
            
            if success:
                print(f"✅ Photo deleted from storage: {path}")
            else:
                print(f"⚠️ Could not delete from storage: {path}")
        except Exception as e:
            print(f"⚠️ Could not delete from storage: {e}")
        
        photos.pop(photo_index)
        
        await restaurant_service.update(restaurant_id, photos=photos)
        
        return {
            "success": True,
            "message": "Фото удалено",
            "photo_count": len(photos)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Delete photo error: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка удаления фото: {str(e)}")


# === ↓↓↓ ИСПРАВЛЕННЫЙ PUT ENDPOINT ↓↓↓ ===
@router.put("/{restaurant_id}")
async def update_restaurant(
    restaurant_id: int,
    name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    rating: Optional[float] = Form(None),
    avg_check: Optional[int] = Form(None),
    address: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    cuisine: Optional[str] = Form(None),  # JSON string
    description: Optional[str] = Form(None),
    discount: Optional[int] = Form(None),
    time_start: Optional[str] = Form(None),
    time_end: Optional[str] = Form(None),
    valid_from: Optional[str] = Form(None),
    valid_to: Optional[str] = Form(None),
    max_tables: Optional[int] = Form(None),
    photos: List[UploadFile] = File(default=[]),
    photos_to_delete: Optional[str] = Form(None)  # JSON string
):
    """
    Update restaurant with FormData support (including photos)
    """
    try:
        print("\n" + "="*50)
        print(f"🔄 PUT /api/restaurants/{restaurant_id}")
        print(f"📊 Updating: name={name}, city={city}, photos={len(photos)}")
        print("="*50)
        
        # Получаем текущий ресторан
        restaurants = await db.get(
            "restaurants",
            filters={"id": f"eq.{restaurant_id}"},
            limit=1
        )
        
        if not restaurants:
            raise HTTPException(status_code=404, detail="Ресторан не найден")
        
        current_restaurant = restaurants[0]
        
        # Подготавливаем данные для обновления
        update_data = {}
        
        if name is not None:
            update_data["name"] = name.strip()
        if category is not None:
            update_data["category"] = category
        if rating is not None:
            update_data["rating"] = float(rating)
        if avg_check is not None:
            update_data["avg_check"] = int(avg_check)
        if address is not None:
            update_data["address"] = address.strip()
        if phone is not None:
            update_data["phone"] = phone.strip()
        if city is not None:
            update_data["city"] = city.strip()
        if description is not None:
            update_data["description"] = description.strip()
        
        # Обработка кухни
        if cuisine is not None:
            try:
                cuisine_list = json.loads(cuisine)
                if not isinstance(cuisine_list, list):
                    cuisine_list = [cuisine]
            except json.JSONDecodeError:
                cuisine_list = [cuisine]
            update_data["cuisine"] = cuisine_list
        
        # Обработка фото
        current_photos = current_restaurant.get("photos", [])
        
        # Удаляем фото, которые нужно удалить
        if photos_to_delete:
            try:
                photos_urls_to_delete = json.loads(photos_to_delete)
                for photo_url in photos_urls_to_delete:
                    if photo_url in current_photos:
                        current_photos.remove(photo_url)
                        # Удаляем из хранилища
                        try:
                            if '/restaurant-photos/' in photo_url:
                                path = photo_url.split('/restaurant-photos/')[-1]
                            else:
                                path = photo_url.split('/object/public/')[-1].replace('restaurant-photos/', '')
                            await db.storage_delete(bucket="restaurant-photos", path=path)
                            print(f"✅ Photo deleted: {path}")
                        except Exception as e:
                            print(f"⚠️ Could not delete from storage: {e}")
            except json.JSONDecodeError:
                print("⚠️ Could not parse photos_to_delete")
        
        # Загружаем новые фото
        if photos and photos[0].filename:
            print(f"📸 Uploading {len(photos)} new photos...")
            for photo in photos:
                try:
                    if not photo.content_type.startswith('image/'):
                        print(f"⚠️ Skipping non-image file: {photo.filename}")
                        continue
                    
                    file_ext = photo.filename.split('.')[-1].lower()
                    unique_filename = f"{restaurant_id}/{uuid.uuid4()}.{file_ext}"
                    file_content = await photo.read()
                    
                    public_url = await db.storage_upload(
                        bucket="restaurant-photos",
                        path=unique_filename,
                        file_bytes=file_content,
                        content_type=photo.content_type
                    )
                    
                    if public_url:
                        current_photos.append(public_url)
                        print(f"✅ Photo uploaded: {unique_filename}")
                    else:
                        print(f"⚠️ Failed to upload photo: {photo.filename}")
                
                except Exception as e:
                    print(f"⚠️ Error uploading photo {photo.filename}: {e}")
        
        # Обновляем фото в данных
        if current_photos or photos_to_delete:
            update_data["photos"] = current_photos
        
        # Обновляем основные данные ресторана
        if update_data:
            success = await db.patch(
                "restaurants",
                filters={"id": f"eq.{restaurant_id}"},
                data=update_data
            )
            
            if not success:
                raise HTTPException(status_code=400, detail="Ошибка обновления ресторана")
            
            print(f"✅ Restaurant updated: {update_data.keys()}")
        
        # Обновляем таймслот (скидку и время)
        if discount is not None or time_start is not None or time_end is not None or valid_from is not None or valid_to is not None or max_tables is not None:
            timeslots = await db.get(
                "discount_rules",
                filters={"restaurant_id": f"eq.{restaurant_id}"},
                limit=1
            )
            
            timeslot_data = {}
            if discount is not None:
                timeslot_data["discount_percentage"] = int(discount)
            if time_start is not None:
                timeslot_data["start_time"] = time_start
            if time_end is not None:
                timeslot_data["end_time"] = time_end
            if valid_from is not None:
                timeslot_data["valid_from"] = valid_from
            if valid_to is not None:
                timeslot_data["valid_to"] = valid_to
            if max_tables is not None:
                timeslot_data["max_tables"] = int(max_tables)
            
            if timeslots and timeslot_data:
                ts_id = timeslots[0]["id"]
                await db.patch(
                    "discount_rules",
                    filters={"id": f"eq.{ts_id}"},
                    data=timeslot_data
                )
                print(f"✅ Timeslot updated: {timeslot_data.keys()}")
        
        invalidate_cache(restaurant_id)
        
        print(f"🎉 Restaurant {restaurant_id} updated successfully\n")
        return {
            "success": True,
            "message": f"Ресторан успешно обновлён"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Update restaurant error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
# === ↑↑↑ КОНЕЦ ИСПРАВЛЕННОГО PUT ENDPOINT ↑↑↑ ===


@router.delete("/{restaurant_id}")
async def delete_restaurant(restaurant_id: int):
    """
    Delete restaurant (hard delete)
    """
    try:
        success = await restaurant_service.hard_delete(restaurant_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Ошибка удаления")
        
        return {"success": True, "message": "Ресторан удалён"}
    
    except Exception as e:
        print(f"❌ Delete restaurant error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/search")
async def search_restaurants(
    cuisine: Optional[str] = None,
    discount_min: Optional[int] = None,
    avg_check_min: Optional[int] = None,
    avg_check_max: Optional[int] = None,
    category: Optional[str] = None,
    city: Optional[str] = None
):
    """
    Search and filter restaurants
    """
    restaurants = await restaurant_service.get_all(category=category, city=city)
    
    if cuisine:
        restaurants = [r for r in restaurants if cuisine in r.get("cuisine", [])]
    
    if avg_check_min:
        restaurants = [r for r in restaurants if r.get("avg_check", 0) >= avg_check_min]
    
    if avg_check_max:
        restaurants = [r for r in restaurants if r.get("avg_check", 0) <= avg_check_max]
    
    if discount_min:
        restaurants = [
            r for r in restaurants 
            if any(slot["discount"] >= discount_min for slot in r.get("timeslots", []))
        ]
    
    return restaurants

@router.put("/{restaurant_id}/timeslot")
async def update_restaurant_timeslot(
    restaurant_id: int,
    discount: int = Form(...),
    time_start: str = Form(...),
    time_end: str = Form(...),
    valid_from: str = Form(...),
    valid_to: str = Form(...),
    max_tables: int = Form(4),
):
    """
    Обновление (или создание, если нет) дефолтного timeslot для ресторана.
    """
    try:
        timeslots = await db.get(
            "discount_rules",
            filters={"restaurant_id": f"eq.{restaurant_id}"},
            limit=1,
        )

        base_data = {
            "restaurant_id": restaurant_id,
            "time_start": time_start,
            "time_end": time_end,
            "discount": int(discount),
            "description": "на все меню",
            "is_active": True,
            "valid_from": valid_from,
            "valid_to": valid_to,
            "max_tables": int(max_tables),
        }

        if timeslots:
            ts_id = timeslots[0]["id"]
            success = await db.patch(
                "discount_rules", 
                filters={"id": f"eq.{ts_id}"}, 
                data=base_data
            )
            if not success:
                raise Exception("Failed to update timeslot")
        else:
            await db.post("discount_rules", base_data)

        invalidate_cache(restaurant_id)
        return {
            "success": True,
            "message": "Таймслот успешно обновлён",
        }

    except Exception as e:
        print(f"❌ Update timeslot error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
