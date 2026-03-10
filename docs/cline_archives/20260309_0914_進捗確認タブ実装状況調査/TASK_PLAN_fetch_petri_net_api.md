# タスク計画書: fetchPetriNetStructure APIパス修正

## メタデータ
- **作成日時**: 2026-03-09 14:53
- **タスクID**: fetch_petri_net_api
- **優先度**: 高
- **推定工数**: 1.5時間
- **参照元計画**: `docs/20260309_0914_進捗確認タブ実装状況調査/PLAN.md`

## タスク概要

`frontend/src/utils/apiClient.ts` の `fetchPetriNetStructure()` 関数が現在モックデータを返している（またはバックエンドに存在しない誤ったAPIパスを使用している）問題を修正し、バックエンド実装済みの `POST /api/v1/maiml/parse-petri-net-structure` を正しく呼び出すよう変更する。

合わせて `PetriNetVisualization.tsx` の実APIブランチにある誤ったAPIパスも修正する。

## 目的と期待される成果

- [x] `fetchPetriNetStructure(fileKey)` が実APIを呼び出し、Petri Netの構造データを取得できる
- [x] `PetriNetVisualization.tsx` の実APIブランチ（`shouldUseMockAPI() === false` のとき）が正しいエンドポイントを使用する
- [x] `shouldUseMockAPI()` が `false` を返す現状で、Petri Net図が実データで描画される

## 現状分析

### 問題1: `fetchPetriNetStructure()` がモックデータを返している

**ファイル**: `frontend/src/utils/apiClient.ts`

```typescript
// 現在の実装（モックデータを返す）
export async function fetchPetriNetStructure(fileKey: string): Promise<unknown> {
  await simulateApiDelay();
  // モックデータをダイナミックインポート
  const mockData = await import('@/data/mock/mockPetriNetStructure.json');
  ...
}
```

この関数は、`shouldUseMockAPI()` が `false` の環境でも呼び出されるが、常にモックデータを返す。

### 問題2: `PetriNetVisualization.tsx` の実APIブランチに誤ったパスが存在

**ファイル**: `frontend/src/components/progress/PetriNetVisualization.tsx`

```typescript
// 現在の実装（誤ったAPIパス）
const [structureResponse, progressResponse] = await Promise.all([
  fetch(`/api/worker/petri-net-structure/${encodedFileKey}`),  // ❌ バックエンドに存在しない
  ...
]);
```

実際のバックエンドAPIは `POST /api/v1/maiml/parse-petri-net-structure` で、リクエストボディに `{ content: string }` を必要とする。

### バックエンドAPIの仕様

```
POST /api/v1/maiml/parse-petri-net-structure
Authorization: Cookie (authMiddleware)
Request Body: { content: string }  ← MAIMLファイルの内容（文字列）
Response: { success: boolean, data: PetriNetData }
```

fileKey（S3/Swiftのパス）ではなく、MAIMLコンテンツそのものを送る必要がある。

### fileKeyからcontentを取得するAPI

バックエンドに `GET /api/v1/maiml/file-content?key={fileKey}` が存在する。  
これを使ってfileKeyからMAIMLコンテンツを取得してから、parse-petri-net-structureを呼び出す。

## 実装ステップ

### Phase 1: `apiClient.ts` の `fetchPetriNetStructure()` 修正

- [ ] 現在のモック実装をコメントアウトしてモックブランチとして残す
- [ ] 実APIブランチを追加: `GET /api/v1/maiml/file-content?key={fileKey}` でMAIMLコンテンツを取得
- [ ] 取得したcontentを `POST /api/v1/maiml/parse-petri-net-structure` に送信
- [ ] レスポンスを返す

### Phase 2: `PetriNetVisualization.tsx` の実APIブランチ修正

- [ ] 実APIブランチ（`useMock === false`）の `fetch('/api/worker/petri-net-structure/...')` を削除
- [ ] 代わりに `fetchPetriNetStructureAPI(fileKey)`（apiClientの関数）を呼び出すよう変更
- [ ] 変更後のコードが既存の処理フロー（structureResult処理部分）と整合することを確認

## 変更ファイル

1. `frontend/src/utils/apiClient.ts`
   - `fetchPetriNetStructure()` 関数を実API呼び出しに変更
   
2. `frontend/src/components/progress/PetriNetVisualization.tsx`
   - 実APIブランチのペトリネット構造取得部分を修正（誤ったパスを削除し `fetchPetriNetStructureAPI` に統一）

## 技術的詳細

### `fetchPetriNetStructure()` の新しい実装方針

```typescript
export async function fetchPetriNetStructure(fileKey: string): Promise<unknown> {
  // Step 1: fileKeyからMAIMLコンテンツを取得
  const fileContentResponse = await fetch(
    `${API_BASE_URL}/maiml/file-content?key=${encodeURIComponent(fileKey)}`,
    { credentials: 'include', headers: { 'Content-Type': 'application/json' } }
  );
  if (!fileContentResponse.ok) {
    throw new Error(`MAIMLファイルの取得に失敗しました: ${fileContentResponse.status}`);
  }
  const fileContentData = await fileContentResponse.json();
  const content = fileContentData.data?.content || fileContentData.content;

  // Step 2: contentをparse-petri-net-structureに送信
  const parseResponse = await fetch(
    `${API_BASE_URL}/maiml/parse-petri-net-structure`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }
  );
  if (!parseResponse.ok) {
    throw new Error(`Petri Net構造解析に失敗しました: ${parseResponse.status}`);
  }
  return parseResponse.json();
}
```

### `PetriNetVisualization.tsx` の変更方針

実APIブランチで `fetch('/api/worker/petri-net-structure/...')` を削除し、モックブランチと同様に `fetchPetriNetStructureAPI(fileKey)` を使用する。

## セキュリティ考慮事項

- [ ] `credentials: 'include'` によるCookie認証を両APIリクエストに適用済み
- [ ] fileKeyのエンコードを実施（`encodeURIComponent`）
- [ ] エラーレスポンスを適切にハンドリング

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `file-content` APIのレスポンス形式が想定と異なる | 中 | レスポンスログ確認・フォールバック処理追加 |
| モックブランチとの整合性が崩れる | 低 | モックブランチ（`shouldUseMockAPI() === true`）は現状維持 |
| `PetriNetVisualization.tsx` の修正で他のコードに影響 | 低 | 変更範囲を実APIブランチのみに限定 |

## テスト計画

- [ ] `shouldUseMockAPI()` が `false` の状態で `PetriNetVisualization` が表示される画面を開く
- [ ] ブラウザのDevToolsで `POST /api/v1/maiml/parse-petri-net-structure` が呼び出されていることを確認
- [ ] Petri Net図が正常に表示されることを確認（または適切なエラーが表示されること）
- [ ] モック動作（`shouldUseMockAPI() === true` 相当のテスト）が引き続き機能することを確認

## 承認記録

- **計画書提示日時**: 2026-03-09 14:53
- **承認日時**: 
- **承認者コメント**: 
