# タスク計画書: PetriNetEditorV2コンポーネント分析

## メタデータ
- **作成日時**: 2026-01-29 16:49
- **タスクID**: petrineteditor-v2-component-analysis
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

reference版のPetriNetEditorV2が使用している全コンポーネントをファイルごとに調査し、テキストベースでまとめる。

## 2. 目的と期待される成果

### 目的
- PetriNetEditorV2の完全な構造を理解する
- 使用されている全コンポーネントの依存関係を明確にする
- 今後の移植・修正作業の参考資料を作成する

### 期待される成果
- [ ] reference版PetriNetEditorV2のコンポーネント構成ドキュメント
- [ ] ファイルごとのコンポーネント使用状況まとめ
- [ ] 依存関係の可視化

## 3. 実装ステップ

### Phase 1: メインファイルの分析
- [x] `index.jsx` の確認（完了）
- [ ] `PetriNetEditorInner.jsx` の確認
- [ ] インポートされているコンポーネントをリストアップ

### Phase 2: サブコンポーネントの調査
- [ ] Toolbar関連コンポーネントの確認
- [ ] Dialog関連コンポーネントの確認
- [ ] Node関連カスタムコンポーネントの確認
- [ ] Utils/Hooks関連の確認

### Phase 3: 依存ライブラリの確認
- [ ] React Flow関連
- [ ] Material-UI関連
- [ ] その他のサードパーティライブラリ

### Phase 4: ドキュメント作成
- [ ] ファイルごとのコンポーネントリスト作成
- [ ] 依存関係の整理
- [ ] まとめドキュメントの作成

## 4. 影響範囲

### 調査対象ディレクトリ
- `reference/frontend/src/components/PetriNetEditorV2/`

### 出力ファイル
- `docs/V2移植/PetriNetEditorV2_コンポーネント構成分析.md`

## 5. 技術的詳細

### 確認済み情報
**index.jsx:**
- React
- ReactFlowProvider (from 'reactflow')
- PetriNetEditorInner (ローカル)

### 調査が必要なファイル
1. PetriNetEditorInner.jsx - メインロジック
2. Toolbar関連
3. Dialog関連
4. CustomNode関連
5. Hooks関連
6. Utils関連

## 6. 調査方法

### 作業フロー
1. **ファイル確認** → `read_file`でファイル内容を確認
2. **即座に記録** → 調査結果をまとめファイルに記録（次のファイルに進む前に必ず記録）
3. **次のファイルへ** → 上記を繰り返す

### 記録内容
- ファイル名
- インポートしているコンポーネント/ライブラリ
- **依存ファイルのパス（referenceをルートとした相対パス）**
- 主な機能・役割
- 使用箇所の概要

### パス記載ルール
- ✅ 正しい例: `frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx`
- ❌ 誤った例: `./PetriNetEditorInner.jsx`（相対パスのみは不可）

## 7. 承認記録

- **計画書提示日時**: 2026-01-29 16:49
- **承認待ち** → **承認依頼中**

## 8. 実施記録

### 実施日時
開始: 2026-01-29 16:49
完了: 2026-01-29 16:55（Phase 1完了）

### 進捗状況
- ✅ Phase 1: 100% 完了
  - index.jsx の確認完了
  - PetriNetEditorInner.jsx の確認完了
  - 分析ドキュメント作成完了
  - パス表記の統一完了（reference/ルート基準に修正）

### 完了した作業
1. `reference/frontend/src/components/PetriNetEditorV2/index.jsx` の分析
2. `reference/frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx` の分析
3. 主要な依存コンポーネント30+のリストアップ
4. 分析ドキュメント（`docs/V2移植/PetriNetEditorV2_コンポーネント構成分析.md`）の作成
5. パス表記の統一（全てreference/ルート基準に修正）

### 作成したドキュメント
- **`docs/V2移植/PetriNetEditorV2_コンポーネント構成分析.md`**
  - 2ファイルの詳細分析
  - 依存関係ツリー
  - 統計情報
  - 次の調査対象リスト

## 9. 成果物

### ✅ 完成したドキュメント

**ファイル名**: `docs/V2移植/PetriNetEditorV2_コンポーネント構成分析.md`

**内容**:
1. **ファイル別詳細分析**
   - index.jsx: エントリーポイント
   - PetriNetEditorInner.jsx: メインコンポーネント（30+の依存関係を網羅）

2. **依存関係ツリー**
   - 外部ライブラリ（React, ReactFlow, Material-UI）
   - コンポーネント（11個）
   - カスタムフック（3個）
   - ユーティリティ（5+個）
   - ノードコンポーネント（4個）

3. **統計情報**
   - 調査完了: 2ファイル
   - 識別されたコンポーネント: 30+個

4. **次の調査対象**
   - components/配下（11コンポーネント）
   - hooks/配下（3フック）
   - utils/配下（5+ユーティリティ）
   - ノードコンポーネント（4ノード）

### パス表記の統一
すべてのファイルパスを `reference/` ルート基準に統一しました。

**例**:
- ✅ `reference/frontend/src/components/PetriNetEditorV2/index.jsx`
- ✅ `reference/frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx`
- ✅ `reference/frontend/src/components/PetriNetEditorV2/components/EditorToolbar.jsx`

## 10. 今後の調査予定（Phase 2以降）

必要に応じて以下のコンポーネントの詳細調査を実施可能です：

### Phase 2: Toolbarコンポーネント（1個）
- EditorToolbar.jsx

### Phase 3: Dialogコンポーネント（6個）
- TemplateEditorDialog.jsx
- DocumentEditDialog.jsx
- WorkflowSelectorDialog.jsx
- SaveDialog.jsx
- SaveConfirmDialog.jsx
- ValidationPanel.jsx

### Phase 4: その他UIコンポーネント（4個）
- TemplateList (TemplateViewer.jsx)
- MethodTabPanel.jsx
- PropertyPanel.jsx
- DraftManager.jsx

### Phase 5: カスタムフック（3個）
- useHistory.js
- useWorkflow.js
- useDraftManager.js

### Phase 6: ユーティリティ（5+個）
- converters/reactFlowToMaiml.js
- converters/multiMethodConverter.js
- documentParser.js
- petriNetExtractor.js
- reactFlowConverter.js

### Phase 7: ノードコンポーネント（4個）
- MaterialTemplateNode.jsx
- ConditionTemplateNode.jsx
- ResultTemplateNode.jsx
- TransitionNode.jsx
