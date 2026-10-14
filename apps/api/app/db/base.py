"""SQLAlchemy 엔진·세션.

- engine: DB 연결 풀. 앱 전체에서 하나.
- SessionLocal: 요청마다 하나씩 만드는 작업 단위(트랜잭션 경계).
- get_db: FastAPI 의존성. 요청이 끝나면 세션을 닫는다.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine(url: str | None = None):
    url = url or get_settings().database_url
    kwargs: dict = {}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
        # 파일 DB 면 상위 폴더(data/)를 미리 만든다. 없으면 "unable to open database file".
        path = url.split("///", 1)[1] if "///" in url else ""
        if path and path != ":memory:" and not path.startswith("file:"):
            Path(path).expanduser().parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(url, **kwargs)
    if url.startswith("sqlite"):
        # SQLite 는 외래키 제약을 기본으로 끄기 때문에 켜 준다.
        @event.listens_for(engine, "connect")
        def _fk_on(dbapi_conn, _):
            dbapi_conn.execute("PRAGMA foreign_keys=ON")

    return engine


engine = make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
