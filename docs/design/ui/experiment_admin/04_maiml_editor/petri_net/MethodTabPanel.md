# MethodTabPanel UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

MAIMLファイル内の複数Methodを切り替えるタブパネル。Method追加、MethodID編集、Method削除の機能を提供します。

### 1.2. 使用場面

- PetriNetEditor内で複数Methodを管理する場合
- Method間を切り替えて編集する場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌────────────────────────────────────────────────────────┐
│ [Method_A (5)] [Method_B (3)] [Method_C (0)] [+]      │
│      ↑編集 ↑削除   ↑編集 ↑削除   ↑編集 ↑削除          │
└────────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. Methodタブ

**各タブの構成:**
- MethodID（編集可能）
- ノード数のバッジ（リアルタイム更新）
- 編集ボタン（Edit2アイコン）
- 削除ボタン（Xアイコン）

**表示例:**
```
[Method_A (5) ✎ ✕]
```

#### 2.2.2. Method追加ボタン

| 要素 | アイコン | 機能 |
|------|---------|------|
| + ボタン | Plus | 新しいMethodを追加 |

**スタイル:**
- タブと同じ高さ
- Plusアイコン（16px）

#### 2.2.3. MethodID編集ダイアログ

**Modal構成:**
- タイトル: 「Method IDの編集」
- Input: 新しいMethodID入力
- バリデーション: 重複チェック、空白チェック
- ボタン: 「キャンセル」「保存」

**エラーメッセージ:**
- 「Method IDは必須です」
- 「このMethod IDは既に使用されています」

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. タブ切り替え

**処理フロー:**
1. タブをクリック
2. activeKeyを取得（Methodのindex）
3. onChange(index)を実行
4. PetriNetEditor側でMethodを切り替え

#### 3.1.2. Method追加

**処理フロー:**
1. +ボタンをクリック
2. onAddMethod()を実行
3. PetriNetEditor側で新しいMethodを作成
4. デフォルトMethodID: `Method_{count+1}`
5. 新しいタブが追加され、自動的にアクティブ化

#### 3.1.3. MethodID編集

**処理フロー:**
1. 編集ボタン（Edit2）をクリック
2. イベント伝播を停止（タブ切り替えを防止）
3. MethodID編集ダイアログを表示
4. 現在のMethodIDを初期値として設定
5. 新しいMethodIDを入力
6. バリデーション実行
7. OKの場合: onEditMethodId(index, newMethodId)を実行
8. Cancelの場合: ダイアログを閉じる

**バリデーションルール:**
- 必須: MethodIDは空白不可
- ユニーク: 他のMethodと重複不可
- フォーマット: 英数字とアンダースコアのみ推奨

#### 3.1.4. Method削除

**処理フロー:**
1. 削除ボタン（X）をクリック
2. イベント伝播を停止（タブ切り替えを防止）
3. 確認ダイアログを表示
4. OKの場合: onDeleteMethod(index)を実行
5. Cancelの場合: ダイアログを閉じる
6. 最後のMethodは削除不可（最低1つ必要）

**確認メッセージ:**
```
このMethodを削除しますか？
削除すると、このMethodのすべてのノードとエッジが失われます。
```

#### 3.1.5. ノード数バッジのリアルタイム更新

**処理フロー:**
1. PetriNetEditorでノードが追加/削除される
2. currentNodesが更新される
3. アクティブなタブのバッジが自動更新
4. 非アクティブなタブは、methods[index].nodes.lengthを使用

