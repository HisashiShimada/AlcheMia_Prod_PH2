/// <reference types="jest" />
/**
 * maimlDocumentUtils.ts のユニットテスト
 *
 * テスト対象:
 * - updateDocumentUuid(): <document>/<uuid> を新しい uuidv4() で置換する
 * - normalizeForDiffCheck(): <document>/<uuid> をプレースホルダーに置換する（差分比較用）
 */

// uuid は ESM のため Jest で直接変換できないのでモック化する
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));
import { v4 as uuidv4 } from 'uuid';

import { updateDocumentUuid, normalizeForDiffCheck } from '../../src/utils/maimlDocumentUtils';

// UUID v4 形式の正規表現
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// テスト用の固定 UUID シーケンス
let uuidCounter = 0;
const mockUuids = [
  'aabbccdd-1111-4222-8333-444444444401',
  'aabbccdd-1111-4222-8333-444444444402',
  'aabbccdd-1111-4222-8333-444444444403',
  'aabbccdd-1111-4222-8333-444444444404',
];

beforeEach(() => {
  uuidCounter = 0;
  (uuidv4 as jest.Mock).mockImplementation(() => {
    const uuid = mockUuids[uuidCounter % mockUuids.length];
    uuidCounter++;
    return uuid;
  });
});

// ===== テスト用 MAIML XML =====

/** 正常な MAIML（<document> 直下に <uuid> あり） */
const MAIML_WITH_UUID = `<?xml version="1.0" encoding="UTF-8"?>
<maiml>
  <document id="doc1">
    <uuid>aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee</uuid>
    <name>テストドキュメント</name>
    <description>テスト用</description>
  </document>
  <protocol>
    <method id="method1">
      <uuid>11111111-2222-4333-8444-555555555555</uuid>
      <name>Method 1</name>
    </method>
  </protocol>
</maiml>`;

/** UUID がない MAIML */
const MAIML_WITHOUT_UUID = `<?xml version="1.0" encoding="UTF-8"?>
<maiml>
  <document id="doc1">
    <name>UUID なしドキュメント</name>
  </document>
</maiml>`;

/** 空文字の UUID を持つ MAIML */
const MAIML_WITH_EMPTY_UUID = `<?xml version="1.0" encoding="UTF-8"?>
<maiml>
  <document id="doc1">
    <uuid></uuid>
    <name>空UUID</name>
  </document>
</maiml>`;

/** <document> タグが属性を複数持つ MAIML */
const MAIML_WITH_ATTRS = `<?xml version="1.0" encoding="UTF-8"?>
<maiml>
  <document id="doc1" version="1.0" author="test">
    <uuid>ffffffff-eeee-4ddd-8ccc-bbbbbbbbbbbb</uuid>
    <name>属性多め</name>
  </document>
</maiml>`;

// =====================================================================
// updateDocumentUuid() のテスト
// =====================================================================

