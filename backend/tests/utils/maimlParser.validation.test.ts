/**
 * MAIMLバリデーション緩和テスト
 *
 * 各バリデーションケースについて、lenient（アップロード時）と strict（保存時）の
 * 動作の違いを検証する。
 *
 * テストデータ: test_data/maiml_validation/
 *   01_valid.maiml                  … 正常ファイル（エラーなし）
 *   02_document_missing_children    … document必須子要素欠落
 *   03_document_missing_id          … document id属性欠落
 *   04_method_missing_id            … method id属性欠落
 *   05_invalid_uuid                 … document UUID不正
 *   06_missing_protocol             … protocol要素欠落（構造的エラー）
 *   07_missing_pnml                 … pnml要素欠落（構造的エラー）
 *   08_reference_error              … 存在しないIDを参照
 *   09_duplicate_id                 … ID重複
 *   10_xml_syntax_error             … XML構文エラー
 *   11_warning_only_combined        … 複数の警告項目が複合したケース
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { analyzeMaiMLFile } from '../../src/utils/maimlParser';
import { AnalysisResult } from '../../src/types/maimlValidation';

// テストデータディレクトリ
const TEST_DATA_DIR = path.join(__dirname, 'maiml_validation');
const DUMMY_ORG_ID = 'test-org-00000000-0000-0000-0000-000000000000';

/**
 * MAIMLファイルを読み込み、skipSave=true で analyzeMaiMLFile を呼ぶヘルパー
 */
async function analyzeFile(
  filename: string,
  mode: 'strict' | 'lenient'
): Promise<AnalysisResult> {
  const filePath = path.join(TEST_DATA_DIR, filename);
  const content = await fs.readFile(filePath, 'utf-8');
  return analyzeMaiMLFile(DUMMY_ORG_ID, content, filename, true, mode);
}

/**
 * エラーの有無を判定するヘルパー
 * errors 配列に severity='error' が1つでもあれば true
 */
function hasError(result: AnalysisResult): boolean {
  return result.errors.some(e => e.severity === 'error');
}

/**
 * 致命的エラー（アップロード不可エラー）の有無を判定するヘルパー
 * canBeIgnoredOnUpload=false の severity='error' が1つでもあれば true
 */
function hasFatalError(result: AnalysisResult): boolean {
  return result.errors.some(e => e.severity === 'error' && !e.canBeIgnoredOnUpload);
}

/**
 * 編集可能エラー（アップロード許可エラー）の有無を判定するヘルパー
 * canBeIgnoredOnUpload=true の severity='error' が1つでもあれば true
 */
function hasIgnorableError(result: AnalysisResult): boolean {
  return result.errors.some(e => e.severity === 'error' && e.canBeIgnoredOnUpload === true);
}

/**
 * 警告の有無を判定するヘルパー
 * warnings 配列に severity='warning' が1つでもあれば true
 */
function hasWarning(result: AnalysisResult): boolean {
  return result.warnings.some(w => w.severity === 'warning');
}

// ============================================================
// テストスイート
// ============================================================

