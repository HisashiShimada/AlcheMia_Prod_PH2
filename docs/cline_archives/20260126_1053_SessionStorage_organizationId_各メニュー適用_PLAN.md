# タスク計画書: SessionStorage organizationId 各メニュー適用

## メタデータ
- **作成日時**: 2026-01-26 10:53
- **タスクID**: SessionStorage_organizationId_各メニュー適用
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

プロバイダーメニュー、システム管理メニュー、データ管理メニューの各タブに遷移する際に、SessionStorageからログインユーザーのorganization_id（組織ID）を取得し、それをバックエンドにパラメータとして渡してレスポンスを受けるようにする。

## 2. 目的と期待される成果

### 目的
- ハードコーディングされたorganization_idを排除
- ログインユーザーの組織IDを動的に取得
- マルチテナント分離の徹底

### 期待される成果
- [x] SessionStorageから組織IDを取得する機能の実装
- [ ] プロバイダーメニュー配下の各コンポーネントの修正
- [ ] システム管理メニュー配下の各コンポーネントの修正
- [ ] データ管理メニュー配下の各コンポーネントの修正
- [ ] すべてのAPI呼び出しで組織IDがパラメータとして渡される

## 3. 実装ステップ

### Phase 1: 現状分析
- [x] ProviderMenuの確認
- [ ] SystemAdminMenuの確認
- [ ] DataAdminMenuの確認
- [ ] 各子コンポーネントでのorganization_id使用箇所の特定

### Phase 2: プロバイダーメニュー配下の修正
- [ ] CompanyManagement.tsxの修正
  - fetchCorporations()でgetOrganizationId()を使用
- [ ] OrganizationManagement.tsxの修正
  - fetchOrganizations()でgetOrganizationId()を使用

### Phase 3: システム管理メニュー配下の修正
- [ ] 各コンポーネントでorganization_idが必要な箇所を特定
- [ ] API呼び出し時にgetOrganizationId()を使用

### Phase 4: データ管理メニュー配下の修正
- [ ] MasterManagement.tsxの修正
  - 全マスタAPI呼び出しでgetOrganizationId()を使用
  - ハードコーディングされた`{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}`を削除

### Phase 5: 動作確認
- [ ] 各メニュータブでのAPI呼び出し確認
- [ ] 組織IDが正しく渡されているか確認
- [ ] エラーハンドリングの確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/Provider/CompanyManagement.tsx`
2. `frontend/src/components/Provider/OrganizationManagement.tsx`
3. `frontend/src/components/Provider/InformationDownload.tsx`
4. `frontend/src/components/SystemManagement/*.tsx` (必要に応じて)
5. `frontend/src/components/DataManagement/MasterManagement.tsx`

### 影響を受ける機能
- プロバイダーメニューの全機能
- システム管理メニューの全機能
- データ管理メニューの全機能

## 5. 技術的詳細

### 使用する関数
```typescript
import { getOrganizationId } from '@/utils/sessionStorageHelper';

// API呼び出し時
const organizationId = getOrganizationId();
if (!organizationId) {
  message.error('組織IDが取得できません');
  return;
}

// バックエンドへのリクエスト
const response = await axios.get(`/api/v1/master/department`, {
  params: { organization_id: organizationId }
});
```

### 共通パターン
1. コンポーネントマウント時またはタブ切替時にgetOrganizationId()を呼び出し
2. 組織IDが取得できない場合はエラーメッセージを表示
3. 取得した組織IDをAPI呼び出しのパラメータとして使用

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| SessionStorageに組織IDが保存されていない | 高 | 低 | エラーメッセージを表示してログイン画面に戻る |
| APIパラメータの形式が不正 | 中 | 低 | バックエンドでバリデーション実施 |
| 既存のハードコーディング箇所の見落とし | 中 | 中 | 全ファイルを検索して確認 |

## 7. テスト計画

### 手動テスト
- [ ] プロバイダーメニュー - 会社管理タブ
  - 会社一覧が正しく表示される
  - 組織IDが正しくバックエンドに渡される
- [ ] プロバイダーメニュー - 組織管理タブ
  - 組織一覧が正しく表示される
  - 組織IDが正しくバックエンドに渡される
- [ ] データ管理メニュー - マスタ管理タブ
  - 各マスタデータが正しく表示される
  - 組織IDが正しくバックエンドに渡される
- [ ] 開発者ツールでネットワークタブを確認
  - リクエストパラメータに組織IDが含まれている

### エラーケース
- [ ] SessionStorageに組織IDがない場合
  - 適切なエラーメッセージが表示される
- [ ] バックエンドが404エラーを返す場合
  - ユーザーフレンドリーなエラーメッセージが表示される

## 8. ロールバック計画

問題が発生した場合は、ハードコーディングされた組織IDに戻す。

## 9. 関連ドキュメント

- [SessionStorage organizationId取得機能実装](./20260126_0924_SessionStorage_organizationId取得機能実装_PLAN.md)
- [バックエンド規約](../.clinerules/development/backend.md)
- [セキュリティ規約](../.clinerules/development/security.md)

## 10. 承認記録

- **計画書提示日時**: 2026-01-26 10:53
- **承認日時**: （承認待ち）
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
開始: 2026-01-26 10:53
完了: （未完了）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）

### 最終的な成果物
（実施後に記録）

## 12. 振り返り

### うまくいった点
（実施後に記録）

### 改善が必要な点
（実施後に記録）

### 学んだこと
（実施後に記録）