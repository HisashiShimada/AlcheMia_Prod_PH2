# PetriNetEditor 差分分析レポート

## 作成日時
2025-12-23 14:11

## 比較対象
- **Reference**: `reference/frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx`
- **Current**: `frontend/src/components/viewer/PetriNetEditor/PetriNetEditor.tsx`

## 実装状況サマリー

### ✅ 実装済みの主要機能
1. **複数Method管理**
   - Method配列の状態管理
   - Methodタブ切り替え
   - Method追加・削除・ID編集

2. **基本編集機能**
   - ノード追加・削除・移動
   - エッジ追加・削除
   - Undo/Redo履歴管理
   - コピー&ペースト

3. **ダイアログ類**
   - TemplateEditorDialog
   - DocumentEditDialog
   - WorkflowSelectorDialog
   - SaveConfirmDialog
   - ValidationPanel
   - DraftManager

4. **Draft機能**
   - 自動保存
   - Draft読み込み
   - Draft管理

5. **バリデーション機能**
   - ペトリネット検証
   - エラー表示

## ❌ 不足している機能

### 1. 共通テンプレート検出機能（重要度: 高）

**Reference実装内容:**
```javascript
// 共通テンプレート検出: 複数placeRefを持つテンプレートを特定
const commonTemplateIds = new Set();
const commonTemplateRefMap = {}; // { placeId: firstPlaceId }

const allTemplates = [
  ...xmlDoc.querySelectorAll('materialTemplate'),
  ...xmlDoc.querySelectorAll('conditionTemplate'),
  ...xmlDoc.querySelectorAll('resultTemplate')
];

allTemplates.forEach(templateEl => {
  const templateId = templateEl.getAttribute('id');
  const placeRefs = Array.from(templateEl.querySelectorAll('placeRef'));
  
  if (placeRefs.length > 1) {
    commonTemplateIds.add(templateId);
    
    const firstPlaceId = getPlaceId(placeRefs[0]);
    
    for (let i = 1; i < placeRefs.length; i++) {
      const placeId = getPlaceId(placeRefs[i]);
      if (placeId) {
        commonTemplateRefMap[placeId] = firstPlaceId;
      }
    }
  }
});
```

**現在の実装:**
- この機能が完全に欠落

**影響:**
- 複数methodで同じテンプレートを共有する場合、参照関係が失われる
- ノードに`isCommonTemplate`や`commonTemplateRef`フラグが設定されない
- テンプレート編集時に、他のmethodへの影響が追跡できない

### 2. MultiObjectEditorコンポーネント（重要度: 中）

**Reference実装:**
- `reference/frontend/src/components/PetriNetEditorV2/components/MultiObjectEditor.jsx`

**現在の実装:**
- このコンポーネントが存在しない

**影響:**
- 複数オブジェクトの一括編集機能がない
- ユーザビリティの低下

### 3. useNamespaceOperations Hook（重要度: 中）

**Reference実装:**
- `reference/frontend/src/components/PetriNetEditorV2/hooks/useNamespaceOperations.js`

**現在の実装:**
- このHookが存在しない

**影響:**
- 名前空間操作の統一的な管理ができない
- Method間でのID重複チェックなどが不完全

### 4. 高度なMethod管理（重要度: 中）

**Reference実装の特徴:**
```javascript
// 各methodをReact Flow形式に変換時に共通テンプレートフラグを設定
const nodesWithCommonFlag = methodNodes.map(node => {
  if (node.data.nodeType === 'place') {
    const placeId = node.id;
    const templateInfo = templateMap[placeId];
    const templateId = templateInfo?.id;
    
    // 共通テンプレート参照の場合
    if (commonTemplateRefMap[placeId]) {
      return {
        ...node,
        data: {
          ...node.data,
          commonTemplateRef: referencedPlaceId
        }
      };
    }
    
    // 共通テンプレートの定義元の場合
    if (templateId && commonTemplateIds.has(templateId)) {
      return {
        ...node,
        data: {
          ...node.data,
          isCommonTemplate: true
        }
      };
    }
  }
  return node;
});
```

**現在の実装:**
- 共通テンプレートフラグの設定が欠落

### 5. 細かい実装の違い

#### SaveDialog vs SaveConfirmDialog
- Reference: SaveDialog（旧版）とSaveConfirmDialog（新版）の両方がある
- Current: SaveConfirmDialogのみ
- 影響: ほぼなし（新版で十分）

