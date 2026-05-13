# タスク計画書: SessionStorageからorganizationId取得機能実装

## メタデータ
- **作成日時**: 2026-01-26 09:24
- **タスクID**: sessionStorage_organizationId_implementation
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

ログインユーザーの組織ID（organization_id）を取得する際に、Session storage内のorganizationIdから取得する機能を実装します。

## 2. 目的と期待される成果

### 目的
- ログイン後にSessionStorageに保存されているユーザー情報から組織IDを取得できるようにする
- 各API呼び出し時に、バックエンドへ送信するorganizationIdヘッダーを自動設定する
- フロントエンドコンポーネント全体で組織IDを簡単に取得できるようにする

### 期待される成果
- [x] SessionStorageからorganizationIdを取得する機能の実装
- [ ] API呼び出し時の自動ヘッダー設定機能
- [ ] ユーティリティ関数の実装
- [ ] 型定義の追加
- [ ] 既存コンポーネントでの動作確認

## 3. 実装ステップ

### Phase 1: 現状分析と設計
- [x] authService.tsの実装を確認
- [x] SessionStorageの構造を確認（スクリーンショットから）
- [x] organizationIdの使用箇所を特定
- [ ] 型定義の設計

### Phase 2: ユーティリティ関数の実装
- [ ] `frontend/src/utils/sessionStorageHelper.ts` を作成
  - getOrganizationId() 関数
  - getUserInfo() 関数
  - setUserInfo() 関数
  - clearUserInfo() 関数

### Phase 3: authService.tsの修正
- [ ] verifyPin成功時にorganizationIdをSessionStorageに保存
- [ ] Axios interceptorでorganizationIdヘッダーを自動設定
- [ ] logout時にuserデータもクリア

### Phase 4: 型定義の追加
- [ ] `frontend/src/types/session.ts` を作成
  - SessionUserInfo インターフェース

### Phase 5: テストと動作確認
- [ ] ログイン→PIN検証→ログアウトの一連の流れを確認
- [ ] SessionStorageにuserオブジェクトが正しく保存されることを確認
- [ ] API呼び出し時にX-Organization-Idヘッダーが設定されることを確認

## 4. 影響範囲

### 新規作成するファイル
1. `frontend/src/utils/sessionStorageHelper.ts` - SessionStorage操作のユーティリティ
2. `frontend/src/types/session.ts` - SessionStorage関連の型定義

### 変更するファイル
1. `frontend/src/services/authService.ts`
   - verifyPin関数: userデータをSessionStorageに保存
   - Axios interceptor追加: リクエストヘッダーにorganizationIdを自動設定
   - logout関数: userデータもクリア

### 影響を受ける機能
- 全API呼び出し（organizationIdヘッダーが自動設定される）
- ログイン・ログアウト処理
- 各コンポーネントでの組織ID取得

## 5. 技術的詳細

### SessionStorageの構造（スクリーンショットから確認）

```typescript
// SessionStorage構造
{
  sessionToken: "maiml_session-712253c9-a7e9-4712-9de7-44db6dc4e6d7_1...",
  user: {
    id: "3b572113-40ed-44f7-9913-d797184b67d4",
    username: "system_admin",
    displayName: "system_admin",
    email: "system.admin@example.com",
    organizationId: "a0718dc5-21f3-44e6-87e9-cc2ae83f3385",
    organizationName: "研究所A",
    role: "system_admin"
  }
}
```

### 実装方針

1. **SessionStorageヘルパー関数**
```typescript
// getOrganizationId(): organizationIdを取得
// getUserInfo(): userオブジェクト全体を取得
// setUserInfo(): userオブジェクトを保存
// clearUserInfo(): userオブジェクトをクリア
```

2. **Axios Interceptor**
```typescript
// リクエスト送信前にorganizationIdヘッダーを自動設定
apiClient.interceptors.request.use((config) => {
  const organizationId = getOrganizationId();
  if (organizationId) {
    config.headers['X-Organization-Id'] = organizationId;
  }
  return config;
});
```

