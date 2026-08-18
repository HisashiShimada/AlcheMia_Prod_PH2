# CSV/XMLインポート機能 仕様詳細書

- **対象実装**: Phase3（`docs/tasks/20260727_0949_Insertion機能改修/PLAN.md`）
- **作成日**: 2026-07-27

---

## 1. 概要

実験作業画面（WorkRecordPanel）の「**Content 追加**」ボタンから起動する DataGrid エディタに、CSV または XML ファイルを読み込んで 2次元数値配列を一括インポートする機能。

---

## 2. コンポーネント構成

```
WorkRecordPanel.tsx
└── ContentGridEditor.tsx          UI コンポーネント
    └── useContentGridEditor.ts    ロジックフック
        └── dataGridImporter.ts    CSV/XML → number[][] 変換ユーティリティ
                ├── papaparse      CSV パースライブラリ
                └── xml-js         XML パースライブラリ
```

### ファイルパス一覧

| ファイル | 役割 |
|--------|------|
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 「Content 追加」ボタン、ContentGridEditor のマウント・state 管理 |
| `frontend/src/components/common/ContentGridEditor.tsx` | DataGrid UI（表示・操作・ファイル入力要素） |
| `frontend/src/hooks/useContentGridEditor.ts` | 行/列 CRUD・インポートロジック・DnD ハンドラ |
| `frontend/src/utils/dataGridImporter.ts` | CSV/XML テキスト → `number[][]` 変換（UI 非依存） |

---

## 3. 利用の流れ

1. `WorkRecordPanel` で作業中のトランジションを表示する
2. 「**Content 追加**」ボタンをクリック → カスタム Content スロット（`ContentGridEditor`）が追加される
3. 初期状態は **1行 × 1列 / 値 0** の DataGrid が表示される
4. インポート操作によりファイルの数値データで DataGrid を上書きする
5. インポート後も手動でセル編集・行列追加/削除が可能

---

## 4. インポート操作方法

### 4-1. ファイル選択ダイアログ

- ContentGridEditor ヘッダー右側の **「↓（ImportOutlined）」ボタン** をクリック
- OS のファイルダイアログが開く
- 受け付けるファイル拡張子: `.csv`, `.xml`（`<input accept=".csv,.xml">`）

### 4-2. ドラッグ＆ドロップ（DnD）

- ContentGridEditor のグリッド枠内にファイルをドラッグすると、枠の色が青点線に変わる（ドラッグ中のビジュアルフィードバック）
- ドロップするとインポートが実行される

---

## 5. CSVパース仕様

### 5-1. 使用ライブラリ

`papaparse` ^5.5.3（プロトタイプ汚染対策のため `worker: false`、`dynamicTyping: false` で実行）

### 5-2. パースルール

| 項目 | 動作 |
|------|------|
| ヘッダー行 | 自動検出しない。全行をデータ行として処理する |
| 空行 | `skipEmptyLines: true` でスキップ |
| 区切り文字 | papaparse の自動判定（通常カンマ）|
| 各セルの処理 | `cellToNumber()` で数値に変換。変換できない場合は `0` に変換し警告を記録 |
| 空列 | 列数が行ごとに異なる場合は短い行のセルが `0` で埋まる（`colCount = Math.max(...)`） |

### 5-3. 関連関数

```
parseCsvToGrid(text: string): ImportResult    テキスト→ number[][]（同期）
parseCsvFileToGrid(file: File, options?): Promise<ImportResult>   File→ number[][]（非同期）
```

---

## 6. XMLパース仕様

### 6-1. 使用ライブラリ

`xml-js` ^1.6.11（`compact: false` モードで ElementTree として処理）

### 6-2. 対応パターン（5種）

XMLツリーを再帰探索し、以下のいずれかのパターンに一致するノードから数値行を収集する。

#### パターン① `<content>` 直接テキスト

```xml
<root>
  <content>1.0 2.5 3.0</content>
  <content>4.0 5.5 6.0</content>
</root>
```
→ スペース区切りのトークンを1行として収集。2行4列の結果になる。

#### パターン② `<content>` + `<value>` 子タグ

```xml
<root>
  <content>
    <value>1.0</value>
    <value>2.5</value>
    <value>3.0</value>
  </content>
</root>
```
→ `<value>` 子タグの値を1列として横に並べ1行を構成する。

#### パターン③ `<data>` + `<row>` タグ

