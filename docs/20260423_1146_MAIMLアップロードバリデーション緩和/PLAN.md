# タスク計画書: MAIMLアップロードバリデーション緩和

## メタデータ
- **作成日時**: 2026-04-23 11:46
- **タスクID**: maiml-upload-validation-lenient
- **優先度**: 高
- **推定工数**: 4時間

## 1. タスク概要

MAIMLファイルアップロード時のバリデーションが編集画面での保存時と同等の内容で厳しすぎるため、画面から補正や追記ができる項目についてはエラーではなく警告として受け入れるように緩和する。

### 背景
現在、`fileAccessService.ts`の`uploadFiles()`メソッドでMAIMLファイルをアップロードする際、`analyzeMaiMLFile()`で完全なバリデーションを実行し、致命的エラー（`severity: 'error'`）が1つでもあるとアップロードを拒否している。

しかし、以下のような項目は編集画面で補正・追記が可能であるため、アップロード時にエラーで拒否するのは厳しすぎる：
- document要素の必須子要素（uuid、creator、vendor、owner、date）の欠落
- UUIDフォーマット不正
- 日付フォーマット不正
- protocol/method内の必須要素の欠落

### 問題点
- ユーザーは不完全なMAIMLファイルをアップロードできない
- アップロード後に編集画面で補正する運用ができない
- 初期段階のMAIMLファイル（雛形）をアップロードできない

## 2. 目的と期待される成果

### 目的
アップロード時のバリデーションを緩和し、編集可能な項目についてはエラーではなく警告として受け入れることで、ユーザーがアップロード後に編集画面で補正できるようにする。

### 期待される成果
- [ ] 不完全なMAIMLファイル（document子要素の一部欠落など）をアップロード可能
- [ ] アップロード後、編集画面で補正・追記が可能
- [ ] 構造的なエラー（XML構文エラー、必須構造の欠落）は引き続きアップロード時に拒否
- [ ] 編集画面での保存時は厳格なバリデーションを維持（現状維持）

## 3. 実装ステップ

### Phase 1: 調査と設計
- [x] 現在のバリデーション処理の確認
- [x] アップロード時と編集画面保存時の違いを分析
- [x] エラー分類の定義（構造的エラー vs 編集可能エラー）
- [x] エラー分類の妥当性をユーザーに確認（完了）
- [x] 参照エラー・重複IDエラーの扱いをユーザーに確認（完了）

### Phase 2: 型定義の追加
- [ ] `backend/src/types/maimlValidation.ts`に`ValidationMode`型を追加
  ```typescript
  export type ValidationMode = 'strict' | 'lenient';
  ```

### Phase 3: maimlParser.tsの修正
- [ ] `analyzeMaiMLFile()`の関数シグネチャを変更
  - `validationMode?: ValidationMode`パラメータを追加
  - デフォルト値は`'strict'`
- [ ] `validateMaiMLStructure()`にモードパラメータを追加
- [ ] `validateDocumentStructure()`にモードパラメータを追加
  - lenientモード時、必須子要素の欠落を`severity: 'warning'`に降格
  - lenientモード時、UUIDフォーマット不正を`severity: 'warning'`に降格
  - lenientモード時、日付フォーマット不正は現状通り`severity: 'warning'`
- [ ] `validateProtocolStructure()`にモードパラメータを追加
  - id属性の欠落は両モードとも`severity: 'error'`（構造的に重要）
  - lenientモード時、uuid要素の欠落を`severity: 'warning'`に降格
  - lenientモード時、method要素の欠落は両モードとも`severity: 'error'`（必須構造）
- [ ] `validateMethodStructure()`にモードパラメータを追加
  - lenientモード時、id属性の欠落を`severity: 'warning'`に降格
  - uuid要素の欠落は両モードとも`severity: 'error'`（構造的に重要）
  - pnml/program要素の欠落は両モードとも`severity: 'error'`（構造的に重要）
- [ ] `validateDuplicateIds()`にモードパラメータを追加
  - lenientモード時、編集可能要素（place, transition, arc, materialTemplate, conditionTemplate, resultTemplate）の重複IDを`severity: 'warning'`に降格
  - 編集不可要素（document, method, pnml, program, placeRef）の重複IDは両モードとも`severity: 'error'`
- [ ] `validateReferences()`は両モードとも`severity: 'error'`を維持（変更なし）

### Phase 4: 呼び出し側の修正
- [ ] `backend/src/services/fileAccessService.ts`の修正
  - `uploadFiles()`内の`analyzeMaiMLFile()`呼び出しに`'lenient'`を渡す
  - 479-488行目付近を修正
