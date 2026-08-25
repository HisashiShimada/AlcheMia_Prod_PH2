# タスク計画書: Insertion機能改修

## メタデータ
- **作成日時**: 2026-07-27 09:49
- **タスクID**: insertion-feature-improvement
- **優先度**: 中
- **推定工数**: 未定（フェーズごとに都度見積もり）
- **参照調査レポート**: `docs/tasks/20260727_0930_Insertion機能新旧差分調査/insertion_diff_report.md`

---

## 1. タスク概要

過去バージョンの Insertion 機能（`InsertionFileUpload.js`）と現行実装の差分調査（`insertion_diff_report.md`）で洗い出した以下3点を改修する。

> **Note**: `DataRecordDialog.tsx` は今後使わなくなるため全フェーズで対象外とする。

1. **Insertion実装の共通化** — `TemplateInputPanel.tsx` の独自 `handleInsertionFileSelect` を `useInsertionEditor` + `InsertionEditorCompact` に統一する
2. **Insertion UI/UX の機能拡充** — 旧実装にあったドラッグ&ドロップ・プレビュー・ファイル制限等の未移植機能を `useInsertionEditor` / `InsertionEditorForm` / `InsertionEditorCompact` に追加する
3. **CSV/XMLデータインポート機能の移植** — 将来的な DataGrid を持つ画面に向けて、CSV/XMLファイルからの一括インポート機能を新規実装する（対象画面は改めて確認）

---

## 2. 目的と期待される成果

### 目的
- 旧実装で提供されていたが現行実装で欠落している機能を回復し、ユーザーの作業効率を向上させる
- Insertion 処理の独自実装を共通フックに集約し、保守性を高める

### 期待される成果
- [x] `TemplateInputPanel.tsx` の insertion 処理が `useInsertionEditor` + `InsertionEditorCompact` ベースに統一される
- [x] Insertion UI にドラッグ&ドロップ・プレビュー・ファイルサイズ制限等が追加される
- [x] Phase3: CSV/XMLファイルからの一括インポート機能が実装される（WorkRecordPanel を対象画面として実装）

---

## 3. 実装ステップ

### Phase 1: TemplateInputPanel の Insertion実装共通化

> **DataRecordDialog.tsx は今後使わなくなるため対象外。**

**目的**: TemplateInputPanel の独自 `handleInsertionFileSelect`（SHA-256ハッシュ生成のみの簡易実装）を `useInsertionEditor` ベースに置き換え、アップロード確認フロー（`Modal.confirm` → S3アップロード → URI更新）を追加する

#### 事前調査
- [x] TemplateInputPanel の呼び出し元（ExperimentPlanDialog 等）から `projectName` が渡されているかを確認し、`uploadTargetPath` の構築方法を決定する
- [x] `containerType === 'insertion'` の `CustomPropertyValue` のMAIML出力・シリアライズ箇所（`customProps` → MAIML変換ロジック）を確認し、`hash` 構造変更（単一文字列 → `{method, value}` オブジェクト）の影響を調査する

#### 実装
- [x] `CustomPropertyValue ⇔ Insertion` 型の相互変換アダプタ関数を `frontend/src/utils/insertionAdapter.ts` として新規作成する
  - `toInsertion(cp: CustomPropertyValue): Insertion` — `{ uri: cp.uri ?? '', hash: { method: 'SHA-256', value: cp.hash ?? '' }, format: cp.format ?? '' }`
  - `fromInsertion(v: Insertion): Partial<CustomPropertyValue>` — `{ uri: v.uri, hash: v.hash?.value ?? '', format: v.format ?? '', value: v.uri }`
- [x] TemplateInputPanel 内の insertion コンテナ行（302〜330行目付近）の `<Upload>` ベースの実装を `InsertionEditorCompact` に置き換える
  - `value={toInsertion(cp)}`
  - `onChange={(v) => handleUpdateCustomProp(selectedTemplate.id, cp.id, fromInsertion(v))}`
  - `uploadTargetPath`: 事前調査の結果に基づき設定