3. **型定義**
```typescript
export interface SessionUserInfo {
  id: string;
  username: string;
  displayName: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: string;
}
```

### セキュリティ考慮事項
- [ ] SessionStorageは同一タブ内でのみ有効（セキュリティ面で適切）
- [ ] 機密情報（パスワード等）は保存しない
- [ ] ログアウト時に確実にクリアする

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| SessionStorageにデータが保存されない | 高 | 低 | エラーハンドリングとログ出力を追加 |
| organizationIdが取得できない | 高 | 低 | デフォルト値またはエラー処理を実装 |
| 既存のAPI呼び出しに影響 | 中 | 低 | 段階的に実装し、各ステップで動作確認 |
| 型定義の不整合 | 低 | 中 | バックエンドの型定義と照合 |

## 7. テスト計画

### ユニットテスト
- [ ] sessionStorageHelper.tsの各関数
- [ ] getOrganizationId()の正常系・異常系

### 統合テスト
- [ ] ログイン→PIN検証→SessionStorage保存
- [ ] API呼び出し時のヘッダー設定
- [ ] ログアウト時のSessionStorageクリア

### 手動テスト
- [ ] ログイン〜ログアウトの一連の流れ
- [ ] ブラウザ開発者ツールでSessionStorageの内容を確認
- [ ] ブラウザ開発者ツールでリクエストヘッダーを確認
- [ ] 複数タブでの動作確認

## 8. ロールバック計画

問題が発生した場合:
1. 修正したファイルを元に戻す
2. 新規作成したファイルを削除
3. Gitで該当コミットをrevert

## 9. 関連ドキュメント

- [バックエンド規約](../../.clinerules/development/backend.md) - organization_idの扱い
- [セキュリティ規約](../../.clinerules/development/security.md) - マルチテナント分離
- [API設計規約](../../.clinerules/development/api.md) - X-Organization-Idヘッダー

## 10. 承認記録

- **計画書提示日時**: 2026-01-26 09:24
- **承認日時**: 2026-01-26 09:27
- **承認者コメント**: 承認して実装を開始

## 11. 実施記録

### 実施日時
開始: 2026-01-26 09:27
完了: 2026-01-26 09:29

### 計画からの変更点
- VerifyPinResponseDataの構造に合わせて、sessionTokenではなくsession.tokenを使用するように修正

### 発生した問題と解決方法
**問題**: authService.tsで型エラーが発生
- `data.sessionToken`が`VerifyPinResponseData`型に存在しないエラー
- 原因: 型定義では`session.token`という構造になっていた

**解決方法**:
- `data.session?.token`に修正して型エラーを解消

### 最終的な成果物
- [x] sessionStorageHelper.ts - 作成完了
- [x] session.ts（型定義） - 作成完了
- [x] authService.ts - 修正完了
- [ ] 動作確認 - ユーザーによる実機テストが必要

## 12. 振り返り

### うまくいった点
- SessionStorageのヘルパー関数を作成し、組織ID取得を一元化できた
- Axios Interceptorで全APIリクエストに自動的にorganizationIdヘッダーを設定できた
- 既存のSessionStorage操作を新しいヘルパー関数で統一できた
- サーバーサイドレンダリング対応（typeof window チェック）を実装できた

### 改善が必要な点
- 実機での動作確認が必要（ログイン→PIN検証→SessionStorage保存→API呼び出しの一連の流れ）
- エラーハンドリングのテストが必要
- 他のコンポーネントでgetOrganizationId()を活用する箇所があれば移行が必要

### 学んだこと
- SessionStorageとAxios Interceptorを組み合わせることで、マルチテナント対応の基盤を構築できた
- 型定義をしっかり確認することで、実装時の型エラーを早期に防げる
- SessionStorageはタブごとに独立しているため、セキュリティ面で適切
