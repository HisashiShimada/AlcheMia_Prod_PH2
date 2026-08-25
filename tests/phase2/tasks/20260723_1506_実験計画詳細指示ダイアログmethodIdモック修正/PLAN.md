# タスク計画書: 実験計画詳細指示ダイアログ methodId 取得修正

## メタデータ
- **作成日時**: 2026-07-23 15:28
- **タスクID**: methodid-dialog-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験指示タブ内の「実験指示を編集」ボタン押下時に開く「実験計画詳細指示ダイアログ」で、
メソッドID（Select コンポーネント）の選択肢が空になり、データ取得ができない問題を修正する。

## 根本原因の分析

### 原因 1（主因）: `ExperimentPlanDialog.tsx` の初回 useEffect に `!methodId` ガードがない

```typescript
// 現状（問題あり）
useEffect(() => {
  if (!open) return;            // ← methodId チェックなし
  const data = await getPlanDialogData(projectId, methodId);  // methodId = '' でも実行される
  ...
}, [open, projectId, methodId]);
```

`ExperimentInstructionTab.tsx` の `handleOpenPlanDialog` 呼び出しは：
```typescript
const targetMethodId = methodId ?? methods[0]?.id ?? '';  // methods が空なら ''
setPlanDialogMethodId(targetMethodId);
setPlanDialogOpen(true);
```

`methods` の取得タイミング（非同期）によっては `methods[0]` が `undefined` となり、
`planDialogMethodId = ''` の状態でダイアログが開くことがある。
その場合 `getPlanDialogData(projectId, '')` → バックエンドで `Method not found: ` エラー。

### 原因 2（副因）: `ExperimentPlanDialog.tsx` のメソッドID変更用 useEffect も `!methodId` ガードなし

```typescript
// メソッドID変更時の useEffect（2つ目）
useEffect(() => {
  if (!open || !projectId || !methodId) return;  // ← こちらは正しくガードあり
  ...
}, [methodId, ...]);
```

2つ目はガードがあるが、最初の `useEffect` にガードがないため不整合がある。

### 関連状況

- `getProjectMethods` は `project_task.method_id` の DISTINCT 一覧を返す（`name` フィールドなし）
- `methodOptions` は `{ id: m.id, name: m.name ?? m.id }` → name が undefined なら id をフォールバック（正常）

## 修正内容

### 修正ファイル

1. `frontend/src/components/project/ExperimentPlanDialog.tsx`
   - 初回 `useEffect`（ダイアログオープン時）に `!methodId` ガードを追加

## 実装ステップ

- [x] 問題調査・根本原因特定
- [x] PLAN.md 作成・承認取得
- [x] `ExperimentPlanDialog.tsx` の修正（methodId='' かつ methodOptions 存在時に自動選択する useEffect 追加）
- [ ] 動作確認

## 変更ファイル

1. `frontend/src/components/project/ExperimentPlanDialog.tsx` - useEffect ガード修正

## テスト計画

- [ ] `methods` がまだ取得できていない状態でボタン押下 → ダイアログが開かない/エラーにならない
- [ ] `methods` 取得後にボタン押下 → 正常にダイアログが開き、メソッドIDが正しく表示される
- [ ] フィルタでメソッドIDを絞り込んだ状態でボタン押下 → そのメソッドIDでダイアログが開く

## 承認記録
- **計画書提示日時**: 2026-07-23 15:28
- **承認日時**:
- **承認者コメント**:
