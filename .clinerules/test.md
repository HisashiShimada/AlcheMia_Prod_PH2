# テスト規約

## テストコードの配置

### ディレクトリ構造
```
backend/tests/
├── setup.js                          # テスト環境セットアップ
├── utils/
│   ├── tenantValidator.test.js      # バリデーターテスト
│   └── s3TenantHelper.test.js       # S3ヘルパーテスト
├── middleware/
│   ├── tenantIsolation.test.js      # テナント分離テスト
│   └── permissionCheck.test.js      # 権限チェックテスト
├── services/
│   ├── tenantService.test.js        # テナントサービステスト
│   └── permissionService.test.js    # 権限サービステスト
└── integration/
    └── api.test.js                  # 統合テスト
```

## テスト実行方法

### 全テスト実行
```bash
cd backend
npm test
```

### カバレッジ付きテスト実行
```bash
npm run test:coverage
```

### 特定のテストファイルを実行
```bash
npm test -- tenantValidator.test.js
```

### Watch モードでテスト実行
```bash
npm run test:watch
```

### ユニットテストのみ
```bash
npm run test:unit
```

### 統合テストのみ
```bash
npm run test:integration
```

## テスト種類と対象

### 1. ユニットテスト
- **対象**: 関数、コンポーネント、hooks、middleware、services
- **目的**: 個別の機能が正しく動作することを確認
- **カバレッジ目標**: 80%以上
- **配置**: tests/(utils|middleware|services)/

### 2. 統合テスト
- **対象**: APIエンドポイント、複数のモジュールの連携
- **目的**: システム全体の動作を確認
- **カバレッジ目標**: 主要フローの網羅
- **配置**: tests/integration/

### 3. E2Eテスト（将来実装予定）
- **対象**: フロントエンドとバックエンドの統合
- **目的**: ユーザーシナリオの検証
- **ツール**: Playwright（予定）

## テスト記述規約

### テストファイルの命名規則
- ユニットテスト: `[ファイル名].test.js`
- 統合テスト: `[機能名].integration.test.js`

### テスト構造
```javascript
describe('テスト対象の名前', () => {
  // セットアップ
  beforeEach(() => {
    // 各テスト前の準備
  });

  // クリーンアップ
  afterEach(() => {
    // 各テスト後の後処理
  });

  describe('メソッド/機能名', () => {
    test('期待される動作を説明', () => {
      // Arrange（準備）
      const input = 'test';
      
      // Act（実行）
      const result = functionToTest(input);
      
      // Assert（検証）
      expect(result).toBe('expected');
    });

    test('エラーケースを説明', () => {
      // エラーケースのテスト
      expect(() => {
        functionToTest(null);
      }).toThrow();
    });
  });
});
```

### テストケースの命名
- 何をテストしているかを明確に記述
- 日本語での記述を推奨
- 期待する結果を含める

**良い例:**
```javascript
test('有効な組織名を受け入れる', () => {
  // テスト実装
});

test('空の名前を拒否する', () => {
  // テスト実装
});
```

**悪い例:**
```javascript
test('test1', () => {
  // テスト実装
});

test('validation', () => {
  // テスト実装
});
```

## テストヘルパー

### グローバルヘルパー（setup.js）
- モックユーザー
- モックOrganization
- モックProject
- モックWorkspace
- モックPermission
- モックリクエスト生成
- モックレスポンス生成
- モックNext関数

### モック設定

#### データベースモック
```javascript
const { getPool } = require('../database/db');

beforeEach(() => {
  const mockQuery = jest.fn();
  getPool.mockReturnValue({
    query: mockQuery
  });
});
```

#### 監査サービスモック
```javascript
// デフォルトでモック済み
// 必要に応じてカスタマイズ可能
jest.spyOn(auditService, 'logAuditEvent')
  .mockResolvedValue({ success: true });
```

## カバレッジ目標

### 目標値
- **Branches**: 70%以上
- **Functions**: 70%以上
- **Lines**: 70%以上
- **Statements**: 70%以上

### カバレッジ対象
```javascript
// jest.config.js
collectCoverageFrom: [
    'middleware/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    'routes/tenants/**/*.js',
    'routes/shared/**/*.js',
    'routes/provider/**/*.js'
]
```

## ベストプラクティス

### DO（推奨）
✅ 各テストは独立して実行できるようにする
✅ AAA（Arrange-Act-Assert）パターンを使用する
✅ テスト名は具体的で分かりやすくする
✅ エッジケースをテストする
✅ エラーケースをテストする
✅ モックは最小限に留める
✅ テストデータはテスト内で生成する
✅ 非同期処理は適切にawaitする

### DON'T（非推奨）
❌ テスト間で状態を共有しない
❌ 実際のAPIやDBに依存しない
❌ テストに実装の詳細を含めない
❌ 1つのテストで複数のことをテストしない
❌ console.logをテストコードに残さない
❌ タイムアウト値を長く設定しすぎない

## テストの優先順位

### 優先度: 高
1. **認証・認可**: セキュリティに関わる重要な機能
2. **マルチテナント分離**: データ漏洩を防ぐ重要な機能
3. **APIエンドポイント**: 外部インターフェース
4. **データベース操作**: データ整合性に関わる処理

### 優先度: 中
5. **バリデーション**: 入力検証
6. **エラーハンドリング**: エラー処理
7. **ユーティリティ関数**: 共通処理

### 優先度: 低
8. **UI/UX**: 見た目の調整
9. **ログ出力**: ログ記録

## トラブルシューティング

### テストが失敗する場合

#### モジュールが見つからない
```bash
npm install
```

#### タイムアウトエラー
- jest.config.jsのtestTimeoutを増やす
- 非同期処理のawaitを確認

#### データベース接続エラー
- tests/setup.jsの環境変数を確認
- モックが正しく設定されているか確認

### カバレッジが低い場合

1. **エッジケースを追加**
   - 境界値のテスト
   - null/undefinedのテスト
   - 空配列/空文字列のテスト

2. **エラーハンドリングのテストを追加**
   - try-catchブロックのテスト
   - エラー時の処理のテスト

3. **異常系のテストを追加**
   - 不正な入力のテスト
   - 権限エラーのテスト
   - リソース不足のテスト

## テストドキュメント

### 参考資料
- [Jest公式ドキュメント](https://jestjs.io/docs/getting-started)
- [Node.js Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#-testing-and-overall-quality-practices)
- backend/TEST_GUIDE.md - 詳細なテストガイド

## 継続的な改善

### 定期的な見直し
- テストカバレッジの確認（週次）
- 失敗するテストの原因分析
- テストコードのリファクタリング

### テストの追加タイミング
- 新機能追加時
- バグ修正時（リグレッションテスト）
- リファクタリング前後

### レビュー時の確認項目
- [ ] 新しいテストが追加されているか
- [ ] カバレッジが維持/向上しているか
- [ ] すべてのテストが成功しているか
- [ ] テスト名が明確か
- [ ] エッジケースがカバーされているか
