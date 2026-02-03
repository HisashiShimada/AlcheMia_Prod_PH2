# PetriNetEditorV2移植検証計画書

## 📋 メタデータ
- **作成日時**: 2026-01-29 16:42
- **タスクID**: PetriNetEditorV2移植検証
- **優先度**: 高
- **推定工数**: 8-12時間
- **対象ファイル数**: 26ファイル（移植完了分）

---

## 1. タスク概要

移植元（reference版）と移植先（editorv2版）のファイルを1つずつ比較し、以下の観点で正確性を検証します：

1. **構造の整合性**: コンポーネント構造、関数構造、ロジックの流れ
2. **処理の完全性**: 全機能が正しく移植されているか
3. **TypeScript化**: 型定義の適切性、型安全性
4. **Ant Design対応**: MUIからAnt Designへの適切な変換
5. **依存関係**: import/exportの整合性

---

## 2. 目的と期待される成果

### 目的
移植作業の品質保証とバグの早期発見

### 期待される成果
- [ ] 全26ファイルの検証完了
- [ ] 不整合箇所の特定と修正リスト作成
- [ ] 移植品質レポートの作成
- [ ] 修正が必要な箇所の優先度付け

---

## 3. 検証対象ファイル一覧

### 3-1. メインファイル（2ファイル）

| No | 優先度 | 移植元 | 移植先 | 検証状態 |
|----|-------|--------|--------|---------|
| 1 | 🔴 最高 | PetriNetEditorV2/index.jsx | editorv2/index.tsx | ⬜ 未検証 |
| 2 | 🔴 最高 | PetriNetEditorV2/PetriNetEditorInner.jsx | editorv2/PetriNetEditorV2.tsx | ⬜ 未検証 |

### 3-2. componentsフォルダ（12ファイル）

| No | 優先度 | 移植元 | 移植先 | 検証状態 |
|----|-------|--------|--------|---------|
| 3 | 🟡 高 | components/DocumentEditDialog.jsx | components/DocumentEditDialog.tsx | ⬜ 未検証 |
| 4 | 🟢 中 | components/DraftManager.jsx | components/DraftManager.tsx | ⬜ 未検証 |
| 5 | 🟡 高 | components/EditorToolbar.jsx | components/EditorToolbar.tsx | ⬜ 未検証 |
| 6 | 🟡 高 | components/MethodTabPanel.jsx | components/MethodTabPanel.tsx | ⬜ 未検証 |
| 7 | 🟡 高 | components/PropertyPanel.jsx | components/PropertyPanel.tsx | ⬜ 未検証 |
| 8 | 🟢 中 | components/SaveConfirmDialog.jsx | components/SaveConfirmDialog.tsx | ⬜ 未検証 |
| 9 | 🟢 中 | components/SaveDialog.jsx | components/SaveDialog.tsx | ⬜ 未検証 |
| 10 | 🟡 高 | components/TemplateEditorDialog.jsx | components/TemplateEditorDialog.tsx | ⬜ 未検証 |
| 11 | 🟡 高 | components/ValidationPanel.jsx | components/ValidationPanel.tsx | ⬜ 未検証 |
| 12 | 🟢 中 | components/WorkflowSelectorDialog.jsx | components/WorkflowSelectorDialog.tsx | ⬜ 未検証 |
| 13 | 🟡 高 | components/ReactFlowCanvas（新規） | components/ReactFlowCanvas.tsx | ⬜ 未検証 |
| 14 | ⚪ 低 | - | components/index.ts | ⬜ 未検証 |

### 3-3. components/TemplateViewerフォルダ（3ファイル）

| No | 優先度 | 移植元 | 移植先 | 検証状態 |
|----|-------|--------|--------|---------|
| 15 | 🟢 中 | TemplateViewer/TemplateItem.jsx | TemplateViewer/TemplateItem.tsx | ⬜ 未検証 |
| 16 | 🟢 中 | TemplateViewer/TemplateList.jsx | TemplateViewer/TemplateList.tsx | ⬜ 未検証 |
| 17 | ⚪ 低 | TemplateViewer/index.js | TemplateViewer/index.ts | ⬜ 未検証 |

### 3-4. hooksフォルダ（4ファイル）

| No | 優先度 | 移植元 | 移植先 | 検証状態 |
|----|-------|--------|--------|---------|
| 18 | 🟡 高 | hooks/useDraftManager.js | hooks/useDraftManager.ts | ⬜ 未検証 |
| 19 | 🟡 高 | hooks/useHistory.js | hooks/useHistory.ts | ⬜ 未検証 |
| 20 | 🟡 高 | hooks/useNamespaceOperations.js | hooks/useNamespaceOperations.ts | ⬜ 未検証 |
| 21 | 🟡 高 | hooks/useWorkflow.js | hooks/useWorkflow.ts | ⬜ 未検証 |

