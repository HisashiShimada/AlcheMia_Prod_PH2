# PetriNetEditor 独自機能分析（第4報）

## メタデータ
- **作成日時**: 2026-01-28 15:05
- **目的**: Reference版にない現行版の独自機能を整理し、不要機能を選別
- **進捗**: Phase 4 - 独自機能の分析と選別

---

## 1. 独自機能の全体マップ

### カテゴリ別分類

| カテゴリ | 機能数 | 優先度 |
|---------|-------|--------|
| UI/UX強化 | 3機能 | 高 |
| パフォーマンス最適化 | 2機能 | 中 |
| データ補完 | 1機能 | 高 |
| Phase 6拡張 | 4機能 | 中 |
| TypeScript型安全性 | 全体 | 高 |

### 互換性による分類

#### 🔄 既存機能の互換/強化版（6機能）
Reference版に類似機能があり、現行版で実装方法を変更・強化したもの

1. アーク属性表示トグル（Reference版では常時表示）
2. useMemoテンプレート抽出（Reference版では直接state更新）
3. useCallbackメモ化（Reference版では通常の関数定義）
4. Document自動補完（Reference版でも実装あり、強化版）
5. 新API使用（Reference版とエンドポイントが異なる）
6. TypeScript型定義（Reference版はJavaScript）

#### ⭐ 完全な新規機能（5機能）
Reference版に全く存在しない機能

1. **エディタモード切替**（ペトリネット/テンプレート）
2. **ビューポート保存/復元**
3. **Phase 6 props拡張**（initialContent, projectId, projectName等）
4. **sourceContext**（プロジェクト/フォーマット判定）
5. **右サイドパネル版TemplateList**（削除推奨）

---

## 2. 詳細機能リスト

### A. UI/UX強化機能（3機能）

#### A-1. アーク属性表示トグル
**コード箇所**: PetriNetEditor.tsx L95-96, L363-373

```typescript
const [showArcLabels, setShowArcLabels] = useState(false);

useEffect(() => {
  setEdges((eds) => 
    eds.map((edge) => ({
      ...edge,
      label: showArcLabels ? (edge.data?.id || edge.id) : undefined,
      labelStyle: showArcLabels ? { ... } : undefined,
      labelBgStyle: showArcLabels ? { ... } : undefined,
    }))
  );
}, [showArcLabels, setEdges]);
```

**機能説明:**
- エッジ（Arc）のラベル表示/非表示を切り替える
- EditorToolbarに専用トグルボタンを配置

**判定:**
- ✅ **必要** - ペトリネットの視認性向上に有効
- Reference版でも実装すべき機能
- ユーザーが細かい属性を確認する際に便利

---

#### A-2. テンプレート一覧パネル
**コード箇所**: PetriNetEditor.tsx L98-104, L1957-1972

```typescript
const [showTemplateList, setShowTemplateList] = useState(false);
const [categorizedTemplates, setCategorizedTemplates] = useState<CategorizedTemplates>({
  material: [],
  condition: [],
  result: []
});
```

**機能説明:**
- 右サイドパネルにテンプレート一覧を表示
- Material/Condition/Resultテンプレートをカテゴリ分け
- テンプレート選択でノードにフォーカス

**判定:**
- 🟡 **検討** - Phase 1（エディタモード切替）と機能が重複
- editorMode='template'で既にTemplateListを表示している
- 右サイドパネル版（showTemplateList）は冗長な可能性

**提案:**
- Phase 1のeditorMode切替に統一
- showTemplateListとsavedPetriNetViewport機能は保持し、右サイドパネル版は削除

---

#### A-3. エディタモード切替（ペトリネット/テンプレート）
**コード箇所**: PetriNetEditor.tsx L86-88, L1739-1753

