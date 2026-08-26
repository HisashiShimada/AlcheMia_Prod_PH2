# MaiML 名前空間管理ツール メイン画面 UI設計書

## メタデータ
---
title: MaiML 名前空間管理ツール メイン画面 UI設計書
category: UI設計
version: 2.6.0
last_updated: 2026-08-26
author: Development Team
tags: [namespace, maiml, main, 2pane, term-list, import-export, bulk-inactive, pagination, context-menu, cancel-button, api-fetch, share-scope-modal, tabs, group-management, filter-bar, department-tree-management, duplicate-suggest-modal]
---

## 変更履歴
| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 2026-08-26 | v2.5.0 | チーム→グループ表記統一（GroupAddDialog / GroupEditDialog / GroupManagementPanel / GroupMember / Group 型）。§3.2.2 NewTermRow に `createDirectiveTerm` 追加。§4.3.3 用語テーブルに「指示用語同時登録」チェックボックス列追加・操作列「指示あり」バッジ追記。§3.2.3 Term 型に `hasDirectiveTerm` 追加。§3.3 コンテキストメニュー判定を `companyDepth === 3` → `>= 2` に修正。API連携 用語登録に `createDirectiveTerm` / `scopeKey` パラメータ追記 | Cline |
| 1.0.0 | 2026-06-05 | 初版作成（3ペイン構成） |
| 1.1.0 | 2026-06-05 | 2ペイン構成に変更。詳細表示/XMLプレビューをモーダルダイアログ方式に変更 |
| 1.2.0 | 2026-06-05 | 左ペイン幅30%に拡大。詳細モーダルXMLプレビュータブ廃止。ボタン絵文字削除 |
| 1.3.0 | 2026-06-12 | 実装との差異を反映：インポート/エクスポート/一括削除ボタン追加、単位カラム追加、詳細ボタン削除、型選択肢修正、ヘッダーチェックボックス仕様追記、ページネーション追記、複数インライン行対応、ツリーコンテキストメニュー追記、Term型定義更新 |
| 1.4.0 | 2026-06-12 | 実装との差異を反映：左ペイン「名前空間を追加」ボタン削除、ツールバー「キャンセル」ボタン追加、インライン編集キャンセルボタン修正（✕→キャンセル）、削除確認モーダルボタン順追記、コンテキストメニュー表示条件修正、型定義更新（NamespaceNode/FlatNsNode/NewTermRow）、API連携セクション追加、保存バリデーション追記、CSVエクスポート仕様修正、モックデータソース修正 |
| 1.5.0 | 2026-06-18 | 実装との差異を反映：コンテキストメニューをチームノード専用に修正、型初期値を「未選択」に修正、エクスポート仕様修正（選択中の用語のみ）、7.1から「名前空間を追加」ボタンイベント削除、インライン編集キャンセルボタン記述修正、チーム追加/編集ダイアログセクション追加、API連携セクション追加 |
| 1.6.0 | 2026-06-23 | 実装との差異を反映：NewTermRow 型に `prefix` フィールドを追加 |
| 1.7.0 | 2026-06-29 | 「組織に共有」機能を追記：Personal 選択 + チェックあり時の右端ボタン表示仕様・共有先制限・確認モーダル仕様を追加。組織共有バーの背景色削除・右寄せ化を反映。用語Prefix・スコープ・型・単位フィルターセクション追加 |
| 1.8.0 | 2026-06-30 | サブタブ（用語管理 / チーム管理）追加：画面全体構造にタブを追記、チーム管理タブ（TeamManagementPanel）を新セクション12として追加、TeamAddDialog に名前空間Prefix・URI自動生成フィールドを追記、URI自動生成ユーティリティ（generateNamespaceUri）を追記 |
| 2.0.0 | 2026-07-02 | 実装との差異を反映：用語テーブルカラムを QName 単一列→Prefix+ローカル名+スコープの3列に分割、操作ボタンを「削除」→「非アクティブ/アクティブ」切替に変更、ツールバー一括操作も「削除」→「非アクティブ」に変更、セクション11「共有する」機能を ShareScopeModal（ツリー選択式）に全面書き換え、フィルターバー仕様追記、isActive フィールドを Term 型に追加 |
| 2.4.0 | 2026-07-15 | §3.2.2 `NewTermRow` 型に `_isDuplicate` フィールドを追加。§14.4 `PrefixRow` 型に `_isAncestor` フィールドを追加。§15 `DuplicateSuggestModal` コンポーネント仕様を新規追加。§16 非アクティブ確認ダイアログ仕様を新規追加。旧§15 更新履歴を§17に繰り下げ |
| 2.3.0 | 2026-07-15 | §2.2 タブ key='4' ラベル修正。§12.5 Team 型に departmentName 等追加。§14 PrefixManagement 仕様新規追加 |
| 2.2.0 | 2026-07-07 | §2.2 タブ構成修正。§13 DepartmentTreeManagement 新規追加 |
| 2.1.0 | 2026-07-07 | 実装との差異を反映：Section 11「共有する」ボタン表示条件を Personal 限定→チェック1件以上で常時表示に変更。Section 9（TeamAddDialog）追加先フィールドを Tag 読み取り専用→Select プルダウン選択に変更。Section 10（TeamEditDialog）タイトルを「編集」→「チームを編集」に変更、チーム名を編集可能な Input に変更、代表者フィールドを追加。Section 12（TeamManagementPanel）右ペインの編集ボタン位置をメンバーセクション右端→チーム名右隣に変更、所属先フィールドを追加、表示名フィールドを削除、メンバーテーブルの削除ボタン列を削除 |

## 関連ドキュメント
- [名前空間追加ダイアログ](ui_namespace_add_dialog.md)
- [MaiMLファイルエディター](ui_namespace_maiml_editor.md)

---

## 1. 画面概要

### 1.1. 目的

MaiML名前空間管理ツールのメイン画面。左ペイン（名前空間ツリー）・右ペイン（用語リスト）の2ペイン構成で、名前空間と用語を一元管理する。用語の詳細確認・XMLプレビューは、用語リストの「詳細」ボタン押下時にモーダルダイアログで表示する。

### 1.2. 利用権限

- **実験管理者 (Experiment Admin)**: 使用可能
- **データ管理者 (Data Admin)**: 使用可能

### 1.3. URL

`/namespace-management`

---

## 2. 画面レイアウト

### 2.1. 全体構造（2ペイン）

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ 📂 名前空間ツリー               │ 📋 用語リスト                                        │
│ (左ペイン ~30%)                  │ (右ペイン ~70%)                                      │
├──────────────────────────────────┼───────────────────────────────────────────────────┤
│ 🔍 名前空間を検索...             │ 🔍 用語を検索... [インポート][エクスポート]            │
│ [名前空間を追加]                 │              [選択した用語を削除(N件)] [+用語追加][保存]│
│                                  │                                                    │
│ ▼ 🌐 グローバル                  │ □ QName ▲  │表示名 │説明    │型    │単位│操作       │
│   ● maiml ...            [12]   │ ☑ CorpA:SampleID│サンプルID│..│string│kg │✏編集 🗑削除│
│   ● xsi   ...             [3]   │ ☐ CorpA:MeasTemp│測定温度  │..│float │℃  │✏編集 🗑削除│
│   ● qudt  ...            [24]   │ ☐ CorpA:Pressure│圧力      │..│float │   │✏編集 🗑削除│
│                                  │ ...                                                │
│ ▼ 🏢 組織 [8]                    │ ─────────────────────────────────────────────────  │
│   ▼ CorpA ...                    │  全 10 件  < 1 >  20件/ページ ▼                     │
│     ▼ LabA ...           [5]    │                                                    │
│       ● TeamX ...        [3]    │                                                    │
│                                  │                                                    │
│ ▼ 👤 個人 [7]                    │                                                    │
│   ● MyWord  ...                  │                                                    │
│   ● JohnDoe ...          [2]    │                                                    │
├──────────────────────────────────┴───────────────────────────────────────────────────┤
│ ✅ 準備完了  |  名前空間: 7件  |  用語: 10件  |  最終保存: 2026-05-29 08:30  |  UTF-8   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

> **操作ボタン**: 各行に「✏ 編集」「🗑 削除」ボタン（詳細ボタンは廃止）

### 2.2. 実験管理者メニューのタブ構成

> ⚠️ **実装の仕様**: 「グループ管理」は `NamespaceMain` 内のサブタブではなく、`ExperimentAdminMenu` のトップレベルタブ（tab key=`'5'`）として独立している。

実験管理者メニュー（`ExperimentAdminMenu`）の SubHeader には以下のタブが表示される：

| key | ラベル | コンポーネント |
|-----|-------|-------------|
| `'1'` | プロジェクト管理 | `<ProjectManagement />` |
| `'2'` | フォーマット管理 | `<FormatManagement />` |
| `'3'` | 進捗確認 | `<ProgressMonitoring />` |
| `'4'` | 名前空間管理 | `<UncertaintyManagement />` |
| `'5'` | **グループ管理** | **`<GroupManagementPanel />`** |
| `'6'` | 鍵管理 | `<KeyManagementScreen />` |

**「グループ管理」タブの実装**:
- `ExperimentAdminMenu.tsx` の `tabItems` 配列に `key: '5'` として定義
- `currentTab === '5'` のとき `<GroupManagementPanel />` を `display: block` で表示
- 名前空間管理（`NamespaceMain`）とは別の独立した画面として表示される

```typescript
// ExperimentAdminMenu.tsx
const tabItems = [
  // ...
  {
    key: '5',
    label: 'グループ管理',
    icon: <TeamOutlined />, // ※ Ant Design アイコン名のため変更不可
  },
  // ...
];
```

---

## 3. 左ペイン：名前空間ツリー

### 3.1. レイアウト

> ⚠️ **実装との差異**: 左ペインに「名前空間を追加」ボタンは**存在しない**。検索ボックスのみ配置。

