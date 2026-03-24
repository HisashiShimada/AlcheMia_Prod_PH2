# タスク計画書: ノード表示切替ドロップダウン editorv2 取込

## メタデータ
- **作成日時**: 2026-03-19 15:28
- **タスクID**: node-display-dropdown-editorv2
- **優先度**: 中
- **推定工数**: 4〜5時間

---

## タスク概要

reference の `PetriNetEditorV2` に実装済みの「ノード表示属性切替ドロップダウン」を、現行の `editorv2`（Ant Design 版）に移植する。  
ペトリネットキャンバス上の各ノードに表示するテキストを「ノード名 / ノードID / テンプレートID / ノードDesc / テンプレート名 / テンプレートDesc」の6種から切り替えられるようにする。

---

## 目的と期待される成果

### 目的
- 現行 editorv2 にてペトリネットビューのノードラベルを任意の属性に切り替えできるようにする
- reference で未解決だったテンプレート名・テンプレートDescの表示を正しく動作させる

### 期待される成果
- [ ] ペトリネットモード時にツールバーに「表示属性」ドロップダウンが表示される
- [ ] ドロップダウンで選択した属性がすべてのノードに即時反映される
- [ ] 全6選択肢（ノードID / テンプレートID / ノードDesc / ノード名 / テンプレートDesc / テンプレート名）が正しく動作する
- [ ] テンプレート名・テンプレートDesc は `data.template.name` / `data.template.description` から正しく取得される
- [ ] 選択状態が localStorage に永続化される

---

## 実装ステップ

### Phase 1: Context 作成
- [ ] `frontend/src/contexts/AttributeDisplayContext.tsx` を新規作成
  - `ATTRIBUTE_OPTIONS` 定数を定義（reference 版と同等）
  - `selectedAttribute` state と `setSelectedAttribute` を提供する Context を実装
  - localStorage への永続化処理を含める
  - `useAttributeDisplay` カスタムフックをエクスポート

### Phase 2: ノードコンポーネントの修正
- [ ] `MaterialPlaceNode.tsx` を修正
  - `useAttributeDisplay` を呼び出して `selectedAttribute` を取得
  - `data.label`（固定）→ 選択属性に応じた動的ラベルに変更
  - テンプレート関連は `data.template?.name` / `data.template?.description` を参照

- [ ] `ConditionPlaceNode.tsx` を修正
  - `MaterialPlaceNode.tsx` と同様の修正

- [ ] `ResultPlaceNode.tsx` を修正
  - `MaterialPlaceNode.tsx` と同様の修正

- [ ] `TransitionNode.tsx` を修正
  - `useAttributeDisplay` を呼び出して `selectedAttribute` を取得
  - テンプレートID → `instructionId` / テンプレートDesc → `instructionDescription` / テンプレート名 → `instructionName` にマッピング（reference 版の仕様踏襲）
  - `instructionId` / `instructionName` / `instructionDescription` が空の場合はフォールバックとして `data.name` を表示

### Phase 3: EditorToolbar の修正
- [ ] `EditorToolbar.tsx` の Props インターフェースに以下を追加
  ```ts
  selectedAttribute?: string;
  onSelectedAttributeChange?: (value: string) => void;
  ```
- [ ] ペトリネットモード（`viewMode === 'petriNet'`）のときのみ「表示属性」Select ドロップダウンを表示

### Phase 4: PetriNetEditorInner の修正
- [ ] `PetriNetEditorInner.tsx` に `AttributeDisplayProvider` をラップ
- [ ] `EditorToolbar` に Props を渡す（Context 経由で管理するため Props 不要の場合は省略可）

### Phase 5: 動作確認・テスト
- [ ] ドロップダウン切り替えで各ノードのラベルが変わることを確認
- [ ] テンプレート名・テンプレートDesc が正しく表示されることを確認（reference との差異確認）
- [ ] ページリロード後も前回選択状態が復元されることを確認（localStorage 永続化）
- [ ] テンプレートモード切替時に影響しないことを確認

---

## 変更するファイル一覧

### 新規作成
1. `frontend/src/contexts/AttributeDisplayContext.tsx` — 選択状態管理 Context

