# タスク計画書: InstructionFlowDialog API化

## メタデータ
- **作成日時**: 2026-03-02 16:14
- **タスクID**: InstructionFlowDialog_API化
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`InstructionFlowDialog` コンポーネントが現在モックデータ（`/data/mock/test_omori11.maiml`）からMAIMLファイルを取得してフロー図を表示している。これを実際のAPIを使って、選択されたプロジェクト・メソッドのMAIMLファイルを取得し、フロー図を表示するように修正する。

---

## 調査結果

### 現状の問題箇所

#### ① `InstructionConfirmationTab.tsx` - `handleOpenFlowDiagram` 関数
```typescript
// 問題: ファイルデータがハードコードされている
const handleOpenFlowDiagram = () => {
  const fileData: FileData = {
    id: 'test_omori11',
    name: 'test_omori11.maiml',
    path: '/data/mock/test_omori11.maiml',
    size: 0,
    lastModified: new Date().toISOString(),
    type: 'maiml',
  };
  // ...
};
```

#### ② `InstructionFlowDialog.tsx` - `loadFileContent` 関数
```typescript
// 問題: モックファイルをfetchしている
const loadFileContent = async (file: FileData): Promise<string | null> => {
  if (file.type === 'maiml') {
    const response = await fetch('/data/mock/test_omori11.maiml');
    const content = await response.text();
    return content;
  }
  return null;
};
```

### 利用可能なAPIエンドポイント

`projectApiService.ts` に以下の関数が存在する：

```typescript
// GET /api/v1/projects/:projectName/maiml
// MAIMLコンテンツを返す
export const getProjectMaiml = async (
  projectName: string
): Promise<ApiResponse<ProjectMaimlResponse>> => { ... };

// レスポンス型
export interface ProjectMaimlResponse {
  maimlContent: string;
  projectName: string;
  lastModified?: string;
}
```

### ViewRendererとPetriNetViewerの確認

- `ViewRenderer` は `selectedMethodId` を `PetriNetViewer` に渡す仕組みがすでに実装済み
- `InstructionFlowDialog` から `ViewRenderer` に `selectedMethodId` を渡している（既存の実装）
- ただし、`ViewRenderer` 内の `PetriNetViewer` に `selectedMethodId` が渡されているのは `isMultiMethod && !hideMethodTabs` のケースのみ
  - `hideMethodTabs: true` の場合（指示確認タブ）は `selectedMethodId` が渡されていない

---

## 目的と期待される成果

### 目的
- モックデータ依存を解消し、実際のプロジェクトのMAIMLファイルをAPIから取得してフロー図を表示する
- 選択されたメソッドのフロー図のみを表示する

### 期待される成果
- [ ] フロー図ボタン押下時に `GET /api/v1/projects/:projectName/maiml` を呼び出す
- [ ] APIから取得したMAIMLコンテンツでフロー図を表示する
- [ ] 選択されたメソッド（`selectedMethodId`）に対応したフロー図を表示する
- [ ] ローディング状態が適切に表示される
- [ ] APIエラー時に適切なエラーメッセージが表示される

---

## 実装ステップ

### Phase 1: タスク計画書の作成（本ファイル）
- [x] 調査結果をまとめる
- [x] 修正方針を策定する

### Phase 2: `InstructionFlowDialog.tsx` の修正
- [x] `FileData` インターフェースに `content?: string` フィールドを追加
- [x] `loadFileContent` 関数を修正
  - `file.content` が存在する場合はそれをそのまま返す
  - `file.content` がない場合は従来のモックfetchにフォールバック

### Phase 3: `ViewRenderer.tsx` の修正
- [x] `hideMethodTabs: true` の場合でも `selectedMethodId` を `PetriNetViewer` に渡すよう修正
  - Props定義に `selectedMethodId?: string | null` を追加
  - コンポーネント引数のデストラクチャリングに追加
  - 単一メソッド表示ケースで `selectedMethodId` を `PetriNetViewer` に渡すよう修正

