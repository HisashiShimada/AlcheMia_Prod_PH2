# PetriNetEditorInner分割反映漏れ 調査・修正計画書

**作成日時**: 2026-02-02 08:13  
**タスクID**: PetriNetEditorInner_Missing_Components  
**優先度**: 高  
**推定工数**: 2-3時間

---

## 1. タスク概要

PetriNetEditorV2の移植作業において、PetriNetEditorInnerの分割計画時に反映漏れが発生している可能性がある。特に以下のコンポーネントが正しく取り込まれているか調査し、不足があれば修正する。

### 調査対象コンポーネント
1. **DraftManager** (components/)
2. **SaveConfirmDialog** (components/)
3. **WorkflowSelectorDialog** (components/)
4. **TemplateViewer/** (TemplateList, TemplateItem)
5. **MultiObjectEditor** (components/)
6. **TemplateListView**, **TemplateListItem** (コメントアウト状態)

---

## 2. 目的と期待される成果

### 目的
- reference版で実装されていた機能が現在のeditorv2版で欠落していないか確認
- 欠落している場合は適切に移植して機能を完全にする

### 期待される成果
- [x] 未移植コンポーネントの特定
- [ ] 各コンポーネントのreference版実装の確認
- [ ] 現在のeditorv2版との差分分析
- [ ] 欠落機能の移植実装
- [ ] 動作確認

---

## 3. 現状分析（調査済み）

### 3.1 ドキュメント調査結果

**`docs/V2移植/未移植ファイルの依存関係.md`より：**

| ファイル | 移植元 | 推奨移植先 | 優先度 | 状態 |
|---------|--------|-----------|--------|------|
| DraftManager.jsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | ❌ 未実装 |
| SaveConfirmDialog.jsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | ❌ 未実装 |
| WorkflowSelectorDialog.jsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | ❌ 未実装 |
| TemplateViewer/* | reference/.../components/TemplateViewer/ | frontend/.../editorv2/components/TemplateViewer/ | 高 | ❌ 未実装 |
| MultiObjectEditor.jsx | reference/.../components/ | frontend/.../editorv2/components/ | 高 | ⚠️ TODO |
| TemplateListView.jsx | reference/.../components/ | frontend/.../editorv2/components/ | 中 | ❌ 未実装 |
| TemplateListItem.jsx | reference/.../components/ | frontend/.../editorv2/components/ | 中 | ❌ 未実装 |

### 3.2 現在のPetriNetEditorInner.tsx分析

**インポート文の状態：**

```typescript
// ✅ 存在するインポート
import DraftManager from './components/DraftManager';
import SaveConfirmDialog from './components/SaveConfirmDialog';
import WorkflowSelectorDialog from './components/WorkflowSelectorDialog';
import { TemplateList } from './components/TemplateViewer';

// ⚠️ 使用されているが実装状況不明
- DraftManager: useDraftManager hookは実装済み、UIコンポーネントは？
- SaveConfirmDialog: 使用箇所あり
- WorkflowSelectorDialog: 使用箇所あり
- TemplateList: 使用箇所あり
```

**重要な発見：**
- これらのコンポーネントはインポートされ、JSX内で使用されている
- しかし、`docs/V2移植/未移植ファイルの依存関係.md`では「未実装」と記載
- 実際のファイルが存在するか確認が必要

---

## 4. 実装ステップ

### Phase 1: 現在の実装状況確認 ✅（優先）

#### Step 1.1: 移植先ディレクトリの確認
```bash
ls -la frontend/src/components/editorv2/components/
```

**確認項目：**
- [ ] DraftManager.tsx が存在するか
- [ ] SaveConfirmDialog.tsx が存在するか
- [ ] WorkflowSelectorDialog.tsx が存在するか
- [ ] TemplateViewer/ ディレクトリが存在するか
  - [ ] index.ts
  - [ ] TemplateList.tsx
  - [ ] TemplateItem.tsx
- [ ] MultiObjectEditor.tsx が存在するか
- [ ] TemplateListView.tsx が存在するか
- [ ] TemplateListItem.tsx が存在するか

#### Step 1.2: 既存ファイルの実装内容確認
存在するファイルについて：
- reference版との差分を確認
- 機能が完全に移植されているか確認
- TypeScript化が適切に行われているか確認

### Phase 2: reference版の実装確認（必要に応じて）

未実装または不完全なコンポーネントについて、reference版を確認：

```
reference/frontend/src/components/PetriNetEditorV2/components/
├── DraftManager.jsx
├── SaveConfirmDialog.jsx
├── WorkflowSelectorDialog.jsx
├── TemplateViewer/
│   ├── index.js
│   ├── TemplateList.jsx
│   └── TemplateItem.jsx
├── MultiObjectEditor.jsx
├── TemplateListView.jsx
└── TemplateListItem.jsx
```

**確認項目：**
- [ ] Props定義
- [ ] 主要な機能・ロジック
- [ ] 使用しているライブラリ（MUI → Ant Design変換が必要）
- [ ] 依存する他のコンポーネント・フック

### Phase 3: 差分分析と移植計画

各コンポーネントについて：
1. reference版の機能を分析
2. 現在のeditorv2版との差分を特定
3. 移植が必要な機能をリストアップ
4. MUI → Ant Design への変換計画

### Phase 4: 移植実装

#### 優先度 高（Phase 1での確認結果に基づく）

**1. DraftManager.tsx**
- 機能: Draft保存・読み込みUI
- 依存: useDraftManager hook（実装済み）
- 変換: MUI → Ant Design (Dialog → Modal)

**2. SaveConfirmDialog.tsx**
- 機能: 保存確認ダイアログ（バリデーション結果表示）
- 変換: MUI → Ant Design

**3. WorkflowSelectorDialog.tsx**
- 機能: ワークフロー選択ダイアログ
- 変換: MUI → Ant Design

**4. TemplateViewer/**
- TemplateList.tsx: テンプレート一覧表示
- TemplateItem.tsx: 個別テンプレート表示
- index.ts: エクスポート
- 変換: MUI → Ant Design

#### 優先度 中（必要に応じて）

**5. MultiObjectEditor.tsx**
- 機能: 複数オブジェクト編集（DocumentEditDialogから使用）
- 状態: TODOコメントあり（意図的な未実装の可能性）

**6. TemplateListView.tsx, TemplateListItem.tsx**
- reference版でコメントアウト状態
- 実装の必要性を判断

### Phase 5: 動作確認とテスト

- [ ] 各コンポーネントが正しく表示される
- [ ] Draft管理機能が動作する
- [ ] 保存確認ダイアログが機能する
- [ ] ワークフロー追加が動作する
- [ ] テンプレート一覧が表示される
- [ ] エラーが発生しない

---

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/components/DraftManager.tsx` - 新規/更新
2. `frontend/src/components/editorv2/components/SaveConfirmDialog.tsx` - 新規/更新
3. `frontend/src/components/editorv2/components/WorkflowSelectorDialog.tsx` - 新規/更新
4. `frontend/src/components/editorv2/components/TemplateViewer/index.ts` - 新規/更新
5. `frontend/src/components/editorv2/components/TemplateViewer/TemplateList.tsx` - 新規/更新
6. `frontend/src/components/editorv2/components/TemplateViewer/TemplateItem.tsx` - 新規/更新
7. `frontend/src/components/editorv2/components/MultiObjectEditor.tsx` - 更新（必要に応じて）
8. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - 確認のみ（修正不要の可能性）

### 影響を受ける機能
- Draft管理UI（現在はhookのみ実装）
- 保存確認フロー
- ワークフロー追加機能
- テンプレート一覧表示
- Document編集（MultiObjectEditor依存）

---

## 6. 技術的詳細

### MUI → Ant Design 変換パターン

| MUI コンポーネント | Ant Design 対応 |
|-------------------|-----------------|
| Dialog | Modal |
| DialogTitle | Modal title prop |
| DialogContent | Modal 内部 |
| DialogActions | Modal footer prop |
| Button | Button |
| TextField | Input |
| Select | Select |
| MenuItem | Select.Option |
| Accordion | Collapse |
| List | List |
| ListItem | List.Item |

### TypeScript化のポイント
- Props型定義を明示
- useState, useCallback等の型推論を活用
- any型の使用を避ける
- 適切なインターフェース定義

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| すでに実装されている（ドキュメントの更新漏れ） | 低 | 中 | Phase 1で実ファイルを確認 |
| reference版との大幅な仕様差異 | 高 | 低 | 差分分析を丁寧に実施 |
| MUI→Ant Design変換で動作不良 | 中 | 中 | 段階的に実装・テスト |
| 依存関係の不足 | 中 | 低 | reference版の依存を正確に把握 |

---

## 8. テスト計画

### Phase 1確認後のテスト
- [ ] 各コンポーネントファイルが存在するか
- [ ] インポートエラーが発生しないか
- [ ] TypeScriptのコンパイルが通るか

### 実装後のテスト
- [ ] DraftManager: Draft保存・読み込みが動作
- [ ] SaveConfirmDialog: バリデーション結果が表示される
- [ ] WorkflowSelectorDialog: ファイル一覧が表示され選択できる
- [ ] TemplateList: テンプレート一覧が正しく表示される
- [ ] TemplateItem: 個別テンプレートが正しく表示される

---

## 9. ロールバック計画

万が一問題が発生した場合：
1. Git commitで変更をコミット（各Phase毎）
2. 問題発生時は該当commitをrevert
3. 現在のPetriNetEditorInner.tsxは動作しているため、影響は限定的

---

## 10. 承認記録

- **計画書提示日時**: 2026-02-02 08:13
- **承認日時**: （ユーザー承認待ち）
- **承認者コメント**: 

---

## 11. 実施記録

### Phase 1: 実装状況確認
- **開始**: 
- **完了**: 
- **結果**: 

### Phase 2: reference版確認
- **開始**: 
- **完了**: 
- **結果**: 

### Phase 3: 差分分析
- **開始**: 
- **完了**: 
- **結果**: 

### Phase 4: 移植実装
- **開始**: 
- **完了**: 
- **結果**: 

### Phase 5: 動作確認
- **開始**: 
- **完了**: 
- **結果**: 

---

## 12. 振り返り

### うまくいった点
（実施後に記録）

### 改善が必要な点
（実施後に記録）

### 学んだこと
（実施後に記録）

---

## 付録: 参考ドキュメント

- `docs/V2移植/未移植ファイルの依存関係.md`
- `docs/V2移植/PetriNetEditorV2_コンポーネント構成分析.md`
- `docs/V2移植/PetriNetEditorV2_移植ファイル一覧.md`