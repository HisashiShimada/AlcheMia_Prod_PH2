# タスク計画書: 進捗確認タブ トランジション未表示修正

## メタデータ
- **作成日時**: 2026-09-03 01:20
- **タスクID**: 20260903_0120
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

作業者画面の「進捗確認」タブでトランジション情報が0件表示される問題を修正する。

### 根本原因（調査済み）

**MAIMLファイル内に重複した XML 名前空間属性（xmlns:test）が存在する**

```xml
<!-- 問題のあるMAIMLファイルの冒頭部分 -->
xmlns:test="https://ORG001-AIML.Alchemia.co.jp/testGroup6/testGrp7/testGrp8"
xmlns:test="https://ORG001-AIML.Alchemia.co.jp/DEP002"  ← 重複！
```

この重複属性により `@xmldom/xmldom` の `DOMParser` が `fatalError` をスロー →  
`parsePetriNetStructure` の catch ブロックで `{ success: false }` を返す →  
`progressService.downloadAndParseMAIML` が `MAIML_PARSE_FAILED` を返す →  
`transitions API` が 500 エラーを返す →  
フロントエンドで `transitions: []` として扱われ、0件表示される。

### 調査で確認したこと

- `project_task`, `project_task_detail` は正常（各1件）
- `transition_data` は正常（3件、全て status=2(PREPARING)）
- MAIMLファイルはストレージに存在（16KB）
- `worker-tasks API` は正常（methods:1, tasks:1）
- `transitions API` は 500エラー（MAIML_PARSE_FAILED）
- XMLパース時に `[xmldom fatalError] Attribute xmlns:test redefined` エラー発生

## 修正方針

`progressService.ts` の `parsePetriNetStructure` 呼び出し時に、`@xmldom/xmldom` の `DOMParser` の `errorHandler` をカスタマイズして `fatalError` を **警告として処理**し、パースを続行させる。

### 根拠
- `fatalError` 発生後もパース結果は正常（protocol/method/transition が取得できる）
- MAIMLファイルの重複 xmlns は過去に作成されたファイルで発生する可能性があり、再発防止として実装側で対応が必要
- MAIMLファイルは実験データを含む重要ファイルであり、ユーザーへの再登録要求はリスクが高い

## 実装ステップ
- [x] Step 1: 根本原因の調査・特定（完了）
- [x] Step 2: `maimlService.ts` の `parsePetriNetStructure` を修正
  - `DOMParser` にカスタム `errorHandler` を設定して `fatalError` を警告ログに留めパース続行
- [x] Step 3: APIの動作確認
  - `transitions API` が 200 で3件返ることを確認

## 変更ファイル
1. `backend/src/services/maimlService.ts` - `parsePetriNetStructure` で DOMParser の errorHandler をカスタマイズ（完了）

## 承認記録
- **承認日時**: 2026-09-03 01:20（Act モードで自動実行）

## 実施記録

### 実施日時
開始: 2026-09-03 01:00
完了: 2026-09-03 01:10

### 調査で判明した事実
1. DBデータは全て正常（project_task, project_task_detail, transition_data 各レコード存在）
2. MAIMLファイルはストレージに存在（16KB）
3. `worker-tasks API`（200）は正常
4. `transitions API`（500）が `MAIML_PARSE_FAILED` を返していた
5. MAIMLファイルに重複した `xmlns:test` 属性が存在:
   - `xmlns:test="https://ORG001-AIML.Alchemia.co.jp/testGroup6/testGrp7/testGrp8"`
   - `xmlns:test="https://ORG001-AIML.Alchemia.co.jp/DEP002"` ← 重複
6. `@xmldom/xmldom` の `DOMParser` はデフォルトで `fatalError` をスローする仕様

### 修正内容
`backend/src/services/maimlService.ts` の `parsePetriNetStructure` 関数内の `DOMParser` インスタンス生成時に `errorHandler` オプションを追加。
`fatalError` コールバックで例外をスローせずに警告ログに記録し、パースを続行するよう変更。

### 動作確認
- `transitions API` → 200 OK、3件のトランジション返却確認
- transition_id: `transition-1782799776645`, `transition-1782799822759`, `transition-1782799846669`（全て status=2: PREPARING）

