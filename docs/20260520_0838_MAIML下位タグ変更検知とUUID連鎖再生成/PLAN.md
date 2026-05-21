# タスク計画書: MAIML下位タグ変更検知とUUID連鎖再生成

## メタデータ
- **作成日時**: 2026-05-20 08:38
- **タスクID**: MAIML下位タグ変更検知とUUID連鎖再生成
- **優先度**: 中
- **推定工数**: 10-14時間
- **参考資料**: `docs/20260520_0827_MAIML_UUID管理修正/調査結果レポート.md`

---

## 1. タスク概要

MAIMLエディタで要素を編集した際に、変更された要素のUUIDをリアルタイムで再生成し、上位タグのUUIDも連鎖して再生成する。保存時は各要素が持つ現在のUUIDをそのまま出力する（保存時の比較処理は行わない）。

**対応する要件:**
- 要件3: タグの内容を変更した際にそのタグのUUIDを書き換える
- 要件4: 書き換わったタグを含む上位タグのUUIDを階層的に連鎖して書き換える

**タスクAとの関係:**
- タスクA（MAIMLParentタグ追加とDocumentUUID再採番）が編集開始時にdocument.uuidを再採番する
- タスクBの連鎖更新対象はprotocol以下とし、**document.uuidはタスクBの連鎖対象から除外する**

---

## 2. 設計方針: 編集中UUID状態管理（パターンB）

### 基本コンセプト

**保存時に比較するのではなく、編集操作時にUUIDを更新する。**

各要素（ReactFlowノード/エッジ、template等）にUUIDを状態として持たせる。上位タグ（pnml/program/method/protocol）のUUIDは別途 `upperUuids` として状態管理し、「変更フラグ（dirty）」が立った場合のみ保存時に再生成する。

```
[編集開始時]
  元MAIMLから各要素のUUIDを抽出
  → ReactFlowノード/エッジ の data.maimlUuid にセット
  → template の maimlUuid にセット
  → instruction の maimlUuid にセット
  → upperUuids（pnml/program/method/protocol）にセット
  → dirtyFlags（pnml/program/method/protocol）を全て false にリセット

[編集操作時]
  操作の種別に応じてUUID再生成とdirtyFlagsをセット:
  - place/transition/arc 変更 → 対象ノード/エッジの maimlUuid 再生成
                                → dirtyFlags: pnml, method, protocol をdirty
  - instruction 変更         → instruction.maimlUuid 再生成
                                → dirtyFlags: program, method, protocol をdirty
  - template のProperty変更  → template.maimlUuid 再生成（Propertyにuuidはない）
    ※プログラムレベルの場合   → dirtyFlags: program, method, protocol をdirty
    ※メソッドレベルの場合     → dirtyFlags: method, protocol をdirty
    ※プロトコルレベルの場合   → dirtyFlags: protocol をdirty
  - template 追加/削除       → 同上（レベルに応じた dirtyFlags セット）

[保存時]
  → 各ノード/エッジ: 現在の data.maimlUuid をそのまま出力（比較不要）
  → instruction: 現在の instruction.maimlUuid をそのまま出力
  → template: 現在の template.maimlUuid をそのまま出力
  → pnml/program/method/protocol: dirty=true なら generateUUID()、dirty=false なら upperUuids の既存UUID
  → document.uuid: documentData.uuid をそのまま使用（タスクAが採番済み）

[保存完了後]
  → upperUuids を保存後の新しいUUIDで更新（pnml/program/method/protocolのみ）
  → dirtyFlags を全て false にリセット
  ※ node/edge/template/instruction の maimlUuid は保存後もそのまま維持
```

### なぜパターンBが適切か

| 比較項目 | パターンA（毎回上位も更新） | パターンB（フラグ管理）|
|---------|------------------------|----------------------|
| 処理の重さ | ほぼ同等 | ほぼ同等 |
| 変更なし保存のUUID | 毎回変わる（❌ 要件違反） | 変わらない（✅ 正しい） |
| 実装の複雑さ | シンプル | 少し複雑（フラグ管理） |
| UUIDの意味的正確さ | 低 | 高 |

---

## 3. UUID階層構造と連鎖ルール

### UUID階層（型定義・XSD準拠）

