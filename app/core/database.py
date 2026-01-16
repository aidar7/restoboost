"""
Database module
Supabase async client for REST API operations
"""
import httpx
from typing import Optional, List, Dict, Any
from app.core.config import settings


class SupabaseClient:
    """
    Async клиент для работы с Supabase REST API
    
    Поддерживает:
    - CRUD операции (GET, POST, PATCH, DELETE)
    - Storage операции (upload, delete)
    - Фильтрация и сортировка
    """
    
    def __init__(self):
        """Initialize Supabase client with credentials from settings"""
        self.url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_ANON_KEY
        self.timeout = 10.0
        
        # Validate credentials
        if not self.url or not self.key:
            raise ValueError("Supabase credentials not configured in .env file")
    
    def get_headers(self) -> Dict[str, str]:
        """
        Get HTTP headers for Supabase requests
        
        Returns:
            Dict with apikey, Authorization and Content-Type headers
        """
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json"
        }
    
    async def get(
        self, 
        table: str, 
        filters: Optional[Dict[str, str]] = None, 
        select: str = "*",
        order: Optional[str] = None,
        limit: Optional[int] = None
    ) -> Optional[List[Dict[str, Any]]]:
        
        """
        GET request to Supabase table
        
        Args:
            table: Table name
            filters: Query filters (e.g. {"id": "eq.1", "status": "eq.active"})
            select: Fields to select (default: "*")
            order: Order by field (e.g. "created_at.desc")
            limit: Maximum number of records
        
        Returns:
            List of records or None on error
        """
        url = f"{self.url}/rest/v1/{table}?select={select}"
        
        
        # DEBUG логирование (ПОСЛЕ определения url!)
        print(f"=== DEBUG db.get ===")
        print(f"Table: '{table}'")
        print(f"Filters: {filters}")
        print(f"URL: {url}")
    
        # Add filters
        if filters:
            for key, value in filters.items():
                url += f"&{key}={value}"
        
        # Add ordering
        if order:
            url += f"&order={order}"
        
        # Add limit
        if limit:
            url += f"&limit={limit}"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, headers=self.get_headers())
                
                if resp.status_code == 200:
                    return resp.json()
                
                print(f"⚠️  Supabase GET error [{resp.status_code}]: {resp.text}")
                return None
        except httpx.TimeoutException:
            print(f"❌ Database GET timeout for table '{table}'")
            return None
        except Exception as e:
            print(f"❌ Database GET error: {e}")
            return None
    
    async def post(
        self, 
        table: str, 
        data: Dict[str, Any], 
        return_rep: bool = True
    ) -> Optional[List[Dict[str, Any]]]:
        """
        POST request to create record in Supabase table
        
        Args:
            table: Table name
            data: Record data
            return_rep: Return created record (default: True)
        
        Returns:
            Created record(s) or None on error
        """
        url = f"{self.url}/rest/v1/{table}"
        headers = self.get_headers()
        
        if return_rep:
            headers["Prefer"] = "return=representation"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, json=data, headers=headers)
                
                if resp.status_code in (200, 201):
                    return resp.json() if return_rep else [{"success": True}]
                
                print(f"⚠️  Supabase POST error [{resp.status_code}]: {resp.text}")
                return None
        except httpx.TimeoutException:
            print(f"❌ Database POST timeout for table '{table}'")
            return None
        except Exception as e:
            print(f"❌ Database POST error: {e}")
            return None
    
    async def patch(
        self, 
        table: str, 
        filters: Dict[str, str], 
        data: Dict[str, Any]
    ) -> bool:
        """
        PATCH request to update record in Supabase table
        
        Args:
            table: Table name
            filters: Query filters to identify record(s)
            data: Updated data
        
        Returns:
            True on success, False on error
        """
        url = f"{self.url}/rest/v1/{table}?"
        filter_str = "&".join([f"{k}={v}" for k, v in filters.items()])
        url += filter_str
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.patch(url, json=data, headers=self.get_headers())
                
                if resp.status_code in (200, 204):
                    return True
                
                print(f"⚠️  Supabase PATCH error [{resp.status_code}]: {resp.text}")
                return False
        except httpx.TimeoutException:
            print(f"❌ Database PATCH timeout for table '{table}'")
            return False
        except Exception as e:
            print(f"❌ Database PATCH error: {e}")
            return False
    
    # app/core/database.py