### 3-5. nodesフォルダ（2ファイル）

| No | 優先度 | 移植元 | 移植先 | 検証状態 |
|----|-------|--------|--------|---------|
| 22 | 🟡 高 | nodes/EditablePlaceNode.jsx | nodes/EditablePlaceNode.tsx | ⬜ 未検証 |
| 23 | 🟡 高 | nodes/EditableTransitionNode.jsx | nodes/EditableTransitionNode.tsx | ⬜ 未検証 |

### 3-6. utilsフォルダ（3ファイル）

| No | 優先度 | 移植元 | 移植先 | 検証状態 |
|----|-------|--------|--------|---------|
| 24 | 🟡 高 | utils/documentParser.js | utils/documentParser.ts | ⬜ 未検証 |
| 25 | 🟡 高 | utils/templateExtractor.js | utils/templateExtractor.ts | ⬜ 未検証 |
| 26 | 🟢 中 | utils/xmlSignature.js | utils/xmlSignature.ts | ⬜ 未検証 |

### 3-7. utils/convertersフォルダ（3ファイル）

| No | 優先度 | 移植元 | 移植先 | 検証状態 |
|----|-------|--------|--------|---------|
| 27 | 🔴 最高 | converters/maimlToReactFlow.js | converters/maimlToReactFlow.ts | ⬜ 未検証 |
| 28 | 🟡 高 | converters/multiMethodConverter.js | converters/multiMethodConverter.ts | ⬜ 未検証 |
| 29 | 🔴 最高 | converters/reactFlowToMaiml.js | converters/reactFlowToMaiml.ts | ⬜ 未検証 |

---

## 4. 検証項目定義

### 4-1. 各ファイルの検証チェックリスト

各ファイルに対して以下の項目を確認：

#### A. 構造の整合性（30点）
- [ ] ファイル構造（import、定数、関数、export）が一致
- [ ] コンポーネント構造（state、props、lifecycle）が一致
- [ ] 関数の数と名前が一致
- [ ] ロジックの流れが一致

#### B. 処理の完全性（30点）
- [ ] 全ての関数が移植されている
- [ ] 全てのイベントハンドラが移植されている
- [ ] 条件分岐が正しく移植されている
- [ ] ループ処理が正しく移植されている
- [ ] エラーハンドリングが移植されている

#### C. TypeScript化（20点）
- [ ] 全てのpropsに型定義がある
- [ ] 全てのstateに型定義がある
- [ ] 全ての関数に型定義がある
- [ ] any型を使用していない（または最小限）
- [ ] interfaceまたはtype定義が適切

#### D. Ant Design対応（10点）
- [ ] MUIコンポーネントが適切にAnt Designに変換されている
- [ ] スタイリングが適切に移行されている

#### E. 依存関係（10点）
- [ ] 全てのimportが正しい
- [ ] 全てのexportが正しい
- [ ] 外部依存が解決されている

---

## 5. 検証手順とワークフロー

### 🔄 1ファイルごとの基本ワークフロー

**各ファイルに対して以下のサイクルを実施：**

```
調査 → 修正 → 記録
  ↓      ↓      ↓
比較    実装   検証票作成
分析    適用   不足ファイル記録
```

#### Step 1: 調査（Investigation）
1. **移植元ファイル読み込み**
   - reference版のファイルを読み込み
   - 構造、関数、ロジックを把握
   - 依存関係を確認

2. **移植先ファイル読み込み**
   - editorv2版のファイルを読み込み
   - TypeScript化、Ant Design対応を確認

3. **比較分析**
   - チェックリストに基づき100点満点で評価
   - 不整合箇所を特定
   - 不足している処理を抽出
   - **不足ファイルの発見を記録**

4. **不足ファイルの確認（重要）**
   - 不足ファイルが見つかった場合：
     - どのファイル検証時に発見されたか記録
     - 配置場所をユーザーに確認（ask_followup_question使用）
     - まとめて取り込みを行う

#### Step 2: 修正（Fix）
1. **問題があれば即座に修正**
   - 不整合箇所を修正
   - 不足処理を追加
   - TypeScript型定義を追加
   - Ant Design対応を修正

2. **修正内容の確認**
   - 修正後のファイルが正しく動作するか確認

3. **不足ファイルの取り込み**
   - 配置場所確認後、ファイルをコピー
   - 必要に応じてTypeScript化・Ant Design化

#### Step 3: 記録（Record）
1. **個別検証票の作成**
   - 100点満点の評価結果を記録
   - 発見された問題を分類（重大/軽微/改善提案）
   - 修正内容を記録

2. **不足ファイル一覧の更新**
   - どのファイル検証時に発見されたか
   - 配置場所
   - 取り込み状況

