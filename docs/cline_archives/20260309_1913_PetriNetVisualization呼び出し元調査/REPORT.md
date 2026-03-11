# 調査レポート: PetriNetVisualization 呼び出し元調査

## メタデータ

- **作成日時**: 2026-03-09 19:13
- **調査対象**: `PetriNetVisualization` コンポーネントの呼び出し元
- **調査対象ファイル**: `docs/design/ui/experiment_admin/03_progress_monitoring/ui_petri_net_visualization.md`

---

## 調査結果

### PetriNetVisualization が呼び出される場所

#### 1. WorkProgressDetailDialog（確認済み ✅）

**設計書の根拠（`ui_work_progress_detail_dialog.md` §2.2.8）:**

「実験フロー図エリア」として `PetriNetVisualization` を統合表示する設計になっています。

> 実験フロー図エリア
> - コンポーネント: PetriNetVisualization
> - カード背景: colorBgLayout
> - サイズ: small

**ソースコードの根拠（`frontend/src/components/progress/WorkProgressDetailDialog.tsx`）:**

```tsx
{/* PetriNetVisualization統合 */}
{fileDetails?.fileInfo && selectedWork.assignedWorkerId && (
  <PetriNetVisualization
    fileKey={fileDetails.fileInfo.maimlFileKey}
    workerId={selectedWork.assignedWorkerId}
    workId={selectedWork.workId}
    progressData={selectedWork.transitionProgress}
  />
)}
```

**WorkProgressDetailDialog が開かれるトリガー:**
- `ProgressMonitoring`（進捗確認画面）のプロジェクト一覧テーブルで「**詳細ボタン**」をクリックしたとき
- 設計書根拠: `ui_progress_monitoring.md` §2.3「詳細ボタンクリック: WorkProgressDetailDialogモーダルを表示」

---

### 呼び出しの全体フロー

```
実験管理者メニュー「進捗確認」選択
  └─→ ProgressMonitoring（進捗確認画面）
          │  frontend/src/components/progress/ProgressMonitoring.tsx
          │
          ├─ プロジェクト一覧テーブル
          └─ [詳細] ボタンクリック
                  │
                  └─→ WorkProgressDetailDialog（モーダルダイアログ）
                              │  frontend/src/components/progress/WorkProgressDetailDialog.tsx
                              │
                              └─ 「実験フロー図」エリア（§2.2.8）
                                      │
                                      └─→ PetriNetVisualization  ← 呼び出し元
                                                frontend/src/components/progress/PetriNetVisualization.tsx
```

---

### 設計書「使用場面」（§1.2）との対応関係

| 設計書記載の使用場面 | 実際の対応 |
|---|---|
| ProgressMonitoring画面で実験フローを表示する場合 | WorkProgressDetailDialog 経由で**間接的に**表示（直接呼び出しではない） |
| WorkProgressDetailDialogで詳細な進捗を確認する場合 | ✅ **直接の呼び出し元として確認済み**（ソースコードにも実装あり） |
| 実験記録タブでワークフロー全体を把握する場合 | 現時点では未実装の可能性あり（ソースコード検索で該当なし） |

---

### Props の受け渡し内容

`WorkProgressDetailDialog` から `PetriNetVisualization` へ渡される Props：

| Prop名 | 値の出所 | 説明 |
|---|---|---|
| `fileKey` | `fileDetails.fileInfo.maimlFileKey` | MAIMLファイルのS3キー |
| `workerId` | `selectedWork.assignedWorkerId` | タスクに割り当てられた作業者ID |
| `workId` | `selectedWork.workId` | タスクID |
| `progressData` | `selectedWork.transitionProgress` | トランジション進捗データ配列 |

---

## まとめ

**現時点では `WorkProgressDetailDialog` のみが `PetriNetVisualization` を呼び出す実装になっています。**

`ProgressMonitoring` 画面から直接呼び出されているわけではなく、以下の2段階の呼び出し構造になっています：

1. `ProgressMonitoring` の「詳細ボタン」クリック → `WorkProgressDetailDialog` が開く
2. `WorkProgressDetailDialog` の「実験フロー図」エリアで `PetriNetVisualization` が表示される

---

## 参照ドキュメント

- [PetriNetVisualization UI仕様書](../design/ui/experiment_admin/03_progress_monitoring/ui_petri_net_visualization.md)
- [WorkProgressDetailDialog UI仕様書](../design/ui/experiment_admin/03_progress_monitoring/ui_work_progress_detail_dialog.md)
- [ProgressMonitoring UI仕様書](../design/ui/experiment_admin/03_progress_monitoring/ui_progress_monitoring.md)
- ソースコード: `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
- ソースコード: `frontend/src/components/progress/ProgressMonitoring.tsx`
- ソースコード: `frontend/src/components/progress/PetriNetVisualization.tsx`
