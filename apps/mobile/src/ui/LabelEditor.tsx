/**
 * OCR 결과 확인·수정 폼 (docs/02 M8 4단계).
 *
 * 서버가 읽은 LabelExtraction 을 사용자가 고치는 "제어된 폼" 입니다: 모든 값은 부모(app/ocr.tsx)의 state 에 있고
 * 여기서는 `onChange(next)` 로 새 객체를 돌려줍니다(React 에서는 객체를 제자리에서 바꾸지 않고 복사해 바꿉니다).
 *
 * 원산지 입력은 라벨 표기 그대로의 문자열입니다("국산", "중국산"…). 국가 코드 정규화는 서버가 합니다.
 */
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import type { ExtractedIngredient, LabelExtraction, ProductCategory } from '@/data/types';
import { allergenLabel, KR_MANDATORY_ALLERGENS } from '@/domain';

import { Section } from './Section';
import { colors, radius, spacing } from './theme';

/**
 * 원산지 빠른 선택. 서버 OCR 결과는 ISO 코드("KR","CN"…)/"외국산" 으로 오고 제보도 코드로 보냅니다.
 * '알 수 없음' 은 null 로 저장(추정 금지 원칙). `aliases` 는 사용자가 직접 친 라벨 표기를 같은 칩으로 인식하기 위한 것.
 */
const ORIGIN_PRESETS: { label: string; value: string | null; aliases: string[] }[] = [
  { label: '국산', value: 'KR', aliases: ['국산', '국내산', '한국', '한국산', '대한민국'] },
  { label: '중국산', value: 'CN', aliases: ['중국', '중국산'] },
  { label: '미국산', value: 'US', aliases: ['미국', '미국산'] },
  { label: '외국산', value: '외국산', aliases: ['수입산'] },
  { label: '알 수 없음', value: null, aliases: ['unknown', '알 수 없음'] },
];

function presetMatches(preset: (typeof ORIGIN_PRESETS)[number], origin: string | null): boolean {
  if (origin === null || origin === '') return preset.value === null;
  return preset.value === origin || preset.aliases.includes(origin.trim());
}

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'food', label: '식품' },
  { value: 'cosmetic', label: '화장품' },
];

export interface NewProductFields {
  product_name: string;
  brand: string;
  category: ProductCategory;
}

export interface LabelEditorProps {
  value: LabelExtraction;
  onChange: (next: LabelExtraction) => void;
  /** product_id 가 없을 때(신규 제품) 제품명·브랜드·분류 입력을 보여줍니다 */
  newProduct?: NewProductFields;
  onChangeNewProduct?: (next: NewProductFields) => void;
}

function toggleInList(list: string[], code: string): string[] {
  return list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
}