# После метода patch добавь:

    async def update(
        self, 
        table: str, 
        filters: Dict[str, str], 
        data: Dict[str, Any]
    ) -> Optional[List[Dict[str, Any]]]:
        """
        UPDATE records in Supabase table (returns updated records)
        
        Args:
            table: Table name
            filters: Query filters (e.g. {"id": "eq.1"})
            data: Updated data
        
        Returns:
            Updated record(s) or None on error
        """
        url = f"{self.url}/rest/v1/{table}?"
        filter_str = "&".join([f"{k}={v}" for k, v in filters.items()])
        url += filter_str
        
        print(f"\n=== DEBUG db.update ===")
        print(f"Table: '{table}'")
        print(f"Filters: {filters}")
        print(f"Data: {data}")
        
        headers = self.get_headers()
        headers["Prefer"] = "return=representation"  # Вернуть обновлённые записи
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.patch(url, json=data, headers=headers)
                
                if resp.status_code == 200:
                    print(f"✅ Updated {len(resp.json())} record(s)")
                    return resp.json()
                
                print(f"⚠️  Supabase UPDATE error [{resp.status_code}]: {resp.text}")
                return None
        except httpx.TimeoutException:
            print(f"❌ Database UPDATE timeout for table '{table}'")
            return None
        except Exception as e:
            print(f"❌ Database UPDATE error: {e}")
            return None

    
    
    async def delete(self, table: str, filters: Dict[str, str]) -> bool:
        """
        DELETE request to remove record from Supabase table
        
        Args:
            table: Table name
            filters: Query filters to identify record(s)
        
        Returns:
            True on success, False on error
        """
        url = f"{self.url}/rest/v1/{table}?"
        filter_str = "&".join([f"{k}={v}" for k, v in filters.items()])
        url += filter_str
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.delete(url, headers=self.get_headers())
                
                if resp.status_code == 204:
                    return True
                
                print(f"⚠️  Supabase DELETE error [{resp.status_code}]: {resp.text}")
                return False
        except httpx.TimeoutException:
            print(f"❌ Database DELETE timeout for table '{table}'")
            return False
        except Exception as e:
            print(f"❌ Database DELETE error: {e}")
            return False
    
    async def storage_upload(
        self, 
        bucket: str, 
        path: str, 
        file_bytes: bytes, 
        content_type: str = "image/jpeg"
    ) -> Optional[str]:
        """
        Upload file to Supabase Storage
        
        Args:
            bucket: Storage bucket name
            path: File path in bucket
            file_bytes: File content as bytes
            content_type: MIME type (default: image/jpeg)
        
        Returns:
            Public URL of uploaded file or None on error
        """
        url = f"{self.url}/storage/v1/object/{bucket}/{path}"
        
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": content_type
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, content=file_bytes, headers=headers)
                
                if resp.status_code in (200, 201):
                    public_url = f"{self.url}/storage/v1/object/public/{bucket}/{path}"
                    print(f"✅ File uploaded: {public_url}")
                    return public_url
                
                print(f"⚠️  Storage upload error [{resp.status_code}]: {resp.text}")
                return None
        except httpx.TimeoutException:
            print(f"❌ Storage upload timeout for '{path}'")
            return None
        except Exception as e:
            print(f"❌ Storage upload error: {e}")
            return None
    
    async def storage_delete(self, bucket: str, path: str) -> bool:
        """
        Delete file from Supabase Storage
        
        Args:
            bucket: Storage bucket name
            path: File path in bucket
        
        Returns:
            True on success, False on error
        """
        url = f"{self.url}/storage/v1/object/{bucket}/{path}"
        
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}"
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.delete(url, headers=headers)
                
                if resp.status_code == 200:
                    print(f"✅ File deleted: {path}")
                    return True
                
                print(f"⚠️  Storage delete error [{resp.status_code}]: {resp.text}")
                return False
        except httpx.TimeoutException:
            print(f"❌ Storage delete timeout for '{path}'")
            return False
        except Exception as e:
            print(f"❌ Storage delete error: {e}")
            return False


# ============================================
# GLOBAL INSTANCE
# ============================================

# Singleton instance - используется во всем приложении
supabase_client = SupabaseClient()

# Alias для обратной совместимости
db = supabase_client


def get_supabase() -> SupabaseClient:
    """
    Get Supabase client instance for dependency injection
    
    Usage:
        @app.get("/")
        async def endpoint(db: SupabaseClient = Depends(get_supabase)):
            ...
    """
    return supabase_client
