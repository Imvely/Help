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

## 샘플 데이터로 바로 보기 (식약처 키 없이)

```bash
.venv/bin/python -m app.kb.sample_loader     # 데모 제품 8종 (바코드 8800000009001~9008)
curl -s localhost:8000/v1/products/by-barcode/8800000009003 | python -m json.tool
```

## 라벨 OCR·제보 (M2)

```
POST /v1/ocr/label        multipart image(+ean13, product_id)  → 202 {job_id}
GET  /v1/ocr/jobs/{id}    → {status, result: LabelExtraction}
POST /v1/contributions/label   앱이 확인·수정한 결과 → 제품 저장(source=ocr_user), n명 일치 시 ocr_verified
```
처리 순서: 이미지 → (선택) PaddleOCR → 정규식 → **Claude 비전 구조화 추출**(`ANTHROPIC_API_KEY` 있을 때) → 알레르겐 코드 매핑.
키가 없으면 정규식만으로 동작한다(테스트는 이 경로). 운영에서는 `EODISAN_OCR_INLINE=0` 으로 두고 워커를 돌린다:
`python -m app.pipeline.ocr_worker`.

## 로그인·프로필·푸시 (M3)

- 인증: Supabase JWT(HS256)를 `Authorization: Bearer` 로. `/me/*` 는 회원 전용, 나머지는 비회원 허용.
- 비회원 식별: 앱이 `X-Anonymous-Id`(기기 UUID) 헤더를 보내면 `/scans`, `/devices` 가 그 ID 로 기록 → 회수 푸시 매칭.
- 프로필: `PUT /me/profiles` 는 `sync_consent=true` 일 때만 **Fernet 암호화**해 저장. 서버는 내용을 해석하지 않는다.
- 회수 푸시: `python -m app.pipeline.push` (스캔한 사용자·기기에 Expo Push 발송, 중복 방지).

## 구조

```
app/
  main.py            FastAPI 앱, problem+json 에러 형식
  config.py          환경변수 설정 (EODISAN_ 접두사)
  db/models.py       테이블 정의 (docs/04)
  db/types.py        Postgres=halfvec/JSONB, SQLite=JSON 자동 전환
  schemas.py         응답 스키마 (docs/06 §2)
  auth.py            Supabase JWT 검증 의존성(require_user / optional_user / anonymous_id)
  routers/           products(+alternatives), recalls, kb, contributions(+label), recognize, ocr, me, devices, scans
  services/          원재료 파서, 알레르겐 매칭, 원산지 문구, 카페인, 응답 조립, 라벨 파서, product_writer(공용 upsert),
                     alternatives(대체 제품), storage(업로드), crypto(프로필 암호화)
  kb/seed/*.yaml     성분 등급·알레르겐 시드 (등급 변경은 PR + 출처 필수)
  kb/loader.py       시드 적재(멱등)
  pipeline/          식약처 OpenAPI 클라이언트·동기화·정규화
  ml/                ONNX 임베딩, 벡터 검색(pgvector / 브루트포스 폴백), label_extractor(Claude 구조화), ocr(PaddleOCR)
  pipeline/          mfds_sync(식약처), ocr_worker(OCR 작업), push(회수 알림)
alembic/             마이그레이션
tests/               pytest (SQLite 인메모리, 외부 의존 없음)
```

## 앱용 타입 생성

```bash
curl http://localhost:8000/openapi.json > openapi.json
npx openapi-typescript openapi.json -o ../mobile/src/data/openapi.d.ts
```
