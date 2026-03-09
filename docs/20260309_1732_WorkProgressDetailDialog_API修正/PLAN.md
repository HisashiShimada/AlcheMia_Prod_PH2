# タスク計画書: WorkProgressDetailDialog APIが呼ばれない問題の修正

## メタデータ
- **作成日時**: 2026-03-09 17:32
- **タスクID**: WorkProgressDetailDialog_API修正
- **優先度**: 高
- **推定工数**: 0.5時間

---

## 1. タスク概要

進捗確認タブの「詳細」ボタンを押下するとダイアログは表示されるが、
APIが一切呼ばれないためデータが表示されない問題を修正する。

---

## 2. 調査結果（根本原因）

### 🔴 原因1（最重要）: `managerId` が空文字列で API が呼ばれない

**場所**: `ProgressMonitoring.tsx` → `WorkProgressDetailDialog.tsx`

`ProgressMonitoring.tsx` 側で `managerId` を初期化している：

```typescript
// ProgressMonitoring.tsx
const [managerId] = useState<string>(() => getUserInfo()?.id ?? '');
```

`getUserInfo()?.id` が取得できない場合、`managerId = ''`（空文字列）になる。

`WorkProgressDetailDialog.tsx` の `useEffect` は以下の条件で `fetchFileDetails()` を呼ぶ：

```typescript
useEffect(() => {
  if (open && fileData && managerId) {  // ← '' は falsy！
    fetchFileDetails();
  }
}, [open, fileData, managerId, fetchFileDetails]);
```

JavaScript では空文字列 `''` は **falsy** なので、
`managerId` が空文字列だと `fetchFileDetails()` が**永遠に呼ばれない**。
これがダイアログを開いてもAPIが投げられない直接の原因。

さらに `fetchFileDetails` 内部にも同じガード条件がある：

```typescript
if (!fileData || !fileData.maimlFileKey || !managerId) {
  console.warn('⚠️ [FileProgressDetail] Missing required parameters');
  return;
}
```

### 🔴 原因2: `axios` を直接使用（認証ヘッダーなし）

**場所**: `WorkProgressDetailDialog.tsx`

```typescript
// ❌ 直接 axios を使用 → 認証ヘッダーなし → 401 エラー
import axios from 'axios';
...
const response = await axios.get(
  `/api/v1/progress/projects/${encodeURIComponent(projectName)}/work-details`
);
```

他の API 呼び出しは `createApiClient()` を経由して認証トークンを自動付与している：

```typescript
// ✅ 他の API の正しい実装例
const { createApiClient } = await import('./authUtils');
const client = createApiClient();
const response = await client.get('/projects');
```

`progressRoutes.ts` のエンドポイントには `authMiddleware` が設定されており、
認証なしでは `401 Unauthorized` が返る。
原因1が解消されても、原因2が原因でエラーになる。

### ✅ バックエンドの実装状況（問題なし）

バックエンドは**正しく実装されている**：

| 項目 | 状態 |
|------|------|
| `GET /api/v1/progress/projects/:projectName/work-details` | ✅ 実装済み（progressRoutes.ts） |
| `progressController.getWorkDetails()` | ✅ 実装済み |
| `progressService.getWorkDetails()` | ✅ 実装済み |
| 認証ミドルウェア | ✅ `authMiddleware` + `checkPermission('040000', 0)` |

`progressService.getWorkDetails()` は以下を一括返却する：
- `projectInfo`: プロジェクト基本情報（オーナー、部門、ステータス等）
- `fileInfo`: MAIMLファイルキー等
- `workDetails[]`: 各タスクのトランジション進捗リスト

---

## 3. 目的と期待される成果

### 目的
`WorkProgressDetailDialog` の詳細ボタン押下時にAPIが正しく呼ばれ、データが表示されるようにする。

### 期待される成果
- [ ] 詳細ボタン押下時に `GET /api/v1/progress/projects/:projectName/work-details` が呼ばれる
- [ ] プロジェクト情報・タスク情報・トランジション進捗がダイアログに表示される
- [ ] 認証エラー（401）が発生しない

---

## 4. 実装ステップ

### Step 1: `useEffect` の条件から `managerId` を削除
- **ファイル**: `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
- `managerId` は JWT 認証からサーバー側で組織IDを取得するため不要

### Step 2: `fetchFileDetails` 内部のガード条件から `managerId` を削除
- **ファイル**: `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
- 同ファイル内の `if (!fileData || !fileData.maimlFileKey || !managerId)` を修正

### Step 3: `axios.get` を `createApiClient().get` に置き換え
- **ファイル**: `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
- `axios` の直接呼び出しを `createApiClient()` 経由に変更
- ベースURLのプレフィックス `/api/v1` を削除（`createApiClient` が自動付与）

### Step 4: 不要な `axios` import を削除
- **ファイル**: `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
- `import axios from 'axios'` を削除

---

## 5. 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/progress/WorkProgressDetailDialog.tsx` | managerId条件削除・axios→createApiClient置換 |

---

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `managerId` を他の用途で使用している可能性 | 低 | 低 | コードを確認済み（未使用） |
| `createApiClient` のベースURL形式の差異 | 中 | 低 | 他の実装例（fetchProjects等）を参照して確認 |

---

## 7. テスト計画

### 手動テスト
- [ ] 詳細ボタンを押下してダイアログが開く
- [ ] ブラウザのネットワークタブで `work-details` APIリクエストが送信されることを確認
- [ ] プロジェクト情報（名前・ステータス・オーナー等）が表示される
- [ ] タスクタブが表示される（workDetails が存在する場合）
- [ ] トランジション進捗が表示される
- [ ] 再読み込みボタンで再取得できる

---

## 8. 承認記録
- **計画書提示日時**: 2026-03-09 17:32
- **承認日時**: 2026-03-09 17:32
- **承認者コメント**: ユーザーにより Act mode への切り替えで承認

---

## 9. 実施記録

### 実施日時
開始: 2026-03-09 17:32
完了: （作業完了後に記入）

### 実施ステップ
- [x] Step 1: useEffect の managerId 条件削除
- [x] Step 2: fetchFileDetails ガード条件の managerId 削除
- [x] Step 3: axios.get → createApiClient().get 置換
- [x] Step 4: axios import 削除
