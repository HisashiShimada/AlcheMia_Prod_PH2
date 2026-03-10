# タスク計画書: managerId 認証コンテキストからの取得

## メタデータ
- **作成日時**: 2026-03-09 11:21
- **タスクID**: manager_id_auth
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`ProgressMonitoring.tsx` の `managerId` state がハードコード値 `'manager_001'` になっており、
実際のログインユーザーIDが使われていない問題を修正する。

`sessionStorageHelper.ts` の `getUserInfo()` を使って、セッションに保存されたログインユーザーの
IDを取得し、`managerId` state の初期値として設定する。

---

## 現状の問題

```tsx
// ProgressMonitoring.tsx（修正前）
const [managerId] = useState('manager_001'); // TODO: 実際のログインユーザーIDを使用
```

---

## 修正方針

### 取得方法

`sessionStorageHelper.ts` に実装済みの `getUserInfo()` を使用する。
`ProjectManagement.tsx` でも同様のパターンで使用されている実績がある。

```ts
// getUserInfo() の戻り値型（SessionUserInfo）
export interface SessionUserInfo {
  id: string;          // ← これが managerId に対応するユーザーID
  username: string;
  displayName: string;
  email: string;
  organizationId: string;
  organizationName: string;
  role: string;
}
```

### 修正方針の選択肢

| 方法 | 説明 | 採用 |
|------|------|------|
| A: `useState` の初期値に `getUserInfo()?.id` を渡す | シンプル・SSR-safe（関数形式初期値）| ✅ 採用 |
| B: `useEffect` で非同期取得 | 過剰（sessionStorageは同期） | ❌ 不要 |
| C: useMemo で導出 | state不要なら可だが、他stateと合わせてstateで管理が自然 | △ |

方法Aで実装する。`useState` の初期値に関数を渡す形式を使えば、
クライアントサイドでのみ `sessionStorage` を参照できる。

---

## 実装内容

### 変更ファイル
1. `frontend/src/components/progress/ProgressMonitoring.tsx` - 修正

### 変更詳細

#### Step 1: import に `getUserInfo` を追加

```tsx
import { getUserInfo } from '@/utils/sessionStorageHelper';
```

#### Step 2: `managerId` state の初期値を変更

**修正前:**
```tsx
const [managerId] = useState('manager_001'); // TODO: 実際のログインユーザーIDを使用
```

**修正後:**
```tsx
const [managerId] = useState<string>(() => getUserInfo()?.id ?? '');
```

**解説:**
- `useState` に関数を渡す「lazy initializer」パターンを使用
  - 初回レンダー時のみ実行されるため、SSR（Next.js サーバーサイド）でも安全
  - `getUserInfo()` 内部でも `typeof window === 'undefined'` チェック済み
- `?.id` でnullableを安全に処理
- `?? ''` でフォールバック（未ログイン状態はありえないが防御的に空文字を設定）

---

## 影響範囲

### 直接の影響
- `managerId` が `WorkProgressDetailDialog` に props `managerId` として渡される
  ```tsx
  <WorkProgressDetailDialog
    open={isDetailDialogOpen}
    onClose={handleCloseDialog}
    fileData={fileData}
    managerId={managerId}   // ← ここで使用
  />
  ```
- `WorkProgressDetailDialog` 内での `managerId` の使われ方に応じて動作が変わる

### 副作用なし
- `managerId` state のセッター（`setManagerId`）は現在使用されていないため、
  `const [managerId] = useState(...)` のままで問題なし
- `ownerFilter` の `my_only` フィルター機能（未実装部分）への影響なし
  （フィルター機能は別タスクで実装予定）

---

## テスト計画

### 手動確認
- [ ] ログイン後、進捗確認タブを表示
- [ ] 開発者ツールの Console に `managerId` の値が実際のユーザーIDになっていること（必要なら console.log 追加で確認）
- [ ] SessionStorageの `user` キーの `id` フィールドと一致していること
- [ ] 詳細ボタンを押してダイアログが開き、`managerId` が正しく渡されていること

### エラーケース
- [ ] 未ログイン状態（sessionStorage に user なし）でも画面が壊れないこと（フォールバック `''` で安全）

---

## 承認記録
- **計画書提示日時**: 2026-03-09 11:21
- **承認日時**: 2026-03-09 11:24
- **承認者コメント**: 承認

## 実施記録
- **開始**: 2026-03-09 11:24
- **完了**: 2026-03-09 11:25

### 実施内容
1. `frontend/src/components/progress/ProgressMonitoring.tsx` に以下の2行を変更

   **追加した import:**
   ```tsx
   import { getUserInfo } from '@/utils/sessionStorageHelper';
   ```

   **変更した state 初期値:**
   ```tsx
   // 変更前
   const [managerId] = useState('manager_001'); // TODO: 実際のログインユーザーIDを使用
   // 変更後
   const [managerId] = useState<string>(() => getUserInfo()?.id ?? '');
   ```

### 計画からの変更点
なし

### 最終的な成果物
- [x] `ProgressMonitoring.tsx` の `managerId` を認証コンテキスト（sessionStorage）から取得するよう修正
