import { describe, expect, it } from 'vitest';
import {
  ALLERGEN_LABELS_KO,
  KR_MANDATORY_ALLERGENS,
  allergenLabel,
  allergenParent,
  findAllergenMatches,
  isKrMandatoryAllergen,
  matchesAllergen,
} from '../allergens.js';

describe('matchesAllergen — 계층 매칭', () => {
  it('같은 코드는 매치', () => {
    expect(matchesAllergen('egg', 'egg')).toBe(true);
  });
  it('상위 프로필 코드는 모든 하위 제품 코드에 매치 (shellfish → shrimp)', () => {
    expect(matchesAllergen('shellfish', 'shellfish.crustacean.shrimp')).toBe(true);
    expect(matchesAllergen('shellfish.crustacean', 'shellfish.crustacean.crab')).toBe(true);
    expect(matchesAllergen('mollusc.bivalve', 'mollusc.bivalve.oyster')).toBe(true);
  });
  it('형제 코드는 매치하지 않음 (walnut ≠ pine_nut)', () => {
    expect(matchesAllergen('tree_nut.walnut', 'tree_nut.pine_nut')).toBe(false);
  });
  it('하위 프로필 코드는 상위 제품 코드에 매치하지 않음', () => {
    expect(matchesAllergen('tree_nut.walnut', 'tree_nut')).toBe(false);
  });
  it('접두사만 같은 코드는 매치하지 않음 (egg vs eggplant)', () => {
    expect(matchesAllergen('egg', 'eggplant')).toBe(false);
  });
  it('공백·대소문자를 정규화', () => {
    expect(matchesAllergen(' Shellfish ', 'shellfish.crustacean.shrimp')).toBe(true);
  });
  it('빈 문자열은 매치하지 않음', () => {
    expect(matchesAllergen('', 'egg')).toBe(false);
  });
});

describe('KR_MANDATORY_ALLERGENS', () => {
  it('한국 의무표시 19항목', () => {
    expect(KR_MANDATORY_ALLERGENS).toHaveLength(19);
    expect(new Set(KR_MANDATORY_ALLERGENS).size).toBe(19);
  });
  it('19항목 모두 한글 라벨이 있음', () => {
    for (const code of KR_MANDATORY_ALLERGENS) {
      expect(ALLERGEN_LABELS_KO[code], code).toBeTruthy();
    }
    expect(ALLERGEN_LABELS_KO['shellfish.crustacean.shrimp']).toBe('새우');
    expect(ALLERGEN_LABELS_KO['mollusc.bivalve']).toBe('조개류');
    expect(ALLERGEN_LABELS_KO['tree_nut.pine_nut']).toBe('잣');
  });
  it('isKrMandatoryAllergen: 굴은 조개류의 하위라서 의무표시', () => {
    expect(isKrMandatoryAllergen('mollusc.bivalve.oyster')).toBe(true);
    expect(isKrMandatoryAllergen('sesame')).toBe(false); // EU/US 추가 항목
  });
});

describe('allergenLabel / allergenParent / findAllergenMatches', () => {
  it('라벨이 없으면 상위 라벨로 폴백, 그것도 없으면 코드 그대로', () => {
    expect(allergenLabel('mollusc.bivalve.clam')).toBe('조개류');
    expect(allergenLabel('unknown_code')).toBe('unknown_code');
  });
  it('allergenParent', () => {
    expect(allergenParent('shellfish.crustacean.shrimp')).toBe('shellfish.crustacean');
    expect(allergenParent('egg')).toBeNull();
  });
  it('findAllergenMatches: 가장 구체적인 프로필 코드 하나만 남김', () => {
    const m = findAllergenMatches(['shellfish', 'shellfish.crustacean.shrimp'], ['shellfish.crustacean.shrimp', 'soy']);
    expect(m).toEqual([{ profileCode: 'shellfish.crustacean.shrimp', productCode: 'shellfish.crustacean.shrimp' }]);
  });
});
