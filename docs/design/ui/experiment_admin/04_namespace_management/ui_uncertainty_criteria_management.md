# 不確かさ基準管理 UI設計書

## メタデータ
- **画面名**: 不確かさ基準管理（不確かさ基準タブ）
- **物理名**: UncertaintyManagement.tsx（criteria タブ） / UncertaintyListTable.tsx
- **ファイルパス**:
  - `frontend/src/components/uncertainty/UncertaintyManagement.tsx`
  - `frontend/src/components/uncertainty/UncertaintyListTable.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-08-17
- **最終更新日**: 2026-08-25
- **担当者**: Development Team
- **バージョン**: 1.1.0

---

## 1. 画面概要

### 1.1. 目的

名前空間管理画面（`UncertaintyManagement`）内の**「不確かさ基準」タブ**です。
組織に登録されている不確かさ基準（定量・定性）の一覧表示・新規作成・編集・インポート・エクスポートを行います。

> 左ペイン（組織ツリー）の仕様は [`ui_namespace_main.md`](./ui_namespace_main.md) を参照してください。

### 1.2. 画面の位置づけ

`UncertaintyManagement` 右ペインには以下の3つのタブがあります。本設計書は**「不確かさ基準」タブ**を対象としています。

| タブ名 | コンポーネント | 備考 |
|--------|---------------|------|
| Prefix | `PrefixManagement` | 共有ボタン機能あり（`showShareButton=true`・`onShareSelected` 経由で `ShareScopeModal` を開く）|
| 用語管理 | `NamespaceMain`（hideTree モード）| |
| **不確かさ基準** | `UncertaintyListTable` ＋ 各モーダル | 本設計書の対象 |

### 1.3. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 閲覧・編集可 |
| `system_admin` | ✅ 閲覧・編集可 |
| `experiment_worker` | ❌ このタブは表示されない |

### 1.4. 主要機能

1. 不確かさ基準一覧の表示（全スコープ対象）
2. 評価方式（定量/定性）・状態（有効/廃止）・フリーテキストによるフィルタ
3. 新規不確かさ基準の作成（`UncertaintyCreateModal`）
4. 既存不確かさ基準の詳細表示・編集（`UncertaintyDetailModal`）
5. CSV インポート（`UncertaintyImportModal`）
6. 選択行の CSV エクスポート（`UncertaintyExportModal`）

---

## 2. 画面レイアウト（右ペイン：不確かさ基準タブ）

```
┌────────────────────────────────────────────────────────────────┐
│ タブバー: [Prefix] [用語管理] [不確かさ基準 ←選択中]            │
├────────────────────────────────────────────────────────────────┤
│ ツールバー                                                      │
│ [評価方式: 全て ▼] [状態: 全て ▼] [🔍 基準名・説明で検索...]   │
│                 [インポート] [エクスポート*] [+ 新規作成]        │
├────────────────────────────────────────────────────────────────┤
│ ☐ │ 基準名 / Key     │ 評価方式 │ xsi:type  │ 継承元  │ スコープ │
│   │ 説明             │ バージョン│ 状態      │ 操作    │          │
│───┼──────────────────┼──────────┼───────────┼─────────┼──────────│
│ ☐ │ 温度不確かさ基準  │ [定量]   │ floatType │ —       │ 開発部   │
│   │ thermo-uc-001    │          │           │         │          │
│───┼──────────────────┼──────────┼───────────┼─────────┼──────────│
│ ☐ │ 観察者評価基準   │ [定性]    │ —         │thermo-uc│ TeamA    │
│   │ obs-qual-002     │          │           │         │          │
└────────────────────────────────────────────────────────────────┘
                                 全N件  1-20件  20件/ページ ▼
