"""
Configuration module
Application settings and environment variables
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    """Application settings loaded from .env file"""
    
    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    
    # Server Configuration
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    
    # Frontend Configuration (для CORS)
    FRONTEND_URL: str = "http://localhost:3000"  # ← ДОБАВЬ
    
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
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Загружаем из .env если не переданы в kwargs
        if not self.SUPABASE_URL:
            self.SUPABASE_URL = os.getenv("SUPABASE_URL", "")
        
        if not self.SUPABASE_ANON_KEY:
            self.SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
        
        # ← ДОБАВЬ загрузку FRONTEND_URL
        if not self.FRONTEND_URL or self.FRONTEND_URL == "http://localhost:3000":
            self.FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance
    Uses lru_cache to load settings only once
    """
    return Settings()

# Global settings instance
settings = get_settings()

# Validate settings on startup
if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
    print("⚠️  WARNING: Supabase credentials not configured!")
    print("   Please check your .env file")
else:
    print(f"✅ Supabase configured: {settings.SUPABASE_URL}")
    print(f"✅ Supabase key: {settings.SUPABASE_ANON_KEY[:20]}...")
    print(f"✅ Frontend URL: {settings.FRONTEND_URL}")  # ← ДОБАВЬ
