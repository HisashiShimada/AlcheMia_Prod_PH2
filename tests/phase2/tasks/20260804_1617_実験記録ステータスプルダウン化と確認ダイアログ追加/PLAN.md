# タスク計画書: 実験記録ステータスプルダウン化と確認ダイアログ追加

## メタデータ
- **作成日時**: 2026-08-04 16:17
- **タスクID**: status-select-confirm-dialog
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

実験作業者メニューの実験記録タブ内の「作業中情報バー（workStatusBar）」にある「作業中」Tagを状態選択プルダウン（Select）に変更する。また、不確かさ付与の確認ダイアログを Popconfirm から小さい Modal に変更する。

## 変更仕様

### 1. workStatusBar のステータス Tag → Select プルダウン化

**対象ファイル**: `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`（line 2962〜3013）

**現状**: 緑背景バー内に `<Tag color="success">作業中</Tag>` が表示されている

**変更後**:
- 「作業中」Tagを `<Select>` コンポーネントに変更
- デフォルト値: `0`（初期状態）
- 選択肢:
  | code | label |
  |------|-------|
  | 0 | 初期状態 |
  | 1 | 準備状態 |
  | 2 | 準備完了状態 |
  | 3 | 動作状態 |
  | 4 | 休止状態 |
  | 5 | 終状態 |
  | 6 | 異常終了状態 |

**背景色の変更ロジック**:
- `5`（終状態）選択時 → グレーアウト背景（`#f5f5f5`、ボーダー `#d9d9d9`）
- `6`（異常終了状態）選択時 → 赤背景（`#fff1f0`、ボーダー `#ffa39e`）
- その他（デフォルト）→ 緑背景（`#f6ffed`、ボーダー `#b7eb8f`）

**useState 追加**:
```typescript
const [selectedWorkStatus, setSelectedWorkStatus] = useState<number>(0);
```

### 2. 不確かさ付与確認ダイアログの変更

**対象ファイル**: `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx`

**現状**: `<Popconfirm>` による小さいポップアップ確認

**変更後**: Ant Design の `<Modal>` による確認ダイアログ
- タイトル: 「ステータスを変更しますか？」
- ボタン: 「キャンセル」「保存」
- サイズ: 小（width: 380）

## 実装ステップ

- [ ] DataRecordDialog.tsx の workStatusBar を修正（Select + 背景色切り替え）
- [ ] UncertaintyCriteriaSelectorPanel.tsx の Popconfirm を Modal に変更
- [ ] 動作確認

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - workStatusBar 修正
2. `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx` - Popconfirm → Modal

## 承認記録
- **計画書提示日時**: 2026-08-04 16:17
