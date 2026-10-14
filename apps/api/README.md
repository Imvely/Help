# 어디산 API (FastAPI)

제품 원산지·성분·회수 정보를 돌려주는 서버입니다. **개인화 판정은 하지 않습니다** — 성분 목록과 등급만 내려주고, 기기(`packages/domain`)가 사용자의 건강 프로필과 교차합니다. 그래서 서버는 사용자의 알레르기를 몰라도 됩니다.

## 빠른 시작 (SQLite, 외부 의존 없음)

```bash
cd apps/api
uv venv .venv && uv pip install -p .venv/bin/python -e ".[dev]"
.venv/bin/alembic upgrade head          # 스키마 생성 (data/eodisan.db)
.venv/bin/python -m app.kb.loader       # 성분·알레르겐 지식 베이스 적재
.venv/bin/uvicorn app.main:app --reload # http://localhost:8000/docs
.venv/bin/python -m pytest -q           # 테스트
```

## 전체 스택 (Postgres + pgvector + Redis + MinIO)

```bash
cp apps/api/.env.example apps/api/.env   # 식약처 인증키 입력
docker compose up -d                      # 레포 루트에서
```

## 식약처 데이터 넣기

```bash
export EODISAN_MFDS_API_KEY=발급받은키
python -m app.pipeline.mfds_sync dump C002 --max-rows 5000   # 품목제조보고(원재료) 일부
python -m app.pipeline.mfds_sync dump C005                   # 바코드 연계(2018년 이전)
python -m app.pipeline.mfds_sync dump I0490                  # 회수·판매중지
python -m app.pipeline.mfds_sync normalize                    # raw → products
python -m app.pipeline.mfds_sync recalls                      # raw → recalls
```

API 호출 제한(시간당 100회, 1회 1,000건) 때문에 전체 덤프는 며칠이 걸릴 수 있습니다. 중단되면 `--start N` 으로 이어서 받습니다.

## 구조

```
app/
  main.py            FastAPI 앱, problem+json 에러 형식
  config.py          환경변수 설정 (EODISAN_ 접두사)
  db/models.py       테이블 정의 (docs/04)
  db/types.py        Postgres=halfvec/JSONB, SQLite=JSON 자동 전환
  schemas.py         응답 스키마 (docs/06 §2)
  routers/           products, recalls, kb, contributions, recognize, ocr
  services/          원재료 파서, 알레르겐 매칭, 원산지 문구, 카페인, 응답 조립, 라벨 파서
  kb/seed/*.yaml     성분 등급·알레르겐 시드 (등급 변경은 PR + 출처 필수)
  kb/loader.py       시드 적재(멱등)
  pipeline/          식약처 OpenAPI 클라이언트·동기화·정규화
  ml/                ONNX 임베딩, 벡터 검색(pgvector / 브루트포스 폴백)
alembic/             마이그레이션
tests/               pytest (SQLite 인메모리, 외부 의존 없음)
```

## 앱용 타입 생성

```bash
curl http://localhost:8000/openapi.json > openapi.json
npx openapi-typescript openapi.json -o ../mobile/src/data/openapi.d.ts
```
