# PetriNetEditorInner Phase 9.3 計画書

## メタデータ
- **作成日時**: 2026-01-30 14:25
- **Phase**: Phase 9.3 - 暗黙的any型の一括修正
- **優先度**: 高
- **推定工数**: 30分

---

## 目的

Phase 9.2で残された約40箇所の暗黙的any型エラーを修正し、TypeScript型チェックを通過させる。

---

## 修正対象パターン

### パターン1: イベントハンドラ（約10箇所）
```typescript
// ❌ Before
const handlePaneClick = useCallback((event) => {
const handleEdgeClick = useCallback((event, edge) => {

// ✅ After
const handlePaneClick = useCallback((event: React.MouseEvent) => {
const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge<EdgeData>) => {
```

### パターン2: mapコールバック（約15箇所）
```typescript
// ❌ Before
.map((method, index) => {
.filter(edge => {
.forEach((templateEl: Element) => {

// ✅ After
.map((method: Method, index: number) => {
.filter((edge: Edge<EdgeData>) => {
.forEach((templateEl: Element) => {  // 既に型あり
```

### パターン3: catchブロック（約10箇所）
```typescript
// ❌ Before
} catch (err) {
  console.error('エラー:', err);
  alert(`エラー: ${err.message}`);

// ✅ After
} catch (err) {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error('エラー:', error.message);
  alert(`エラー: ${error.message}`);
```

### パターン4: 関数パラメータ（約5箇所）
```typescript
// ❌ Before
const handleSaveTemplate = useCallback((nodeId, templateRef, isNewTemplate, ...) => {
const handleSaveDocument = useCallback((newDocumentData) => {

// ✅ After
const handleSaveTemplate = useCallback((
  nodeId: string,
  templateRef: TemplateRef,
  isNewTemplate: boolean,
  templateCategory: string,
  isCommonTemplate: boolean,
  methodId: string | null
) => {
const handleSaveDocument = useCallback((newDocumentData: DocumentData) => {
```

---

## 実施ステップ

### Step 1: イベントハンドラの型付け（5分）
- handlePaneClick
- handleEdgeClick（既にある可能性あり）

### Step 2: mapコールバックの型付け（10分）
- methodsData.map
- methods.map
- edges.filter/map
- archiveFiles.map
- 他のmap/filter

### Step 3: catchブロックの修正（10分）
- 約10箇所のcatchブロック
- エラー型を統一

### Step 4: 関数パラメータの型付け（5分）
- handleSaveTemplate
- handleSaveDocument
- convertNestedPropertiesToArray
- その他

---

## 修正箇所リスト

### 高優先度（必須）
- Line 973: handlePaneClick の event
- Line 887: methods.map の method
- Line 1038: edges.map の edge
- Line 1066: methods.map の method
- Line 1219: edges.map の edge
- Line 1305: edges.filter の e
- Line 1321-1323: validateErr 型エラー
- Line 1336-1337: err 型エラー
- Line 1558, 1560: file の型
- Line 1570: err 型エラー
- Line 1580: event の型
- Line 1790: propertiesObj の型
- Line 1801: prop の型
- Line 1856: handleSaveTemplate の全パラメータ
- Line 2068: newDocumentData の型
- Line 2240: templateId の型
- Line 2257: draft の型
- Line 2312: err 型エラー
- Line 2453: file の型
- Line 2498: err 型エラー
- Line 2688: err 型エラー
- Line 2700: selectedErrors の型
- Line 2741: err 型エラー
- Line 2754: 3つのパラメータの型
- Line 2951-2953, 2956: err 型エラー
- Line 2963: metadata の型
- Line 3018: err 型エラー
- Line 3025: event, edge の型

---

## 成功基準

1. ✅ TypeScript型エラーが70件→30件以下に減少
2. ✅ 暗黙的any型エラーが40件→0件に減少
3. ✅ ビルドが成功する（警告のみは許容）
4. ✅ 実行時エラーが発生しない

---

## リスク

### 中リスク
- 大量の修正による副作用
- 型定義の不一致による新たなエラー

### 対策
- 1パターンずつ修正してtscチェック
- コンパイルエラーが増える場合はロールバック

---

## 次のPhase

### Phase 9.4: 型不一致の修正（約20箇所）
- DocumentData型の統一
- ValidationResult型の統一
- React Flow型の不一致

---

**作成日時**: 2026-01-30 14:25
**次回作業**: Step 1から順次実施