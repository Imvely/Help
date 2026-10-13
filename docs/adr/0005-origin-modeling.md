# ADR-0005: 원산지 모델링 — 다층 필드 + unknown 허용 + 출처 귀속 표현

- 상태: 제안
- 날짜: 2026-10-13

## 맥락
"원산지"는 농수산물원산지표시법(원료), 대외무역법(실질적 변형국), 화장품법(제조업자/책임판매업자)에서 다른 뜻. 단일 국가 컬럼은 OEM·원료 수입 사례에서 오답. 특정 국가 부정 표시는 법적·브랜드 리스크.

## 결정
- `product_origin`에 declared_origin / manufacturing_country / manufacturer / brand_owner / oem_flag / confidence / source를 분리.
- 원료 원산지는 `ingredient_origins`에 원료 단위, 값 `unknown`·`외국산` 허용. 표시 의무 없는 원료는 unknown.
- UI 문구는 항상 레벨+출처를 붙임("제조국: 중국(식약처 수입신고 기준)"). 국가별 색상 차등 금지. "원산지 ≠ 안전" 고정 문구.
- 정정 채널 72시간 SLA.

## 결과
- 데이터 입력 복잡도 증가(OCR 파서·제보 UI가 레벨을 구분해야 함).
- 법적 방어력과 사용자 신뢰 향상.
