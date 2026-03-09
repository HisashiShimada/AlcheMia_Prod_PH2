# タスク計画書: TreeSelect 名前空間テンプレート一覧が表示されない問題の修正

## メタデータ
- **作成日時**: 2026-03-08 00:04
- **タスクID**: TreeSelect_treeDefaultExpandAll_fix
- **優先度**: 高
- **推定工数**: 0.25時間

---

## 1. タスク概要

「テンプレートから名前空間を取り込み」モーダルを開いても、
テンプレートファイルの一覧が表示されない問題を修正する。

API（`GET /api/v1/maiml/formats`）は 200 OK で正しいデータを返しているが、
画面上の `TreeSelect` コンポーネントにはファイルが一切表示されない。

---

## 2. 調査結果

### 症状

- `GET http://localhost:3001/api/v1/maiml/formats` → 200 OK・正しいデータ返却
- モーダル内の「テンプレートファイル:」セレクトボックスが空白のまま

### 調査過程

#### Step 1: API パスの確認

`frontend/src/services/templateApi.ts` を確認。

```typescript
const response = await client.get<{ success: boolean; data: ListFormatsResponse }>(
  '/maiml/formats'  // ← /api/v1 は baseURL に含まれており、パスは正しい
);
```

`createApiClient()` の baseURL:

```typescript
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
```

→ URL 二重付与の問題は既に修正済みであることを確認。

#### Step 2: ネットワーク確認

ブラウザ DevTools で確認:

| 項目 | 結果 |
|------|------|
| リクエスト URL | `http://localhost:3001/api/v1/maiml/formats` |
| ステータスコード | 200 |

→ API は正常に動作している。

#### Step 3: フロントエンドのデータフロー確認

`TemplateEditorDialog.tsx` の `handleOpenNamespaceImport`:

```typescript
const result = await fetchTemplateFiles();
setFormatsResponse(result);
// result = { departments: [{ departmentCd: 'DEP004', folders: [...] }] }
```

→ データは正しく `formatsResponse` にセットされている。

#### Step 4: TreeSelect の treeData 確認

```tsx
treeData={formatsResponse.departments.flatMap(dept =>
  dept.folders.map(folder => ({
    title: `${dept.departmentCd} / ${folder.folderName}`,
    value: `${dept.departmentCd}/${folder.folderName}`,
    selectable: false,  // 親ノードは選択不可
    children: folder.files.map(file => ({
      title: file.fileName,
      value: file.key,
      isLeaf: true,
    })),
  }))
)}
```

生成される `treeData`（DEP004 の場合）:

```
[
  { title: "DEP004 / condition", selectable: false, children: [condition.xml, test(14).xml] },
  { title: "DEP004 / material", selectable: false, children: [...10件...] },
  { title: "DEP004 / result", selectable: false, children: [contentTEST.xml, result.xml] },
]
```

**treeData は正しく構築されている。**

### 根本原因

```tsx
<TreeSelect
  treeDefaultExpandAll={false}  // ← ここが問題！
```

`treeDefaultExpandAll={false}` により、**全ノードが折り畳まれた状態で表示**される。

- 親ノード（`DEP004 / condition` 等）は `selectable: false` のため選択不可
- 子ノード（ファイル）は折り畳まれていて見えない
- ユーザーには「何も選べない空のリスト」に見える

※ 手動でノードを展開（クリック）すればファイルは表示されるが、
　 UI 上に「展開できる」ことが伝わりにくい。

### バグの影響フロー

```
API 呼び出し → 200 OK → formatsResponse にデータセット
  ↓
TreeSelect に treeData を渡す（正しく生成）
  ↓
treeDefaultExpandAll={false} → 全ノード折り畳み
  ↓
親ノードは selectable: false で選択不可
  ↓
子ノード（ファイル）が見えない → 「一覧が表示されない」
```

---

## 3. 修正内容

### 変更ファイル

1. `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`

### 修正箇所

```tsx
// 修正前
treeDefaultExpandAll={false}

// 修正後
treeDefaultExpandAll={true}
```

### 修正後の表示イメージ

```
▼ DEP004 / condition  （展開済み・選択不可）
   ● condition.xml       ← 選択可能
   ● test (14).xml       ← 選択可能
▼ DEP004 / material   （展開済み・選択不可）
   ● disp.xml            ← 選択可能
   ● test.xml            ← 選択可能
   ...
▼ DEP004 / result     （展開済み・選択不可）
   ● contentTEST.xml     ← 選択可能
   ● result.xml          ← 選択可能
```

---

## 4. 実装ステップ

- [x] Phase 1: 調査・PLAN.md 作成（本ファイル）
- [x] Phase 2: `TemplateEditorDialog.tsx` の `treeDefaultExpandAll` を `true` に変更

---

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` - `treeDefaultExpandAll` を `true` に変更（1行のみ）

### 影響を受ける機能
- 「テンプレートから名前空間を取り込み」モーダルのファイル選択 TreeSelect

### 影響なし
- バックエンド（変更なし）
- 他のフロントエンドファイル（変更なし）

---

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 部門やフォルダが大量の場合に展開が重い | 低 | 低 | 現状は DEP004 の 3 フォルダのみのため問題なし |

---

## 7. テスト計画

### 手動テスト
- [ ] 「テンプレートから取り込み」ボタンをクリックしモーダルを表示
- [ ] TreeSelect ドロップダウンを開いたとき、フォルダが展開状態でファイルが選択できることを確認
- [ ] ファイルを選択後、プレビューが表示されることを確認

---

## 8. 承認記録

- **計画書提示日時**: 2026-03-08 00:04
- **承認日時**: 2026-03-08 00:04
- **承認者コメント**: 実装作業はなるべく細かく分けて実行すること
