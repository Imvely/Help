# ADR-0002: 벡터 저장소 — PostgreSQL + pgvector (HNSW)

- 상태: 제안
- 날짜: 2026-10-13

## 맥락
이미지 임베딩(512-d) 최근접 검색이 필요. 초기 수만~수백만 벡터. 제품 메타데이터와 함께 조회·갱신.

## 선택지
- pgvector 0.8(HNSW, halfvec, iterative scan): 1M×1536d에서 10~20ms@recall 95% 보고. 메타와 같은 트랜잭션.
- Qdrant/Milvus: 1천만+ 벡터, 복잡 필터, 샤딩에 유리. 별도 운영·동기화 부담.
- FAISS 인메모리: 단순하지만 영속성·갱신·다중 인스턴스 처리 직접 구현.

## 결정
pgvector. 수백만 SKU 이하에서 충분하며 운영 단순. `model_version` 필터로 모델 교체 공존. 1천만 벡터 또는 p95 > 50ms가 되면 Qdrant로 이전(ADR 갱신).
