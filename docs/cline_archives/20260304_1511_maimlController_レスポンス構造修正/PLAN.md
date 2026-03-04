# タスク計画書: maimlController レスポンス構造修正

## メタデータ
- **作成日時**: 2026-03-04 15:11
- **タスクID**: maimlController_response_structure_fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`backend/src/controllers/maimlController.ts` において、S3/Swiftファイル操作系の3つのコントローラー関数（`listFiles`・`getFileContent`・`autoCorrect`）が返すレスポンスの構造が、フロントエンドの期待する `ApiResponse<T>` 型と不一致であったバグを修正した。

---

## 問題の原因

### 根本原因: スプレッド演算子 `...result` によるレスポンス構造の崩れ

バックエンドの3つのコントローラー関数が `...result`（オブジェクトスプレッド）を使ってレスポンスを返していたため、データプロパティがトップレベルに展開されてしまっていた。

#### バグのある実装（修正前）

```typescript
res.json({
  success: true,
  ...result,    // ← result の中身が直接展開される
  meta: { timestamp: new Date().toISOString() },
});
```

#### 実際に返っていたJSONの構造

```json
{
  "success": true,
  "files": [...],          // トップレベルに展開されている
  "hierarchicalData": [],
  "totalCount": 10,
  "organizationId": "xxx",
  "cached": false,
  "meta": { "timestamp": "2026-03-04T06:11:00.000Z" }
}
```

### フロントエンドが期待していた構造

`maimlApiService.ts` は `ApiResponse<T>` 型でレスポンスを扱っており、データは `data` プロパティの中に入ることを期待している。

```typescript
// maimlApiService.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;    // ← この data プロパティにデータが入ることを期待
  error?: { code: string; message: string; };
  meta: { timestamp: string; requestId: string; };
}
```

#### フロントエンドが期待していたJSONの構造

```json
{
  "success": true,
  "data": {               // data プロパティの中にデータが入るべき
    "files": [...],
    "hierarchicalData": [],
    "totalCount": 10,
    ...
  },
  "meta": { "timestamp": "2026-03-04T06:11:00.000Z" }
}
```

### 影響箇所

`data` プロパティが常に `undefined` になるため、`PetriNetEditorInner.tsx`（1141行目付近）の以下のチェックで常にエラーが発生し、ワークフロー追加ダイアログのファイル一覧が取得できない状態だった。

```typescript
// PetriNetEditorInner.tsx（openWorkflowDialogInternal）
const response = await maimlService.listStorageFiles(currentOrgId);

if (!response.success || !response.data) {
  // ↑ response.data が常に undefined のため、常にこちらに入ってエラーになっていた
  throw new Error(response.error?.message || 'ファイル一覧取得に失敗しました');
}
```

---

## 目的と期待される成果

### 目的
バックエンドのレスポンス構造をフロントエンドの `ApiResponse<T>` 型定義に合わせることで、ファイル一覧取得・ファイル内容取得・自動補正APIが正常に動作するようにする。

### 期待される成果
- [x] ワークフロー追加ダイアログでMAIMLファイル一覧が正しく表示される
- [x] ワークフローファイルの内容取得が正常に動作する
- [x] 自動補正APIのレスポンスが正常に処理される

---

## 実装ステップ

- [x] 問題の調査（バックエンドのコントローラーとフロントエンドの型定義を照合）
- [x] `listFiles` 関数のレスポンス構造を修正（`...result` → `data: result`）
- [x] `getFileContent` 関数のレスポンス構造を修正（`...result` → `data: result`）
- [x] `autoCorrect` 関数のレスポンス構造を修正（`...result` → `data: result`）

---

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `backend/src/controllers/maimlController.ts` | `listFiles`・`getFileContent`・`autoCorrect` の3関数でレスポンス構造を修正（`...result` → `data: result`） |

---

## 修正の詳細

```typescript
// 修正前（3箇所とも同様）
res.json({
  success: true,
  ...result,    // NG: スプレッドによりデータがトップレベルに展開される
  meta: { timestamp: new Date().toISOString() },
});

// 修正後（3箇所とも同様）
res.json({
  success: true,
  data: result, // OK: data プロパティに格納することで ApiResponse<T> 型と一致
  meta: { timestamp: new Date().toISOString() },
});
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 他のAPIクライアントが旧構造に依存している | 中 | 低 | `listFiles`・`getFileContent`・`autoCorrect` の呼び出し箇所を確認済み（フロントエンドの `maimlApiService.ts` のみ） |

---

## 承認記録

- **計画書提示日時**: 2026-03-04 15:11
- **承認日時**: 2026-03-04 15:11（ユーザー指摘により即時修正）

## 実施記録

### 実施日時
開始: 2026-03-04 15:07  
完了: 2026-03-04 15:10

### 計画からの変更点
なし

### 最終的な成果物
- [x] `backend/src/controllers/maimlController.ts` の3箇所修正完了
