## ファイル検証票: PetriNetEditorV2.tsx (PetriNetEditorInner.jsx)

**検証日時**: 2026-01-29 17:06
**検証者**: Cline
**優先度**: 🔴 最高（メインコンポーネント）

---

### 基本情報
- **移植元**: `reference/frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx`
- **移植先**: `frontend/src/components/editorv2/PetriNetEditorV2.tsx`
- **行数**: 移植元 約2000行 → 移植先 約400行（リファクタリング済み）
- **主要な役割**: PetriNet編集のメインコンポーネント

---

### アーキテクチャの変更

#### 移植元（参考版）
- モノリシックな構造（2000行）
- 全ての状態とロジックを1ファイルに含む
- 直接的なState管理

#### 移植先（Phase 9版）
- カスタムフック分離アーキテクチャ（400行）
- ロジックをフックに分離:
  - `useWorkflow`: ワークフロー管理（中核）
  - `useHistory`: Undo/Redo
  - `useDraftManager`: Draft管理
  - `useNamespaceOperations`: 名前空間操作
- コンポーネントは表示ロジックのみ

---

### A. 構造の整合性（30点） - 15/30点

- [ ] (10点) **ファイル構造一致** - 3/10点
  - ⚠️ アーキテクチャが大幅に変更されている
  - ✅ React Flowは統合されている
  - ❌ 状態管理がカスタムフックに分離（設計変更）
  - **-7点**: 構造が大幅に異なる

- [ ] (10点) **コンポーネント構造一致** - 5/10点
  - ✅ ReactFlowProvider使用: 一致
  - ✅ ツールバー表示: 一致
  - ⚠️ 内部構造が大幅に簡略化されている
  - ❌ PetriNetEditorInnerUIのような2層構造がない
  - **-5点**: コンポーネント構造が異なる

- [x] (5点) **関数の数と名前** - 5/5点
  - ✅ 主要ハンドラは存在（handleSave、handleValidate等）
  - ✅ イベントハンドラの命名規則は一致
  - 問題なし

- [ ] (5点) **ロジックの流れ一致** - 2/5点
  - ⚠️ カスタムフック経由に変更
  - ❌ 初期化処理が大幅に簡略化されている
  - ❌ MaiMLデータ読み込みロジックがない
  - **-3点**: データフローが異なる

**小計**: 15/30点

---

### B. 処理の完全性（30点） - 12/30点

#### 移植状況マトリクス

| 機能 | 移植元 | 移植先 | 状態 | 評価 |
|------|--------|--------|------|------|
| **React Flow統合** | ✅ | ✅ | 完了 | 3点 |
| **複数メソッド管理** | ✅ | ✅ | 完了 | 3点 |
| **ノード/エッジ操作** | ✅ | ✅ | 完了 | 2点 |
| **Undo/Redo** | ✅ | ✅ | 完了 | 2点 |
| **MaiMLデータ読み込み** | ✅ | ❌ | 未実装 | 0点 |
| **テンプレート管理** | ✅ | ⚠️ | 部分実装 | 1点 |
| **バリデーション** | ✅ | ❌ | スタブのみ | 0点 |
| **保存機能** | ✅ | ⚠️ | 部分実装 | 1点 |
| **Draft管理** | ✅ | ✅ | 完了 | 0点 |
| **Document編集** | ✅ | ⚠️ | ダイアログのみ | 0点 |
| **ワークフロー追加** | ✅ | ❌ | Phase 10予定 | 0点 |
| **エラー表示** | ✅ | ❌ | 未実装 | 0点 |
| **ビューモード切替** | ✅ | ❌ | 未実装 | 0点 |

- [ ] (8点) **全関数移植** - 3/8点
  - 移植元関数数: 約50個
  - 移植先関数数: 約15個
  - **未移植**: 35個以上
  - **-5点**: 多数の関数が未移植

- [ ] (8点) **全イベントハンドラ移植** - 3/8点
  - ✅ handleSave
  - ✅ handleValidate
  - ✅ handleNodeSelect
  - ✅ handleEdgeSelect
  - ❌ handleOpenValidationPanel（スタブのみ）
  - ❌ handleAutoCorrect（未実装）
  - ❌ handleTemplateSelect（未実装）
  - ❌ handleTemplateAdd（未実装）
  - ❌ handleTemplateDelete（未実装）
  - ❌ handleWorkflowFileSelect（未実装）
  - **-5点**: 多数のハンドラが未実装

- [ ] (6点) **条件分岐正確** - 2/6点
  - ⚠️ 簡略化されている
  - ❌ エラー分類ロジックがない
  - ❌ ビューモード判定がない
  - **-4点**: 重要な条件分岐が欠落

- [ ] (4点) **ループ処理正確** - 2/4点
  - ⚠️ カスタムフック内に移動
  - **-2点**: 移植先で確認できない

- [ ] (4点) **エラーハンドリング** - 2/4点
  - ⚠️ 基本的なtry-catchは実装
  - ❌ エラー分類機能がない
  - ❌ ValidationPanelが機能していない
  - **-2点**: エラーハンドリングが不十分

**小計**: 12/30点

---

### C. TypeScript化（20点） - 18/20点

- [x] (5点) **props型定義** - 5/5点
  - ✅ PetriNetEditorV2Props interfaceを定義
  - ✅ projectId, onClose, onSave
  - 問題なし

- [x] (5点) **state型定義** - 5/5点
  - ✅ useState<string | null>で型定義
  - ✅ boolean型も明示
  - 問題なし

- [x] (5点) **関数型定義** - 5/5点
  - ✅ React.FC<PetriNetEditorV2Props>
  - ✅ useCallback型定義
  - 問題なし

- [ ] (3点) **any型最小化** - 2/3点
  - ⚠️ changes: any（ReactFlowの型）
  - ⚠️ connection: any（ReactFlowの型）
  - **-1点**: any型が残存（ただしReactFlowの制約）

- [x] (2点) **interface/type適切性** - 1/2点
  - ✅ PetriNetEditorV2Props定義
  - ❌ 内部型定義が不足
  - **-1点**: 詳細な型定義が不足

**小計**: 18/20点

---

### D. Ant Design対応（10点） - 8/10点

- [x] (7点) **コンポーネント変換適切** - 6/7点
  - ✅ ThemeProvider → 不要（削除）
  - ✅ Box → Layout, Content
  - ✅ CircularProgress → message.loading
  - ✅ Alert → message.error/warning
  - ❌ 一部変換漏れ（エラーバナー等）
  - **-1点**: 一部変換漏れ

- [x] (3点) **スタイリング移行適切** - 2/3点
  - ✅ sx → style
  - ✅ インラインスタイル使用
  - ⚠️ デザイントークン未使用
  - **-1点**: デザイントークン未使用

**小計**: 8/10点

---

### E. 依存関係（10点） - 7/10点

- [ ] (5点) **import正確** - 3/5点
  - ✅ React, ReactFlowProvider: 正しい
  - ✅ antd: 正しい
  - ✅ カスタムフック: 正しい
  - ❌ 多数のコンポーネントimportが不足
  - **不足ファイル発見**: 
    - TemplateProvider（移植元で使用）
    - 多数のダイアログ/パネルコンポーネント
  - **-2点**: 重要なimportが不足

- [x] (3点) **export正確** - 3/3点
  - ✅ default export: 正しい
  - 問題なし

- [ ] (2点) **外部依存解決** - 1/2点
  - ✅ reactflow: package.jsonに存在
  - ✅ antd: package.jsonに存在
  - ⚠️ カスタムフックの実装状況が不明
  - **-1点**: フック実装の完全性が不明

**小計**: 7/10点

---

### 総合評価

**合計点**: 60/100点

**評価ランク**: 🟡 未完成（50-69点）

**総合判定**: 🟡 Phase 9リファクタリング中

---

### 発見された問題

#### 🔴 重大な問題（実装優先度: 高）

1. **MaiMLデータ読み込み機能がない**
   - 移植元: 複雑な初期化ロジック（500行以上）
   - 移植先: 未実装
   - 影響: ファイルを開けない

2. **バリデーション機能が未実装**
   - 移植元: 詳細なバリデーション + エラー分類
   - 移植先: スタブのみ
   - 影響: エラー検出できない

3. **エラー表示機能がない**
   - 移植元: 致命的/非致命的エラーの分類と視覚化
   - 移植先: 未実装
   - 影響: エラー情報が表示されない

#### 🟡 軽微な問題（実装優先度: 中）

4. **テンプレート管理の統合不足**
   - useWorkflowで実装されているがUI連携が不完全
   - TemplateProviderが使われていない

5. **保存機能が部分実装**
   - MaiMLエクスポートまで実装
   - S3/API保存が未実装（Phase 10予定）

