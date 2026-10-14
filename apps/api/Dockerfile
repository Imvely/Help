# 어디산 API 이미지. 멀티스테이지: 빌더에서 의존성 설치 → 런타임은 가볍게.
FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install --no-cache-dir uv
COPY pyproject.toml ./
COPY app ./app
RUN uv pip install --system --no-cache .

FROM python:3.12-slim
WORKDIR /app
RUN useradd -m api
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
RUN mkdir -p /app/data/uploads && chown -R api:api /app/data
USER api
EXPOSE 8000
HEALTHCHECK --interval=30s CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/healthz')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
