# タスク計画書: 新規プロジェクト作成ダイアログ チーム選択プルダウン追加

## メタデータ
- **作成日時**: 2026-07-02 15:23
- **タスクID**: project-team-select
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

新規プロジェクト作成ダイアログにチーム選択プルダウンを追加する。
プルダウンにはログインユーザーが所属するチーム一覧を表示し、選択したチームのメンバーのみプロジェクトにアクセスできるようにする。

## 目的と期待される成果
- [ ] 新規プロジェクト作成ダイアログにチーム選択プルダウンが表示される
- [ ] プルダウンは任意項目（未選択可）
- [ ] 初期値は「選択なし（制限なし）」
- [ ] チーム一覧はAPIから取得（フォールバックとしてダミーデータ使用）

## 仕様

### アクセス制御の意味
- **未選択**：部署全員が閲覧可能（制限なし）
- **チーム選択**：そのチームのメンバーのみ閲覧可能

### プルダウン表示内容
- チーム名のみ（部署名なし）
- 先頭に「選択なし（制限なし）」を固定で表示
- データソース：`/api/v1/department-units/my-teams`

## 実装ステップ

### Phase 1: 型定義の更新
- [ ] `frontend/src/types/project.ts` の `CreateProjectData` に `teamId?: string` を追加

### Phase 2: CreateProjectModal の修正
- [ ] `Select` コンポーネント（Ant Design）の import 追加
- [ ] チーム一覧の state 追加（`teams`, `teamsLoading`）
- [ ] モーダルオープン時に `/api/v1/department-units/my-teams` を呼び出し
- [ ] フォーム末尾にチーム選択 `Form.Item` を追加
- [ ] 送信データに `teamId` を含める
- [ ] ヘルプテキスト（Ant Design `Typography.Text` の小文字）を追加

## 変更ファイル
1. `frontend/src/types/project.ts` - `CreateProjectData` に `teamId?: string` 追加
2. `frontend/src/components/project/CreateProjectModal.tsx` - チーム選択プルダウン追加

## 承認記録
- **承認日時**: 2026-07-02 15:23