describe('MAIMLバリデーション緩和 - lenient vs strict モード比較', () => {

  // ----------------------------------------------------------
  // ケース01: 完全に正常なMAIML
  // ----------------------------------------------------------
  describe('ケース01: 正常ファイル（01_valid.maiml）', () => {
    test('lenient: エラーなし・警告なし', async () => {
      const result = await analyzeFile('01_valid.maiml', 'lenient');
      expect(hasError(result)).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    test('strict: エラーなし・警告なし', async () => {
      const result = await analyzeFile('01_valid.maiml', 'strict');
      expect(hasError(result)).toBe(false);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------
  // ケース02: document必須子要素欠落（uuid/creator/vendor/owner/date）
  // ----------------------------------------------------------
  describe('ケース02: document必須子要素欠落（02_document_missing_children.maiml）', () => {
    test('lenient: 致命的エラーなし（編集可能エラーのみ）→ アップロード成功', async () => {
      const result = await analyzeFile('02_document_missing_children.maiml', 'lenient');
      // 致命的エラーなし → アップロード可
      expect(hasFatalError(result)).toBe(false);
      // 編集可能エラーあり（creator/vendor/owner/date の4項目が欠落）
      expect(hasIgnorableError(result)).toBe(true);
      const ignorableErrors = result.errors.filter(e =>
        e.type === 'missing_required' && e.canBeIgnoredOnUpload === true
      );
      expect(ignorableErrors.length).toBeGreaterThanOrEqual(4);
      // 全エラーはerrorsに含まれ、warningsには含まれない
      const missingWarnings = result.warnings.filter(w =>
        w.type === 'missing_required'
      );
      expect(missingWarnings.length).toBe(0);
    });

    test('strict: エラーあり → 保存失敗', async () => {
      const result = await analyzeFile('02_document_missing_children.maiml', 'strict');
      expect(hasError(result)).toBe(true);
      // creator/vendor/owner/date の4項目が欠落
      const missingErrors = result.errors.filter(e =>
        e.type === 'missing_required' && e.severity === 'error'
      );
      expect(missingErrors.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ----------------------------------------------------------
  // ケース03: document id属性欠落
  // ----------------------------------------------------------
  describe('ケース03: document id属性欠落（03_document_missing_id.maiml）', () => {
    test('lenient: 致命的エラーなし（編集可能エラーのみ）→ アップロード成功', async () => {
      const result = await analyzeFile('03_document_missing_id.maiml', 'lenient');
      // 致命的エラーなし → アップロード可
      expect(hasFatalError(result)).toBe(false);
      // 編集可能エラーあり（canBeIgnoredOnUpload=true）
      expect(hasIgnorableError(result)).toBe(true);
      const idError = result.errors.find(e =>
        e.message.includes('"id"') && e.message.toLowerCase().includes('document')
      );
      expect(idError).toBeDefined();
      expect(idError?.canBeIgnoredOnUpload).toBe(true);
      // warningsには含まれないことを確認
      const idWarning = result.warnings.find(w =>
        w.message.includes('"id"') && w.message.toLowerCase().includes('document')
      );
      expect(idWarning).toBeUndefined();
    });

    test('strict: エラーあり → 保存失敗', async () => {
      const result = await analyzeFile('03_document_missing_id.maiml', 'strict');
      expect(hasError(result)).toBe(true);
      const idError = result.errors.find(e =>
        e.message.includes('"id"') && e.message.toLowerCase().includes('document')
      );
      expect(idError).toBeDefined();
      expect(idError?.severity).toBe('error');
    });
  });

  // ----------------------------------------------------------
  // ケース04: method id属性欠落
  // ----------------------------------------------------------
  describe('ケース04: method id属性欠落（04_method_missing_id.maiml）', () => {
    test('lenient: 致命的エラーなし（編集可能エラーのみ）→ アップロード成功', async () => {
      const result = await analyzeFile('04_method_missing_id.maiml', 'lenient');
      // 致命的エラーなし → アップロード可
      expect(hasFatalError(result)).toBe(false);
      // 編集可能エラーあり（canBeIgnoredOnUpload=true）
      expect(hasIgnorableError(result)).toBe(true);
      const methodError = result.errors.find(e =>
        e.message.toLowerCase().includes('method') &&
        e.message.includes('"id"')
      );
      expect(methodError).toBeDefined();
      expect(methodError?.canBeIgnoredOnUpload).toBe(true);
      // warningsには含まれないことを確認
      const methodWarning = result.warnings.find(w =>
        w.message.toLowerCase().includes('method') &&
        w.message.includes('"id"')
      );
      expect(methodWarning).toBeUndefined();
    });

    test('strict: エラーあり → 保存失敗', async () => {
      const result = await analyzeFile('04_method_missing_id.maiml', 'strict');
      expect(hasError(result)).toBe(true);
      const methodError = result.errors.find(e =>
        e.message.toLowerCase().includes('method') &&
        e.message.includes('"id"')
      );
      expect(methodError).toBeDefined();
      expect(methodError?.severity).toBe('error');
    });
  });

  // ----------------------------------------------------------
  // ケース05: document UUID不正（アップロード後変更不可）
  // ----------------------------------------------------------
  describe('ケース05: document UUID不正（05_invalid_uuid.maiml）', () => {
    test('lenient: エラーあり → アップロード失敗（両モードともエラー）', async () => {
      const result = await analyzeFile('05_invalid_uuid.maiml', 'lenient');
      expect(hasError(result)).toBe(true);
      const uuidError = result.errors.find(e =>
        e.message.toLowerCase().includes('uuid')
      );
      expect(uuidError).toBeDefined();
      expect(uuidError?.severity).toBe('error');
    });

    test('strict: エラーあり → 保存失敗', async () => {
      const result = await analyzeFile('05_invalid_uuid.maiml', 'strict');
      expect(hasError(result)).toBe(true);
      const uuidError = result.errors.find(e =>
        e.message.toLowerCase().includes('uuid')
      );
      expect(uuidError).toBeDefined();
      expect(uuidError?.severity).toBe('error');
    });
  });

  // ----------------------------------------------------------
  // ケース06: protocol要素欠落（構造的エラー）
  // ----------------------------------------------------------
  describe('ケース06: protocol要素欠落（06_missing_protocol.maiml）', () => {
    test('lenient: エラーあり → アップロード失敗', async () => {
      const result = await analyzeFile('06_missing_protocol.maiml', 'lenient');
      expect(hasError(result)).toBe(true);
      const protocolError = result.errors.find(e =>
        e.message.toLowerCase().includes('protocol')
      );
      expect(protocolError).toBeDefined();
      expect(protocolError?.severity).toBe('error');
    });

    test('strict: エラーあり → 保存失敗', async () => {
      const result = await analyzeFile('06_missing_protocol.maiml', 'strict');
      expect(hasError(result)).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // ケース07: pnml要素欠落（構造的エラー）
  // ----------------------------------------------------------
  describe('ケース07: pnml要素欠落（07_missing_pnml.maiml）', () => {
    test('lenient: エラーあり → アップロード失敗', async () => {
      const result = await analyzeFile('07_missing_pnml.maiml', 'lenient');
      expect(hasError(result)).toBe(true);
      const pnmlError = result.errors.find(e =>
        e.message.toLowerCase().includes('pnml')
      );
      expect(pnmlError).toBeDefined();
      expect(pnmlError?.severity).toBe('error');
    });

    test('strict: エラーあり → 保存失敗', async () => {
      const result = await analyzeFile('07_missing_pnml.maiml', 'strict');
      expect(hasError(result)).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // ケース08: 参照エラー（存在しないIDを参照）
  // ----------------------------------------------------------
  describe('ケース08: 参照エラー（08_reference_error.maiml）', () => {
    test('lenient: エラーあり → アップロード失敗（両モードともエラー）', async () => {
      const result = await analyzeFile('08_reference_error.maiml', 'lenient');
      expect(hasError(result)).toBe(true);
      const refError = result.errors.find(e =>
        e.type === 'reference_error' || e.message.toLowerCase().includes('reference')
      );
      expect(refError).toBeDefined();
      expect(refError?.severity).toBe('error');
    });

    test('strict: エラーあり → 保存失敗', async () => {
      const result = await analyzeFile('08_reference_error.maiml', 'strict');
      expect(hasError(result)).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // ケース09: ID重複
  // ----------------------------------------------------------
  describe('ケース09: ID重複（09_duplicate_id.maiml）', () => {
    test('lenient: エラーあり → アップロード失敗（参照関係を破壊するため両モードともエラー）', async () => {
      const result = await analyzeFile('09_duplicate_id.maiml', 'lenient');
      expect(hasError(result)).toBe(true);
      const dupError = result.errors.find(e =>
        e.type === 'duplicate_id' || e.message.toLowerCase().includes('duplicate')
      );
      expect(dupError).toBeDefined();
      expect(dupError?.severity).toBe('error');
      // 警告には降格されていないことを確認
      const dupWarning = result.warnings.find(w =>
        w.type === 'duplicate_id' || w.message.toLowerCase().includes('duplicate')
      );
      expect(dupWarning).toBeUndefined();
    });

    test('strict: エラーあり → 保存失敗', async () => {
      const result = await analyzeFile('09_duplicate_id.maiml', 'strict');
      expect(hasError(result)).toBe(true);
      const dupError = result.errors.find(e =>
        e.type === 'duplicate_id' || e.message.toLowerCase().includes('duplicate')
      );
      expect(dupError).toBeDefined();
      expect(dupError?.severity).toBe('error');
    });
  });

  // ----------------------------------------------------------
  // ケース10: XML構文エラー
  // ----------------------------------------------------------
  describe('ケース10: XML構文エラー（10_xml_syntax_error.maiml）', () => {
    test('lenient: エラーあり → アップロード失敗', async () => {
      const result = await analyzeFile('10_xml_syntax_error.maiml', 'lenient');
      expect(hasError(result)).toBe(true);
      const syntaxError = result.errors.find(e =>
        e.type === 'syntax_error'
      );
      expect(syntaxError).toBeDefined();
      expect(syntaxError?.severity).toBe('error');
    });

    test('strict: エラーあり → 保存失敗', async () => {
      const result = await analyzeFile('10_xml_syntax_error.maiml', 'strict');
      expect(hasError(result)).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // ケース11: 複数の警告項目が複合（document id欠落 + 子要素欠落 + method id欠落）
  // ----------------------------------------------------------
  describe('ケース11: 複合警告ケース（11_warning_only_combined.maiml）', () => {
    test('lenient: 致命的エラーなし（編集可能エラーのみ）→ アップロード成功', async () => {
      const result = await analyzeFile('11_warning_only_combined.maiml', 'lenient');
      // 致命的エラーなし → アップロード可
      expect(hasFatalError(result)).toBe(false);
      // 編集可能エラーあり（canBeIgnoredOnUpload=true）
      expect(hasIgnorableError(result)).toBe(true);
      // document id欠落(1) + creator/vendor/owner/date欠落(4) + method id欠落(1) = 合計6件以上の編集可能エラー
      // ※ uuid は含まれているため致命的エラーなし
      const ignorableErrors = result.errors.filter(e =>
        e.severity === 'error' && e.canBeIgnoredOnUpload === true
      );
      expect(ignorableErrors.length).toBeGreaterThanOrEqual(6);
    });

    test('strict: 複数エラーあり → 保存失敗', async () => {
      const result = await analyzeFile('11_warning_only_combined.maiml', 'strict');
      expect(hasError(result)).toBe(true);
      // document id欠落 + creator/vendor/owner/date欠落(4件) + method id欠落 = 合計6件以上のエラー
      const strictErrors = result.errors.filter(e => e.severity === 'error');
      expect(strictErrors.length).toBeGreaterThanOrEqual(6);
    });
  });

  // ----------------------------------------------------------
  // ケース12: document uuid欠落（両モードともエラー）
  // ----------------------------------------------------------
  describe('ケース12: document uuid欠落（12_document_missing_uuid.maiml）', () => {
    test('lenient: エラーあり → アップロード失敗（両モードともエラー）', async () => {
      const result = await analyzeFile('12_document_missing_uuid.maiml', 'lenient');
      expect(hasError(result)).toBe(true);
      const uuidError = result.errors.find(e =>
        e.message.toLowerCase().includes('uuid') && e.message.toLowerCase().includes('document')
      );
      expect(uuidError).toBeDefined();
      expect(uuidError?.severity).toBe('error');
      // 警告には降格されていないことを確認
      const uuidWarning = result.warnings.find(w =>
        w.message.toLowerCase().includes('uuid') && w.message.toLowerCase().includes('document')
      );
      expect(uuidWarning).toBeUndefined();
    });

    test('strict: エラーあり → 保存失敗', async () => {
      const result = await analyzeFile('12_document_missing_uuid.maiml', 'strict');
      expect(hasError(result)).toBe(true);
      const uuidError = result.errors.find(e =>
        e.message.toLowerCase().includes('uuid') && e.message.toLowerCase().includes('document')
      );
      expect(uuidError).toBeDefined();
      expect(uuidError?.severity).toBe('error');
    });
  });

  // ----------------------------------------------------------
  // ベースファイル（ito_test_3.maiml）: 実際のファイルで両モード正常動作確認
  // ----------------------------------------------------------
  describe('ベースファイル（ito_test_3.maiml）', () => {
    const BASE_FILE = path.join(__dirname, '../../../test_data/ito_test_3.maiml');

    test('lenient: エラーなし', async () => {
      const content = await fs.readFile(BASE_FILE, 'utf-8');
      const result = await analyzeMaiMLFile(
        DUMMY_ORG_ID, content, 'ito_test_3.maiml', true, 'lenient'
      );
      expect(hasError(result)).toBe(false);
    });

    test('strict: エラーなし', async () => {
      const content = await fs.readFile(BASE_FILE, 'utf-8');
      const result = await analyzeMaiMLFile(
        DUMMY_ORG_ID, content, 'ito_test_3.maiml', true, 'strict'
      );
      expect(hasError(result)).toBe(false);
    });
  });

});
