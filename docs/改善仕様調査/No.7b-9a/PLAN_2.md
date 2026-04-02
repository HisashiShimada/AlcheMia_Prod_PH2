# タスク計画書: アップロード時MAIMLバリデーション追加

## メタデータ
- **作成日時**: 2026-03-31 16:48
- **タスクID**: upload-maiml-validation
- **優先度**: 高
- **推定工数**: 4〜6時間

## 1. タスク概要

MAIMLファイルをアップロードした際に、バリデーション（詳細解析）を実行する。

- **致命的エラー（`severity: 'error'`）がある場合** → アップロードを拒否（400）し、エラー内容をダイアログで表示する
- **警告のみ（`severity: 'warning'`）の場合** → アップロードを完了させ、警告内容をダイアログで表示する

また、以前の対応で `MaimlParserTyped` の型変換エラーも検出するようにしたが、バリデーション方式を `maimlParser.ts`（`analyzeMaiMLFile`）に**一本化**する。

## 2. 目的と期待される成果

### 目的
現在のアップロード処理（`fileAccessService.uploadFiles`）では、MAIMLファイルに対して `maimlAnalyzer.analyzeMaimlFile` という**簡易解析**（正規表現ベース）のみが実行されており、XML構文エラー・必須要素欠落・参照エラー・重複IDといった致命的な問題を検出できていない。

また、`MaimlParserTyped`（型変換）でのエラー検出も別途行われているが、バリデーション方式が分散している。

詳細バリデーション（`maimlParser.analyzeMaiMLFile`）に一本化し、アップロード完了後にその結果をフロントエンドのバリデーションダイアログで表示する。

### 期待される成果
- [ ] `.maiml` ファイルのアップロード時に詳細バリデーションが実行される
- [ ] `severity: 'error'` のエラーが1件以上ある場合はアップロードを拒否（400）し、エラー一覧をレスポンスに含める
- [ ] フロントエンドでアップロード拒否時にエラー内容をダイアログで表示する
- [ ] `severity: 'warning'` のみの場合はアップロードを完了させ、警告内容をレスポンスに含める
- [ ] フロントエンドでアップロード成功+警告ありの場合に警告内容をダイアログで表示する
- [ ] `MaimlParserTyped` の型変換エラーを `maimlParser.ts` のバリデーションフローに統合し、方式を一本化する
- [ ] `.maiml` 以外のファイルは従来どおりバリデーションなしでアップロード

## 3. 現状の整理

### 現在のアップロードフロー
```
POST /api/v1/files/upload
  → fileAccessController.uploadFiles()
    → fileAccessService.uploadFiles()
      → storageService.uploadFile()  // S3/Swiftへ保存
      → saveFileMetadata()           // DBへメタデータ保存
      → analyzeMaimlFile()           // 簡易解析（正規表現）のみ ← ここを強化
```

### 既存バリデーション機能
- **簡易解析** (`backend/src/utils/maimlAnalyzer.ts`)
  - 正規表現で `<transition>` / `<place>` タグ数をカウントするだけ
  - 構文エラー・スキーマ違反などを検出しない
  - アップロード処理を止める判断には使っていない

- **詳細バリデーション** (`backend/src/utils/maimlParser.ts`)
  - `analyzeMaiMLFile()` 関数
  - Phase1: XML構文バリデーション（`fast-xml-parser`）
  - Phase2: XMLパース
  - Phase3: MAIMLスキーマ構造バリデーション（必須要素チェック）
  - Phase4: コンテンツ解析・統計
  - Phase5: 参照整合性バリデーション
  - Phase6: 重複IDバリデーション
  - **現在は `/api/v1/maiml/validate` エンドポイントや保存後処理から呼ばれているが、アップロード時には呼ばれていない**
  - DBへの分析結果保存（`maiml_analysis_results`・`file_metadata`更新）も内包している

### 致命的エラー（アップロード拒否の基準）
`maimlParser.analyzeMaiMLFile()` が返す `AnalysisResult.errors[]` の各要素は `severity` フィールドを持つ。
- `severity: 'error'` → 致命的（アップロード拒否対象）
- `severity: 'warning'` → 警告のみ（アップロード許可）
- `severity: 'info'` → 情報のみ（アップロード許可）

エラータイプ（`type`フィールド）：
- `SYNTAX_ERROR` : XML構文エラー
- `SCHEMA_VIOLATION` : スキーマ違反
- `MISSING_REQUIRED` : 必須要素欠落
- `INVALID_STRUCTURE` : 不正な構造
- `NAMESPACE_ERROR` : 名前空間エラー
- `VERSION_MISMATCH` : バージョン不一致
- `REFERENCE_ERROR` : 参照エラー
- `DUPLICATE_ID` : 重複ID

