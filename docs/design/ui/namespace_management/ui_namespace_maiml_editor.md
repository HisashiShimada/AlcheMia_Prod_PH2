# MaiML 名前空間管理ツール MaiMLファイルエディター UI設計書

## メタデータ
---
title: MaiML 名前空間管理ツール MaiMLファイルエディター UI設計書
category: UI設計
version: 1.1.0
last_updated: 2026-06-05
author: Development Team
tags: [namespace, maiml, editor, xmlns, drag-and-drop, transfer]
---

## 関連ドキュメント
- [メイン画面](ui_namespace_main.md)
- [名前空間追加ダイアログ](ui_namespace_add_dialog.md)

---

## 1. 概要

### 1.1. 目的

MaiMLファイルに宣言する名前空間を管理するエディター画面。左パネルに「全体で登録されている名前空間」、右パネルに「現在のMaiMLファイルに宣言されている名前空間」を表示し、ドラッグ＆ドロップまたは追加/除去ボタンで左右を移動することで、MaiMLファイルのxmlns宣言を編集する。

### 1.2. 利用権限

- **実験管理者 (Experiment Admin)**: 使用可能
- **データ管理者 (Data Admin)**: 使用可能

### 1.3. 表示トリガー

- メイン画面の右ペイン「XMLプレビュー」タブの `[▶ MaiMLに適用]` ボタンクリック
- または直接URL遷移: `/namespace-management/editor`

---

## 2. 画面レイアウト

### 2.1. 全体構造

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  MaiML 名前空間管理ツール ― MaiMLファイルエディター                            │
├──────────────────────────────────────────────────────────────────────────────┤
│  ▼ [+ 名前空間を追加] 押下後 — 名前空間選択パネル                              │
├───────────────────────────────────────┬──────────────────────────────────────┤
│  📋 全体で登録されている名前空間        │  📌 現在のMaiMLファイルに宣言されている名前空間│
│  [🔍 名前空間を検索...]               │  ドラッグ＆ドロップ または 追加ボタン（→）で │
│                                       │  名前空間を追加                         │
│  ☐ 🌐 maiml  (グローバル)             │                                        │
│    http://www.maiml.org/schemas       │  maiml  ×  http://www.maiml.org/...    │
│                                       │                                        │
│  ☐ 🌐 xsi    (グローバル)             │  CorpA  ×  https://www.corpa.co.jp/   │
│    http://www.w3.org/2001/XMLSchema-i │                          [→ 追加]      │
│                              [→ 追加] │  xsi    ×  http://www.w3.org/2001/... │
│                              [← 除去] │                                        │
│  ☐ 🏢 CorpA  (組織)                   │  MyWord ×  https://orcid.org/...       │
│    https://www.corpa.co.jp/           │                                        │
│                                       │  LabA   ×  https://www.corpa.co.jp/lab/│
│  ☐ 🏢 LabA   (組織)                   │                                        │
│    https://www.corpa.co.jp/lab-a/     │                                        │
│                                       │                                        │
│  ☐ 👤 MyWord  (個人)                  │                                        │
│    https://orcid.org/0000-0002-...    │                                        │
└───────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 3. 左パネル：全体登録済み名前空間

### 3.1. レイアウト

```
┌──────────────────────────────────────────────────┐
│  📋 全体で登録されている名前空間                    │
├──────────────────────────────────────────────────┤
│  🔍 名前空間を検索...                              │
├──────────────────────────────────────────────────┤
│  ☐  🌐 maiml  (グローバル)                        │
│     http://www.maiml.org/schemas                  │
│                                                  │
│  ☐  🌐 xsi   (グローバル)                         │
│     http://www.w3.org/2001/XMLSchema-instance    │
│                                                  │
│  ☐  🏢 CorpA  (組織)                              │
│     https://www.corpa.co.jp/                     │
│                                                  │
│  ☐  🏢 LabA   (組織)                              │
│     https://www.corpa.co.jp/lab-a/               │
│                                                  │
│  ☐  👤 MyWord  (個人)                             │
│     https://orcid.org/0000-0002-2494-9603        │
└──────────────────────────────────────────────────┘
```

