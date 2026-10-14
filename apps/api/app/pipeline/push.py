"""회수 → 푸시 알림 (docs/03 §6-1). Expo Push API 로 보낸다.

대상: 그 제품을 스캔한 사용자(scans.user_id)·익명 기기(scans.anonymous_id) 의 기기.
중복 발송은 recall_notifications 로 막는다.
"""

from __future__ import annotations

import logging

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import models as m

log = logging.getLogger(__name__)


def targets_for_recall(db: Session, recall: m.Recall) -> list[m.Device]:
    if not recall.product_id:
        return []
    scans = db.execute(select(m.Scan.user_id, m.Scan.anonymous_id)
                       .where(m.Scan.product_id == recall.product_id)).all()
    user_ids = {u for u, _ in scans if u}
    anon_ids = {a for _, a in scans if a}
    if not user_ids and not anon_ids:
        return []
    conds = []
    if user_ids:
        conds.append(m.Device.user_id.in_(user_ids))
    if anon_ids:
        conds.append(m.Device.anonymous_id.in_(anon_ids))
    from sqlalchemy import or_

    devices = db.execute(select(m.Device).where(m.Device.enabled.is_(True), or_(*conds))).scalars().all()
    sent = {n.device_id for n in db.execute(
        select(m.RecallNotification).where(m.RecallNotification.recall_id == recall.id)).scalars()}
    return [d for d in devices if d.id not in sent]


def send_expo(messages: list[dict], client: httpx.Client | None = None) -> list[dict]:
    s = get_settings()
    headers = {"Content-Type": "application/json"}
    if s.expo_access_token:
        headers["Authorization"] = f"Bearer {s.expo_access_token}"
    c = client or httpx.Client(timeout=30)
    out: list[dict] = []
    for i in range(0, len(messages), 100):  # Expo 는 요청당 100개
        r = c.post(s.expo_push_url, json=messages[i:i + 100], headers=headers)
        r.raise_for_status()
        out.extend(r.json().get("data", []))
    return out


def notify_recalls(db: Session, client: httpx.Client | None = None, limit: int = 200) -> int:
    recalls = db.execute(select(m.Recall).where(m.Recall.product_id.is_not(None))
                         .order_by(m.Recall.issued_at.desc()).limit(limit)).scalars().all()
    n = 0
    for r in recalls:
        devices = targets_for_recall(db, r)
        if not devices:
            continue
        msgs = [{
            "to": d.expo_push_token, "sound": "default",
            "title": "⚠ 회수·판매중지 안내",
            "body": f"{r.product_name}: {r.reason or '식약처 회수 조치'}",
            "data": {"type": "recall", "recall_id": r.id, "product_id": r.product_id},
        } for d in devices]
        tickets = send_expo(msgs, client)
        for d, t in zip(devices, tickets, strict=False):
            db.add(m.RecallNotification(recall_id=r.id, device_id=d.id, ticket=t.get("id")))
            if t.get("status") == "error" and "DeviceNotRegistered" in str(t.get("details")):
                d.enabled = False
            n += 1
        db.commit()
    return n


if __name__ == "__main__":
    from app.db.base import SessionLocal

    logging.basicConfig(level=logging.INFO)
    with SessionLocal() as s:
        print("sent", notify_recalls(s))
