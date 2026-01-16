from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
import uuid

from app.core.database import db
from app.services.restaurant_service import restaurant_service
from app.utils.image_utils import compress_image, validate_image
from app.core.config import settings

router = APIRouter()

@router.post("/restaurants/{restaurant_id}/upload")
async def upload_restaurant_photo(
    restaurant_id: int,
    file: UploadFile = File(...)
):
    """
    Загрузка фото ресторана (любой формат → JPEG)
    """
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        return JSONResponse(
            content={"success": False, "message": "Файл должен быть изображением"},
            status_code=400
        )
    
    # Read file
    contents = await file.read()
    
    # Validate image
    is_valid, error_msg = validate_image(contents)
    if not is_valid:
        return JSONResponse(
            content={"success": False, "message": error_msg},
            status_code=400
        )
    
    try:
        # Compress image
        compressed_image = compress_image(contents)
        
        # Generate filename (всегда .jpg)
        filename = f"{restaurant_id}/{uuid.uuid4()}.jpg"
        
        print(f"📤 Uploading photo: {filename}")
        print(f"📦 Original size: {len(contents)} bytes")
        print(f"📦 Compressed size: {len(compressed_image)} bytes")
        
        # Upload to Supabase Storage
        public_url = await db.storage_upload(
            bucket="restaurant-photos",
            path=filename,
            file_bytes=compressed_image,
            content_type="image/jpeg"
        )
        
        if not public_url:
            return JSONResponse(
                content={"success": False, "message": "Ошибка загрузки в storage"},
                status_code=500
            )
        
        print(f"✅ Public URL: {public_url}")
        
        # Add to restaurant photos array
        success = await restaurant_service.add_photo(restaurant_id, public_url)
        
        if not success:
            return JSONResponse(
                content={"success": False, "message": "Ошибка обновления БД"},
                status_code=500
            )
        
        # Get updated restaurant
        restaurant = await restaurant_service.get_by_id(restaurant_id)
        total_photos = len(restaurant.get("photos", [])) if restaurant else 0
        
        return JSONResponse(content={
            "success": True,
            "photo_url": public_url,
            "total_photos": total_photos,
            "message": f"Фото загружено! Всего: {total_photos}"
        })
        
    except Exception as e:
        print(f"❌ Upload error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            content={"success": False, "message": f"Ошибка загрузки: {str(e)}"},
            status_code=500
        )

@router.delete("/restaurants/{restaurant_id}/photos/{photo_index}")
async def delete_restaurant_photo(restaurant_id: int, photo_index: int):
    """
    Удалить фото по индексу
    """
    
    try:
        # Remove from DB and get URL
        success, photo_url = await restaurant_service.remove_photo(restaurant_id, photo_index)
        
        if not success:
            return JSONResponse(
                content={"success": False, "message": "Ошибка удаления из БД"},
                status_code=400
            )
        
        # Delete from storage
        if photo_url:
            # Extract filename from URL
            filename = photo_url.split('/restaurant-photos/')[-1]
            
            print(f"🗑️ Deleting photo: {filename}")
            
            await db.storage_delete(
                bucket="restaurant-photos",
                path=filename
            )
        
        # Get updated restaurant
        restaurant = await restaurant_service.get_by_id(restaurant_id)
        total_photos = len(restaurant.get("photos", [])) if restaurant else 0
        
        return JSONResponse(content={
            "success": True,
            "total_photos": total_photos,
            "message": "Фото удалено"
        })
        
    except Exception as e:
        print(f"❌ Delete error: {e}")
        return JSONResponse(
            content={"success": False, "message": f"Ошибка удаления: {str(e)}"},
            status_code=500
        )
