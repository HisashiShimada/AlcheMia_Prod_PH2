# タスク計画書: 用語管理機能実装・重複チェック

## メタデータ
- **作成日時**: 2026-07-30 09:41
- **タスクID**: 用語管理機能実装・重複チェック
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

名前空間管理タブの用語登録（TermManagement）画面に対して、以下を実施する。

1. 調査レポートで特定された未実装・不具合の修正（型キャスト解消・グレーアウト・DuplicateSuggestModal接続）
2. 用語新規追加時の重複チェック実装（完全一致エラー・同名別prefix警告）
3. 重複チェックのスコープ対応（上位層/自分自身の名前空間に限定）

## 目的と期待される成果

- [ ] 型キャスト解消（`isActive` の不要なキャストを修正）
- [ ] 非アクティブ用語のグレーアウト表示
- [ ] DuplicateSuggestModal の接続（409 Conflict 時の重複候補提示）
- [ ] 用語新規追加時の完全一致チェック（同じ `prefix:用語` があればエラー → 登録不可）
- [ ] 用語新規追加時の同名別prefix チェック（prefix 違い・同じ用語名があれば警告 → 確認後続行）
- [ ] 重複チェックのスコープを「上位層（グローバル）と自分自身の名前空間」に限定

## 現状分析

### フロントエンド（既実装）

`TermManagement.tsx` の `handleSave()` L230-294 に以下のクライアントサイドチェックが既に実装済み：
- **完全一致チェック**（L232-256）: `prefix === row.prefix && localName === row.localName` → `Modal.error`
- **同名別prefix チェック**（L259-294）: `localName === row.localName && prefix !== row.prefix` → `Modal.confirm`

### バックエンド（修正済み）

`namespaceTermRepository.create()` に重複チェックを追加済み：
- INSERT 前に `findTermByKey.sql` で既存確認
- 重複時 `statusCode: 409 / code: E6005` のエラーをスロー
- `errorHandlerMiddleware.ts` が `err.statusCode` を参照して HTTP 409 を返す

### 残課題：スコープを「上位層/自分自身の名前空間」に絞る必要がある

現在の `terms` ステートは `findAllByOrganization.sql` で組織内の全用語を返しているが、
チェック対象は以下に限定すべき：
- **グローバル名前空間（global_flg = TRUE）** = 上位層
- **ログインユーザーの所属チーム名前空間（scope_key = user の org_group_cd）** = 自分自身

## 実装ステップ

### Phase 1: 型キャスト解消
- [ ] `TermManagement.tsx` L582 の不要な型キャストを除去

### Phase 2: 非アクティブ行のグレーアウト
- [ ] `rowClassName` に非アクティブ行の判定を追加
- [ ] CSS に `.row-inactive-term` スタイルを追加

### Phase 3: DuplicateSuggestModal 接続
- [ ] `DuplicateSuggestModal` を import
- [ ] モーダル制御ステート追加
- [ ] `handleSave` の catch で 409 を検知してモーダル表示
- [ ] CSV インポートの catch でも同様に対応
- [ ] `onConfirm` で選択 prefix で再登録する処理を実装

### Phase 4: 重複チェック・スコープ対応
- [ ] `findNamespacesByOrganization.sql` の SELECT に `global_flg` カラムを追加
- [ ] `NamespaceEntry` 型に `isGlobal?: boolean` / `scopeKey?: string` を追加
- [ ] `TermManagement.tsx` に `accessiblePrefixes` ステートを追加（グローバル + 自チーム prefix のセット）
- [ ] `handleSave()` の重複チェックを `accessiblePrefixes` でフィルタリング
- [ ] 多言語キー（`duplicateErrorTitle` 等）を `ja.json` / `en.json` に追加

## 実装方針（重複チェックのスコープ対応）

`getNamespaceList()` が返す `NamespaceEntry[]` に `isGlobal` / `scopeKey` が含まれているか確認し、
`prefixScopeMap` を活用して「アクセス可能な prefix の用語」に絞ってチェックを実施する。