- [ ] `backend/src/services/maimlService.ts`の修正
  - `validateMaiML()`内の`analyzeMaiMLFile()`呼び出しに`'strict'`を明示的に渡す
  - 362-366行目付近を修正（または省略してデフォルト値に任せる）

### Phase 5: テストと確認
- [ ] アップロード時の動作確認
  - 構造的エラーがあるMAIMLファイル → アップロード拒否（期待通り）
  - 編集可能エラーのみのMAIMLファイル → アップロード成功 + 警告表示（期待通り）
- [ ] 編集画面保存時の動作確認
  - 編集可能エラーがあるMAIMLファイル → 保存拒否（現状維持）
- [ ] 警告メッセージの確認
  - 警告メッセージに「編集画面で補正可能」という旨が含まれているか確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/types/maimlValidation.ts` - ValidationMode型の追加
2. `backend/src/utils/maimlParser.ts` - バリデーションロジックの修正（約200行）
3. `backend/src/services/fileAccessService.ts` - アップロード時の呼び出し修正（1行）
4. `backend/src/services/maimlService.ts` - 保存時の呼び出し修正（1行、オプション）

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- プロジェクト管理画面: MAIMLファイルアップロード機能
- MAIML編集画面: ファイル保存機能（動作は変更なし）

## 5. 技術的詳細

### エラー分類の定義

#### A. 構造的エラー（アップロード時も拒否 - `severity: 'error'`）

| エラー種別 | 対象要素 | 理由 |
|-----------|---------|------|
| XML構文エラー | - | XMLとして解析不可 |
| ルート要素欠落 | `<maiml>` | MAIML形式の基本構造 |
| version属性欠落 | `<maiml version="1.0">` | MAIML形式の基本構造 |
| document要素欠落 | `<document>` | MAIML形式の必須構造 |
| **document UUID不正** | `<document><uuid>` | アップロード後に編集不可の仕様 |
| protocol要素欠落 | `<protocol>` | MAIML形式の必須構造 |
| protocol id属性欠落 | `<protocol id="...">` | 要素の識別に必須 |
| **protocol uuid欠落** | `<protocol><uuid>` | プロトコルの一意識別に必須 |
| method要素欠落 | `<method>` | protocolの必須子要素 |
| **method uuid欠落** | `<method><uuid>` | メソッドの一意識別に必須 |
| **pnml要素欠落** | `<pnml>` | methodの必須子要素 |
| **program要素欠落** | `<program>` | methodの必須子要素 |
| **参照エラー** | 存在しないID参照 | MAIML内に存在しないIDを参照 |
| **重複ID（編集不可要素）** | document, method, pnml, program, placeRef | 編集画面でID修正不可 |

#### B. 編集可能エラー（アップロード時は警告 - `severity: 'warning'`）

| エラー種別 | 対象要素 | 理由 |
|-----------|---------|------|
| **document id属性欠落** | `<document id="...">` | 編集画面で追加可能 |
| document 必須子要素欠落 | `<uuid>`, `<creator>`, `<vendor>`, `<owner>`, `<date>` | 編集画面で追加可能 |
| 日付フォーマット不正 | `<date>` | 編集画面で修正可能（現状も警告） |
| **method id属性欠落** | `<method id="...">` | 編集画面で追加可能 |
| **重複ID（編集可能要素）** | place, transition, arc, materialTemplate, conditionTemplate, resultTemplate | 編集画面でID修正可能 |

### 実装例

#### validateDocumentStructure()の修正例

```typescript
function validateDocumentStructure(document: any, mode: ValidationMode = 'strict') {
  const errors: ErrorContent[] = [];
  const warnings: ErrorContent[] = [];
  let isValid = true;

  // id属性は構造的に重要なため、両モードともエラー
  if (!document['@_id']) {
    errors.push({
      type: errorTypes.MISSING_REQUIRED,
      severity: 'error',
      message: 'Document element missing required "id" attribute',
      suggestion: 'Add id="unique-document-id" to <document> element'
    });
    isValid = false;
  }

  // 必須子要素のチェック（モードによって分岐）
  const requiredChildren = ['uuid', 'creator', 'vendor', 'owner', 'date'];
  for (const child of requiredChildren) {
    if (!document[child]) {
      if (mode === 'lenient') {
        // lenientモード: 警告に降格（編集画面で追加可能）
        warnings.push({
          type: errorTypes.MISSING_REQUIRED,
          severity: 'warning',
          message: `Missing "${child}" element in document (can be added in editor)`,
          suggestion: `Add <${child}> element to document section in the editor`
        });
      } else {
        // strictモード: エラーとして扱う
        errors.push({
          type: errorTypes.MISSING_REQUIRED,
          severity: 'error',
          message: `Missing required "${child}" element in document`,
          suggestion: `Add <${child}> element to document section`
        });
        isValid = false;
      }
    }
  }

  // UUIDフォーマットチェック（モードによって分岐）
  if (document.uuid) {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[3-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(document.uuid)) {
      if (mode === 'lenient') {
        warnings.push({
          type: errorTypes.VALIDATION_WARNING,
          severity: 'warning',
          message: 'Invalid UUID format in document (can be corrected in editor)',
          suggestion: 'Use proper UUID v4 format (e.g., 550e8400-e29b-41d4-a716-446655440000)'
        });
      } else {
        errors.push({
          type: errorTypes.VALIDATION_WARNING,
          severity: 'error',
          message: 'Invalid UUID format in document',
          suggestion: 'Use proper UUID v4 format (e.g., 550e8400-e29b-41d4-a716-446655440000)'
        });
        isValid = false;
      }
    }
  }

  // 日付フォーマットは現状通り警告（両モードとも同じ）
  if (document.date) {
    const dateValue = document.date;
    if (isNaN(Date.parse(dateValue))) {
      warnings.push({
        type: errorTypes.VALIDATION_WARNING,
        severity: 'warning',
        message: 'Invalid date format in document',
        suggestion: 'Use ISO 8601 date format (e.g., 2024-01-15T10:30:00Z)'
      });
    }
  }

  return { isValid, errors, warnings };
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| エラー分類の判断ミス | 中 | 中 | ユーザーと詳細に確認し、必要に応じて調整 |
| 既存の動作への影響 | 低 | 低 | 編集画面保存時はstrictモードで現状維持 |
| 不正なファイルのアップロード許可 | 中 | 低 | 構造的エラーは引き続き拒否、編集可能項目のみ緩和 |
| バリデーションモードの混同 | 低 | 低 | デフォルト値をstrictに設定、呼び出し箇所を明示的に記述 |

## 7. テスト計画

### ユニットテスト
- [ ] `validateDocumentStructure()`のモード別動作確認
  - strictモード: 必須子要素欠落でerrorを返す
  - lenientモード: 必須子要素欠落でwarningを返す
- [ ] `validateProtocolStructure()`のモード別動作確認
- [ ] `validateMethodStructure()`のモード別動作確認

### 統合テスト
- [ ] アップロード時のバリデーション確認
  - 構造的エラーのみ: アップロード拒否
  - 編集可能エラーのみ: アップロード成功 + 警告
  - エラーなし: アップロード成功
- [ ] 編集画面保存時のバリデーション確認
  - 編集可能エラーあり: 保存拒否（現状維持）
  - エラーなし: 保存成功（現状維持）

### 手動テスト
- [ ] 不完全なMAIMLファイルのアップロード
  - document子要素（uuid、creator等）が欠落したファイル
  - UUIDフォーマットが不正なファイル
- [ ] アップロード後の編集画面での補正
  - 警告項目を補正して保存できることを確認
- [ ] フロントエンドでの警告表示確認
  - 警告メッセージが適切に表示されることを確認

## 8. ロールバック計画

変更が問題を引き起こした場合、以下の手順でロールバック可能：

1. `backend/src/utils/maimlParser.ts`の`validationMode`パラメータを削除
2. `backend/src/services/fileAccessService.ts`の呼び出しを元に戻す
3. Git revert実行
4. バックエンド再起動

影響範囲が限定的（4ファイルのみ）のため、ロールバックは容易。

## 9. 関連ドキュメント

- [maimlParser.ts](../../backend/src/utils/maimlParser.ts) - バリデーションロジック本体
- [fileAccessService.ts](../../backend/src/services/fileAccessService.ts) - アップロード処理
- [maimlService.ts](../../backend/src/services/maimlService.ts) - 保存処理

## 10. 確認事項（ユーザー確認必須）

以下の点について、実装前にユーザーの確認が必要です：

### ✅ すべて確認済み

以下の項目について、ユーザー確認が完了しました：

1. **エラー分類**: 最終版に更新済み
2. **document UUID不正**: 構造的エラーに移動（アップロード後に編集不可）
3. **参照エラー**: 両モードともエラーのまま（MAIML内に存在しないIDを参照）
4. **重複IDエラー**: **全要素でエラーのまま維持**
   - placeRef等の参照関係を壊すため、モードに関わらず常にエラー
   - ユーザー追加確認（2026-04-23 14:25）により、当初の「編集可能要素は警告に降格」方針を変更

## 11. 承認記録

- **計画書提示日時**: 2026-04-23 11:50
- **最終更新日時**: 2026-04-23 13:00
- **承認日時**: （未承認）
- **承認者コメント**: エラー分類の最終確認完了、実装準備完了

## 12. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 計画からの変更点
（未実施）

### 発生した問題と解決方法
（未実施）

### 最終的な成果物
（未実施）
