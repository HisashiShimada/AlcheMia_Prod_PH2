# MaiML 名前空間管理ツール MaiMLファイルエディター UI設計書

## メタデータ
---
title: MaiML 名前空間管理ツール MaiMLファイルエディター UI設計書
category: UI設計
version: 2.0.0
last_updated: 2026-06-19
author: Development Team
tags: [namespace, maiml, editor, xmlns, auto-apply, confirm-view]
---

## 関連ドキュメント
- [メイン画面](ui_namespace_main.md)
- [名前空間追加ダイアログ](ui_namespace_add_dialog.md)

---

## 1. 概要

### 1.1. 目的

現在編集中のMaiMLファイルに**自動適用されている名前空間の確認**、および不要な名前空間の**除外**を行うダイアログ画面。

名前空間はMaiML作成時に以下のルールで自動的に適用される（手動での追加操作は不要）：

| カテゴリ | 適用ルール |
|---------|-----------|
| **Global** | `global_flg = true` の名前空間を全て自動適用 |
| **組織階層** | ログインユーザーの所属チームから会社トップまで、階層を遡って全て自動適用 |
| **個人** | ログインユーザーの個人名前空間（1人1つ）を自動適用 |

### 1.2. 利用権限

- **実験管理者 (Experiment Admin)**: 使用可能
- **データ管理者 (Data Admin)**: 使用可能

### 1.3. 表示トリガー

- ペトリネットエディター（`/namespace-petri-editor`）のツールバー「🌐 名前空間」ボタン押下

### 1.4. 表示形式

- **Ant Design `<Modal>`** コンポーネントによるダイアログ表示
- 幅: 640px
- スクロール: モーダル本文内でスクロール（`max-height: calc(100vh - 180px)`）

---

## 2. 画面レイアウト

### 2.1. 全体構造

```
┌──────────────────────────────────────────────────────┐
│  このMaiMLファイルに設定されている名前空間          ×  │
├──────────────────────────────────────────────────────┤
│  以下の名前空間が自動的に適用されています。            │
│  不要なものは × で除外できます。                      │
├──────────────────────────────────────────────────────┤
│  maiml      [自動]  http://www.maiml.org/schemas    × │
│  xsi        [自動]  http://www.w3.org/2001/...      × │
│  CorpA      [自動]  https://www.corpa.co.jp/        × │
│  rd         [自動]  https://www.corpa.co.jp/rd/     × │
│  materials  [自動]  https://corpa.co.jp/rd/mat/     × │
│  MyWord     [自動]  https://orcid.org/...           × │
├──────────────────────────────────────────────────────┤
│                      6 件の名前空間が設定されています  │
└──────────────────────────────────────────────────────┘
```

---

## 3. コンポーネント仕様

### 3.1. ダイアログヘッダー

| 項目 | 値 |
|------|-----|
| タイトル | 「このMaiMLファイルに設定されている名前空間」 |
| スタイル | `fontSize: 16, fontWeight: 600` |
| 閉じるボタン | 右上 × ボタン（Ant Design デフォルト） |
| maskClosable | `false`（背景クリックでは閉じない） |

### 3.2. 説明テキスト

| 項目 | 値 |
|------|-----|
| 内容 | 「以下の名前空間が自動的に適用されています。不要なものは × で除外できます。」 |
| スタイル | `type="secondary"`, `fontSize: 13` |

### 3.3. 名前空間リスト

**コンポーネント**: `<List>` (Ant Design)

**各リストアイテム仕様**:

| 要素 | 内容 |
|------|------|
| prefix | 太字、左端固定幅（`minWidth: 80px`） |
| [自動] バッジ | `<Tag color="blue">自動</Tag>` — `auto: true` のアイテムのみ表示 |
| URI | グレー文字、省略表示（`text-overflow: ellipsis`）、ホバーで全文表示（`title` 属性） |
| 除外ボタン（×） | `<Button size="small" danger icon={<CloseOutlined />}>`。ホバー時 `<Tooltip title="除外">` |

**空の場合**: 「設定されている名前空間がありません」を表示

### 3.4. 件数表示

- リスト下部に「N 件の名前空間が設定されています」を右寄せで表示
- `type="secondary"`, `fontSize: 12`

---

## 4. インタラクション仕様

### 4.1. 除外操作（× ボタン）

#### 通常除外（使用中の用語なし）

1. × ボタンをクリック
2. 即座にリストから削除
3. `message.success` で「「{prefix}」をこのMaiMLファイルの宣言から除外しました」を表示

#### 使用中の名前空間を除外する場合

対象 prefix を使用している用語が存在する場合、確認ダイアログを表示：

