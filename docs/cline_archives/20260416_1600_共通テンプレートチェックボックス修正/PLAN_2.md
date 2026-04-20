# タスク計画書: 共通テンプレート参照の設計修正

## メタデータ
- **作成日時**: 2026-04-16 15:23
- **タスクID**: common-template-reference-design-fix
- **優先度**: 高
- **推定工数**: 1.5時間

## 1. タスク概要

`PropertyPanel.tsx` の「共通テンプレート参照」ドロップダウンが、共通テンプレートをMethod依存で収集・表示している設計上の問題を修正する。

**現状の問題：**
- 共通テンプレートは全Method共通であるべきなのに、「材料A (from Method1)」「材料B (from Method2)」とMethod名付きで表示されている
- `TemplateContext` の `commonTemplates` を使わず、各Methodのノードから収集している
- Method情報を付与しており、設計思想と矛盾している

**修正後のあるべき姿：**
- 共通テンプレートはMethod非依存で表示される（「材料A」「材料B」）
- `TemplateContext.commonTemplates` から取得する（`methodId: null` のテンプレート）
- Protocol要素に保存される共通テンプレートの概念と整合性が取れる

## 2. 目的と期待される成果

### 目的
共通テンプレートの設計思想を正しく実装し、Method非依存の共有テンプレートとして機能させる。

### 期待される成果
- [ ] `TemplateContext.commonTemplates` から共通テンプレート一覧を取得する
- [ ] 共通テンプレート参照ドロップダウンにMethod情報を表示しない
- [ ] 設計思想と実装の整合性が取れる

## 3. 現状の実装と問題点

### 問題箇所1: PropertyPanel.tsx L112-144

```typescript
// ❌ 現状: methodsから収集している
const availableCommonTemplates = useMemo(() => {
  if (!selectedNode || !isPlace || !methods || methods.length <= 1) return [];
  
  const commonTemplates: Array<{
    id: string;
    name: string;
    methodIndex: number;
    methodName: string;  // ← Method依存の情報
  }> = [];
  
  methods.forEach((method, index) => {
    if (!method.nodes) return;
    
    const templates = method.nodes
      .filter(node => 
        node.data.nodeType === 'place' &&
        node.data.placeType === placeType &&
        node.data.isCommonTemplate === true &&
        node.id !== selectedNode.id
      )
      .map(node => ({
        id: node.id,
        name: node.data.name || node.id,
        methodIndex: index,
        methodName: method.name || `Method ${index + 1}`,  // ← Method名を付与
      }));
    
    commonTemplates.push(...templates);
  });
  
  return commonTemplates;
}, [methods, isPlace, placeType, selectedNode]);
```

**問題点：**
- Methodに属するノードから共通テンプレートを探している
- Method名を付与している
- `TemplateContext.commonTemplates` を使っていない

### 問題箇所2: PropertyPanel.tsx L509-516

```typescript
// ❌ 現状: Method名付きで表示
options={[
  { value: '', label: 'なし' },
  ...availableCommonTemplates.map(tmpl => ({
    value: tmpl.id,
    label: `${tmpl.name} (from ${tmpl.methodName})`,  // ← Method名表示
  })),
]}
```

**問題点：**
- 「材料A (from Method1)」とMethod依存の表示
- 共通テンプレートなのにMethod情報が表示されている

### TemplateContext の実装（正しい実装）

```typescript
// ✅ TemplateContext.tsx L217-232
// 共通テンプレート（methodIdがnull）
const commonTemplates = useMemo(() => {
  const common: TemplatesByCategory = {
    material: templates.material.filter((t : Template) => !t.methodId),
    condition: templates.condition.filter((t : Template) => !t.methodId),
    result: templates.result.filter((t : Template) => !t.methodId),
  };
  return common;
}, [templates]);
```

**ポイント：**
- 共通テンプレートは `methodId: null` で識別される
- Protocol要素に保存される
- TemplateContextで既に実装されている

## 4. 実装ステップ

### Phase 1: TemplateContext から commonTemplates を取得

**修正箇所**: PropertyPanel.tsx L84-85

**修正前:**
```typescript
const { allTemplates } = useTemplates();
```

**修正後:**
```typescript
const { allTemplates, commonTemplates } = useTemplates();
```

---

### Phase 2: availableCommonTemplates の実装を変更

**修正箇所**: PropertyPanel.tsx L112-144

**修正前:**
```typescript
const availableCommonTemplates = useMemo(() => {
  if (!selectedNode || !isPlace || !methods || methods.length <= 1) return [];
  
  const commonTemplates: Array<{
    id: string;
    name: string;
    methodIndex: number;
    methodName: string;
  }> = [];
  
  methods.forEach((method, index) => {
    // ... methodsから収集
  });
  
  return commonTemplates;
}, [methods, isPlace, placeType, selectedNode]);
```

