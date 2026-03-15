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
    
class GoogleCallbackRequest(BaseModel):
    token: str  # Google ID token


class GoogleLoginResponse(BaseModel):
    access_token: str
    user: dict


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

@router.post("/google/callback")
async def google_callback(request: GoogleCallbackRequest):
    try:
        google_user = await auth_service.verify_google_token(request.token)
        user = await auth_service.create_or_update_google_user(google_user)
        
        await auth_service.log_action(
            user_id=str(user.get("id", "")),
            action="login",
            resource="user",
            details={"provider": "google", "email": user.get("email")}
        )
        
        return {
            "success": True,
            "message": "Google login successful",
            "access_token": request.token,
            "user": {
                "id": user.get("id"),
                "email": user.get("email"),
                "full_name": user.get("full_name"),
                "role": user.get("role", "customer"),
                "access_token": request.token
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google login failed: {str(e)}"
        )



@router.post("/google/login")
async def google_login_endpoint(request: GoogleCallbackRequest):
    """
    Логин через Google OAuth
    Принимает Google ID token и возвращает данные пользователя
    """
    try:
        result = await auth_service.google_login(request.token)
        
        # Логируем действие
        await auth_service.log_action(
            user_id=str(result["user"].get("id", "")),
            action="google_login",
            resource="user",
            details={"email": result["user"].get("email")}
        )
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google login failed: {str(e)}"
        )

