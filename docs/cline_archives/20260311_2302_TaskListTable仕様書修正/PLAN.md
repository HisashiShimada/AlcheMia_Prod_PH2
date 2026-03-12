# タスク計画書: TaskListTable仕様書修正

## メタデータ
- **作成日時**: 2026-03-11 23:02
- **タスクID**: TaskListTable仕様書修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`docs/design/ui/experiment_worker/ui_task_list_table.md` の内容をソースコードの実装と一致するよう修正する。
調査の結果、以下9箇所の差分が確認されており、各差分を個別に修正する。

## 目的と期待される成果

- [ ] 仕様書がソースコードの実装と正確に一致した状態になる
- [ ] `readOnly` プロパティが仕様書に反映される
- [ ] TaskStatus型が実際の実装（4種類）と一致する
- [ ] Task型に不足しているフィールドが追加される
- [ ] ステータス表示テーブルが実際のコードと一致する

## 実装ステップ

### Step 1: Props定義の修正（セクション3）
- [ ] `readOnly?: boolean` を Props定義に追加
- [ ] Props詳細テーブルに `readOnly` 行を追加

### Step 2: アクションボタンイベントの修正（セクション5.3）
- [ ] 強制終了ボタンの有効条件に `readOnly` が `false` であることを追加
- [ ] ボタンの有効/無効ロジックのコードブロックに `readOnly` 条件を追記

### Step 3: TaskStatus型の修正（セクション8.3）
- [ ] `'started'`（開始）を削除
- [ ] `'suspended'`（中断）を削除
- [ ] 4種類のみに修正

### Step 4: ステータス表示テーブルの修正（セクション7.2.2）
- [ ] `started`（開始・青色）の行を削除
- [ ] `suspended`（中断・灰色）の行を削除

### Step 5: Task型の修正（セクション8.1）
- [ ] `taskName: string` を追加
- [ ] `assignedUserId?: string` を追加
- [ ] `assignedUserName?: string` を追加
- [ ] `createdAt?: string` を追加
- [ ] `updatedAt: string` を追加（楽観的ロック用に必須フィールドであることを注記）
- [ ] `transitionStatuses?: TransitionStatus[]` を追加

### Step 6: ページネーション設定の修正（セクション9.1）
- [ ] `position: ['bottomRight']` の設定を削除
- [ ] ページネーション特徴の「右下に配置」の記述を修正

### Step 7: 問題確認カラムタイトルの修正（セクション7.1、7.2.4）
- [ ] カラム一覧テーブルの「問題確認」カラムの説明に多言語対応を明記
- [ ] セクション7.2.4の問題確認ボタンのtitle説明を更新

### Step 8: getStatusLabel() 関数定義の修正（セクション13.1）
- [ ] `getStatusLabel()` の説明を「filteredTasks useMemo内にインライン定義」と修正

### Step 9: 変更履歴の追記
- [ ] 変更履歴テーブルに今回の修正バージョンを追記

## 変更ファイル
1. `docs/design/ui/experiment_worker/ui_task_list_table.md` - 上記Step 1〜9の修正

## 差分サマリ

| No | セクション | 仕様書の記載 | 実際のコード |
|----|-----------|------------|------------|
| 1 | 3 Props定義 | `readOnly`未記載 | `readOnly?: boolean`あり |
| 2 | 5.3 アクションボタン | readOnlyによる無効化未記載 | readOnly時も強制終了無効 |
| 3 | 8.3 TaskStatus型 | `started`, `suspended`含む6種類 | 4種類のみ |
| 4 | 7.2.2 ステータス表示 | `started`=青, `suspended`=灰含む | 4種類のみ |
| 5 | 8.1 Task型 | `taskName`, `updatedAt`等が未記載 | 多数の追加フィールドあり |
| 6 | 9.1 ページネーション | `position: ['bottomRight']`あり | 設定なし |
| 7 | 7.2.4 問題確認カラム | 多言語対応の言及なし | t関数でタイトルも多言語 |
| 8 | 13.1 特記事項 | 独立した内部関数として記載 | useMemo内インライン定義 |

## 承認記録
- **計画書提示日時**: 2026-03-11 23:02
- **承認日時**: 2026-03-11 23:03
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-03-11 23:03
完了: 2026-03-11 23:08

### 計画からの変更点
なし

### 最終的な成果物
- [x] ui_task_list_table.md 修正完了（Step 1〜9 すべて実施）
