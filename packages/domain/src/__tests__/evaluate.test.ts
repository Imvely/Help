import { describe, expect, it } from 'vitest';
import { evaluateProduct, gradeSummary } from '../evaluate.js';
import { createProfile } from '../types.js';
import type { Ingredient } from '../types.js';
import { makeProduct } from './fixtures.js';

const kinds = (r: ReturnType<typeof evaluateProduct>) => r.warnings.map((w) => w.kind);

describe('evaluateProduct — 순서와 알레르기', () => {
  it('회수가 있으면 항상 첫 번째 danger', () => {
    const p = makeProduct({ recall: { reason: '세균수 기준 초과', grade: '2등급', issued_at: '2026-10-01' } });
    const r = evaluateProduct(p, createProfile({ allergens: ['shellfish'] }));
    expect(r.warnings[0]?.kind).toBe('recall');
    expect(r.warnings[0]?.severity).toBe('danger');
    expect(r.warnings[0]?.message).toContain('회수·판매중지');
    expect(r.warnings[1]?.kind).toBe('allergen_contains');
    expect(r.highest).toBe('danger');
  });
  it('알레르기 포함 → danger, 상위 코드(갑각류) 선택 시 새우에 매치', () => {
    const r = evaluateProduct(makeProduct(), createProfile({ allergens: ['shellfish.crustacean'] }));
    const w = r.warnings.find((x) => x.kind === 'allergen_contains');
    expect(w?.severity).toBe('danger');
    expect(w?.message).toContain('새우 포함');
    expect(w?.message).toContain('갑각류');
    expect(w?.allergen).toBe('shellfish.crustacean.shrimp');
  });
  it('혼입 가능: 심한 알레르기면 warning, 아니면 info', () => {
    const mild = evaluateProduct(makeProduct(), createProfile({ allergens: ['wheat'] }));
    expect(mild.warnings.find((x) => x.kind === 'allergen_may_contain')?.severity).toBe('info');
    const severe = evaluateProduct(makeProduct(), createProfile({ allergens: ['wheat'], severeAllergy: true }));
    expect(severe.warnings.find((x) => x.kind === 'allergen_may_contain')?.severity).toBe('warning');
    expect(severe.warnings[0]?.message).toContain('밀 혼입 가능');
  });
  it('관련 없는 알레르기는 경고 없음', () => {
    const r = evaluateProduct(makeProduct(), createProfile({ allergens: ['peanut', 'tree_nut.walnut'] }));
    expect(kinds(r)).not.toContain('allergen_contains');
    expect(kinds(r)).not.toContain('allergen_may_contain');
  });
  it('빈 프로필 + 평범한 제품 → 경고 없음', () => {
    const r = evaluateProduct(makeProduct(), createProfile());
    expect(r.warnings).toEqual([]);
    expect(r.highest).toBeNull();
    expect(r.counts).toEqual({ danger: 0, warning: 0, info: 0 });
  });
  it('심각도 순 정렬: danger → warning → info', () => {
    const p = makeProduct(
      { nutrition: { sodium_mg: 700, sugar_g: 12, caffeine_mg: null } },
      [{ name: '아스파탐', function: '감미료', grade: 2 }],
    );
    const r = evaluateProduct(p, createProfile({ allergens: ['soy'], diabetes: true, hypertension: true }));
    const sev = r.warnings.map((w) => w.severity);
    expect(sev).toEqual([...sev].sort((a, b) => ({ danger: 0, warning: 1, info: 2 })[a] - ({ danger: 0, warning: 1, info: 2 })[b]));
    expect(sev[0]).toBe('danger');
    expect(sev[sev.length - 1]).toBe('info');
  });
});

describe('카페인·임신', () => {
  const energy = (mg: number) => makeProduct({ nutrition: { caffeine_mg: mg, high_caffeine: true } });
  it('오늘 누적을 ctx 로 받아 한도 초과 경고', () => {
    const r = evaluateProduct(energy(100), createProfile(), { todayCaffeineMg: 350 });
    expect(kinds(r)).toContain('caffeine');
    expect(r.warnings[0]?.severity).toBe('warning');
  });
  it('한도 내 고카페인 제품은 info 로만 안내', () => {
    const r = evaluateProduct(energy(100), createProfile());
    expect(kinds(r)).toEqual(['caffeine_high']);
    expect(r.warnings[0]?.severity).toBe('info');
  });
  it('임신: 300mg 한도 안내 info + 160mg 은 경고', () => {
    const r = evaluateProduct(energy(160), createProfile({ pregnant: true }));
    expect(kinds(r)).toContain('caffeine');
    const note = r.warnings.find((w) => w.kind === 'pregnancy_caffeine_limit');
    expect(note?.severity).toBe('info');
    expect(note?.message).toContain('300mg');
  });
  it('임신: 식품의 주정 → info', () => {
    const p = makeProduct({}, [{ name: '주정', function: null, grade: 0 }]);
    const w = evaluateProduct(p, createProfile({ pregnant: true })).warnings.find((x) => x.kind === 'pregnancy_alcohol');
    expect(w?.severity).toBe('info');
    expect(w?.ingredients).toEqual(['주정']);
  });
  it('임신: 화장품의 레티놀·살리실산 → warning, "전문가 권고" 라벨', () => {
    const p = makeProduct(
      { product: { id: 'c1', name: '세럼', category: 'cosmetic' } },
      [{ name: '레티놀', grade: null }, { name: '살리실산', grade: null }, { name: '정제수', grade: 0 }],
    );
    const w = evaluateProduct(p, createProfile({ pregnant: true })).warnings.find((x) => x.kind === 'pregnancy_cosmetic');
    expect(w?.severity).toBe('warning');
    expect(w?.message).toContain('전문가 권고');
    expect(w?.ingredients).toEqual(['레티놀', '살리실산']);
  });
  it('임신 아님 → 임신 규칙 미적용', () => {
    const p = makeProduct({ product: { id: 'c1', name: '세럼', category: 'cosmetic' } }, [{ name: '레티놀', grade: null }]);
    expect(kinds(evaluateProduct(p, createProfile()))).not.toContain('pregnancy_cosmetic');
  });
});

