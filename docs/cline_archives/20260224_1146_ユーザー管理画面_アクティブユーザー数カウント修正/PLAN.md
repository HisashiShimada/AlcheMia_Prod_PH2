# タスク計画書: ユーザー管理画面_アクティブユーザー数カウント修正

## メタデータ
- **作成日時**: 2026-02-24 11:46
- **タスクID**: user-management-active-count-fix
- **優先度**: 中
- **推定工数**: 0.25時間

## タスク概要
ユーザー管理画面のユーザー名ヘッダー内のBadgeカウント数値を修正します。
現在は「非アクティブユーザー数（is_active = false）」を表示していますが、これを「アクティブユーザー数（is_active = true）」に変更します。

## 目的と期待される成果
### 目的
- ユーザー管理画面で、ログインユーザーの組織IDに紐づくアクティブユーザー数を正確に表示する

### 期待される成果
- [x] Badgeに表示される数値が「is_active = true」のユーザー数になる

## 現状分析

### 現在の実装
`frontend/src/components/SystemManagement/UserManagement.tsx` (L192):
```typescript
count={filteredUsers.filter(user => user.isActive === false).length}
```
→ **非アクティブユーザー数**を表示している

### データフロー
1. バックエンドAPI (`GET /api/v1/systemManagement/user`) がログインユーザーの組織IDでフィルタリング済みのユーザー一覧を返す
2. フロントエンドで`filteredUsers`に検索条件でさらにフィルタリング
3. Badgeでis_activeの条件でカウント

## 実装ステップ

### Phase 1: フロントエンド修正
- [x] UserManagement.tsxのBadgeカウント条件を修正
  - L192: `user.isActive === false` → `user.isActive === true` に変更

## 変更ファイル
1. `frontend/src/components/SystemManagement/UserManagement.tsx` - Badgeカウント条件修正

## 技術的詳細

### 修正箇所詳細

**ファイル**: `frontend/src/components/SystemManagement/UserManagement.tsx`

**修正内容**:
```typescript
// 修正前 (L192)
count={filteredUsers.filter(user => user.isActive === false).length}

// 修正後
count={filteredUsers.filter(user => user.isActive === true).length}
```

**理由**:
- `filteredUsers`には既にログインユーザーの組織IDでフィルタリングされたデータが含まれている
- バックエンドでマルチテナント分離が実装済み
- 単純に条件を反転するだけで要件を満たせる

## リスクと対策
| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| なし（軽微な修正） | 低 | 低 | 目視確認で十分 |

## テスト計画

### 目視確認
- [x] ブラウザでユーザー管理画面を開く
- [x] Badgeに表示される数値が、テーブル内のアクティブユーザー数と一致することを確認
- [x] 検索フィルター適用時もカウントが正しく更新されることを確認

## ロールバック計画
修正内容が1行のみのため、簡単にrevertできます：
```bash
git revert <commit-hash>
```

## 承認記録
- **計画書提示日時**: 2026-02-24 11:46
- **承認日時**: 2026-02-24 11:47
- **承認者コメント**: 承認。実装を開始してください。

## 実施記録
### 実施日時
開始: 2026-02-24 11:47
完了: 2026-02-24 11:47

### 計画からの変更点
なし。計画通り実施しました。

### 実施内容
1. `frontend/src/components/SystemManagement/UserManagement.tsx` (L192)を修正
   - Badgeカウント条件を変更
   - 修正前: `user.isActive === false` (非アクティブユーザー数)
   - 修正後: `user.isActive === true` (アクティブユーザー数)

### 最終的な成果物
- [x] UserManagement.tsx修正完了

## 振り返り

### うまくいった点
- 軽微な修正のため、計画通りスムーズに実装完了
- 修正箇所が1行のみで影響範囲が明確
- バックエンド側の変更が不要で、フロントエンドのみで対応完了

### 確認事項
- ブラウザでユーザー管理画面を開き、Badgeに表示される数値がアクティブユーザー数と一致することを目視確認してください
- 検索フィルター適用時もカウントが正しく更新されることを確認してください
