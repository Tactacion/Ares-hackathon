from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # API Keys
    anthropic_api_key: str
    elevenlabs_api_key: str = ""
    mapbox_token: str

    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    frontend_url: str = "http://localhost:5173"

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0

    # Target Airport (for demo)
    target_airport: str = "KDEN"  # Denver International
    monitoring_radius_nm: float = 40.0

    # Airport bounds (KDEN)
    airport_lat: float = 39.8561
    airport_lon: float = -104.6737

    # Data sources
    adsb_api_url: str = "https://api.airplanes.live/v2/point"
    weather_api_url: str = "https://avwx.rest/api"
    ntsb_data_path: str = "data/ntsb_accidents.json"

    # AI Configuration
    ai_model: str = "claude-sonnet-4-20250514"
    ai_max_tokens: int = 4000
    ai_temperature: float = 0.3  # Lower for safety-critical

    # Risk Detection Parameters
    runway_incursion_distance_ft: float = 500
    separation_minimum_nm: float = 3.0
    separation_minimum_ft: float = 1000
    weather_risk_visibility_sm: float = 3.0

    # Update intervals
    flight_update_interval_sec: int = 2
    weather_update_interval_sec: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()
