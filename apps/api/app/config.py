"""환경 설정.

pydantic-settings 는 환경변수(또는 .env 파일)를 읽어 타입이 맞는 설정 객체를 만들어 줍니다.
예) DATABASE_URL=postgresql+psycopg://... 를 환경변수로 주면 settings.database_url 로 읽힙니다.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="EODISAN_", extra="ignore")

    # DB: 기본은 로컬 SQLite(개발/테스트). 운영은 Postgres+pgvector.
    database_url: str = "sqlite:///./data/eodisan.db"
    redis_url: str | None = None

    # 식약처 식품안전나라 OpenAPI 인증키 (https://www.foodsafetykorea.go.kr/apiMain.do)
    mfds_api_key: str | None = None
    mfds_base_url: str = "http://openapi.foodsafetykorea.go.kr/api"

    # 이미지 인식(선택): ONNX 임베딩 모델 경로. 없으면 /recognize 는 501 을 돌려준다.
    embedder_onnx_path: str | None = None
    embedding_model_version: str = "dinov3-vits16-v0"
    embedding_dim: int = 512

    cors_origins: list[str] = ["*"]
    debug: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