```typescript
const [editorMode, setEditorMode] = useState<'petri-net' | 'template'>('petri-net');
const [savedPetriNetViewport, setSavedPetriNetViewport] = useState<{
  x: number;
  y: number;
  zoom: number;
} | null>(null);

const handleEditorModeChange = useCallback((newMode: 'petri-net' | 'template') => {
  if (newMode === 'template' && editorMode === 'petri-net') {
    const currentViewport = getViewport();
    setSavedPetriNetViewport(currentViewport);
  }
  setEditorMode(newMode);
}, [editorMode, getViewport]);
```

**機能説明:**
- ペトリネットビューとテンプレート一覧ビューを切替
- ビューポート（表示位置・ズーム）を保存/復元

**判定:**
- ✅ **必要** - UX向上に大きく貢献
- Reference版にはない優れた機能
- テンプレート管理とペトリネット編集の分離

---

### B. パフォーマンス最適化機能（2機能）

#### B-1. useMemoによるテンプレート抽出
**コード箇所**: PetriNetEditor.tsx L139-185

```typescript
const categorizedTemplatesMemo = useMemo(() => {
  const materialTemplates = nodes
    .filter(n => n.type === 'materialTemplate')
    .map(convertNodeToTemplateData);
  
  // ... 他のテンプレート抽出
  
  return {
    material: materialTemplates,
    condition: conditionTemplates,
    result: resultTemplates,
  };
}, [nodes, convertNodeToTemplateData]);
```

**機能説明:**
- nodes配列が変更された時のみテンプレート一覧を再計算
- 不要な再レンダリングを防ぐ

**判定:**
- ✅ **必要** - パフォーマンス改善に有効
- 大規模ペトリネットでの動作を軽量化
- React推奨のベストプラクティス

---

#### B-2. useCallbackによる関数メモ化
**コード箇所**: 全体的に使用

```typescript
const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
  // ...
}, []);
```

**機能説明:**
- イベントハンドラー関数を再作成しない
- 子コンポーネントへのprops変更を最小化

**判定:**
- ✅ **必要** - React推奨のベストプラクティス
- Reference版でも実装すべき
- TypeScriptとの相性も良い

---

### C. データ補完機能（1機能）

#### C-1. Document自動補完（fillMissingDocumentFields）
**コード箇所**: PetriNetEditor.tsx L551-579, L617-646

```typescript
// sourceContext === 'project' の場合のみfillMissingDocumentFieldsで補完
const initialDocumentData = sourceContext === 'project'
  ? fillMissingDocumentFields(emptyDocumentData, baseName)
  : emptyDocumentData;
```

**機能説明:**
- Document要素の不足フィールドを自動補完
- creators/vendors/owners/instrumentsを空配列から自動生成
- sourceContext='project'の場合のみ実行

**判定:**
- ✅ **必要** - データ整合性の確保に必須
- Reference版でも実装すべき重要機能
- MAIML仕様に準拠したデフォルト値生成

---

### D. Phase 6拡張機能（4機能）

#### D-1. initialContent/projectId/projectName props
**コード箇所**: PetriNetEditor.tsx L46-51

```typescript
export interface PetriNetEditorProps {
  initialContent?: string;              // 初期MAIMLコンテンツ（maimlDataのエイリアス）
  projectId?: string;                   // プロジェクトID
  projectName?: string;                 // プロジェクト名（DocumentEditDialogのデフォルト値用）
  onSave?: (content: string) => Promise<void>;  // 保存コールバック
  onContentChange?: () => void;         // 変更通知コールバック
}
```

**機能説明:**
- PetriNetEditorScreenとの統合用props
- maimlDataの後方互換性を保ちつつ新しいインターフェースを提供

**判定:**
- ✅ **必要** - Phase 6で追加された統合機能
- 後方互換性を保ちながら新機能を提供
- 削除不可

---

#### D-2. sourceContext（プロジェクト/フォーマット判定）
**コード箇所**: PetriNetEditor.tsx L54

```typescript
sourceContext?: 'project' | 'format'; // 遷移元コンテキスト（デフォルト: 'project'）
```