```
<document>                  ← Document.uuid ※タスクAが採番済み（タスクBは更新しない）
  <protocol>                ← Protocol.uuid（必須）← upperUuids.protocol で管理
    <materialTemplate>      ← Template.uuid（必須）← template.maimlUuid で管理 ※プロトコルレベル
    <conditionTemplate>     ← Template.uuid（必須）← template.maimlUuid で管理
    <resultTemplate>        ← Template.uuid（必須）← template.maimlUuid で管理
    <method>                ← Method.uuid（必須）  ← upperUuids.methods[methodId] で管理
      <pnml>                ← PNML.uuid（必須）    ← upperUuids.pnmls[methodId] で管理
        <place>             ← Place.uuid（オプション）← node.data.maimlUuid で管理
        <transition>        ← Transition.uuid（オプション）← node.data.maimlUuid で管理
        <arc>               ← Arc.uuid（オプション）← edge.data.maimlUuid で管理
      <program>             ← Program.uuid（必須） ← upperUuids.programs[methodId] で管理
        <instruction>       ← Instruction.uuid（必須）← instruction.maimlUuid で管理
        <materialTemplate>  ← Template.uuid（必須）← template.maimlUuid で管理 ※プログラムレベル
        <conditionTemplate> ← Template.uuid（必須）← template.maimlUuid で管理
        <resultTemplate>    ← Template.uuid（必須）← template.maimlUuid で管理
      <materialTemplate>    ← Template.uuid（必須）← template.maimlUuid で管理 ※メソッドレベル
      <conditionTemplate>   ← Template.uuid（必須）← template.maimlUuid で管理
      <resultTemplate>      ← Template.uuid（必須）← template.maimlUuid で管理
  <data>                    ← Data.uuid（既存の再利用機能で対応済み）
  <eventLog>                ← EventLog.uuid（既存の再利用機能で対応済み）
```

**重要な型定義上の制約:**
- `Place / Transition / Arc` の uuid は**オプション**（`uuid?: string`）。UUIDを持たない場合がある
- `Property` には uuid フィールドが**存在しない**。Propertyが変わった場合はそれを含むTemplateのuuidを再生成する
- `Template` は protocol / method / program の3レベルに存在する

### dirtyFlag の連鎖ルール

| 変更操作 | UUID再生成対象 | dirtyFlags に追加 |
|--------|--------------|----------------|
| place 追加/削除/変更 | node.data.maimlUuid | pnml[methodId], method[methodId], protocol |
| transition 追加/削除/変更 | node.data.maimlUuid | pnml[methodId], method[methodId], protocol |
| arc 追加/削除/変更 | edge.data.maimlUuid | pnml[methodId], method[methodId], protocol |
| instruction 追加/削除/変更 | instruction.maimlUuid | program[methodId], method[methodId], protocol |
| programレベル template 追加/削除/Propertyの変更 | template.maimlUuid | program[methodId], method[methodId], protocol |
| methodレベル template 追加/削除/Propertyの変更 | template.maimlUuid | method[methodId], protocol |
| protocolレベル template 追加/削除/Propertyの変更 | template.maimlUuid | protocol |

---

## 4. 実装方針

### Step 1: 各要素へのUUID状態追加

#### ReactFlowノード/エッジ

```typescript
// ノードのdata型に maimlUuid を追加
interface PlaceNodeData {
  label: string;
  maimlUuid: string;  // 追加（Place.uuid はオプションだが、状態管理上は必ず保持する）
  // ...既存プロパティ
}

interface TransitionNodeData {
  label: string;
  maimlUuid: string;  // 追加
  // ...既存プロパティ
}

// エッジのdata型
interface ArcEdgeData {
  maimlUuid: string;  // 追加
  // ...既存プロパティ
}
```

#### Template / Instruction

```typescript
// 既存のtemplate型（フロントエンド用）に maimlUuid を追加
interface TemplateData {
  id: string;
  maimlUuid: string;  // 追加（Template.uuid に対応）
  // ...既存プロパティ
  // ※ PropertyData には uuid を追加しない（Property型にuuidフィールドはない）
}

// Instruction型に maimlUuid を追加
interface InstructionData {
  id: string;
  maimlUuid: string;  // 追加（Instruction.uuid に対応）
  // ...既存プロパティ
}
```

#### 上位タグUUID管理（PetriNetEditorInner.tsx）

