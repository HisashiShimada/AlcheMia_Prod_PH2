# 調査レポート: ReactFlow上のPlaceノード・Transitionノードのテンプレート情報設定箇所

- **作成日時**: 2026-03-27 08:32
- **目的**: Transitionに対する入力テンプレートの表示に関する課題が現行版でも存在するかを調査

---

## 1. テンプレート情報の全体的な流れ

```
MAIMLデータ（XML文字列）
  ↓ MaimlParserTyped.getTemplates()          ← テンプレート抽出
  ↓ buildTemplateMap()（petriNetExtractor.ts）← placeId → Template マッピング構築
  ↓ convertToReactFlowFormat()（reactFlowConverter.ts）  ← Placeノードにtemplate情報をセット
  ↓ maimlToReactFlow()（editorv2用コンバーター）        ← EditorV2用変換
ReactFlowノードの data.template / data.properties にセット
```

---

## 2. 各ファイルの役割と設定箇所

### ① `frontend/src/utils/petriNetExtractor.ts` — `buildTemplateMap()`

**役割**: placeのテンプレートマップ構築

- `MaimlParserTyped.getTemplates()` でmaterial/condition/resultを取得
- **キー**: `placeRef.ref`（placeのID） → Templateオブジェクトにマッピング
- 複数の `placeRefs` がある場合は全エントリをマップに登録
- `placeRef.ref` が空の場合は `placeRef.id` をフォールバックとして使用

---

### ② `frontend/src/utils/reactFlowConverter.ts` — `convertToReactFlowFormat()`

**役割**: Placeノードへのテンプレート情報セット

```typescript
// Placeノードのdataに設定されるtemplate情報
const nodeData = {
  template: template || undefined,        // Template型全体
  templateRef: templateRef,               // Template型（スプレッドコピー）
  templateId: template?.id,
  placeType: template?.category || '',    // 'material'/'condition'/'result'
  properties: template?.properties || [],
};
```

**Transitionノードのdata（テンプレート情報なし）**

```typescript
{
  name: transition.name || transition.description || transition.id,
  description: transition.description || '',
  instructionId: parser.getInstructionIdByTransitionId(transition.id),
  // ※ transitionに対するtemplate情報は直接セットされていない
}
```

---

### ③ `frontend/src/components/editorv2/utils/converters/maimlToReactFlow.ts`

**役割**: EditorV2用のノード変換

- `convertPlaceNodeForEditor()`:
  - `templateMap[node.id]` を取得し `node.data.template` と `node.data.properties` にセット
- `convertTransitionNodeForEditor()`:
  - テンプレート情報は設定せず、`name / description / instructionId` のみ

---

### ④ `frontend/src/contexts/TemplateContext.tsx`

**役割**: グローバルテンプレート状態管理

- `maimlData` 変更時に `MaimlParserTyped.getTemplates()` でテンプレートを抽出
- `activeMethodIndex` に基づき `methodId` でフィルタリングして表示
- `methodId === null/undefined` のテンプレートを「共通テンプレート」として分離
- Contextが提供する3種のテンプレートデータ：

| プロパティ名 | 内容 |
|---|---|
| `templates` | 現在アクティブなmethodのテンプレートのみ |
| `allTemplates` | 全テンプレート（methodフィルタなし） |
| `commonTemplates` | methodIdがnull/undefinedのテンプレート |

---

### ⑤ `frontend/src/components/editorv2/components/PropertyPanel.tsx`

**役割**: Placeノードのテンプレート編集UI

- テンプレート編集ボタン押下時に `allTemplates[category]` から `placeRefs.some(ref => ref.ref === nodeId)` でテンプレートを逆引き検索
- 見つかった場合: 既存テンプレートをそのまま使用
- 見つからない場合: `templateId = "${placeType}Template_${Date.now()}"` で新規作成
- **Transitionノード選択時はテンプレート編集UI自体が表示されない**（`isPlace` フラグで制御）

---

### ⑥ `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`

**役割**: 実験ワーカー画面でのトランジション記録時テンプレート入力

- テンプレート一覧の取得優先順位：
  1. APIから取得（`getTemplateData()`）→ `fetchedTemplates`
  2. フォールバック: `transition.templates`（APIから渡された静的データ）

- テンプレートのIN/OUT判定ロジック:

```typescript
// Results のみ OUT、それ以外（Materials・Conditions）は IN
const isOutput = record.category === 'Results';
const ioLabel = isOutput ? 'OUT' : 'IN';
```

---

### ⑦ `frontend/src/components/viewer/PetriNetViewer.tsx`

