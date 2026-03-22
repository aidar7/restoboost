# -*- coding: utf-8 -*-
"""
Restaurant API endpoints - FIXED VERSION
Handles CRUD operations for restaurants without RPC calls that hang
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
    sort_by: Optional[str] = None,
    avg_check_filter: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """
    Получает все рестораны с фильтрацией и поиском.
    ИСПРАВЛЕННАЯ ВЕРСИЯ: Использует restaurant_service.get_all() вместо RPC
    """
    print("\n" + "="*50)
    print(f"🔍 GET /api/restaurants/ (ИСПРАВЛЕННАЯ ВЕРСИЯ)")
    print(f"📊 Category: {category}, Search: {search}, City: {city}, Sort: {sort_by}")
    print("="*50)
    
    try:
        # ✅ ИСПРАВЛЕНИЕ: Используем restaurant_service.get_all() вместо RPC
        print("📡 Step 1: Fetching all restaurants from database...")
        restaurants = await restaurant_service.get_all(limit=limit)
        print(f"✅ Step 1 DONE: Got {len(restaurants)} restaurants")
        
        if not restaurants:
            print("⚠️ No restaurants found in database")
            return []
        
        # Фильтрация по поиску (поиск в названии)
        if search and search.strip():
            print(f"🔎 Filtering by search term: '{search}'")
            search_lower = search.lower()
            restaurants = [
                r for r in restaurants 
                if search_lower in r.get('name', '').lower() or 
                   search_lower in ' '.join(r.get('cuisine', [])).lower()
            ]
            print(f"✅ Found {len(restaurants)} restaurants matching search")
        
        # Фильтрация по категории
        if category and category != 'all':
            print(f"🏷️ Filtering by category: '{category}'")
            restaurants = [r for r in restaurants if r.get('category') == category]
            print(f"✅ Found {len(restaurants)} restaurants in category")
        
        # Фильтрация по городу
        if city and city != 'all':
            print(f"🏙️ Filtering by city: '{city}'")
            restaurants = [r for r in restaurants if r.get('city') == city]
            print(f"✅ Found {len(restaurants)} restaurants in city")
        
        # Фильтрация по среднему чеку
        if avg_check_filter and avg_check_filter != 'all':
            print(f"💰 Filtering by avg_check: '{avg_check_filter}'")
            filtered = []
            for r in restaurants:
                avg_check = r.get('avg_check', 0)
                if avg_check_filter == '0-5000' and 0 <= avg_check <= 5000:
                    filtered.append(r)
                elif avg_check_filter == '5000-10000' and 5000 < avg_check <= 10000:
                    filtered.append(r)
                elif avg_check_filter == '10000-15000' and 10000 < avg_check <= 15000:
                    filtered.append(r)
                elif avg_check_filter == '15000+' and avg_check > 15000:
                    filtered.append(r)
            restaurants = filtered
            print(f"✅ Found {len(restaurants)} restaurants in avg_check range")
        
        # Сортировка
        if sort_by:
            print(f"📊 Sorting by: '{sort_by}'")
            if sort_by == 'popularity':
                restaurants.sort(key=lambda r: r.get('popularity', 0), reverse=True)
            elif sort_by == 'rating_desc':
                restaurants.sort(key=lambda r: r.get('rating', 0), reverse=True)
            elif sort_by == 'avg_check_asc':
                restaurants.sort(key=lambda r: r.get('avg_check', 0))
            elif sort_by == 'avg_check_desc':
                restaurants.sort(key=lambda r: r.get('avg_check', 0), reverse=True)
            print(f"✅ Sorted {len(restaurants)} restaurants")
        
        # Загрузка таймслотов для каждого ресторана
        if restaurants:
            print("📡 Step 2: Fetching timeslots for restaurants...")
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
                
                print(f"✅ Step 2 DONE: Loaded timeslots for {len(timeslots_by_restaurant)} restaurants")
            except Exception as e:
                print(f"⚠️ Could not batch load timeslots: {e}")
                for r in restaurants:
                    r["timeslots"] = []
        
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
        
        # Добавляем таймслоты
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
            
            if success:
                print(f"✅ Restaurant updated successfully")
            else:
                print(f"⚠️ Failed to update restaurant")
        
        print(f"🎉 Restaurant {restaurant_id} updated\n")
        return {
            "success": True,
            "message": f"Ресторан обновлен",
            "restaurant_id": restaurant_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Update restaurant error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Ошибка обновления: {str(e)}")