### Phase 4: `InstructionConfirmationTab.tsx` の修正
- [x] `flowDiagramLoading` state を追加
- [x] `handleOpenFlowDiagram` を非同期関数に変更
- [x] `getProjectMaiml(selectedProjectName)` を呼び出してMAIMLコンテンツを取得
- [x] 取得したコンテンツを `FileData.content` に格納してダイアログに渡す
- [x] ローディング状態を追加（API呼び出し中の表示）
- [x] APIエラー時の処理を追加
- [x] フロー図ボタンに `loading` および `disabled` プロップを追加
- [x] `InstructionFlowDialog` に `selectedMethodId` を渡すように（既存の実装をそのまま活用）
- [x] `ViewRenderer` に `selectedMethodId` プロップを渡す修正（InstructionFlowDialog経由）

---

## 変更するファイル

1. `frontend/src/components/ExperimentWorker/InstructionFlowDialog.tsx`
   - `FileData` インターフェースに `content?: string` を追加
   - `loadFileContent` 関数を修正（APIコンテンツ優先）

2. `frontend/src/components/viewer/ViewRenderer.tsx`
   - `hideMethodTabs: true` 時も `selectedMethodId` を `PetriNetViewer` に渡す修正

3. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`
   - `handleOpenFlowDiagram` をAPI呼び出しに変更

---

## 修正後のデータフロー

```
1. ユーザーが「フロー図」ボタンをクリック
   ↓
2. InstructionConfirmationTab: handleOpenFlowDiagram() 実行
   ↓
3. getProjectMaiml(selectedProjectName) 呼び出し
   API: GET /api/v1/projects/:projectName/maiml
   ↓
4. APIレスポンス: { maimlContent: string, projectName: string, lastModified?: string }
   ↓
5. FileData { content: maimlContent, type: 'maiml' } として InstructionFlowDialog に渡す
   ↓
6. InstructionFlowDialog: file.content を直接使用（fetchなし）
   setFileContent(file.content)
   ↓
7. ViewRenderer に fileContent + selectedMethodId を渡す
   ↓
8. PetriNetViewer: selectedMethodId に対応したPetri Netを表示
```

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| APIエラー | 中 | 低 | message.error でユーザーに通知 |
| プロジェクト未選択時の呼び出し | 低 | 低 | selectedProjectName チェックで早期リターン |
| 後方互換性の破損 | 低 | 低 | file.content がない場合はモックにフォールバック |

---

## テスト計画

### 手動テスト
- [ ] プロジェクト選択 → メソッド選択 → フロー図ボタンで正しいMAIMLが表示される
- [ ] 複数メソッドがある場合、選択したメソッドのフロー図が表示される
- [ ] APIエラー時にエラーメッセージが表示される
- [ ] フロー図ダイアログがドラッグ・リサイズできる

---

## 承認記録
- **計画書提示日時**: 2026-03-02 16:14
- **承認日時**: 2026-03-02 16:14
- **承認者コメント**: 計画承認済み

---

## 実施記録

### 実施日時
開始: 2026-03-02 16:14
完了: 2026-03-02 16:18

### 計画からの変更点
- `InstructionFlowDialog.tsx` に `selectedMethodId` を `ViewRenderer` に渡す修正を追加（計画外だったが必要な変更）

### 最終的な成果物
- [x] InstructionFlowDialog.tsx 修正完了
  - `FileData` に `content?: string` フィールド追加
  - `loadFileContent` を `file.content` 優先に修正（モックへのフォールバック付き）
  - `ViewRenderer` に `selectedMethodId` プロップを追加
- [x] ViewRenderer.tsx 修正完了
  - Props定義に `selectedMethodId?: string | null` を追加
  - 単一メソッド表示ケース（hideMethodTabs時）でも `PetriNetViewer` に `selectedMethodId` を渡すよう修正
- [x] InstructionConfirmationTab.tsx 修正完了
  - `getProjectMaiml` インポート追加
  - `flowDiagramLoading` state 追加
  - `handleOpenFlowDiagram` を非同期化してAPI呼び出しに変更
  - フロー図ボタンに `loading` / `disabled` プロップ追加