### 3.2. コンポーネント仕様

#### 3.2.1. パネルヘッダー

| 項目 | 値 |
|------|-----|
| タイトル | 「全体で登録されている名前空間」（絵文字なし） |
| スタイル | セクションタイトル（太字） |

#### 3.2.2. 検索入力

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Input>` |
| プレースホルダー | 「🔍 名前空間を検索...」 |
| allowClear | true |
| 検索対象 | 接頭辞（prefix）・URI・レベル名（部分一致） |

#### 3.2.3. 名前空間リスト（チェックボックス付き）

**コンポーネント**: `<List>` または `<Checkbox.Group>`

**各リストアイテム仕様**:

| 要素 | 内容 |
|------|------|
| チェックボックス | 複数選択対応（一括追加用） |
| レベルアイコン | 🌐（グローバル）/ 🏢（組織）/ 👤（個人） |
| 接頭辞 | prefix 文字列（太字） |
| レベルラベル | `(グローバル)` / `(組織)` / `(個人)` |
| URI | URI文字列（グレー、省略表示） |
| ドラッグハンドル | ドラッグ＆ドロップ操作用のハンドルアイコン（`⠿`） |

> **注意**: 各アイテム行に「→ 追加」個別ボタンは表示しない。追加は中央の「→ 追加」ボタン（チェック一括）のみで行う。

**既に右パネルに追加済みのアイテム**:
- チェックボックスを無効化（disabled）
- 行全体をグレーアウト表示

---

## 4. 中央：追加 / 除去ボタン

### 4.1. レイアウト

```
┌────────────┐
│  [→ 追加]  │
│            │
│  [← 除去]  │
└────────────┘
```

### 4.2. ボタン仕様

| ボタン | ラベル | タイプ | アイコン | 動作 |
|--------|--------|--------|---------|------|
| 追加ボタン | `→` | `primary` | `<ArrowRightOutlined />` | 左パネルで選択中（チェック済み）のアイテムを右パネルに移動 |

> **注意**: 「← 除去」ボタンは廃止。右パネルの各アイテム行にある「×（削除）」ボタンで個別除去する。

**追加ボタンの活性化条件**: 左パネルでチェックが1件以上ある場合のみ有効

> **注意**: チェック選択時に「選択したN件を追加」のようなボタンは表示しない。追加ボタン（→）のみで一括追加を行う。

---

## 5. 右パネル：現在のMaiMLファイル宣言済み名前空間

### 5.1. レイアウト

```
┌──────────────────────────────────────────────────┐
│  📌 現在のMaiMLファイルに宣言されている名前空間    │
│  ドラッグ＆ドロップ または 追加ボタン（→）で追加    │
├──────────────────────────────────────────────────┤
│  ⠿  maiml    ×  http://www.maiml.org/schemas     │
│  ⠿  CorpA    ×  https://www.corpa.co.jp/         │
│  ⠿  xsi      ×  http://www.w3.org/2001/...       │
│  ⠿  MyWord   ×  https://orcid.org/...            │
│  ⠿  LabA     ×  https://www.corpa.co.jp/lab-a/   │
└──────────────────────────────────────────────────┘
```

### 5.2. コンポーネント仕様

#### 5.2.1. パネルヘッダー

| 項目 | 値 |
|------|-----|
| タイトル | 「現在のMaiMLファイルに宣言されている名前空間」（絵文字なし） |
| サブテキスト | 「ドラッグ＆ドロップ または 追加ボタン（→）で名前空間を追加」 |

#### 5.2.2. 宣言済み名前空間リスト

**コンポーネント**: ドラッグ＆ドロップ対応リスト（`react-beautiful-dnd` または Ant Design `<List>` + drag ライブラリ）

**各リストアイテム仕様**:

| 要素 | 内容 |
|------|------|
| ドラッグハンドル | `⠿` アイコン（ドラッグで順序変更可能） |
| 接頭辞 | prefix 文字列（太字） |
| URI | URI文字列（グレー、省略表示） |
| 削除ボタン（×） | クリックで宣言から除去。**ホバー時にTooltip「削除」を表示**（`<Tooltip title="削除">`） |

**順序変更**: ドラッグ＆ドロップで xmlns宣言の順序を変更可能

---

## 6. ドラッグ＆ドロップ仕様

### 6.1. 対応操作

| 操作 | 動作 |
|------|------|
| 左パネルアイテム → 右パネルへドラッグ | 名前空間を宣言リストに追加 |
| 右パネルアイテム → 左パネルへドラッグ | 名前空間を宣言リストから除去 |
| 右パネル内でアイテムを上下ドラッグ | 宣言順序の変更 |

### 6.2. ドラッグ中のビジュアルフィードバック

| 状態 | 表示 |
|------|------|
| ドラッグ中アイテム | 半透明（opacity: 0.5）・影付き表示 |
| ドロップ可能エリア | 薄い青背景（`#e6f4ff`）でハイライト |
| ドロップ不可エリア | ドロップカーソル（🚫）を表示 |