```
┌──────────────────────────────────────────────┐
│ 🔍 名前空間を検索...                          │
├──────────────────────────────────────────────┤
│ ▼ 🌐 グローバル（Global）                     │
│     ● maiml   http://maiml.org/...    [12]   │
│     ● xsi     http://www.w3.org/...    [3]   │
│     ● qudt    https://qudt.org/       [24]   │
│                                              │
│ ▼ 🏢 組織 (Organization) [8]                 │
│     ▼ CorpA  https://www.corpa.co.jp/        │
│         ▼ LabA  https://corpa.co.jp/lab/     │
│             ● TeamX  .../team-x/      [3]    │
│                                              │
│ ▼ 👤 個人 (Personal) [7]                     │
│     ● MyWord   https://orcid.org/...         │
│     ● JohnDoe  https://example-univ...  [2]  │
└──────────────────────────────────────────────┘
```

### 3.2. コンポーネント仕様

#### 3.2.1. 検索入力

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Input>` |
| プレースホルダー | 「名前空間を検索...」 |
| 前置アイコン | `<SearchOutlined />` |
| 幅 | ペイン幅 - 追加ボタン幅 |
| クリアボタン | 有効（allowClear） |
| 検索対象 | 接頭辞（prefix）・URI（部分一致） |

#### 3.2.2. 名前空間ツリー

**コンポーネント**: `<Tree>` (Ant Design)

**ツリー構造**:

| レベル | アイコン | 表示形式 |
|-------|---------|---------|
| グローバル（ルート） | 🌐 | `グローバル（Global）` |
| 組織（ルート） | 🏢 | `組織 (Organization) [件数]` |
| 個人（ルート） | 👤 | `個人 (Personal) [件数]` |
| 名前空間ノード | ● | `prefix  URI（省略表示）  [用語数]` |

**ノード仕様**:

| 項目 | 値 |
|------|-----|
| selectable | true（クリックで右ペインに用語リストを表示） |
| expandable | 組織レベルは子名前空間を持つ場合に展開可能 |
| 用語数バッジ | 左ペインのツリーノードへのバッジ表示は廃止。右ペイン上部に「用語数: N」「Prefix数: N」のバッジを表示する |
| URI省略 | 30文字超の場合 `...` で省略 |

**ツリーノードのコンテキストメニュー（右クリック）**:

> ⚠️ **実装の仕様**: コンテキストメニューは**グループノード（`companyDepth >= 2`）のみ**に表示される。他のノード（グローバル / 個人 / 組織ルート）には表示されない。

| メニュー項目 | アイコン | 表示条件 | 動作 |
|-------------|---------|---------|------|
| グループを追加 | `<PlusOutlined />` | グループノード（`companyDepth >= 2`）のみ | グループ追加ダイアログを開く |
| 編集 | `<EditOutlined />` | グループノード（`companyDepth >= 2`）のみ | グループ編集ダイアログを開く（メンバー変更） |

**グループノードの depth 判定**:

> `companyDepth === 3` から `companyDepth >= 2` に修正（`NamespaceMain.tsx` L1241、`UncertaintyManagement.tsx` L374）。

```
company（depth 1）
  └── 部門（depth 2）← コンテキストメニュー表示（depth >= 2）
        └── グループ（depth 3） ← コンテキストメニュー表示（depth >= 2）
```

**ツリーデータ型**:

> ⚠️ **実装との差異**: 実装では JSON モックデータ（`uncertainty-scope.json`）の構造に合わせて2つの型を使用する。

```typescript
// モックJSON（uncertainty-scope.json）のノード型
interface NamespaceNode {
  key: string;
  label: string;   // ノード表示ラベル（prefix等）
  count: number;   // 用語数
  icon: string;
  children?: NamespaceNode[];
  // JSON拡張フィールド（オプション）
  prefix?: string;
  uri?: string;
}

