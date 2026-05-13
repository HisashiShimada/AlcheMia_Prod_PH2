# PetriNetEditorV2移植 Phase3完了セッション - タスク指示書

## 📋 このセッションの目的

Phase 3（サブコンポーネント移植）の残り30%を完了させ、Phase 3を100%完了させる。

---

## 🎯 実施内容

### 主要タスク: TemplateEditorDialog.tsx 移植

**優先度: 最高**

```
参照元: reference/frontend/src/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx
出力先: frontend/src/components/viewer/PetriNetEditor/components/TemplateEditorDialog.tsx
```

**特徴:**
- **最大規模コンポーネント**（2,000行超）
- テンプレート編集の全機能を実装
- NestedPropertyEditorという複雑なネスト構造エディタを含む
- 名前空間テンプレート取り込み機能
- MaiMLスキーマの全property type対応
- 再帰的なデータ構造の編集

**推定時間:** 3-4時間

---

## 📚 前提知識

### 引き継ぎ情報

**必読ドキュメント:**
- `docs/cline_archives/20251223_0907_PetriNetEditorV2移植_Phase3_70%完了_引き継ぎ.md`

このドキュメントに以下の情報が含まれています：
- Phase 1-3の完了内容
- 完了済みコンポーネント一覧（13ファイル、約7,200行）
- Material-UI → Ant Design v6 変換パターン
- TypeScript型定義の方針
- 技術的な注意点

### 現在の進捗状況

```
Phase 1: 調査・分析          ████████████ 100% ✅
Phase 2: utils/hooks移植     ████████████ 100% ✅
Phase 3: サブコンポーネント  ████████░░░░  70% ⏳
Phase 4: メインコンポーネント ░░░░░░░░░░░░   0% ⏳
Phase 5: 統合・テスト        ░░░░░░░░░░░░   0% ⏳
```

**Phase 3 完了済み:** 7/10コンポーネント
1. ✅ EditorToolbar.tsx
2. ✅ PropertyPanel.tsx
3. ✅ MethodTabPanel.tsx
4. ✅ SaveConfirmDialog.tsx
5. ✅ ValidationPanel.tsx
6. ✅ WorkflowSelectorDialog.tsx
7. ✅ DocumentEditDialog.tsx + MultiObjectEditor.tsx
8. ✅ DraftManager.tsx

**Phase 3 未完了:** 1/10コンポーネント
9. ⏳ TemplateEditorDialog.tsx（今回実装）

---

## 🔧 実装方針

### Step 1: 参照元ファイルの確認

```bash
reference/frontend/src/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx
```

このファイルを読み込んで構造を把握します。

### Step 2: 段階的な実装

**Phase A: 基本構造の移植**（推定1時間）
- Modalの基本構造
- 状態管理（useState, useCallback）
- 基本的なプロパティ編集UI

**Phase B: NestedPropertyEditor実装**（推定1.5時間）
- 再帰的なプロパティエディタ
- 各property typeごとの入力フィールド
- 追加/削除/並び替え機能

**Phase C: 名前空間操作機能**（推定0.5時間）
- 名前空間テンプレート取り込み
- S3からのファイル読み込み
- useNamespaceOperations フック（必要に応じて作成）

**Phase D: 統合とテスト**（推定0.5時間）
- Material-UI → Ant Design v6変換の最終確認
- TypeScript型定義の追加
- 基本動作確認

### Step 3: Material-UI → Ant Design v6 変換パターン

引き継ぎ資料より、以下の変換パターンを使用：

| Material-UI | Ant Design v6 |
|------------|---------------|
| Dialog | Modal |
| TextField | Input |
| Select + MenuItem | Select + Select.Option |
| IconButton | Button (icon prop) |
| Accordion | Collapse + Panel |
| Chip | Tag |
| Alert | Alert |
| Box | div (styled) または Flex |
| Typography | Typography.Text / Title |

### Step 4: TypeScript型定義

**重要な型定義:**
```typescript
// Template型
interface TemplateData {
  id: string;
  name: string;
  description?: string;
  properties?: PropertyData[];
  namespace?: string;
}

// Property型（再帰構造）
interface PropertyData {
  name: string;
  type: string;
  value?: any;
  children?: PropertyData[];
  required?: boolean;
}
```

---

## ⚠️ 注意事項

### 1. 複雑な部分の対応

**NestedPropertyEditor:**
- 再帰的なデータ構造の編集
- 各property typeごとに異なる入力UI
- 型定義は`any`を避け、Union型を使用

**名前空間操作:**
- S3からのファイル読み込みはAPI経由
- エラーハンドリングを適切に実装

### 2. TypeScript/ESLintエラー

移植時に以下のエラーは許容（後でまとめて修正）：
- `any`型の使用（一部は段階的に厳密化）
- 文字列エスケープ警告
- useEffect内のsetState警告

ただし、**明らかに型定義できる部分は積極的に型付けする**

### 3. コンテキストウィンドウ管理

- 現在: 71%使用
- TemplateEditorDialog.jsxは2,000行超
- 必要に応じて段階的に読み込み

---

## 📖 参考ドキュメント

### コーディング規約
1. `.clinerules/frontend.md` - フロントエンド規約
2. `.clinerules/ui_policy.md` - UIポリシー（Ant Design v6）

