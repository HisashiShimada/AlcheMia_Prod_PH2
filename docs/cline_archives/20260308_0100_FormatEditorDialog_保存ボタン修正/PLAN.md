# タスク計画書: FormatEditorDialog 保存ボタン修正

## メタデータ
- **作成日時**: 2026-03-08 01:00
- **タスクID**: FormatEditorDialog_保存ボタン修正
- **優先度**: 高
- **推定工数**: 1時間

---

## 1. タスク概要

フォーマット管理画面（FormatManagement）でXMLファイルを編集するダイアログ（FormatEditorDialog）において、「テンプレートから取り込み」でプロパティを取り込んだ後、「保存」ボタンを押しても何も起きない（ダイアログが閉じない、APIも呼ばれない）バグを修正する。

また、ダイアログを閉じて再度開くと取り込み前の内容に戻る問題も解消する。

---

## 2. 調査結果

### 2.1 問題の再現手順

1. フォーマット管理画面でXMLファイルを編集ボタンで開く
2. ダイアログ内の「テンプレートから取り込み」ボタンを押下
3. ファイルを選択し、「取り込む」でプロパティを取り込む
4. プロパティが表示されていることを確認
5. 「保存」ボタンを押下 → **何も起きない（ダイアログが閉じない、APIが呼ばれない）**
6. ×ボタンでダイアログを閉じる
7. 再度同じファイルを開く → **取り込み前の内容に戻っている**

### 2.2 原因の特定

#### 根本原因①：`templateId` 空チェックによる早期 return

`FormatEditorDialog.tsx` の `handleSave` 関数：

```tsx
const handleSave = () => {
  if (!templateId.trim()) {          // ← templateId が空文字になっている
    message.error('テンプレートIDを入力してください');
    return;                          // ← ここで処理中断！onSave も onClose も呼ばれない
  }
  // ...以下の保存処理に到達しない
  onSave(...);
  onClose();
};
```

#### 根本原因②：`useEffect` の再実行による `templateId` リセット

`FormatEditorDialog.tsx` の `useEffect`：

```tsx
useEffect(() => {
  if (open && node) {
    if ('parsedProperties' in node.data || ...) {
      const defaultId = `${node.data.placeType}_template_${Date.now()}`;
      setTemplateId(defaultId);   // ← 初期化
      // ...
      return;
    }
  }
}, [open, node, mergedTemplate]);  // ← node が依存配列に含まれる
```

**問題点**: `FormatManagement.tsx` では `FormatEditorDialog` に渡す `tempNode` が即時関数内で毎回新しいオブジェクトとして生成される。

```tsx
// FormatManagement.tsx
{showTemplateEditor && editingXmlFile && (() => {
  const tempNode = {         // ← render のたびに新しいオブジェクト参照
    id: tempId,
    data: { ... }
  };
  return <FormatEditorDialog node={tempNode} ... />;
})()}
```

ダイアログ内で `setHasChanges(true)` や `setProperties(...)` などの State 更新が発生すると、`FormatEditorDialog` が再レンダリングされる。この際、React は `node` の参照が変わったと判定し、`useEffect` を再実行して `templateId` を新しい値にリセットする可能性がある。

#### 根本原因③：`onSave` が async だが `await` されていない

```tsx
// FormatEditorDialog.tsx
const handleSave = () => {    // async でない
  onSave(...);                // async な関数を await なしで呼び出し
  onClose();                  // API 完了前にダイアログを閉じようとする
};
```

`FormatManagement.tsx` の `onSave` は `async` 関数で、内部で `await updateFormatFileContent(...)` を実行しているが、呼び出し側で `await` していないため、エラー処理が適切に行われない可能性がある。

ただし、`onSave` 内で `setShowTemplateEditor(false)` を呼び出しており、正常完了した場合はそちらでダイアログが閉じる設計。

### 2.3 影響範囲

- **`FormatEditorDialog.tsx`** のみ修正
- `TemplateEditorDialog.tsx`（PetriNetEditor用）は別コンポーネントのため影響なし
- `FormatManagement.tsx` の修正は不要（但し補足修正あり）

