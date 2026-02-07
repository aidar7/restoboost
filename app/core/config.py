"""
Configuration module
Application settings and environment variables
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from dotenv import load_dotenv


# Load environment variables from .env file
load_dotenv(override=True)


class Settings(BaseSettings):
    """Application settings loaded from .env file"""
    
    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    
    # Server Configuration
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    
    # Frontend Configuration (для CORS)
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Application
    APP_NAME: str = "RestoBoost"
    API_V1_PREFIX: str = "/api"
    
    # Timezone
    TIMEZONE: str = "Asia/Almaty"
    
    # Image settings
    MAX_IMAGE_SIZE_MB: int = 10
    IMAGE_QUALITY: int = 85
    IMAGE_MAX_WIDTH: int = 1920
    
    # Booking settings
    DEFAULT_SLOT_DURATION: int = 60  # minutes
    DEFAULT_PARTY_SIZE: int = 2
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance
    Uses lru_cache to load settings only once
    """
    settings = Settings()
    
    # Дополнительная загрузка из os.environ если не установлены
    if not settings.SUPABASE_URL:
        settings.SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    
    if not settings.SUPABASE_ANON_KEY:
        settings.SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
    
    if not settings.SUPABASE_SERVICE_KEY:
        settings.SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
    
    if not settings.FRONTEND_URL or settings.FRONTEND_URL == "http://localhost:3000":
        settings.FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    
    if not settings.HOST or settings.HOST == "127.0.0.1":
        settings.HOST = os.environ.get("HOST", "127.0.0.1")
    
    if not settings.DEBUG:
        settings.DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "yes")
    
    return settings


# Global settings instance
settings = get_settings()


# Validate settings on startup
print("\n" + "="*50)
print("🔧 CONFIGURATION LOADED")
print("="*50)

if settings.SUPABASE_URL:
    print(f"✅ Supabase URL: {settings.SUPABASE_URL}")
else:
    print(f"❌ Supabase URL: NOT CONFIGURED")

if settings.SUPABASE_ANON_KEY:
    print(f"✅ Supabase Anon Key: {settings.SUPABASE_ANON_KEY[:20]}...")
else:
    print(f"❌ Supabase Anon Key: NOT CONFIGURED")

if settings.SUPABASE_SERVICE_KEY:
    print(f"✅ Supabase Service Key: {settings.SUPABASE_SERVICE_KEY[:20]}...")
else:
    print(f"⚠️  Supabase Service Key: NOT CONFIGURED (optional for some operations)")

print(f"✅ Frontend URL: {settings.FRONTEND_URL}")
print(f"✅ Host: {settings.HOST}")
print(f"✅ Debug: {settings.DEBUG}")
print("="*50 + "\n")

# Validate critical settings
if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
    print("⚠️  WARNING: Supabase credentials not fully configured!")
    print("   Please check your .env file and ensure:")
    print("   - SUPABASE_URL is set")
    print("   - SUPABASE_ANON_KEY is set")