### 既存の移植済みコンポーネント
参考実装として確認可能：
- `frontend/src/components/viewer/PetriNetEditor/components/PropertyPanel.tsx` - プロパティ編集UI
- `frontend/src/components/viewer/PetriNetEditor/components/DocumentEditDialog.tsx` - 複雑なダイアログ
- `frontend/src/components/viewer/PetriNetEditor/components/MultiObjectEditor.tsx` - 複数オブジェクト編集

### 依存するフック・ユーティリティ（すでに作成済み）
- `frontend/src/hooks/useHistory.ts` - Undo/Redo
- `frontend/src/hooks/useWorkflow.ts` - ワークフロー管理
- `frontend/src/utils/documentParser.ts` - XMLパース

---

## ✅ 実施手順

### 手順1: 引き継ぎ資料の確認（5分）

```bash
# 引き継ぎ資料を読む
docs/cline_archives/20251223_0907_PetriNetEditorV2移植_Phase3_70%完了_引き継ぎ.md
```

### 手順2: 参照元ファイルの確認（10分）

```bash
# TemplateEditorDialog.jsxを読み込んで構造を把握
reference/frontend/src/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx
```

**確認ポイント:**
- 全体の構造（state、handlers、render）
- NestedPropertyEditorの実装
- 名前空間操作の実装
- property typeの種類と対応UI

### 手順3: 基本構造の移植（60分）

**Phase A: 基本構造**
- Modalコンポーネントの作成
- 状態管理の実装
- 基本的なprops定義

```typescript
// 出力先
frontend/src/components/viewer/PetriNetEditor/components/TemplateEditorDialog.tsx
```

### 手順4: NestedPropertyEditor実装（90分）

**Phase B: 複雑な部分**
- 再帰的なプロパティエディタの実装
- 各property typeの入力UI
- 追加/削除/並び替え機能

**可能であれば別コンポーネントとして切り出し:**
```typescript
// オプション: 別ファイルとして作成
frontend/src/components/viewer/PetriNetEditor/components/NestedPropertyEditor.tsx
```

### 手順5: 名前空間操作機能（30分）

**Phase C: 追加機能**
- 名前空間テンプレート取り込み
- 必要に応じてuseNamespaceOperationsフックを作成

```typescript
// 必要な場合のみ作成
frontend/src/hooks/useNamespaceOperations.ts
```

### 手順6: 統合とテスト（30分）

**Phase D: 最終確認**
- TypeScript型定義の追加
- ESLintエラーの確認
- 基本動作の想定確認

### 手順7: 完了報告（10分）

以下を含む完了報告を作成：
- 実装内容のサマリー
- 発生した問題と解決策
- 残っているTypeScript/ESLintエラー
- 次のPhase 4への引き継ぎ事項

---

## 📊 完了基準

### 必須要件
- [ ] TemplateEditorDialog.tsxが作成されている
- [ ] TypeScriptで記述されている
- [ ] Ant Design v6コンポーネントを使用している
- [ ] 基本的な型定義が含まれている
- [ ] 明らかな構文エラーがない

### 推奨要件
- [ ] NestedPropertyEditorが実装されている
- [ ] 名前空間操作機能が実装されている
- [ ] 各property typeに対応したUI
- [ ] 適切なエラーハンドリング

---

## 🎉 完了時のアクション

### 1. 作業記録の作成

```markdown
# ファイル名
docs/cline_archives/20251223_HHMM_PetriNetEditorV2移植_Phase3_100%完了.md

# 内容
- 実装したコンポーネントの詳細
- 発生した問題と解決策
- 残っているTypeScript/ESLintエラーのリスト
- Phase 4への引き継ぎ事項
```

### 2. Phase 3完了の確認

Phase 3のすべてのサブコンポーネント（10/10）が完了：
1. ✅ EditorToolbar.tsx
2. ✅ PropertyPanel.tsx
3. ✅ MethodTabPanel.tsx
4. ✅ SaveConfirmDialog.tsx
5. ✅ ValidationPanel.tsx
6. ✅ WorkflowSelectorDialog.tsx
7. ✅ DocumentEditDialog.tsx + MultiObjectEditor.tsx
8. ✅ DraftManager.tsx
9. ✅ TemplateEditorDialog.tsx **← 今回完了**

### 3. Phase 4の準備

次のPhase 4では以下を実装：
- **PetriNetEditor.tsx**（メインコンポーネント、約1,500行）
- ReactFlowの統合
- すべてのサブコンポーネントの統合
- カスタムノード/エッジの実装

---

## 💡 Tips

### 効率的な実装
1. 既存のコンポーネント（PropertyPanel.tsx、DocumentEditDialog.tsx）を参照
2. 同じパターンの変換は前回のコードをコピー&修正
3. TypeScriptエラーは後でまとめて修正でもOK（機能優先）

### デバッグのコツ
1. 段階的にコードを追加してエラーを早期発見
2. console.logで状態の変化を確認
3. 複雑なロジックはコメントを充実

### 時間管理
- Phase A-D それぞれの推定時間を目安に
- 合計3-4時間を想定
- 途中でコンテキストウィンドウを確認

---

それでは、TemplateEditorDialog.jsxの読み込みから開始してください。

**最初のアクション:**
```
read_file reference/frontend/src/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx
