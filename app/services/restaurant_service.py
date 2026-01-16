"""
Restaurant Service - Production Ready
Работает с вашей БД структурой и кастомным SupabaseClient
"""
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from app.core.database import db


class RestaurantService:
    """Сервис для работы с ресторанами и их timeslots"""
    
    @staticmethod
    async def get_by_id(restaurant_id: int) -> Optional[Dict]:
        """Получить ресторан по ID"""
        filters = {"id": f"eq.{restaurant_id}"}
        result = await db.get("restaurants", filters=filters)
        return result[0] if result else None
    
    @staticmethod
    async def update(restaurant_id: int, **kwargs) -> Optional[Dict]:
        """Обновить ресторан"""
        try:
            filters = {"id": f"eq.{restaurant_id}"}
            
            success = await db.patch(
                table="restaurants",
                filters=filters,
                data=kwargs
            )
            
            if success:
                # Получаем обновленный ресторан
                result = await db.get(
                    table="restaurants",
                    filters=filters
                )
                return result[0] if result else None
            
            return None
        except Exception as e:
            print(f"❌ Ошибка обновления ресторана: {e}")
            return None

    
    @staticmethod
    async def get_timeslots_by_restaurant(
        restaurant_id: int, 
        target_date: date
    ) -> List[Dict]:
        """
        Получить активные timeslots для ресторана на конкретную дату.
        
        ✅ Проверяет:
        - is_active = true
        - valid_from <= target_date <= valid_to
        
        Args:
            restaurant_id: ID ресторана
            target_date: Дата в формате date или YYYY-MM-DD
        
        Returns:
            Список timeslots с полями:
            - id, restaurant_id, time_start, time_end
            - discount, description, max_tables
            - is_active, valid_from, valid_to, day_of_week
        """
        try:
            # Преобразуем date в строку если нужно
            date_str = target_date.isoformat() if isinstance(target_date, date) else target_date
            
            # Фильтры для Supabase REST API
            filters = {
                "restaurant_id": f"eq.{restaurant_id}",
                "is_active": "eq.true",
                "valid_from": f"lte.{date_str}",
                "valid_to": f"gte.{date_str}"
            }
            
            result = await db.get(
                table="discount_rules",
                filters=filters,
                select="id,restaurant_id,day_of_week,time_start,time_end,discount,description,is_active,valid_from,valid_to,max_tables"
            )
            
            return result if result else []
        except Exception as e:
            print(f"❌ Ошибка получения timeslots: {e}")
            return []
    
    
    @staticmethod
    async def get_timeslots_by_day_of_week(
        restaurant_id: int,
        day_of_week: int  # 0 = Monday, 6 = Sunday
    ) -> List[Dict]:
        """
        Получить timeslots для конкретного дня недели.
        
        Args:
            restaurant_id: ID ресторана
            day_of_week: День недели (0-6)
        
        Returns:
            Список timeslots
        """
        try:
            filters = {
                "restaurant_id": f"eq.{restaurant_id}",
                "day_of_week": f"eq.{day_of_week}",
                "is_active": "eq.true"
            }
            
            result = await db.get(
                table="discount_rules",
                filters=filters
            )
            
            return result if result else []
        except Exception as e:
            print(f"❌ Ошибка получения timeslots по дню недели: {e}")
            return []
    
    
    @staticmethod
    async def get_all_timeslots(restaurant_id: int) -> List[Dict]:
        """Получить ВСЕ timeslots для ресторана (без фильтра по дате)"""
        try:
            filters = {"restaurant_id": f"eq.{restaurant_id}"}
            
            result = await db.get(
                table="discount_rules",
                filters=filters
            )
            
            return result if result else []
        except Exception as e:
            print(f"❌ Ошибка получения всех timeslots: {e}")
            return []
    
    
    @staticmethod
    async def create_timeslot(
        restaurant_id: int,
        time_start: str,  # HH:MM:SS или HH:MM
        time_end: str,    # HH:MM:SS или HH:MM
        discount: int,
        description: str,
        valid_from: date,
        valid_to: date,
        max_tables: int = 4,
        day_of_week: Optional[int] = None,
        is_active: bool = True
    ) -> Optional[Dict]:
        """
        Создать новый timeslot с акцией.
        
        Args:
            restaurant_id: ID ресторана
            time_start: Время начала (HH:MM:SS)
            time_end: Время конца (HH:MM:SS)
            discount: Скидка в процентах (10, 20, 30)
            description: Описание акции ("Happy Hour", "на все меню")
            valid_from: Дата начала акции
            valid_to: Дата конца акции
            max_tables: Максимум столов одновременно
            day_of_week: День недели (0-6) или None для всех дней
            is_active: Активна ли акция
        
        Returns:
            Созданный timeslot или None
        """
        try:
            # Преобразуем даты в строки
            valid_from_str = valid_from.isoformat() if isinstance(valid_from, date) else valid_from
            valid_to_str = valid_to.isoformat() if isinstance(valid_to, date) else valid_to
            
            data = {
                "restaurant_id": restaurant_id,
                "time_start": time_start,
                "time_end": time_end,
                "discount": discount,
                "description": description,
                "valid_from": valid_from_str,
                "valid_to": valid_to_str,
                "max_tables": max_tables,
                "day_of_week": day_of_week,
                "is_active": is_active
            }
            
            result = await db.post(
                table="discount_rules",
                data=data,
                return_rep=True
            )
            
            return result[0] if result else None
        except Exception as e:
            print(f"❌ Ошибка создания timeslot: {e}")
            return None
    
    
    @staticmethod
    async def update_timeslot(
        timeslot_id: int,
        **kwargs
    ) -> Optional[Dict]:
        """
        Обновить timeslot.
        
        Args:
            timeslot_id: ID timeslot
            **kwargs: Поля для обновления (discount, description, is_active и т.д.)
        
        Returns:
            Обновленный timeslot или None
        """
        try:
            filters = {"id": f"eq.{timeslot_id}"}
            
            success = await db.patch(
                table="discount_rules",
                filters=filters,
                data=kwargs
            )
            
            if success:
                # Получаем обновленный timeslot
                result = await db.get(
                    table="discount_rules",
                    filters=filters
                )
                return result[0] if result else None
            
            return None
        except Exception as e:
            print(f"❌ Ошибка обновления timeslot: {e}")
            return None
    
    
    @staticmethod
    async def deactivate_timeslot(timeslot_id: int) -> bool:
        """
        Деактивировать timeslot.
        
        Args:
            timeslot_id: ID timeslot
        
        Returns:
            True если успешно, False если ошибка
        """
        try:
            filters = {"id": f"eq.{timeslot_id}"}
            
            success = await db.patch(
                table="discount_rules",
                filters=filters,
                data={"is_active": False}
            )
            
            return success
        except Exception as e:
            print(f"❌ Ошибка деактивации timeslot: {e}")
            return False
    
    
    @staticmethod
    async def get_all(limit: int = 100) -> List[dict]:
        """Получить все рестораны"""
        try:
            print("=== DEBUG restaurant_service.get_all ===")
            print(f"Limit: {limit}")
        
            restaurants = await db.get(
                "restaurants", 
                limit=limit,
                order="created_at.desc"
            )
            
            print(f"db.get restaurants result: {restaurants}")
            print(f"Restaurants length: {len(restaurants) if restaurants else 0}")
            
            return restaurants or []
        except Exception as e:
            print(f"❌ Ошибка получения ресторанов: {e}")
            return []

    
    @staticmethod
    async def search(query: str) -> List[Dict]:
        """Поиск ресторанов по названию"""
        try:
            filters = {"name": f"ilike.%{query}%"}
            
            result = await db.get(
                table="restaurants",
                filters=filters
            )
            
            return result if result else []
        except Exception as e:
            print(f"❌ Ошибка поиска ресторанов: {e}")
            return []
    @staticmethod
    async def hard_delete(restaurant_id: int) -> bool:
        """Удалить ресторан полностью из БД"""
        try:
            print(f"🗑️ Hard deleting restaurant {restaurant_id}...")
            
            # Удалить все скидки для этого ресторана
            await db.delete(
                table="discount_rules",
                filters={"restaurant_id": f"eq.{restaurant_id}"}
            )
            print(f"✅ Deleted discount_rules for restaurant {restaurant_id}")
            
            # Удалить все сервисы для этого ресторана
            services = await db.get(
                table="restaurant_services",
                filters={"restaurant_id": f"eq.{restaurant_id}"}
            )
            
            for service in (services or []):
                service_id = service["id"]
                
                # Удалить вместимость для этого сервиса
                await db.delete(
                    table="service_capacity",
                    filters={"service_id": f"eq.{service_id}"}
                )
                
                # Удалить сам сервис
                await db.delete(
                    table="restaurant_services",
                    filters={"id": f"eq.{service_id}"}
                )
            
            print(f"✅ Deleted restaurant_services for restaurant {restaurant_id}")
            
            # Удалить сам ресторан
            success = await db.delete(
                table="restaurants",
                filters={"id": f"eq.{restaurant_id}"}
            )
            
            if success:
                print(f"✅ Restaurant {restaurant_id} hard deleted successfully")
                return True
            else:
                print(f"❌ Failed to delete restaurant {restaurant_id}")
                return False
                
        except Exception as e:
            print(f"❌ Error hard deleting restaurant: {e}")
            import traceback
            traceback.print_exc()
            return False


# ============================================================================
# ГЛОБАЛЬНЫЙ ЭКЗЕМПЛЯР
# ============================================================================

restaurant_service = RestaurantService()

# Alias для обратной совместимости (если используется где-то timeslot_service)
timeslot_service = restaurant_service