```typescript
// 上位タグのUUID状態（pnml/program/method/protocolのみ）
interface UpperUuids {
  protocol: string;
  methods: Map<string, string>;   // methodId → uuid
  pnmls: Map<string, string>;     // methodId → uuid
  programs: Map<string, string>;  // methodId → uuid
}

// 変更フラグ
interface DirtyFlags {
  protocol: boolean;
  methods: Set<string>;   // 変更のあったmethodId
  pnmls: Set<string>;     // 変更のあったmethodId
  programs: Set<string>;  // 変更のあったmethodId
}

const [upperUuids, setUpperUuids] = useState<UpperUuids>(...);
const [dirtyFlags, setDirtyFlags] = useState<DirtyFlags>({
  protocol: false,
  methods: new Set(),
  pnmls: new Set(),
  programs: new Set(),
});
```

---

### Step 2: 編集開始時のUUIDロード

**修正ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

MAIML読み込み完了後に `MaimlParserTyped` で各要素のUUIDを抽出し、stateにセットする。

```typescript
// MAIML読み込み完了後
if (maimlData) {
  const uuids = extractUuidsFromMaiml(maimlData);  // 新規ユーティリティ

  // ReactFlowノード/エッジに maimlUuid をセット
  const initialNodes = rawNodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      maimlUuid: uuids.places.get(node.id) ?? uuids.transitions.get(node.id) ?? generateUUID()
    }
  }));
  const initialEdges = rawEdges.map(edge => ({
    ...edge,
    data: { ...edge.data, maimlUuid: uuids.arcs.get(edge.id) ?? generateUUID() }
  }));

  // template の maimlUuid をセット（protocol/method/programの各レベル）
  // instruction の maimlUuid をセット
  // ※ 既存のtemplate/instruction 状態への反映は既存のセット処理に組み込む

  // 上位UUIDをセット
  setUpperUuids({
    protocol: uuids.protocol ?? generateUUID(),
    methods: uuids.methods,
    pnmls: uuids.pnmls,
    programs: uuids.programs,
  });

  // dirtyFlagsをリセット
  setDirtyFlags({ protocol: false, methods: new Set(), pnmls: new Set(), programs: new Set() });
}
```

---

### Step 3: 編集操作時のUUID再生成 + dirtyFlag設定

**修正ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`

#### ノード/エッジ変更時

```typescript
// ノード変更時（追加・削除）
const handleNodesChange = useCallback((changes: NodeChange[]) => {
  onNodesChange(changes);

  const hasStructureChange = changes.some(c => c.type === 'add' || c.type === 'remove');
  if (hasStructureChange) {
    setNodes(nds => nds.map(n => {
      const added = changes.find(c => c.type === 'add' && c.item.id === n.id);
      return added ? { ...n, data: { ...n.data, maimlUuid: generateUUID() } } : n;
    }));
    setDirtyFlags(prev => ({
      ...prev,
      protocol: true,
      methods: new Set([...prev.methods, currentMethodId]),
      pnmls: new Set([...prev.pnmls, currentMethodId]),
    }));
  }
}, [onNodesChange, currentMethodId]);

// ノードデータ変更時（ラベル変更等）
const handleNodeDataChange = useCallback((nodeId: string, newData: Partial<NodeData>) => {
  setNodes(nds => nds.map(n =>
    n.id === nodeId
      ? { ...n, data: { ...n.data, ...newData, maimlUuid: generateUUID() } }
      : n
  ));
  setDirtyFlags(prev => ({
    ...prev,
    protocol: true,
    methods: new Set([...prev.methods, currentMethodId]),
    pnmls: new Set([...prev.pnmls, currentMethodId]),
  }));
}, [currentMethodId]);
```

#### Template/Property変更時

```typescript
// Template追加/削除時（レベルに応じたdirtyFlagsセット）
const handleTemplateChange = useCallback((
  templateId: string,
  templateLevel: 'protocol' | 'method' | 'program',
  methodId?: string
) => {
  // 変更されたtemplateのmaimlUuidを再生成
  updateTemplateMaimlUuid(templateId);

  // レベルに応じたdirtyFlagsセット
  setDirtyFlags(prev => {
    const next = { ...prev, protocol: true };
    if (templateLevel === 'method' || templateLevel === 'program') {
      next.methods = new Set([...prev.methods, methodId!]);
    }
    if (templateLevel === 'program') {
      next.programs = new Set([...prev.programs, methodId!]);
    }
    return next;
  });
}, []);

