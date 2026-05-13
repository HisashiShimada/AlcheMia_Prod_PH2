# タスク計画書: 問題タイプ選択肢API取得対応

## メタデータ
- **作成日時**: 2026-02-27 11:51
- **タスクID**: 問題タイプ選択肢API取得対応
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`IssueManagementModal`（問題管理モーダル）の新規問題報告フォームにある「問題タイプ」コンボボックスの選択肢が、現在ソースコードにハードコードされている。これを `GET /api/v1/code-master/:codeDivision/options` API（codeDivision=`issue_type`）から動的に取得するよう変更する。

## 目的と期待される成果

### 目的
- 問題タイプの選択肢をコードマスターで一元管理できるようにする
- 選択肢の追加・変更・削除をDBの変更のみで対応可能にする（フロントエンドの変更不要）

### 期待される成果
- [ ] 問題タイプのSelectがAPIから選択肢を取得して表示する
- [ ] API取得中はLoadingスピナーが表示される
- [ ] 設計書が実装内容と整合する

## 調査結果

### 既存ファイル

| ファイル | 内容 |
|---------|------|
| `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` | 問題タイプのSelectに7件のハードコード選択肢あり |
| `frontend/src/services/codeMasterApiService.ts` | `getSelectOptions(codeDivision)` 関数でAPI呼び出し実装済み |
| `frontend/src/hooks/useCodeMaster.ts` | `useCodeMaster(codeDivision)` カスタムフック実装済み（options/loading/error/refetch を返す） |
| `backend/src/routes/codeMasterRoutes.ts` | `GET /api/v1/code-master/:codeDivision/options` エンドポイント実装済み |

### 現状のハードコード選択肢（変更前）

```tsx
<Select placeholder="問題タイプを選択">
  <Select.Option value="material_shortage">材料不足</Select.Option>
  <Select.Option value="equipment_failure">機器故障</Select.Option>
  <Select.Option value="procedure_unclear">手順不明確</Select.Option>
  <Select.Option value="safety_concern">安全性の懸念</Select.Option>
  <Select.Option value="quality_issue">品質問題</Select.Option>
  <Select.Option value="time_constraint">時間制約</Select.Option>
  <Select.Option value="other">その他</Select.Option>
</Select>
```

### 使用する既存フック

```typescript
// frontend/src/hooks/useCodeMaster.ts
const { options, loading, error, refetch } = useCodeMaster('issue_type');
// options: SelectOption[] = { value: string|number, label: string }[]
// loading: boolean
// error: Error | null
```

## 実装ステップ

### Step 1: タスク計画書作成
- [x] `docs/20260227_1151_問題タイプ選択肢API取得対応/PLAN.md` 作成

### Step 2: IssueManagementModal.tsx 修正
- [ ] `useCodeMaster` フックをimportに追加
- [ ] コンポーネント内で `useCodeMaster('issue_type')` を呼び出し
- [ ] 問題タイプのSelectをAPI取得の動的オプションに変更（loading対応）

### Step 3: 設計書更新
- [ ] `docs/design/ui/ui_issue_management_modal.md` の問題タイプ選択肢セクション（8.3）を更新

## 変更ファイル

### 修正
1. `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` - 問題タイプSelectをuseCodeMasterフック使用に変更
2. `docs/design/ui/ui_issue_management_modal.md` - 設計書の問題タイプ選択肢セクションを更新

## 実装詳細

### IssueManagementModal.tsx の変更内容

**1. importの追加**
```tsx
// 追加
import { useCodeMaster } from '@/hooks/useCodeMaster';
```

**2. フック呼び出しの追加（コンポーネント内）**
```tsx
// 追加: 問題タイプ選択肢をAPIから取得
const { options: issueTypeOptions, loading: issueTypeLoading } = useCodeMaster('issue_type');
```

**3. 問題タイプ Select の変更**
```tsx
// 変更前
<Select placeholder="問題タイプを選択">
  <Select.Option value="material_shortage">材料不足</Select.Option>
  ...
</Select>

// 変更後
<Select
  placeholder="問題タイプを選択"
  loading={issueTypeLoading}
  options={issueTypeOptions}
/>
```

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| APIエラー時に選択肢が空になる | 中 | 低 | useCodeMasterフックのerror状態は既存フックで処理済み（コンソールログ出力） |
| code_masterテーブルにissue_typeが未登録 | 中 | 低 | 別途テストデータ確認済み（backend/sql/test_data_code_master.sql） |

## テスト計画

### 手動テスト
- [ ] 問題管理モーダルを開き「新規問題報告」ボタンを押す
- [ ] 問題タイプのSelectをクリックし、APIから取得した選択肢が表示されることを確認
- [ ] API取得中にloadingスピナーが表示されることを確認（開発ツールのNetwork速度をSlowに設定）

## 承認記録
- **計画書提示日時**: 2026-02-27 11:53
- **承認日時**: 2026-02-27 11:53
- **承認者コメント**: 実装を進める

## 実施記録

### 実施日時
開始: 2026-02-27 11:53
完了: 2026-02-27 13:51

### 計画からの変更点

当初の計画では「`useCodeMaster('issue_type')` を呼び出すだけ」と想定していたが、
実際のコードは `enabled=false` + `useEffect` + `refetch` という複雑な実装になっていた。

**根本原因:**

`TransitionList.tsx` では以下のパターンでモーダルを制御している：
```tsx
{selectedTransition && (
  <IssueManagementModal visible={issueModalOpen} ... />
)}
```

`setSelectedTransition(transition)` と `setIssueModalOpen(true)` が React のバッチ処理で同時に更新されるため、
コンポーネントは最初から `visible=true` の状態でマウントされる。

このとき `visible` は `false→true` に変化せず最初から `true` なので、
`useEffect([visible, refetchIssueTypes])` の依存変化によるトリガーが期待通りに動作しない場合があった。

また、`destroyOnHidden` によりモーダルが閉じるたびにコンポーネントが破棄・再生成されるため、
`enabled=false` + 手動 `refetch` という複雑な実装は不要だった。

**実施した修正:**

`enabled=false` + `useEffect` + `refetch` の実装を削除し、
`useCodeMaster('issue_type')` のデフォルト（`enabled=true`）に変更した。
これによりコンポーネントのマウント時に自動フェッチが実行される。

```typescript
// 変更前（不具合あり）
const { options: issueTypeOptions, loading: issueTypeLoading, refetch: refetchIssueTypes } = useCodeMaster('issue_type', false);
useEffect(() => {
  if (visible) {
    refetchIssueTypes();
  }
}, [visible, refetchIssueTypes]);

// 変更後（正常動作）
const { options: issueTypeOptions, loading: issueTypeLoading } = useCodeMaster('issue_type');
```

### 最終的な成果物
- [x] `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` - 修正完了
- [ ] `docs/design/ui/ui_issue_management_modal.md` - 設計書は既に正しい記述になっているため更新不要
