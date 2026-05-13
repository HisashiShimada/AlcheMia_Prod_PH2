# タスク計画書: 編集ボタンのチェックイン状態制限

## メタデータ
- **作成日時**: 2026-03-16 18:02
- **タスクID**: 編集ボタンチェックイン状態制限
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
プロジェクト管理画面の「編集」ボタンを、チェックイン状態（`isProjectCheckedOut === false`）の時のみ押せるように制限する。チェックアウト中（`isProjectCheckedOut === true`）は無効化する。

## 目的と期待される成果
- [ ] チェックアウト中は編集ボタンを無効化し、誤操作を防止する
- [ ] ツールチップでなぜ押せないかをユーザーに伝える

## 実装ステップ
- [ ] `ProjectManagement.tsx` の編集ボタンの `disabled` 条件を変更する

## 変更ファイル
1. `frontend/src/components/project/ProjectManagement.tsx` - 編集ボタンの disabled 条件追加

## 現状の実装
```tsx
<Button
  type="primary"
  icon={<EditOutlined />}
  onClick={handleEditButtonClick}
  disabled={!selectedProject}
>
  {t('projectManagement.edit')}
</Button>
```

## 変更後の実装
```tsx
<Button
  type="primary"
  icon={<EditOutlined />}
  onClick={handleEditButtonClick}
  disabled={!selectedProject || isProjectCheckedOut}
  title={isProjectCheckedOut ? 'チェックイン状態でのみ編集できます' : undefined}
>
  {t('projectManagement.edit')}
</Button>
```

## 承認記録
- **計画書提示日時**: 2026-03-16 18:02
