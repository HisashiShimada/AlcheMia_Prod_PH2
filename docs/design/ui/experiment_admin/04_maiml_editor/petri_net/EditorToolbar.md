# EditorToolbar UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

PetriNetEditorの編集ツールバーコンポーネント。ノード追加、元に戻す/やり直し、保存、バリデーション、ドキュメント編集などの編集操作を提供します。

### 1.2. 使用場面

- PetriNetEditor内で常に表示
- 編集操作のメインインターフェース

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌──────────────────────────────────────────────────────────────┐
│ [Material] [Condition] [Result] [Transition] | [選択] [ワークフロー] │
│ | [元に戻す] [やり直し] | [保存] [Document] [バリデーション] │
│ [Draft管理] | 自動保存: [ON/OFF] 最終保存: HH:MM:SS         │
└──────────────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ノード追加ボタン群

| ボタン | アイコン | 機能 |
|-------|---------|------|
| Material | Circle | Material Placeを追加 |
| Condition | Square | Condition Placeを追加 |
| Result | Pentagon | Result Placeを追加 |
| Transition | ArrowRightLeft | Transitionを追加 |

**スタイル:**
- Button size="small"
- Tooltip付き

#### 2.2.2. ツール選択ボタン

| ボタン | 機能 | 状態 |
|-------|------|------|
| 選択 | 選択モード | selectedTool === 'select' |
| ワークフロー追加 | サブネット追加モード | selectedTool === 'workflow' |

**スタイル:**
- Button size="small"
- type="primary"（選択時）/ type="default"（非選択時）

#### 2.2.3. 編集操作ボタン

| ボタン | アイコン | 機能 | 有効条件 |
|-------|---------|------|---------|
| 元に戻す | Undo | Undo | canUndo === true |
| やり直し | Redo | Redo | canRedo === true |

**スタイル:**
- Button size="small", disabled（無効時）

#### 2.2.4. ファイル操作ボタン

| ボタン | アイコン | 機能 |
|-------|---------|------|
| 保存 | Save | 保存処理 |
| Document | FileText | ドキュメント編集 |
| バリデーション | CheckCircle | バリデーション実行 |
| Draft管理 | FolderOpen | ドラフト管理ダイアログ |

**スタイル:**
- Button size="small"
- 保存ボタン: type="primary"

#### 2.2.5. 自動保存設定

| 要素 | 機能 |
|------|------|
| Switch | 自動保存ON/OFF切替 |
| Typography.Text | 最終保存時刻表示 |

**表示:**
- 自動保存: ON/OFF
- 最終保存: HH:MM:SS（lastAutoSaveTimeが存在する場合）

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. ノード追加

**処理フロー:**
1. ノード追加ボタンをクリック
2. onAddNode(nodeType)を実行
3. PetriNetEditor側で新しいノードを追加

**ノードタイプ:**
- 'material': Material Place
- 'condition': Condition Place
- 'result': Result Place
- 'transition': Transition

#### 3.1.2. ツール選択

**処理フロー:**
1. ツール選択ボタンをクリック
2. onToolChange(tool)を実行
3. selectedToolステートを更新

**ツール種別:**
- 'select': 選択モード（ノード・エッジの選択・編集）
- 'workflow': ワークフロー追加モード（サブネット追加）

#### 3.1.3. 元に戻す・やり直し

**元に戻す:**
1. 元に戻すボタンをクリック
2. onUndo()を実行
3. canUndo === trueの場合のみ有効

**やり直し:**
1. やり直しボタンをクリック
2. onRedo()を実行
3. canRedo === trueの場合のみ有効

#### 3.1.4. 保存処理

**処理フロー:**
1. 保存ボタンをクリック
2. onSave()を実行
3. PetriNetEditor側で保存処理

#### 3.1.5. ドキュメント編集

**処理フロー:**
1. Documentボタンをクリック
2. onEditDocument()を実行
3. DocumentEditDialogを表示

#### 3.1.6. バリデーション

**処理フロー:**
1. バリデーションボタンをクリック
2. onValidate()を実行
3. ValidationPanelを表示

#### 3.1.7. ドラフト管理

**処理フロー:**
1. Draft管理ボタンをクリック
2. onOpenDraftManager()を実行（存在する場合）
3. DraftManagerダイアログを表示

