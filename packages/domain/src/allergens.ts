/**
 * 알레르겐 온톨로지 헬퍼 (docs/04-data-model.md §2-3, docs/05-knowledge-base.md §4)
 *
 * 코드는 점(.)으로 계층을 표현합니다. 가장 작은 단위를 코드로 두고
 * 나라별 의무표시 목록은 매핑으로 처리합니다.
 *   shellfish > shellfish.crustacean > shellfish.crustacean.shrimp
 *   tree_nut  > tree_nut.walnut / tree_nut.pine_nut
 *   mollusc   > mollusc.squid(오징어) / mollusc.bivalve(조개류) > mollusc.bivalve.oyster / .abalone / .mussel
 */

import type { AllergenCode } from './types.js';

/**
 * 프로필 코드가 제품 코드와 일치하는지.
 * 프로필 코드는 자기 자신과 모든 하위 코드에 매치됩니다.
 *   matchesAllergen('shellfish', 'shellfish.crustacean.shrimp') → true
 *   matchesAllergen('tree_nut.walnut', 'tree_nut.pine_nut')     → false
 *   matchesAllergen('tree_nut.walnut', 'tree_nut')              → false (상위는 매치 안 함)
 */
export function matchesAllergen(profileCode: AllergenCode, productCode: AllergenCode): boolean {
  const p = normalizeAllergenCode(profileCode);
  const q = normalizeAllergenCode(productCode);
  if (!p || !q) return false;
  return q === p || q.startsWith(p + '.');
}

/** 공백 제거·소문자화. 빈 문자열은 그대로 돌려줍니다. */
export function normalizeAllergenCode(code: string): AllergenCode {
  return (code ?? '').trim().toLowerCase();
}

/** 상위 코드. 최상위면 null. (`shellfish.crustacean.shrimp` → `shellfish.crustacean`) */
export function allergenParent(code: AllergenCode): AllergenCode | null {
  const idx = code.lastIndexOf('.');
  return idx === -1 ? null : code.slice(0, idx);
}

/** 매치된 (프로필 코드, 제품 코드) 쌍 */
export interface AllergenMatch {
  profileCode: AllergenCode;
  productCode: AllergenCode;
}

/**
 * 프로필 코드 목록 × 제품 코드 목록의 매치 쌍을 돌려줍니다.
 * 제품 코드 하나에 프로필 코드가 여러 개 매치되면 가장 구체적인(긴) 프로필 코드 하나만 남깁니다.
 * 결과 순서는 제품 코드 순서를 따릅니다.
 */
export function findAllergenMatches(
  profileCodes: readonly AllergenCode[],
  productCodes: readonly AllergenCode[],
): AllergenMatch[] {
  const out: AllergenMatch[] = [];
  for (const productCode of productCodes) {
    let best: AllergenCode | null = null;
    for (const profileCode of profileCodes) {
      if (!matchesAllergen(profileCode, productCode)) continue;
      if (best === null || profileCode.length > best.length) best = profileCode;
    }
    if (best !== null) out.push({ profileCode: best, productCode });
  }
  return out;
}

/**
 * 코드 → 한글 이름.
 * 한국 의무표시 19항목 + 세부 항목(굴·전복·홍합) + 상위 그룹 + 수입품 매핑용 추가 항목.
 */
export const ALLERGEN_LABELS_KO: Readonly<Record<AllergenCode, string>> = Object.freeze({
  // --- 한국 의무표시 19항목 (식품표시광고법 시행규칙 별표2) ---
  egg: '알류',
  milk: '우유',
  buckwheat: '메밀',
  peanut: '땅콩',
  soy: '대두',
  wheat: '밀',
  mackerel: '고등어',
  'shellfish.crustacean.crab': '게',
  'shellfish.crustacean.shrimp': '새우',
  pork: '돼지고기',
  peach: '복숭아',
  tomato: '토마토',
  sulfite: '아황산류',
  'tree_nut.walnut': '호두',
  chicken: '닭고기',
  beef: '쇠고기',
  'mollusc.squid': '오징어',
  mollusc: '연체류',
  'mollusc.bivalve': '조개류',
  'tree_nut.pine_nut': '잣',
  // --- 조개류 세부(한국 "22종" 계산 시 따로 세는 항목) ---
  'mollusc.bivalve.oyster': '굴',
  'mollusc.bivalve.abalone': '전복',
  'mollusc.bivalve.mussel': '홍합',
  // --- 상위 그룹 ---
  shellfish: '갑각류·조개류',
  'shellfish.crustacean': '갑각류',
  tree_nut: '견과류',
  // --- EU/US/JP 추가 항목 ---
  sesame: '참깨',
  celery: '셀러리',
  mustard: '겨자',
  lupin: '루핀',
  fish: '생선',
  'tree_nut.cashew': '캐슈넛',
  'tree_nut.almond': '아몬드',
  'tree_nut.hazelnut': '헤이즐넛',
  'tree_nut.pecan': '피칸',
  'tree_nut.pistachio': '피스타치오',
  'tree_nut.macadamia': '마카다미아',
  'tree_nut.brazil_nut': '브라질너트',
  gluten: '글루텐 함유 곡류',
});

/**
 * 한국 의무표시 19항목 코드 (docs/05 §4).
 * `mollusc.bivalve`(조개류)는 굴·전복·홍합을 포함하는 상위 코드입니다. 오징어(mollusc.squid)는 별개 항목.
 */
export const KR_MANDATORY_ALLERGENS: readonly AllergenCode[] = Object.freeze([
  'egg',
  'milk',
  'buckwheat',
  'peanut',
  'soy',
  'wheat',
  'mackerel',
  'shellfish.crustacean.crab',
  'shellfish.crustacean.shrimp',
  'pork',
  'peach',
  'tomato',
  'sulfite',
  'tree_nut.walnut',
  'chicken',
  'beef',
  'mollusc.squid',
  'mollusc.bivalve',
  'tree_nut.pine_nut',
]);

/**
 * 코드의 한글 이름. 직접 라벨이 없으면 상위 코드 라벨로 올라가며 찾고,
 * 그래도 없으면 코드 문자열 그대로 돌려줍니다(미매핑 수입품 코드 대비).
 */
export function allergenLabel(code: AllergenCode): string {
  let cur: AllergenCode | null = normalizeAllergenCode(code);
  while (cur !== null) {
    const label = ALLERGEN_LABELS_KO[cur];
    if (label) return label;
    cur = allergenParent(cur);
  }
  return code;
}

/** 제품 코드가 한국 의무표시 19항목(또는 그 하위)에 해당하는지 */
export function isKrMandatoryAllergen(productCode: AllergenCode): boolean {
  return KR_MANDATORY_ALLERGENS.some((kr) => matchesAllergen(kr, productCode));
}