#### バリデーションAPI呼び出し
- Reference: `/api/s3/validate-maiml-content` を使用
- Current: ローカルバリデーションのみ
- 影響: サーバー側バリデーションが欠落

#### 自動補正API
- Reference: `/api/s3/maiml-auto-correct-realtime` を使用
- Current: 未実装（プレースホルダーのみ）
- 影響: 自動補正機能が動作しない

## 優先度付け

### 🔴 優先度: 高（即座に対応すべき）

1. **共通テンプレート検出機能**
   - 複数method対応の核心機能
   - テンプレート参照関係の維持に必須
   - 実装工数: 中（200-300行）

### 🟡 優先度: 中（次のフェーズで対応）

2. **バリデーションAPI呼び出し**
   - サーバー側バリデーションの有効化
   - 実装工数: 小（50-100行）

3. **自動補正API呼び出し**
   - 自動補正機能の有効化
   - 実装工数: 小（50-100行）

4. **MultiObjectEditorコンポーネント**
   - ユーザビリティ向上
   - 実装工数: 大（500-800行）

5. **useNamespaceOperations Hook**
   - コード整理とメンテナンス性向上
   - 実装工数: 中（200-300行）

### 🟢 優先度: 低（将来的に検討）

6. **SaveDialog（旧版）の追加**
   - 後方互換性のため
   - 実装工数: 小（現在不要）

## 推奨アクション

### Phase 1: 共通テンプレート検出機能の実装（今回対応）

1. **MaiMLパース時に共通テンプレート検出**
   - `parseMaimlToPetriNet`関数を拡張
   - 複数placeRefを持つテンプレートを検出
   - `commonTemplateIds`と`commonTemplateRefMap`を構築

2. **ReactFlow変換時にフラグ設定**
   - `convertToReactFlow`関数を拡張
   - ノードデータに`isCommonTemplate`と`commonTemplateRef`を追加

3. **テンプレート編集時の参照関係維持**
   - `TemplateEditorDialog`での編集時に他methodへの影響を表示
   - 保存時に全methodのノードを更新

### Phase 2: API連携の強化（次回対応）

1. **バリデーションAPI呼び出しの実装**
2. **自動補正API呼び出しの実装**

### Phase 3: UI改善（将来対応）

1. **MultiObjectEditorコンポーネントの実装**
2. **useNamespaceOperations Hookの実装**

## 実装の影響範囲

### 修正が必要なファイル

1. `frontend/src/utils/maimlParser.ts`
   - 共通テンプレート検出ロジックの追加

2. `frontend/src/utils/reactFlowConverter.ts`
   - 共通テンプレートフラグ設定の追加

3. `frontend/src/components/viewer/PetriNetEditor/PetriNetEditor.tsx`
   - 共通テンプレート情報の状態管理
   - Method切り替え時の共通テンプレート処理

4. `frontend/src/components/viewer/PetriNetEditor/components/TemplateEditorDialog.tsx`
   - 共通テンプレート編集時の警告表示
   - 全method更新処理

### 新規作成が必要なファイル（Phase 3）

1. `frontend/src/components/viewer/PetriNetEditor/components/MultiObjectEditor.tsx`
2. `frontend/src/hooks/useNamespaceOperations.ts`

## リスク評価

### 高リスク
- 共通テンプレート検出の実装ミスにより、既存のmethodが破損する可能性
- 対策: 十分なテストケースの作成と段階的な実装

### 中リスク
- API呼び出しの追加により、エラーハンドリングが複雑化
- 対策: 適切なエラーハンドリングとフォールバック処理

### 低リスク
- UI改善による既存機能への影響
- 対策: 段階的な導入とユーザーフィードバックの収集

## テスト計画

### 単体テスト
- [ ] 共通テンプレート検出関数のテスト
- [ ] commonTemplateRefMapの構築テスト
- [ ] フラグ設定ロジックのテスト

### 統合テスト
- [ ] 複数method読み込み時の共通テンプレート検出
- [ ] Method切り替え時の共通テンプレート維持
- [ ] テンプレート編集時の全method更新

### E2Eテスト
- [ ] 共通テンプレートを含むMaiMLファイルの読み込み
- [ ] 共通テンプレートの編集と保存
- [ ] Method追加・削除時の動作確認

## まとめ

現在の実装は基本的な複数method対応は完了していますが、**共通テンプレート検出機能**が欠落しているため、複数methodで同じテンプレートを共有する高度なユースケースに対応できていません。

この機能は複数method対応の核心部分であり、優先的に実装すべきです。
