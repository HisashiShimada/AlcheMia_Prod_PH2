# タスク計画書: フォーマット管理MAIML編集パラメータ実装

## メタデータ
- **作成日時**: 2026-02-27 19:17
- **タスクID**: format-maiml-params-implementation
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

フォーマット管理画面でMAIML編集ボタンを押した際に、MAIML編集画面（PetriNetEditorScreen）へ渡すパラメータを完全に実装する。

現在、一部のパラメータ（`editMode`、`editingFileName`、`sourceS3Key`など）は渡されているが、`MaimlEditorParams`型で定義されているオプション項目（`documentId`、`description`）が未設定となっている。

## 2. 目的と期待される成果

### 目的
- `MaimlEditorParams`型で定義されたすべてのパラメータを適切に設定する
- フォーマット情報をMAIML編集画面に正確に引き継ぐ
- Document IDとdescriptionの初期値を適切に設定する

### 期待される成果
- [x] `documentId`の適切な設定（フォーマットID/ファイルIDを使用）
- [x] `description`の設定（フォーマットの説明を引き継ぎ）
- [x] `originalFileName`の正確な設定（拡張子を除いたファイル名）
- [x] 型安全性の確保（`MaimlEditorParams`型に完全準拠）

## 3. 実装ステップ

### Phase 1: 現状分析
- [x] `FormatManagement.tsx`の`handleFileEdit`関数を確認
- [x] `PetriNetEditorScreen`のpropsを確認
- [x] `MaimlEditorParams`型定義を確認

### Phase 2: パラメータ設定の修正
- [x] `handleFileEdit`関数内で`documentId`を設定
  - フォーマットIDまたはファイルIDを使用
- [x] `description`をフォーマット説明から設定
- [x] `originalFileName`を拡張子なしのファイル名に修正
- [x] `displaySubtitle`にフォーマット説明を含める

### Phase 3: コード修正
- [x] `FormatManagement.tsx`のPetriNetEditorScreen呼び出し部分を修正
- [x] パラメータの型チェック確認

### Phase 4: テスト
- [x] コード修正完了
- [ ] 動作テスト（ユーザー実施）

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/FormatManagement.tsx`
   - `handleFileEdit`関数内のMAIMLファイル処理部分
   - PetriNetEditorScreenコンポーネントの`params` props設定

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- フォーマット管理画面のMAIML編集機能
- MAIML編集画面への初期値設定

## 5. 技術的詳細

### 使用する技術・ライブラリ
- React 18.2.0
- TypeScript
- Ant Design v6

### パラメータ設定の詳細

#### documentId
```typescript
// フォーマットIDまたはファイルIDを使用
documentId: selectedFormat?.id || editingMaimlFile.id
```

#### description
```typescript
// フォーマットの説明を使用
description: selectedFormat?.description
```

#### originalFileName
```typescript
// 拡張子を除いたファイル名
originalFileName: editingMaimlFile.name.replace(/\.maiml$/i, '')
```

### MaimlEditorParams型定義（参照）
```typescript
export interface MaimlEditorParams {
  editMode: 'project' | 'format';
  editingFileName: string;
  originalFileName: string;  // 拡張子なし
  sourceS3Key: string;
  displayTitle: string;
  displaySubtitle?: string;
  documentId?: string;       // ← 追加設定
  description?: string;      // ← 追加設定
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| documentIdが未定義の場合 | 低 | 低 | フォールバック値を設定（`document_${Date.now()}`がデフォルト） |
| descriptionが未定義の場合 | 低 | 低 | オプション項目なのでundefinedでも問題なし |
| 既存の動作への影響 | 低 | 低 | 追加パラメータは既存ロジックに影響しない |

## 7. テスト計画

### 手動テスト
- [ ] フォーマット管理画面でMAIMLファイルを選択
- [ ] 編集ボタン押下
- [ ] PetriNetEditorScreenが開くことを確認
- [ ] ブラウザDevToolsでpropsを確認
  - `documentId`が設定されていること
  - `description`が設定されていること
  - `originalFileName`が拡張子なしであること

### 確認ポイント
- [ ] 新規MAIMLファイル作成時も正常に動作すること
- [ ] 既存MAIMLファイル編集時も正常に動作すること
- [ ] パラメータ未設定時も既定動作すること

## 8. ロールバック計画

変更箇所が限定的なため、以下の手順でロールバック可能：
1. `FormatManagement.tsx`の変更を元に戻す
2. 既存の実装に戻す

## 9. 関連ドキュメント

- `frontend/src/types/maimlEditor.ts` - MaimlEditorParams型定義
- `frontend/src/components/editorv2/PetriNetEditorScreen.tsx` - MAIML編集画面
- `frontend/src/components/project/FormatManagement.tsx` - フォーマット管理画面

## 10. 承認記録

- **計画書提示日時**: 2026-02-27 19:17
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

## 11. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）

### 最終的な成果物
- [ ] FormatManagement.tsxの修正完了
- [ ] パラメータ受け渡しの動作確認完了

## 12. 振り返り

### うまくいった点
（完了後に記録）

### 改善が必要な点
（完了後に記録）

### 学んだこと
（完了後に記録）