```

*エクスポートは行選択時のみ活性

---

## 3. ツールバー

| 要素 | 説明 | 備考 |
|------|------|------|
| 評価方式フィルター | 定量 / 定性 で絞り込む Select | クリア可（全て表示） |
| 状態フィルター | 有効 / 廃止 で絞り込む Select | クリア可（全て表示） |
| 検索欄 | 基準名 / Key / 説明 でリアルタイムフィルタ | SearchOutlined アイコン付き |
| インポート | `UncertaintyImportModal` を開く | 常時活性 |
| エクスポート | `UncertaintyExportModal` を開く | **行選択時のみ活性** |
| + 新規作成 | `UncertaintyCreateModal` を開く | 常時活性 |

---

## 4. テーブルカラム定義

| カラム | キー | 説明 | 備考 |
|--------|------|------|------|
| （チェックボックス） | — | 行選択 | エクスポート対象の選択に使用 |
| 基準名 / Key | `name` / `key` | 上段：基準名（太字）、下段：Key（モノスペース・灰色）| ソート可（名前で） |
| 評価方式 | `eval` | 定量（blue Tag）/ 定性（purple Tag）| ソート可 |
| xsi:type | `type` | 推奨 xsi:type（モノスペース Tag）| 定性の場合は「—」。ソート可 |
| 継承元 | `extends` | 親基準の名称（上段）＋ Key（下段）| なければ「—」。ソート可 |
| スコープ | `scope` | スコープパス最末尾ノードを Tag 表示。全パスは Tooltip | ソート可 |
| 説明 | `desc` | 説明文（省略表示・Tooltip）| ソート可 |
| バージョン | `version` | バージョン番号（`V1` 形式 Tag）| ソート可 |
| 状態 | `status` | 有効（green Tag）/ 廃止（gray Tag）| ソート可 |
| 操作 | — | 編集ボタン（EditOutlined）| 廃止（deprecated）の場合は非活性 |

---

## 5. 子コンポーネント（モーダル群）

| コンポーネント | 用途 | 開くトリガー |
|--------------|------|------------|
| `UncertaintyDetailModal` | 詳細表示・バージョン別比較・編集 | 操作列「編集」ボタン |
| `UncertaintyCreateModal` | 新規不確かさ基準の作成 | ツールバー「+ 新規作成」ボタン |
| `UncertaintyImportModal` | CSV インポート | ツールバー「インポート」ボタン |
| `UncertaintyExportModal` | 選択行の CSV エクスポート | ツールバー「エクスポート」ボタン（行選択時のみ）|

---

## 6. UncertaintyTemplate 型定義

```typescript
interface UncertaintyTemplate {
  id: number;
  name: string;                          // 基準名
  key: string;                           // 一意キー（例: thermo-uc-001）
  scope: string;                         // スコープパス（例: "開発部 › TeamA"）
  eval: 'quantitative' | 'qualitative';  // 評価方式
  type: string;                          // xsi:type（定性は空文字）
  desc: string;                          // 説明文
  version: string;                       // バージョン（例: v1）
  status: 'active' | 'deprecated';       // 状態
  units: string;                         // 単位
  format: string;                        // フォーマット文字列
  validFrom: string;                     // 有効期間開始
  validTo: string;                       // 有効期間終了
  extends: string;                       // 継承元 Key
}
```

---

## 7. API 連携

| API | 用途 |
|-----|------|
| `GET /api/v1/uncertainty-criteria` | 不確かさ基準一覧取得（`fetchUncertaintyCriteriaList`）|
| `GET /api/v1/uncertainty-criteria/:key/:version` | 特定バージョンの詳細取得（`fetchUncertaintyCriteriaDetail`）|
| `POST /api/v1/uncertainty-criteria` | 新規作成（`saveUncertaintyCriteriaNewVersion`）|
| `PUT /api/v1/uncertainty-criteria/:key` | 新バージョン保存（`saveUncertaintyCriteriaNewVersion`）|
| `POST /api/v1/namespaces/prefixes/share` | Prefix タブの共有機能：選択した Prefix を別スコープへコピー（`sharePrefixes`）|

---

## 8. 保存後の画面更新

| 操作 | 一覧自動更新 |
|------|------------|
| 新規作成保存（`UncertaintyCreateModal` の `onSaved`） | ✅ `fetchUncertaintyCriteriaList` を再実行 |
| 編集保存（`UncertaintyDetailModal` の `onSaved`） | ✅ `fetchUncertaintyCriteriaList` を再実行 |
| CSV インポート（`UncertaintyImportModal` の `onClose`） | ❌ 一覧の自動再取得は行われない。インポート後に最新データを反映するにはページリロードが必要 |

```
新規作成・編集保存成功 → setTemplates(最新データ) → テーブル自動更新
CSVインポート完了      → モーダルを閉じるのみ（一覧は再取得されない）
```

---

## 9. Prefixタブ 共有機能（ShareScopeModal）

### 9.1. 概要

Prefixタブの共有ボタン（`PrefixManagement` → `onShareSelected` コールバック）から呼び出されるPrefix共有機能。
選択した Prefix を別スコープ（組織グループ・Personal）にコピーする。

### 9.2. データフロー

```
[PrefixManagement] チェックボックス選択 → 共有ボタンクリック
  → onShareSelected(selectedRowKeys)
    → [UncertaintyManagement] handleShareSelected
      → selectedPrefixKeys に保存
      → shareScopeOpen = true
        → [ShareScopeModal] 表示
          → ツリーから共有先を選択して「共有する」クリック
            → sharePrefixes(selectedPrefixKeys, target.key)
              → POST /api/v1/namespaces/prefixes/share
                → 成功: 成功トーストを表示・モーダルを閉じる
                → 失敗: エラートーストを表示
```

### 9.3. ShareScopeModal への Props

| Prop | 値 |
|------|----|
| `open` | `shareScopeOpen` |
| `termCount` | `selectedPrefixKeys.length` |
| `sourceRole` | `{ kind: 'sys_admin' }` 固定（全ノード選択可）|
| `scopeNodes` | `shareScopeNodes`（Global ノードを除いた組織ツリー + Personal ノード）|
| `onClose` | `() => setShareScopeOpen(false)` |
| `onShare` | `async (target) => sharePrefixes(selectedPrefixKeys, target.key)` |

### 9.4. API仕様（POST /api/v1/namespaces/prefixes/share）

**リクエスト:**
```json
{
  "prefixKeys": ["CorpA", "LabA"],
  "targetScopeKey": "rd-analysis"
}
```

**レスポンス:**
```json
{
  "copiedCount": 2,
  "skippedCount": 0
}
```

- 同一スコープに既に同じ Prefix が存在する場合は `skippedCount` にカウントされ、重複はスキップ（`ON CONFLICT DO NOTHING`）
- 対象スコープに `namespace` レコードが存在しない場合はエラー（`E6001`）

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.1.0 | 2026-08-25 | §1.2: Prefixタブに共有ボタン機能あり（`showShareButton=true`）を追記。§7: `POST /api/v1/namespaces/prefixes/share` API を追加。§9: Prefixタブ共有機能セクション新規追加（データフロー・ShareScopeModal Props・API仕様） | Cline |
| 1.0.0 | 2026-08-17 | 初版作成 | Development Team |
