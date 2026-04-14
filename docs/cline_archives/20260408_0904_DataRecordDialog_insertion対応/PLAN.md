# タスク計画書: DataRecordDialog insertion対応

## メタデータ
- **作成日時**: 2026-04-08 09:04
- **タスクID**: DataRecordDialog_insertion対応
- **優先度**: 高
- **推定工数**: 4時間

## 1. タスク概要

現在、DataRecordDialogコンポーネントは`test_data/Raman.maiml`にあるような`<insertion>`タグを使用したファイル添付指示のテンプレートを解析できません。この機能を実装し、MAIMLファイル内で指定されたファイルアップロードフィールドを適切に表示・処理できるようにします。

## 2. 目的と期待される成果

### 目的
- MAIMLの`<insertion>`タグを正しく解析してUIに反映する
- ファイル形式（format）情報を表示し、適切な検証を行う
- ファイルのアップロード・置き換え・削除を可能にする
- 既存ファイルの復元機能を実装する

### 期待される成果
- [ ] `<insertion>`タグのテンプレートが正しく表示される
- [ ] ファイル形式（format）がUI上に表示される
- [ ] ファイルアップロード時に形式検証が動作する
- [ ] 既存ファイルがある場合、ファイルリストに表示される
- [ ] ファイルの置き換え・削除が可能
- [ ] 保存時にFormData形式でファイルを送信できる

## 3. 実装ステップ

### Phase 1: 型定義の追加
- [ ] `frontend/src/types/maiml.ts`にInsertionField型を追加
- [ ] Template型に`type: 'insertion'`と`insertion`プロパティを追加

### Phase 2: テンプレート解析処理の修正
- [ ] `convertTemplateDataItemsToTemplates`関数を修正
- [ ] `<insertion>`タグの解析ロジックを追加
- [ ] format, description, required, uri属性の取得処理を実装

### Phase 3: UI対応
- [ ] `renderTemplateField`関数にinsertion用のレンダリングロジックを追加
- [ ] `getAcceptString`ヘルパー関数を実装（MIMEタイプ→拡張子変換）
- [ ] Uploadコンポーネントの実装
  - fileList表示（既存ファイル）
  - onChange処理（ファイル選択・削除）
  - beforeUpload検証（ファイル形式チェック）
  - accept属性の設定
- [ ] format情報の表示（期待形式ラベル）
- [ ] description情報の表示
- [ ] テンプレート一覧のカード表示修正
  - プロパティ数の計算ロジックを変更
  - `properties` + `insertions` + `contents` の合計件数を表示

### Phase 4: 保存処理の修正
- [ ] `handleSaveTemplate`関数を修正
- [ ] FormData形式でのデータ送信に対応
- [ ] Fileオブジェクトの適切な処理
- [ ] テンプレートデータとファイルの分離処理

### Phase 5: 既存値復元処理の実装
- [ ] useEffect内で既存uri情報の復元処理を実装
- [ ] fileList初期値の設定

### Phase 6: テスト・動作確認
- [ ] Raman.maimlを使用した表示テスト
- [ ] ファイルアップロードテスト（txt, tiff, bmp）
- [ ] ファイル形式検証テスト
- [ ] 保存・復元テスト
- [ ] ファイル置き換えテスト

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/types/maiml.ts` - InsertionField型、Template型の拡張
2. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - 主要な修正対象
   - convertTemplateDataItemsToTemplates関数
   - renderTemplateField関数
   - handleSaveTemplate関数
   - useEffect（復元処理）
   - getAcceptStringヘルパー関数の追加

### 新規作成するファイル
なし（既存ファイルの修正のみ）

### 影響を受ける機能
- DataRecordDialog: ファイルアップロード機能が追加される
- テンプレート保存処理: FormData形式に変更

## 5. 技術的詳細

### 使用する技術・ライブラリ
- Ant Design Upload コンポーネント: v5系
- FormData API: ファイルアップロード用
- React Hook Form: 既存のフォーム管理

### 実装の重要ポイント

#### 1. MIME typeマッピング
```typescript
const formatMap: Record<string, string> = {
  'txt/ascii': '.txt',
  'text/plain': '.txt',
  'image/tiff': '.tif,.tiff',
  'image/bmp': '.bmp',
  'image/jpeg': '.jpg,.jpeg',
  'image/png': '.png',
  'application/pdf': '.pdf',
  'application/xml': '.xml',
};
```

#### 2. ファイル検証ロジック
```typescript
beforeUpload={(file) => {
  if (insertion.format) {
    const expectedCategory = insertion.format.split('/')[0];
    if (!file.type.startsWith(expectedCategory)) {
      message.error(`ファイル形式が正しくありません`);
      return Upload.LIST_IGNORE;
    }
  }
  return false;
}}
```

#### 3. FormData送信
```typescript
const formData = new FormData();
Object.entries(values).forEach(([key, value]) => {
  if (value instanceof File) {
    formData.append(key, value);
  } else {
    templateData[key] = value;
  }
});
formData.append('templateData', JSON.stringify(templateData));
```

## 6. リスク管理

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| MAIMLパース処理の不具合 | 高 | 中 | 詳細なログ出力、テストデータでの事前確認 |
| ファイルアップロード時のエラー | 中 | 低 | エラーハンドリングの実装、ユーザーへの適切なメッセージ表示 |
| 既存の他のテンプレート処理への影響 | 中 | 低 | 既存コードを最小限の変更に抑える、リグレッションテスト |
| FormData形式変更によるバックエンドAPI不整合 | 高 | 中 | バックエンドAPIの対応確認、必要に応じてAPI修正 |

## 7. テスト計画

### 単体テスト
- [ ] convertTemplateDataItemsToTemplates関数のテスト
- [ ] getAcceptString関数のテスト

### 統合テスト
- [ ] Raman.maimlを使用した表示テスト
- [ ] ファイルアップロード→保存→復元の一連の流れ

### 手動テスト
- [ ] 各種ファイル形式（txt, tiff, bmp, pdf）のアップロード
- [ ] ファイル形式が異なる場合のバリデーションエラー表示
- [ ] 既存ファイルの置き換え操作
- [ ] ファイルの削除操作
- [ ] プロジェクト編集不可状態での動作確認

## 8. 関連ドキュメント

- `test_data/Raman.maiml` - サンプルMAIMLファイル
- `.clinerules/development/typescript.md` - TypeScript型定義規約
- `.clinerules/development/config.md` - コーディング規約

## 9. 承認記録

- **計画書提示日時**: 2026-04-08 09:04
- **承認日時**: 2026-04-08 09:59
- **承認者コメント**: テンプレート一覧カード表示を合計件数表示に変更することを確認・承認

## 10. 実施記録

### 実施日時
開始: 2026-04-08 10:00
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した変更があれば記入）

### 発生した問題と解決方法
（問題が発生した場合に記入）

### 最終的な成果物
- [ ] Phase 1完了
- [ ] Phase 2完了
- [ ] Phase 3完了
- [ ] Phase 4完了
- [ ] Phase 5完了
- [ ] Phase 6完了
