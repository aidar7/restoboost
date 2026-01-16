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
    category: Optional[str] = None,
    limit: int = Query(default=100, le=500)
):
    """Get all restaurants with optional category filter and available timeslots"""
    
    print("\n" + "="*50)
    print("🔍 GET /api/restaurants/ CALLED")
    print(f"📊 Category: {category}, Limit: {limit}")
    print("="*50)
    
    try:
        print("📡 Step 1: Fetching restaurants from Supabase...")
        
        # Если есть фильтр по категории
        if category:
            filters = {"category": f"eq.{category}"}
            restaurants = await db.get("restaurants", filters=filters, limit=limit)
        else:
            # Получить все рестораны
            restaurants = await db.get("restaurants", limit=limit)
        
        print(f"✅ Step 1 DONE: Got {len(restaurants) if restaurants else 0} restaurants")
        
        # Добавить timeslots для каждого ресторана
        if restaurants:
            print("📡 Step 2: Fetching timeslots...")
            today = datetime.now().strftime("%Y-%m-%d")
            restaurant_ids = [r["id"] for r in restaurants]
            
            # ОПТИМИЗАЦИЯ: Batch загрузка всех таймслотов одним запросом
            try:
                all_timeslots = await db.get(
                    "discount_rules",
                    filters={
                        "restaurant_id": f"in.({','.join(map(str, restaurant_ids))})",
                        "is_active": "eq.true",
                        "valid_from": f"lte.{today}",
                        "valid_to": f"gte.{today}"
                    },
                    limit=1000
                )
                
                print(f"✅ Step 2 DONE: Got {len(all_timeslots or [])} timeslots")
                
                # Группировка по restaurant_id в памяти
                timeslots_by_restaurant = {}
                for slot in (all_timeslots or []):
                    rid = slot["restaurant_id"]
                    if rid not in timeslots_by_restaurant:
                        timeslots_by_restaurant[rid] = []
                    timeslots_by_restaurant[rid].append(slot)
                
                print(f"✅ Loaded {len(all_timeslots or [])} timeslots for {len(restaurant_ids)} restaurants")
                
            except Exception as e:
                print(f"⚠️ Could not batch load timeslots: {e}")
                timeslots_by_restaurant = {}
            
            # Присвоить таймслоты без дополнительных запросов
            for restaurant in restaurants:
                restaurant_id = restaurant["id"]
                restaurant["timeslots"] = timeslots_by_restaurant.get(restaurant_id, [])
                restaurant["popularity"] = 0

        print(f"🎉 RETURNING {len(restaurants or [])} restaurants\n")
        return restaurants or []
    
    except Exception as e:
        print(f"❌ ERROR in get_restaurants: {e}")
        import traceback
        traceback.print_exc()
        return []




@router.get("/{restaurant_id}")
async def get_restaurant(restaurant_id: int):
    """
    Get restaurant by ID
    
    Args:
        restaurant_id: Restaurant ID
    
    Returns:
        Restaurant data
    
    Raises:
        HTTPException: 404 if restaurant not found
    """
    restaurant = await restaurant_service.get_by_id(restaurant_id)
    
    if not restaurant:
        raise HTTPException(status_code=404, detail="Ресторан не найден")
    
    return restaurant