**修正後:**
```typescript
const availableCommonTemplates = useMemo(() => {
  if (!selectedNode || !isPlace || !commonTemplates) return [];
  
  // placeTypeに合致する共通テンプレートのみを抽出
  const categoryTemplates = commonTemplates[placeType] || [];
  
  return categoryTemplates
    .filter(template => template.id !== selectedNode.id)
    .map(template => ({
      id: template.id,
      name: template.name || template.id,
      // methodName は不要（Method非依存）
    }));
}, [commonTemplates, isPlace, placeType, selectedNode]);
```

**変更点:**
- `methods` ではなく `commonTemplates` から取得
- `methodIndex` と `methodName` を削除
- `placeType` でフィルタリング（material/condition/result）
- 依存配列も `methods` → `commonTemplates` に変更

---

### Phase 3: Select の options 表示を変更

**修正箇所**: PropertyPanel.tsx L509-516

**修正前:**
```typescript
options={[
  { value: '', label: 'なし' },
  ...availableCommonTemplates.map(tmpl => ({
    value: tmpl.id,
    label: `${tmpl.name} (from ${tmpl.methodName})`,
  })),
]}
```

**修正後:**
```typescript
options={[
  { value: '', label: 'なし' },
  ...availableCommonTemplates.map(tmpl => ({
    value: tmpl.id,
    label: tmpl.name,  // Method名を削除
  })),
]}
```

**変更点:**
- Method名を削除
- シンプルにテンプレート名のみ表示

---

### 実装チェックリスト
- [x] Phase 1: `useTemplates` から `commonTemplates` を取得
- [x] Phase 2: `availableCommonTemplates` の実装を変更
- [x] Phase 3: Select の表示を変更（Method名削除・TypeScriptエラー解消）
- [ ] 動作確認

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/components/PropertyPanel.tsx` - 共通テンプレート参照ドロップダウンの実装を修正（3箇所）

### 影響を受ける機能
- PropertyPanel の「共通テンプレート参照」ドロップダウン表示
- 共通テンプレートの選択肢一覧

### 影響しない機能
- 共通テンプレートチェックボックスの動作（既に修正済み）
- テンプレート管理ビューの機能
- MAIMLファイルの読み込み・保存
- その他のノード・エッジ操作

## 6. 設計整合性の確認

### 共通テンプレートの定義
- **保存場所**: Protocol要素（Method外）
- **識別方法**: `methodId: null`
- **スコープ**: プロジェクト全体で共有

### データフロー
```
MAIMLファイル（Protocol要素）
  ↓ パース
TemplateContext.templates（全テンプレート）
  ↓ フィルタリング（methodId === null）
TemplateContext.commonTemplates（共通テンプレートのみ）
  ↓ 使用
PropertyPanel.availableCommonTemplates（表示用）
```

### 修正後の動作フロー
1. ユーザーが共通テンプレートドロップダウンを開く
2. `TemplateContext.commonTemplates[placeType]` から選択肢を取得
3. 「材料A」「材料B」とMethod非依存で表示される
4. ユーザーがテンプレートを選択
5. `commonTemplateRef: template_id` が設定される
6. `isCommonTemplate: true` が自動設定される（既存実装）
7. チェックボックスがONになる

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `commonTemplates` が空配列で選択肢が表示されない | 中 | 低 | Protocol要素にテンプレートが正しく保存されていることを確認する |
| 既存のMAIMLファイルで互換性問題が発生 | 中 | 低 | テスト時に既存ファイルでの動作を確認する |
| placeType のフィルタリングが正しく動作しない | 低 | 低 | material/condition/result の3種類すべてでテストする |

## 8. テスト計画

### 手動テスト手順

**シナリオ1: 共通テンプレートがMethod非依存で表示される**
1. 複数methodが存在するMAIMLファイルを開く
2. テンプレート管理ビューで「共通テンプレート」チェックをONにして共通テンプレートを作成
3. ペトリネットビューのMethod2のノードを選択
4. PropertyPanel の「共通テンプレート参照」ドロップダウンを開く
5. **「材料A」とMethod名なしで表示されることを確認** ← 今回の修正検証
6. **「(from Method1)」が表示されないことを確認**

**シナリオ2: 共通テンプレートを選択するとチェックボックスがONになる**
1. シナリオ1の続きで、ドロップダウンで共通テンプレートを選択
2. 「共通テンプレート（全methodで共有）」チェックボックスがONになることを確認（既存実装の確認）

**シナリオ3: 3種類のplaceTypeすべてで動作する**
1. material、condition、result のそれぞれで共通テンプレートを作成
2. 各placeTypeのノードで共通テンプレート参照ドロップダウンを確認
3. 対応するplaceTypeの共通テンプレートのみが表示されることを確認

## 9. 関連ドキュメント

- `frontend/src/contexts/TemplateContext.tsx` - commonTemplates の実装
- `docs/20260416_1307_共通テンプレートチェックボックス不具合修正/PLAN.md` - 前回の修正（チェックボックス連動）

## 10. 承認記録

- **計画書提示日時**: 2026-04-16 15:23
- **承認日時**: （承認後記入）
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）  
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 最終的な成果物
- [ ] `frontend/src/components/editorv2/components/PropertyPanel.tsx` 修正完了
- [ ] 動作確認完了（3シナリオ）
- [ ] 設計整合性確認完了