### 修正
2. `frontend/src/components/editorv2/components/nodes/MaterialPlaceNode.tsx` — 動的ラベル対応
3. `frontend/src/components/editorv2/components/nodes/ConditionPlaceNode.tsx` — 動的ラベル対応
4. `frontend/src/components/editorv2/components/nodes/ResultPlaceNode.tsx` — 動的ラベル対応
5. `frontend/src/components/editorv2/components/nodes/TransitionNode.tsx` — 動的ラベル対応（instructionマッピング込み）
6. `frontend/src/components/editorv2/components/EditorToolbar.tsx` — ドロップダウン UI 追加
7. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` — AttributeDisplayProvider のラップ

---

## 技術仕様

### AttributeDisplayContext の定数・型定義

```ts
export const ATTRIBUTE_OPTIONS = {
  NODE_ID:               'nodeId',
  TEMPLATE_ID:           'templateId',
  NODE_DESCRIPTION:      'nodeDescription',
  NODE_NAME:             'nodeName',
  TEMPLATE_DESCRIPTION:  'templateDescription',
  TEMPLATE_NAME:         'templateName',
} as const;

export type AttributeOption = typeof ATTRIBUTE_OPTIONS[keyof typeof ATTRIBUTE_OPTIONS];

const STORAGE_KEY = 'maiml_attribute_display_settings';
const DEFAULT_ATTRIBUTE: AttributeOption = ATTRIBUTE_OPTIONS.NODE_NAME;
```

### ノードコンポーネントのラベル生成ロジック（Place 共通）

```ts
const getLabel = (): string => {
  switch (selectedAttribute) {
    case ATTRIBUTE_OPTIONS.NODE_ID:          return data.id || '';
    case ATTRIBUTE_OPTIONS.NODE_NAME:        return data.name || data.label || '';
    case ATTRIBUTE_OPTIONS.NODE_DESCRIPTION: return data.description || '';
    case ATTRIBUTE_OPTIONS.TEMPLATE_ID:      return data.templateId || '';
    case ATTRIBUTE_OPTIONS.TEMPLATE_NAME:    return data.template?.name || '';
    case ATTRIBUTE_OPTIONS.TEMPLATE_DESCRIPTION: return data.template?.description || '';
    default:                                 return data.name || data.label || data.id || '';
  }
};
```

### ノードコンポーネントのラベル生成ロジック（Transition）

```ts
const getLabel = (): string => {
  switch (selectedAttribute) {
    case ATTRIBUTE_OPTIONS.NODE_ID:          return data.id || '';
    case ATTRIBUTE_OPTIONS.NODE_NAME:        return data.name || '';
    case ATTRIBUTE_OPTIONS.NODE_DESCRIPTION: return data.description || '';
    case ATTRIBUTE_OPTIONS.TEMPLATE_ID:      return data.instructionId || '';
    case ATTRIBUTE_OPTIONS.TEMPLATE_NAME:    return data.instructionName || data.name || '';
    case ATTRIBUTE_OPTIONS.TEMPLATE_DESCRIPTION: return data.instructionDescription || data.description || '';
    default:                                 return data.name || data.label || data.id || '';
  }
};
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `data.template` が null の場合にクラッシュ | 高 | 中 | オプショナルチェーン（`?.`）を使用 |
| Transition の `instructionId` 等が常に空 | 中 | 高 | petriNetExtractor の設定状況を別途調査。空の場合は `data.name` フォールバック |
| Context が ReactFlow 外で使えない | 中 | 低 | Provider を ReactFlow の外側（PetriNetEditorInner）にラップ |
| `data.label` が別途セットされているノードの表示崩れ | 低 | 低 | デフォルト選択肢 `NODE_NAME` で既存の `data.name` を使用するため影響なし |

---

## テスト計画

### 手動テスト
- [ ] ドロップダウンの全6選択肢を切り替えて各ノードのラベルが変わることを確認
- [ ] テンプレートが設定されているノードで「テンプレート名」「テンプレートDesc」が表示されることを確認
- [ ] テンプレートが設定されていないノードで「テンプレート名」「テンプレートDesc」を選択した場合に空表示になることを確認
- [ ] ページリロード後に前回の選択状態が復元されることを確認（localStorage）
- [ ] ペトリネット→テンプレートモード切替後に戻した際にドロップダウン状態が維持されることを確認

---

## 承認記録
- **計画書提示日時**: 2026-03-19 15:28
- **承認日時**: （承認後に記入）
- **承認者コメント**: 
