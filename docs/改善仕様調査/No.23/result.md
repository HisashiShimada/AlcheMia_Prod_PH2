# 対応結果レポート: 永続化漏れ修正（No.23）

## メタデータ
- **作成日時**: 2026-03-25
- **対応内容**: IssueReportModal の永続化漏れ修正 + DataRecordDialog のデッドコード削除
- **関連ファイル**: `docs/改善仕様調査/No.23/`

---

## 1. 対応概要

編集系画面でバックエンドへの保存APIを呼び出していない永続化漏れを調査・修正しました。

---

## 2. 発見された問題

### 2.1 問題① IssueReportModal（重大: 永続化漏れ）

| 項目 | 内容 |
|------|------|
| ファイル | `frontend/src/components/ExperimentWorker/IssueReportModal.tsx` |
| 呼び出し元 | `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` |
| 問題内容 | フォームに入力して「保存」を押しても、API呼び出しが一切なくデータが保存されない |
| 影響 | 「問題報告」ボタンから報告した問題は DBに保存されていなかった |

**詳細:**  
`IssueReportModal` の `handleSubmit` には `// TODO: APIを実装` のコメントのみがあり、
`onSubmit` コールバックを呼ぶだけで実際のAPIコールが存在しなかった。
一方、`IssueManagementModal` は同一機能（問題報告）を完全なAPIとともに実装済みだった。

### 2.2 問題② DataRecordDialog のデッドコード（軽微）

| 項目 | 内容 |
|------|------|
| ファイル | `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` |
| 問題内容 | `handleSubmit` 関数（約40行）がどのボタンにも接続されておらず、API呼び出しなしで `onSave` を直接呼ぶデッドコードになっていた |
| 影響 | 実際には呼ばれていないため影響なし（コードの混乱要因） |

---

## 3. 修正内容

### 3.1 ProgressCheckTab.tsx の修正

**変更前:**
- `IssueReportModal`（API未実装）と `IssueManagementModal`（参照専用）を両方 import して使用

**変更後:**
- `IssueReportModal` の import・state・ハンドラを削除
- 「問題報告」ボタン（`issue` アクション）→ `IssueManagementModal` を `viewMode={false}` で開くように変更
- 「問題確認」ボタン（`issueCheck` アクション）→ `IssueManagementModal` を `viewMode={true}` で開く（変更なし）
- モーダル表示用 state を `issueReportModalOpen` / `issueCheckModalOpen` の2つから `issueModalOpen` / `issueModalViewMode` の2つに統合

```
変更前:
  問題報告ボタン → IssueReportModal（viewMode なし・API未実装）
  問題確認ボタン → IssueManagementModal（viewMode=true）

変更後:
  問題報告ボタン → IssueManagementModal（viewMode=false）※API実装済み
  問題確認ボタン → IssueManagementModal（viewMode=true）
```

### 3.2 IssueReportModal.tsx の削除

`ProgressCheckTab` 以外の呼び出し元が存在しないことを確認したうえで削除。

### 3.3 DataRecordDialog.tsx のデッドコード削除

フッターの「保存」ボタンには接続されていなかった `handleSubmit` 関数（API未実装）を削除。  
保存ボタンに接続されている `handleSaveTemplate`（`saveBatchExperimentData()` 呼び出し済み）はそのまま維持。

---

## 4. 修正ファイル一覧

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | 修正 | IssueReportModal → IssueManagementModal（viewMode=false）に切り替え |
| `frontend/src/components/ExperimentWorker/IssueReportModal.tsx` | 削除 | API未実装のため削除 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | 修正 | デッドコード（handleSubmit）を削除 |

---

## 5. 仕様書更新内容

| ファイル | バージョン | 変更内容 |
|---------|---------|---------|
| `docs/design/ui/experiment_worker/ui_progress_check_tab.md` | v1.2.0 | IssueReportModal の記述を削除し、IssueManagementModal（viewMode=false/true）に統一 |
| `docs/design/ui/experiment_worker/ui_issue_management_modal.md` | v1.4.0 | 関連コンポーネント欄の IssueReportModal を削除、廃止コンポーネント注記を追加 |

---

## 6. 動作確認ポイント

| 確認項目 | 確認方法 |
|---------|---------|
| 問題報告ボタンからモーダルが開くこと | ProgressCheckTab → 問題報告ボタンクリック |
| 問題報告モーダルで入力・保存するとDBに登録されること | フォーム入力 → 保存 → DBで確認 |
| 問題確認モーダルが参照専用で開くこと | 問題確認ボタンクリック → 編集UIが非表示 |
| DataRecordDialog の保存ボタンが正常動作すること | テンプレート選択 → 値入力 → 保存ボタン |

---

## 7. 備考

- `IssueManagementModal` の `viewMode=false` 時は「問題報告」タイトルで表示（既存実装）
- `IssueManagementModal` の `viewMode=true` 時は「問題確認」タイトルで表示（既存実装）
- 今回の修正により `IssueReportModal` はリポジトリから完全に削除されました
