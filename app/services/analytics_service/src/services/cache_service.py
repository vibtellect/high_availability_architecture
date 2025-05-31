"""
Cache Service
Redis-based caching for Analytics Service
"""

import json
import redis
import structlog
from typing import Any, Optional
from src.config.settings import Config

logger = structlog.get_logger(__name__)


class CacheService:
    """Redis cache service"""
    
    def __init__(self):
        self.config = Config()
        self._redis_client = None
        self._initialize_redis()
    
    def _initialize_redis(self):
        """Initialize Redis connection"""
        try:
            self._redis_client = redis.Redis.from_url(
                self.config.REDIS_URL,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True
            )
            
            # Test connection
            self._redis_client.ping()
            logger.info("Redis cache service initialized", url=self.config.REDIS_URL)
            
        except redis.RedisError as e:
            logger.error("Failed to initialize Redis cache", error=str(e))
            self._redis_client = None
        except Exception as e:
            logger.error("Unexpected error initializing Redis", error=str(e))
            self._redis_client = None
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self._redis_client:
            return None
        
        try:
            value = self._redis_client.get(key)
            if value is None:
                return None
            
            # Try to deserialize JSON
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
                
        except redis.RedisError as e:
            logger.error("Failed to get from cache", key=key, error=str(e))
            return None
        except Exception as e:
            logger.error("Unexpected error getting from cache", key=key, error=str(e))
            return None
    
    def set(self, key: str, value: Any, ttl: int = None) -> bool:
        """Set value in cache with optional TTL"""
        if not self._redis_client:
            return False
        
        try:
            # Serialize value to JSON if it's not a string
            if not isinstance(value, str):
                value = json.dumps(value, default=str)
            
            if ttl:
                result = self._redis_client.setex(key, ttl, value)
            else:
                result = self._redis_client.set(key, value)
            
            return bool(result)
            
        except redis.RedisError as e:
            logger.error("Failed to set cache", key=key, error=str(e))
            return False
        except Exception as e:
            logger.error("Unexpected error setting cache", key=key, error=str(e))
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self._redis_client:
            return False
        
        try:
            result = self._redis_client.delete(key)
            return bool(result)
            
        except redis.RedisError as e:
            logger.error("Failed to delete from cache", key=key, error=str(e))
            return False
        except Exception as e:
            logger.error("Unexpected error deleting from cache", key=key, error=str(e))
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self._redis_client:
            return False
        
        try:
            return bool(self._redis_client.exists(key))
            
        except redis.RedisError as e:
            logger.error("Failed to check cache existence", key=key, error=str(e))
            return False
        except Exception as e:
            logger.error("Unexpected error checking cache", key=key, error=str(e))
            return False
    
    def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment counter in cache"""
        if not self._redis_client:
            return None
        
        try:
            return self._redis_client.incr(key, amount)
            
        except redis.RedisError as e:
            logger.error("Failed to increment cache counter", key=key, error=str(e))
            return None
        except Exception as e:
            logger.error("Unexpected error incrementing cache", key=key, error=str(e))
            return None
    
    def expire(self, key: str, ttl: int) -> bool:
        """Set expiration time for existing key"""
        if not self._redis_client:
            return False
        
        try:
            return bool(self._redis_client.expire(key, ttl))
            
        except redis.RedisError as e:
            logger.error("Failed to set cache expiration", key=key, error=str(e))
            return False
        except Exception as e:
            logger.error("Unexpected error setting cache expiration", key=key, error=str(e))
            return False
    
    def get_many(self, keys: list) -> dict:
        """Get multiple values from cache"""
        if not self._redis_client:
            return {}
        
        try:
            values = self._redis_client.mget(keys)
            result = {}
            
            for key, value in zip(keys, values):
                if value is not None:
                    try:
                        result[key] = json.loads(value)
                    except json.JSONDecodeError:
                        result[key] = value
            
            return result
            
        except redis.RedisError as e:
            logger.error("Failed to get multiple from cache", keys=keys, error=str(e))
            return {}
        except Exception as e:
            logger.error("Unexpected error getting multiple from cache", keys=keys, error=str(e))
            return {}
    
    def set_many(self, mapping: dict, ttl: int = None) -> bool:
        """Set multiple values in cache"""
        if not self._redis_client:
            return False
        
        try:
            # Serialize all values
            serialized_mapping = {}
            for key, value in mapping.items():
                if not isinstance(value, str):
                    serialized_mapping[key] = json.dumps(value, default=str)
                else:
                    serialized_mapping[key] = value
            
            # Use pipeline for atomic operation
            pipe = self._redis_client.pipeline()
            pipe.mset(serialized_mapping)
            
            if ttl:
                for key in serialized_mapping.keys():
                    pipe.expire(key, ttl)
            
            pipe.execute()
            return True
            
        except redis.RedisError as e:
            logger.error("Failed to set multiple in cache", keys=list(mapping.keys()), error=str(e))
            return False
        except Exception as e:
            logger.error("Unexpected error setting multiple in cache", keys=list(mapping.keys()), error=str(e))
            return False
    
    def flush_all(self) -> bool:
        """Clear all cache (use with caution)"""
        if not self._redis_client:
            return False
        
        try:
            self._redis_client.flushdb()
            logger.warning("Cache flushed - all data cleared")
            return True
            
        except redis.RedisError as e:
            logger.error("Failed to flush cache", error=str(e))
            return False
        except Exception as e:
            logger.error("Unexpected error flushing cache", error=str(e))
            return False
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        if not self._redis_client:
            return {'status': 'unavailable'}
        
        try:
            info = self._redis_client.info()
            return {
                'status': 'connected',
                'used_memory': info.get('used_memory_human', 'unknown'),
                'connected_clients': info.get('connected_clients', 0),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'hit_rate': self._calculate_hit_rate(info)
            }
            
        except redis.RedisError as e:
            logger.error("Failed to get cache stats", error=str(e))
            return {'status': 'error', 'error': str(e)}
        except Exception as e:
            logger.error("Unexpected error getting cache stats", error=str(e))
            return {'status': 'error', 'error': str(e)}
    
    def _calculate_hit_rate(self, info: dict) -> float:
        """Calculate cache hit rate"""
        hits = info.get('keyspace_hits', 0)
        misses = info.get('keyspace_misses', 0)
        total = hits + misses
        
        if total == 0:
            return 0.0
        
        return round((hits / total) * 100, 2)
    
    def health_check(self) -> bool:
        """Check if Redis is healthy"""
        if not self._redis_client:
            return False
        
        try:
            self._redis_client.ping()
            return True
        except Exception:
            return False 