```xml
<data>
  <row>1.0 2.5 3.0</row>
  <row>4.0 5.5 6.0</row>
</data>
```
→ 各 `<row>` のテキストをスペース区切りで1行として収集。

#### パターン④ `<matrix>` + `<r>` タグ

```xml
<matrix>
  <r>1 2 3</r>
  <r>4 5 6</r>
</matrix>
```
→ `<r>` タグのテキストをスペース区切りで1行として収集。

#### パターン⑤ `<values>` 一括テキスト

```xml
<values>1.0 2.5 3.0 4.0 5.5 6.0</values>
```
→ スペース区切りのトークン全体を1行として収集（行数=1、列数=トークン数）。

### 6-3. 探索対象タグ名

`content` / `value` / `row` / `r` / `data` / `values`（大文字小文字を区別しない）

### 6-4. 関連関数

```
parseXmlToGrid(xmlText: string): ImportResult       テキスト→ number[][]（同期）
parseXmlFileToGrid(file: File, options?): Promise<ImportResult>   File→ number[][]（非同期）
```

---

## 7. ImportResult 型

```typescript
interface ImportResult {
  data: number[][];      // パース結果の2次元数値配列
  warnings: string[];    // 警告メッセージ一覧（空なら問題なし）
}
```

---

## 8. ファイルサイズ制限

| 項目 | 値 |
|------|-----|
| デフォルト上限 | **50 MB**（`DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024`）|
| 超過時 | `Error` をスロー → UIに「ファイルサイズが上限（50 MB）を超えています（X.X MB）」と表示 |
| カスタム上限 | `ContentGridEditor` の `maxFileSize` prop（バイト単位）で変更可能 |

---

## 9. インポート後の UI 動作

| 結果 | UIの動作 |
|------|---------|
| 成功 | 成功トースト「インポート完了: N行 × M列」を表示。DataGrid が更新される |
| 警告あり | 成功後、警告を先頭3件トースト表示。4件以上は「他 N 件の警告があります」を追加表示 |
| データ0件 | 警告トースト「インポートできるデータが見つかりませんでした」。DataGrid は更新されない |
| ファイルサイズ超過 | エラートースト「ファイルサイズが上限（50 MB）を超えています（X.X MB）」|
| 非対応拡張子 | エラートースト「CSVまたはXMLファイルを選択してください（.csv / .xml）」|
| XMLパースエラー | エラートースト「XMLのパースに失敗しました: {詳細}」|

---

## 10. 手動操作（インポート後も利用可能）

| 操作 | UI要素 | 動作 |
|------|--------|------|
| セル値変更 | InputNumber | 直接入力。数値以外は受け付けない |
| 行追加 | グリッド下部「行を追加」ボタン | 末尾に現在の列数分 `0` で埋めた行を追加 |
| 行削除 | 行番号左側のゴミ箱ボタン | 選択行を削除（最低1行は維持） |
| 列追加 | 列ヘッダー右端の「+」ボタン | 末尾に `0` 埋め列を追加 |
| 列削除 | 各列ヘッダーのゴミ箱ボタン | 選択列を削除（最低1列は維持） |
| グリッドクリア | ヘッダーの「クリア（ClearOutlined）」ボタン | **1行1列・値0** の初期状態に戻す |

---

## 11. state 管理

- グリッドデータは `WorkRecordPanel` の `taskTransitions` state 内、`actuals[`content_custom_${cid}`]` に `number[][]` として保存される
- `cid` は `handleContentAdd` 実行時に `Date.now().toString()` で採番される
- ページリロードで state はリセットされる（現時点では永続化なし）

---

## 12. 制限事項・既知の動作

| 項目 | 内容 |
|------|------|
| 整数・小数の扱い | `Number()` 変換のため、整数・小数ともに `number` 型で保存される |
| 負数 | インポート可能（`-1.5` などはそのまま数値として扱う） |
| 指数表記 | `1.5e3` などは `1500` として変換される |
| 空文字セル | `0` に変換し警告を記録する |
| XML 名前空間 | タグ名の `toLowerCase()` マッチのため、名前空間プレフィックス（`ex:content` 等）は**マッチしない** |
| 列数不揃いのCSV | 行ごとに列数が異なる場合、表示上は最大列数に揃い、短い行は `0` が補完される |
| MAIML連携 | 現時点ではモックデータで動作。実データ連携時は `template.contents` スロットへの対応が必要 |