6. **ワークフロー追加機能がスタブ**
   - Phase 10実装予定

7. **ビューモード切替機能がない**
   - ペトリネットモード/テンプレート一覧モードの切替

#### 🟢 改善提案

8. **デザイントークン未使用**
   - インラインスタイルを使用
   - theme.useToken()を使うべき

9. **型定義の拡充**
   - ReactFlow型の明示的定義
   - 内部データ構造の型定義

---

### 移植品質の評価

⚠️ **Phase 9リファクタリング中**

このファイルは現在Phase 9で大規模なリファクタリング中です：

**✅ 完了した改善:**
1. カスタムフック分離
   - useWorkflow（中核ロジック）
   - useHistory（Undo/Redo）
   - useDraftManager（Draft管理）
   - useNamespaceOperations（名前空間）

2. コンポーネント構造の簡略化
   - 2000行 → 400行
   - 表示ロジックとビジネスロジックの分離

**❌ 未完了の機能:**
1. MaiMLデータ読み込み（最優先）
2. バリデーション実装
3. エラー表示機能
4. テンプレートUI連携
5. ワークフロー追加（Phase 10）
6. ビューモード切替

**⚠️ 注意事項:**
- 移植先はPhase 9で設計変更されたため、完全な1:1移植ではない
- カスタムフックの実装状況が検証票で確認できない
- Phase 10で多くの機能が実装予定

---

### 不足ファイル

#### 🔴 必須（移植元で使用）

1. **TemplateProvider**
   - 移植元: `TemplateProvider`、`useTemplates`
   - 移植先: 未使用（useWorkflowに統合？）
   - 状態: 要確認

2. **カスタムフック実装**
   - useWorkflow（中核）
   - useHistory
   - useDraftManager
   - useNamespaceOperations
   - 状態: 別ファイルで実装済み（検証が必要）

3. **コンポーネント群**
   - WorkflowSelectorDialog
   - DraftManager
   - SaveConfirmDialog
   - 状態: 一部は実装済み（検証が必要）

---

### 修正アクション

#### Phase 9完了のための必須実装

**優先度1: 最優先（機能不全）**
```typescript
// 1. MaiMLデータ読み込み機能を追加
const workflow = useWorkflow({
  projectId,
  initialMaimlData: props.maimlData,  // ← 追加
  addToHistory
});

// 2. バリデーション実装
const handleValidate = useCallback(async () => {
  const result = await workflow.validate();
  // ValidationPanel表示
}, [workflow]);

// 3. エラー表示バナー追加
{nonCriticalErrors.length > 0 && (
  <Alert type="warning">
    {nonCriticalErrors.length}件の警告があります
    <Button onClick={handleOpenValidationPanel}>詳細</Button>
  </Alert>
)}
```

**優先度2: 重要（ユーザビリティ）**
```typescript
// 4. テンプレート管理UI連携
<TemplateProvider>
  {/* 既存コード */}
</TemplateProvider>

// 5. 保存機能完成（API連携）
const handleSave = useCallback(async () => {
  const maimlContent = workflow.exportToMaiml();
  await fetch('/api/s3/save', {
    method: 'POST',
    body: JSON.stringify({ content: maimlContent })
  });
}, [workflow]);
```

**優先度3: Phase 10対応**
```typescript
// 6. ワークフロー追加ダイアログ実装
// 7. ビューモード切替機能追加
```

---

### 次のステップ

#### 即座に実施すべきこと
1. **カスタムフックの検証**
   - `hooks/useWorkflow.ts`
   - `hooks/useHistory.ts`
   - `hooks/useDraftManager.ts`
   - `hooks/useNamespaceOperations.ts`
   - これらの実装状況を確認

2. **MaiMLデータ読み込み機能の実装**
   - 移植元の初期化ロジックを移植
   - useWorkflowに統合

3. **バリデーション機能の実装**
   - 移植元のバリデーションロジックを移植
   - ValidationPanelとの連携

#### Phase 10での実装予定
- ワークフロー追加機能
- S3/API保存機能
- ビューモード切替機能

---

**検証完了日**: 2026-01-29 17:06
**最終判定**: 🟡 Phase 9リファクタリング中（60点）

**重要**: このファイルはPhase 9で大規模なリファクタリング中のため、評価点数は暫定的なものです。カスタムフックの実装状況を確認する必要があります。