**表示形式:**
- Tag component
- color="default"
- サイズ: small

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| タブクリック | Method切り替え | onChange(index) |
| +ボタンクリック | Method追加 | onAddMethod() |
| 編集ボタンクリック | MethodID編集ダイアログ表示 | Modal表示 |
| 削除ボタンクリック | Method削除確認 | Modal表示 |
| MethodID保存 | MethodID更新 | onEditMethodId() |
| Method削除確認 | Method削除 | onDeleteMethod() |

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface MethodTabPanelProps {
  methods: Method[];                                  // Method配列
  activeMethodIndex: number;                          // アクティブなMethodのindex
  currentNodes: Node[];                               // 現在編集中のノード配列
  onChange: (index: number) => void;                  // タブ切り替え
  onAddMethod: () => void;                            // Method追加
  onEditMethodId: (index: number, newMethodId: string) => void;  // MethodID編集
  onDeleteMethod: (index: number) => void;            // Method削除
}
```

### 4.2. Method型定義

```typescript
interface Method {
  methodId: string;      // Method ID
  name?: string;         // Method名（オプション）
  nodes: Node[];         // ノード配列
}
```

### 4.3. State型定義

```typescript
interface State {
  editDialogOpen: boolean;           // 編集ダイアログ表示フラグ
  editingMethodIndex: number | null; // 編集中のMethodのindex
  newMethodId: string;               // 新しいMethodID
  idError: string;                   // バリデーションエラーメッセージ
}
```

---

## 5. UI/UXポリシー準拠

### 5.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Tabs | タブコンテナ | activeKey, onChange, type="card" |
| Tag | ノード数バッジ | color="default" |
| Button | 編集・削除・追加ボタン | type, size="small", icon, onClick |
| Tooltip | ボタンのツールチップ | title |
| Modal | 編集・削除確認ダイアログ | open, title, onOk, onCancel |
| Input | MethodID入力 | value, onChange |
| Space | ボタングループ | size="small" |

### 5.2. Lucide Reactアイコン使用

- Plus: Method追加ボタン
- Edit2: MethodID編集ボタン
- X: Method削除ボタン

**サイズ:** 16px

---

## 6. 実装ファイル

### 6.1. ソースファイルパス

```
frontend/src/components/editor/MethodTabPanel.tsx
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
| reactflow | 11.11.4 | Node型定義 |

---

## 7. 既知の課題・TODO

- [ ] タブのドラッグ&ドロップ並び替え
- [ ] タブのコンテキストメニュー（右クリック）
- [ ] Method複製機能
- [ ] タブの表示順序のカスタマイズ

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2025-12-23 | Ant Design v6対応 | Development Team |
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

---

## 9. スタイリング

### 9.1. タブコンテナ

```typescript
{
  borderBottom: '1px solid #f0f0f0',
  backgroundColor: '#ffffff',
}
```

### 9.2. タブラベル

```typescript
{
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
}
```

### 9.3. レスポンシブ対応

- タブが多い場合、スクロール表示
- モバイル: タブを折りたたみ可能

---

## 10. 使用例

```typescript
<MethodTabPanel
  methods={methods}
  activeMethodIndex={activeMethodIndex}
  currentNodes={nodes}
  onChange={handleMethodChange}
  onAddMethod={handleAddMethod}
  onEditMethodId={handleEditMethodId}
  onDeleteMethod={handleDeleteMethod}
/>
```

---

## 11. パフォーマンス最適化

### 11.1. メモ化

- React.memo()でコンポーネントをメモ化
- 不要な再レンダリングを防止

### 11.2. バッジ更新の最適化

- アクティブなタブのみcurrentNodesを使用
- 非アクティブなタブはmethods[index].nodes.lengthを使用
- 不必要な計算を回避

---

## 12. アクセシビリティ

### 12.1. キーボード操作

- Tab: タブ間のフォーカス移動
- Enter/Space: タブ切り替え
- Shift+Tab: 逆方向のフォーカス移動

### 12.2. ARIA属性

- role="tablist"
- aria-label="Methods"
- aria-selected

---

## 13. バリデーション

### 13.1. MethodID編集時のバリデーション

```typescript
// 空白チェック
if (!newMethodId.trim()) {
  return 'Method IDは必須です';
}

// 重複チェック
if (methods.some((m, i) => i !== editingMethodIndex && m.methodId === newMethodId)) {
  return 'このMethod IDは既に使用されています';
}

// フォーマットチェック（推奨）
if (!/^[a-zA-Z0-9_]+$/.test(newMethodId)) {
  return 'Method IDは英数字とアンダースコアのみ使用できます';
}
```

### 13.2. Method削除時のバリデーション

```typescript
// 最後のMethodは削除不可
if (methods.length === 1) {
  message.error('最後のMethodは削除できません');
  return;
}
```

---

## 14. エラーハンドリング

### 14.1. MethodID編集エラー

- バリデーションエラー: 入力フィールド下にエラーメッセージ表示
- 更新失敗: message.error()で通知

### 14.2. Method削除エラー

- 削除失敗: message.error()で通知
- 最後のMethod削除試行: message.warning()で通知