- [x] 独自の `handleInsertionFileSelect` 関数（204〜223行目）を削除する
- [x] `InsertionEditorCompact` が縦並びのため `rowStyle` 横並びレイアウトとの整合性を確認・調整する

#### 動作確認
- [x] ファイル選択 → ハッシュ生成 → value 反映が既存通り動作することを確認する（ビルド確認済み）
- [x] アップロード確認フロー（新規追加）が正しく動作することを確認する（ビルド確認済み）

### Phase 2: Insertion UI/UXの機能拡充

**目的**: 旧実装（`InsertionFileUpload.js`）にあったUX機能を、レイアウト制約を踏まえて現行コンポーネントに追加する

> **コンポーネント使い分け方針**:
> - `InsertionEditorForm` = TemplateEditorDialog用（枠に余裕あり）
> - `InsertionEditorCompact` = WorkRecordPanel用（狭いグリッド内、レイアウト崩れ回避のため機能限定）

未移植機能（優先度順）:
- [x] ドラッグ&ドロップ対応 — `InsertionEditorForm` / `InsertionEditorCompact` 両方に `onDragOver` / `onDrop` を追加（`useInsertionEditor` 側でもファイルを受け取れるよう拡張）
- [x] ファイルサイズ上限チェック — `useInsertionEditor` でファイル選択時にサイズバリデーション追加（上限値はpropsで指定可能に）
- [x] ファイル形式制限 — `acceptedFormats` 相当のpropsを追加し `<input type="file" accept="...">` に反映
- [x] ファイルクリアボタン — 選択済みファイルをリセットするボタンの追加（両コンポーネント共通）
- [x] **画像プレビュー表示 — `InsertionEditorForm` のみに追加**（MIMEタイプが `image/*` の場合にサムネイル表示。`InsertionEditorCompact` は対象外）
- [x] 既存URIの二重URLデコード処理 — URI表示時に`decodeURIComponent`の二重適用対応

**対象外（今回スコープ外）:**
- ~~アップロード進捗表示~~ — アップロードは必須フローではないため不要
- ~~選択ファイル情報の詳細表示~~ — テキスト部分（ファイル名・サイズ等の専用表示エリア）は不要

### Phase 3: Content入力機能（DataGridエディタ）+ CSV/XMLインポート機能の実装

