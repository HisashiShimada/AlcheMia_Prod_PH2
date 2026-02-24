# タスク計画書: TypeScript型定義エラー修正

## メタデータ
- **作成日時**: 2026-02-23 11:48
- **タスクID**: typescript_express_type_definition_fix
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

バックエンドのデバッグ実行時に発生するTypeScriptコンパイルエラー（`req.user`プロパティが存在しない）を修正する。

### エラー内容
```
TSError: ⨯ Unable to compile TypeScript:
src/controllers/authController.ts:165:24 - error TS2339: Property 'user' does not exist on type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
```

## 2. 目的と期待される成果

### 目的
- TypeScriptコンパイルエラーを解消し、デバッグ実行を可能にする
- すべてのコントローラーで型定義が正しく認識されるようにする

### 期待される成果
- [x] エラー原因の特定完了
- [ ] 全コントローラーファイルの修正完了
- [ ] デバッグ実行の成功確認

## 3. 原因分析

### 問題の詳細
1. **型定義ファイルは存在する**: `backend/src/types/express.d.ts`に`req.user`の型拡張が定義されている
2. **TypeScriptが認識していない**: コントローラーファイルで型定義ファイルを明示的にインポートしていないため、型拡張が適用されない
3. **影響範囲**: `req.user`を使用している全14個のコントローラーファイル

### 型定義ファイルの内容
```typescript
// backend/src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
```

## 4. 実装ステップ

### Phase 1: 型定義インポートの追加
以下の14個のコントローラーファイルに型定義インポートを追加：

- [ ] authController.ts
- [ ] corporationController.ts
- [ ] departmentControler.ts
- [ ] experimentController.ts
- [ ] fileAccessController.ts
- [ ] issueController.ts
- [ ] maimlController.ts
- [ ] masterController.ts
- [ ] organizationController.ts
- [ ] progressController.ts
- [ ] projectController.ts
- [ ] roleController.ts
- [ ] sessionController.ts
- [ ] workerProjectController.ts

### 修正内容
各ファイルの先頭に以下のインポート文を追加：
```typescript
import '../types/express';
```

### Phase 2: 動作確認
- [ ] デバッグ実行が成功することを確認
- [ ] TypeScriptコンパイルエラーが解消されることを確認

## 5. 影響範囲

### 変更するファイル
1. `backend/src/controllers/authController.ts`
2. `backend/src/controllers/corporationController.ts`
3. `backend/src/controllers/departmentControler.ts`
4. `backend/src/controllers/experimentController.ts`
5. `backend/src/controllers/fileAccessController.ts`
6. `backend/src/controllers/issueController.ts`
7. `backend/src/controllers/maimlController.ts`
8. `backend/src/controllers/masterController.ts`
9. `backend/src/controllers/organizationController.ts`
10. `backend/src/controllers/progressController.ts`
11. `backend/src/controllers/projectController.ts`
12. `backend/src/controllers/roleController.ts`
13. `backend/src/controllers/sessionController.ts`
14. `backend/src/controllers/workerProjectController.ts`

### 影響を受ける機能
- すべての認証が必要なAPIエンドポイント
- デバッグ実行環境

## 6. 技術的詳細

### TypeScript型拡張の仕組み
- `.d.ts`ファイルでの`declare global`は、明示的にインポートする必要がある
- `tsconfig.json`の`typeRoots`設定だけでは不十分
- 各ファイルで`import '../types/express';`を追加することで型拡張が適用される

### セキュリティ考慮事項
- [ ] 型定義の追加のみで、ロジックの変更なし
- [ ] 既存の認証・認可フローに影響なし

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| インポート追加漏れ | 低 | 低 | 全コントローラーを網羅的に確認 |
| 既存コードへの影響 | 低 | 低 | インポート文のみの追加で影響なし |
| デバッグ実行失敗 | 中 | 低 | 修正後に実際にデバッグ実行して確認 |

## 8. テスト計画

### 手動テスト
- [ ] デバッグ実行を起動
- [ ] TypeScriptコンパイルエラーが発生しないことを確認
- [ ] サーバーが正常に起動することを確認

## 9. ロールバック計画

修正は単純なインポート文の追加のみなので、問題が発生した場合は：
1. 各ファイルから`import '../types/express';`を削除
2. 元の状態に戻す

## 10. 承認記録

- **計画書提示日時**: 2026-02-23 11:48
- **承認日時**: （承認後記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: 2026-02-23 11:48
完了: （作業完了時の日時を記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
（完了後に記入）

## 12. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）
