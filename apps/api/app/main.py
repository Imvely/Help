"""FastAPI 앱 진입점.

실행: uvicorn app.main:app --reload
문서: http://localhost:8000/docs (Swagger), /openapi.json (앱 타입 생성용)
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import contributions, kb, ocr, products, recalls, recognize

settings = get_settings()

app = FastAPI(
    title="어디산 API",
    version="0.1.0",
    description="제품 원산지·성분·회수 정보. 개인화 판정은 기기에서 수행합니다.",
)
app.add_middleware(
    CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"]
)

API_PREFIX = "/v1"
for r in (products.router, recalls.router, kb.router, contributions.router,
          recognize.router, ocr.router):
    app.include_router(r, prefix=API_PREFIX)


# RFC 9457 problem+json 으로 에러 형식을 통일한다.
@app.exception_handler(HTTPException)
async def http_exc(_: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"type": "about:blank", "title": _title(exc.status_code), "status": exc.status_code,
                 "detail": exc.detail},
        media_type="application/problem+json",
    )


@app.exception_handler(RequestValidationError)
async def validation_exc(_: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"type": "about:blank", "title": "Unprocessable Entity", "status": 422,
                 "detail": exc.errors()},
        media_type="application/problem+json",
    )


def _title(status: int) -> str:
    return {400: "Bad Request", 404: "Not Found", 422: "Unprocessable Entity",
            501: "Not Implemented"}.get(status, "Error")


@app.get("/healthz", tags=["ops"])
def healthz():
    return {"ok": True, "version": app.version}
