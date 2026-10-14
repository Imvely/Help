"""식약처 식품안전나라 OpenAPI 클라이언트 (docs/01 §2-1).

URL: {base}/{key}/{service}/json/{start}/{end}[/{필드=값}]
제한: 1회 1,000건, 시간당 100회(증분 미사용 시) → 페이지 사이에 쉬어 가며(sleep) 전체 덤프.
응답 형식: {"C002": {"total_count": "123", "row": [...], "RESULT": {"CODE": "INFO-000", ...}}}
"""

from __future__ import annotations

import logging
import time
from collections.abc import Iterator

import httpx

log = logging.getLogger(__name__)

PAGE_SIZE = 1000
OK_CODES = {"INFO-000"}
EMPTY_CODES = {"INFO-200"}  # 해당하는 데이터가 없습니다


class MfdsClient:
    def __init__(self, api_key: str, base_url: str, *, sleep_sec: float = 36.0,
                 client: httpx.Client | None = None) -> None:
        # 시간당 100회 → 36초 간격이면 제한에 걸리지 않는다.
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.sleep_sec = sleep_sec
        self.client = client or httpx.Client(timeout=60)

    def url(self, service: str, start: int, end: int, filters: dict[str, str] | None = None) -> str:
        u = f"{self.base_url}/{self.api_key}/{service}/json/{start}/{end}"
        if filters:
            u += "/" + "/".join(f"{k}={v}" for k, v in filters.items())
        return u

    def fetch_page(self, service: str, start: int, end: int,
                   filters: dict[str, str] | None = None) -> tuple[list[dict], int]:
        """(rows, total_count). 재시도 3회(지수 백오프)."""
        last_exc: Exception | None = None
        for attempt in range(3):
            try:
                r = self.client.get(self.url(service, start, end, filters))
                r.raise_for_status()
                body = r.json().get(service, {})
                code = (body.get("RESULT") or {}).get("CODE", "")
                if code in EMPTY_CODES:
                    return [], 0
                if code and code not in OK_CODES:
                    raise RuntimeError(f"MFDS {service} {code}: {body.get('RESULT')}")
                return body.get("row", []), int(body.get("total_count", 0))
            except (httpx.HTTPError, ValueError, RuntimeError) as e:  # noqa: PERF203
                last_exc = e
                wait = 2**attempt
                log.warning("mfds fetch failed (%s), retry in %ss", e, wait)
                time.sleep(wait)
        raise RuntimeError(f"MFDS fetch failed after retries: {last_exc}")

    def iter_all(self, service: str, filters: dict[str, str] | None = None,
                 start: int = 1, max_rows: int | None = None) -> Iterator[dict]:
        """전체 덤프 제너레이터. start 로 중단 지점부터 재개 가능."""
        fetched = 0
        while True:
            end = start + PAGE_SIZE - 1
            rows, total = self.fetch_page(service, start, end, filters)
            if not rows:
                return
            for row in rows:
                yield row
                fetched += 1
                if max_rows and fetched >= max_rows:
                    return
            log.info("%s %d-%d / %d", service, start, end, total)
            if end >= total:
                return
            start = end + 1
            time.sleep(self.sleep_sec)