**役割**: 閲覧用ペトリネット表示

- Placeノードクリック時: `node.data.properties` からプロパティ情報を取得しDrawerに表示
- Transitionノードクリック時: `onOpenSubNetViewer` コールバックを呼び出してサブネット表示（テンプレート情報は `templateMap` 経由で渡す）

---

### ⑧ `frontend/src/components/nodes/TransitionNode.tsx`

**役割**: viewer用Transitionノード表示

- `instructionId / instructionName / instructionDescription` を表示切替（`AttributeDisplayContext` の `selectedAttribute` に基づく）
- テンプレート（material/condition/result）情報は保持しない

---

## 3. 現行版での問題箇所

### 問題1: `DataRecordDialog.tsx` — IN/OUTの判定が不完全

**場所**: `DataRecordDialog.tsx` のテンプレート一覧カラム内 `render` 関数

```typescript
// 現行: Resultsのみ OUT、Materials と Conditions は全て IN として扱う
const isOutput = record.category === 'Results';
```

**問題点**: Transitionへの「入力テンプレート（INPUT）」と「出力テンプレート（OUTPUT）」の区別が、カテゴリ名だけで行われています。本来はMAIMLのアーク（arc）方向（`source → transition` が入力、`transition → target` が出力）で判定すべきですが、現行の `transition.templates` には接続方向の情報が含まれておらず、方向の区別ができていません。

**結果**: ConditionテンプレートとMaterialテンプレートが一律に「IN」と表示され、出力側のMaterialが存在する場合でも正しく「OUT」と表示されません。

---

### 問題2: `reactFlowConverter.ts` / `maimlToReactFlow.ts` — TransitionノードにPlace情報が渡らない

**場所**: Transitionノードの `data` 生成部分

```typescript
// Transitionノードのdataにはtemplate情報が含まれていない
{
  nodeType: 'transition',
  label: transition.name || transition.id,
  instructionId: ...,
  // inputTemplates / outputTemplates などは存在しない
}
```

**問題点**: Transitionノードをクリックした際に「どのPlaceが入力か・出力か」という情報がTransitionノード自体に含まれていません。入力テンプレートを取得するには `edges.filter(e => e.target === transitionId)` でエッジを逆引きし、そのソースPlaceのtemplate情報を取得する必要があります。

---

### 問題3: `TemplateContext.tsx` — 単一methodのフィルタリングによる取りこぼし

**場所**: `filteredTemplates` の `useMemo` 内

```typescript
// templateMethodId が currentMethodId と一致するもののみ通過
material: templates.material.filter((t) => t.methodId === currentMethodId),
```

**問題点**: `methodId` が正確に一致しない場合（例: methodIdがundefinedとnullで不一致、大文字小文字の差異など）、テンプレートが意図せず除外されます。デバッグログは出力されますが、UIには「テンプレートがありません」と表示されるだけで原因が分かりません。

---

### 問題4: `PropertyPanel.tsx` — `templateRef` と `template` の参照不一致

**場所**: `PropertyPanel.tsx` のプロパティ数表示

```typescript
// templateRef を参照しているが、実態は template.properties に入っている場合がある
<Text>プロパティ数: {selectedNode.data.templateRef?.properties?.length || 0}件</Text>
```

**問題点**: `reactFlowConverter.ts` では `template` と `templateRef` が別々のオブジェクトとして生成されており、どちらかが `undefined` になる場合は表示が「0件」になります。

---

## 4. 調査対象ファイル一覧

| ファイル | 役割 |
|---------|------|
| `frontend/src/utils/petriNetExtractor.ts` | placeId → Templateマッピング構築（`buildTemplateMap`） |
| `frontend/src/utils/reactFlowConverter.ts` | PlaceノードへのTemplate情報セット、Transitionにはtemplate情報なし |
| `frontend/src/components/editorv2/utils/converters/maimlToReactFlow.ts` | EditorV2用ノード変換・PlaceTypeとTemplate設定 |
| `frontend/src/contexts/TemplateContext.tsx` | グローバルTemplateState（methodIdでフィルタリング） |
| `frontend/src/components/editorv2/components/PropertyPanel.tsx` | Placeテンプレート編集UI（Transitionには非表示） |
| `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` | テンプレートの詳細編集ダイアログ |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | トランジション記録時のテンプレート一覧・入力UI |
| `frontend/src/components/viewer/PetriNetViewer.tsx` | 閲覧用ペトリネット（クリック時のtemplate表示） |
| `frontend/src/components/nodes/TransitionNode.tsx` | viewer用Transitionノード（instructionIdベースの表示） |