3. **次のファイルへ**
   - 1ファイル完了したら次へ進む

---

### Phase 1: 最重要ファイル検証（優先度🔴）

```
検証順序（1ファイルずつ実施）:
1. index.tsx（エントリーポイント）
2. PetriNetEditorV2.tsx（メインファイル）
3. converters/maimlToReactFlow.ts（データ変換の要）
4. converters/reactFlowToMaiml.ts（データ変換の要）
```

**各ファイルで実施:**
1. 調査: 移植元・移植先読み込み、比較分析
2. 修正: 不整合箇所の修正（必要な場合）
3. 記録: 検証票作成、不足ファイル記録
4. **ユーザー確認**: 不足ファイルがあれば配置場所を確認

---

### Phase 2: 高優先度ファイル検証（優先度🟡）

```
検証順序（機能単位でグループ化）:

グループ1: エディタコア機能
- EditorToolbar.tsx
- PropertyPanel.tsx
- ValidationPanel.tsx
- ReactFlowCanvas.tsx

グループ2: ダイアログ系
- DocumentEditDialog.tsx
- TemplateEditorDialog.tsx

グループ3: メソッドタブ関連
- MethodTabPanel.tsx

グループ4: カスタムフック
- hooks/useDraftManager.ts
- hooks/useHistory.ts
- hooks/useNamespaceOperations.ts
- hooks/useWorkflow.ts

グループ5: カスタムノード
- nodes/EditablePlaceNode.tsx
- nodes/EditableTransitionNode.tsx

グループ6: ユーティリティ
- utils/documentParser.ts
- utils/templateExtractor.ts
- converters/multiMethodConverter.ts
```

---

### Phase 3: 中優先度ファイル検証（優先度🟢）

```
検証順序:

グループ7: ダイアログ補助系
- DraftManager.tsx
- SaveConfirmDialog.tsx
- SaveDialog.tsx
- WorkflowSelectorDialog.tsx

グループ8: テンプレートビューア
- TemplateViewer/TemplateItem.tsx
- TemplateViewer/TemplateList.tsx

グループ9: その他ユーティリティ
- utils/xmlSignature.ts
```

---

### Phase 4: 低優先度ファイル検証（優先度⚪）

```
検証順序:

グループ10: エクスポートファイル
- editorv2/index.ts
- components/index.ts
- TemplateViewer/index.ts
```

---

## 6. 検証結果記録テンプレート

### 個別ファイル検証票

```markdown
## ファイル検証票: [ファイル名]

**検証日時**: YYYY-MM-DD HH:MM
**検証者**: Cline
**優先度**: 🔴🟡🟢⚪

### 基本情報
- **移植元**: `path/to/source.jsx`
- **移植先**: `path/to/target.tsx`
- **行数**: 移植元 XXX行 → 移植先 XXX行
- **主要な役割**: [簡潔な説明]

### A. 構造の整合性（30点）
- [ ] (10点) ファイル構造一致
  - 詳細: [問題があれば記述]
- [ ] (10点) コンポーネント構造一致
  - 詳細: [問題があれば記述]
- [ ] (5点) 関数の数と名前一致
  - 詳細: [問題があれば記述]
- [ ] (5点) ロジックの流れ一致
  - 詳細: [問題があれば記述]

**小計**: XX/30点

### B. 処理の完全性（30点）
- [ ] (8点) 全関数移植
  - 移植元関数数: XX個
  - 移植先関数数: XX個
  - 未移植: [リスト]
- [ ] (8点) 全イベントハンドラ移植
  - 詳細: [問題があれば記述]
- [ ] (6点) 条件分岐正確
  - 詳細: [問題があれば記述]
- [ ] (4点) ループ処理正確
  - 詳細: [問題があれば記述]
- [ ] (4点) エラーハンドリング
  - 詳細: [問題があれば記述]

**小計**: XX/30点

### C. TypeScript化（20点）
- [ ] (5点) props型定義
  - 詳細: [問題があれば記述]
- [ ] (5点) state型定義
  - 詳細: [問題があれば記述]
- [ ] (5点) 関数型定義
  - 詳細: [問題があれば記述]
- [ ] (3点) any型最小化
  - any型使用箇所: XX個
- [ ] (2点) interface/type適切性
  - 詳細: [問題があれば記述]

**小計**: XX/20点

### D. Ant Design対応（10点）
- [ ] (7点) コンポーネント変換適切
  - MUI→Ant Design変換箇所: XX個
  - 詳細: [問題があれば記述]
- [ ] (3点) スタイリング移行適切
  - 詳細: [問題があれば記述]

**小計**: XX/10点

### E. 依存関係（10点）
- [ ] (5点) import正確
  - 詳細: [問題があれば記述]
- [ ] (3点) export正確
  - 詳細: [問題があれば記述]
- [ ] (2点) 外部依存解決
  - 詳細: [問題があれば記述]

**小計**: XX/10点

---

### 総合評価

**合計点**: XX/100点

**評価ランク**:
- 🟢 優秀（90-100点）: 問題なし
- 🟡 良好（70-89点）: 軽微な修正必要
- 🟠 要改善（50-69点）: 複数の修正必要
- 🔴 不合格（0-49点）: 大幅な修正必要

**総合判定**: 🟢🟡🟠🔴

---

### 発見された問題

#### 🔴 重大な問題
1. [問題の説明]
   - 影響範囲: [説明]
   - 修正優先度: 高
   - 修正方法: [提案]

#### 🟡 軽微な問題
1. [問題の説明]
   - 影響範囲: [説明]
   - 修正優先度: 中
   - 修正方法: [提案]

#### 🟢 改善提案
1. [提案内容]

---

### 修正アクション

- [ ] 修正1: [詳細]
- [ ] 修正2: [詳細]
- [ ] 修正3: [詳細]

**検証完了日**: YYYY-MM-DD HH:MM
**最終判定**: ✅合格 / ⚠️条件付き合格 / ❌不合格
```

