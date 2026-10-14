import { describe, expect, it } from 'vitest';
import {
  COUNTRIES,
  ORIGIN_DISCLAIMER,
  countryLabel,
  ingredientOriginBadge,
  involvementText,
  involvesCountry,
  originBadges,
  originSummaryLine,
} from '../origin.js';
import type { Origin } from '../types.js';
import { kimchiOrigin } from './fixtures.js';

const oemCosmetic: Origin = {
  manufacturing_country: 'CN',
  brand_owner_country: 'KR',
  brand_owner_name: '△△뷰티',
  manufacturer_name: '○○코스메틱',
  manufacturer_country: 'CN',
  oem: true,
  ingredients: [],
  confidence: 'label_read',
};

const texts = (o: Origin | null, category?: 'food' | 'cosmetic') =>
  originBadges(o, { category }).map((b) => b.text);

describe('국가 맵', () => {
  it('요구된 국가 코드를 모두 보유하고 국기+이름을 가짐', () => {
    const required = ['KR','CN','US','JP','VN','TH','DE','FR','IT','AU','NZ','BR','CL','IN','ID','MY','PH','RU','GB','CA','ES','NL','TR','EG','PE','AR','MX','외국산','unknown'] as const;
    for (const c of required) expect(COUNTRIES[c], c).toBeDefined();
    expect(countryLabel('CN')).toBe('🇨🇳 중국');
    expect(countryLabel('KR', false)).toBe('한국');
  });
  it('외국산·unknown 은 국기가 없다(특정 국가 추정 금지)', () => {
    expect(COUNTRIES['외국산'].flag).toBe('');
    expect(COUNTRIES.unknown.flag).toBe('');
    expect(countryLabel('unknown')).toBe('알 수 없음');
  });
  it('미등록 코드도 깨지지 않음', () => {
    expect(countryLabel('ZZ')).toBe('ZZ');
  });
});

describe('originBadges — docs/05 §7 문구 규칙', () => {
  it('OEM: "제조국: 중국 · 브랜드: 한국(OEM 제조국: 중국)"', () => {
    const t = texts(oemCosmetic, 'cosmetic');
    expect(t[0]).toBe('제조국: 🇨🇳 중국(라벨 기준)');
    expect(t[1]).toBe('브랜드: 🇰🇷 한국(OEM 제조국: 🇨🇳 중국)');
    expect(originSummaryLine(oemCosmetic)).toBe('제조국: 🇨🇳 중국(라벨 기준) · 브랜드: 🇰🇷 한국(OEM 제조국: 🇨🇳 중국)');
  });
  it('화장품은 "원료 원산지: 표시 의무 없음"', () => {
    expect(texts(oemCosmetic, 'cosmetic')).toContain('원료 원산지: 표시 의무 없음');
  });
  it('원재료 1개 중국산: "원재료 중 고춧가루: 중국산(라벨 기준)"', () => {
    const t = texts(kimchiOrigin, 'food');
    expect(t).toContain('원재료 중 고춧가루: 중국산(라벨 기준)');
    expect(t).toContain('원재료 중 배추: 국산(라벨 기준)');
    expect(t).toContain('원재료 중 마늘: 국산(라벨 기준·미검증)');
  });
  it('식품은 "4순위 이하 원료: 표시 의무 없음 · 알 수 없음" 안내를 붙임', () => {
    expect(texts(kimchiOrigin, 'food')).toContain('4순위 이하 원료: 표시 의무 없음 · 알 수 없음');
  });
  it('unknown 원료: "표시 의무 없음 · 알 수 없음"', () => {
    const b = ingredientOriginBadge({ name: '향료', rank: 7, country: 'unknown' });
    expect(b.text).toBe('원재료 중 향료: 표시 의무 없음 · 알 수 없음');
    expect(b.flag).toBe('');
  });
  it('외국산: "외국산(국가 변동 원료, 법상 허용 표기)"', () => {
    const b = ingredientOriginBadge({ name: '대두', rank: 2, country: '외국산' });
    expect(b.text).toBe('원재료 중 대두: 외국산(국가 변동 원료, 법상 허용 표기)');
  });
  it('어떤 배지도 제품 전체를 "중국산"이라 부르지 않음 (항상 레벨 접두사)', () => {
    for (const o of [kimchiOrigin, oemCosmetic]) {
      for (const text of texts(o)) {
        if (text.includes('중국')) {
          expect(text.startsWith('제조국:') || text.startsWith('브랜드:') || text.startsWith('원재료 중 ')).toBe(true);
          expect(text).not.toMatch(/^중국산/);
        }
      }
    }
  });
  it('배지는 색상 정보를 갖지 않음 (국가별 색 금지)', () => {
    for (const b of originBadges(kimchiOrigin)) {
      expect(b).not.toHaveProperty('color');
    }
  });
  it('제조국 모름 → "제조국: 알 수 없음", 고정 안내 문구 포함', () => {
    const t = texts({ manufacturing_country: null, brand_owner_country: null, oem: false, ingredients: [] });
    expect(t[0]).toBe('제조국: 알 수 없음');
    expect(t).toContain(ORIGIN_DISCLAIMER);
    expect(texts(null)).toEqual(['제조국: 알 수 없음', ORIGIN_DISCLAIMER]);
  });
  it('원재료 배지는 표시 순위순', () => {
    const shuffled: Origin = { ...kimchiOrigin, ingredients: [...kimchiOrigin.ingredients].reverse() };
    const names = originBadges(shuffled).filter((b) => b.level === 'ingredient').map((b) => b.ingredientName);
    expect(names).toEqual(['배추', '고춧가루', '마늘']);
  });
});

describe('involvesCountry — 어느 레벨이 관련되는지', () => {
  it('김치: 원재료(고춧가루)만 중국 관련', () => {
    const inv = involvesCountry(kimchiOrigin, 'CN');
    expect(inv.involved).toBe(true);
    expect(inv.levels).toEqual(['ingredient']);
    expect(inv.ingredients).toEqual(['고춧가루']);
    expect(involvementText(inv)).toBe('중국 관련: 원재료(고춧가루)');
  });
  it('OEM 화장품: 제조국만 중국, 브랜드는 한국', () => {
    expect(involvesCountry(oemCosmetic, 'CN').levels).toEqual(['manufacturing']);
    expect(involvesCountry(oemCosmetic, 'KR').levels).toEqual(['brand_owner']);
  });
  it('unknown·외국산 원료는 어떤 국가로도 추정하지 않음', () => {
    const o: Origin = {
      manufacturing_country: 'KR',
      brand_owner_country: 'KR',
      oem: false,
      ingredients: [
        { name: '대두', rank: 1, country: '외국산' },
        { name: '향료', rank: 5, country: 'unknown' },
      ],
    };
    const inv = involvesCountry(o, 'CN');
    expect(inv.involved).toBe(false);
    expect(inv.levels).toEqual([]);
    expect(inv.undisclosedIngredientCount).toBe(2);
    expect(involvementText(inv)).toBeNull();
    // 'unknown' 자체를 국가로 물어봐도 매치하지 않음
    expect(involvesCountry(o, 'unknown').involved).toBe(false);
  });
  it('origin 이 null 이면 관련 없음', () => {
    expect(involvesCountry(null, 'CN').involved).toBe(false);
  });
});