具体的には：
1. `getNamespaceList()` レスポンスに `isGlobal` フラグを追加（バックエンド）
2. フロントエンドで `accessiblePrefixes` セット（グローバル + 自チーム prefix）を構築
3. 重複チェックを `accessiblePrefixes` 内の用語のみを対象にフィルタリング

## 変更ファイル

### バックエンド
1. `backend/src/sql/queries/namespace_terms/findNamespacesByOrganization.sql` - `global_flg` カラムを SELECT に追加

### フロントエンド
1. `frontend/src/components/namespace/TermManagement.tsx` - 型キャスト解消・グレーアウト・DuplicateSuggestModal接続・重複チェックのスコープフィルタリング
2. `frontend/src/utils/namespaceInjector.ts`（または `frontend/src/types/namespace.ts`） - `NamespaceEntry` 型に `isGlobal?: boolean` / `scopeKey?: string` を追加
3. `frontend/src/locales/ja.json` - `duplicateErrorTitle` キー追加
4. `frontend/src/locales/en.json` - `duplicateErrorTitle` キー追加

## リスク

| リスク | 対策 |
|--------|------|
| DuplicateSuggestModal の `entries` / `onConfirm` の型がAPIレスポンスと合わない | モーダルの型定義を確認してから実装 |
| `accessiblePrefixes` の構築でユーザーの所属グループ取得タイミングがずれる | NamespaceMain.tsx から props で受け取る形にするか、API で取得するか確認 |

## 承認記録
- **計画書提示日時**: 2026-07-30 09:41
- **承認日時**: 2026-07-30 09:41（即時実施）

## 追加修正記録（2026-07-31）

### 修正①: NamespaceMain.tsx [object Object] バグ
- **状態**: 調査の結果、すでに修正済みであることを確認（783-788行目）
- `typeof (err as any)?.response?.data?.error === 'string'` による型チェックが実装済み

### 修正②: scopeName 伝搬バグ（backend 型定義の欠落）
- **根本原因**: `findNamespacesByOrganization` の SQL は `scope_name` を返しているが、Repository / Service の戻り値型が `{ prefix, uri }` のみで `scopeName` を欠落
- **修正ファイル**:
  - `backend/src/repositories/namespaceTermRepository.ts` — `findNamespacesByOrganization` の戻り値型に `scopeKey?: string; scopeName?: string` を追加
  - `backend/src/services/namespaceService.ts` — `getNamespaces` の戻り値型に同様に追加
- **効果**: フロントエンドの `prefixScopeMap` がスコープ名を正しく受け取り、TermManagement のスコープ列に表示される

## 実施記録

### 実施日時
開始: 2026-07-30 09:41
完了: 2026-07-30 09:49

### 変更ファイル
1. `frontend/src/components/namespace/TermManagement.tsx`

### 実施内容

#### 修正①: 型キャスト解消
- `toggleTermActive` の `isActive` 参照箇所で `(r as NamespaceTermRow & { isActive?: boolean }).isActive` という不要な二重キャストを `r.isActive` に修正

#### 修正②: 非アクティブ行グレーアウト
- `rowClassName` に `r.isActive === false` の判定を追加し `row-inactive-term` クラスを付与
- CSS に `.row-inactive-term td { color: #bbb; background: #f5f5f5; }` と `.ant-tag { opacity: 0.5; }` を追加

#### 修正③: DuplicateSuggestModal 接続
- `DuplicateSuggestModal` と `DuplicateTermEntry` を import
- `duplicateModalOpen` / `duplicateEntries` ステートを追加
- `handleDuplicateConfirm` を実装（選択された prefix で再登録）
- `handleSave` の catch で HTTP 409 + `error.details.candidates` を検知し、重複エントリをモーダルで提示
- JSX に `<DuplicateSuggestModal>` を追加