// Template内のProperty変更時（PropertyにはuuidがないのでTemplate UUIDを再生成）
const handlePropertyChange = useCallback((
  templateId: string,
  templateLevel: 'protocol' | 'method' | 'program',
  methodId?: string
) => {
  // プロパティを含むtemplateのmaimlUuidを再生成
  updateTemplateMaimlUuid(templateId);

  // レベルに応じたdirtyFlagsセット（handleTemplateChangeと同じ連鎖）
  setDirtyFlags(prev => { /* ... 同上 */ return prev; });
}, []);
```

#### Instruction変更時

```typescript
// Instruction追加/削除/変更時
const handleInstructionChange = useCallback((instructionId: string, methodId: string) => {
  updateInstructionMaimlUuid(instructionId);
  setDirtyFlags(prev => ({
    ...prev,
    protocol: true,
    methods: new Set([...prev.methods, methodId]),
    programs: new Set([...prev.programs, methodId]),
  }));
}, []);
```

---

### Step 4: 保存時のUUID出力

**修正ファイル**: `frontend/src/utils/reactFlowToMaiml.ts`, `frontend/src/utils/multiMethodConverter.ts`

保存時は各要素が持つ `maimlUuid` をそのまま使用し、上位タグはdirtyFlagsで判定する。

```typescript
// 追加引数
function convertReactFlowToMaiML(
  nodes, edges, metadata, documentData, originalStructure, allTemplates,
  upperUuids: UpperUuids,      // 追加
  dirtyFlags: DirtyFlags,      // 追加
)

// UUID出力（各要素）
const placeUuid = node.data.maimlUuid;         // 現在のUUIDをそのまま使用
const transitionUuid = node.data.maimlUuid;    // 同上
const arcUuid = edge.data.maimlUuid;           // 同上
const templateUuid = template.maimlUuid;       // 同上
const instructionUuid = instruction.maimlUuid; // 同上

// UUID出力（上位タグ）: dirtyFlagsで判定
const pnmlUuid = dirtyFlags.pnmls.has(methodId)
  ? generateUUID()
  : (upperUuids.pnmls.get(methodId) ?? generateUUID());

const programUuid = dirtyFlags.programs.has(methodId)
  ? generateUUID()
  : (upperUuids.programs.get(methodId) ?? generateUUID());

const methodUuid = dirtyFlags.methods.has(methodId)
  ? generateUUID()
  : (upperUuids.methods.get(methodId) ?? generateUUID());

const protocolUuid = dirtyFlags.protocol
  ? generateUUID()
  : (upperUuids.protocol ?? generateUUID());

