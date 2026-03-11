# タスク計画書: 実験作業者メイン画面仕様書修正

## メタデータ
- **作成日時**: 2026-03-11 13:03
- **タスクID**: 実験作業者メイン画面仕様書修正
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

`docs/design/ui/experiment_worker/ui_experiment_worker_main.md` の仕様書を、
現在のソースコード実装に合わせて修正する。

仕様書は主にモックデータ時代の内容で書かれており、API化・機能追加後の実装と乖離している。

---

## 調査結果サマリー

### 調査対象ファイル

| ファイル | パス |
|---------|------|
| メインコンポーネント | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` |
| メソッド・タスク選択 | `frontend/src/components/ExperimentWorker/MethodTaskSelector.tsx` |
| プロジェクト選択モーダル | `frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx` |
| 進捗確認タブ | `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` |
| 指示確認タブ | `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` |
| 実験記録タブ | `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` |
| カスタムフック | `frontend/src/hooks/useInstructions.ts` |
| カスタムフック | `frontend/src/hooks/useExpandState.ts` |
| APIサービス | `frontend/src/services/projectApiService.ts` |

---

### 差分詳細

#### 差分1: ExperimentWorkerMenuProps に未記載のPropsが存在

**仕様書**: Props定義なし  
**ソースコード**: 以下のPropsが実装済み

| Prop名 | 型 | 説明 |
|--------|-----|------|
| `overlayMode` | `boolean` | Header/SubHeaderを非表示にしてコンテンツのみ表示するモード |
| `fixedProjectId` | `string` | プロジェクトを固定選択する（選択不可になる） |
| `readOnly` | `boolean` | 操作ボタン（選択・承認依頼）を disabled にする |

---

#### 差分2: 追加されたローカル状態

**仕様書 3.4 / 7.1**: 状態管理の記載と差異がある  
**ソースコード**: 以下の状態が追加されている

| 状態名 | 型 | 説明 |
|--------|-----|------|
| `selectedProjectName` | `string` | 選択中のプロジェクト名（仕様書にない） |
| `projects` | `WorkerProject[]` | APIから取得したプロジェクト一覧 |
| `projectsLoading` | `boolean` | プロジェクト取得中フラグ |
| `approvalLoading` | `boolean` | 承認依頼送信中フラグ |

また `dialogOpen` はソースコード上で存在するが、仕様書の定義と一致している。

---

#### 差分3: プロジェクトステータスの型が文字列→数値に変更

**仕様書 3.2.1**:
- ステータスは文字列型: `'draft'`, `'active'`, `'waiting_approval'`, `'approved'`
- `isSelectableStatus()` でフロントエンドフィルタリングする

**ソースコード**:
- ステータスは **数値型** (`projectStatus: number`)
  - `0=計画中`, `1=タスク実行待ち`, `2=タスク実行中`, `3=承認待ち`, `4=完了`, `5=異常終了`
- `isSelectableStatus()` 関数は **存在しない**
- フィルタリングはせず、APIから返ってきたすべてのプロジェクトを表示
- ステータスラベルは `useCodeMaster('project_status')` フックから取得

---

#### 差分4: プロジェクト選択コンボボックスのオプション生成ロジック

**仕様書 3.2.1**:
```typescript
options={[
  { value: null, label: '-' },
  ...Object.entries(projectsData)
    .filter(([, project]) => isSelectableStatus(project.status))
    .map(...)
]}
```

**ソースコード**:
```typescript
options={[
  { value: '', label: '-' },
  ...projects.map((project) => {
    const statusLabel = projectStatusOptions.find(opt => opt.value === project.projectStatus)?.label ?? String(project.projectStatus);
    return { value: project.projectId, label: `${project.projectName} - ${statusLabel}` };
  })
]}
```

---

#### 差分5: 承認依頼APIのエンドポイント・リクエスト形式

**仕様書 15.2**:
- エンドポイント: `POST /api/v1/projects/{projectId}/approval-request`
- パスパラメータ: `projectId`（UUID）
- リクエストボディ: `{ projectId, message, requestedTasks[] }`

**ソースコード**:
- エンドポイント: `PATCH /api/v1/projects/{projectName}/approval-request`（HTTPメソッドもパスパラメータも異なる）
- パスパラメータ: `projectName`（プロジェクト名の文字列）
- リクエストボディ: `{ comment? }`（`requestedTasks` は存在しない）

---

#### 差分6: プロジェクト一覧取得APIのレスポンス形式

**仕様書 15.1**:
- `projectStatus` が文字列型: `"in_progress"` | `"review_waiting"` | `"approved"`

**ソースコード**:
- `projectStatus` が **数値型** (`number`)
- `useDeemedProgress?: boolean` フィールドが追加されている

---

#### 差分7: handleApprovalRequest の実装

**仕様書 15.3**:
```typescript
await apiService.post(`/api/v1/projects/${selectedProject}/approval-request`, { ... });
updateProjectStatus(selectedProject, 'waiting_approval'); // ローカル状態を直接更新
```

**ソースコード**:
```typescript
await requestApproval(selectedProjectData.projectName); // projectNameで呼び出し
// プロジェクト一覧を再取得してステータスを更新（ローカル直接更新ではない）
const projectsResult = await getWorkerAccessibleProjects();
```

---

#### 差分8: handleProjectChange のシグネチャ

**仕様書 3.5 / 8.1**:
```typescript
const handleProjectChange = (value: string | null) => { ... }
```

**ソースコード**:
```typescript
const handleProjectChange = (value: string | undefined | null) => {
  // プロジェクト名も同時に更新する処理が追加
  originalHandleProjectChange(projectValue, projectName); // 第2引数 projectName が追加
};
```

`useInstructions` フックの `handleProjectChange` も引数が2つ（`value: string`, `projectName: string`）に変更されている。

---

#### 差分9: handleSelectTaskAndTab のメソッドID取得ロジック（TODO）

**仕様書 8.5**: `projectsData[selectedProject]` からメソッドIDを取得するロジックを記載

**ソースコード**:
```typescript
// TODO: API化後、タスクからメソッドIDを取得するロジックを実装
// 現在はモックデータを使用していないため、メソッドIDの取得は省略
setSelectedTaskId(taskId);
setCurrentTab(tabKey);
```
→ **メソッドIDの取得ロジックが未実装**（TODOコメントあり）

---

#### 差分10: selectedMethod の取得ロジック（TODO）

**仕様書 12.1**: `useMemo` でプロジェクトデータからメソッド情報を取得するロジックを記載

**ソースコード**:
```typescript
const selectedMethod = null; // TODO: API化後、メソッド情報を取得するロジックを実装
```
→ **常に `null`**（TODOコメントあり）

---

#### 差分11: ProjectSelectionModal の機能

**仕様書 3.2.2**:
- 「選択」ボタンクリックで `ProjectSelectionModal` を開く
- プロジェクト・メソッド・タスクを一括選択可能

**ソースコード**:
- プロジェクト **のみ** 選択するモーダル
- テーブル形式UI（あいまい検索 + プロジェクト名フィルタ機能あり）
- メソッド・タスクの一括選択機能はなし

---

#### 差分12: タブコンポーネントのProps

**仕様書 4.4**:
```
各タブに渡すprops: selectedProject, onProjectChange, selectedMethodId,
onSelectMethod, selectedTaskId, onSelectTask
```

**ソースコード（ProgressCheckTab）**:
- `selectedTaskId`, `onSelectTask` は渡されていない
- 代わりに `selectedProjectName`, `onTabChange`, `onSelectTaskAndTab`, `readOnly` が追加

---

#### 差分13: MethodTaskSelector の onOpenModal の用途

**仕様書 5.3.3**:
- 「選択」ボタンで `MethodTaskSelectionModal`（メソッドとタスクを同時選択）を開く

**ソースコード**:
- `MethodTaskSelectionModal` は実装されており、メソッドとタスクを選択できる ✅
- ただし仕様書の説明と実装は一致している

---

## 修正ステップ

### Phase 1: メタデータ更新

- [ ] Step1: メタデータセクションの最終更新日・バージョンを更新

### Phase 2: コンポーネントの基本情報修正

- [ ] Step2: セクション1「画面概要」の主要機能リストを修正（承認依頼の説明等）

### Phase 3: プロジェクト選択エリアの修正

- [ ] Step3: セクション3.2.1「プロジェクト選択コンボボックス」のオプション生成ロジックを修正（isSelectableStatus削除、数値ステータス対応）
- [ ] Step4: セクション3.2.2「選択ボタン」の説明を修正（ProjectSelectionModalはプロジェクトのみ選択に変更）
- [ ] Step5: セクション3.3「レイアウト」のコードスニペットを修正（loading/readOnly対応）
- [ ] Step6: セクション3.4「状態管理」に追加状態を追記（selectedProjectName, projects, projectsLoading, approvalLoading）
- [ ] Step7: セクション3.5「イベントハンドラー/プロジェクト変更時」を修正（シグネチャ変更、projectName同時更新）

### Phase 4: タブ構成の修正

- [ ] Step8: セクション4.4「タブ切り替え」のProps記述を修正（ProgressCheckTabのpropsを実際の実装に合わせる）

### Phase 5: MethodTaskSelectorの修正

- [ ] Step9: セクション5.3.1「メソッド選択」のオプションコード修正
- [ ] Step10: セクション5.5「Props定義」に変更なし（一致している）を確認・注記追加

### Phase 6: 状態管理・イベントハンドラーの修正

- [ ] Step11: セクション7.1「ローカル状態」に追加状態を追記
- [ ] Step12: セクション7.2「カスタムフック useInstructions」のシグネチャ修正（handleProjectChange の引数変更）
- [ ] Step13: セクション8.1「プロジェクト変更」のハンドラー実装を修正（シグネチャ、projectName追加）
- [ ] Step14: セクション8.5「タスク選択とタブ切り替え」をTODO実装状態に修正
- [ ] Step15: セクション8.6「承認依頼」を実際の実装（requestApproval/再取得）に修正

### Phase 7: APIセクションの修正

- [ ] Step16: セクション15.1「プロジェクト一覧取得API」のレスポンス形式修正（projectStatusを数値型に、useDeemedProgress追加）
- [ ] Step17: セクション15.2「承認依頼API」のエンドポイント・HTTPメソッド・リクエストボディを修正
- [ ] Step18: セクション15.3「API呼び出しフロー/承認依頼時」のコード例を実際の実装に合わせて修正

### Phase 8: Props定義セクション追加

- [ ] Step19: ExperimentWorkerMenuProps の定義セクションを新規追加（overlayMode, fixedProjectId, readOnly）

### Phase 9: 最終確認

- [ ] Step20: 全体を通して整合性を確認し、承認記録を更新

---

## 変更ファイル

1. `docs/design/ui/experiment_worker/ui_experiment_worker_main.md` - 仕様書修正（メイン）

---

## リスク

| リスク | 対策 |
|--------|------|
| 修正箇所が多く漏れが発生する | ステップごとに小さく分割して実行 |
| TODO実装中の箇所を誤って仕様確定として記載する | TODO状態であることを明記する |

---

## 承認記録

- **計画書提示日時**: 2026-03-11 13:03
- **承認日時**: 2026-03-11 13:06
- **承認者コメント**: 承認

## 実施記録

### 実施日時
開始: 2026-03-11 13:06
完了: 2026-03-11 13:27

### 最終的な成果物
- [x] `docs/design/ui/experiment_worker/ui_experiment_worker_main.md` 修正完了（v1.0.0 → v1.1.0）

### 修正内容サマリー
- メタデータ: 最終更新日・バージョン更新
- セクション1: 主要機能の説明修正、表示モード（overlayMode/readOnly）の追記
- セクション1.5（新規）: ExperimentWorkerMenuProps定義の追加
- セクション3.2.1: プロジェクトステータスを文字列型から数値型に変更、isSelectableStatus削除
- セクション3.2.2: ProjectSelectionModalの説明をプロジェクト単体選択に修正
- セクション3.3: レイアウトにloading/readOnly/fixedProjectId対応を追記
- セクション3.4: 追加状態（selectedProjectName, projects, projectsLoading, approvalLoading）を追記
- セクション3.5: handleProjectChangeのシグネチャ修正（undefined対応、projectName追加）
- セクション4.4: タブごとのProps一覧をテーブル形式で修正
- セクション7.1: 追加状態を追記
- セクション7.2: useInstructionsのhandleProjectChangeシグネチャ修正
- セクション8.1: handleProjectChangeの実装を修正
- セクション8.5: handleSelectTaskAndTabをTODO状態として記載
- セクション8.6: handleApprovalRequestを実際の実装に合わせて修正
- セクション15.1: レスポンスのprojectStatusを数値型に修正、useDeemedProgress追加
- セクション15.2: 承認依頼APIをPATCH/{projectName}に修正、リクエストボディをcommentのみに変更
- セクション15.3: API呼び出しフローを実際の実装に合わせて修正
