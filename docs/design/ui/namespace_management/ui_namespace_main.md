# MaiML 名前空間管理ツール メイン画面 UI設計書

## メタデータ
---
title: MaiML 名前空間管理ツール メイン画面 UI設計書
category: UI設計
version: 1.5.0
last_updated: 2026-06-18
author: Development Team
tags: [namespace, maiml, main, 2pane, term-list, import-export, bulk-delete, pagination, context-menu, cancel-button, api-fetch]
---

## 変更履歴
| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2026-06-05 | 初版作成（3ペイン構成） |
| 1.1.0 | 2026-06-05 | 2ペイン構成に変更。詳細表示/XMLプレビューをモーダルダイアログ方式に変更 |
| 1.2.0 | 2026-06-05 | 左ペイン幅30%に拡大。詳細モーダルXMLプレビュータブ廃止。ボタン絵文字削除 |
| 1.3.0 | 2026-06-12 | 実装との差異を反映：インポート/エクスポート/一括削除ボタン追加、単位カラム追加、詳細ボタン削除、型選択肢修正、ヘッダーチェックボックス仕様追記、ページネーション追記、複数インライン行対応、ツリーコンテキストメニュー追記、Term型定義更新 |
| 1.4.0 | 2026-06-12 | 実装との差異を反映：左ペイン「名前空間を追加」ボタン削除、ツールバー「キャンセル」ボタン追加、インライン編集キャンセルボタン修正（✕→キャンセル）、削除確認モーダルボタン順追記、コンテキストメニュー表示条件修正、型定義更新（NamespaceNode/FlatNsNode/NewTermRow）、API連携セクション追加、保存バリデーション追記、CSVエクスポート仕様修正、モックデータソース修正 |
| 1.5.0 | 2026-06-18 | 実装との差異を反映：コンテキストメニューをチームノード専用に修正、型初期値を「未選択」に修正、エクスポート仕様修正（選択中の用語のみ）、7.1から「名前空間を追加」ボタンイベント削除、インライン編集キャンセルボタン記述修正、チーム追加/編集ダイアログセクション追加、API連携セクション追加 |

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
| 用語数バッジ | 名前空間に紐づく用語数を `[N]` 形式で表示 |
| URI省略 | 30文字超の場合 `...` で省略 |

**ツリーノードのコンテキストメニュー（右クリック）**:

> ⚠️ **実装の仕様**: コンテキストメニューは**チームノード（depth 3 = company > 部門 > グループ > チーム）のみ**に表示される。他のノード（グローバル / 個人 / 組織ルート / 部門 / グループ）には表示されない。

| メニュー項目 | アイコン | 表示条件 | 動作 |
|-------------|---------|---------|------|
| チームを追加 | `<PlusOutlined />` | チームノード（depth 3）のみ | チーム追加ダイアログを開く |
| 編集 | `<EditOutlined />` | チームノード（depth 3）のみ | チーム編集ダイアログを開く（メンバー変更） |

**チームノードの depth 判定**:

`renderTreeTitle()` 関数内の `companyDepth` パラメータが `3` のノードがチームノードとして判定される。

```
company（depth 1）
  └── 部門（depth 2）
        └── グループ（depth 3） ← コンテキストメニュー表示
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
  localName: string;
  displayName: string;
  displayNameEn: string;
  description: string;
  type: string;
  unitHint: string;
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

| カラム | dataIndex | 幅 | ソート | 説明 |
|--------|-----------|-----|--------|------|
| チェックボックス | （rowSelection） | 40px | - | 複数選択用（カスタムヘッダー） |
| QName | `qname` | 220px | 有効（デフォルト昇順） | `prefix:localName` 形式 |
| 表示名 | `displayName` | 130px | 有効 | 用語の日本語表示名 |
| 説明 | `description` | 180px | 有効 | 用語の説明文（省略表示） |
| 型 | `type` | 140px | 有効 | 型ヒント（stringType / floatType 等） |
| 単位 | `unitHint` | 100px | 有効 | 単位ヒント（任意） |
| 操作 | （actions） | 130px | - | 編集（✏）・削除（🗑）ボタン |

**操作ボタン仕様**:

| ボタン | アイコン | 動作 |
|--------|---------|------|
| 編集 | `<EditOutlined />` | インライン編集行に切り替え |
| 削除 | `<DeleteOutlined />` | 確認ダイアログ後に削除 |

> **注意**: 詳細ボタン（📋）は廃止。操作列には「編集」「削除」のみ。

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
| 選択した用語を削除（N件） | `danger` | `<DeleteOutlined />` | 1件以上選択時のみ表示 | 確認ダイアログ後に一括削除 |
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
| チームノード右クリック → チームを追加 | チーム追加ダイアログを開く（セクション9参照） |
| チームノード右クリック → 編集 | チーム編集ダイアログを開く（セクション10参照） |

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

## 9. チーム追加ダイアログ（TeamAddDialog）

### 9.1. 概要

左ペインのチームノードを右クリック → 「チームを追加」を選択すると表示される。  
新しいチーム（`department_unit`）を DB に作成し、メンバーを設定する。

### 9.2. ダイアログ仕様

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Modal>` |
| タイトル | 「チームを追加」 |
| 幅 | 480px |
| maskClosable | false |
| コンポーネントファイル | `frontend/src/components/namespace/TeamAddDialog.tsx` |

