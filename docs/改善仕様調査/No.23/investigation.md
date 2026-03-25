# 未保存メッセージ調査レポート

- **調査日時**: 2026-03-25 14:24
- **調査対象**: `frontend/src/` 配下の全 `.tsx` ファイル

---

## 1. 概要

プロジェクト内で「未保存の変更があります」等のメッセージを出している箇所は **4ファイル** に存在する。
それぞれについて「変更検知の仕組み」「問題の有無」を以下に記述する。

---

## 2. 調査箇所一覧

| # | ファイルパス | 変数名 | 表示方法 |
|---|---|---|---|
| 1 | `frontend/src/components/editorv2/PetriNetEditorScreen.tsx` | `hasUnsavedChanges` (state) | インラインDiv |
| 2 | `frontend/src/components/editorv2/components/DocumentEditDialog.tsx` | `hasChanges` (state) | `<Tag color="warning">` |
| 3 | `frontend/src/components/viewer/dialogs/DocumentEditDialog.tsx` | `hasChanges` (state) | `<Alert type="warning">` |
| 4 | `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | **なし**（未保存メッセージなし） | - |

> ※ `DataRecordDialog.tsx` は検索でヒットしたが、未保存メッセージは存在しない。
> ヒットした行はコメント文（`// 純粋なフラットkey-value形式...`）であり表示処理ではない。

---

## 3. 各箇所の詳細調査

---

### 3-1. `PetriNetEditorScreen.tsx`

#### 表示箇所
```tsx
{hasUnsavedChanges && (
  <div style={{ ... color: '#d46b08' }}>
    ● 未保存の変更があります
  </div>
)}
```

#### 変更検知の仕組み

```
hasUnsavedChanges の初期値: false
  ↓ PetriNetEditorInner の onContentChange が呼ばれたとき → true にセット
  ↓ PetriNetEditorInner の onContentSaved が呼ばれたとき  → false にリセット
```

**`onContentChange` が呼ばれるタイミング（PetriNetEditorInner.tsx 内）:**

| 操作 | 呼び出し箇所 |
|---|---|
| ノード追加（ツールバーから） | `handleAddNode` |
| ノード追加（キャンバスクリック） | `handlePaneClick` |
| ノード削除（Deleteキー） | `handleNodesDelete` |
| ノード削除（PropertyPanelから） | `handleDeleteNode` |
| エッジ接続 | `handleConnect` |
| エッジ削除（Deleteキー） | `handleEdgesDelete` |
| エッジ削除（PropertyPanelから） | `handleDeleteEdge` |
| ノードドラッグ移動 | `handleNodeDragStop` |
| ノードプロパティ更新 | `handleUpdateNodeProperty` |
| ノードID変更 | `handleUpdateNodeId` |
| エッジID変更 | `handleUpdateEdgeProperty` |
| テンプレート保存 | `handleSaveTemplate` |
| Document保存（ダイアログ） | `handleSaveDocument` |
| ワークフロー追加 | `handleWorkflowFileSelect` 内（ノード/エッジ追加後） |

**`onContentSaved` が呼ばれるタイミング:**
- S3保存成功後またはローカルダウンロード後（`handleSaveConfirmAction` 内）

#### ⚠️ 問題点の有無

**問題なし（正常）。**

- 初期値は `false` であり、ダイアログオープン直後は表示されない。
- ユーザーによる明示的な操作（ノード追加・移動・削除・接続など）があった場合のみ `true` になる。
- S3保存 / ダウンロード後に `false` にリセットされる。

ただし、**1点注意事項あり:**  
`handleNodeDragStop` は「ドラッグ停止」時に呼ばれるため、ノードを掴んで元の位置に戻してドロップしても `hasUnsavedChanges` が `true` になる。  
これは「座標が変わったかどうか」をチェックしておらず、「ドラッグ操作があった」だけで変更扱いになる。実害は小さいが、厳密には誤検知と言える。

---

### 3-2. `editorv2/components/DocumentEditDialog.tsx`

#### 表示箇所
```tsx
// フッターに表示
{hasChanges && <Tag color="warning">⚠️ 未保存の変更があります</Tag>}

// キャンセル時の確認ダイアログ
Modal.confirm({
  title: '未保存の変更があります',
  content: '変更を破棄しますか？',
  okText: '破棄',
  ...
})
```

#### 変更検知の仕組み

```
hasChanges の初期値: false
  ↓ ダイアログオープン時 → useEffect で false にリセット
  ↓ Form の onValuesChange    → handleFormChange → true にセット
  ↓ MultiObjectEditor の変更   → handleMultiObjectDataChange → true にセット
  ↓ UUID一括生成ボタン          → handleAutoGenerateUUIDs → true にセット
  ↓ 現在時刻設定ボタン          → handleSetCurrentDateTime → true にセット
  ↓ UUID単体生成ボタン          → form.setFieldValue後 → true にセット
  ↓ 保存後（onSave + onClose）  → リセット処理は実装なし（ダイアログが閉じられる）
```

#### ⚠️ 問題点の有無

**問題なし（正常）。**

ダイアログオープン時に `hasChanges = false` にリセットする `useEffect` が実装されているため、
「開いた直後は未保存表示が出ない」という正しい挙動になっている。

```tsx
useEffect(() => {
  if (open && documentData) {
    setHasChanges(false);  // ← ここで確実にリセット
    setValidationErrors([]);
    form.setFieldsValue({ ... });
  }
}, [open, documentData, form]);
```

保存後のリセットは、保存成功後に `onClose()` が呼ばれてダイアログが閉じるため実質問題ない。

---

### 3-3. `viewer/dialogs/DocumentEditDialog.tsx`

