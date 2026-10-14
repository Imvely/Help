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

    # 업로드 저장소: 로컬 디렉터리(개발) → R2/MinIO(운영, M2 후반)
    upload_dir: str = "./data/uploads"
    # OCR: 요청 안에서 바로 처리(dev) / 워커 큐(prod). PaddleOCR 미설치면 Claude 비전만 사용.
    ocr_inline: bool = True
    ocr_use_paddle: bool = False
    # Claude 구조화 추출 (anthropic SDK 가 ANTHROPIC_API_KEY 를 읽는다). 비우면 정규식만.
    label_extraction_model: str = "claude-opus-5-5"
    label_extraction_enabled: bool = True
    label_verify_threshold: int = 3  # 같은 라벨 제보가 n명 이상 일치하면 verified

    # 인증: Supabase JWT (HS256). 비우면 /me/* 는 503
    supabase_jwt_secret: str | None = None
    # 프로필 암호화 키 (Fernet, base64 32바이트). 비우면 프로필 동기화 503
    profile_encryption_key: str | None = None

    # 푸시: Expo Push API
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"
    expo_access_token: str | None = None

    cors_origins: list[str] = ["*"]
    debug: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