describe('당뇨·고혈압·신장·비건·어린이·등급', () => {
  it('당뇨: 당류 10g 이상 warning, 9.9g 은 없음', () => {
    const hi = evaluateProduct(makeProduct({ nutrition: { sugar_g: 10 } }), createProfile({ diabetes: true }));
    expect(kinds(hi)).toContain('diabetes_sugar');
    const lo = evaluateProduct(makeProduct({ nutrition: { sugar_g: 9.9 } }), createProfile({ diabetes: true }));
    expect(kinds(lo)).not.toContain('diabetes_sugar');
  });
  it('당뇨: 감미료 목록 info', () => {
    const p = makeProduct({}, [
      { name: '수크랄로스', function: '감미료', grade: 0 },
      { name: '아세설팜칼륨', function: '합성감미료', grade: 0 },
      { name: '소르빈산칼륨', function: '보존료', grade: 0 },
    ]);
    const w = evaluateProduct(p, createProfile({ diabetes: true })).warnings.find((x) => x.kind === 'diabetes_sweetener');
    expect(w?.severity).toBe('info');
    expect(w?.ingredients).toEqual(['수크랄로스', '아세설팜칼륨']);
  });
  it('고혈압: 600mg 이상 warning(30%), 400~599 info, 399 없음', () => {
    const prof = createProfile({ hypertension: true });
    const w600 = evaluateProduct(makeProduct({ nutrition: { sodium_mg: 600 } }), prof).warnings[0];
    expect(w600?.kind).toBe('hypertension_sodium');
    expect(w600?.severity).toBe('warning');
    expect(w600?.message).toContain('30%');
    const w400 = evaluateProduct(makeProduct({ nutrition: { sodium_mg: 400 } }), prof).warnings[0];
    expect(w400?.severity).toBe('info');
    expect(kinds(evaluateProduct(makeProduct({ nutrition: { sodium_mg: 399 } }), prof))).toEqual([]);
  });
  it('고혈압 프로필이 없으면 나트륨 경고 없음', () => {
    expect(kinds(evaluateProduct(makeProduct({ nutrition: { sodium_mg: 900 } }), createProfile()))).toEqual([]);
  });
  it('신장: 인산염 첨가물 warning + 라벨 한계 note', () => {
    const p = makeProduct({}, [{ name: '제이인산칼슘', function: '산도조절제', grade: 1, applies_to_groups: ['kidney'] }]);
    const w = evaluateProduct(p, createProfile({ kidney: true })).warnings.find((x) => x.kind === 'kidney_phosphate');
    expect(w?.severity).toBe('warning');
    expect(w?.note).toContain('인(P) 함량');
  });
  it('비건: 동물성 원재료 warning', () => {
    const p = makeProduct({}, [
      { name: '돼지고기', grade: null },
      { name: '젤라틴', grade: 0 },
      { name: '설탕', grade: 0 },
    ]);
    const w = evaluateProduct(p, createProfile({ vegan: true })).warnings.find((x) => x.kind === 'vegan');
    expect(w?.ingredients).toEqual(['돼지고기', '젤라틴']);
    expect(kinds(evaluateProduct(p, createProfile()))).not.toContain('vegan');
  });
  it('어린이: 타르색소명 패턴 + child 그룹 등급1 탐지', () => {
    const p = makeProduct({}, [
      { name: '황색제4호', grade: null },
      { name: '적색 40호', grade: 1 },
      { name: '카페인', grade: 1, applies_to_groups: ['child'] },
      { name: '설탕', grade: 0 },
    ]);
    const child = evaluateProduct(p, createProfile({ childAgeYears: 7 }));
    const w = child.warnings.find((x) => x.kind === 'child_dye');
    expect(w?.severity).toBe('warning');
    expect(w?.ingredients).toEqual(['황색제4호', '적색 40호', '카페인']);
    // 성인 프로필에는 어린이 경고 없음
    expect(kinds(evaluateProduct(p, createProfile()))).not.toContain('child_dye');
  });
  it('등급 3 → 모두에게 warning, 등급 2 → info', () => {
    const p = makeProduct({}, [
      { name: '부분경화유', grade: 3 },
      { name: '에리스리톨', grade: 2 },
      { name: '구연산', grade: 0 },
    ]);
    const r = evaluateProduct(p, createProfile());
    expect(kinds(r)).toEqual(['grade_3', 'grade_2']);
    expect(r.warnings[0]?.severity).toBe('warning');
    expect(r.warnings[1]?.severity).toBe('info');
    expect(r.counts).toEqual({ danger: 0, warning: 1, info: 1 });
  });
});

describe('gradeSummary', () => {
  it('등급별 개수 + unknown', () => {
    const ings: Ingredient[] = [
      { name: 'a', grade: 0 }, { name: 'b', grade: 0 }, { name: 'c', grade: 1 },
      { name: 'd', grade: 2 }, { name: 'e', grade: 3 }, { name: 'f', grade: null }, { name: 'g', grade: null },
    ];
    expect(gradeSummary(ings)).toEqual({ '0': 2, '1': 1, '2': 1, '3': 1, unknown: 2 });
    expect(gradeSummary([])).toEqual({ '0': 0, '1': 0, '2': 0, '3': 0, unknown: 0 });
  });
});
