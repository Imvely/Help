/** 테스트 공용 픽스처 — docs/06 §2 응답 예시(포기김치)를 기반으로 합니다 */
import type { Ingredient, Origin, Product } from '../types.js';

export const kimchiOrigin: Origin = {
  manufacturing_country: 'KR',
  brand_owner_country: 'KR',
  oem: false,
  ingredients: [
    { name: '배추', rank: 1, country: 'KR', source: 'ocr_verified' },
    { name: '고춧가루', rank: 2, country: 'CN', source: 'ocr_verified' },
    { name: '마늘', rank: 3, country: 'KR', source: 'ocr_user' },
  ],
  undisclosed_note: '4순위 이하 원료는 표시 의무 없음',
  confidence: 'ocr',
};

export function makeProduct(overrides: Partial<Product> = {}, ingredients?: Ingredient[]): Product {
  return {
    product: { id: 'p1', name: '포기김치 1kg', brand: '○○', category: 'food', subcategory: '김치류' },
    origin: kimchiOrigin,
    ingredients: ingredients ?? [
      { name: '배추', grade: 0, evidence: 'regulatory' },
      { name: 'L-글루탐산나트륨', function: '향미증진제', grade: 0, evidence: 'regulatory' },
    ],
    allergens: { contains: ['shellfish.crustacean.shrimp', 'soy'], may_contain: ['wheat'] },
    nutrition: { per_serving_g: 100, sodium_mg: 620, sugar_g: 3, caffeine_mg: null },
    recall: null,
    sources: [{ type: 'mfds_c002', date: '2025-03-02' }],
    ...overrides,
  };
}
