# タスク計画書: 不確かさ承認タブ追加

## メタデータ
- **作成日時**: 2026-06-12 15:35
- **タスクID**: uncertainty-approval-tab
- **優先度**: 中
- **推定工数**: 1.5時間

## タスク概要
プロジェクト管理画面の「タスク結果確認」タブの横に「不確かさ承認」タブを追加し、画像のレイアウトで「不確かさ承認レビュー画面」のモックを作成する。

## 目的と期待される成果
- [ ] ProjectManagement.tsx に「不確かさ承認」タブが追加される
- [ ] UncertaintyApprovalTab.tsx モックコンポーネントが作成される
- [ ] フィルタバー（ファイル・担当者・付与日・承認状態）が表示される
- [ ] 一括操作バー（一括承認・差し戻し・承認済みにする）が表示される
- [ ] テーブル（key属性・テンプレート名・付与値・付与者・日時・コメント・承認状態・操作）が表示される
- [ ] モックデータJSONが作成される
- [ ] 翻訳キーが追加される

## 変更ファイル

### 新規作成
1. `docs/20260612_1535_不確かさ承認タブ追加/PLAN.md` - 本計画書
2. `frontend/mock/uncertainty-approval.json` - モックデータ
3. `frontend/src/components/project/UncertaintyApprovalTab.tsx` - 不確かさ承認レビュー画面

### 修正
1. `frontend/src/components/project/ProjectManagement.tsx` - タブ追加
2. `frontend/src/locales/ja.json` - 翻訳キー追加
3. `frontend/src/locales/en.json` - 翻訳キー追加

## 承認記録
- **計画書提示日時**: 2026-06-12 15:35
- **承認日時**: 2026-06-12 15:35
