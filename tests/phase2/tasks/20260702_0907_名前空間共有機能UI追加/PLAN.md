
# タスク計画書: 名前空間共有機能UI追加

## メタデータ
- **作成日時**: 2026-07-02 09:07
- **タスクID**: 名前空間共有機能UI追加
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

名前空間管理タブの左側階層ツリーおよび共有機能をロール別に拡張する。

- **部署代表者**：自分の部署・配下チーム・メンバーのPrefixと用語を閲覧し、部署まで共有可能
- **チーム代表者**：自分のチーム・メンバーのPrefixと用語を閲覧し、チームへ共有可能
- **システム管理者**：組織まで閲覧・共有可能

## 実装ステップ

### Phase 1: CURRENT_USER_ROLE に sys_admin ロール追加
- [ ] `NamespaceMain.tsx` の `UserNsRole` 型に `sys_admin` を追加
- [ ] `filterTreeForUser` に sys_admin ケースを追加（全ツリー表示）

### Phase 2: ShareScopeModal コンポーネント新規作成
- [ ] `frontend/src/components/namespace/ShareScopeModal.tsx` 新規作成
- [ ] ロール別に選択可能ノードを制限するツリーを実装
- [ ] 「共有する」確認フロー実装

### Phase 3: NamespaceMain.tsx の共有ボタン変更
- [ ] 既存「組織に共有」ボタンを「共有する」ボタンに変更
- [ ] ShareScopeModal を呼び出すように変更
- [ ] モーダルで選択した共有先に用語をコピーする処理を実装

## 変更ファイル
1. `frontend/src/components/namespace/NamespaceMain.tsx` - ロール追加・共有ボタン変更
2. `frontend/src/components/namespace/ShareScopeModal.tsx` - 新規作成

## 承認記録
- **計画書提示日時**: 2026-07-02 09:07
- **承認日時**: 
