# タスク計画書: 定性評価ダイアログ「評価登録確認」タブ統合

## メタデータ
- **作成日時**: 2026-07-16 10:50
- **タスクID**: 20260716_1049_定性評価ダイアログ評価登録確認タブ統合
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

定性評価ダイアログ（EvaluationDialog）の2タブ構成を変更する。
現在の「評価結果確認」タブと「評価を入力」タブを統合し、
「評価登録確認」タブ1つの構成に変更する。
「評価を入力」機能はタブではなく一覧上部のボタンとして残し、
押下時にダイアログで評価入力できるようにする。

## 変更内容

### 変更前
- Tab1: 「📋 評価結果確認」（ResultPanel）
- Tab2: 「✏️ 評価を入力」（InputPanel）

### 変更後
- Tab1: 「📋 評価登録確認」（ResultPanel + 上部に「評価を入力」ボタン）
- ボタン押下 → InputModal（評価入力モーダル）が開く

## 変更ファイル
1. `frontend/src/components/project/EvaluationDialog.tsx` - メイン変更

## 実装ステップ
- [x] タスク計画書作成
- [ ] EvaluationDialog.tsx 実装変更
  - [ ] ResultPanel に allMethods / reviewWaitingTasks props を追加
  - [ ] ResultPanel 内に「評価を入力」ボタンを追加
  - [ ] InputPanel を InputModal としてラップ（ResultPanel 内から開く）
  - [ ] EvaluationDialog メインコンポーネントをタブ1つに変更

## 承認記録
- **承認日時**: 2026-07-16 10:50