#### 3.1.8. 自動保存設定

**処理フロー:**
1. Switchをトグル
2. onToggleAutoSave()を実行（存在する場合）
3. autoSaveEnabledステートを更新
4. ON時: 30秒ごとに自動保存
5. lastAutoSaveTimeに保存時刻を記録

**時刻フォーマット:**
- HH:MM:SS形式（24時間表記）
- 例: "14:30:45"

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| Materialボタン | Material Place追加 | onAddNode('material') |
| Conditionボタン | Condition Place追加 | onAddNode('condition') |
| Resultボタン | Result Place追加 | onAddNode('result') |
| Transitionボタン | Transition追加 | onAddNode('transition') |
| 選択ボタン | 選択モード | onToolChange('select') |
| ワークフローボタン | ワークフロー追加モード | onToolChange('workflow') |
| 元に戻すボタン | Undo | onUndo() |
| やり直しボタン | Redo | onRedo() |
| 保存ボタン | 保存 | onSave() |
| Documentボタン | ドキュメント編集 | onEditDocument() |
| バリデーションボタン | バリデーション | onValidate() |
| Draft管理ボタン | Draft管理 | onOpenDraftManager() |
| 自動保存Switch | 自動保存切替 | onToggleAutoSave() |

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface EditorToolbarProps {
  selectedTool: 'select' | 'workflow';           // 選択されたツール
  onToolChange: (tool: 'select' | 'workflow') => void;  // ツール変更
  onAddNode: (nodeType: string) => void;         // ノード追加
  onUndo: () => void;                            // Undo
  onRedo: () => void;                            // Redo
  canUndo: boolean;                              // Undo可能フラグ
  canRedo: boolean;                              // Redo可能フラグ
  onSave: () => void;                            // 保存
  onEditDocument: () => void;                    // Document編集
  onValidate: () => void;                        // バリデーション
  onOpenDraftManager?: () => void;               // Draft管理
  autoSaveEnabled?: boolean;                     // 自動保存有効
  onToggleAutoSave?: () => void;                 // 自動保存トグル
  lastAutoSaveTime?: Date | null;                // 最終自動保存時刻
}
```

---

## 5. UI/UXポリシー準拠

### 5.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Button | 各種ボタン | size="small", type, icon, onClick, disabled |
| Space | レイアウト | size="small", split |
| Tooltip | ボタンのツールチップ | title |
| Switch | 自動保存切替 | checked, onChange |
| Typography.Text | 最終保存時刻 | type="secondary" |
| Divider | セクション区切り | type="vertical" |

### 5.2. Lucide Reactアイコン使用

- Circle, Square, Pentagon, ArrowRightLeft
- Undo, Redo, Save, FileText, CheckCircle, Network, FolderOpen

**サイズ:** 16px

---

## 6. 実装ファイル

### 6.1. ソースファイルパス

```
frontend/src/components/editor/EditorToolbar.tsx
```

### 6.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| PetriNetEditor | ./PetriNetEditor | 親コンポーネント |

### 6.3. 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| antd | 6.x | UIコンポーネント |
| lucide-react | - | アイコン |

---

## 7. 既知の課題・TODO

- [ ] キーボードショートカットの視覚的表示
- [ ] ツールバーのカスタマイズ機能
- [ ] ボタンのグループ化・折りたたみ機能（モバイル対応）

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2025-12-23 | Ant Design v6対応 | Development Team |
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

---

## 9. スタイリング

### 9.1. コンテナスタイル

```typescript
{
  padding: '8px',
  borderBottom: '1px solid #f0f0f0',
  backgroundColor: '#ffffff',
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  alignItems: 'center',
}
```

### 9.2. レスポンシブ対応

- flexWrapで自動折り返し
- 最小幅: 800px推奨

---

## 10. アクセシビリティ

### 10.1. キーボードショートカット

- Ctrl/Cmd + Z: 元に戻す
- Ctrl/Cmd + Shift + Z: やり直し
- Ctrl/Cmd + S: 保存

（PetriNetEditor側で実装）

### 10.2. ツールチップ

- すべてのボタンにツールチップを設定
- 操作内容を明確に説明