#### 表示箇所
```tsx
// ダイアログ内にインラインで表示
{hasChanges && (
  <Alert
    message="未保存の変更があります"
    type="warning"
    showIcon
    closable
  />
)}

// キャンセル時の確認ダイアログ
Modal.confirm({
  title: '未保存の変更',
  content: '変更が保存されていません。破棄しますか？',
  okText: '破棄',
  ...
})
```

#### 変更検知の仕組み

```
hasChanges の初期値: false
  ↓ ダイアログオープン時 → useEffect 内で setTimeout(..., 0) で false にリセット
  ↓ Form の onValuesChange   → handleValuesChange → true にセット
  ↓ Creator / Vendor 選択    → Select の onChange 内 → true にセット
  ↓ 現在時刻設定ボタン        → handleSetCurrentTime → true にセット
  ↓ 保存後（onSave）          → setHasChanges(false) でリセット ✅
```

#### ⚠️ 問題点の有無（要注意）

**潜在的な問題あり。**

ダイアログオープン時のリセット処理が `setTimeout(..., 0)` で遅延されている。

```tsx
useEffect(() => {
  if (open) {
    // フォーム初期化
    form.setFieldsValue({ ... });
    
    // 次のレンダリングサイクルで実行
    setTimeout(() => {
      setHasChanges(false);  // ← setTimeout でラップされている
    }, 0);
  }
}, [open, documentData, form, projectName]);
```

**なぜ問題か:**  
`form.setFieldsValue()` を呼ぶと、Ant Design の Form は `onValuesChange` イベントを発火させる場合がある。  
もし `setFieldsValue` の実行によって `onValuesChange → setHasChanges(true)` が同期的に呼ばれた後、  
`setTimeout` のコールバック（`setHasChanges(false)`）が実行されれば問題ないが、  
`setFieldsValue` が内部的に非同期処理を含む場合、`setTimeout(0)` のリセットが先に走り、  
その後に `onValuesChange` が呼ばれて `hasChanges = true` になってしまうリスクがある。

**実際の Ant Design の挙動:**  
`form.setFieldsValue()` は通常 `onValuesChange` を発火しない（React の `setState` と同様に、
外部からのセットは change イベントを発生させない設計）。  
そのため、現状では誤表示は起きていない可能性が高い。

**しかし、以下のケースで誤検知が発生しうる:**  
```tsx
useEffect(..., [open, documentData, form, projectName]);
```
この `useEffect` は `documentData` が変化するたびにも再実行される。  
ダイアログが開いた状態で `documentData` が親から更新された場合、  
`form.setFieldsValue()` が再実行され、場合によっては `hasChanges = true` のまま  
`setTimeout` のリセットが発火するタイミングがずれる可能性がある。  
ただし通常の使用フロー（ダイアログを開く → 編集 → 保存）ではほぼ問題ない。

---

### 3-4. `ExperimentWorker/DataRecordDialog.tsx`

#### 未保存メッセージの有無

**未保存メッセージは存在しない。**

検索でヒットした行は以下のコメント行であり、表示ロジックではない：

```tsx
// 純粋なフラットkey-value形式（将来的な保存形式変更に備えて残す）:
// data が { key: value, ... } のフラット形式の場合にフォームへ反映する。
```

このコンポーネントはデータ入力フォームではあるが、キャンセルボタンは確認なしに `onClose()` を直接呼ぶ実装になっている。

```tsx
<Button
  key="cancel"
  onClick={onClose}  // ← 確認なしに直接クローズ
>
  キャンセル
</Button>
```

**指摘事項:**  
ユーザーがフォームに入力中にキャンセルを押すと、確認なしにデータが破棄される。  
他の3箇所で実装されているような「未保存の変更があります。破棄しますか？」のような確認ダイアログは実装されていない。  
UXの観点では未保存確認の追加を検討する価値がある。

---

## 4. 問題箇所まとめ

| # | ファイル | 問題 | 重大度 |
|---|---|---|---|
| 1 | `PetriNetEditorScreen.tsx` | ノードをドラッグして元位置に戻しても「未保存」になる | 低（誤検知の一種だが実害小） |
| 2 | `editorv2/components/DocumentEditDialog.tsx` | 問題なし | - |
| 3 | `viewer/dialogs/DocumentEditDialog.tsx` | `setTimeout(0)` によるリセットのタイミング依存（現状では問題なし、稀なケースで誤検知の可能性） | 低 |
| 4 | `ExperimentWorker/DataRecordDialog.tsx` | 未保存メッセージが**ない**（入力途中のキャンセルで確認なしにデータ破棄） | 中（UX課題） |

---

## 5. 各ファイルの変更検知フラグ初期化タイミング比較

| ファイル | フラグ変数 | 開閉時リセット方法 | 保存後リセット |
|---|---|---|---|
| `PetriNetEditorScreen.tsx` | `hasUnsavedChanges` | 初期値 `false`（ページ遷移時のみ生成） | `onContentSaved` コールバック |
| `editorv2/DocumentEditDialog.tsx` | `hasChanges` | `useEffect` で同期的に `false` | ダイアログが閉じるため不要 |
| `viewer/DocumentEditDialog.tsx` | `hasChanges` | `useEffect` + `setTimeout(0)` で `false` | `setHasChanges(false)` 明示実装 |
| `DataRecordDialog.tsx` | **なし** | - | - |

---

## 6. 結論

- **変更なしで誤って「未保存」メッセージが表示される問題は、現状では確認されていない。**
- ただし `PetriNetEditorScreen.tsx` においてノードのドラッグ操作（位置が変わらなくても）で `hasUnsavedChanges = true` になる軽微な誤検知が存在する。
- `DataRecordDialog.tsx` には未保存確認がなく、入力途中のキャンセルでデータが無確認で破棄される UX 課題がある（他の画面では確認ダイアログを実装済み）。