## 4. 実装方針

### 採用方針: アップロード前にバリデーションを実施し、致命的エラー時は拒否

`fileAccessService.uploadFiles()` 内のMAIMLファイル処理部分で、ストレージへのアップロード**前**に詳細バリデーションを実行する。

**ポイント:**
- `severity: 'error'` が1件以上 → アップロードを中止し、400とエラー一覧を返す
- `severity: 'warning'` のみ → アップロードを完了させ、警告一覧を200レスポンスに付加する
- フロントエンドは拒否時はエラーダイアログ、成功+警告時は警告ダイアログを表示する

**実装場所:** `backend/src/services/fileAccessService.ts` の `uploadFiles()` メソッド内

### バリデーション方式の一本化
現状では以下の2系統のバリデーションが存在している：

| 系統 | 場所 | 内容 |
|------|------|------|
| 簡易解析 | `maimlAnalyzer.ts` | 正規表現でタグ数カウント |
| 詳細バリデーション | `maimlParser.ts` | 6段階の構造・参照・重複IDチェック |
| 型変換エラー検出 | `maimlParserTyped.ts` | XSD準拠型への変換時のエラー |

これを `maimlParser.ts` の `analyzeMaiMLFile()` に一本化する。

`MaimlParserTyped` の型変換エラーは、`maimlParser.ts` のバリデーションフロー内で既に検出可能なものが多いため、アップロード時のバリデーションとしては `analyzeMaiMLFile()` 単独で対応する。`MaimlParserTyped` を使う処理は実行時（エディタ・実験管理等）のままとする。

### DB保存処理の扱い
`maimlParser.analyzeMaiMLFile()` は内部で `saveAnalysisResults()` を呼びDBへ保存する。  
アップロード時のバリデーションではDB保存を**スキップ**する。

→ **採用する対策:** `analyzeMaiMLFile` にオプション引数 `skipSave?: boolean` を追加し、アップロード時は `skipSave=true` で呼び出す（デフォルト `false` で既存動作維持）。

## 5. 実装ステップ

### Phase 1: バックエンド - maimlParser.ts の改修
- [ ] `analyzeMaiMLFile` に `skipSave?: boolean` オプション引数を追加
  - `skipSave=true` の場合は `saveAnalysisResults()` をスキップ
  - デフォルトは `false`（既存動作を維持）

### Phase 2: バックエンド - fileAccessService.ts の改修
- [ ] `uploadFiles()` メソッド内のMAIMLファイル処理部分を改修
  - 既存の `analyzeMaimlFile()`（簡易解析）は削除または無効化し、`analyzeMaiMLFile()`（詳細）に置き換える
  - ストレージへのアップロード**前**にバリデーションを実施
  - `skipSave=true` でDB保存をスキップ
  - `errors` に `severity: 'error'` の項目があれば専用エラーをスロー（アップロード中止）
  - `warnings` のみの場合はアップロードを続行し、警告一覧をアップロード結果オブジェクトに付加する

### Phase 3: バックエンド - エラー・レスポンス型の整備
- [ ] `fileAccessController.ts` に以下の2パターンのハンドリングを追加
  - **致命的エラー時（400）**: `MAIML_VALIDATION_ERROR` コードと `errors[]` を返す
  - **警告ありアップロード成功時（200）**: 既存の成功レスポンスに `maimlValidation.warnings[]` を付加

### Phase 4: フロントエンド - バリデーション結果ダイアログ表示
- [ ] アップロード画面でのバリデーション結果ダイアログ対応
  - **400エラー受信時**: エラーダイアログを表示しエラー一覧（種別・メッセージ・行番号・修正提案）を一覧表示
  - **200成功+`maimlValidation.warnings`あり時**: 警告ダイアログを表示し警告一覧を表示
  - ユーザーは内容を確認してダイアログを閉じる（確認のみ、操作なし）

## 6. 変更ファイル

### バックエンド
1. `backend/src/utils/maimlParser.ts`
   - `analyzeMaiMLFile()` に `skipSave?: boolean` オプション引数を追加

2. `backend/src/services/fileAccessService.ts`
   - `uploadFiles()` 内のMAIMLファイル処理部分を改修
   - 簡易解析（`maimlAnalyzer.analyzeMaimlFile`）を詳細バリデーションに置き換え
   - ストレージアップロード完了後にバリデーションを実施
   - バリデーション結果をレスポンスに付加

