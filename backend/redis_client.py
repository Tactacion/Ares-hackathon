import redis.asyncio as redis
from config import get_settings
import json
from typing import Optional, Any

settings = get_settings()

class RedisClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.client = None
            self.initialized = True

    async def connect(self):
        """Connect to Redis"""
        self.client = await redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            decode_responses=True
        )
        print("✅ Connected to Redis")

    async def disconnect(self):
        """Disconnect from Redis"""
        if self.client:
            await self.client.close()

    async def set_json(self, key: str, value: Any, ttl: int = 2):
        """Store JSON with TTL"""
        await self.client.setex(key, ttl, json.dumps(value))

    async def get_json(self, key: str) -> Optional[Any]:
        """Retrieve JSON"""
        data = await self.client.get(key)
        return json.loads(data) if data else None

    async def cache_flight_data(self, data: dict):
        """Cache flight data with 2s TTL"""
        await self.set_json("flight_data", data, ttl=2)

    async def get_cached_flight_data(self) -> Optional[dict]:
        """Get cached flight data"""
        return await self.get_json("flight_data")

redis_client = RedisClient()