describe('updateDocumentUuid()', () => {
  test('【正常】<document>/<uuid> が新しい uuidv4() に置換される', () => {
    const result = updateDocumentUuid(MAIML_WITH_UUID);

    // 変換後の UUID を抽出
    const match = result.match(/<document[^>]*>[\s\S]*?<uuid>([^<]*)<\/uuid>/);
    expect(match).not.toBeNull();

    const newUuid = match![1];

    // 新しい UUID は元の UUID と異なる
    expect(newUuid).not.toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');

    // UUID v4 形式になっている
    expect(UUID_V4_PATTERN.test(newUuid)).toBe(true);
  });

  test('【正常】変換後も XML 構造は維持される（<uuid> タグ自体は残る）', () => {
    const result = updateDocumentUuid(MAIML_WITH_UUID);

    expect(result).toContain('<document id="doc1">');
    expect(result).toContain('<uuid>');
    expect(result).toContain('</uuid>');
    expect(result).toContain('<name>テストドキュメント</name>');
  });

  test('【正常】<document> 以外の <uuid>（method 配下など）は変更されない', () => {
    const result = updateDocumentUuid(MAIML_WITH_UUID);

    // method 直下の UUID は変更されていない
    expect(result).toContain('<uuid>11111111-2222-4333-8444-555555555555</uuid>');
  });

  test('【正常】<document> が属性を複数持つ場合でも正しく置換される', () => {
    const result = updateDocumentUuid(MAIML_WITH_ATTRS);

    const match = result.match(/<document[^>]*>[\s\S]*?<uuid>([^<]*)<\/uuid>/);
    expect(match).not.toBeNull();
    const newUuid = match![1];

    expect(newUuid).not.toBe('ffffffff-eeee-4ddd-8ccc-bbbbbbbbbbbb');
    expect(UUID_V4_PATTERN.test(newUuid)).toBe(true);
  });

  test('【境界】<document>/<uuid> が存在しない場合は元の文字列をそのまま返す', () => {
    const result = updateDocumentUuid(MAIML_WITHOUT_UUID);

    // 変更されない
    expect(result).toBe(MAIML_WITHOUT_UUID);
  });

  test('【境界】空文字 UUID の場合は新しい UUID が設定される', () => {
    const result = updateDocumentUuid(MAIML_WITH_EMPTY_UUID);

    const match = result.match(/<document[^>]*>[\s\S]*?<uuid>([^<]*)<\/uuid>/);
    expect(match).not.toBeNull();
    const newUuid = match![1];
    expect(UUID_V4_PATTERN.test(newUuid)).toBe(true);
  });

  test('【正常】複数回呼び出すと毎回異なる UUID が生成される', () => {
    const result1 = updateDocumentUuid(MAIML_WITH_UUID);
    const result2 = updateDocumentUuid(MAIML_WITH_UUID);

    const match1 = result1.match(/<document[^>]*>[\s\S]*?<uuid>([^<]*)<\/uuid>/);
    const match2 = result2.match(/<document[^>]*>[\s\S]*?<uuid>([^<]*)<\/uuid>/);

    expect(match1![1]).not.toBe(match2![1]);
  });
});

// =====================================================================
// normalizeForDiffCheck() のテスト
// =====================================================================

describe('normalizeForDiffCheck()', () => {
  test('【正常】<document>/<uuid> の値が __UUID_PLACEHOLDER__ に置換される', () => {
    const result = normalizeForDiffCheck(MAIML_WITH_UUID);

    expect(result).toContain('<uuid>__UUID_PLACEHOLDER__</uuid>');
  });

  test('【正常】<document> 以外の <uuid>（method 配下など）は変更されない', () => {
    const result = normalizeForDiffCheck(MAIML_WITH_UUID);

    // method 直下の UUID は変更されていない
    expect(result).toContain('<uuid>11111111-2222-4333-8444-555555555555</uuid>');
  });

  test('【正常】XML 構造は維持される', () => {
    const result = normalizeForDiffCheck(MAIML_WITH_UUID);

    expect(result).toContain('<document id="doc1">');
    expect(result).toContain('<name>テストドキュメント</name>');
    expect(result).toContain('<description>テスト用</description>');
  });

  test('【境界】<document>/<uuid> が存在しない場合は元の文字列をそのまま返す', () => {
    const result = normalizeForDiffCheck(MAIML_WITHOUT_UUID);

    expect(result).toBe(MAIML_WITHOUT_UUID);
  });

  test('【正常】UUID が異なる同内容の MAIML は normalize 後に等しくなる（差分なし判定）', () => {
    const maiml1 = MAIML_WITH_UUID;
    const maiml2 = MAIML_WITH_UUID.replace(
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      'ffffffff-1111-4222-8333-444444444444'
    );

    const normalized1 = normalizeForDiffCheck(maiml1);
    const normalized2 = normalizeForDiffCheck(maiml2);

    // UUID だけが異なる場合は差分なしとみなされる
    expect(normalized1).toBe(normalized2);
  });

  test('【正常】UUID 以外の内容が異なる MAIML は normalize 後も等しくならない（差分あり判定）', () => {
    const maiml1 = MAIML_WITH_UUID;
    const maiml2 = MAIML_WITH_UUID.replace(
      '<name>テストドキュメント</name>',
      '<name>変更後ドキュメント</name>'
    );

    const normalized1 = normalizeForDiffCheck(maiml1);
    const normalized2 = normalizeForDiffCheck(maiml2);

    // 内容が異なる場合は差分あり
    expect(normalized1).not.toBe(normalized2);
  });

  test('【正常】<document> が属性を複数持つ場合でも正しく置換される', () => {
    const result = normalizeForDiffCheck(MAIML_WITH_ATTRS);

    expect(result).toContain('<uuid>__UUID_PLACEHOLDER__</uuid>');
    expect(result).not.toContain('ffffffff-eeee-4ddd-8ccc-bbbbbbbbbbbb');
  });
});