---

## 7. モックデータ

### 7.1. 全体登録済み名前空間（左パネル）

```typescript
interface RegisteredNamespace {
  id: string;
  prefix: string;
  uri: string;
  level: 'global' | 'organization' | 'personal';
  levelLabel: string;
  levelIcon: string;
}

const registeredNamespacesMock: RegisteredNamespace[] = [
  {
    id: 'ns-maiml',
    prefix: 'maiml',
    uri: 'http://www.maiml.org/schemas',
    level: 'global',
    levelLabel: 'グローバル',
    levelIcon: '🌐',
  },
  {
    id: 'ns-xsi',
    prefix: 'xsi',
    uri: 'http://www.w3.org/2001/XMLSchema-instance',
    level: 'global',
    levelLabel: 'グローバル',
    levelIcon: '🌐',
  },
  {
    id: 'ns-qudt',
    prefix: 'qudt',
    uri: 'https://qudt.org/schema/qudt/',
    level: 'global',
    levelLabel: 'グローバル',
    levelIcon: '🌐',
  },
  {
    id: 'ns-corpa',
    prefix: 'CorpA',
    uri: 'https://www.corpa.co.jp/',
    level: 'organization',
    levelLabel: '組織',
    levelIcon: '🏢',
  },
  {
    id: 'ns-laba',
    prefix: 'LabA',
    uri: 'https://www.corpa.co.jp/lab-a/',
    level: 'organization',
    levelLabel: '組織',
    levelIcon: '🏢',
  },
  {
    id: 'ns-myword',
    prefix: 'MyWord',
    uri: 'https://orcid.org/0000-0002-2494-9603',
    level: 'personal',
    levelLabel: '個人',
    levelIcon: '👤',
  },
];
```

### 7.2. MaiMLファイル宣言済み名前空間（右パネル）

```typescript
interface DeclaredNamespace {
  id: string;
  prefix: string;
  uri: string;
  order: number;
}

const declaredNamespacesMock: DeclaredNamespace[] = [
  {
    id: 'ns-maiml',
    prefix: 'maiml',
    uri: 'http://www.maiml.org/schemas',
    order: 1,
  },
  {
    id: 'ns-corpa',
    prefix: 'CorpA',
    uri: 'https://www.corpa.co.jp/',
    order: 2,
  },
  {
    id: 'ns-xsi',
    prefix: 'xsi',
    uri: 'http://www.w3.org/2001/XMLSchema-instance',
    order: 3,
  },
  {
    id: 'ns-myword',
    prefix: 'MyWord',
    uri: 'https://orcid.org/0000-0002-2494-9603',
    order: 4,
  },
  {
    id: 'ns-laba',
    prefix: 'LabA',
    uri: 'https://www.corpa.co.jp/lab-a/',
    order: 5,
  },
];
```