```
┌─────────────────────────────────────────┐
│  使用中の名前空間                         │
│                                         │
│  「{prefix}」は {N} 件の用語で使用中です。 │
│  本当に除外しますか？                     │
│                                         │
│  [キャンセル]  [除外する（危険）]          │
└─────────────────────────────────────────┘
```

| ボタン | 動作 |
|--------|------|
| キャンセル | ダイアログを閉じ、除外しない |
| 除外する | リストから削除し `message.success` を表示 |

### 4.2. ダイアログを閉じる

- 右上 × ボタンクリックで `onClose()` を呼び出してダイアログを閉じる

---

## 5. データ仕様

### 5.1. 名前空間アイテム型定義

```typescript
interface NsItem {
  key:    string;   // 名前空間の一意キー（例: "ns-maiml"）
  prefix: string;   // XMLプレフィックス（例: "maiml"）
  uri:    string;   // 名前空間URI（例: "http://www.maiml.org/schemas"）
  order:  number;   // 表示順序
  auto:   boolean;  // true = 自動適用、false = 手動追加（将来拡張用）
}
```

### 5.2. モックデータ（`frontend/mock/namespace/declaredNamespaces.json`）

```json
[
  { "key": "ns-maiml",     "prefix": "maiml",     "uri": "http://www.maiml.org/schemas",              "order": 1, "auto": true },
  { "key": "ns-xsi",       "prefix": "xsi",       "uri": "http://www.w3.org/2001/XMLSchema-instance", "order": 2, "auto": true },
  { "key": "ns-corpa",     "prefix": "CorpA",     "uri": "https://www.corpa.co.jp/",                  "order": 3, "auto": true },
  { "key": "ns-rd",        "prefix": "rd",        "uri": "https://www.corpa.co.jp/rd/",               "order": 4, "auto": true },
  { "key": "ns-materials", "prefix": "materials", "uri": "https://www.corpa.co.jp/rd/materials/",     "order": 5, "auto": true },
  { "key": "ns-myword",    "prefix": "MyWord",    "uri": "https://orcid.org/0000-0002-2494-9603",     "order": 6, "auto": true }
]
```

**自動適用の根拠**:
- `maiml`, `xsi` — Global（全組織共通）
- `CorpA`, `rd`, `materials` — ログインユーザー「山田 太郎」の所属（材料グループ）から上位階層（研究開発部 → 株式会社サンプルテック）を含む
- `MyWord` — ログインユーザー個人の名前空間

### 5.3. APIリクエスト例（宣言済み名前空間の保存）

```typescript
// PUT /api/v1/maiml/namespaces
const saveRequestBody = {
  maimlFileId: 'maiml-file-001',
  declaredNamespaces: [
    { prefix: 'maiml',     uri: 'http://www.maiml.org/schemas',              order: 1 },
    { prefix: 'xsi',       uri: 'http://www.w3.org/2001/XMLSchema-instance', order: 2 },
    { prefix: 'CorpA',     uri: 'https://www.corpa.co.jp/',                  order: 3 },
    { prefix: 'rd',        uri: 'https://www.corpa.co.jp/rd/',               order: 4 },
    { prefix: 'materials', uri: 'https://www.corpa.co.jp/rd/materials/',     order: 5 },
    { prefix: 'MyWord',    uri: 'https://orcid.org/0000-0002-2494-9603',     order: 6 },
  ],
};
```

---

## 6. コンポーネント構成

```
NamespaceMaimlEditor (Modal)
├── 説明テキスト (Text)
├── 名前空間リスト (List)
│   └── 各リストアイテム
│       ├── prefix (Text strong)
│       ├── [自動] バッジ (Tag) ← auto=true の場合のみ
│       ├── URI (Text secondary, ellipsis)
│       └── 除外ボタン (Button + Tooltip)
└── 件数表示 (Text)
```

---

## 7. Props

```typescript
export interface NamespaceMaimlEditorProps {
  open:    boolean;   // ダイアログの開閉状態
  onClose: () => void; // 閉じる時のコールバック
}
```

---

## 8. 更新履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-06-05 | 初版作成（左右2ペイン構成、手動追加方式） | Cline |
| 1.1.0 | 2026-06-05 | v1.1.0: パネルタイトル絵文字削除。「← 除去」ボタン廃止。各アイテム「→ 追加」ボタン廃止。右パネル×ボタンにTooltip「削除」追加 | Cline |
| 2.0.0 | 2026-06-19 | 設計見直し：名前空間の自動適用ルール確定に伴い1カラム確認ビューに変更。左パネル・中央追加ボタン・D&D機能を廃止。「自動」バッジ追加。除外は × ボタンのみ | Cline |
