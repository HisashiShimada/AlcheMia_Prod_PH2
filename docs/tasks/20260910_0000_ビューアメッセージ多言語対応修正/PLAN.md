# タスク計画書: ビューアメッセージ多言語対応修正

## メタデータ

- **作成日時**: 2026-09-10 00:00
- **タスクID**: 20260910_0000
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## タスク概要

ProjectManagement 画面のビューアボタン押下時、および他のビューア関連コンポーネントで表示されるメッセージが英語のままハードコードされている。  
`useLanguage()` の `t()` 関数を使用した多言語対応（i18n）に統一し、日本語/英語の翻訳キーを `ja.json` / `en.json` に追加する。

---

## 目的と期待される成果

- [ ] `ViewRenderer.tsx` 内の英語ハードコード文字列をすべて翻訳キー経由に変更する
- [ ] `ViewRendererDialog.tsx` 内の英語ハードコード文字列をすべて翻訳キー経由に変更する
- [ ] `ja.json` の `viewer` セクションに不足している翻訳キーを追加する
- [ ] `en.json` の `viewer` セクションに対応する英語翻訳キーを追加する
- [ ] 変更後にビルドエラーが発生しないことを確認する

---

## 調査結果：英語ハードコード箇所の一覧

### ViewRenderer.tsx

| 行番号 | コンポーネント | 英語テキスト | 追加するキー |
|--------|--------------|------------|-------------|
| 122 | `NoSelectionView` | `"MAIML Viewer Enhanced v2.0"` | `viewer.noSelectionTitle` |
| 126 | `NoSelectionView` | `"Unified Desktop/Mobile Experiment Recording System"` | `viewer.noSelectionSubtitle` |
| 130 | `NoSelectionView` | `"Please select a file"` | `viewer.noSelectionHint` |
| 135 | `NoSelectionView` | `"🎯 Unified UX Flow (Desktop/Mobile)"` | `viewer.noSelectionFlowTitle` |
| 136 | `NoSelectionView` | `"• Select a MAIML file..."` | `viewer.noSelectionFlow1` |
| 137 | `NoSelectionView` | `"• Click \"Start Editing\" button..."` | `viewer.noSelectionFlow2` |
| 138 | `NoSelectionView` | `"• Click \"🧪 Experiment Record\" button..."` | `viewer.noSelectionFlow3` |
| 144 | `NoSelectionView` | `"Enhanced v2.0 Mode Enabled"` | `viewer.enhancedModeTitle` |
| 145 | `NoSelectionView` | `"Parquet/Glue-based high-speed search supported"` | `viewer.enhancedModeDesc` |
| 156 | `NoSelectionView` | `"Device Info"` | `viewer.deviceInfoTitle` |
| 163 | `NoSelectionView` | `"Type:"` | `viewer.deviceType` |
| 166-167 | `NoSelectionView` | `"Mobile:"` / `"Yes"/"No"` | `viewer.deviceMobile` / `viewer.yes` / `viewer.no` |
| 171-172 | `NoSelectionView` | `"Tablet:"` / `"Yes"/"No"` | `viewer.deviceTablet` |
| 176 | `NoSelectionView` | `"Screen Size:"` | `viewer.deviceScreenSize` |
| 204 | `UnsupportedFileView` | `"This file type cannot be displayed in the viewer"` | `viewer.unsupportedFileTitle` |
| 208-209 | `UnsupportedFileView` | `"You can download it and open it with another application."` | `viewer.unsupportedFileDesc` |
| 218 | `UnsupportedFileView` | `"Downloading..."` / `"Download File"` | `viewer.downloading` / `viewer.downloadFile` |
| 293 | `ViewRenderer` | `` `Method ${index + 1}` `` | `viewer.methodLabel`（`{index}` プレースホルダー使用） |
| 316 | `ViewRenderer` | `` `${count} method(s) detected` `` | `viewer.methodsDetected`（`{count}` プレースホルダー使用） |
| 374 | `ViewRenderer` | `` `{n} nodes, {m} transitions` `` | `viewer.methodNodeTransitions`（`{nodes}`, `{transitions}` プレースホルダー使用） |
| 487-488 | `renderExperimentView` | `"Experiment Recording System"` / `"Experiment recording feature is not yet implemented"` | `viewer.experimentRecordTitle` / `viewer.experimentRecordDesc` |
| 493 | `renderExperimentView` | `"Back to Main"` | `viewer.backToMain` |
| 510-511 | `renderExperimentControlView` | `"Experiment Control (Experiment Manager)"` / `"Experiment control feature is not yet implemented"` | `viewer.experimentControlTitle` / `viewer.experimentControlDesc` |

### ViewRendererDialog.tsx

