# タスク計画書: createApiClient共通化

## メタデータ
- **作成日時**: 2026-01-28 09:05
- **タスクID**: createApiClient共通化
- **優先度**: 中
- **推定工数**: 30分

## 1. タスク概要

`frontend/src/services/authService.ts`に存在する`createApiClient`関数を共通化し、`frontend/src/utils/authUtils.ts`に移動します。これにより、認証付きAxiosインスタンスを他のサービスでも再利用できるようになります。

## 2. 目的と期待される成果

### 目的
- `createApiClient`を共通化し、コードの重複を防ぐ
- 他のサービスファイルでも認証付きAxiosインスタンスを利用できるようにする
- セッショントークンの自動付与ロジックを一元管理する

### 期待される成果
- [x] `frontend/src/utils/authUtils.ts`が作成される
- [ ] `createApiClient`が`authUtils.ts`に移動される
- [ ] `authService.ts`が`authUtils.ts`から`createApiClient`をインポートする
- [ ] 既存の認証機能が正常に動作する

## 3. 実装ステップ

### Phase 1: authUtils.tsの作成
- [ ] `frontend/src/utils/authUtils.ts`ファイルを作成
- [ ] `createApiClient`関数を移動
- [ ] 必要なインポート（axios、型定義）を追加
- [ ] `createApiClient`をエクスポート

### Phase 2: authService.tsの更新
- [ ] `authService.ts`から`createApiClient`関数定義を削除
- [ ] `authUtils.ts`から`createApiClient`をインポート
- [ ] 既存のコードが動作することを確認

### Phase 3: 動作確認
- [ ] ログイン機能が正常に動作することを確認
- [ ] セッショントークンが正しく付与されることを確認
- [ ] エラーハンドリングが正常に動作することを確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/services/authService.ts` - `createApiClient`の削除、インポート追加

### 新規作成するファイル
1. `frontend/src/utils/authUtils.ts` - `createApiClient`の配置

### 削除するファイル
なし

### 影響を受ける機能
- 認証機能（ログイン、PIN検証、ログアウトなど）
- 影響は限定的（内部実装の変更のみ）

## 5. 技術的詳細

### 使用する技術・ライブラリ
- axios: 9.0.0 - HTTPクライアント
- TypeScript - 型安全な実装

### アーキテクチャ上の考慮事項
- `createApiClient`は再利用可能なユーティリティ関数として設計
- リクエストインターセプターでSessionStorageから自動的にトークンを取得
- ブラウザ環境チェック（`typeof window !== 'undefined'`）を維持

### セキュリティ考慮事項
- [x] SessionStorageからのトークン取得ロジックを維持
- [x] Authorizationヘッダーの自動付与を維持
- [x] タイムアウト設定（10秒）を維持

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| インポートパスの誤り | 中 | 低 | 移動後に即座に動作確認 |
| 既存機能の動作不良 | 高 | 低 | 段階的に実装し、各ステップで確認 |

## 7. テスト計画

### 手動テスト
- [ ] ログイン機能の動作確認
- [ ] PIN検証機能の動作確認
- [ ] セッショントークンが正しくヘッダーに付与されることを確認
- [ ] エラーハンドリングが正常に動作することを確認

## 8. ロールバック計画

問題が発生した場合は、`authUtils.ts`の作成前の状態に戻します：
1. `authUtils.ts`を削除
2. `authService.ts`を元の状態に戻す（`createApiClient`を内部に戻す）

## 9. 関連ドキュメント

- `.clinerules/development/frontend.md` - フロントエンド規約
- `.clinerules/development/config.md` - コーディング規約

## 10. 承認記録

- **計画書提示日時**: 2026-01-28 09:05
- **承認日時**: 2026-01-28 09:07
- **承認者コメント**: authUtils.tsに変更

## 11. 実施記録

### 実施日時
開始: 2026-01-28 09:07
完了: 2026-01-28 09:08

### 計画からの変更点
- ファイル名を`authUtil.ts`から`authUtils.ts`に変更（ユーザー要望）

### 発生した問題と解決方法
特に問題なく実装完了

### 最終的な成果物
- [x] `frontend/src/utils/authUtils.ts` - 作成完了
- [x] `frontend/src/services/authService.ts` - 更新完了

## 12. 振り返り

### うまくいった点
- `createApiClient`の使用箇所が`authService.ts`内のみだったため、影響範囲が限定的で安全に移動できた
- インターセプターのロジックを含む完全な関数として移動できた
- TypeScriptの型定義も適切に引き継げた

### 改善が必要な点
- 特になし

### 学んだこと
- 共通化する前に使用箇所を確認することで、安全にリファクタリングできる
- ユーティリティファイルの命名規則（複数形）の重要性