// document.uuidはタスクAが採番済み → そのまま使用
const documentUuid = documentData.uuid;
```

---

### Step 5: 保存完了後のリセット

保存完了後に `upperUuids` を新しいUUIDで更新し、`dirtyFlags` をリセットする。

```typescript
const handleSaveComplete = (savedMaimlContent: string) => {
  // 保存後のMAIMLから上位タグのUUIDを抽出して更新
  const newUuids = extractUuidsFromMaiml(savedMaimlContent);
  setUpperUuids({
    protocol: newUuids.protocol ?? upperUuids.protocol,
    methods: newUuids.methods,
    pnmls: newUuids.pnmls,
    programs: newUuids.programs,
  });
  // dirtyFlagsをリセット
  setDirtyFlags({ protocol: false, methods: new Set(), pnmls: new Set(), programs: new Set() });
  // ※ node/edge/template/instruction の maimlUuid は保存後もそのまま維持
};
```

---

## 5. 実装ステップ（チェックリスト）

### Step 1: 型定義追加
- [ ] ノードデータ型（PlaceNodeData, TransitionNodeData）に `maimlUuid: string` を追加 ※NodeData型に統合済みのため不要と判断
- [ ] エッジデータ型に `maimlUuid: string` を追加 ※同上
- [ ] フロントエンド用 TemplateData に `maimlUuid: string` を追加（PropertyDataへの追加は不要） ※Template型（maiml-unified.ts）に既存のuuidフィールドを流用
- [ ] フロントエンド用 InstructionData に `maimlUuid: string` を追加 ※同上
- [x] `UpperUuids`（protocol/methods/pnmls/programs）インターフェースを定義 → `frontend/src/types/editor.ts`
- [x] `DirtyFlags`（protocol/methods/pnmls/programs）インターフェースを定義 → `frontend/src/types/editor.ts`
- [x] `ExtractedUuids` インターフェースを定義 → `frontend/src/types/editor.ts`

### Step 2: UUIDロードユーティリティ
- [x] `frontend/src/utils/maimlUuidExtractor.ts` 新規作成（`extractUuidsFromMaiml()`）
- [x] place/transition/arc のUUID抽出を実装（UUIDがない場合はMapに登録しない）
- [x] template（protocol/method/programの各レベル）のUUID抽出を実装
- [x] instruction のUUID抽出を実装
- [x] pnml/program/method/protocol のUUID抽出を実装

### Step 3: エディタでの状態管理
- [x] `PetriNetEditorInner.tsx` に `upperUuids` / `dirtyFlags` / `savedUuids` stateを追加
- [x] MAIML読み込み完了後にUUIDロード処理を追加（upperUuids/dirtyFlagsの初期化 + savedUuids設定）
- [x] `markPnmlDirtyForCurrentMethod` / `markProgramDirtyForCurrentMethod` / `markTemplateDirty` ヘルパーを定義
- [x] `handleAddNode` で `markPnmlDirtyForCurrentMethod()` を呼び出し（pnml/method/protocolをdirty）
- [x] `handleNodesDelete` で `markPnmlDirtyForCurrentMethod()` を呼び出し（pnml/method/protocolをdirty）
- [x] `handleConnect` でpnml/method/protocolをdirty
- [x] `handleEdgesDelete` でpnml/method/protocolをdirty
- [x] `handleDeleteEdge` でpnml/method/protocolをdirty
- [x] `handleUpdateNodeProperty` でpnml/method/protocolをdirty
- [x] `handleUpdateNodeId` でpnml/method/protocolをdirty ← **2026-05-21追加実装**
- [x] `handleUpdateEdgeProperty` でpnml/method/protocolをdirty ← **2026-05-21追加実装**
- [x] `handleSaveTemplate`（新規/既存template保存）で `markTemplateDirty()` を呼び出し
- [x] `handleTemplateDelete`（template削除）で `markTemplateDirty()` を呼び出し
- [x] `handleTemplateAdd` は `handleSaveTemplate` 経由で dirty になるため追加対応不要（確認済み）
- [ ] instruction追加/削除/変更ハンドラで `markProgramDirtyForCurrentMethod()` を呼び出し ← **instructionハンドラはPetriNetEditorInner.tsxに存在しないため対象外**（instructionはProgram配下にあるがUI上の編集機能が未実装のため）

### Step 4: 保存時UUID出力
- [x] `reactFlowToMaiml.ts` の関数シグネチャに `savedUuids?` を追加（第8引数）
- [x] `handleSaveConfirmAction` で `filteredUuids` を生成し converter に渡す（dirtyFlagsに基づき除外）
- [x] place/transition/arc のUUID出力を `node.data.maimlUuid ?? savedUuids?.places/transitions/arcs.get(id)` に変更 ← **2026-05-21追加実装**
- [x] template のUUID出力を `savedUuids?.templates.get(templateId) ?? template.uuid ?? generateUUID()` に変更 ← **2026-05-21追加実装**
- [x] instruction のUUID出力を `savedUuids?.instructions.get(instructionId)` 経由に変更（新規作成instructionでのみ適用、originalInstruction存在時は元UUIDを使用）
- [x] pnml/program/method/protocol のUUID決定ロジックに savedUuids フォールバックを追加
- [x] `multiMethodConverter.ts` で同様の修正（savedUuids パラメータ追加・filteredUuids渡し対応）

### Step 5: 保存完了後リセット
- [x] S3保存成功後に `extractUuidsFromMaiml(maimlXml)` で保存後UUIDを抽出し `setSavedUuids` / `setUpperUuids` を更新
- [x] S3保存成功後に `setDirtyFlags` を全false/空Setにリセット

### 統合確認
- [ ] 新規作成→保存: 全UUIDが新規生成されること
- [ ] 編集開始→変更なし保存: place/transition/arc/template/instructionのUUIDが再利用されること
- [ ] 編集開始→保存→何も変更せずに再保存: UUIDが変わらないこと（パターンBの核心）
- [ ] 編集開始→place追加→保存: 追加placeに新UUID、pnml/method/protocolが連鎖更新されること
- [ ] 編集開始→Propertyの値変更→保存: 親template UUID再生成→method/protocolへ連鎖更新されること
- [ ] 編集開始→instruction追加→保存: instruction UUID再生成→program/method/protocolへ連鎖更新
- [ ] protocolレベルのtemplate変更時: protocol UUID のみ更新されること（method/pnmlは変わらない）
- [ ] document.uuidが連鎖で書き換わらないこと（タスクAの採番が維持されること）
- [ ] 複数method構成での動作確認（変更のあったmethod配下のみ連鎖）

---

## 6. 影響範囲

### 変更するファイル
1. `frontend/src/types/` - ノード/エッジ/template/instruction の型に `maimlUuid` を追加
2. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - upperUuids/dirtyFlags状態管理追加 + 各ハンドラ修正
3. `frontend/src/utils/reactFlowToMaiml.ts` - UUID出力ロジック修正（関数シグネチャ変更あり）
4. `frontend/src/utils/multiMethodConverter.ts` - 同上

### 新規作成するファイル
1. `frontend/src/utils/maimlUuidExtractor.ts` - UUID抽出ユーティリティ

### 影響を受けない機能
- MAIMLダウンロード（バックエンド処理）
- data/eventLog層の書き込み（`maimlWriterService.ts`）
- Draft保存/復元

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 型変更による呼び出し側の修正漏れ | 高 | 中 | TypeScriptのコンパイルエラーで検出 |
| dirtyFlagsのリセット漏れによる次回保存時の誤UUID生成 | 中 | 中 | 保存完了コールバックでの明示的リセットを実装 |
| Property変更ハンドラから親templateのIDを取得できないケース | 中 | 中 | templateの管理構造を確認し、parent参照を確保 |
| Place/Transition/ArcのUUIDがオプションのため未設定で保存されるケース | 低 | 低 | 初期化時に未設定の場合は generateUUID() でフォールバック |
| タスクAのdocument.uuidをタスクBが上書き | 高 | 低 | `documentData.uuid` をそのまま使用する実装で防止 |

---

## 8. 承認記録

- **計画書提示日時**: 2026-05-20 10:10
- **承認日時**: 
- **承認者コメント**: 

---

## 9. 実施記録

### 実施日時
開始: 2026-05-20 08:38  
完了: 2026-05-21 08:31

### 計画からの変更点

- 実装スコープを「savedUuids を保存・バリデーション呼び出しに渡すまで」に限定して完了
- 編集操作時のリアルタイムdirtyFlag更新（place/transition/arc変更時のハンドラ改修）は今回スコープ外とし、別タスクに分離

### 最終的な成果物（前回 2026-05-21 08:31 完了分）
- [x] 型定義に `UpperUuids` / `DirtyFlags` / `ExtractedUuids` 追加完了（`frontend/src/types/editor.ts`）
- [x] `maimlUuidExtractor.ts` 新規作成完了（`frontend/src/utils/maimlUuidExtractor.ts`）
- [x] `PetriNetEditorInner.tsx` に `upperUuids` / `dirtyFlags` / `savedUuids` 状態管理追加、MAIMLロード時のUUID初期化処理追加完了
- [x] `reactFlowToMaiml.ts` に `savedUuids: ExtractedUuids | null` パラメータ追加完了（第8引数）
- [x] `multiMethodConverter.ts` に `savedUuids: ExtractedUuids | null` パラメータ追加完了（第5引数）
- [x] `PetriNetEditorInner.tsx` の保存・バリデーション呼び出し6箇所に `savedUuids` を渡す修正完了
- [x] TypeScriptビルド エラー0件確認済み

### 追加実装（2026-05-21 09:05〜09:17）

**Step 3: dirtyFlagsヘルパーと各ハンドラへの組み込み**

`PetriNetEditorInner.tsx` に以下の3つのヘルパー `useCallback` を追加（`handleAddNode` 定義の直前に配置）：
- `markPnmlDirtyForCurrentMethod()` — place/transition/arc変更時にpnml/method/protocolをdirty
- `markProgramDirtyForCurrentMethod()` — instruction変更時にprogram/method/protocolをdirty
- `markTemplateDirty(templateLevel, methodId?)` — テンプレート変更時に該当レベルをdirty

各ハンドラへの組み込み：
- `handleAddNode` → ノード追加後に `markPnmlDirtyForCurrentMethod()` を呼び出し
- `handleNodesDelete` → ノード削除後に `markPnmlDirtyForCurrentMethod()` を呼び出し

**Step 4: 保存時UUID判定をdirtyFlags判定に切り替え**

`handleSaveConfirmAction` 内で `filteredUuids` を生成：
- `dirtyFlags.protocol === true` → `protocol` を `''` に（新UUID生成を促す）
- `dirtyFlags.methods` に含まれる methodId → `methods` Mapから除外
- `dirtyFlags.pnmls` に含まれる methodId → `pnmls` Mapから除外
- `dirtyFlags.programs` に含まれる methodId → `programs` Mapから除外
- 生成した `filteredUuids` を `convertMultipleMethodsToMaiML` / `convertReactFlowToMaiML` に渡す

**Step 5: 保存完了後のupperUuids更新・dirtyFlagsリセット**

S3保存成功後に以下を実行：
1. `extractUuidsFromMaiml(maimlXml)` で保存済みMAIMLから新UUIDを抽出
2. `setSavedUuids(newExtracted)` で保存済みUUID全体を更新
3. `setUpperUuids(...)` で上位タグのUUIDマップを更新
4. `setDirtyFlags({ protocol: false, methods: new Set(), pnmls: new Set(), programs: new Set() })` でリセット

### 最終成果物（2026-05-21 09:17 追加完了分）
- [x] `markPnmlDirtyForCurrentMethod` / `markProgramDirtyForCurrentMethod` / `markTemplateDirty` ヘルパー実装
- [x] `handleAddNode` / `handleNodesDelete` での `markPnmlDirtyForCurrentMethod()` 呼び出し追加
- [x] `handleSaveConfirmAction` での `filteredUuids` 生成と converter への渡し
- [x] S3保存成功後の `extractUuidsFromMaiml` → `setSavedUuids` / `setUpperUuids` / `setDirtyFlags` リセット処理
- [x] TypeScriptビルド エラー0件確認済み
- [ ] 動作確認完了（変更なし再保存でUUID不変、変更時に連鎖更新）※手動動作確認は別途実施

### 追加実装（2026-05-21 09:44〜09:50）

**Step 4: place/transition/arc/template のUUID出力をstate経由に変更**

`reactFlowToMaiml.ts` の保存時UUID出力ロジックを修正：

- **place UUID**: `node.data.maimlUuid ?? savedUuids?.places.get(place.id)` — uuidがある場合のみ `<uuid>` タグを出力（オプション扱い維持）
- **transition UUID**: `transition.data.maimlUuid ?? savedUuids?.transitions.get(transition.id)` — uuidがある場合は開閉タグで出力（uuidがある場合は`<transition id="...">` 形式に変更、なければ自己閉じ維持）
- **arc UUID**: `arc.data?.maimlUuid ?? savedUuids?.arcs.get(arc.id)` — uuidがある場合のみ `<uuid>` タグを出力
- **materialTemplate UUID**: `savedUuids?.templates.get(templateId) ?? template.uuid ?? generateUUID()` — savedUuids優先、フォールバックで既存uuid、最後に新規生成
- **conditionTemplate UUID**: 同上
- **resultTemplate UUID**: 同上

### 最終成果物（2026-05-21 09:50 追加完了分）
- [x] `reactFlowToMaiml.ts` の place UUID出力を `node.data.maimlUuid ?? savedUuids?.places.get(id)` に変更
- [x] `reactFlowToMaiml.ts` の transition UUID出力を `node.data.maimlUuid ?? savedUuids?.transitions.get(id)` に変更（uuid有無でタグ形式を切り替え）
- [x] `reactFlowToMaiml.ts` の arc UUID出力を `arc.data?.maimlUuid ?? savedUuids?.arcs.get(id)` に変更
- [x] `reactFlowToMaiml.ts` の materialTemplate/conditionTemplate/resultTemplate UUID出力を `savedUuids?.templates.get(templateId) ?? template.uuid ?? generateUUID()` に変更
- [x] TypeScriptビルド エラー0件確認済み（EXIT:0）

### 追加実装（2026-05-21 11:32）

**TypeScriptビルド再確認**

前回までの全実装完了後、TypeScriptビルドを再確認（`npx tsc --noEmit`）。

- EXIT:0（エラー0件）確認済み
