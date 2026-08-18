# タスク計画書: 用語管理コンポーネント新規作成

## メタデータ
- **作成日時**: 2026-07-16 09:00
- **タスクID**: 20260716_0900_用語管理コンポーネント新規作成
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

プロバイダーメニュー「名前空間管理（グローバル）」タブ内の「用語管理」サブタブに、
グローバル用語の追加・編集・削除が行える専用コンポーネント `TermManagement.tsx` を新規作成する。

現在は `<NamespaceMain globalOnly={true} />` が使われているが、NamespaceMain は実験管理者向けの
複雑なコンポーネント（1675行）であり、グローバル用語管理に不要な機能（ツリー表示・チーム管理・
共有機能など）が多く含まれているため、専用のシンプルなコンポーネントに差し替える。

## 目的と期待される成果

### 目的
- グローバル用語をProvider権限のユーザーがDBに登録・管理できるようにする
- PrefixManagement と同様のシンプルなインライン追加UI を提供する

### 期待される成果
- [ ] `TermManagement.tsx` の新規作成（インライン追加・編集・アクティブ切替・CSV入出力）
- [ ] グローバルPrefixをAPIから取得してセレクト選択肢に使用
- [ ] `namespaceApiService` に `createTerm` / `getTermList` を整備
- [ ] ProviderMenu の「用語管理」タブを `TermManagement` に差し替え

## 実装ステップ

### Phase 1: namespaceApiService の整備確認
- [ ] `createTerm()` 関数の有無確認・なければ追加
- [ ] `getTermList()` 関数の有無確認・なければ追加
- [ ] `TermManagementProps` 型定義を `namespace.ts` に追加

### Phase 2: TermManagement.tsx 新規作成
- [ ] `frontend/src/components/namespace/TermManagement.tsx` を作成
- [ ] 初期ロード: `getNamespaceList()` でPrefixリスト取得、`getTermList()` で用語リスト取得
- [ ] 「用語を追加」ボタン → 空行を末尾に追加（黄色背景）
- [ ] 各行入力フィールド: Prefix(Select) / ローカル名 / 表示名 / 説明 / 型(Select) / 単位
- [ ] 「保存」ボタン → `createTerm()` で一括POST → 成功行を一覧に追加
- [ ] 「キャンセル」ボタン → 追加行を全削除
- [ ] 既存行の「編集」ボタン → インライン編集（`updateTerm()`）
- [ ] 「アクティブ/非アクティブ」切替ボタン → 確認ダイアログ付き
- [ ] CSVエクスポート（選択行）
- [ ] CSVインポート → `createTerm()` で一括保存
- [ ] 検索フィルター（テキスト・Prefix・型）
- [ ] `viewOnly` prop: 追加・編集・削除ボタンを非活性
- [ ] `globalOnly` prop: 将来拡張用（現時点は常にtrue想定）

### Phase 3: ProviderMenu の差し替え
- [ ] `ProviderMenu.tsx` の `NamespaceMain` import を `TermManagement` に変更
- [ ] `<NamespaceMain globalOnly={true} />` を `<TermManagement globalOnly={true} />` に変更

## 変更ファイル

### 修正
1. `frontend/src/services/namespaceApiService.ts` - `createTerm` / `getTermList` 追加（なければ）
2. `frontend/src/types/namespace.ts` - `TermManagementProps` 型定義追加
3. `frontend/src/components/menus/ProviderMenu.tsx` - TermManagement に差し替え

### 新規作成
1. `frontend/src/components/namespace/TermManagement.tsx` - 用語管理コンポーネント

## DB・APIの確認

### namespace_term テーブル（参照）
| カラム | 型 | 説明 |
|---|---|---|
| organization_id | UUID | 組織ID (PK) |
| namespace_id | VARCHAR(20) | 名前空間ID (PK) |
| prefix | VARCHAR(255) | Prefix (PK) |
| localname | VARCHAR(255) | ローカル名 (PK) |
| units | VARCHAR(20) | 単位 |
| xsi_type | VARCHAR(20) | 型ヒント |
| is_active | BOOLEAN | アクティブ判定 |
| display_name | VARCHAR(255) | 表示名 |
| description | TEXT | 説明 |

### 使用するAPIエンドポイント
- `GET /api/v1/namespaces` → Prefix一覧取得（`getNamespaceList()`）
- `GET /api/v1/namespaces/terms` → 用語一覧取得
- `POST /api/v1/namespaces/terms` → 用語作成
- `PUT /api/v1/namespaces/terms/:id` → 用語更新（既存）

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| getTermList APIが未実装 | 中 | 中 | エラー時は空配列でフォールバック |
| createTerm APIが未実装 | 高 | 低 | namespaceApiServiceに追加済みの確認 |

## 承認記録
- **計画書提示日時**: 2026-07-16 09:00
- **承認日時**: 2026-07-16 08:44
