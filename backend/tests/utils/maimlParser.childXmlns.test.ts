/**
 * ケース13: 子タグxmlns宣言スコープ対応テスト
 *
 * 依存モジュール（DB・S3）をモックして validatePropertyTermKeys の
 * スコープ付き xmlns 収集ロジックを単体検証する。
 *
 * 検証ポイント:
 *   G) <result xmlns:tiff="https://www.iso.org/..."> 内の tiff:ImageWidth
 *      → 子タグ外部URI宣言 → スキップ（エラーなし）
 *   H) <result xmlns:myco="https://myco.Alchemia.co.jp"> 内の myco:UnknownKey
 *      → 子タグ Alchemia URI 宣言 → DB未登録 → エラー
 *   I) ケースGの <result> スコープ外にある tiff:OutOfScope
 *      → tiff: が宣言されていないスコープ → 即エラー
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// ── モック設定 ───────────────────────────────────────────────
// DB・S3 アクセスを伴うモジュールをモック化してテスト環境で動作させる

jest.mock('../../src/repositories/namespaceTermRepository', () => ({
  findAllActiveByOrganization: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/services/globalNamespaceFileService', () => ({
  readGlobalDeclarations: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/repositories/maimlAnalysisResultRepository', () => ({
  upsert: jest.fn().mockResolvedValue(undefined),
  findByFileKey: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/repositories/fileMetadataRepository', () => ({
  FileMetadataRepository: jest.fn().mockImplementation(() => ({
    findByFileKey: jest.fn().mockResolvedValue(null),
  })),
}));

// ── インポート（モック設定の後に行う）────────────────────────
import { analyzeMaiMLFile } from '../../src/utils/maimlParser';
import { AnalysisResult } from '../../src/types/maimlValidation';

// ── テストデータ ──────────────────────────────────────────────
const TEST_DATA_DIR = path.join(__dirname, 'maiml_validation');
const DUMMY_ORG_ID = 'test-org-00000000-0000-0000-0000-000000000000';

async function analyzeFile(
  filename: string,
  mode: 'strict' | 'lenient'
): Promise<AnalysisResult> {
  const filePath = path.join(TEST_DATA_DIR, filename);
  const content = await fs.readFile(filePath, 'utf-8');
  return analyzeMaiMLFile(DUMMY_ORG_ID, content, filename, true, mode);
}

// ── テストスイート ────────────────────────────────────────────
describe('ケース13: 子タグxmlns宣言スコープ対応', () => {
  describe('strict モード', () => {
    test('ケースG: 子タグ外部NS（tiff:ImageWidth）はエラーにならない', async () => {
      const result = await analyzeFile('13_child_xmlns.maiml', 'strict');
      const termErrors = result.errors.filter(e => e.type === 'term_not_registered');
      const tiffImageWidthError = termErrors.find(e => e.message.includes('tiff:ImageWidth'));
      expect(tiffImageWidthError).toBeUndefined();
    });

    test('ケースH: 子タグAlchemia NS未登録（myco:UnknownKey）はエラーになる', async () => {
      const result = await analyzeFile('13_child_xmlns.maiml', 'strict');
      const termErrors = result.errors.filter(e => e.type === 'term_not_registered');
      const mycoError = termErrors.find(e => e.message.includes('myco:UnknownKey'));
      expect(mycoError).toBeDefined();
      expect(mycoError?.severity).toBe('error');
      expect(mycoError?.canBeIgnoredOnUpload).toBe(false);
    });

    test('ケースI: スコープ外のprefix（tiff:OutOfScope）は即エラーになる', async () => {
      const result = await analyzeFile('13_child_xmlns.maiml', 'strict');
      const termErrors = result.errors.filter(e => e.type === 'term_not_registered');
      const outOfScopeError = termErrors.find(e => e.message.includes('tiff:OutOfScope'));
      expect(outOfScopeError).toBeDefined();
      expect(outOfScopeError?.severity).toBe('error');
      expect(outOfScopeError?.canBeIgnoredOnUpload).toBe(false);
    });

    test('合計エラー数はG除く2件（H + I）', async () => {
      const result = await analyzeFile('13_child_xmlns.maiml', 'strict');
      const termErrors = result.errors.filter(e => e.type === 'term_not_registered');
      expect(termErrors.length).toBe(2);
    });
  });

  describe('lenient モード', () => {
    test('ケースG: 子タグ外部NS（tiff:ImageWidth）はエラーにならない', async () => {
      const result = await analyzeFile('13_child_xmlns.maiml', 'lenient');
      const termErrors = result.errors.filter(e => e.type === 'term_not_registered');
      const tiffImageWidthError = termErrors.find(e => e.message.includes('tiff:ImageWidth'));
      expect(tiffImageWidthError).toBeUndefined();
    });

    test('ケースH・I: エラー2件、canBeIgnoredOnUpload=true', async () => {
      const result = await analyzeFile('13_child_xmlns.maiml', 'lenient');
      const termErrors = result.errors.filter(e => e.type === 'term_not_registered');
      expect(termErrors.length).toBe(2);
      for (const e of termErrors) {
        expect(e.canBeIgnoredOnUpload).toBe(true);
      }
    });
  });
});
