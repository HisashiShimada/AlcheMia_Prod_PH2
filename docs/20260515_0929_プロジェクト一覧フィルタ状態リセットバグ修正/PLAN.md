# タスク計画書: プロジェクト一覧フィルタ状態リセットバグ修正

## メタデータ
- **作成日時**: 2026-05-15 11:00
- **タスクID**: 20260515_0929_プロジェクト一覧フィルタ状態リセットバグ修正
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

プロジェクト一覧画面で並べ替え・フィルタを設定後にペトリネット編集（PetriNetEditorScreen）を開いて閉じると、フィルタ・ソート状態がすべて初期値に戻るバグを修正する。

## 原因

`ExperimentAdminMenu.tsx` では、ペトリネット編集を開く際に `if (showEditor && editorProjectParams) { return <PetriNetEditorScreen ... /> }` という条件分岐で画面を切り替えている。  
この方式では `ProjectManagement` コンポーネントが**完全にアンマウント**され、編集を閉じた際に**再マウント**されることで、すべての `useState` が初期値にリセットされる。

`selectedProjectId` は `sessionStorage` に保存されているため再マウント後も復元されるが、フィルタ・ソート状態は sessionStorage に保存していないためリセットされる。

## 目的と期待される成果

- [ ] ペトリネット編集を開いて閉じた後も、設定済みのフィルタ・並べ替え状態が保持される
- [ ] 既存の `selectedProjectId` sessionStorage 保存パターンと一貫した実装

## 実装ステップ

### Phase 1: フィルタ・ソート状態を sessionStorage に保存・復元

対象ファイル: `frontend/src/components/project/ProjectManagement.tsx`

- [ ] 各フィルタ・ソート状態の初期値を sessionStorage から復元するよう変更
  - `searchQuery`（キー: `projectManagement_searchQuery`）
  - `ownerFilter`（キー: `projectManagement_ownerFilter`）
  - `checkoutFilter`（キー: `projectManagement_checkoutFilter`）
  - `projectStatusFilter`（キー: `projectManagement_projectStatusFilter`）
  - `departmentFilter`（キー: `projectManagement_departmentFilter`）
  - `sortBy`（キー: `projectManagement_sortBy`）
  - `sortOrder`（キー: `projectManagement_sortOrder`）
- [ ] 各フィルタ・ソート状態が変化した際に sessionStorage へ保存する `useEffect` を追加

## 変更ファイル
1. `frontend/src/components/project/ProjectManagement.tsx` - フィルタ・ソート状態の sessionStorage 保存・復元

## 影響範囲
- `ProjectManagement` コンポーネントのみ
- タブ切り替え・ページリロードをまたいでもフィルタが保持されるようになる（UX向上）

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| departmentFilter に古い部署CDが残り、選択不可能なフィルタが残存する | 低 | 低 | 部署一覧に存在しない値の場合でも表示上問題なし（フィルタ結果が0件になるだけ） |
| sortBy の値に不正な値が入る可能性 | 低 | 低 | 型アサーション時に有効値か確認し、無効な場合はデフォルト値にフォールバック |

## テスト計画

- [ ] フィルタを設定 → ペトリネット編集を開く → 閉じる → フィルタが保持されていることを確認
- [ ] ソート変更 → ペトリネット編集を開く → 閉じる → ソートが保持されていることを確認
- [ ] ページリロード後もフィルタが保持されていることを確認（セッション中）
- [ ] 各フィルタを「すべて」に戻した場合、sessionStorage の値も更新されることを確認

## 承認記録

- **計画書提示日時**: 2026-05-15 11:00
- **承認日時**: 2026-05-15 11:05
- **承認者コメント**: 実装をお願いします

## 実施記録

### 実施日時
開始: 2026-05-15 11:08  
完了: 2026-05-15 11:10

### 計画からの変更点
（記入）

### 最終的な成果物
- [ ] `frontend/src/components/project/ProjectManagement.tsx` 修正完了
