from PIL import Image
import io
from app.core.config import settings

def compress_image(
    image_bytes: bytes, 
    max_width: int = None, 
    quality: int = None
) -> bytes:
    """
    Сжатие изображения + конвертация в JPEG
    Принимает: любой формат (PNG, JPEG, WEBP, etc.)
    Возвращает: всегда JPEG
    """
    
    if max_width is None:
        max_width = settings.IMAGE_MAX_WIDTH
    
    if quality is None:
        quality = settings.IMAGE_QUALITY
    
    try:
        # Open image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert ANY format to RGB (для JPEG нужен RGB)
        if image.mode in ('RGBA', 'LA', 'P', 'L'):
            # Создаем белый фон
            background = Image.new('RGB', image.size, (255, 255, 255))
            
            # Если есть прозрачность - наложи на белый фон
            if image.mode == 'RGBA':
                background.paste(image, mask=image.split()[-1])
            elif image.mode == 'P':
                image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1])
            else:
                background.paste(image)
            
            image = background
        
        # Resize if too large
        if image.width > max_width:
            ratio = max_width / image.width
            new_height = int(image.height * ratio)
            image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
        # Save as JPEG with compression
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)
        
        return output.read()
        
    except Exception as e:
        print(f"❌ Image compression error: {e}")
        raise


def validate_image(file_bytes: bytes, max_size_mb: int = None) -> tuple[bool, str]:
    """Валидация изображения"""
    
    if max_size_mb is None:
        max_size_mb = settings.MAX_IMAGE_SIZE_MB
    
    # Check size
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > max_size_mb:
        return False, f"Файл слишком большой ({size_mb:.1f}MB > {max_size_mb}MB)"
    
    # Try to open as image
    try:
        Image.open(io.BytesIO(file_bytes))
        return True, "OK"
    except Exception as e:
        return False, f"Неверный формат изображения: {str(e)}"
