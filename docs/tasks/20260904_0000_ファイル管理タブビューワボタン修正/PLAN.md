# タスク計画書: ファイル管理タブビューワボタン修正

## メタデータ
- **作成日時**: 2026-09-04 00:00
- **タスクID**: 20260904_0000_ファイル管理タブビューワボタン修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

プロジェクト管理画面のファイル管理タブにある「ビューワー」ボタンを押しても
`ViewRendererDialog` フローティングダイアログが表示されない不具合を修正する。

## 根本原因

`onViewFile` コールバックの接続チェーンが途中で切れているため。

```
FileListTable (ビューワボタン)
  → onViewFile?.(record) を呼び出す
  → ❌ FileManagementTabContent に onViewFile が渡されていない
  → ❌ ProjectManagementInner に handleViewFile ハンドラが未実装
  → ❌ ViewRendererDialog が openDialogs に追加されない
  → ❌ ダイアログが表示されない
```

## 目的と期待される成果

- [ ] ビューワーボタンをクリックすると ViewRendererDialog フローティングダイアログが開く
- [ ] 最大5個まで同時に開ける（既存制限）
- [ ] UIの変更は行わない

## 実装ステップ

- [ ] STEP 1: `FileManagementTabContent.tsx` に `onViewFile` props を追加し `FileListTable` に渡す
- [ ] STEP 2: `ProjectManagementInner.tsx` に `handleViewFile` ハンドラを追加
- [ ] STEP 3: `ProjectManagementInner.tsx` の `FileManagementTabContent` に `onViewFile={handleViewFile}` を渡す
- [ ] STEP 4: 動作確認（型チェック）

## 変更ファイル

1. `frontend/src/components/project/subcomponents/tabs/FileManagementTabContent.tsx` - `onViewFile` props 追加
2. `frontend/src/components/project/ProjectManagementInner.tsx` - `handleViewFile` ハンドラ追加・渡し

## リスク

| リスク | 対策 |
|--------|------|
| ProjectFile 型と FileData 型の互換性 | ProjectModals.tsx で既に ProjectFile を file として渡している実績あり |

## テスト計画

- [ ] ファイル管理タブでビューワーボタン押下 → ダイアログが表示される
- [ ] 複数ファイルのビューワーを開ける（最大5個）
- [ ] 既存のサブネットビューワー機能に影響がない

## 承認記録
- **承認日時**: 2026-09-04 00:00
- **承認者コメント**: ユーザー承認済み（plan → act 切り替え）
