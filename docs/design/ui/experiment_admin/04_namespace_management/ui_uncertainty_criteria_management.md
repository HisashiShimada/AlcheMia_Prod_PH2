# 不確かさ基準管理 UI設計書

## メタデータ
- **画面名**: 不確かさ基準管理（不確かさ基準タブ）
- **物理名**: UncertaintyManagement.tsx（criteria タブ） / UncertaintyListTable.tsx
- **ファイルパス**:
  - `frontend/src/components/uncertainty/UncertaintyManagement.tsx`
  - `frontend/src/components/uncertainty/UncertaintyListTable.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-08-17
- **最終更新日**: 2026-09-08
- **担当者**: Development Team
- **バージョン**: 1.2.0

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

### 1.5. UncertaintyManagement Props

| Prop | 型 | 説明 |
|------|----|------|
| `user` | `User` (optional) | ログイン中ユーザー情報。Personal ノード表示や権限判定に使用 |
| `tabActivatedAt` | `number` (optional) | タブ4（名前空間管理）がアクティブになった時刻（ms）。値の変化をトリガーとして組織ツリーを再取得する。`undefined` の場合はスキップ |

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
│ ☐ │ 基準名 / Key     │ 評価方式 │ xsi:type  │ スコープ │ 説明 │
│   │                  │ バージョン│ 状態      │ 操作    │      │
│───┼──────────────────┼──────────┼───────────┼─────────┼──────│
│ ☐ │ 温度不確かさ基準  │ [定量]   │ floatType │ 開発部   │ ... │
│   │ thermo-uc-001    │          │           │         │      │
│───┼──────────────────┼──────────┼───────────┼─────────┼──────│
│ ☐ │ 観察者評価基準   │ [定性]    │ —         │ TeamA   │ ... │
│   │ obs-qual-002     │          │           │         │      │
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

### 5.1. UncertaintyCreateModal Props

| Prop | 型 | 説明 |
|------|----|------|
| `open` | `boolean` | モーダル表示フラグ |
| `allCriteria` | `UncertaintyTemplate[]` | 継承元不確かさ基準の選択肢生成に使用 |
| `selectedNsKey` | `string \| null` (optional) | 左ペインで選択中のスコープキー。Key属性設定プルダウンの用語絞り込みに使用 |
| `onClose` | `() => void` | 閉じるコールバック |
| `onSaved` | `() => void` (optional) | 保存成功時コールバック（一覧再取得などに使用） |

### 5.2. UncertaintyDetailModal Props

| Prop | 型 | 説明 |
|------|----|------|
| `open` | `boolean` | モーダル表示フラグ |
| `template` | `UncertaintyTemplate \| null` | 編集対象の不確かさ基準 |
| `isLatestVersion` | `boolean` | 最新バージョンかどうか（`true` のみ廃止切替操作が可能） |
| `allCriteria` | `UncertaintyTemplate[]` | 継承元不確かさ基準の選択肢生成に使用 |
| `onClose` | `() => void` | 閉じるコールバック |
| `onSaved` | `() => void` (optional) | 保存成功時コールバック（一覧再取得などに使用） |

---

## 6. UncertaintyTemplate 型定義

```typescript
export interface UncertaintyTemplate {
  id: number;
  name: string;                          // 基準名（uncertainty_name）
  key: string;                           // 一意キー（例: thermo-uc-001）
  scope: string;                         // スコープパス（nameSpaceId をそのまま使用）
  eval: 'quantitative' | 'qualitative';  // 評価方式
  type: string;                          // xsi:type（定性は空文字）
  desc: string;                          // 説明文
  version: string;                       // バージョン（例: V1）
  status: 'active' | 'deprecated';       // 状態（is_Invalid の反転）
  units: string;                         // 単位
  format: string;                        // フォーマット文字列（format_string）
  validFrom: string;                     // 有効期間開始（DBにカラムなし・空文字固定）
  validTo: string;                       // 有効期間終了（DBにカラムなし・空文字固定）
  extends: string;                       // 継承元 Key（inheritance_uncertainty_key）
  /** 名前空間の表示名（namespace_term.display_name） */
  termDisplayName: string | null;
  /** 許容上限値（手入力値の良好/不良判定用。NULL=判定なし） */
  toleranceUpper: number | null;
  /** 許容下限値（手入力値の良好/不良判定用。NULL=判定なし） */
  toleranceLower: number | null;
}
```

---

## 7. API 連携

| API | 用途 |
|-----|------|
| `GET /api/v1/uncertainty-criteria` | 不確かさ基準一覧取得（`fetchUncertaintyCriteriaList`）。クエリ: `scopeKey?`（organization_group_cd またはユーザーID。省略時は全件） |
| `GET /api/v1/uncertainty-criteria/for-selector` | セレクター用一覧取得（`fetchUncertaintyCriteriaForSelector`）。有効（is_Invalid=FALSE）なレコードのみ・定性評価の選択肢も含む |
| `GET /api/v1/uncertainty-criteria/:uncertaintyKey?version=:version` | 特定バージョンの詳細取得（`fetchUncertaintyCriteriaDetail`）。定性評価の場合は intuition_selector の選択肢も含む |
| `POST /api/v1/uncertainty-criteria` | 新規作成・新バージョン保存（`saveUncertaintyCriteriaNewVersion`）。同一 uncertaintyKey の MAX(version)+1 で新規 INSERT |
| `POST /api/v1/namespaces/prefixes/share` | Prefix タブの共有機能：選択した Prefix を別スコープへコピー（`sharePrefixes`）|

### 7.1. POST /api/v1/uncertainty-criteria リクエスト

| フィールド | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `nameSpaceId` | string | ✅ | 名前空間 ID |
| `uncertaintyKey` | string | ✅ | 不確かさ基準キー |
| `evaluationMethod` | number | ✅ | 1: 定量 / 2: 定性 |
| `uncertaintyName` | string | — | 不確かさ基準名 |
| `isInvalid` | boolean | — | true: 廃止 / false: 有効 |
| `inheritanceUncertaintyKey` | string \| null | — | 継承元キー |
| `xsiType` | string \| null | — | xsi:type（定量時） |
| `units` | string \| null | — | 単位（定量時） |
| `scaleFactor` | string \| null | — | 倍率（定量時） |
| `formatString` | string \| null | — | フォーマット文字列（定量時） |
| `toleranceUpper` | number \| null | — | 許容上限値（定量時） |
| `toleranceLower` | number \| null | — | 許容下限値（定量時） |
| `description` | string \| null | — | 説明文 |
| `qualitativeOptions` | array | — | 定性評価の選択肢（定性時）|

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
            → sharePrefixes(selectedPrefixKeys, targetScopeKey)
              → POST /api/v1/namespaces/prefixes/share
                → 成功: 成功トーストを表示・モーダルを閉じる
                → 失敗: エラートーストを表示
```