3. `backend/src/controllers/fileAccessController.ts`
   - `uploadFiles()` の成功レスポンスに `maimlValidation` フィールドを含める（型定義調整）

### フロントエンド
4. アップロードコンポーネント（実装前に対象コンポーネントを調査して特定する）
   - アップロード成功後にバリデーション結果ダイアログを表示
   - エラー・警告の一覧表示（バリデーションダイアログ）

## 7. APIレスポンス仕様

### 致命的エラー時（400）

`severity: 'error'` が1件以上存在する場合。アップロードは実行されない。

```json
{
  "success": false,
  "error": {
    "code": "MAIML_VALIDATION_ERROR",
    "message": "MAIMLファイルに致命的なエラーがあります: sample.maiml",
    "details": {
      "fileName": "sample.maiml",
      "errorCount": 2,
      "errors": [
        {
          "type": "SYNTAX_ERROR",
          "severity": "error",
          "message": "XML syntax error detected",
          "details": "Unexpected end of input",
          "line": 42,
          "column": 10,
          "suggestion": "Fix XML syntax errors"
        },
        {
          "type": "MISSING_REQUIRED",
          "severity": "error",
          "message": "Missing required 'version' attribute on maiml element",
          "suggestion": "Add version='1.0' attribute to <maiml> element"
        }
      ]
    }
  },
  "meta": {
    "timestamp": "2026-03-31T07:48:00.000Z"
  }
}
```

### 警告ありアップロード成功時（200）

`severity: 'error'` はなく `severity: 'warning'` のみ存在する場合。アップロードは完了する。

```json
{
  "success": true,
  "data": {
    "files": [...],
    "summary": {
      "totalFiles": 1,
      "successfulFiles": 1,
      "failedFiles": 0,
      "totalSize": 12345
    },
    "maimlValidation": {
      "fileName": "sample.maiml",
      "isValid": true,
      "warningCount": 1,
      "warnings": [
        {
          "type": "NAMESPACE_ERROR",
          "severity": "warning",
          "message": "Missing namespace declaration",
          "suggestion": "Add xmlns='http://www.maiml.org/schemas' to <maiml> element"
        }
      ]
    }
  },
  "meta": {
    "timestamp": "2026-03-31T07:48:00.000Z"
  }
}
```

### MAIMLファイル以外のアップロード（200）

`maimlValidation` フィールドは含まれない（従来どおり）。

## 8. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `analyzeMaiMLFile` 内のDB保存処理が意図せず実行される | 中 | 低 | `skipSave=true` オプションで明示的にスキップ |
| バリデーション処理時間による応答遅延 | 中 | 中 | バリデーションはアップロード前に実施するため、大容量ファイルでの処理時間を考慮。既存の60秒タイムアウト設定を流用 |
| 既存の詳細バリデーションAPI（`/api/v1/maiml/validate`）への影響 | 低 | 低 | `skipSave` のデフォルトを `false` にして既存動作を維持 |
| フロントエンドのアップロードコンポーネントが複数存在する場合の対応漏れ | 中 | 中 | 実装前にコンポーネントを調査して対象を確定する |
| `MaimlParserTyped` 型変換エラーとの統合で検出漏れが生じる | 低 | 低 | `analyzeMaiMLFile` のPhase1〜3でXML構文・スキーマ違反を既に検出しており、型変換エラーの主要原因はカバーされている |

## 9. テスト計画

### バックエンドユニットテスト
- [ ] `fileAccessService.uploadFiles()` のテスト
  - `severity: 'error'` があるMAIMLファイルはアップロードが実行されず例外がスローされること
  - 警告のみの場合はアップロードが成功し、`maimlValidation.warnings` に警告が含まれること
  - 正常なMAIMLファイルの場合は `maimlValidation` なし（または `isValid=true`）で成功すること
  - `.maiml` 以外のファイルは `maimlValidation` フィールドなしでアップロードされること

### 手動テスト
- [ ] XML構文エラーのある `.maiml` ファイルをアップロード → 400エラーが返りフロントエンドにエラーダイアログが表示されること
- [ ] 必須要素欠落の `.maiml` ファイルをアップロード → 400エラーが返りフロントエンドにエラーダイアログが表示されること
- [ ] 正常な `.maiml` ファイルをアップロード → 200で成功しダイアログが表示されないこと
- [ ] 警告のみがある `.maiml` ファイルをアップロード → 200で成功しダイアログに警告が表示されること
- [ ] `.xml` や `.csv` ファイルをアップロード → バリデーションなしで成功すること

## 10. 承認記録

- **計画書提示日時**: 2026-03-31 16:48
- **承認日時**: 未承認
- **承認者コメント**: 