---

## 7. 総合レポート構成

全ファイル検証完了後、以下の総合レポートを作成：

### 7-1. 総合統計

```markdown
# PetriNetEditorV2移植検証 総合レポート

## 検証統計

| 項目 | 値 |
|------|-----|
| 検証ファイル数 | 26 |
| 検証完了数 | XX |
| 平均点 | XX.X点 |
| 合格数（70点以上） | XX |
| 不合格数（70点未満） | XX |

## ランク別分布

| ランク | ファイル数 | 割合 |
|--------|-----------|------|
| 🟢 優秀（90-100点） | XX | XX% |
| 🟡 良好（70-89点） | XX | XX% |
| 🟠 要改善（50-69点） | XX | XX% |
| 🔴 不合格（0-49点） | XX | XX% |

## カテゴリ別平均点

| カテゴリ | 平均点 |
|---------|--------|
| 構造の整合性 | XX.X/30 |
| 処理の完全性 | XX.X/30 |
| TypeScript化 | XX.X/20 |
| Ant Design対応 | XX.X/10 |
| 依存関係 | XX.X/10 |
```

### 7-2. 重大な問題リスト

全ファイルから抽出した重大な問題の一覧

### 7-3. 修正優先度マトリックス

```
優先度 × 影響度のマトリックスで修正順序を決定
```

---

## 8. 実施スケジュール

### タイムライン

| Phase | 対象 | 推定時間 | 実施日 | 状態 |
|-------|------|---------|--------|------|
| Phase 1 | 最重要ファイル（3件） | 3時間 | Day 1 | ⬜ |
| Phase 2 | 高優先度ファイル（14件） | 5時間 | Day 2-3 | ⬜ |
| Phase 3 | 中優先度ファイル（6件） | 2時間 | Day 4 | ⬜ |
| Phase 4 | 低優先度ファイル（3件） | 0.5時間 | Day 4 | ⬜ |
| レポート作成 | 総合レポート | 1.5時間 | Day 5 | ⬜ |

**合計推定時間**: 12時間（約5日間）

---

## 9. リスクと対策

### 想定されるリスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 大量の不整合発見 | 高 | 中 | 優先度付けして段階的に修正 |
| 構造的な相違 | 高 | 低 | reference版の再確認、設計変更の妥当性確認 |
| TypeScript型定義不足 | 中 | 中 | 段階的に型定義を追加 |
| Ant Design変換不備 | 中 | 低 | UIレビューで確認 |

---

## 10. 承認記録

- **計画書提示日時**: 2026-01-29 16:42
- **承認日時**: YYYY-MM-DD HH:MM
- **承認者コメント**: [ユーザーからのフィードバック]

---

## 11. 次のステップ

### 承認後のアクション

1. **検証開始**: Phase 1の最重要ファイルから開始
2. **進捗報告**: 各Phase完了時に進捗報告
3. **問題発見時**: 重大な問題発見時は即座に報告
4. **総合レポート作成**: 全Phase完了後にレポート作成

### 検証完了後のアクション

1. 総合レポートに基づく修正計画の策定
2. 修正作業の実施
3. 再検証（必要に応じて）
4. 最終品質保証

---

## 12. 参考資料

- `PetriNetEditorV2_移植統合ドキュメント.md` - 移植全体の情報
- `ファイル対応表.md` - ファイル対応の詳細
- `20260129_1633_PetriNetEditorV2_構造差異分析レポート.md` - 構造差異の分析

---

**📄 計画書終了**