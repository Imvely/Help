/**
 * 색상·간격 상수. 등급 색상(docs/02 §4)만 의미를 가지며, 국가별 색상은 존재하지 않습니다.
 */
import type { Grade } from '@/data/types';

export const colors = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  surface: '#F3F4F6',
  primary: '#2563EB',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  info: '#2563EB',
  infoBg: '#DBEAFE',
  overlay: 'rgba(0,0,0,0.45)',
} as const;

/** 0 안전(초록) · 1 주의(노랑) · 2 논쟁(주황) · 3 유해(빨강) · 미확인(회색) */
export const gradeColors: Record<'0' | '1' | '2' | '3' | 'unknown', string> = {
  '0': '#16A34A',
  '1': '#CA8A04',
  '2': '#EA580C',
  '3': '#DC2626',
  unknown: '#9CA3AF',
};

export const gradeLabels: Record<'0' | '1' | '2' | '3' | 'unknown', string> = {
  '0': '안전',
  '1': '주의',
  '2': '논쟁',
  '3': '유해',
  unknown: '미확인',
};

export function gradeKey(grade: Grade | null | undefined): '0' | '1' | '2' | '3' | 'unknown' {
  if (grade === null || grade === undefined) return 'unknown';
  return String(grade) as '0' | '1' | '2' | '3';
}

/** 근거 수준 아이콘 (docs/02 §4): 규제결론 🏛 / 문헌 📚 / 관찰연구 🔬 / 동물·세포 🧪 */
export const evidenceIcons: Record<string, string> = {
  regulatory: '🏛',
  systematic: '📚',
  observational: '🔬',
  animal_cell: '🧪',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 6, md: 10, lg: 16, xl: 20 } as const;
