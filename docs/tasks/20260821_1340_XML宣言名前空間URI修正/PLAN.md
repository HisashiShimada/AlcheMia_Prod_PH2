# タスク計画書: XML宣言部分の名前空間URI注入バグ修正

## メタデータ
- **作成日時**: 2026-08-21 13:40
- **タスクID**: 20260821_1340_XML宣言名前空間URI修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

XMLビューで `xmlns="aaa"` のような不正な名前空間URIが注入され、XMLパースエラーが発生している。

## 原因

`frontend/src/services/namespaceApiService.ts` の `getOrganizationNamespaces()` において、
`GET /api/v1/namespaces/declarations` から取得した組織のベースURI（prefixなし）を
デフォルト名前空間（`prefix: ''`）として注入しているため、
グローバル宣言から変換した `xmlns="http://www.maiml.org/schemas"` と衝突し、
`xmlns=""` が2つ出力されてXMLパースエラーになる。

```
xmlns="http://www.maiml.org/schemas"  ← グローバル宣言から（正しい）
xmlns="aaa"                           ← 組織URIを誤ってデフォルトNSとして注入（問題）
```

## 修正内容

`getOrganizationNamespaces()` から `orgEntries` の生成・マージを削除する。
組織のベースURIは単体の識別子であり、XMLへの注入は `prefix` テーブルに登録された
`prefix + uri` ペアのみが対象。

## 変更ファイル
1. `frontend/src/services/namespaceApiService.ts` - `orgEntries` の生成・マージを削除

## 承認記録
- **承認日時**: 2026-08-21 13:44

## 実施記録

### 実施日時
完了: 2026-08-21 14:25

### 実装内容

`frontend/src/services/namespaceApiService.ts` の `getOrganizationNamespaces()` に以下の防御処理を追加した。

#### 調査で判明した実際の原因

PLAN.md 記載の「orgEntries 削除」は既に適用済みだったが、**`global-declarations.csv` 自体に不正なデータ**が含まれていたことが真の原因。

具体的には以下のエントリが CSV に登録されていた：
- `Alchemia,https://Alchemia.co.jp` → `xmlns:Alchemia="https://Alchemia.co.jp"` として注入
- prefix 空文字 + `uri="aaa"` → `xmlns="aaa"` として注入（絶対 URI でないためパースエラー）
- `maiml` prefix の変換で既に `prefix=''` が生成されるため、さらに `xmlns="aaa"` が重複

#### 修正内容

`getOrganizationNamespaces()` の `convertedGlobals` 生成後に以下の防御処理を追加：

1. **URI バリデーション**: RFC 3986 準拠の簡易判定（`/^[a-zA-Z][a-zA-Z0-9+\-.]*:/`）で絶対 URI でないエントリをスキップ
2. **prefix 重複除去（先勝ち）**: 同一 prefix の2件目以降をスキップし `xmlns=""` の二重出力を防ぐ

これにより CSV に不正データが混入していても XML パースエラーが発生しなくなる。