**機能説明:**
- プロジェクトモードとフォーマットモードを区別
- フォーマットモードではDocument補完を抑制

**判定:**
- ✅ **必要** - フォーマット管理統合に必須
- Reference版では存在しない概念
- 削除不可（Phase 6要件）

---

#### D-3. effectiveMaimlDataの統合
**コード箇所**: PetriNetEditor.tsx L242-243

```typescript
// initialContentとmaimlDataの統合（後方互換性維持）
const effectiveMaimlData = initialContent || maimlData;
```

**機能説明:**
- 新旧propsを統合して内部処理を共通化
- 後方互換性を保証

**判定:**
- ✅ **必要** - 後方互換性の確保
- 削除するとmaimlData propsが機能しなくなる

---

#### D-4. 新API `/api/v1/maiml/parse-petri-net-structure` 使用
**コード箇所**: PetriNetEditor.tsx L580-610

```typescript
const multiMethodResponse = await fetch('/api/v1/maiml/parse-petri-net-structure', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ content: effectiveMaimlData }),
  credentials: 'include'
});
```

**機能説明:**
- Reference版の旧API `/api/worker/multiple-methods-structure-from-content` から変更
- 新しいレスポンス形式に対応

**判定:**
- ✅ **必要** - バックエンドAPIの更新に対応
- Reference版のAPIは現在存在しない可能性
- 削除不可

---

### E. TypeScript型安全性（全体）

#### E-1. Props/State/関数の型定義
**全体に適用**

```typescript
export interface PetriNetEditorProps { ... }
interface MethodData { ... }
const handleAddNode = useCallback((nodeType: string) => { ... }, [...]);
```

**機能説明:**
- すべての変数・関数に明示的な型定義
- Reference版はJavaScriptなので型定義なし

**判定:**
- ✅ **必要** - TypeScript化の利点を最大限活用
- 削除不可（プロジェクト要件）
- バグ防止とメンテナンス性向上

---

## 3. 不要機能の候補

### ❌ 削除推奨: 右サイドパネル版TemplateList

**理由:**
1. editorMode='template'で既に同じ機能を実装
2. 2つの表示方法が存在して冗長
3. ユーザーを混乱させる可能性

**影響範囲:**
- PetriNetEditor.tsx L1957-1972（表示部分）
- EditorToolbar.tsx のトグルボタン
- handleToggleTemplateList関数

**代替案:**
- editorMode切替に統一
- 必要に応じてテンプレートパネルの幅を調整可能にする

---

### 🟡 検討中: showCommonTemplates State

**コード箇所**: PetriNetEditor.tsx L99

```typescript
const [showCommonTemplates, setShowCommonTemplates] = useState(false);
```

**理由:**
- Reference版にはない機能
- 共通テンプレートの表示切替が本当に必要か不明

**提案:**
- 実際の運用で共通テンプレートが多数ある場合は必要
- 現時点では保持し、運用開始後に判断

---

## 4. 機能選別マトリクス

| 機能 | 必要性 | 優先度 | Reference版にない理由 | 判定 |
|------|-------|--------|---------------------|------|
| アーク属性表示トグル | 高 | 中 | Phase 5で追加 | ✅ 保持 |
| エディタモード切替 | 高 | 高 | UX改善 | ✅ 保持 |
| ビューポート保存/復元 | 高 | 高 | UX改善 | ✅ 保持 |
| useMemoテンプレート抽出 | 中 | 中 | パフォーマンス最適化 | ✅ 保持 |
| useCallbackメモ化 | 中 | 低 | ベストプラクティス | ✅ 保持 |
| Document自動補完 | 高 | 高 | データ整合性 | ✅ 保持 |
| Phase 6 props拡張 | 高 | 高 | 統合機能 | ✅ 保持 |
| sourceContext | 高 | 高 | フォーマット管理統合 | ✅ 保持 |
| 新API使用 | 高 | 高 | API更新対応 | ✅ 保持 |
| TypeScript型定義 | 高 | 高 | プロジェクト要件 | ✅ 保持 |
| 右サイドパネル版TemplateList | 低 | 低 | 機能重複 | ❌ **削除推奨** |
| showCommonTemplates | 中 | 低 | 運用次第 | 🟡 検討 |

