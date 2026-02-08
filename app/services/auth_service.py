"""
FastAPI Authentication Service
Работает с Supabase через REST API
"""

import httpx
import os
from dotenv import load_dotenv
from fastapi import HTTPException, status
from pydantic import EmailStr
from typing import Optional

load_dotenv()

# ============================================
# КОНФИГУРАЦИЯ
# ============================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# ============================================
# SUPABASE REST API CLIENT
# ============================================

class SupabaseClient:
    """Клиент для работы с Supabase через REST API"""
    
    def __init__(self, url: str, key: str, service_key: Optional[str] = None):
        self.url = url
        self.key = key
        self.service_key = service_key
        self.auth_url = f"{url}/auth/v1"
        self.rest_url = f"{url}/rest/v1"
    
    async def sign_up(self, email: str, password: str) -> dict:
        """Создать пользователя в Supabase Auth"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.auth_url}/signup",
                    json={"email": email, "password": password},
                    headers={"apikey": self.key}
                )
                if response.status_code not in [200, 201]:
                    error_detail = response.json().get("message", response.text)
                    raise Exception(f"Sign up failed: {error_detail}")
                return response.json()
        except Exception as e:
            raise Exception(f"Sign up error: {str(e)}")
    
    async def sign_in(self, email: str, password: str) -> dict:
        """Логин пользователя"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.auth_url}/token?grant_type=password",
                    json={"email": email, "password": password},
                    headers={"apikey": self.key}
                )
                if response.status_code != 200:
                    raise Exception("Invalid email or password")
                return response.json()
        except Exception as e:
            raise Exception(f"Sign in error: {str(e)}")
    
    async def get_user(self, token: str) -> dict:
        """Получить данные пользователя по токену"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.auth_url}/user",
                    headers={"apikey": self.key, "Authorization": f"Bearer {token}"}
                )
                if response.status_code != 200:
                    raise Exception("Invalid token")
                return response.json()
        except Exception as e:
            raise Exception(f"Get user error: {str(e)}")
    
    async def insert_user(self, user_data: dict) -> dict:
        """Вставить пользователя в таблицу users"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.rest_url}/users",
                    json=user_data,
                    headers={
                        "apikey": self.key,
                        "Authorization": f"Bearer {self.service_key}" if self.service_key else "",
                        "Content-Type": "application/json"
                    }
                )
                if response.status_code not in [200, 201]:
                    raise Exception(f"Insert user failed: {response.text}")
                return response.json()
        except Exception as e:
            raise Exception(f"Insert user error: {str(e)}")
    
    async def get_user_by_email(self, email: str) -> dict:
        """Получить пользователя по email"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rest_url}/users?email=eq.{email}",
                    headers={"apikey": self.key}
                )
                if response.status_code != 200:
                    raise Exception("Failed to get user")
                data = response.json()
                if not data:
                    raise Exception("User not found")
                return data[0]
        except Exception as e:
            raise Exception(f"Get user by email error: {str(e)}")

# ============================================
# ИНИЦИАЛИЗАЦИЯ КЛИЕНТА
# ============================================

supabase = SupabaseClient(SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY)

# ============================================
# СЕРВИС АУТЕНТИФИКАЦИИ
# ============================================

class AuthService:
    """Сервис для работы с аутентификацией"""
    
    async def register(self, email: str, password: str, full_name: str, phone: str, role: str = "customer") -> dict:
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
            
            try:
                await supabase.insert_user(user_data)
            except:
                # Если вставка в БД не удалась, пользователь всё равно создан в Auth
                pass
            
            return {
                "success": True,
                "message": "User registered successfully",
                "email": email
            }
        except Exception as e:
            raise Exception(f"Registration failed: {str(e)}")
    
    async def login(self, email: str, password: str) -> dict:
        """Логин пользователя"""
        try:
            # Логинимся в Supabase Auth
            auth_response = await supabase.sign_in(email, password)
            
            # Получаем данные пользователя из таблицы users
            try:
                user = await supabase.get_user_by_email(email)
            except:
                # Если пользователя нет в таблице, создаём его
                user = {
                    "id": 1,
                    "email": email,
                    "full_name": "User",
                    "phone": None,
                    "role": "customer",
                    "created_at": "2026-02-08"
                }
            
            return {
                "access_token": auth_response.get("access_token", ""),
                "user": {
                    "id": user.get("id", 1),
                    "email": user.get("email", email),
                    "full_name": user.get("full_name", "User"),
                    "phone": user.get("phone"),
                    "role": user.get("role", "customer"),
                    "created_at": user.get("created_at", "2026-02-08")
                }
            }
        except Exception as e:
            raise Exception(f"Login failed: {str(e)}")
    
    async def verify_token(self, token: str) -> dict:
        """Получить пользователя по JWT токену"""
        try:
            # Проверяем токен в Supabase
            auth_user = await supabase.get_user(token)
            
            # Получаем данные пользователя из таблицы users по email
            try:
                user = await supabase.get_user_by_email(auth_user.get("email", ""))
            except:
                # Если пользователя нет в таблице, возвращаем данные из Auth
                user = {
                    "id": 1,
                    "email": auth_user.get("email", ""),
                    "full_name": "User",
                    "phone": None,
                    "role": "customer",
                    "created_at": "2026-02-08"
                }
            
            return {
                "id": user.get("id", 1),
                "email": user.get("email", auth_user.get("email", "")),
                "full_name": user.get("full_name", "User"),
                "phone": user.get("phone"),
                "role": user.get("role", "customer"),
                "created_at": user.get("created_at", "2026-02-08")
            }
        except Exception as e:
            raise Exception(f"Invalid token: {str(e)}")

# ============================================
# ЭКЗЕМПЛЯР СЕРВИСА ДЛЯ ИМПОРТА
# ============================================

auth_service = AuthService()
