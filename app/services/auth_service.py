"""
FastAPI Authentication Service (БЕЗ HTTPBearer)
Работает с Supabase через REST API
Использует BIGINT типы для user_id и restaurant_id
"""

from fastapi import FastAPI, HTTPException, Depends, status, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

# ============================================
# КОНФИГУРАЦИЯ
# ============================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# ============================================
# МОДЕЛИ
# ============================================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    role: str = "customer"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    phone: Optional[str]
    role: str
    created_at: str

class AuthResponse(BaseModel):
    access_token: str
    user: UserResponse

# ============================================
# SUPABASE REST API CLIENT
# ============================================

class SupabaseClient:
    """Клиент для работы с Supabase через REST API"""
    
    def __init__(self, url: str, key: str, service_key: str):
        self.url = url
        self.key = key
        self.service_key = service_key
        self.auth_url = f"{url}/auth/v1"
        self.rest_url = f"{url}/rest/v1"
    
    async def sign_up(self, email: str, password: str) -> dict:
        """Создать пользователя в Supabase Auth"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.auth_url}/signup",
                json={"email": email, "password": password},
                headers={"apikey": self.key}
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Sign up failed: {response.text}"
                )
            return response.json()
    
    async def sign_in(self, email: str, password: str) -> dict:
        """Логин пользователя"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.auth_url}/token?grant_type=password",
                json={"email": email, "password": password},
                headers={"apikey": self.key}
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            return response.json()
    
    async def get_user(self, token: str) -> dict:
        """Получить данные пользователя по токену"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.auth_url}/user",
                headers={"apikey": self.key, "Authorization": f"Bearer {token}"}
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token"
                )
            return response.json()
    
    async def insert_user(self, user_data: dict) -> dict:
        """Вставить пользователя в таблицу users"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.rest_url}/users",
                json=user_data,
                headers={
                    "apikey": self.key,
                    "Authorization": f"Bearer {self.service_key}",
                    "Content-Type": "application/json"
                }
            )
            if response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insert user failed: {response.text}"
                )
            return response.json()
    
    async def get_user_by_email(self, email: str) -> dict:
        """Получить пользователя по email"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.rest_url}/users?email=eq.{email}",
                headers={"apikey": self.key}
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get user"
                )
            data = response.json()
            if not data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            return data[0]
    
    async def get_restaurants(self, user_id: int) -> list:
        """Получить рестораны пользователя"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.rest_url}/restaurant_owners?user_id=eq.{user_id}",
                headers={"apikey": self.key}
            )
            if response.status_code != 200:
                return []
            return response.json()
    
    async def is_restaurant_owner(self, user_id: int, restaurant_id: int) -> bool:
        """Проверить, является ли пользователь владельцем ресторана"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.rest_url}/restaurant_owners?user_id=eq.{user_id}&restaurant_id=eq.{restaurant_id}",
                headers={"apikey": self.key}
            )
            if response.status_code != 200:
                return False
            data = response.json()
            return len(data) > 0

# ============================================
# ИНИЦИАЛИЗАЦИЯ КЛИЕНТА
# ============================================

supabase = SupabaseClient(SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY)

# ============================================
# СЕРВИС АУТЕНТИФИКАЦИИ
# ============================================

class AuthService:
    """Сервис для работы с аутентификацией"""
    
    @staticmethod
    async def register_user(email: str, password: str, full_name: str, phone: str, role: str = "customer") -> dict:
        """Регистрация нового пользователя"""
        try:
            # Создаём пользователя в Supabase Auth
            auth_user = await supabase.sign_up(email, password)
            
            # Добавляем пользователя в таблицу users
            user_data = {
                "email": email,
                "full_name": full_name,
                "phone": phone,
                "role": role
            }
            
            await supabase.insert_user(user_data)
            
            return {
                "success": True,
                "email": email
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration failed: {str(e)}"
            )
    
    @staticmethod
    async def login_user(email: str, password: str) -> dict:
        """Логин пользователя"""
        try:
            # Логинимся в Supabase Auth
            auth_response = await supabase.sign_in(email, password)
            
            # Получаем данные пользователя из таблицы users
            user = await supabase.get_user_by_email(email)
            
            return {
                "access_token": auth_response["access_token"],
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "full_name": user["full_name"],
                    "phone": user.get("phone"),
                    "role": user["role"],
                    "created_at": user["created_at"]
                }
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Login failed: {str(e)}"
            )
    
    @staticmethod
    async def get_user_by_token(token: str) -> dict:
        """Получить пользователя по JWT токену"""
        try:
            # Проверяем токен в Supabase
            auth_user = await supabase.get_user(token)
            
            # Получаем данные пользователя из таблицы users по email
            user = await supabase.get_user_by_email(auth_user["email"])
            
            return {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "phone": user.get("phone"),
                "role": user["role"],
                "created_at": user["created_at"]
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )

# ============================================
# DEPENDENCY для проверки токена
# ============================================

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Получить текущего пользователя из JWT токена"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )
    
    # Извлечь токен из "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    
    token = parts[1]
    return await AuthService.get_user_by_token(token)

# ============================================
# API ENDPOINTS
# ============================================

app = FastAPI(title="RestoBoost Auth API")

@app.post("/api/auth/register", response_model=AuthResponse)
async def register(user_data: UserRegister):
    """Регистрация нового пользователя"""
    await AuthService.register_user(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=user_data.role
    )
    
    # Логинимся после регистрации
    return await AuthService.login_user(user_data.email, user_data.password)

@app.post("/api/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    """Логин пользователя"""
    return await AuthService.login_user(credentials.email, credentials.password)

@app.get("/api/auth/user", response_model=UserResponse)
async def get_user(user: dict = Depends(get_current_user)):
    """Получить данные текущего пользователя"""
    return user

@app.post("/api/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    """Логаут пользователя"""
    return {"message": "Logged out successfully"}

@app.get("/api/auth/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {"status": "ok", "service": "auth"}

@app.get("/api/auth/restaurants")
async def get_user_restaurants(user: dict = Depends(get_current_user)):
    """Получить все рестораны пользователя"""
    restaurants = await supabase.get_restaurants(user["id"])
    return {"restaurants": [r["restaurant_id"] for r in restaurants]}

@app.get("/api/auth/is-owner/{restaurant_id}")
async def check_is_owner(restaurant_id: int, user: dict = Depends(get_current_user)):
    """Проверить, является ли пользователь владельцем ресторана"""
    is_owner = await supabase.is_restaurant_owner(user["id"], restaurant_id)
    return {"is_owner": is_owner}

# ============================================
# ЗАПУСК ПРИЛОЖЕНИЯ
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
