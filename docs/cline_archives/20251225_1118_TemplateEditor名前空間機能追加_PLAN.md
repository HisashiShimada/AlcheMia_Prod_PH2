# タスク計画書: TemplateEditor名前空間テンプレート取り込み機能追加

## メタデータ
- **作成日時**: 2025-12-25 11:18
- **タスクID**: template-editor-namespace-import
- **優先度**: 高
- **推定工数**: 2-3時間

## 1. タスク概要

reference配下のTemplateEditorDialog.jsxにある名前空間テンプレート取り込み機能を、現在のTemplateEditorDialog.tsxに移植する。

## 2. 目的と期待される成果

### 目的
既存の名前空間テンプレート機能を活用して、ユーザーがS3から定義済みのテンプレートを読み込めるようにする。

### 期待される成果
- [x] 不足機能の特定
- [ ] useNamespaceOperations カスタムフックの確認/作成
- [ ] 名前空間テンプレート取り込みUIの実装
- [ ] S3フォルダ構造表示機能の実装
- [ ] XMLファイル選択・プレビュー機能の実装
- [ ] PropertiesとContentsへの取り込み処理の実装

## 3. 実装ステップ

### Phase 1: useNamespaceOperations フックの確認
- [ ] frontend/src/hooks/useNamespaceOperations.ts の存在確認
- [ ] 存在しない場合、referenceから移植
- [ ] TypeScript化

### Phase 2: 名前空間テンプレート取り込みUIの追加
- [ ] 「📥 名前空間テンプレート取り込み」ボタンを追加（Properties用）
- [ ] 「📥 名前空間テンプレート取り込み」ボタンを追加（Contents用）
- [ ] 名前空間ダイアログの実装

### Phase 3: S3フォルダ構造表示機能
- [ ] フォルダツリー表示コンポーネント（renderNamespaceFolderTree）
- [ ] フォルダ展開/縮小機能
- [ ] XMLファイル数バッジ表示

### Phase 4: XMLファイル選択・プレビュー機能
- [ ] ファイル選択UI
- [ ] ファイル解析処理（analyzeNamespaceFile）
- [ ] プレビュー表示（Namespace URI、Properties数、Contents数）

### Phase 5: 取り込み処理の実装
- [ ] handleImportNamespace 関数
- [ ] replace_all_properties モード
- [ ] replace_all_contents モード
- [ ] namespaceOrigin フラグの付与

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editor/TemplateEditorDialog.tsx` - 名前空間UI追加
2. `frontend/src/hooks/useNamespaceOperations.ts` - 新規作成（referenceから移植）

### 新規作成するファイル
1. `frontend/src/hooks/useNamespaceOperations.ts` - 名前空間操作フック（TypeScript版）

### 影響を受ける機能
- TemplateEditorDialog - 名前空間テンプレート取り込み機能追加

## 5. 技術的詳細

### 使用する技術・ライブラリ
- React Hooks (useState, useEffect, useMemo, useCallback)
- Ant Design v6 (Modal, Button, Tree, Tag, Alert)
- TypeScript

### アーキテクチャ上の考慮事項
- useNamespaceOperations フックでS3操作をカプセル化
- 名前空間データは既存のproperties/contents構造に統合
- namespaceOrigin フラグで名前空間由来を識別

### セキュリティ考慮事項
- [ ] S3アクセス権限の確認
- [ ] organization_id によるテナント分離
- [ ] XMLファイルのバリデーション

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| useNamespaceOperationsが存在しない | 高 | 高 | referenceから移植・TypeScript化 |
| S3 API呼び出しが未実装 | 中 | 中 | モックデータで代替実装 |
| 既存データとの統合の複雑さ | 中 | 中 | 段階的な統合テスト |

## 7. テスト計画

### 手動テスト
- [ ] 名前空間ダイアログが正常に開く
- [ ] S3フォルダ構造が表示される
- [ ] XMLファイルが選択できる
- [ ] プレビューが正しく表示される
- [ ] Propertiesへの取り込みが成功する
- [ ] Contentsへの取り込みが成功する
- [ ] namespaceOriginフラグが付与される

## 8. ロールバック計画

問題が発生した場合：
1. TemplateEditorDialog.tsxを元に戻す
2. useNamespaceOperations.tsが問題の場合は削除
3. 既存機能に影響がないことを確認

## 9. 関連ドキュメント

- [reference TemplateEditorDialog.jsx](../../reference/frontend/src/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx)
- [reference useNamespaceOperations.js](../../reference/frontend/src/components/PetriNetEditorV2/hooks/useNamespaceOperations.js)

## 10. 承認記録

- **計画書提示日時**: 2025-12-25 11:18
- **承認日時**: 2025-12-25 11:20
- **承認者コメント**: 実装開始を承認

## 11. 実施記録

### 実施日時
開始: 2025-12-25 11:20
完了: 2025-12-25 11:23（調査・計画フェーズのみ）

### 計画からの変更点
**重要な方針変更:**
- 名前空間機能の実装が大規模になることが判明
- ユーザーの判断により、**別タスクとして切り出し**
- 本タスクは調査と引継ぎ資料作成で完了

### 実施した作業
- [x] referenceのTemplateEditorDialog.jsx確認
- [x] referenceのuseNamespaceOperations.js確認
- [x] referenceのapiService.js確認
- [x] 現在のTemplateEditorDialog.tsx確認
- [x] 不足機能の特定
- [x] 引継ぎ資料作成

### 最終的な成果物
1. **タスク計画書**: `docs/cline_archives/20251225_1118_TemplateEditor名前空間機能追加_PLAN.md`
2. **引継ぎ資料**: `docs/cline_archives/20251225_1123_名前空間機能_引継ぎ資料.md`

### 引継ぎ先タスク
名前空間テンプレート取り込み機能の実装は、別タスクとして以下の資料を基に実施してください：
- 引継ぎ資料: `docs/cline_archives/20251225_1123_名前空間機能_引継ぎ資料.md`
- 推定工数: 3時間
- 優先度: 中

## 12. 振り返り

### うまくいった点
- referenceコードの詳細な分析により、必要な実装内容を明確化できた
- 早期に実装規模の大きさを判断し、別タスク化の判断ができた
- 詳細な引継ぎ資料を作成し、次回実装時の手戻りを防止

### 改善が必要な点
- 事前の実装規模見積もりの精度向上が必要
- 大規模機能の段階的な実装計画の検討

### 学んだこと
- 名前空間機能は以下の複雑な要素を含む大規模機能：
  - カスタムフック（useNamespaceOperations）の作成
  - S3フォルダ構造の階層表示UI
  - XMLファイル解析処理
  - 複雑な取り込みロジック
- referenceコードは完全実装済みで、TypeScript移植が主な作業
- Ant Design v6への適切な移植が必要
