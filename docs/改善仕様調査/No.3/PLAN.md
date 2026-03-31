# タスク計画書: MAIMLエディタ XMLビュー機能追加

## メタデータ
- **作成日時**: 2026-03-30 15:50
- **タスクID**: maiml-editor-xml-view
- **優先度**: 中
- **推定工数**: 3〜4時間

## タスク概要

以下の2箇所にXMLビュー機能を追加する。

### (A) MAIMLエディタ全体のXMLビュー（PetriNetEditorInner）
`frontend/src/reference/components/XMLViewer/` に実装されたXMLビュー機能（`XMLViewer.js` / `XMLViewer.css` / `XMLViewerWrapper.jsx`）を、現行のMaiml編集画面（`frontend/src/components/editorv2/`）に取り込む。

エディタのツールバーに「XMLビュー」タブを追加し、ペトリネット・テンプレートに続く第3のビューモードとして、現在のノード/エッジ状態をリアルタイムにMaiML XML文字列へ変換・シンタックスハイライト表示する。

### (B) TemplateEditorDialog の XMLビュー
`frontend/src/reference/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx` に実装されたテンプレート単体のXMLビュー機能を、現行の `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` に取り込む。

ダイアログ内に「UI編集」「XMLビュー」の2タブを追加し、テンプレートデータをXMLとして表示・編集・保存できるようにする。  
変換ユーティリティ `templateToXML.js`（`convertTemplateToXML` / `parseXMLToTemplate` / `validateTemplateXML`）もTypeScriptに移植する。

---

## 目的と期待される成果

### 目的
- ユーザーがペトリネットを編集しながら生成されるMAIML XMLを随時確認できるようにする
- ファイル保存前に内容を視覚的に検証できる

### 期待される成果

#### (A) エディタ全体のXMLビュー
- [ ] `XMLViewer` コンポーネントをTypeScript（.tsx）に移植して `editorv2` 配下に配置
- [ ] `XMLViewerWrapper` コンポーネントをTypeScript（.tsx）に移植して `editorv2` 配下に配置
- [ ] `EditorToolbar` の `viewMode` に `'xml'` を追加
- [ ] `PetriNetEditorInner` の `viewMode` State / UI切り替えに `'xml'` を追加
- [ ] XMLビューでコピー・ダウンロードが動作する

#### (B) TemplateEditorDialog のXMLビュー
- [ ] `templateToXML.ts` 変換ユーティリティをTypeScriptに移植して `editorv2/utils/converters/` に配置
- [ ] `TemplateEditorDialog.tsx` に「UI編集」「XMLビュー」タブを追加
- [ ] XMLビューでテンプレートXMLを表示・直接編集できる
- [ ] XMLビューから UI編集タブに戻る際に XML の変更が UI に自動反映される
- [ ] XMLビューのバリデーション機能が動作する
- [ ] XMLビューから保存できる

---

## 実装ステップ

> **(A) エディタ全体のXMLビュー**

### Phase 1: XMLViewer コンポーネントのTS移植

- [ ] `frontend/src/components/editorv2/components/XMLViewer.tsx` を新規作成
  - `XMLViewer.js` をTypeScriptに変換
  - props型定義を追加（`XMLViewerProps` インターフェース）
  - CSSは `XMLViewer.css` をそのまま流用（同ディレクトリに配置）
- [ ] `frontend/src/components/editorv2/components/XMLViewer.css` を新規作成
  - `reference/components/XMLViewer/XMLViewer.css` をコピー

### Phase 2: XMLViewerWrapper コンポーネントのTS移植

- [ ] `frontend/src/components/editorv2/components/XMLViewerWrapper.tsx` を新規作成
  - `XMLViewerWrapper.jsx` をTypeScriptに変換
  - `@mui/material` の `CircularProgress` / `Box` を Ant Design の `Spin` / `div` に置き換え（プロジェクト統一のため）
  - `convertReactFlowToMaiML` / `convertMultipleMethodsToMaiML` は `editorv2/utils/converters/` のものをimport
  - props型定義を追加（`XMLViewerWrapperProps` インターフェース）

