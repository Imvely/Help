import { describe, expect, it } from 'vitest';
import { caffeineLimitMg, caffeineWarning } from '../caffeine.js';
import { createProfile } from '../types.js';

const drink = (caffeine_mg: number | null, extra: Record<string, unknown> = {}) => ({
  nutrition: { caffeine_mg, ...extra },
});

describe('caffeineLimitMg — docs/05 §5 공식', () => {
  it('성인 기본 400', () => {
    expect(caffeineLimitMg(createProfile())).toBe(400);
  });
  it('임신 300', () => {
    expect(caffeineLimitMg(createProfile({ pregnant: true }))).toBe(300);
  });
  it('어린이 20kg → 2.5 × 20 = 50', () => {
    expect(caffeineLimitMg(createProfile({ childAgeYears: 8, weightKg: 20 }))).toBe(50);
  });
  it('어린이지만 체중을 모르면 기본 한도 유지', () => {
    expect(caffeineLimitMg(createProfile({ childAgeYears: 8 }))).toBe(400);
  });
  it('19세 이상은 체중이 있어도 성인 한도', () => {
    expect(caffeineLimitMg(createProfile({ childAgeYears: 19, weightKg: 60 }))).toBe(400);
  });
  it('민감 → 절반 (성인 200, 임신 150, 어린이 25)', () => {
    expect(caffeineLimitMg(createProfile({ caffeineSensitivity: 'sensitive' }))).toBe(200);
    expect(caffeineLimitMg(createProfile({ caffeineSensitivity: 'sensitive', pregnant: true }))).toBe(150);
    expect(caffeineLimitMg(createProfile({ caffeineSensitivity: 'sensitive', childAgeYears: 8, weightKg: 20 }))).toBe(25);
  });
  it('피함 → 0', () => {
    expect(caffeineLimitMg(createProfile({ caffeineSensitivity: 'avoid' }))).toBe(0);
    expect(caffeineLimitMg(createProfile({ caffeineSensitivity: 'avoid', pregnant: true }))).toBe(0);
  });
});

describe('caffeineWarning — 임계값', () => {
  it('카페인 정보 없음/0 → 경고 없음', () => {
    expect(caffeineWarning(drink(null), createProfile())).toBeNull();
    expect(caffeineWarning(drink(0), createProfile({ caffeineSensitivity: 'avoid' }))).toBeNull();
  });
  it('한도의 50% 이하이고 누적도 한도 이내 → 경고 없음 (성인 94mg)', () => {
    expect(caffeineWarning(drink(94), createProfile())).toBeNull();
    expect(caffeineWarning(drink(200), createProfile())).toBeNull(); // 정확히 50%는 경고 없음
  });
  it('제품 하나가 한도의 50% 초과 → single_serving warning (성인 201mg)', () => {
    const w = caffeineWarning(drink(201), createProfile());
    expect(w?.reason).toBe('single_serving');
    expect(w?.severity).toBe('warning');
    expect(w?.message).toContain('400mg');
  });
  it('임신: 160mg 은 300의 50% 초과 → 경고', () => {
    const w = caffeineWarning(drink(160), createProfile({ pregnant: true }));
    expect(w?.reason).toBe('single_serving');
    expect(w?.limitMg).toBe(300);
  });
  it('오늘 누적 + 제품 > 한도 → daily_total warning', () => {
    const w = caffeineWarning(drink(94), createProfile(), 320);
    expect(w?.reason).toBe('daily_total');
    expect(w?.projectedTotalMg).toBe(414);
    expect(w?.message).toContain('오늘 누적 320mg');
    expect(w?.message).toContain('넘습니다');
  });
  it('피함 설정 + 카페인 있음 → avoid warning', () => {
    const w = caffeineWarning(drink(15), createProfile({ caffeineSensitivity: 'avoid' }));
    expect(w?.reason).toBe('avoid');
    expect(w?.message).toContain('피하도록');
  });
  it('추정값이면 메시지에 (추정) 표기', () => {
    const w = caffeineWarning(drink(250, { caffeine_estimated: true }), createProfile());
    expect(w?.estimated).toBe(true);
    expect(w?.message).toContain('(추정)');
  });
});