// 内部管理用フラット型（flattenTree() で生成）
interface FlatNsNode {
  key: string;
  prefix: string;
  uri: string;
  level: 'global' | 'organization' | 'personal';
  termCount: number;
  displayName?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

// インライン新規追加行の型
interface NewTermRow {
  _rowId: string;       // 一時ID（テーブル行キー用）
  prefix: string;       // 現在選択中の名前空間 prefix（QName生成に使用）
  localName: string;
  displayName: string;
  displayNameEn: string;
  description: string;
  type: string;
  unitHint: string;
  /** true のとき同一 prefix:localName が既に登録されている（重複エラー表示用） */
  _isDuplicate?: boolean;
  /** true のとき指示用語（SupervisorDirective{localName}）を同時登録する。デフォルト: true */
  createDirectiveTerm?: boolean;
}
```

**モックデータソース**: `frontend/mock/namespace/uncertainty-scope.json`（`label` / `count` / `icon` フィールドを持つ JSON）

**参考：旧設計書モックデータ**:
```typescript
const namespaceTreeData: NamespaceTreeNode[] = [
  {
    key: 'global',
    title: 'グローバル（Global）',
    prefix: '',
    uri: '',
    level: 'global',
    termCount: 0,
    children: [
      {
        key: 'ns-maiml',
        title: 'maiml  http://maiml.org/schemas  [12]',
        prefix: 'maiml',
        uri: 'http://maiml.org/schemas',
        level: 'global',
        termCount: 12,
      },
      {
        key: 'ns-xsi',
        title: 'xsi  http://www.w3.org/2001/XMLSchema-instance  [3]',
        prefix: 'xsi',
        uri: 'http://www.w3.org/2001/XMLSchema-instance',
        level: 'global',
        termCount: 3,
      },
      {
        key: 'ns-qudt',
        title: 'qudt  https://qudt.org/schema/qudt/  [24]',
        prefix: 'qudt',
        uri: 'https://qudt.org/schema/qudt/',
        level: 'global',
        termCount: 24,
      },
    ],
  },
  {
    key: 'organization',
    title: '組織 (Organization) [8]',
    prefix: '',
    uri: '',
    level: 'organization',
    termCount: 0,
    children: [
      {
        key: 'ns-corpa',
        title: 'CorpA  https://www.corpa.co.jp/',
        prefix: 'CorpA',
        uri: 'https://www.corpa.co.jp/',
        level: 'organization',
        termCount: 0,
        children: [
          {
            key: 'ns-laba',
            title: 'LabA  https://corpa.co.jp/lab/  [5]',
            prefix: 'LabA',
            uri: 'https://corpa.co.jp/lab/',
            level: 'organization',
            termCount: 5,
            children: [
              {
                key: 'ns-teamx',
                title: 'TeamX  https://corpa.co.jp/lab/team-x/  [3]',
                prefix: 'TeamX',
                uri: 'https://corpa.co.jp/lab/team-x/',
                level: 'organization',
                termCount: 3,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: 'personal',
    title: '個人 (Personal) [7]',
    prefix: '',
    uri: '',
    level: 'personal',
    termCount: 0,
    children: [
      {
        key: 'ns-myword',
        title: 'MyWord  https://orcid.org/0000-0002-2494-9603',
        prefix: 'MyWord',
        uri: 'https://orcid.org/0000-0002-2494-9603',
        level: 'personal',
        termCount: 0,
      },
      {
        key: 'ns-johndoe',
        title: 'JohnDoe  https://example-univ.ac.jp/~johndoe  [2]',
        prefix: 'JohnDoe',
        uri: 'https://example-univ.ac.jp/~johndoe',
        level: 'personal',
        termCount: 2,
      },
    ],
  },
];
```

---

## 4. 右ペイン：用語リスト

### 4.1. レイアウト（通常表示）

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔍 用語を検索...   [インポート] [エクスポート] [🗑選択した用語を削除(N件)] [+用語を追加] [保存] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ □  QName ▲          │ 表示名       │ 説明              │ 型          │ 単位  │ 操作       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ☑ CorpA:SampleID    │ サンプルID   │ サンプル識別子     │ stringType  │       │ ✏編集 🗑削除│
│ ☐ CorpA:MeasTemp    │ 測定温度     │ 測定時の温度       │ floatType   │ ℃    │ ✏編集 🗑削除│
│ ☐ CorpA:Pressure    │ 圧力         │ 実験圧力           │ floatType   │       │ ✏編集 🗑削除│
│ ☐ CorpA:Operator    │ 担当者       │ 実験担当者名       │ stringType  │       │ ✏編集 🗑削除│
│ ...                                                                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  全 10 件  < 1 >  20件/ページ ▼                                                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

> **詳細ボタン（📋）は廃止**。操作列には「✏ 編集」「🗑 削除」ボタンのみ。

### 4.2. レイアウト（用語追加インラインフォーム表示時）

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ 🔍 用語を検索...  [インポート] [エクスポート] [+用語を追加] [保存（活性）]               │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ □  QName ▲         │ 表示名   │ 説明   │ 型    │ 単位 │ 操作                          │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ 黄 │ ✎ ローカル名入力... │ 表示名...│ 説明...│ 型 ▼ │単位..│ （操作なし）                │
│ 黄 │ ✎ ローカル名入力... │ 表示名...│ 説明...│ 型 ▼ │単位..│ （操作なし）                │
│ ☑  │ CorpA:SampleID   │ サンプルID│...    │string│      │ ✏編集 🗑削除                 │
│ ☐  │ CorpA:MeasTemp   │ 測定温度  │...    │float │      │ ✏編集 🗑削除                 │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

> ℹ 「+用語を追加」を押すたびに黄色の入力行が先頭に追加される。複数行を同時に追加可能。  
> ℹ 「保存」ボタン（ツールバー右端）で全入力行を一括確定する。入力行が0件のとき「保存」は非活性。

### 4.3. コンポーネント仕様

#### 4.3.1. 用語検索入力

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Input>` |
| プレースホルダー | 「用語を検索...」 |
| 前置アイコン | `<SearchOutlined />` |
| クリアボタン | 有効（allowClear） |
| 検索対象 | QName・表示名・説明（部分一致） |

#### 4.3.2. 用語追加ボタン

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Button>` |
| ラベル | 「＋ 用語を追加」 |
| タイプ | `primary` |
| アイコン | `<PlusOutlined />` |
| 動作 | テーブル先頭にインライン入力行を追加 |

#### 4.3.3. 用語テーブル

**コンポーネント**: `<Table>`

**カラム定義**:

> ⚠️ **実装の仕様**: QName（`prefix:localName` 単一列）は廃止。`Prefix`・`ローカル名`・`スコープ` の3列に分割されている。`globalOnly=true` のとき `スコープ` 列は非表示。

| カラム | dataIndex | 幅 | ソート | 説明 |
|--------|-----------|-----|--------|------|
| チェックボックス | （rowSelection） | — | - | 複数選択用（カスタムヘッダー）。新規行（`_rowId`）はチェック不可 |
| Prefix | `prefix` | 140px | 有効（デフォルト昇順） | 名前空間 prefix。新規行は `<Select>` で選択 |
| ローカル名 | `localName` | 160px | 有効 | 用語のローカル名。新規行は `<Input>` で入力 |
| 表示名 | `displayName` | 130px | 有効 | 用語の日本語表示名 |
| 説明 | `description` | 180px | 有効 | 用語の説明文（省略表示） |
| スコープ | （prefix から導出） | 180px | 有効 | prefix が属する名前空間スコープをフルパスの末尾ノード名で `<Tag>` 表示。ホバーで Tooltip にフルパスを表示。`globalOnly=true` のとき非表示 |
| 型 | `type` | 140px | 有効 | 型ヒント（stringType / floatType 等）。`<Tag>` 表示 |
| 単位 | `unitHint` | 100px | 有効 | 単位ヒント（任意） |
| 指示用語同時登録 | `createDirectiveTerm` | 80px | - | 新規行のみ表示。チェックONで保存すると `SupervisorDirective{localName}` を同時登録。デフォルト: ON（`true`）。`localName` 未入力時は disabled |
| 操作 | （actions） | 130px | - | 編集（✏）・非アクティブ/アクティブ切替ボタン。既存行に `hasDirectiveTerm=true` の場合は「指示あり」バッジを表示 |

**操作ボタン仕様**:

> ⚠️ **実装の仕様**: 「削除」ボタンは廃止。代わりにアクティブ状態を切り替える「非アクティブ」/「アクティブ」ボタンを配置。

| ボタン | アイコン | 動作 |
|--------|---------|------|
| 編集 | `<EditOutlined />` | インライン編集行に切り替え |
| 非アクティブ | なし（`danger` スタイル） | `isActive === true` の用語に表示。クリックでアクティブ→非アクティブに切替 |
| アクティブ | なし | `isActive === false` の用語に表示。クリックで非アクティブ→アクティブに切替 |

> **注意**: 詳細ボタン（📋）は廃止。操作列には「編集」「非アクティブ/アクティブ」のみ。

**ヘッダーチェックボックス仕様**:

| 状態 | ヘッダー表示 | 動作 |
|------|------------|------|
| 未選択 | ☐ 未チェック | — |
| 一部選択 | ☐ 未チェック（変化しない） | — |
| 全件選択済み | ☑ チェック済み | — |
| クリック（未・一部選択時） | 全件選択 | `filteredTerms` の全 ID を選択 |
| クリック（全件選択時） | 全件解除 | 選択をすべてクリア |

**型ヒント選択肢**:
```typescript
const typeOptions = [
  { value: 'stringType',   label: 'stringType'   },
  { value: 'integerType',  label: 'integerType'  },
  { value: 'floatType',    label: 'floatType'    },
  { value: 'booleanType',  label: 'booleanType'  },
  { value: 'dateTimeType', label: 'dateTimeType' },
  { value: 'uriType',      label: 'uriType'      },
];
```

**ページネーション仕様**:

| 項目 | 値 |
|------|-----|
| デフォルト件数 | 20件/ページ |
| 選択肢 | 20 / 50 / 100 |
| 全件数表示 | `全 N 件` |
| ページ変更時 | ページ番号・件数を state で管理 |

#### 4.3.4. インライン用語追加フォーム

**表示条件**: 「＋ 用語を追加」ボタン押下後

**スタイル**: 行背景色を黄色（`#fffbe6`）でハイライト

| フィールド | コンポーネント | プレースホルダー | バリデーション |
|-----------|--------------|----------------|--------------|
| ローカル名 | `<Input>` | 「✎ ローカル名を入力...」 | 必須 |
| 表示名 | `<Input>` | 「表示名...」 | 任意 |
| 説明 | `<Input>` | 「説明...」 | 任意 |
| 型 | `<Select>` | 「型を選択...」 | 任意（未選択時はstringType） |
| 単位 | `<Input>` | 「単位...」 | 任意 |

> **保存ボタンはツールバー右端に配置**（インライン行内には保存ボタンなし）。  
> 入力行が1件以上存在する場合のみ「保存」ボタンが活性化する。

#### 4.3.5. 用語モックデータ

```typescript
interface Term {
  id: string;
  qname: string;
  prefix: string;
  localName: string;
  displayName: string;
  displayNameEn?: string; // 英語表示名（任意）
  description: string;
  type: string;
  unitHint?: string;      // 単位ヒント（任意）
  isActive: boolean;      // アクティブ状態（false のとき行をグレーアウト表示）
  hasDirectiveTerm?: boolean; // true のとき「指示あり」バッジを表示（指示用語が登録済み）
}

const termsMockData: Term[] = [
  { id: 'term-001', qname: 'CorpA:SampleID',    prefix: 'CorpA', localName: 'SampleID',    displayName: 'サンプルID',   description: 'サンプル識別子',          type: 'stringType' },
  { id: 'term-002', qname: 'CorpA:MeasTemp',    prefix: 'CorpA', localName: 'MeasTemp',    displayName: '測定温度',     description: '測定時の温度',            type: 'floatType'  },
  { id: 'term-003', qname: 'CorpA:Pressure',    prefix: 'CorpA', localName: 'Pressure',    displayName: '圧力',         description: '実験圧力',                type: 'floatType'  },
  { id: 'term-004', qname: 'CorpA:Operator',    prefix: 'CorpA', localName: 'Operator',    displayName: '担当者',       description: '実験担当者名',            type: 'stringType' },
  { id: 'term-005', qname: 'CorpA:InstrumentID',prefix: 'CorpA', localName: 'InstrumentID',displayName: '装置ID',       description: '使用装置の識別子',        type: 'stringType' },
  { id: 'term-006', qname: 'CorpA:SampleWeight',prefix: 'CorpA', localName: 'SampleWeight',displayName: 'サンプル重量', description: '測定サンプル重量',        type: 'floatType'  },
  { id: 'term-007', qname: 'CorpA:Protocol',    prefix: 'CorpA', localName: 'Protocol',    displayName: 'プロトコル',   description: '実験プロトコル名',        type: 'stringType' },
  { id: 'term-008', qname: 'CorpA:BatchNo',     prefix: 'CorpA', localName: 'BatchNo',     displayName: 'バッチ番号',   description: '製造バッチ番号',          type: 'integerType'},
  { id: 'term-009', qname: 'CorpA:ElapsedTime', prefix: 'CorpA', localName: 'ElapsedTime', displayName: '経過時間',     description: '測定開始からの経過時間',  type: 'floatType'  },
  { id: 'term-010', qname: 'CorpA:Result',      prefix: 'CorpA', localName: 'Result',      displayName: '測定結果',     description: '最終測定結果値',          type: 'stringType' },
];
```

---

## 4.4. ツールバーボタン仕様

| ボタン | タイプ | アイコン | 活性条件 | 動作 |
|--------|--------|---------|---------|------|
| インポート | `default` | — | 常時 | CSVファイル選択ダイアログを開く → 用語を一括インポート |
| エクスポート | `default` | — | 常時 | **選択中の用語**をCSVファイルとしてダウンロード（未選択時はエラーメッセージを表示して中断） |
| 選択した用語を非アクティブ（N件） | `danger` | `<StopOutlined />` | 1件以上選択時のみ表示（アクションバーに表示） | 確認ダイアログ後に一括非アクティブ化 |
| ＋ 用語を追加 | `primary` | `<PlusOutlined />` | 常時 | テーブル先頭に空の入力行を追加 |
| 保存 | `primary` | — | 入力行が1件以上のとき活性 | 全入力行を一括確定（バリデーション後） |
| キャンセル | `default` | — | 入力行が1件以上のとき活性 | 全入力行を破棄（`newTerms` をクリア） |

---

## 5. 用語詳細モーダル（廃止）

> **注意**: 詳細ボタン（📋）は現在の実装では廃止されています。以下は参考として残します。

### 5.1. 表示トリガー（廃止）

~~用語リストの操作列「📋（詳細）」ボタンをクリックすると表示される。~~

### 5.2. ダイアログ全体仕様

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Modal>` (Ant Design) |
| タイトル | 「用語詳細」 |
| 幅 | 640px |
| maskClosable | true（背景クリックで閉じる） |
| keyboard | true（Escキーで閉じる） |
| footer | なし（カスタムフッターを使用） |
| タブ | なし（XMLプレビュータブは廃止。詳細表示のみ） |

### 5.3. モーダルレイアウト

```
┌──────────────────────────────────────────────────────────────────┐
│  用語詳細                                                     [✕] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  QName        │ CorpA:SampleID                                   │
│  ローカル名   │ SampleID                                          │
│  名前空間     │ CorpA  (https://www.corpa.co.jp/)                 │
│  レベル       │ 🏢 組織 (Organization)                            │
│  表示名(JA)   │ サンプルID                                        │
│  表示名(EN)   │ Sample Identifier                                 │
│  説明         │ サンプル識別子。実験プロトコルにて一意に識別。      │
│  型ヒント     │ stringType                                        │
│  単位ヒント   │ —（なし）                                          │
│  作成日時     │ 2026-04-15 10:30                                   │
│  更新日時     │ 2026-05-01 09:15                                   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                    [💾アイコン 保存]  [✕アイコン キャンセル]        │

> **注意**: タブは廃止。詳細表示コンテンツのみを表示する。ボタンラベルに絵文字は使用せずアイコン（SaveOutlined / CloseOutlined）を使用する。
└──────────────────────────────────────────────────────────────────┘
```

### 5.4. 詳細表示タブ

#### 5.4.1. フィールド一覧

| フィールド | 編集 | コンポーネント | 説明 |
|-----------|------|--------------|------|
| QName | ❌ 読み取り専用 | `<Text>` | `prefix:localName` |
| ローカル名 | ❌ 読み取り専用 | `<Text>` | localName のみ |
| 名前空間 | ❌ 読み取り専用 | `<Text>` | `prefix (URI)` |
| レベル | ❌ 読み取り専用 | `<Tag>` | 🌐/🏢/👤 アイコン付き |
| 表示名(JA) | ✅ 編集可 | `<Input>` | 日本語表示名 |
| 表示名(EN) | ✅ 編集可 | `<Input>` | 英語表示名 |
| 説明 | ✅ 編集可 | `<Input.TextArea>` | 用語説明文 |
| 型ヒント | ✅ 編集可 | `<Select>` | 型の選択 |
| 単位ヒント | ✅ 編集可 | `<Input>` | 単位（任意） |
| 作成日時 | ❌ 読み取り専用 | `<Text>` | ISO8601形式 |
| 更新日時 | ❌ 読み取り専用 | `<Text>` | ISO8601形式 |

#### 5.4.2. フッターボタン

| ボタン | タイプ | アイコン | 動作 |
|--------|--------|---------|------|
| 保存 | `primary` | `<SaveOutlined />` | 変更内容をAPIで保存 → モーダルを閉じる |
| キャンセル | `default` | `<CloseOutlined />` | 変更内容を破棄してモーダルを閉じる |

> **注意**: ボタンラベルに絵文字は使用しない。アイコン（`<SaveOutlined />`、`<CloseOutlined />`）+ テキスト（「保存」「キャンセル」）のみ。

### 5.5. モーダルモックデータ

```typescript
interface TermDetail {
  qname: string;
  localName: string;
  namespacePrefix: string;
  namespaceUri: string;
  level: 'global' | 'organization' | 'personal';
  displayNameJa: string;
  displayNameEn: string;
  description: string;
  typeHint: string;
  unitHint: string | null;
  createdAt: string;
  updatedAt: string;
}

const termDetailMock: TermDetail = {
  qname: 'CorpA:SampleID',
  localName: 'SampleID',
  namespacePrefix: 'CorpA',
  namespaceUri: 'https://www.corpa.co.jp/',
  level: 'organization',
  displayNameJa: 'サンプルID',
  displayNameEn: 'Sample Identifier',
  description: 'サンプル識別子。実験プロトコルにて一意に識別。',
  typeHint: 'stringType',
  unitHint: null,
  createdAt: '2026-04-15 10:30',
  updatedAt: '2026-05-01 09:15',
};

const xmlPreviewMock = `<?xml version="1.0" encoding="UTF-8"?>
<maiml version="1.0"
  xmlns="http://www.maiml.org/schemas"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:CorpA="https://www.corpa.co.jp/"
  xmlns:LabA="https://www.corpa.co.jp/lab-a/"
  xmlns:MyWord="https://orcid.org/0000-0002-2494-9603"
  xsi:type="maimlRootType">`;
```

---

## 6. ステータスバー

### 6.1. レイアウト

```
✅ 準備完了  |  名前空間: 7件  |  用語: 45件  |  最終保存: 2026-05-29 08:30  |  UTF-8
```

### 6.2. 項目仕様

| 項目 | 表示内容 | 更新タイミング |
|------|---------|--------------|
| 状態アイコン | ✅ 準備完了 / ⚠️ 未保存変更あり / ❌ エラー | 操作に応じてリアルタイム更新 |
| 名前空間件数 | `名前空間: N件` | 名前空間追加・削除時 |
| 用語件数 | `用語: N件` | 用語追加・削除時 |
| 最終保存日時 | `最終保存: YYYY-MM-DD HH:mm` | 保存操作時 |
| 文字コード | `UTF-8` | 固定表示 |

### 6.3. ステータスバーモックデータ

```typescript
interface StatusBarData {
  status: 'ready' | 'unsaved' | 'error';
  namespaceCount: number;
  termCount: number;
  lastSaved: string;
  encoding: string;
}

const statusBarMock: StatusBarData = {
  status: 'ready',
  namespaceCount: 7,
  termCount: 45,
  lastSaved: '2026-05-29 08:30',
  encoding: 'UTF-8',
};
```

---

## 7. イベントハンドリング

### 7.1. 名前空間ツリー操作

| イベント | 処理 |
|---------|------|
| ツリーノードクリック | 右ペインに選択名前空間の用語リストを表示 |
| 検索入力変更 | ツリーをリアルタイムフィルタリング |
| グループノード右クリック → グループを追加 | グループノード右クリック → グループを追加 | グループ追加ダイアログを開く（セクション9参照） |
| グループノード右クリック → 編集 | グループ編集ダイアログを開く（セクション10参照） |

### 7.2. 用語リスト操作

| イベント | 処理 |
|---------|------|
| ヘッダーチェックボックスクリック（未・一部選択） | `filteredTerms` の全件を選択 |
| ヘッダーチェックボックスクリック（全選択済み） | 全件選択解除 |
| 行チェックボックス選択 | 個別選択状態を管理（ヘッダーは変化しない） |
| [インポート] クリック | CSVファイル選択 → 用語を一括インポート |
| [エクスポート] クリック | 選択中用語をCSVダウンロード（未選択時はエラー） |
| [選択した用語を削除] クリック | 確認モーダル → 一括削除 → 選択リストクリア |
| [＋ 用語を追加] クリック | テーブル先頭に空の入力行を追加（複数回押下で複数行追加） |
| [保存] クリック | 全入力行をバリデーション → 確定 → 入力行クリア |
| ✏ 編集ボタン | 当該行をインライン編集モードに切り替え |
| 🗑 削除ボタン | 確認モーダル後に削除 |
| インライン編集 [✔ 保存] | 変更を確定して通常行に戻す |
| インライン編集 [✕] | 変更を破棄して通常行に戻す |

### 7.3. 名前空間詳細モーダル操作（ツリー右クリック → 編集）

| イベント | 処理 |
|---------|------|
| [保存] クリック | 変更フィールドを保存 → モーダルを閉じる |
| [キャンセル] クリック | 編集内容を破棄 → モーダルを閉じる |
| Escキー / 背景クリック | キャンセルと同じ動作 |

---

## 8. インライン編集（用語行）

### 8.1. 概要

既存の用語行の「✏ 編集」ボタン押下で、その行がインライン編集モードに切り替わる。

### 8.2. インライン編集行の仕様

| フィールド | コンポーネント | 備考 |
|-----------|--------------|------|
| QName | 表示のみ（`<Text>`） | 編集不可 |
| 表示名 | `<Input>` | 編集可 |
| 説明 | `<Input>` | 編集可 |
| 型 | `<Select>` | `typeOptions` から選択 |
| 単位 | `<Input>` | 編集可 |
| 操作 | 「保存」「キャンセル」ボタン | 「✏ 編集」「🗑 削除」に代わって表示 |

### 8.3. インライン編集ボタン仕様

| ボタン | タイプ | 動作 |
|--------|--------|------|
| 保存 | `primary` (小) | 変更内容を `terms` state に反映し、通常行に戻す |
| キャンセル | `default` (小) | 変更内容を破棄し、通常行に戻す |

---

## 9. グループ追加ダイアログ（GroupAddDialog）

### 9.1. 概要

左ペインのグループノードを右クリック → 「グループを追加」を選択すると表示される。  
新しいグループ（`department_unit`）を DB に作成し、メンバーを設定する。

### 9.2. ダイアログ仕様

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Modal>` |
| タイトル | 「グループを追加」 |
| 幅 | 480px |
| maskClosable | false |
| コンポーネントファイル | `frontend/src/components/group/GroupAddDialog.tsx` |

### 9.3. レイアウト

```
┌────────────────────────────────────────┐
│ グループを追加                     [✕] │
├────────────────────────────────────────┤
│ 追加先                                 │
│  [CorpA / LabA]（青タグ）              │
│                                        │
│ グループ名 *                           │
│ [グループ名を入力...                 ] │
│                                        │
│ 名前空間URI（自動生成）                │
│ [https://ns.example.org/...  （表示のみ）] │
│                                        │
│ メンバー（任意）                       │
│ [メンバーを選択...              ▼    ] │
│  ✕山田 太郎   ✕佐藤 花子              │
│ ※メンバーはあとから「編集」で追加可    │
├────────────────────────────────────────┤
│              [キャンセル] [作成]        │
└────────────────────────────────────────┘
```

### 9.4. フィールド仕様

| フィールド | コンポーネント | 必須 | 説明 |
|-----------|--------------|------|------|
| 追加先 | `<Select>` | ✅ | 親ノードのラベルをプルダウンで選択。選択肢はツリーの組織ノード一覧。初期値は右クリックしたノード |
| グループ名 | `<Input>` | ✅ | 新規グループ名（空の場合「作成」ボタン非活性）。入力変更時に URI が自動更新される |
| 名前空間URI（自動生成） | `<Input disabled>` | — | `generateNamespaceUri(groupName, parentPath)` で生成した URI を読み取り専用表示。グループ名変更のたびにリアルタイム更新 |
| メンバー | `<Select>（単数選択）+ 追加ボタン + メンバータグ一覧` | 任意 | プルダウンで1名ずつ選択して追加。選択済みメンバーはタグ（`<Tag closable>`）で表示し × で削除可 |

### 9.5. ボタン仕様

| ボタン | タイプ | 活性条件 | 動作 |
|--------|--------|---------|------|
| キャンセル | `default` | 常時（loading 中は非活性） | 入力をリセット → ダイアログを閉じる |
| 作成 | `primary` | グループ名が1文字以上の場合 | DB にグループを作成 → メンバーを設定 → ツリーに反映 |

### 9.6. API連携

| ステップ | メソッド | エンドポイント | 内容 |
|---------|---------|--------------|------|
| ① ユーザー一覧取得（ダイアログ open 時） | GET | `/api/v1/department-units/users` | 組織内ユーザー一覧を取得してメンバー選択肢に使用 |
| ② グループ作成 | POST | `/api/v1/department-units` | `unitName`, `departmentCd`, `layer: 1` を送信 |
| ③ メンバー設定（members > 0 の場合） | PUT | `/api/v1/department-units/:id/members` | `{ userIds: string[] }` を送信 |

---

## 10. グループ編集ダイアログ（GroupEditDialog）

### 10.1. 概要

左ペインのグループノードを右クリック → 「編集」を選択すると表示される。  
既存グループのメンバー構成を変更し DB に保存する。

### 10.2. ダイアログ仕様

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Modal>` |
| タイトル | 「グループを編集」 |
| 幅 | 480px |
| maskClosable | false |
| コンポーネントファイル | `frontend/src/components/group/GroupEditDialog.tsx` |

> ⚠️ **実装の仕様**: タイトルは「編集」ではなく「グループを編集」。グループ名は読み取り専用の Tag ではなく編集可能な `<Input>` として表示される。代表者（Owner）フィールドが追加されている。

### 10.3. レイアウト

```
┌────────────────────────────────────────┐
│ グループを編集                     [✕] │
├────────────────────────────────────────┤
│ グループ名 *                           │
│ [GroupX                             ] │
│                                        │
│ 代表者                                 │
│  山田 太郎（自分）                     │
│ ─────────────────────────────────────  │
│ メンバー                               │
│ [名前で検索して選択...         ▼     ] │
│  ✕Alice  ✕Bob  ✕Carol（既存メンバー）  │
│ ※プルダウンで追加・× で削除できます    │
├────────────────────────────────────────┤
│              [キャンセル] [保存]        │
└────────────────────────────────────────┘
```

### 10.4. フィールド仕様

| フィールド | コンポーネント | 備考 |
|-----------|--------------|------|
| グループ名 | `<Input>` | 編集可能（必須）。空の場合「保存」ボタン非活性 |
| 代表者 | `<Text>` | `group.ownerName` を読み取り専用で表示（編集不可） |
| メンバー | `<Select mode="multiple" showSearch allowClear>` | ダイアログ open 時に既存メンバーを初期値として表示 |

### 10.5. ボタン仕様

| ボタン | タイプ | 活性条件 | 動作 |
|--------|--------|---------|------|
| キャンセル | `default` | 常時（loading 中は非活性） | ダイアログを閉じる（変更内容を破棄） |
| 保存 | `primary` | 常時（loading 中はスピナー表示） | メンバー一覧を DB に保存 → ダイアログを閉じる |

### 10.6. API連携

| ステップ | メソッド | エンドポイント | 内容 |
|---------|---------|--------------|------|
| ① ユーザー一覧取得（ダイアログ open 時） | GET | `/api/v1/department-units/users` | 組織内ユーザー一覧を取得してメンバー選択肢に使用 |
| ② 既存メンバー取得（ダイアログ open 時、teamUnitId がある場合） | GET | `/api/v1/department-units/:id/members` | 既存メンバーの userId 一覧を取得して初期値にセット |
| ③ メンバー更新（保存時） | PUT | `/api/v1/department-units/:id/members` | `{ userIds: string[] }` を送信 |

> **注意**: `teamUnitId` が未設定（ツリーノードが DB 未登録）の場合、PUT リクエストはスキップされ、フロントエンドの state のみ更新される。

---

## 11. 組織に共有（Share to Organization）機能

### 11.1. 概要

Personal（個人）名前空間の用語を、自分の所属グループが管理する組織名前空間にコピーする機能。  
個人が登録した独自用語を組織の共有語彙として昇格させることを目的とする。

### 11.2. 表示条件

以下の**両方**を満たした場合のみ「組織に共有」ボタンが表示される：

| 条件 | 詳細 |
|------|------|
| ① Personal 名前空間が選択中 | 左ペインで `level === 'personal'` のノードを選択している |
| ② チェック済み用語が1件以上 | 右ペインのテーブルで1件以上の行がチェックされている |

### 11.3. レイアウト

Personal 名前空間選択中 + チェックあり時のレイアウト：

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              🏢 組織に共有（2件）  🗑 選択した用語を削除（2件）  ← 右端 │
│ 🔍 用語を検索...  [インポート] [エクスポート] [+用語追加] [保存] [キャンセル]           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ☑  │ MyWord:MeasTemp   │ 測定温度  │ ...  │ floatType │ ℃  │ ✏編集 🗑削除 │
│ ☑  │ MyWord:SampleID   │ サンプルID│ ...  │stringType │     │ ✏編集 🗑削除 │
│ ☐  │ MyWord:Pressure   │ 圧力      │ ...  │ floatType │     │ ✏編集 🗑削除 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Personal 以外（Organization/Global）+ チェックあり時のレイアウト：

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                          🗑 選択した用語を削除（2件）  ← 右端のみ表示  │
│ 🔍 用語を検索...  [インポート] [エクスポート] [+用語追加] [保存] [キャンセル]           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

> ℹ️ 上段アクションバーはチェック1件以上のとき表示される（0件のとき非表示）。  
> ℹ️ 「🗑 選択した用語を削除」は**常にアクションバーに表示**（ツールバー行には表示しない）。  
> ℹ️ 「🏢 組織に共有」は Personal ノード選択中のみ、削除ボタンの**左隣**に表示される。  
> ℹ️ 背景色・ボーダーなし（透明な行）。

### 11.4. 「組織に共有」ボタン仕様

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Button>` |
| ラベル | `🏢 組織に共有（N件）`（N = チェック件数） |
| タイプ | `primary` |
| 背景色 | `#52c41a`（緑系） |
| 表示条件 | Personal ノード選択中 + チェック1件以上 |
| 配置 | ツールバー行の上、右端 |
| 動作 | 確認モーダルを開く（セクション 11.5 参照） |

### 11.5. 確認モーダル仕様

#### 11.5.1. モーダル概要

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Modal>` |
| タイトル | 「組織に共有」 |
| 幅 | 480px |
| maskClosable | false |
| キーボード（Escキー） | false（誤操作防止） |

#### 11.5.2. レイアウト

```
┌────────────────────────────────────────────────────────┐
│ 🏢 組織に共有                                      [✕] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  以下の 2 件の用語を組織名前空間にコピーします。        │
│                                                        │
│  共有先: rd-materials（LabA / ChemTeam）               │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ MyWord:MeasTemp  測定温度                        │  │
│  │ MyWord:SampleID  サンプルID                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ※ QName の Prefix は共有先の prefix（rd-materials）  │
│     に自動変換されます。                               │
│  ※ 既存の同名 QName がある場合は上書きされます。       │
│                                                        │
├────────────────────────────────────────────────────────┤
│                        [キャンセル] [共有する]          │
└────────────────────────────────────────────────────────┘
```

#### 11.5.3. モーダルフィールド仕様

| フィールド | 内容 | 備考 |
|-----------|------|------|
| 件数メッセージ | `以下の N 件の用語を組織名前空間にコピーします。` | N = チェック件数 |
| 共有先 | `prefix（部門 / グループ）` | ログインユーザーの所属グループ名前空間を自動設定（読み取り専用） |
| 用語リスト | チェックされた用語の `QName` と `displayName` を一覧表示 | `<List>` コンポーネント使用 |
| 注意書き① | Prefix 自動変換の説明 | 固定テキスト |
| 注意書き② | 既存 QName 上書きの注意 | 固定テキスト |

#### 11.5.4. ボタン仕様

| ボタン | タイプ | 動作 |
|--------|--------|------|
| キャンセル | `default` | モーダルを閉じる（共有しない） |
| 共有する | `primary` | 用語を共有先名前空間にコピー → 成功メッセージ表示 → モーダルを閉じる |

### 11.6. 共有先制限の仕様

> ⚠️ **重要**: 共有先は**ログインユーザーの所属グループのみ**に制限される。部門・グループ・他グループへの共有は不可。

| 項目 | 仕様 |
|------|------|
| 共有先の候補 | ログインユーザーが所属するグループノード（`companyDepth >= 2`）の名前空間のみ |
| 複数所属 | 複数グループに所属する場合はドロップダウンで選択（通常は1件） |
| 所属グループなし | 「組織に共有」ボタンは表示されない（または非活性） |

**depth 定義（再掲）**:
```
company（depth 1）
  └── 部門（depth 2）
        └── グループ（depth >= 2）← 共有先候補
```

### 11.7. 共有後の動作

| 手順 | 内容 |
|------|------|
| ① コピー処理 | チェックされた用語を共有先グループの名前空間に追加（Prefix を共有先の prefix に置換） |
| ② 成功通知 | `<message.success>` で「N件の用語を [共有先prefix] に共有しました。」を表示 |
| ③ 用語リスト更新 | 共有先名前空間の用語数バッジ（`[N]`）をインクリメント |
| ④ 選択解除 | チェック状態をクリア |

### 11.8. モックデータ（共有先）

```typescript
// 共有先グループ名前空間の型
interface ShareTarget {
  prefix: string;       // 共有先の名前空間 prefix
  departmentName: string;  // 部門名
  teamName: string;     // グループ名（グループ名）
}

// ログインユーザーの所属グループ（モック）
const shareTargetMock: ShareTarget = {
  prefix: 'rd-materials',
  departmentName: 'LabA',
  groupName: 'ChemGroup', 
};
```

---

## 12. グループ管理タブ（GroupManagementPanel）

### 12.1. 概要

`ExperimentAdminMenu` の tab key=`'5'`「グループ管理」タブを選択すると表示される 2ペインレイアウト。  
ログイン中の実験管理者が作成したグループ一覧を左ペインに表示し、選択したグループの詳細・メンバー管理を右ペインで行う。

**コンポーネントファイル**: `frontend/src/components/group/GroupManagementPanel.tsx`

> ⚠️ **実装の仕様**: `NamespaceMain` 内のサブタブとして表示されるのではなく、実験管理メニューのトップレベルタブとして独立表示される。

### 12.2. レイアウト

```
┌──────────────────────────────────────────────────────────────────────────┐
│ グループ一覧         グループを作成[+] │  グループ詳細（右）                    │
│ （左 240px）                       │                                      │
│ ─────────────────────────────────  │  ─────────────────────────────────   │
│ 🟢 材料解析チーム  2名             │  材料解析チーム  [編集]              │
│ 🟢 データ処理班    0名             │  代表者:    山田 太郎（自分）         │
│                                    │  所属先:    LabA > ChemGroup          │
│                                    │  名前空間URI: https://example.org/.. │
│                                    │  ─────────────────────────────────   │
│                                    │  メンバー                            │
│                                    │   佐藤花子                           │
│                                    │   鈴木一郎                           │
└──────────────────────────────────────────────────────────────────────────┘
```

> ⚠️ **実装の仕様（v2.1.0更新）**:
> - 「編集」ボタンはメンバーセクションではなく**グループ名の右隣**に配置される
> - 「表示名」フィールドは右ペインに表示されない（グループ情報に含まれない）
> - 「所属先」フィールドが追加されている（ツリー上の部門・グループのパスを表示）
> - メンバーテーブルに「削除」ボタン列は存在しない

### 12.3. 左ペイン仕様（グループ一覧）

| 項目 | 仕様 |
|------|------|
| コンポーネント | `<List>` (Ant Design) |
| 幅 | 240px（固定） |
| データソース | `GET /api/v1/department-units/my-teams`（失敗時はダミーデータを使用） |
| 選択状態 | クリックで右ペインに詳細を表示。初期選択は先頭グループ |
| ハイライト | 選択中グループを青背景（`#e6f4ff`）でハイライト |

**左ペインヘッダー**:

| 要素 | 仕様 |
|------|------|
| タイトル | 「グループ一覧」（`<Title level={5}>`） |
| 「グループを作成」ボタン | `<Button type="primary" size="small" icon={<PlusOutlined />}>` をヘッダー行右端に配置。クリックで `GroupAddDialog` を開く |

> ⚠️ **実装の仕様**: 「グループを作成」ボタンはペインのフッターではなく、ヘッダー行（タイトルと同じ行）の右端に `type="primary"` `size="small"` で配置される。

**リスト項目**:

| 要素 | 内容 |
|------|------|
| ステータスアイコン | 🟢（常時表示） |
| グループ名 | `group.unitName` |
| メンバー数 | `N名`（`group.members.length` 件数を表示） |

> ⚠️ **実装の仕様**: リスト項目に [編集] ボタンは**存在しない**。グループ編集は右ペインの「編集」ボタン経由で行う。

> ⚠️ **[2026-08-25 更新]**: アクティブ状態を切り替えるボタン文言は「**アクティブ**」/「**非アクティブ**」を使用する（旧「有効化」/「無効化」から変更）。

### 12.4. 右ペイン仕様（グループ詳細）

#### 12.4.1. グループ未選択時

```
（グループを選択してください）
```

`<Empty description="グループを選択してください" />` を中央表示。

#### 12.4.2. グループ選択時

**グループ情報セクション**:

| フィールド | コンポーネント | データソース |
|-----------|--------------|------------|
| グループ名（＋編集ボタン） | `<Title level={5}>` + `<Button>` | `selectedGroup.unitName`。右隣に「編集」ボタンを配置 |
| 代表者 | `<Text>` + `<UserOutlined />` | `selectedGroup.ownerName` |
| 所属先 | `<Text>` | ツリー上の部門・グループのパスを `>` 区切りで表示（例: `LabA > ChemTeam`） |
| 名前空間URI | `<Text>` + `<LinkOutlined />` | `selectedGroup.nsUri`（未設定時は `—`） |

> ⚠️ **実装の仕様**: グループ情報に **Prefix フィールドは表示されない**。「表示名」フィールドも**表示されない**。「所属先」フィールドが追加された。

**メンバー一覧セクション**:

| 項目 | 仕様 |
|------|------|
| コンポーネント | `<Table>` (Ant Design) |
| データソース | `selectedGroup.members` |
| サイズ | `small` |

**メンバーテーブルカラム**:

| カラム | dataIndex | 説明 |
|--------|-----------|------|
| ユーザー名 | `userName` | メンバーの表示名 |

> ⚠️ **実装の仕様**: メンバーテーブルに **ロール（役職）カラムは存在しない**。また**「削除」ボタン列も存在しない**。ユーザー名列のみ。メンバーの追加・削除は「編集」ボタン → `GroupEditDialog` 経由で行う。

**メンバーセクションヘッダーの「編集」ボタン**:

> ⚠️ **実装の仕様（v2.1.0更新）**: 「編集」ボタンはメンバーセクションのヘッダー右端ではなく、**グループ名（Section 12.4.2 グループ情報セクション）の右隣**に配置される。

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Button>` |
| ラベル | 「編集」 |
| タイプ | `default` (小) |
| 配置 | グループ名の右隣 |
| 動作 | グループ編集ダイアログ（`GroupEditDialog`）を開く |

> ⚠️ **実装の仕様**: 「＋ メンバーを追加」ボタンは存在しない。メンバー追加・削除は「編集」ボタン → `GroupEditDialog` 経由で行う。

### 12.5. 型定義

```typescript
interface GroupMember {
  userId: string;
  userName: string;
  departmentUnitId: string | null;
}

interface Group {
  departmentUnitId: string;
  unitName: string;
  /** 所属部署名 */
  departmentName?: string;
  /** グループの代表者（作成者）表示名 */
  ownerName: string;
  /** グループの代表者 userId */
  ownerUserId?: string;
  nsPrefix?: string;       // 名前空間 Prefix（任意）
  nsUri?: string;          // 名前空間 URI（任意）
  nsDisplayName?: string;  // 名前空間 表示名（任意）
  members: GroupMember[];
}
```

### 12.6. API連携

| ステップ | メソッド | エンドポイント | 内容 |
|---------|---------|--------------|------|
| グループ一覧取得（初期ロード） | GET | `/api/v1/department-units/my-teams` | ログインユーザーが作成したグループ一覧を取得 |

> **注意**: API 失敗時はダミーデータ（`DUMMY_GROUPS`）を使用する。  
> メンバーデータは `frontend/mock/namespace/department-unit-members.json` から取得。

### 12.7. ダミーデータ（API実装前）

```typescript
const DUMMY_GROUPS: Group[] = [
  {
    departmentUnitId: 'rd-materials',
    unitName: '材料解析チーム',
    departmentName: 'LabA',
    ownerName: '山田 太郎（自分）',
    ownerUserId: 'user-001',
    nsPrefix: 'rd-materials',
    nsUri: 'https://example.org/ns/materials/',
    nsDisplayName: '材料科学名前空間',
    members: [],
  },
  {
    departmentUnitId: 'data-proc',
    unitName: 'データ処理班',
    departmentName: 'LabA',
    ownerName: '山田 太郎（自分）',
    ownerUserId: 'user-001',
    nsPrefix: 'data-proc',
    nsUri: 'https://example.org/ns/dp/',
    nsDisplayName: 'データ処理名前空間',
    members: [],
  },
];
```

---

## 13. 部署ノード管理テーブル（DepartmentTreeManagement）

### 13.1. 概要

`ExperimentAdminMenu` の tab key=`'4'`「名前空間管理」タブに `UncertaintyManagement` と並行して表示される可能性があるが、現在は独立した画面として部署ツリーを平坦化したテーブルを管理する。
会社ツリー（`company` ルートノード配下）の全ノードを1行1レコードのテーブルとして表示し、Prefix・名前空間URI・説明を編集できる。

**コンポーネントファイル**: `frontend/src/components/namespace/DepartmentTreeManagement.tsx`

### 13.2. レイアウト

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [🔍 表示名・Prefix・URI・説明を検索...]                    [＋ 部署ノードを追加]      │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ 表示名        │ Prefix       │ 名前空間URI               │ 説明     │ 親ノード │ 操作  │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ CorpA         │ [corpa]      │ https://ORG/              │ ...      │ （ルート）│ —     │
│   LabA        │ [laba]       │ https://ORG/labA/         │ ...      │ CorpA    │ 編集 削除 │
│     ChemGroup │ [chemgroup]   │ https://ORG/labA/chem../  │ ...      │ LabA     │ 編集 削除 │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

> **インデント**: 表示名列は `depth × 16px` の左パディングを付けて階層を視覚化する。  
> **ルートノード（depth=0）**: 操作列は `—`（編集・削除ボタン非表示）。

### 13.3. ツールバー仕様

| 要素 | コンポーネント | 仕様 |
|------|--------------|------|
| 検索ボックス | `<Input prefix={<SearchOutlined />} allowClear>` | 表示名・Prefix・URI・説明を対象に部分一致フィルタ。変更のたびにページを1に戻す |
| 「＋ 部署ノードを追加」ボタン | `<Button type="primary" icon={<PlusOutlined />}>` | クリックで `DepartmentNodeAddDialog` を開く |

### 13.4. テーブルカラム仕様

| カラム | dataIndex | 幅 | ソート | 表示形式 |
|--------|-----------|-----|--------|---------|
| 表示名 | `label` | 200px | ✅（ラベル昇順） | テキスト（`<Text strong>`）+ `depth × 16px` の左パディング |
| Prefix | `prefix` | 140px | ✅ | 通常時: `<Tag color="blue">`。未設定時: `—`。編集中: `<Input size="small">` |
| 名前空間URI | `uri` | — (ellipsis) | ✅ | 通常時: `<Text type="secondary" fontSize={12}>`。未設定時: `—`。編集中: 自動生成URIを読み取り専用 `div`（グレー背景）で表示 |
| 説明 | `description` | — (ellipsis) | ✅ | 通常時: テキスト。未設定時: `—`。編集中: `<Input size="small">` |
| 親ノード | `parentLabel` | 140px | — | `<Text type="secondary" fontSize={12}>`。ルートノードは「（ルート）」 |
| 操作 | — | 160px | — | 通常時: [編集] [削除]。編集中: [✔ 保存] [キャンセル]。depth=0（ルート）は `—` |

### 13.5. インライン編集仕様

| フィールド | 編集可否 | コンポーネント |
|-----------|---------|--------------|
| 表示名（label） | ❌ 読み取り専用 | 変更不可 |
| Prefix | ✅ 編集可 | `<Input size="small">` |
| 名前空間URI | ❌ 自動生成 | 読み取り専用 `div`（グレー背景） |
| 説明 | ✅ 編集可 | `<Input size="small">` |

**URI 自動生成ロジック（編集中）**:

> ⚠️ **[2026-08-25 更新]**: 名前空間URIのドメイン部は `organization_cd` 固定ではなく、プロジェクトに紐づくグループの**ルートグループCD**を使用する形式に変更。  
> - グループスコープ: `https://{ルートグループCD}.Alchemia.co.jp/{子グループCDパス}`  
> - 個人スコープ: `https://{ユーザーの所属グループCD}.Alchemia.co.jp/{loginName}`（グループ未所属時は `organization_cd` にフォールバック）

```typescript
// 編集行の親ノード key から departmentCd を解決して URI を生成
const editAutoUri = useMemo(() => {
  if (!editingRow) return '';
  const parentRow = rows.find((r) => r.key === editingRow.parentKey);
  const deptCd = parentRow?.key ?? editingRow.parentKey ?? undefined;
  return generateNamespaceUri(MOCK_ORGANIZATION_CD, deptCd ?? undefined, editingRow.label);
}, [editingRow, rows]);
```

**保存時バリデーション**:
- Prefix が空の場合 → `message.error('Prefixは必須です')` を表示して保存中断

**保存 API 呼び出し**:

```typescript
await fetch(`/api/v1/department-nodes/${editingRow.key}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prefix: editValues.prefix, description: editValues.description, uri: editAutoUri }),
});
// API 未実装時はローカル state を直接更新してフォールバック
```

### 13.6. 削除仕様

| 項目 | 仕様 |
|------|------|
| トリガー | 操作列「削除」ボタン（depth ≥ 1 のノードのみ） |
| 確認ダイアログ | `Modal.confirm`。タイトル「`${label}` を削除しますか？」、content「配下のノードも参照できなくなる可能性があります。」 |
| 確認ボタン | 「削除」（danger）/ 「キャンセル」 |
| API | `DELETE /api/v1/department-nodes/:key`（失敗時はローカル削除でフォールバック） |
| 成功通知 | `message.success('「${label}」を削除しました')` |

### 13.7. ページネーション仕様

| 項目 | 値 |
|------|-----|
| デフォルト件数 | 20件/ページ |
| 選択肢 | 20 / 50 / 100 |
| 全件数表示 | `全 N 件` |
| ページ変更時 | `currentPage`・`pageSize` を state で管理 |

### 13.8. データ型定義

```typescript
/** テーブル行の型（ツリーを平坦化した1行分） */
interface FlatDeptRow {
  key:         string;      // ノード一意キー
  label:       string;      // 表示名
  prefix:      string;      // 名前空間 Prefix
  uri:         string;      // 名前空間 URI（自動生成）
  description: string;      // 説明
  parentKey:   string | null;  // 親ノードのキー（ルートは null）
  parentLabel: string;      // 親ノードの表示名（ルートは「（ルート）」）
  depth:       number;      // 階層深さ（0 = ルート）
}
```

### 13.9. ツリー平坦化ロジック

```typescript
/** モックツリー（uncertainty-scope.json）の company ルート配下を平坦化 */
const flattenCompanyNodes = (nodes: RawNode[]): FlatDeptRow[] => {
  const result: FlatDeptRow[] = [];
  const companyNode = nodes.find((n) => n.key === 'company');
  if (!companyNode) return result;

  // company ノード自身を depth=0 として追加
  result.push({ key: companyNode.key, label: companyNode.label, prefix: '', uri: '', description: '', parentKey: null, parentLabel: '（ルート）', depth: 0 });

  const traverse = (ns: RawNode[], parentKey: string, parentLabel: string, depth: number) => {
    for (const n of ns) {
      result.push({ key: n.key, label: n.label, prefix: n.prefix ?? '', uri: n.uri ?? '', description: n.description ?? '', parentKey, parentLabel, depth });
      if (n.children) traverse(n.children, n.key, n.label, depth + 1);
    }
  };
  if (companyNode.children) traverse(companyNode.children, companyNode.key, companyNode.label, 1);
  return result;
};
```

**モックデータソース**: `frontend/mock/namespace/uncertainty-scope.json`（`company` ルートノードを含む JSON）

### 13.10. API連携

| 操作 | メソッド | エンドポイント | リクエストボディ |
|------|---------|--------------|----------------|
| ノード追加 | POST | `/api/v1/department-nodes` | `{ label, prefix, uri, description, parentKey }` |
| ノード更新（Prefix・説明・URI） | PUT | `/api/v1/department-nodes/:key` | `{ prefix, description, uri }` |
| ノード削除 | DELETE | `/api/v1/department-nodes/:key` | — |

> **注意**: すべての API が未実装の場合はローカル state の更新でフォールバックする。

---

## 14. Prefix 管理タブ（PrefixManagement）

### 14.1. 概要

名前空間ノードを選択した際に右ペインに表示される Prefix 管理コンポーネント。  
選択した名前空間スコープに紐づく Prefix 一覧の閲覧・追加・編集・削除・CSV インポート/エクスポート・組織共有を行う。

**コンポーネントファイル**: `frontend/src/components/namespace/PrefixManagement.tsx`

**Props**:

| Prop | 型 | デフォルト | 説明 |
|------|----|-----------|------|
| `globalOnly` | `boolean` | `false` | `true` のとき Global スコープの Prefix のみを表示。スコープ列を非表示にする |
| `showShareButton` | `boolean` | `false` | `true` のとき「組織に共有」ボタンを表示する（Personal ノード選択時） |
| `viewOnly` | `boolean` | `false` | `true` のとき追加・編集・削除操作を非表示にする（読み取り専用モード） |
| `selectedNsKey` | `string \| undefined` | `undefined` | 選択中の名前空間ノードキー。変更時にデータを再計算する |

### 14.2. レイアウト

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [🔍 Prefixを検索...]  [インポート] [エクスポート]  [＋ 行を追加] [保存] [キャンセル] │
├──────────────────────────────────────────────────────────────────────────────┤
│ □  Prefix ▲  │ 説明              │ スコープ         │ 操作              │
├──────────────────────────────────────────────────────────────────────────────┤
│ ☑  maiml     │ MaiML 標準        │ Global           │ 編集 非アクティブ  │
│ ☐  xsi       │ XML Schema Inst.  │ Global           │ 編集 非アクティブ  │
│ ☐  CorpA     │ Corp A 組織       │ LabA > ChemTeam  │ 編集 非アクティブ  │
├──────────────────────────────────────────────────────────────────────────────┤
│  全 N 件  < 1 >  20件/ページ ▼                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

チェック1件以上のとき、ツールバー上段にアクションバーが表示される：

```
┌──────────────────────────────────────────────────────────────────────────────┐
│               🏢 組織に共有（2件）  🗑 選択した Prefix を非アクティブ（2件） │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 14.3. テーブルカラム仕様

| カラム | dataIndex | 幅 | ソート | 説明 |
|--------|-----------|-----|--------|------|
| チェックボックス | （rowSelection） | — | - | 複数選択用。新規行（`_rowId`）はチェック不可 |
| Prefix | `prefix` | 140px | ✅（デフォルト昇順） | Prefix 文字列。編集中は `<Input size="small">` |
| 説明 | `description` | — (flex) | ✅ | Prefix の説明。編集中は `<Input size="small">` |
| スコープ | `scopePath` | 180px | ✅ | Prefix が属するスコープパス。`globalOnly=true` のとき非表示 |
| 操作 | — | 180px | - | 通常時: [編集] [非アクティブ/アクティブ]。編集中: [✔ 保存] [キャンセル]。`viewOnly=true` のとき操作列非表示 |

### 14.4. 型定義

```typescript
/** Prefix 管理テーブルの行データ型 */
interface PrefixRow {
  id: string;
  prefix: string;
  description: string;
  scopePath: string;   // スコープのフルパス（表示用）
  isActive?: boolean;  // アクティブ状態（false のとき行をグレーアウト）
  /** true のとき選択中ノードの祖先スコープの行（グレーアウト表示用） */
  _isAncestor?: boolean;
}

/** 新規追加行の型（保存前の一時データ） */
interface NewPrefixRow {
  _rowId: string;      // 一時ID（テーブル行キー用）
  prefix: string;
  description: string;
}

/** CSV インポート時のパース済み行データ */
interface PrefixCsvParsedRow {
  prefix: string;
  description: string;
}

/** 組織共有先の型 */
interface ShareTarget {
  key: string;   // 共有先名前空間ノードキー
  label: string; // 共有先の表示ラベル
}
```

### 14.5. ツールバー仕様

| ボタン | タイプ | 活性条件 | 動作 |
|--------|--------|---------|------|
| インポート | `default` | 常時（`viewOnly=false`） | CSVファイル選択 → 行を一括追加。BOM付きUTF-8対応 |
| エクスポート | `default` | 常時 | 選択行を `prefixes.csv` としてダウンロード。未選択時はエラー表示 |
| ＋ 行を追加 | `primary` | 常時（`viewOnly=false`） | テーブル先頭に新規入力行を追加 |
| 保存 | `primary` | 新規行が1件以上 | 全新規行を一括 POST 保存 |
| キャンセル | `default` | 新規行が1件以上 | 全新規行を破棄 |

**アクションバー（チェック1件以上のとき表示）**:

| ボタン | 表示条件 | 動作 |
|--------|---------|------|
| 🏢 組織に共有（N件） | `showShareButton=true` かつチェック1件以上 | `ShareScopeModal` を開く |
| 🗑 選択した Prefix を非アクティブ（N件） | チェック1件以上 | 確認ダイアログ後に一括非アクティブ化 |

### 14.6. インライン編集仕様

| 項目 | 仕様 |
|------|------|
| トリガー | 操作列「編集」ボタン押下 |
| 編集可能フィールド | `prefix`（`<Input>`）・`description`（`<Input>`） |
| 保存 | `PATCH /api/v1/namespaces/prefixes/:id` を呼び出して確定 |
| キャンセル | 変更を破棄して通常行に戻す |
| 同時編集 | 1行のみ（`editingId` state で管理） |

### 14.7. API連携

| 操作 | メソッド | エンドポイント | リクエストボディ |
|------|---------|--------------|----------------|
| Prefix 新規追加 | POST | `/api/v1/namespaces/prefixes` | `{ prefix, description, nsKey? }` |
| Prefix 編集保存 | PATCH | `/api/v1/namespaces/prefixes/:id` | `{ prefix, description }` |
| Prefix 組織共有 | POST | `/api/v1/namespaces/prefixes` | `{ prefix, description, nsKey: target.key }` |

> **注意**: API 失敗時は `message.warning` / `message.error` でユーザーに通知する。  
> 重複 Prefix 登録時（`selectedNsKey === 'user-010'` のモックケース）は `Modal.confirm` で警告を表示し、登録は続行する。

### 14.8. CSV インポート/エクスポート仕様

**エクスポート**:
- ヘッダー行: `prefix,description`
- 対象: `selectedPrefixIds` でチェックされた行のみ
- ファイル名: `prefixes.csv`
- 文字コード: UTF-8 BOM 付き（`\uFEFF`）

**インポート**:
- 対応形式: CSV（ヘッダー行あり、`prefix` 列必須、`description` 列任意）
- ダブルクォート内のカンマ・改行に対応
- 1行ずつ `POST /api/v1/namespaces/prefixes` で保存
- 成功・失敗件数を `message.success` / `message.warning` で通知

### 14.9. 組織共有（ShareScopeModal）連携

| 項目 | 仕様 |
|------|------|
| トリガー | アクションバー「🏢 組織に共有」ボタン（`showShareButton=true` かつチェック1件以上） |
| モーダル | `<ShareScopeModal>` を開き、共有先名前空間ノードをツリーで選択 |
| 確定時 | 選択中 Prefix を共有先 `nsKey` に向けて `POST /api/v1/namespaces/prefixes` でコピー |
| 結果通知 | 成功: `message.success`。部分失敗: `message.warning`（成功/失敗件数を表示） |

---

## 15. 重複提案モーダル（DuplicateSuggestModal）

### 15.1. 概要

用語管理（`TermManagement.tsx`）で用語を一括保存する際に**重複が検出された場合**に表示されるモーダル。  
重複した各用語に対して既存候補の中から1つを選択させ、確定後に統合登録を行う。

詳細仕様は [`ui_namespace_duplicate_suggest_modal.md`](./ui_namespace_duplicate_suggest_modal.md) を参照。

**コンポーネントファイル**: `frontend/src/components/namespace/DuplicateSuggestModal.tsx`

### 15.2. 表示トリガー

`TermManagement.tsx` の保存処理中、クライアントサイド重複チェックで重複が検出された場合に `setDuplicateModalOpen(true)` で表示される。

### 15.3. ダイアログ仕様

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Modal>` |
| タイトル | `t('duplicateSuggestModal.title')` ＋ `<WarningOutlined>` アイコン（#faad14） |
| 幅 | 520px |
| maskClosable | false |
| キーボード（Escキー） | false（誤操作防止） |

### 15.4. Props

| Prop | 型 | 説明 |
|------|----|------|
| `open` | `boolean` | モーダルの表示状態 |
| `entries` | `DuplicateTermEntry[]` | 重複が検出された用語リスト |
| `onClose` | `() => void` | キャンセル時コールバック |
| `onConfirm` | `(selections: Record<string, string>) => void` | 登録確定時コールバック（key: localName, value: 選択された候補の prefix） |

### 15.5. ボタン仕様

| ボタン | タイプ | 活性条件 | 動作 |
|--------|--------|---------|------|
| キャンセル | `default` | 常時 | `onClose()` を呼び出す |
| 登録 | `primary` | 全ての用語に候補選択済みの場合のみ | `onConfirm(selections)` を呼び出す |

### 15.6. 候補選択の仕組み

重複が検出された各用語に対してラジオグループで既存候補カードを表示する。全用語に選択が完了すると「登録」ボタンが活性化する。

---

## 16. 非アクティブ確認ダイアログ仕様

### 16.1. 概要

用語テーブルの操作列「非アクティブ」ボタン押下時に表示される確認ダイアログ。誤操作防止のため、非アクティブ化のみ確認を求める。

### 16.2. 表示トリガー・条件

| 操作 | 確認ダイアログ |
|------|--------------|
| 単行「非アクティブ」ボタン押下（`isActive === true`） | ✅ 表示する |
| 単行「アクティブ」ボタン押下（`isActive === false`） | ❌ 表示しない（即実行） |
| ツールバー一括「非アクティブ」ボタン押下 | ✅ 表示する |

### 16.3. ダイアログ仕様（`Modal.confirm`）

| 項目 | 値 |
|------|-----|
| タイトル | 「用語を非アクティブにしますか？」 |
| 本文 | 「`{localName}` を非アクティブにすると、MAIMLファイルでの参照が無効になります。」 |
| OK ボタン | 「非アクティブにする」（`danger` スタイル） |
| キャンセルボタン | 「キャンセル」 |
| 実装 | `Modal.confirm`（Ant Design） |

---

## 17. 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-08-25 | v2.6.0: §3.2.2 ツリーノードの用語数バッジ表示を左ペイン廃止・右ペイン上部（用語数+Prefix数）表示に変更。§12.3 チーム一覧のアクティブ/非アクティブボタン文言を「有効化/無効化」→「アクティブ/非アクティブ」に変更。§13.5 URI自動生成のドメイン部を `organization_cd` 固定→ルートグループCDに変更する仕様を追記。 | Cline |
| 2026-08-20 | v2.5.0: §15 `DuplicateSuggestModal` 仕様をソース実態に合わせて全面修正。表示トリガー・幅・Props（`entries`/`onClose`/`onConfirm`）・ボタン仕様（登録は全選択時のみ活性）・候補選択の仕組みを更新。詳細は `ui_namespace_duplicate_suggest_modal.md` を参照するよう追記 | Cline |
| 2026-07-15 | v2.4.0: §3.2.2 `NewTermRow` 型に `_isDuplicate` フィールドを追加。§14.4 `PrefixRow` 型に `_isAncestor` フィールドを追加。§15 `DuplicateSuggestModal` コンポーネント仕様（表示トリガー・ダイアログ仕様・Props・ボタン仕様・重複チェックの仕組み）を新規追加。§16 非アクティブ確認ダイアログ仕様（表示トリガー・条件・`Modal.confirm` 仕様）を新規追加。旧§15 更新履歴を§17に繰り下げ | Cline |
| 2026-07-15 | v2.3.0: §2.2 タブ構成の key='4' ラベルを「テンプレート管理」→「名前空間管理」に修正。§12.5 `Team` 型定義に `departmentName`・`ownerUserId`・`nsPrefix` フィールドを追加。§12.7 `DUMMY_TEAMS` ダミーデータに `departmentName`・`ownerUserId`・`nsPrefix` を追記。§14 `PrefixManagement` コンポーネント仕様（Props・レイアウト・テーブルカラム・型定義・ツールバー・インライン編集・API連携・CSV仕様・共有連携）を新規追加。旧§14「更新履歴」を§15に繰り下げ | Cline |
| 2026-07-07 | v2.2.0: §2.2 タブ構成を修正（key='4' は `<UncertaintyManagement />` であることを明記）。§13 `DepartmentTreeManagement`（部署ノード管理テーブル）を新規追加 | Cline |
| 2026-06-05 | v1.0.0: 初版作成（3ペイン構成） | Cline |
| 2026-06-05 | v1.1.0: 2ペイン構成に変更。詳細表示/XMLプレビューをモーダルダイアログ方式に変更 | Cline |
| 2026-06-05 | v1.2.0: 左ペイン幅30%に拡大。詳細モーダルXMLプレビュータブ廃止。ボタン絵文字削除 | Cline |
| 2026-06-12 | v1.3.0: 実装との差異を反映：インポート/エクスポート/一括削除ボタン追加、単位カラム追加、詳細ボタン削除、型選択肢修正、ヘッダーチェックボックス仕様追記、ページネーション追記、複数インライン行対応、ツリーコンテキストメニュー追記、Term型定義更新 | Cline |
| 2026-06-12 | v1.4.0: 実装との差異を反映：左ペイン「名前空間を追加」ボタン削除、ツールバー「キャンセル」ボタン追加、インライン編集キャンセルボタン修正（✕→キャンセル）、削除確認モーダルボタン順追記、コンテキストメニュー表示条件修正、型定義更新（NamespaceNode/FlatNsNode/NewTermRow）、API連携セクション追加、保存バリデーション追記、CSVエクスポート仕様修正、モックデータソース修正 | Cline |
| 2026-06-18 | v1.5.0: コンテキストメニューをチームノード専用に修正、エクスポート仕様修正（選択中の用語のみ）、7.1から「名前空間を追加」ボタンイベント削除、インライン編集（セクション8）・チーム追加ダイアログ（セクション9）・チーム編集ダイアログ（セクション10）を新規追加 | Cline |
| 2026-06-23 | v1.6.0: 実装との差異を反映：NewTermRow 型に `prefix` フィールドを追加 | Cline |
| 2026-06-29 | v1.7.0: 「組織に共有」機能（セクション11）を新規追加：Personal 選択 + チェックあり時の右端ボタン表示・共有先チームレベル制限・確認モーダル仕様・共有後の動作・モックデータ型定義 | Cline |
| 2026-06-30 | v1.8.0: サブタブ（用語管理 / チーム管理）追加：画面全体構造にタブを追記、チーム管理タブ（TeamManagementPanel）を新セクション12として追加、TeamAddDialog に名前空間Prefix・URI自動生成フィールドを追記、URI自動生成ユーティリティ（generateNamespaceUri）を追記 | Cline |
| 2026-07-01 | v1.9.0: 実装との差異を反映：Section 2.2 を「サブタブ構成」→「ExperimentAdminMenu のトップレベルタブ構成」に修正（チーム管理は NamespaceMain のサブタブではなく独立タブ key='5'）。Section 9（TeamAddDialog）に名前空間URI自動生成フィールド追記・メンバー選択UI を単数選択＋タグ方式に修正。Section 12（TeamManagementPanel）のレイアウト・左ペインヘッダー（「チームを作成」ボタン位置）・リスト項目（メンバー数表示・編集ボタン削除）・右ペイン（Prefix非表示・ロールカラム削除・「＋メンバーを追加」→「編集」ボタンに変更）・型定義（nsPrefix 削除）・ダミーデータを実装に合わせて更新 | Cline |
| 2026-07-02 | v2.0.0: 用語テーブルカラムを QName 単一列→Prefix+ローカル名+スコープの3列に分割。操作ボタンを「削除」→「非アクティブ/アクティブ」切替に変更。ツールバー一括操作も「削除」→「非アクティブ」に変更（StopOutlined アイコン）。Term 型定義に `isActive` フィールドを追加。Section 11「組織に共有」機能を ShareScopeModal（ツリー選択式・共有先を都度選択）仕様に全面書き換え。 | Cline |