### Phase 3: viewMode への 'xml' 追加

- [ ] `frontend/src/components/editorv2/components/EditorToolbar.tsx` を修正
  - `viewMode` 型を `'petriNet' | 'templates' | 'xml'` に変更
  - `Segmented` の options に「XMLビュー」を追加（アイコン: `CodeOutlined`）
- [ ] `frontend/src/components/editorv2/PetriNetEditorInner.tsx` を修正
  - `viewMode` State の型を `'petriNet' | 'templates' | 'xml'` に変更
  - `handleViewModeChange` のペトリネットビューポート保存ロジックを `'xml'` モード遷移にも適用
  - `PetriNetEditorInnerUI` の JSX にて、`viewMode === 'xml'` 時に `XMLViewerWrapper` を表示するブロックを追加
  - `PetriNetEditorInnerUIProps` の型定義も更新

### Phase 4: components/index.ts エクスポート更新

- [ ] `frontend/src/components/editorv2/components/index.ts` に `XMLViewer` / `XMLViewerWrapper` をエクスポート追加

### Phase 5: (A) 動作確認

- [ ] ローカル環境でビルドエラーがないことを確認（`npm run build` または TypeScript コンパイル）
- [ ] ペトリネット編集画面でツールバー「XMLビュー」ボタンが表示されることを確認
- [ ] XMLビューに切り替えると現在のMAIML XMLがシンタックスハイライト付きで表示されることを確認
- [ ] コピー・ダウンロードボタンが動作することを確認
- [ ] ペトリネット/テンプレート/XMLビュー間の切り替えが正常に動作することを確認

---

> **(B) TemplateEditorDialog のXMLビュー**

### Phase 6: templateToXML.ts 変換ユーティリティのTS移植

- [ ] `frontend/src/components/editorv2/utils/converters/templateToXML.ts` を新規作成
  - `reference/components/PetriNetEditorV2/utils/converters/templateToXML.js` をTypeScriptに変換
  - `convertTemplateToXML(templateData, templateType)` に型定義を追加
  - `parseXMLToTemplate(xmlString)` に戻り値型を追加（`ParseResult` インターフェース）
  - `validateTemplateXML(xmlString)` に戻り値型を追加（`ValidationResult` インターフェース）
- [ ] `frontend/src/components/editorv2/utils/converters/index.ts` に `templateToXML` のエクスポートを追加

### Phase 7: TemplateEditorDialog にXMLビュータブを追加

- [ ] `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` を修正
  - XMLビュー用 State を追加
    - `activeTab: 'ui' | 'xml'`
    - `xmlContent: string`
    - `xmlErrors: XmlError[]`
    - `hasUnsyncedXmlChanges: boolean`
  - `Tabs` コンポーネント（Ant Design）をModalタイトル下に追加（「UI編集」「XMLビュー」）
  - `handleTabChange` ハンドラーを実装
    - `'ui' → 'xml'` 切り替え時: `convertTemplateToXML` で UI State → XML 文字列変換
    - `'xml' → 'ui'` 切り替え時: `parseXMLToTemplate` で XML → UI State 反映（変更ある場合）
  - `handleXmlContentChange` ハンドラーを追加（TextArea 変更時）
  - `handleValidateXml` ハンドラーを追加（`validateTemplateXML` 呼び出し）
  - 保存処理（`handleSave`）にXMLビューからの保存対応を追加
  - `activeTab === 'xml'` 時のUIを追加
    - Ant Design `Tabs` タブパネル内に `TextArea`（monospace）
    - バリデーションボタン（`<CodeOutlined>` アイコン）
    - エラー表示（`Alert` コンポーネント）
    - 未同期変更警告

### Phase 8: (B) 動作確認

- [ ] TemplateEditorDialog を開き「XMLビュー」タブが表示されることを確認
- [ ] UI編集 → XMLビューに切り替え: テンプレートのXMLが表示されることを確認
- [ ] XMLビューでXMLを直接編集 → UI編集に戻る: UI State に反映されることを確認
- [ ] XMLエラーがある状態で保存 → エラーメッセージが表示されることを確認
- [ ] XMLビューから保存: 変更が正しく保存されることを確認