### 9.3. レイアウト

```
┌────────────────────────────────────────┐
│ チームを追加                       [✕] │
├────────────────────────────────────────┤
│ 追加先                                 │
│  [CorpA / LabA]（青タグ）              │
│                                        │
│ チーム名 *                             │
│ [チーム名を入力...                   ] │
│                                        │
│ メンバー（任意）                       │
│ [名前で検索して選択...         ▼     ] │
│ ※メンバーはあとから「編集」で追加可    │
├────────────────────────────────────────┤
│              [キャンセル] [作成]        │
└────────────────────────────────────────┘
```

### 9.4. フィールド仕様

| フィールド | コンポーネント | 必須 | 説明 |
|-----------|--------------|------|------|
| 追加先 | `<Tag color="blue">` | — | 親ノードのラベルを表示（読み取り専用） |
| チーム名 | `<Input>` | ✅ | 新規チーム名（空の場合「作成」ボタン非活性） |
| メンバー | `<Select mode="multiple">` | 任意 | 組織内ユーザーを名前で検索して複数選択 |

### 9.5. ボタン仕様

| ボタン | タイプ | 活性条件 | 動作 |
|--------|--------|---------|------|
| キャンセル | `default` | 常時（loading 中は非活性） | 入力をリセット → ダイアログを閉じる |
| 作成 | `primary` | チーム名が1文字以上の場合 | DB にチームを作成 → メンバーを設定 → ツリーに反映 |

### 9.6. API連携

| ステップ | メソッド | エンドポイント | 内容 |
|---------|---------|--------------|------|
| ① ユーザー一覧取得（ダイアログ open 時） | GET | `/api/v1/department-units/users` | 組織内ユーザー一覧を取得してメンバー選択肢に使用 |
| ② チーム作成 | POST | `/api/v1/department-units` | `unitName`, `departmentCd`, `layer: 1` を送信 |
| ③ メンバー設定（members > 0 の場合） | PUT | `/api/v1/department-units/:id/members` | `{ userIds: string[] }` を送信 |

---

## 10. チーム編集ダイアログ（TeamEditDialog）

### 10.1. 概要

左ペインのチームノードを右クリック → 「編集」を選択すると表示される。  
既存チームのメンバー構成を変更し DB に保存する。

### 10.2. ダイアログ仕様

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Modal>` |
| タイトル | 「編集」 |
| 幅 | 480px |
| maskClosable | false |
| コンポーネントファイル | `frontend/src/components/namespace/TeamEditDialog.tsx` |

### 10.3. レイアウト

```
┌────────────────────────────────────────┐
│ 編集                               [✕] │
├────────────────────────────────────────┤
│ チーム                                 │
│  [TeamX]（青タグ）                     │
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
| チーム | `<Tag color="blue">` | 編集対象チーム名（読み取り専用） |
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

## 11. 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-06-05 | v1.0.0: 初版作成（3ペイン構成） | Cline |
| 2026-06-05 | v1.1.0: 2ペイン構成に変更。詳細表示/XMLプレビューをモーダルダイアログ方式に変更 | Cline |
| 2026-06-05 | v1.2.0: 左ペイン幅30%に拡大。詳細モーダルXMLプレビュータブ廃止。ボタン絵文字削除 | Cline |
| 2026-06-12 | v1.3.0: 実装との差異を反映：インポート/エクスポート/一括削除ボタン追加、単位カラム追加、詳細ボタン削除、型選択肢修正、ヘッダーチェックボックス仕様追記、ページネーション追記、複数インライン行対応、ツリーコンテキストメニュー追記、Term型定義更新 | Cline |
| 2026-06-12 | v1.4.0: 実装との差異を反映：左ペイン「名前空間を追加」ボタン削除、ツールバー「キャンセル」ボタン追加、インライン編集キャンセルボタン修正（✕→キャンセル）、削除確認モーダルボタン順追記、コンテキストメニュー表示条件修正、型定義更新（NamespaceNode/FlatNsNode/NewTermRow）、API連携セクション追加、保存バリデーション追記、CSVエクスポート仕様修正、モックデータソース修正 | Cline |
| 2026-06-18 | v1.5.0: コンテキストメニューをチームノード専用に修正、エクスポート仕様修正（選択中の用語のみ）、7.1から「名前空間を追加」ボタンイベント削除、インライン編集（セクション8）・チーム追加ダイアログ（セクション9）・チーム編集ダイアログ（セクション10）を新規追加 | Cline |
