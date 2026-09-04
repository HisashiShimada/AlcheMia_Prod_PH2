# タスク計画書: 名前空間管理ツリー グループ追加後リフレッシュ対応

## メタデータ

- **作成日時**: 2026-09-04 11:00
- **タスクID**: 20260904_1100_名前空間管理ツリーグループ追加後リフレッシュ対応
- **優先度**: 中
- **推定工数**: 1時間

---

## 1. タスク概要

### 問題

`ExperimentAdminMenu` のタブ5（グループ管理 / `GroupManagementPanel`）でグループを新規追加しても、タブ4（名前空間管理 / `UncertaintyManagement`）の左側の組織ツリーに追加したグループが反映されない。F5（フルリロード）するまで表示されない。

### 根本原因

`ExperimentAdminMenu.tsx` は `display:none` 方式で**全タブを常時マウント**している（タブ切り替え時にアンマウント・再マウントが発生しない）。そのため、`UncertaintyManagement` の組織グループ取得 `useEffect` は**初回マウント時の1回のみ**実行され、以降はタブを切り替えても再実行されない。

```
useEffect(() => {
  getOrganizationGroups()...  // 初回のみ実行
}, [user?.id]);  // user?.id が変わらない限り再実行されない
```

---

## 2. 修正方針

**タブ4がアクティブになるたびに `UncertaintyManagement` の組織ツリーを再取得する。**

- タブ切り替えのたびにデータ取得するのが正しい設計（ユーザーが指摘）
- `selectedNsKey`（現在の選択ノード）は維持する（リセットしない）

### 実装方法

1. `ExperimentAdminMenu.tsx` にタブ4のアクティブ化タイムスタンプ state を追加し、タブ切り替え時に更新して `UncertaintyManagement` に prop として渡す
2. `UncertaintyManagement.tsx` に `tabActivatedAt?: number` prop を追加し、その変化をトリガーとして組織ツリーを再取得する（`selectedNsKey` はリセットしない）

---

## 3. 影響範囲

- **変更対象コンポーネント**: フロントエンド 2ファイルのみ
- **バックエンド変更**: なし
- **データベース変更**: なし
- **他タブへの影響**: タブ4専用の変更のため他タブには影響なし

### 副次的な考慮点

- `tabActivatedAt` が初回 `undefined` から数値になるときも `useEffect` が発火するが、この時点は初回マウント直後に `user?.id` の `useEffect` が既に実行済みのため、**2回 API コールが走る可能性がある**。
  - 対策: `useEffect` 内で `tabActivatedAt` が `undefined` の場合はスキップする分岐を設ける（初回マウント時の `user?.id` の `useEffect` に処理を任せる）

---

## 4. 実装ステップ

- [ ] タスク計画書作成（本ファイル）
- [ ] `ExperimentAdminMenu.tsx` 修正
  - [ ] `tabActivatedAt` state（`number | undefined` 型）を追加
  - [ ] `handleTabChange` でタブ4に切り替えた際に `Date.now()` をセット
  - [ ] `<UncertaintyManagement>` に `tabActivatedAt` prop を渡す
- [ ] `UncertaintyManagement.tsx` 修正
  - [ ] `UncertaintyManagementProps` に `tabActivatedAt?: number` を追加
  - [ ] 関数引数に `tabActivatedAt` を追加
  - [ ] 組織グループ取得用 `useEffect` を新規追加（依存配列: `[tabActivatedAt]`）
    - `tabActivatedAt` が `undefined` のときはスキップ
    - `selectedNsKey` はリセットしない（`setOrgGroups` のみ更新）
    - 既存の `useEffect([user?.id])` はそのまま維持（初回マウント用）
- [ ] 動作確認

---

## 5. 変更ファイル一覧

| # | ファイルパス | 変更内容 |
|---|------------|---------|
| 1 | `frontend/src/components/menus/ExperimentAdminMenu.tsx` | `namespaceTabActivatedAt` state 追加、`handleTabChange` 修正、`UncertaintyManagement` への prop 追加 |
| 2 | `frontend/src/components/uncertainty/UncertaintyManagement.tsx` | `tabActivatedAt` prop 追加、タブアクティブ時の組織グループ再取得 `useEffect` 追加 |

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| タブ切り替えのたびに不要な API コールが走り続ける | 低 | 低 | `tabActivatedAt` の変化時のみトリガーされるため、同じタブ内での操作では発火しない |
| 初回 `undefined` → 数値 の変化で2回 API コールが走る | 低 | 高 | `useEffect` 内で `tabActivatedAt === undefined` の場合は早期リターン |
| 再取得中に選択ノードが消える（追加済みグループが削除された場合等） | 低 | 低 | 再取得後は `selectedNsKey` をリセットしないため、存在しないキーが残ることがある。既存の表示ロジックに影響しないためそのまま許容 |

---

## 7. テスト計画

### 手動テスト

- [ ] タブ5（グループ管理）でグループを追加 → タブ4（名前空間管理）に切り替え → 左ツリーに追加したグループが表示されることを確認
- [ ] タブ4で任意のノードを選択した状態でタブ5に切り替え → タブ4に戻ったとき、選択状態が維持されていることを確認
- [ ] 初回ロード時（F5後）に既存の動作が変わっていないことを確認
- [ ] タブ4内での操作（ツリー選択・用語追加など）が引き続き正常に動作することを確認

---

## 8. 承認記録

- **計画書提示日時**: 2026-09-04 11:00
- **承認日時**: 2026-09-04 11:00
- **承認者コメント**: 承認します。

## 9. 実施記録

### 実施日時
開始: 2026-09-04 11:00
完了: 2026-09-04 11:15

### 最終的な成果物
- [x] `ExperimentAdminMenu.tsx` — `namespaceTabActivatedAt` state 追加、`handleTabChange` 修正、`UncertaintyManagement` に prop 追加
- [x] `UncertaintyManagement.tsx` — `tabActivatedAt` prop 追加、タブアクティブ時の組織グループ再取得 `useEffect` 追加
- [x] TypeScript 型チェック（`tsc --noEmit`）エラーなし確認