| 行番号 | 英語テキスト | 追加するキー |
|--------|------------|-------------|
| 122 | `"Unknown"` | `viewer.dialogTitleUnknown` |
| 307 | `"Expand"` / `"Minimize"` | `viewer.dialogExpand` / `viewer.dialogMinimize` |
| 316 | `"Close"` | `viewer.dialogClose` |

---

## 実装ステップ

- [ ] **Step 1**: `ja.json` の `viewer` セクションに不足キーを追加
- [ ] **Step 2**: `en.json` の `viewer` セクションに対応する英語翻訳キーを追加
- [ ] **Step 3**: `ViewRenderer.tsx` の `NoSelectionView` コンポーネントに `useLanguage()` フックを追加し、英語ハードコードを `t()` に置き換え
- [ ] **Step 4**: `ViewRenderer.tsx` の `UnsupportedFileView` コンポーネントに `useLanguage()` フックを追加し、英語ハードコードを `t()` に置き換え
- [ ] **Step 5**: `ViewRenderer.tsx` のメインコンポーネント（`renderExperimentView`、`renderExperimentControlView`、複数メソッド検出メッセージ、メソッドタブ表示）の英語ハードコードを `t()` に置き換え
- [ ] **Step 6**: `ViewRendererDialog.tsx` の英語ハードコードを `t()` に置き換え
- [ ] **Step 7**: TypeScript のビルドエラーがないことを確認

---

## 変更ファイル

1. `frontend/src/locales/ja.json` — `viewer` セクションにキー追加
2. `frontend/src/locales/en.json` — `viewer` セクションにキー追加
3. `frontend/src/components/viewer/ViewRenderer.tsx` — ハードコード英語 → `t()` に置き換え
4. `frontend/src/components/viewer/ViewRendererDialog.tsx` — ハードコード英語 → `t()` に置き換え

---

## 影響範囲

- **影響あり**: ProjectManagement からビューアボタンを押下して開くダイアログ（`ViewRendererDialog`）、その内部の `ViewRenderer` → `PetriNetViewer`
- **影響なし**: バックエンド、DB、認証・認可、マルチテナント分離
- **既存機能への影響**: 表示文字列の翻訳適用のみ。ロジック変更なし

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `NoSelectionView` / `UnsupportedFileView` は関数型コンポーネントだが `useLanguage()` 未使用のため、フック追加後の動作確認が必要 | 低 | 低 | TypeScript ビルドで確認。コンポーネントは `React.FC` で定義されているためフック追加に問題なし |
| `t()` の翻訳キー名のタイポ | 低 | 低 | `ja.json` / `en.json` のキー名と `t()` 呼び出し箇所を一致させて確認 |
| プレースホルダー付きメッセージ（`{count}`, `{index}` 等）の変換漏れ | 中 | 低 | テンプレート文字列から `t('key', { count: n })` 形式への変換を実装後にレビュー |

---

## テスト計画

- [ ] `frontend` ディレクトリで `tsc --noEmit` によるビルドエラーなし確認
- [ ] 言語が日本語設定の場合、ビューアダイアログのメッセージが日本語で表示されること（手動確認）
- [ ] 言語が英語設定の場合、ビューアダイアログのメッセージが英語で表示されること（手動確認）

---

## 承認記録

- **計画書提示日時**: 2026-09-10 00:00
- **承認日時**: 2026-09-10
- **承認者コメント**: 承認します。

---

## 11. 実施記録

### 実施日時
開始: 2026-09-10
完了: 2026-09-10

### 計画からの変更点
- `ViewRendererDialog.tsx` のタイトル取得関数に `"Subnet: ..."` / `"🚀 Edit: ..."` のような英語ハードコードが含まれていたが、ファイル名・ノード名を動的に埋め込む文字列のため今回は対象外とし、`"Unknown"` フォールバックのみを翻訳対応した（計画通り）
- `message.success()` にインラインオブジェクトを渡していた箇所を規約（インラインオブジェクト引数禁止）に従い変数に代入してから渡す形に修正した

### 最終的な成果物
- [x] `frontend/src/locales/ja.json` — `viewer` セクションに32キー追加
- [x] `frontend/src/locales/en.json` — `viewer` セクションに32キー追加
- [x] `frontend/src/components/viewer/ViewRenderer.tsx` — 英語ハードコード25箇所を `t()` に置き換え（`NoSelectionView` / `UnsupportedFileView` に `useLanguage()` 追加）
- [x] `frontend/src/components/viewer/ViewRendererDialog.tsx` — 英語ハードコード4箇所を `t()` に置き換え
- [x] TypeScript ビルドエラーなし（`tsc --noEmit` Exit: 0）
