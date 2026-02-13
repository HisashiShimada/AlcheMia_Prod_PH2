# Phase 5: EditorToolbar完全版実装 - 計画書

**日時**: 2026-02-02 08:58  
**Phase**: Phase 5  
**ステータス**: 🚀 開始準備

---

## 📋 目的

Reference版の`EditorToolbar.tsx`を完全移植し、ツールバー機能を統合する。

---

## 🎯 実装対象

### ファイル
- ✅ 対象: `frontend/src/components/editorv2/components/EditorToolbar.tsx`
- 📄 Reference: `frontend/src/components/reference/PetriNetEditorV2/components/EditorToolbar.tsx`

---

## 📊 Reference版の機能分析

### 主要機能（Reference版）

#### 1. ノード追加ボタン
```typescript
<Button onClick={() => onAddNode('material')}>
  <ExperimentOutlined /> Material
</Button>
<Button onClick={() => onAddNode('condition')}>
  <SettingOutlined /> Condition
</Button>
<Button onClick={() => onAddNode('result')}>
  <BarChartOutlined /> Result
</Button>
<Button onClick={() => onAddNode('transition')}>
  <ThunderboltOutlined /> Transition
</Button>
```

#### 2. Undo/Redoボタン
```typescript
<Button onClick={onUndo} disabled={!canUndo}>
  <UndoOutlined /> Undo
</Button>
<Button onClick={onRedo} disabled={!canRedo}>
  <RedoOutlined /> Redo
</Button>
```

#### 3. 保存ボタン
```typescript
<Button type="primary" onClick={onSave} disabled={!canSave}>
  <SaveOutlined /> Save
</Button>
```

#### 4. Document編集ボタン
```typescript
<Button onClick={onEditDocument}>
  <FileTextOutlined /> Document
</Button>
```

#### 5. バリデーションボタン
```typescript
<Button onClick={onValidate} loading={isValidating}>
  <CheckCircleOutlined /> Validate
</Button>
```

#### 6. ワークフロー追加ボタン
```typescript
<Button onClick={onAddWorkflow} type={workflowModeActive ? 'primary' : 'default'}>
  <PlusOutlined /> Workflow
</Button>
```

#### 7. Draft管理ボタン
```typescript
<Button onClick={onOpenDraftManager}>
  <FolderOpenOutlined /> Drafts
</Button>
```

#### 8. 自動保存表示
```typescript
<Space>
  <Switch checked={autoSaveEnabled} onChange={onAutoSaveToggle} />
  <Text>Auto Save</Text>
  {lastAutoSaveTime && (
    <Text type="secondary">Last saved: {formatTime(lastAutoSaveTime)}</Text>
  )}
</Space>
```

#### 9. ビューモード切替
```typescript
<Radio.Group value={viewMode} onChange={(e) => onViewModeChange(e.target.value)}>
  <Radio.Button value="petriNet">
    <ShareAltOutlined /> Petri Net
  </Radio.Button>
  <Radio.Button value="templates">
    <AppstoreOutlined /> Templates
  </Radio.Button>
</Radio.Group>
```

---

## 🔧 実装計画

### Step 1: 現在のEditorToolbarを確認
- 現在のファイル内容を読み込む
- 既存の実装を確認

### Step 2: Reference版との差分分析
- Reference版の機能リストアップ
- 現在版との差分を特定

### Step 3: 不足機能の追加実装
- ビューモード切替ボタン（petriNet ⇄ templates）
- 自動保存表示（Switch + 最終保存時刻）
- Draft管理ボタン
- ワークフロー追加ボタンの状態表示

### Step 4: レイアウト調整
- ボタン配置を最適化
- Spaceコンポーネントでグルーピング
- レスポンシブ対応

### Step 5: Props型定義の統合
- `EditorToolbarProps`型を完全定義
- オプショナルPropsの明確化

---

## 📝 実装チェックリスト

### 基本機能
- [ ] ノード追加ボタン（4種類）
- [ ] Undo/Redoボタン
- [ ] 保存ボタン
- [ ] Document編集ボタン
- [ ] バリデーションボタン

### 拡張機能
- [ ] ワークフロー追加ボタン（状態表示付き）
- [ ] Draft管理ボタン
- [ ] 自動保存表示（Switch + 最終保存時刻）
- [ ] ビューモード切替（Radio.Group）

### UI/UX
- [ ] ボタングルーピング（Space）
- [ ] アイコン付きボタン
- [ ] disabled状態の制御
- [ ] loading状態の制御

### 型定義
- [ ] `EditorToolbarProps`の完全定義
- [ ] オプショナルPropsの明示
- [ ] コールバック関数の型定義

---

## 🎨 UI設計

### レイアウト構成
```
┌─────────────────────────────────────────────────────────────┐
│ [Material] [Condition] [Result] [Transition] | [Undo] [Redo] │
│ | [Save] [Document] [Validate] [Workflow] [Drafts]           │
│ | [Auto Save: ON ⚡ Last saved: 08:55] | [Petri Net|Templates] │
└─────────────────────────────────────────────────────────────┘
```

### グルーピング
1. **ノード追加グループ**: Material, Condition, Result, Transition
2. **編集グループ**: Undo, Redo
3. **操作グループ**: Save, Document, Validate, Workflow, Drafts
4. **自動保存グループ**: Switch + 最終保存時刻
5. **ビューモードグループ**: Radio.Group

---

## 🔗 依存関係

### Import対象
```typescript
import {
  Button,
  Space,
  Divider,
  Switch,
  Radio,
  Typography,
  Tooltip,
} from 'antd';

import {
  ExperimentOutlined,
  SettingOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  UndoOutlined,
  RedoOutlined,
  SaveOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  FolderOpenOutlined,
  ShareAltOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';

import type { EditorToolbarProps } from '../types';
```

---

## ⚠️ 注意事項

### 1. オプショナルProps
- ビューモード関連Props（`viewMode`, `onViewModeChange`）はオプショナル
- Draft管理Props（`onOpenDraftManager`）はオプショナル
- 自動保存Props（`autoSaveEnabled`, `onAutoSaveToggle`, `lastAutoSaveTime`）はオプショナル

### 2. 時刻フォーマット
```typescript
const formatLastSaveTime = (timestamp: string | Date | null): string => {
  if (!timestamp) return '';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};
```

### 3. ボタン無効化ロジック
- Undo: `!canUndo`
- Redo: `!canRedo`
- Save: `!canSave`

---

## 📊 期待される成果物

### 実装ファイル
- ✅ `frontend/src/components/editorv2/components/EditorToolbar.tsx`（完全版）

### ドキュメント
- ✅ `docs/V2移植/20260202_0859_Phase5_EditorToolbar実装_完了報告.md`

---

## 🚀 実装開始

次のステップ:
1. 現在のEditorToolbarを読み込み
2. Reference版と比較
3. 不足機能を実装
4. 完了報告書を作成

---

**作成日時**: 2026-02-02 08:58  
**作成者**: Cline  
**承認待ち**: ユーザー確認後開始