### 9.3. ShareScopeModal への Props

| Prop | 値 |
|------|----|
| `open` | `shareScopeOpen` |
| `shareItems` | `selectedPrefixKeys.map((k) => ({ id: k, label: k }))` |
| `onClose` | `() => setShareScopeOpen(false)` |
| `onShare` | `async (selectedItemIds: string[]) => sharePrefixes(selectedItemIds, targetScopeKey)` |

> `targetScopeKey` は `selectedNsKey` から `personal-` プレフィックスを除去した値（`selectedNsKey.replace(/^personal-/, '')`）。

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
| 1.2.0 | 2026-09-08 | §4: 「継承元」カラムを削除（実装と相違）。§6: `UncertaintyTemplate` に `termDisplayName`・`toleranceUpper`・`toleranceLower` を追記。§7: 詳細取得APIのURLを `?version=` クエリパラメータ形式に修正、`PUT` 行を削除、`GET /for-selector` を追加。§7.1: POST リクエストフィールド一覧を追加。§1.5: `UncertaintyManagement` Props 表を追加。§5.1/5.2: 子コンポーネント Props 詳細を追加。§9.3: `ShareScopeModal` Props を実装の `shareItems` 形式に修正 | Cline |
| 1.1.0 | 2026-08-25 | §1.2: Prefixタブに共有ボタン機能あり（`showShareButton=true`）を追記。§7: `POST /api/v1/namespaces/prefixes/share` API を追加。§9: Prefixタブ共有機能セクション新規追加（データフロー・ShareScopeModal Props・API仕様） | Cline |
| 1.0.0 | 2026-08-17 | 初版作成 | Development Team |