export function LabelEditor({ value, onChange, newProduct, onChangeNewProduct }: LabelEditorProps) {
  const [showOcrText, setShowOcrText] = useState(false);

  const patch = (p: Partial<LabelExtraction>) => onChange({ ...value, ...p });

  const updateIngredient = (index: number, p: Partial<ExtractedIngredient>) => {
    const ingredients = value.ingredients.map((ing, i) => (i === index ? { ...ing, ...p } : ing));
    patch({ ingredients });
  };
  const removeIngredient = (index: number) => patch({ ingredients: value.ingredients.filter((_, i) => i !== index) });
  const addIngredient = () =>
    patch({ ingredients: [...value.ingredients, { name: '', origin: null, function: null, sub_ingredients: [] }] });

  return (
    <View>
      {newProduct && onChangeNewProduct ? (
        <Section title="새 제품 정보" noDivider>
          <Text style={styles.hint}>아직 등록되지 않은 제품이에요. 앞면에 적힌 제품명과 브랜드를 적어 주세요.</Text>
          <TextInput
            value={newProduct.product_name}
            onChangeText={(t) => onChangeNewProduct({ ...newProduct, product_name: t })}
            placeholder="제품명 (필수)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <TextInput
            value={newProduct.brand}
            onChangeText={(t) => onChangeNewProduct({ ...newProduct, brand: t })}
            placeholder="브랜드"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <View style={styles.segment}>
            {CATEGORIES.map((c) => {
              const on = newProduct.category === c.value;
              return (
                <Pressable
                  key={c.value}
                  onPress={() => onChangeNewProduct({ ...newProduct, category: c.value })}
                  style={[styles.segmentItem, on && styles.segmentItemOn]}
                >
                  <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>
      ) : null}

      <Section title={`원재료 ${value.ingredients.length}개`} noDivider={!newProduct}>
        <Text style={styles.hint}>라벨 순서대로 적혀 있는지, 원산지가 맞는지 확인해 주세요. 모르면 ‘알 수 없음’으로 두세요.</Text>
        {value.ingredients.map((ing, i) => (
          <View key={`ing-${i}`} style={styles.ingCard}>
            <View style={styles.ingHeader}>
              <Text style={styles.ingRank}>{i + 1}.</Text>
              <TextInput
                value={ing.name}
                onChangeText={(t) => updateIngredient(i, { name: t })}
                placeholder="원재료명"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.ingName]}
              />
              <Pressable onPress={() => removeIngredient(i)} hitSlop={8} accessibilityLabel="삭제">
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {ORIGIN_PRESETS.map((o) => {
                const on = presetMatches(o, ing.origin);
                return (
                  <Pressable
                    key={o.label}
                    onPress={() => updateIngredient(i, { origin: o.value })}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={ing.origin ?? ''}
              onChangeText={(t) => updateIngredient(i, { origin: t.trim() ? t : null })}
              placeholder="원산지 직접 입력 (예: 베트남산, VN)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.inputSm]}
            />
            {ing.sub_ingredients.length > 0 ? (
              <Text style={styles.sub}>하위: {ing.sub_ingredients.join(', ')}</Text>
            ) : null}
          </View>
        ))}
        <Pressable onPress={addIngredient} style={styles.addBtn}>
          <Text style={styles.addText}>+ 원재료 추가</Text>
        </Pressable>
      </Section>

      <Section title="제조 정보">
        <Text style={styles.label}>제조국</Text>
        <TextInput
          value={value.manufacturing_country ?? ''}
          onChangeText={(t) => patch({ manufacturing_country: t.trim() ? t : null })}
          placeholder="예: 대한민국, 중국"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Text style={styles.label}>제조원</Text>
        <TextInput
          value={value.manufacturer ?? ''}
          onChangeText={(t) => patch({ manufacturer: t.trim() ? t : null })}
          placeholder="제조원·제조업소"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Text style={styles.label}>판매원 / 수입원</Text>
        <TextInput
          value={value.brand_owner ?? ''}
          onChangeText={(t) => patch({ brand_owner: t.trim() ? t : null })}
          placeholder="책임판매업자·유통전문판매원"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
      </Section>

      <Section title="카페인">
        <View style={styles.row}>
          <TextInput
            value={value.caffeine_mg === null ? '' : String(value.caffeine_mg)}
            onChangeText={(t) => {
              const n = Number(t.replace(/[^\d.]/g, ''));
              patch({ caffeine_mg: t.trim() === '' || Number.isNaN(n) ? null : n });
            }}
            keyboardType="decimal-pad"
            placeholder="mg"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.inputNum]}
          />
          <Text style={styles.unit}>mg (1회 제공량)</Text>
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>고카페인 표시 있음</Text>
          <Switch value={value.high_caffeine} onValueChange={(v) => patch({ high_caffeine: v })} />
        </View>
      </Section>

      <Section title="알레르기 — 포함">
        {value.allergen_statement ? <Text style={styles.quote}>라벨: “{value.allergen_statement}”</Text> : null}
        <View style={styles.chips}>
          {KR_MANDATORY_ALLERGENS.map((code) => {
            const on = value.allergens_detected.includes(code);
            return (
              <Pressable
                key={code}
                onPress={() => patch({ allergens_detected: toggleInList(value.allergens_detected, code) })}
                style={[styles.chip, on && styles.chipDanger]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{allergenLabel(code)}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="알레르기 — 혼입 가능">
        {value.may_contain_statement ? <Text style={styles.quote}>라벨: “{value.may_contain_statement}”</Text> : null}
        <View style={styles.chips}>
          {KR_MANDATORY_ALLERGENS.map((code) => {
            const on = value.may_contain_detected.includes(code);
            return (
              <Pressable
                key={code}
                onPress={() => patch({ may_contain_detected: toggleInList(value.may_contain_detected, code) })}
                style={[styles.chip, on && styles.chipWarn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{allergenLabel(code)}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="OCR 원문">
        <Pressable onPress={() => setShowOcrText((s) => !s)}>
          <Text style={styles.link}>{showOcrText ? '숨기기' : '서버가 읽은 글자 보기'}</Text>
        </Pressable>
        {showOcrText ? <Text style={styles.ocrText}>{value.ocr_text || '(비어 있음)'}</Text> : null}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: spacing.sm },
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: spacing.sm, marginBottom: 4 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputSm: { paddingVertical: 8, fontSize: 13, marginBottom: 0 },
  inputNum: { width: 110, marginBottom: 0, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unit: { fontSize: 13, color: colors.textMuted },
  ingCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  ingHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ingRank: { fontSize: 14, fontWeight: '700', color: colors.textMuted, width: 22 },
  ingName: { flex: 1, marginBottom: 0 },
  remove: { fontSize: 16, color: colors.textMuted, paddingHorizontal: 6 },
  sub: { fontSize: 12, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.xl, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primary },
  chipDanger: { backgroundColor: colors.danger },
  chipWarn: { backgroundColor: colors.warning },
  chipText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  addBtn: { paddingVertical: 10, alignItems: 'center' },
  addText: { color: colors.primary, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  toggleLabel: { fontSize: 15, color: colors.text, fontWeight: '600' },
  quote: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginBottom: spacing.sm },
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  segmentItemOn: { backgroundColor: '#fff', shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  segmentText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  segmentTextOn: { color: colors.text },
  link: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  ocrText: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 17, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});
