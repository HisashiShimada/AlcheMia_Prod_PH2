/**
 * organizationGroupRepository - findAncestorChain ユニットテスト
 *
 * 分類A：既存機能への影響箇所 回帰テスト
 * 対象: organization_group テーブル（フェーズ２新規追加）
 *
 * @description
 * findAncestorChain() は指定した parentGroupCd を起点として
 * 祖先グループの CD 配列をルート→直近親の順に返す関数。
 */

import { findAncestorChain } from '../../../src/repositories/organizationGroupRepository';
import { getPgp } from '../../../src/database/db';

// データベース接続のモック
jest.mock('../../../src/database/db');
jest.mock('../../../src/sql/loader', () => ({
  loadSqlFile: jest.fn().mockResolvedValue('SELECT * FROM organization_group'),
}));

describe('organizationGroupRepository - findAncestorChain', () => {
  let mockPgp: { any: jest.Mock };

  beforeEach(() => {
    mockPgp = { any: jest.fn() };
    (getPgp as jest.Mock).mockReturnValue(mockPgp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // DB アクセスなしで完結するケース
  // ─────────────────────────────────────────────

  describe('parentGroupCd が null の場合', () => {
    test('DB にアクセスせず空配列を返すこと', async () => {
      const result = await findAncestorChain('org-001', null);

      expect(result).toEqual([]);
      // DB に問い合わせていないことを確認
      expect(mockPgp.any).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // DB モックを使うケース
  // ─────────────────────────────────────────────

  describe('parentGroupCd が指定されている場合', () => {
    test('祖先グループの CD 配列を返すこと（ルート→直近親の順）', async () => {
      // Arrange: RD-ANALYSIS の親は RD、RD の親は null という階層を想定
      mockPgp.any.mockResolvedValue([
        { organization_group_cd: 'RD' },
        { organization_group_cd: 'RD-ANALYSIS' },
      ]);

      // Act
      const result = await findAncestorChain('org-001', 'RD-ANALYSIS');

      // Assert
      expect(result).toEqual(['RD', 'RD-ANALYSIS']);
      expect(mockPgp.any).toHaveBeenCalledTimes(1);
      expect(mockPgp.any).toHaveBeenCalledWith(
        expect.any(String),
        ['org-001', 'RD-ANALYSIS']
      );
    });

    test('ルートグループ（親なし）の場合、自分自身のみを返すこと', async () => {
      // Arrange: RD はルートグループ（parent_group_cd = null）
      mockPgp.any.mockResolvedValue([
        { organization_group_cd: 'RD' },
      ]);

      // Act
      const result = await findAncestorChain('org-001', 'RD');

      // Assert
      expect(result).toEqual(['RD']);
    });

    test('DB が空の行を返した場合、空配列を返すこと', async () => {
      // Arrange
      mockPgp.any.mockResolvedValue([]);

      // Act
      const result = await findAncestorChain('org-001', 'UNKNOWN-GROUP');

      // Assert
      expect(result).toEqual([]);
    });

    test('DB エラーが発生した場合、例外がスローされること', async () => {
      // Arrange
      mockPgp.any.mockRejectedValue(new Error('DB connection failed'));

      // Act & Assert
      await expect(
        findAncestorChain('org-001', 'RD-ANALYSIS')
      ).rejects.toThrow('DB connection failed');
    });
  });
});
