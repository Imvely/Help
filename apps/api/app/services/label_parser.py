"""OCR 텍스트에서 원재료명·원산지·제조국·카페인·알레르기 문구를 1차 추출 (docs/06 §3-1).

LLM(Claude) 구조화는 M2 워커에서 이 결과를 입력으로 받아 보정한다.
"""

from __future__ import annotations

import re

_STOP = r"내용량|보관방법|포장재질|품목보고번호|유통기한|소비기한|영양정보|영양성분|제조원|판매원|고객"
RE_INGREDIENTS = re.compile(
    rf"원\s*재\s*료\s*명\s*[:：]?\s*(.+?)(?=\n\s*(?:{_STOP})|$)", re.S
)
RE_ORIGIN_LINE = re.compile(r"(원료\s*원산지|원산지|제조국)\s*[:：]\s*([^\n]+)")
RE_CAFFEINE = re.compile(r"카페인\s*(?:함량)?\s*[:：]?\s*(\d+(?:\.\d+)?)\s*mg", re.I)
RE_HIGH_CAFFEINE = re.compile(r"고\s*카페인")
RE_ALLERGEN_LINE = re.compile(r"([^\n]*(?:함유|알레르기)[^\n]*)")
RE_MAY_CONTAIN = re.compile(r"([^\n]*(?:같은\s*(?:제조\s*)?시설|혼입)[^\n]*)")
RE_MANUFACTURER = re.compile(r"(제조원|제조업자|제조업체)\s*[:：]\s*([^\n]+)")
RE_BRAND_OWNER = re.compile(r"(책임판매업자|유통전문판매원|판매원|수입원|수입판매원)\s*[:：]\s*([^\n]+)")


def parse_label_text(text: str) -> dict:
    text = text.replace("\r", "")
    out: dict = {
        "ingredients_raw": None,
        "origin_lines": [],
        "manufacturing_country": None,
        "manufacturer": None,
        "brand_owner": None,
        "caffeine_mg": None,
        "high_caffeine": bool(RE_HIGH_CAFFEINE.search(text)),
        "allergen_statement": None,
        "may_contain_statement": None,
    }
    if m := RE_INGREDIENTS.search(text):
        out["ingredients_raw"] = re.sub(r"\s*\n\s*", " ", m.group(1)).strip()
    for m in RE_ORIGIN_LINE.finditer(text):
        label, value = m.group(1), m.group(2).strip()
        out["origin_lines"].append({"label": label, "value": value})
        if label == "제조국":
            out["manufacturing_country"] = value
    if m := RE_CAFFEINE.search(text):
        out["caffeine_mg"] = float(m.group(1))
    if m := RE_MANUFACTURER.search(text):
        out["manufacturer"] = m.group(2).strip()
    if m := RE_BRAND_OWNER.search(text):
        out["brand_owner"] = m.group(2).strip()
    if m := RE_MAY_CONTAIN.search(text):
        out["may_contain_statement"] = m.group(1).strip()
    if m := RE_ALLERGEN_LINE.search(text):
        line = m.group(1).strip()
        if line != out["may_contain_statement"]:
            out["allergen_statement"] = line
    return out