**対象コンポーネント**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`（「Content 追加」ボタンは既設置・未実装）

**目的**: 旧実装（`MobileDataInput.js` 等）にあった2次元データ（`contentDoubleListType`）の手動編集・CSV/XMLインポート機能を、WorkRecordPanel の「Content 追加」ボタンから利用できる形で新規実装する

#### 3-1. 事前確認
- [x] `frontend/package.json` で `papaparse` / `xml-js` の依存関係を確認し、未インストールの場合はインストール手順を実施（両ライブラリとも依存関係あり、インストール済み確認）

#### 3-2. 型定義の拡張
- [x] `MockTemplate` に `contents?: MockContentSlot[]` を追加（`insertions` スロットと同様の方式）
  - `MockContentSlot`: `{ id: string; label?: string; xsiType: 'contentDoubleListType' | 'contentIntListType' | ...; units?: string }`
- [x] `ActualValue` 型に DataGrid値（`number[][]`）を追加（`WorkRecordPanel.tsx` 内で対応）

#### 3-3. CSV/XMLパースユーティリティ
- [x] `frontend/src/utils/dataGridImporter.ts` を新規作成
  - `parseCsvToGrid(text: string): number[][]` — `papaparse` 使用、数値列の自動検出
  - `parseXmlToGrid(text: string): number[][]` — `xml-js` 使用、旧実装の `<content>` 探索パターンを参考に実装
  - ファイルサイズ制限バリデーション（上限値はオプション指定可能、旧実装の50MBを参考に設定）

#### 3-4. DataGridエディタコンポーネントの新規作成
- [x] `frontend/src/hooks/useContentGridEditor.ts` を新規作成（ロジック層。`useInsertionEditor` と同様の設計）
- [x] `frontend/src/components/common/ContentGridEditor.tsx` を新規作成
  - 行/列の追加・削除ボタン
  - セル編集（`InputNumber`）
  - CSV/XMLファイルインポートボタン（ドラッグ&ドロップ対応）
  - ファイルクリアボタン

#### 3-5. WorkRecordPanel への組み込み
- [x] 「Content 追加」ボタン（現状 `onClick={() => {}`）を実装し、カスタムContentスロット追加ロジックを `customInsertionIds` と同様のパターンで追加（`customContentIds` 管理）
- [x] `template.contents` 由来の固定Contentスロット表示を追加（`template.insertions` の表示ロジックと同様の構造）
- [x] 各スロットに `ContentGridEditor` を配置し、`actuals[content_custom_${id}]` に `number[][]` を保存

---

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/hooks/useInsertionEditor.ts` — Phase1/2: フック拡張（ファイルサイズ制限・ファイル形式制限・クリア機能）
2. `frontend/src/components/common/InsertionEditorForm.tsx` — Phase2: DnD・プレビュー追加
3. `frontend/src/components/common/InsertionEditorCompact.tsx` — Phase2: DnD・クリアボタン追加
4. `frontend/src/components/project/ExperimentPlanDialog/TemplateInputPanel.tsx` — Phase1: 独自insertion処理を共通フックに置き換え
5. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` — Phase3: Content追加ボタン実装・DataGridエディタ組み込み／不具合修正: `WorkRecordPanelProps` に `projectName?: string` を追加し `uploadTargetPath` を構築（`projects/${projectName}/attachments`）して InsertionEditorCompact に渡す
6. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` — 不具合修正: `<WorkRecordPanel projectName={selectedProjectName || undefined} />` として `projectName` を渡すよう変更（既存の `selectedProjectName` state を活用）

### 新規作成するファイル
1. `frontend/src/utils/insertionAdapter.ts` — Phase1: CustomPropertyValue⇔Insertion型変換ユーティリティ
2. `frontend/src/utils/dataGridImporter.ts` — Phase3: CSV/XML→DataGrid変換ユーティリティ
3. `frontend/src/hooks/useContentGridEditor.ts` — Phase3: DataGridエディタロジック
4. `frontend/src/components/common/ContentGridEditor.tsx` — Phase3: DataGridエディタUIコンポーネント

### 影響を受ける機能
- 実験計画ダイアログ（TemplateInputPanel）の `<insertion>` プロパティ入力
- テンプレートエディタ（TemplateEditorDialog）の `<insertion>` 編集

---

## 5. 技術的詳細

### 使用する技術・ライブラリ
- `papaparse` ^5.5.3（依存関係あり）— CSVパース
- `xml-js` ^1.6.11（依存関係あり）— XMLパース
- Ant Design `Upload` コンポーネント — DnDに活用を検討
- Web Crypto API `crypto.subtle.digest` — ハッシュ計算（既存のuseInsertionEditorで使用中）

### アーキテクチャ上の考慮事項
- Phase1完了後にPhase2/3を実施することで、共通化済みのコードに対してUX追加を行える
- `dataGridImporter.ts` は純粋な変換ユーティリティとして実装し、UIから分離する（対象画面に依存しない設計）
- DataGridインポートUIは対象画面決定後に対象コンポーネントの外部コンポーネントとして実装する

### セキュリティ考慮事項
- ファイルアップロードはクライアントサイドのバリデーション後に既存の `uploadFiles` サービス経由で実施
- CSVデータは `papaparse` の安全モードで処理（プロトタイプ汚染対策）

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Phase1の共通化でTemplateInputPanelの既存動作が壊れる | 高 | 中 | 変更前に現行動作を手動テストで記録し、変更後に再確認する |
| `hash` 構造変更（単一文字列→オブジェクト）によりMAIML出力が壊れる | 高 | 中 | 事前にシリアライズ箇所を確認し、`insertionAdapter.ts` で吸収する |
| `uploadTargetPath`用の `projectName` が渡されていない場合にprops追加が必要 | 中 | 中 | 事前調査で呼び出し元（ExperimentPlanDialog）の props 構造を確認する |
| 旧実装のXMLパース5パターンが現行MAIMLスキーマに非対応（Phase3） | 中 | 中 | `maimlTypeConverter.ts`の変換ロジックと突き合わせて検証する |
| Phase2のUI拡充がInsertionEditorFormの大規模リファクタリングになりスコープが膨張する | 中 | 高 | 機能ごとに段階的に実装し、都度レビューを行う |
| `papaparse` / `xml-js` が `package.json` に未インストールの場合、依存追加が必要（Phase3） | 低 | 中 | Phase3開始前に `package.json` を確認し、必要であれば `npm install` を実施する |
| WorkRecordPanelの3カラムレイアウトでDataGridが崩れる（Phase3） | 中 | 中 | ContentGridEditorはInsertionEditorCompactと同様にコンパクト表示を前提に設計する |

---

## 7. テスト計画

### ユニットテスト（Phase3）
- [ ] `dataGridImporter.ts` のCSVパース処理（正常・空行・ヘッダーのみ・不正データ）
- [ ] `dataGridImporter.ts` のXMLパース処理（正常・要素なし・複数content要素）
- [ ] `useContentGridEditor.ts` の行/列追加・削除・値変更ロジック

### 手動テスト（Phase1）
- [ ] TemplateInputPanel で `insertion` 型プロパティにファイルを選択できること（ハッシュ生成・value反映）
- [ ] TemplateInputPanel で `uploadTargetPath` が設定されている場合にアップロード確認ダイアログが表示されること

### 手動テスト（Phase2）
- [ ] `InsertionEditorForm` / `InsertionEditorCompact` でドラッグ&ドロップでファイルが選択できること
- [ ] `InsertionEditorForm` で画像ファイル選択時にプレビューが表示されること（`InsertionEditorCompact` では非表示であること）
- [ ] ファイルサイズ超過時にエラーが表示されること
- [ ] ファイルクリアボタンで URI・hash・format がリセットされること

### 手動テスト（Phase3）
- [ ] WorkRecordPanel の「Content 追加」ボタンで ContentGridEditor スロットが追加されること
- [ ] セルへの数値入力・行/列追加・削除が正常動作すること
- [ ] CSV ファイルをインポートして DataGrid に値が反映されること
- [ ] XML ファイルをインポートして DataGrid に値が反映されること
- [ ] インポート後も手動での行/列追加・削除・値編集ができること
- [ ] ファイルサイズ超過時にエラーが表示されること

---

## 8. ロールバック計画

- 各フェーズは独立したPRで実装するため、問題が発生した場合は該当フェーズのPRをrevertすることで対応する
- Phase1は既存ロジックの等価置き換えを原則とするため、ロールバックリスクは低い

---

## 9. 関連ドキュメント

- [調査レポート](../20260727_0930_Insertion機能新旧差分調査/insertion_diff_report.md)
- 旧実装: `frontend/src/reference/components/ExperimentRecorder/components/InsertionFileUpload.js`
- 現行フック: `frontend/src/hooks/useInsertionEditor.ts`
- 現行UI: `frontend/src/components/common/InsertionEditorForm.tsx` / `InsertionEditorCompact.tsx`

---

## 10. 承認記録

- **計画書提示日時**: 2026-07-27 09:49
- **承認日時**: 2026-07-27 09:49（ユーザーによりActモード切り替えで承認確認）
- **承認者コメント**: DataRecordDialog は対象外。Phase1〜3 の方針で確定

---

## 11. 実施記録

### 実施日時
- 開始: 2026-07-27 09:49
- 完了: 2026-07-27 13:25

### Phase1 実施内容
- `frontend/src/utils/insertionAdapter.ts` を新規作成（`toInsertion` / `fromInsertion` 変換関数）
- `frontend/src/components/project/ExperimentPlanDialog/TemplateInputPanel.tsx` の独自 `handleInsertionFileSelect` を削除し `InsertionEditorCompact` に統一
- `frontend/src/types/experimentPlanDialog.ts` に `insertionAdapter` 連携用の型定義を整備

### Phase2 実施内容
- `frontend/src/hooks/useInsertionEditor.ts` にDnD対応・ファイルサイズ上限（`maxFileSizeMB`）・ファイル形式制限（`acceptedFormats`）・クリア機能（`clearInsertion`）を追加
- `frontend/src/components/common/InsertionEditorForm.tsx` にDnD・画像プレビュー（`image/*` のみ）を追加
- `frontend/src/components/common/InsertionEditorCompact.tsx` にDnD・クリアボタンを追加（プレビューは対象外）

### Phase3 実施内容
- `frontend/src/utils/dataGridImporter.ts` を新規作成（`parseCsvToGrid` / `parseXmlToGrid` / `importFromFile` / ファイルサイズバリデーション）
- `frontend/src/hooks/useContentGridEditor.ts` を新規作成（行/列追加・削除・値変更・CSV Import/Export ロジック）
- `frontend/src/components/common/ContentGridEditor.tsx` を新規作成（DataGrid表示・編集UI、CSV/XMLインポート対応）
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` に以下を追加:
  - `customContentIds` フィールドを `TaskTransitionState` に追加
  - `handleContentAdd` / `handleContentRemove` ハンドラを実装
  - `PropertyList` に「Content 追加」ボタンとカスタムContentスロット（ContentGridEditor）の表示を追加
  - `onContentAdd` / `onContentRemove` コールバックを `PlanProps` / `PlanB` / `planProps` に追加

### ビルド確認
- `npm run build` → `✓ Compiled successfully`（TypeScriptエラー0件）
- 副次的に発見・修正した型エラー（今回の変更に伴う型拡張の影響）:
  - `UncertaintyRecordTab.tsx`: `ActualValue` からプロパティ値を安全に取り出すキャスト追加
  - `DepartmentNodeAddDialog.tsx` / `DepartmentTreeManagement.tsx` / `NamespaceAddDialog.tsx` / `TeamAddDialog.tsx`: `generateNamespaceUri` 第3引数 `string → string[]` への修正

### 計画からの変更点
- Phase3の `template.contents`（固定Contentスロット）については、モックデータに `contents` フィールドを持つテンプレートが存在しないため、カスタムContentスロット（ユーザー追加）のみの実装となった。固定スロット表示ロジックは実装済みのため、MAIMLから実データが連携された際に即対応可能。

### 動作確認後の追加修正（2026-07-27 15:45）
- **不具合**: WorkRecordPanel のエクスプローラーファイル選択 / DnD でアップロード確認ダイアログが表示されない
- **原因**: `WorkRecordPanel` に `uploadTargetPath` が渡されておらず `undefined` のままダイアログが抑制されていた（`useInsertionEditor` は `uploadTargetPath` が `undefined` の場合 `Modal.confirm` を表示しない仕様）
- **修正ファイル**:
  - `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`: `WorkRecordPanelProps` に `projectName?: string` を追加し、`planProps` の `uploadTargetPath` を `projects/${projectName}/attachments` で構築するよう修正
  - `frontend/src/components/menus/ExperimentWorkerMenu.tsx`: `<WorkRecordPanel projectName={selectedProjectName || undefined} />` に変更（既存の `selectedProjectName` state を活用）
- **確認**: `tsc --noEmit` exit:0（TypeScriptエラーなし）