---

## 5. 推奨アクション

### 即座に実施（1件）

#### アクション1: 右サイドパネル版TemplateListの削除
- **工数**: 1時間
- **影響**: 低（editorMode='template'で代替可能）

**削除対象:**
```typescript
// PetriNetEditor.tsx
- showTemplateList State（L98）
- handleToggleTemplateList（L1915-1918）
- 右サイドパネル表示部分（L1957-1972）

// EditorToolbar.tsx
- showTemplateList props
- onToggleTemplateList props
- テンプレート一覧トグルボタン
```

**保持する機能:**
- editorMode='template'によるTemplateList表示
- savedPetriNetViewportによるビューポート保存/復元

---

### 運用開始後に判断（1件）

#### 検討事項: showCommonTemplates機能
- **判断時期**: 運用開始後1ヶ月
- **判断基準**: 
  - 共通テンプレートが10個以上ある場合 → 必要
  - 共通テンプレートが5個以下の場合 → 不要

---

## 6. 互換性分類の詳細

### 🔄 既存機能の互換/強化版（6機能）

これらはReference版にも類似機能が存在し、現行版で実装方法を改善・強化したものです。
**基本的に削除対象にはなりません。**

| 機能 | Reference版の実装 | 現行版の改善点 | 判定 |
|------|-----------------|--------------|------|
| アーク属性表示トグル | 常時表示 | トグルで表示/非表示切替 | ✅ 保持 |
| useMemoテンプレート抽出 | 直接state更新 | メモ化でパフォーマンス向上 | ✅ 保持 |
| useCallbackメモ化 | 通常の関数定義 | React推奨パターン | ✅ 保持 |
| Document自動補完 | 基本的な実装あり | sourceContext対応で強化 | ✅ 保持 |
| 新API使用 | `/api/worker/*` | `/api/v1/maiml/*` に更新 | ✅ 保持 |
| TypeScript型定義 | JavaScript | TypeScriptで型安全性向上 | ✅ 保持 |

**結論**: これらはすべて技術的な改善であり、削除の必要はありません。

---

### ⭐ 完全な新規機能（5機能）- 見直し対象

Reference版に全く存在しない機能です。これらについて詳細に検討します。

#### 新規1: エディタモード切替（ペトリネット/テンプレート）

**実装内容:**
```typescript
const [editorMode, setEditorMode] = useState<'petri-net' | 'template'>('petri-net');
```

**Reference版の状況:**
- Reference版では常にペトリネット表示のみ
- テンプレート一覧は右サイドパネル（toggleTemplatePanel）で表示

**現行版での変更:**
- メイン表示エリアをペトリネット/テンプレートで切替
- EditorToolbarに切替ボタンを追加

**評価:**
- ✅ **必須機能** - UX大幅向上
- テンプレート管理の独立性向上
- 画面の使い分けが明確

**判定**: **保持必須**

---

#### 新規2: ビューポート保存/復元

**実装内容:**
```typescript
const [savedPetriNetViewport, setSavedPetriNetViewport] = useState<{
  x: number; y: number; zoom: number;
} | null>(null);
```

**Reference版の状況:**
- ビューポート保存機能なし
- モード切替時に表示位置がリセットされる

**現行版での変更:**
- テンプレートモードに切り替えた際、ペトリネットのビューポートを保存
- ペトリネットモードに戻った際、保存した位置に復元

**評価:**
- ✅ **必須機能** - エディタモード切替のUXを大幅改善
- ユーザーの作業中断を最小化
- 新規機能1（エディタモード切替）の必須セット