---

## 3. 修正方針

### 修正①：`handleSave` の `templateId` チェックを修正（最重要）

フォーマット管理画面では `templateId` 入力フィールドが非表示のため、ユーザーが入力できない。`templateId` が空の場合は自動生成して処理を続行するよう修正する。

**修正前:**
```tsx
const handleSave = () => {
  if (!templateId.trim()) {
    message.error('テンプレートIDを入力してください');
    return;  // ← 問題の箇所
  }
  ...
};
```

**修正後:**
```tsx
const handleSave = () => {
  // templateId が空の場合は自動生成（フォーマット管理画面ではUIが非表示のため）
  const effectiveTemplateId = templateId.trim() || 
    `${node.data.placeType}_template_${Date.now()}`;
  
  const convertedProperties = convertPropertyDataToPropertiesArray(properties);
  const convertedContents = convertPropertyDataToContentsArray(contents);
  
  onSave(
    node.id,
    convertedProperties,
    convertedContents,
    effectiveTemplateId,
    name,
    description,
    nodeCategory
  );
  
  setHasChanges(false);
  // 注意: onClose() は onSave の中（FormatManagement の onSave ハンドラ）で呼ばれるため不要
};
```

### 修正②：`useEffect` の安定化（`templateId` の再初期化防止）

`isInitialized` フラグを使って、ダイアログが開いている間は `useEffect` が余分に再実行されないようにする。

```tsx
const [isInitialized, setIsInitialized] = useState(false);

useEffect(() => {
  if (open && node) {
    if (isInitialized) return;  // ← 既に初期化済みの場合はスキップ
    
    // ... 初期化処理 ...
    
    setIsInitialized(true);
  }
  
  if (!open) {
    setIsInitialized(false);  // ← ダイアログが閉じたらリセット
  }
}, [open, node, mergedTemplate]);
```

---

## 4. 実装ステップ

### Step 1: タスク計画書の作成（本ファイル）
- [x] 調査結果の記録
- [x] 修正方針の策定
- [x] 実装ステップの定義

### Step 2: `FormatEditorDialog.tsx` の修正①（templateId チェック修正）
- [ ] `handleSave` 関数の `templateId` 空チェックロジックを修正
- [ ] `effectiveTemplateId` を使って `onSave` を呼び出すよう変更

### Step 3: `FormatEditorDialog.tsx` の修正②（useEffect 安定化）
- [ ] `isInitialized` 状態変数の追加
- [ ] `useEffect` にガード条件を追加

### Step 4: 動作確認
- [ ] ダイアログを開く → プロパティが正しく表示される
- [ ] 「テンプレートから取り込み」でプロパティを取り込む
- [ ] 「保存」ボタンを押下 → ダイアログが閉じる
- [ ] 再度ダイアログを開く → 取り込んだプロパティが表示されている

---

## 5. 影響ファイル

### 修正するファイル
1. `frontend/src/components/editorv2/components/FormatEditorDialog.tsx`
   - `handleSave` 関数の修正（templateId チェックロジック）
   - `useEffect` の修正（isInitialized フラグ追加）

### 参照ファイル（修正なし）
- `frontend/src/components/project/FormatManagement.tsx` - onSave ハンドラの実装確認
- `frontend/src/components/editorv2/utils/templateConverter.ts` - 変換処理の確認

---

## 6. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `isInitialized` ガードにより再編集時に初期化されない | 中 | `open` が false になったときに `isInitialized` をリセット |
| `effectiveTemplateId` が保存データに影響 | 低 | `templateId` はフォーマット管理では内部管理のみで表示されないため影響なし |
| 既存テスト（`TemplateEditorDialog.tsx` 用）への影響 | 低 | 別ファイルのため影響なし |

---

## 7. 承認記録
- **計画書提示日時**: 2026-03-08 01:00
- **承認日時**: 2026-03-08 01:00（Act mode 切り替えにより承認）
