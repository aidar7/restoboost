# app/api/auth.py (НОВАЯ, ПРАВИЛЬНАЯ ВЕРСИЯ)

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr

# Импортируем наш мощный сервис
from app.services.auth_service import auth_service

router = APIRouter()

# --- Модели для валидации входящих данных ---

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    role: str = "customer"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenRequest(BaseModel):
    token: str

# --- Эндпоинты ---

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """
    Эндпоинт для регистрации. Принимает данные и передает их в auth_service.
    """
    try:
        result = await auth_service.register(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            phone=request.phone,
            role=request.role
        )
        return result
    except Exception as e:
        # Перехватываем ошибку из сервиса и возвращаем ее как HTTP ошибку
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login")
async def login(request: LoginRequest):
    """
    Эндпоинт для входа. Передает email и пароль в auth_service.
    """
    try:
        result = await auth_service.login(email=request.email, password=request.password)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@router.post("/verify-token")
async def verify_token(request: TokenRequest):
    """
    Эндпоинт для проверки токена и получения данных пользователя.
    """
    try:
        user_data = await auth_service.verify_token(request.token)
        return user_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