@router.post("/")
async def create_restaurant(
    name: str = Form(...),
    category: str = Form(...),
    rating: float = Form(...),
    avg_check: int = Form(...),
    address: str = Form(...),
    phone: str = Form(...),
    cuisine: str = Form(...),  # JSON string
    description: Optional[str] = Form(""),
    discount: int = Form(...),
    time_start: str = Form(...),
    time_end: str = Form(...),
    photos: List[UploadFile] = File(default=[])
):
    """
    Create new restaurant - handles FormData from admin panel
    
    Args:
        All form fields + photos
    
    Returns:
        Success response with created restaurant
    
    Raises:
        HTTPException: 400 if creation fails
    """
    try:
        # Parse cuisine JSON string
        try:
            cuisine_list = json.loads(cuisine)
            if not isinstance(cuisine_list, list):
                cuisine_list = [cuisine]
        except json.JSONDecodeError:
            cuisine_list = [cuisine]
        
        print(f"📝 Creating restaurant: {name}")
        print(f"   Cuisine: {cuisine_list}")
        print(f"   Photos: {len(photos)} files")
        
        # Prepare restaurant data
        restaurant_data = {
            "name": name.strip(),
            "category": category,
            "rating": float(rating),
            "avg_check": int(avg_check),
            "address": address.strip(),
            "phone": phone.strip(),
            "cuisine": cuisine_list,
            "description": description.strip() if description else "",
            "photos": []  # Empty array initially
        }
        
        # Create restaurant
        result = await db.post(
            table="restaurants",
            data=restaurant_data,
            return_rep=True
        )

        if not result:  # ✅ ПРАВИЛЬНО!
            raise HTTPException(status_code=400, detail="Ошибка создания ресторана")

        restaurant = result[0] if result else None

        restaurant_id = restaurant["id"]

        # ✅ 1. Создать restaurant_service
        print(f"📝 Creating restaurant_service for restaurant {restaurant_id}...")
        import uuid
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

        # ✅ 2. Создать service_capacity
        print(f"📝 Creating service_capacity...")
        capacity_data = {
            "service_id": service_id,
            "restaurant_id": restaurant_id,  # ← ДОБАВЬ ЭТО!
            "capacity_seats": 16,
            "date": None
        }

        capacity_result = await db.post("service_capacity", capacity_data, return_rep=True)
        if not capacity_result:
            raise HTTPException(status_code=400, detail="Ошибка создания вместимости")

        print(f"✅ Capacity created")

        # ✅ 3. Создать discount_rules (скидка/слоты)
        print(f"📝 Creating discount_rules...")
        from datetime import datetime, timedelta

        today = datetime.now().date()
        end_date = today + timedelta(days=30)

        timeslot_data = {
            "service_id": service_id,
            "restaurant_id": restaurant_id,
            "start_time": time_start,           # ✅ ПРАВИЛЬНО!
            "end_time": time_end,               # ✅ ПРАВИЛЬНО!
            "discount_percentage": int(discount),  # ✅ ПРАВИЛЬНО!
            "description": "на все меню",
            "is_active": True,
            "valid_from": today.isoformat(),
            "valid_to": end_date.isoformat()
        }

        timeslot_result = await db.post("discount_rules", timeslot_data, return_rep=True)
        if not timeslot_result:
            raise HTTPException(status_code=400, detail="Ошибка создания скидки")

        print(f"✅ Discount rule created")

        
        # Upload photos if provided
        photos_uploaded = 0
        photo_urls = []
        
        if photos and photos[0].filename:
            print(f"📸 Uploading {len(photos)} photos...")
            
            for photo in photos:
                try:
                    # Validate file type
                    if not photo.content_type.startswith('image/'):
                        print(f"⚠️ Skipping non-image file: {photo.filename}")
                        continue
                    
                    # Generate unique filename
                    file_ext = photo.filename.split('.')[-1].lower()
                    unique_filename = f"{restaurant_id}/{uuid.uuid4()}.{file_ext}"
                    
                    # Read file content
                    file_content = await photo.read()
                    
                    # Upload using custom storage_upload method
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
                        print(f"✅ Photo uploaded: {unique_filename}")
                    else:
                        print(f"❌ Failed to upload {photo.filename}")
                    
                except Exception as photo_error:
                    print(f"❌ Failed to upload {photo.filename}: {photo_error}")
                    import traceback
                    traceback.print_exc()
                    continue
            
            # Update restaurant with photo URLs
            if photo_urls:
                await restaurant_service.update(restaurant_id, photos=photo_urls)
                restaurant["photos"] = photo_urls
                print(f"✅ {photos_uploaded} photos added to restaurant")
        
        print(f"✅ Restaurant created: {restaurant['name']} (ID: {restaurant_id})")
        
        return {
            "success": True,
            "message": "Ресторан успешно добавлен!",
            "restaurant": restaurant,
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
    
    Args:
        restaurant_id: Restaurant ID
        file: Image file to upload
    
    Returns:
        Success response with photo URL
    
    Raises:
        HTTPException: 400/404/500 on various errors
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Файл должен быть изображением")
        
        # Get restaurant
        restaurant = await restaurant_service.get_by_id(restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Ресторан не найден")
        
        # Generate unique filename
        file_ext = file.filename.split('.')[-1].lower()
        unique_filename = f"{restaurant_id}/{uuid.uuid4()}.{file_ext}"
        
        # Read file content
        file_content = await file.read()
        
        # Upload using custom storage_upload method
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
        
        # Update restaurant photos array
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
    
    Args:
        restaurant_id: Restaurant ID
        photo_index: Index of photo in photos array
    
    Returns:
        Success response
    
    Raises:
        HTTPException: 400/404/500 on various errors
    """
    try:
        # Get restaurant
        restaurant = await restaurant_service.get_by_id(restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Ресторан не найден")
        
        photos = restaurant.get("photos", [])
        
        if photo_index < 0 or photo_index >= len(photos):
            raise HTTPException(status_code=400, detail="Неверный индекс фото")
        
        # Get photo URL to delete
        photo_url = photos[photo_index]
        
        # Extract filename from URL
        # Format: https://xxx.supabase.co/storage/v1/object/public/restaurant-photos/123/uuid.jpg
        try:
            # Extract path after bucket name
            if '/restaurant-photos/' in photo_url:
                path = photo_url.split('/restaurant-photos/')[-1]
            else:
                # Fallback: try to extract from object/public/
                path = photo_url.split('/object/public/')[-1].replace('restaurant-photos/', '')
            
            # Delete using custom storage_delete method
            bucket_name = "restaurant-photos"
            success = await db.storage_delete(bucket=bucket_name, path=path)
            
            if success:
                print(f"✅ Photo deleted from storage: {path}")
            else:
                print(f"⚠️ Could not delete from storage: {path}")
        except Exception as e:
            print(f"⚠️ Could not delete from storage: {e}")
        
        # Remove from photos array
        photos.pop(photo_index)
        
        # Update restaurant
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
async def update_restaurant(restaurant_id: int, request: Request):
    """
    Update restaurant
    
    Args:
        restaurant_id: Restaurant ID
        request: Request with JSON data
    
    Returns:
        Success response
    
    Raises:
        HTTPException: 400 if update fails
    """
    try:
        data = await request.json()
        
        restaurant = await restaurant_service.update(restaurant_id, **data)
        
        if not restaurant:
            raise HTTPException(status_code=400, detail="Ошибка обновления")
        invalidate_cache(restaurant_id)
        return {
            "success": True,
            "message": f"Ресторан '{data.get('name', '')}' успешно обновлён"
        }
    
    except Exception as e:
        print(f"❌ Update restaurant error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{restaurant_id}")
async def delete_restaurant(restaurant_id: int):
    """
    Delete restaurant (hard delete)
    
    Args:
        restaurant_id: Restaurant ID
    
    Returns:
        Success response
    
    Raises:
        HTTPException: 400 if deletion fails
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
    category: Optional[str] = None
):
    """
    Search and filter restaurants
    
    Args:
        cuisine: Filter by cuisine type
        discount_min: Minimum discount percentage
        avg_check_min: Minimum average check
        avg_check_max: Maximum average check
        category: Filter by category
    
    Returns:
        Filtered list of restaurants
    """
    restaurants = await restaurant_service.get_all(category=category)
    
    # Apply filters
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
        # Ищем первый timeslot по restaurant_id
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
            # Используем patch для обновления
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