### 7.3. 複数選択時の追加操作例

```typescript
// 左パネルで複数チェック → [→ 追加] ボタン押下時
const selectedNamespaceIds = ['ns-qudt', 'ns-corpa']; // チェック済みID

// 右パネルへの追加処理イメージ
const handleBulkAdd = (selectedIds: string[]) => {
  const toAdd = registeredNamespacesMock.filter(ns =>
    selectedIds.includes(ns.id) &&
    !declaredNamespacesMock.some(d => d.id === ns.id)
  );
  // declaredNamespacesに追記
};
```

### 7.4. APIリクエスト例（宣言済み名前空間の保存）

```typescript
// PUT /api/v1/maiml/namespaces
const saveRequestBody = {
  maimlFileId: 'maiml-file-001',
  declaredNamespaces: [
    { prefix: 'maiml', uri: 'http://www.maiml.org/schemas',           order: 1 },
    { prefix: 'CorpA', uri: 'https://www.corpa.co.jp/',               order: 2 },
    { prefix: 'xsi',   uri: 'http://www.w3.org/2001/XMLSchema-instance', order: 3 },
    { prefix: 'MyWord',uri: 'https://orcid.org/0000-0002-2494-9603',  order: 4 },
    { prefix: 'LabA',  uri: 'https://www.corpa.co.jp/lab-a/',         order: 5 },
  ],
};
```

### 7.5. APIレスポンス例（成功）

```typescript
const saveSuccessResponse = {
  success: true,
  data: {
    maimlFileId: 'maiml-file-001',
    xmlnsDeclaration: `xmlns="http://www.maiml.org/schemas"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:CorpA="https://www.corpa.co.jp/"
  xmlns:LabA="https://www.corpa.co.jp/lab-a/"
  xmlns:MyWord="https://orcid.org/0000-0002-2494-9603"`,
    updatedAt: '2026-06-05T08:30:00.000Z',
  },
  meta: {
    timestamp: '2026-06-05T08:30:00.000Z',
    requestId: 'req-xyz789',
  },
};
```

---

## 8. イベントハンドリング

### 8.1. 左パネル操作

| イベント | 処理 |
|---------|------|
| 検索入力変更 | 500msデバウンスでリストをフィルタリング |
| チェックボックス選択 | 選択状態を管理（複数選択対応）。追加ボタンの活性化判定を更新 |
| アイテムを右パネルへドラッグ | ドロップ成功時に右パネルへ追加、左パネルの当該アイテムをdisabled状態にする |

### 8.2. 中央ボタン操作

| イベント | 処理 |
|---------|------|
| [→ 追加] クリック | 左パネルのチェック済みアイテムを右パネルの末尾に追加。追加済みアイテムのチェックを解除してdisabledに設定 |
### 8.3. 右パネル操作

| イベント | 処理 |
|---------|------|
| ドラッグ＆ドロップ（右パネル内） | アイテムの表示順序を変更（xmlns宣言の順序変更） |
| ドラッグ＆ドロップ（左パネルへ） | 宣言リストから除去 |
| × ボタンクリック | 当該アイテムを宣言リストから除去。左パネルのdisabledを解除 |

### 8.4. 保存操作

| イベント | 処理 |
|---------|------|
| [💾 MaiMLに適用] クリック | 右パネルの現在の内容を API PUT で保存 → 成功時 `message.success` 表示 → メイン画面のXMLプレビューを更新 |

---

## 9. 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-06-05 | 初版作成 | Cline |
| 2026-06-05 | v1.1.0: パネルタイトル絵文字削除。「← 除去」ボタン廃止。各アイテム「→ 追加」ボタン廃止。右パネル×ボタンにTooltip「削除」追加 | Cline |