**判定**: **保持必須**（新規1とセット）

---

#### 新規3: Phase 6 props拡張

**実装内容:**
```typescript
export interface PetriNetEditorProps {
  initialContent?: string;
  projectId?: string;
  projectName?: string;
  onSave?: (content: string) => Promise<void>;
  onContentChange?: () => void;
}
```

**Reference版の状況:**
- `maimlData` propsのみ
- プロジェクト情報は内部で管理

**現行版での変更:**
- PetriNetEditorScreenとの統合用に新propsを追加
- 後方互換性を維持しつつ新インターフェース提供

**評価:**
- ✅ **必須機能** - Phase 6統合要件
- 後方互換性を保証
- 削除すると既存コードが動作しなくなる

**判定**: **保持必須**（削除不可）

---

#### 新規4: sourceContext（プロジェクト/フォーマット判定）

**実装内容:**
```typescript
sourceContext?: 'project' | 'format'; // デフォルト: 'project'
```

**Reference版の状況:**
- この概念自体が存在しない
- すべてプロジェクトモードとして動作

**現行版での変更:**
- プロジェクト管理とフォーマット管理で動作を切替
- フォーマットモードではDocument自動補完を抑制

**評価:**
- ✅ **必須機能** - フォーマット管理統合要件
- プロジェクトとフォーマットで異なる動作が必要
- 削除すると両者の区別がつかなくなる

**判定**: **保持必須**（削除不可）

---

#### 新規5: 右サイドパネル版TemplateList ⚠️

**実装内容:**
```typescript
const [showTemplateList, setShowTemplateList] = useState(false);

// 表示部分（L1957-1972）
{showTemplateList && (
  <div style={{ position: 'absolute', right: 0, ... }}>
    <TemplateList ... />
  </div>
)}
```

**Reference版の状況:**
- 右サイドパネルでテンプレート一覧を表示
- `toggleTemplatePanel` State

**現行版での変更:**
- 新規1（editorMode切替）と並行して右サイドパネル版も実装
- **結果的に2つの表示方法が存在**

**問題点:**
1. editorMode='template'で全画面表示可能
2. 右サイドパネル版は表示エリアが狭い
3. 2つの方法があってユーザーが混乱する可能性

**評価:**
- ❌ **冗長機能** - 削除推奨
- editorMode切替で代替可能
- Reference版の設計思想（右パネル）を現行版では改善済み

**判定**: **削除推奨**

---

## 7. 最終判定サマリー

### 🔄 既存機能の互換/強化版（6機能）
**判定: すべて保持**
- アーク属性表示トグル
- useMemoテンプレート抽出
- useCallbackメモ化
- Document自動補完
- 新API使用
- TypeScript型定義

### ⭐ 完全な新規機能（5機能）

| 機能 | 判定 | 理由 |
|------|------|------|
| エディタモード切替 | ✅ 保持必須 | UX大幅向上 |
| ビューポート保存/復元 | ✅ 保持必須 | 上記機能とセット |
| Phase 6 props拡張 | ✅ 保持必須 | 統合要件・削除不可 |
| sourceContext | ✅ 保持必須 | 統合要件・削除不可 |
| 右サイドパネル版TemplateList | ❌ **削除推奨** | 機能重複 |

### 🟡 その他検討事項
- showCommonTemplates: 運用開始後に判断

---

## 8. 結論

### 削除対象: 1機能のみ
**右サイドパネル版TemplateList**

### 理由
- editorMode='template'で同じ機能を提供
- より広い表示エリアで使いやすい
- Reference版の設計を改善した結果、不要になった

### 保持機能: 10機能
- 既存機能の互換/強化版: 6機能
- 完全な新規機能（必須）: 4機能

**最終結論**: 
現行版の独自機能は、1件（右サイドパネル版TemplateList）を除き、すべて保持すべき有用な機能です。