---

## 変更ファイル一覧

### (A) 新規作成
1. `frontend/src/components/editorv2/components/XMLViewer.tsx` - XMLビューアコンポーネント（TS版）
2. `frontend/src/components/editorv2/components/XMLViewer.css` - XMLビューアスタイル
3. `frontend/src/components/editorv2/components/XMLViewerWrapper.tsx` - 非同期XML生成ラッパー（TS版）

### (A) 修正
4. `frontend/src/components/editorv2/components/EditorToolbar.tsx` - viewModeに'xml'追加
5. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - viewMode State/UI切り替えに'xml'追加
6. `frontend/src/components/editorv2/components/index.ts` - エクスポート追加（XMLViewer, XMLViewerWrapper）

### (B) 新規作成
7. `frontend/src/components/editorv2/utils/converters/templateToXML.ts` - テンプレートXML変換ユーティリティ（TS版）

### (B) 修正
8. `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` - XMLビュータブ追加
9. `frontend/src/components/editorv2/utils/converters/index.ts` - templateToXML エクスポート追加

---

## 技術的詳細

### 参照元（reference版）
- `frontend/src/reference/components/XMLViewer/XMLViewer.js`
- `frontend/src/reference/components/XMLViewer/XMLViewer.css`
- `frontend/src/reference/components/XMLViewer/XMLViewerWrapper.jsx`

### 移植時の主な変更点

| 変更内容 | 理由 |
|---------|------|
| `.js`/`.jsx` → `.tsx` | プロジェクトのTypeScript統一方針 |
| `@mui/material` → Ant Design (`Spin`) | プロジェクトUIライブラリ統一（`EditorToolbar.tsx`参照） |
| 型定義追加（props, state） | TypeScript型安全性 |
| import パス変更 | `editorv2/utils/converters/` を参照 |

### viewMode 型変更の影響範囲
- `PetriNetEditorInner.tsx` の `viewMode` State
- `PetriNetEditorInnerUIProps` インターフェース
- `EditorToolbarProps` インターフェース
- `handleViewModeChange` ハンドラー

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| TypeScript型エラー（非同期処理） | 中 | 中 | `useEffect`内の型付けを丁寧に対応 |
| `convertMultipleMethodsToMaiML` の非同期/同期不一致 | 中 | 低 | reference版と同様に `useEffect` 内で await 処理 |
| ビューポート保存ロジックへの影響 | 低 | 低 | `'xml'`から`'petriNet'`へ戻る際も復元ロジックが動作するよう確認 |

---

## テスト計画

- [ ] TypeScriptコンパイルエラーなし
- [ ] ペトリネットにノード/エッジを追加 → XMLビューに切り替え → XML表示を確認
- [ ] 複数methodモードでも各methodのXMLが正しく出力されることを確認
- [ ] コピーボタン → クリップボード確認
- [ ] ダウンロードボタン → `.xml` ファイルのダウンロード確認
- [ ] ビュー切り替え後もペトリネットビューポートが保持されることを確認

---

## 承認記録

- **計画書提示日時**: 2026-03-30 15:50
- **承認日時**: （承認後記入）
- **承認者コメント**: 

---

## 実施記録

### 実施日時
開始: （作業開始後記入）
完了: （作業完了後記入）

### 最終的な成果物

#### (A) エディタ全体のXMLビュー
- [ ] XMLViewer.tsx 作成
- [ ] XMLViewer.css 作成
- [ ] XMLViewerWrapper.tsx 作成
- [ ] EditorToolbar.tsx 修正（viewMode に 'xml' 追加）
- [ ] PetriNetEditorInner.tsx 修正（viewMode State/UI 切り替え）
- [ ] components/index.ts 修正（エクスポート追加）

#### (B) TemplateEditorDialog のXMLビュー
- [ ] templateToXML.ts 作成（変換ユーティリティ TS 版）
- [ ] TemplateEditorDialog.tsx 修正（XMLビュータブ追加）
- [ ] utils/converters/index.ts 修正（templateToXML エクスポート追加）
