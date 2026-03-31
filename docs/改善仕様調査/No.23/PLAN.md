# タスク計画書: 問題報告モーダル API未実装の修正

## メタデータ
- **作成日時**: 2026-03-25 15:27
- **タスクID**: issue-report-modal-fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`ProgressCheckTab.tsx` の「報告」ボタンが、API未実装の古いコンポーネント `IssueReportModal` を使用している。  
これを、API実装済みの `IssueManagementModal` に置き換えることで永続化漏れを解消する。

## 問題の背景

### 2つのモーダルの現状

| コンポーネント | APIの実装状況 | 使用箇所 |
|---|---|---|
| `IssueReportModal.tsx` | ❌ 全ハンドラが `// TODO` | `ProgressCheckTab` の「報告」ボタンのみ |
| `IssueManagementModal.tsx` | ✅ 完全実装（`createIssue`, `addComment`, `updateIssueStatus`） | `ProgressCheckTab`（issueCheck）、`ExperimentRecordTab`（問題報告） |

### 経緯（推測）

もともと `IssueReportModal` が問題報告に使われていた。  
その後 `IssueManagementModal`（問題一覧+詳細+コメント+ステータス変更を統合したモーダル）に機能が統合されたが、  
`ProgressCheckTab` の「報告」ボタンが古い `IssueReportModal` のまま取り残されてしまった。

### `ProgressCheckTab` における現在の2つのモーダル

```
ProgressCheckTab
  ├── 「報告」ボタン  → handleOpenIssueReport → IssueReportModal   ← ❌ API未実装
  └── 「確認」ボタン  → handleOpenIssueCheck  → IssueManagementModal ← ✅ API実装済み
```

## 目的と期待される成果

- [ ] 「報告」ボタン押下時に `IssueManagementModal` が開き、問題の新規登録・コメント送信・ステータス変更がDBに保存されるようになる
- [ ] 古い `IssueReportModal` コンポーネントの利用が廃止される（ファイル削除を検討）
- [ ] `ProgressCheckTab.tsx` の未使用 import・state・ハンドラが削除されコードが整理される

## 実装ステップ

### Phase 1: `ProgressCheckTab.tsx` の修正

- [ ] `IssueReportModal` の import を削除
- [ ] `issueReportModalVisible`, `selectedTaskForIssue` の state を削除
- [ ] `handleOpenIssueReport`, `handleCloseIssueReport` ハンドラを削除
- [ ] `handleCommentSubmit`, `handleStatusChange` の TODO ハンドラを削除
- [ ] `case 'issue':` の処理を `handleOpenIssueCheck`（IssueManagementModal）に変更
- [ ] JSXの `<IssueReportModal ... />` を削除
- [ ] 「報告」ボタンに対応するケースが `issueCheckModalVisible` / `IssueManagementModal` を使うよう整理

### Phase 2: `IssueReportModal.tsx` の扱い

- [ ] 他の使用箇所がないことを最終確認（検索済み：1箇所のみ）
- [ ] ファイルを削除する

## 変更ファイル

### 修正
1. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` - IssueReportModal を IssueManagementModal に置き換え

### 削除
1. `frontend/src/components/ExperimentWorker/IssueReportModal.tsx` - 使用箇所がなくなるため削除

## 技術詳細

### `ProgressCheckTab` の「報告」ボタン修正方針

現在 `case 'issue'` と `case 'issueCheck'` で2つの別々のモーダルを開いているが、  
両方を `IssueManagementModal` に統一する。

```tsx
// 修正前
case 'issue':
  handleOpenIssueReport(task);  // → IssueReportModal（API未実装）
  break;
case 'issueCheck':
  handleOpenIssueCheck(task);   // → IssueManagementModal（API実装済み）
  break;

// 修正後
case 'issue':
  handleOpenIssueCheck(task);   // → IssueManagementModal（API実装済み）に統一
  break;
case 'issueCheck':
  handleOpenIssueCheck(task);   // → 同上（変更なし）
  break;
```

### `IssueManagementModal` に渡すパラメータ確認

`IssueManagementModal` には以下が必要：
- `visible`: モーダルの表示状態
- `targetName`: タイトルに表示する名前（task.taskName）
- `projectId`: プロジェクトID（`projectId` state から取得済み）
- `projectName`: プロジェクト名（`selectedProject` から取得）
- `methodId`: メソッドID（task.methodId）
- `taskNo`: タスク番号（task.taskNo を parseInt）
- `onClose`: 閉じるハンドラ

**注意点**: `projectId` は `ProgressCheckTab` でAPIレスポンスから取得済み（`useState<string | null>(null)`）。  
ただし初回ロード前は `null` のため、`projectId` が取得されるまでボタンを非活性化するかガード処理を入れる。

## リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| `projectId` が null のときに IssueManagementModal を開く | 低 | `projectId` が null の場合はボタンを非活性 or 早期リターン |
| IssueReportModal.tsx 削除によるビルドエラー | 低 | 削除前に import を全て削除済みであることを確認 |

## テスト計画

- [ ] 「報告」ボタンを押すと `IssueManagementModal` が開くこと
- [ ] 新規問題報告が DB に保存されること（API呼び出しを確認）
- [ ] コメント送信が DB に保存されること
- [ ] ステータス変更（解決済/未解決）が DB に保存されること
- [ ] 「確認」ボタンも引き続き `IssueManagementModal` が開くこと（既存の動作を壊さないこと）

## 承認記録

- **計画書提示日時**: 2026-03-25 15:27
- **承認日時**: 
- **承認者コメント**: 
