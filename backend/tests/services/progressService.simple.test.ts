/**
 * ProgressService 簡易テスト
 * Task 1.1: MAIMLパーサーアダプターの動作確認
 */

import { parseMultipleMethodsStructure } from '../../src/services/progressService';

describe('ProgressService - parseMultipleMethodsStructure (簡易テスト)', () => {
  it('関数がエクスポートされていることを確認', () => {
    expect(typeof parseMultipleMethodsStructure).toBe('function');
  });

  it('不正なXMLで適切にエラーを返す', async () => {
    const result = await parseMultipleMethodsStructure('invalid xml');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.methods).toEqual([]);
    expect(result.error).toBeDefined();
  });
});
