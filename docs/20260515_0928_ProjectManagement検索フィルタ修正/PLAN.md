# タスク計画書: ProjectManagement検索窓フィルタリング修正

## メタデータ
- **作成日時**: 2026-05-15 09:28
- **タスクID**: projectmanagement-search-filter-fix
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

ProjectManagement画面の検索窓に「Q」など入力した際、プロジェクト名に該当文字が含まれていないプロジェクトも検索結果に表示される問題を修正する。

## 目的と期待される成果

### 目的
検索窓のフィルタリング対象を「画面に表示されている情報」かつ「ドロップダウンフィルタがない項目」に限定し、直感的な検索体験を提供する。

### 期待される成果
- [ ] 検索窓で検索した際に、プロジェクト名・説明・オーナー名のみがフィルタリング対象となる
- [ ] ステータス名（「計画中」「実行中」など）の部分一致で意図しないプロジェクトが表示されなくなる
- [ ] チェックアウト状態ラベルの文字列で意図しないプロジェクトが表示されなくなる

## 問題の詳細

### 原因

`frontend/src/components/project/ProjectManagement.tsx` の `filteredProjects` useMemo内（278-291行目）にて、以下の項目が検索対象に含まれており、意図しないマッチが発生している。

```typescript
// 問題のあるコード（抜粋）
const matchesSearch =
  searchQuery === '' ||
  (project.id ?? '').toLowerCase().includes(q) ||           // ← 内部ID（非表示）
  (project.name ?? '').toLowerCase().includes(q) ||
  (project.folderName ?? '').toLowerCase().includes(q) ||    // ← nameと重複
  (project.description ?? '').toLowerCase().includes(q) ||
  (project.owner ?? '').toLowerCase().includes(q) ||         // ← オーナーID（内部コード）
  (project.department ?? '').toLowerCase().includes(q) ||    // ← 部門CDかつドロップダウンあり
  ((project.statusName ?? '').toLowerCase().includes(q)) ||  // ← ドロップダウンあり（主な問題箇所）
  checkoutStatusLabel.toLowerCase().includes(q) ||           // ← ドロップダウンあり
  (project.createdAt ?? '').toLowerCase().includes(q) ||     // ← 日時（検索不要）
  (project.updatedAt ?? '').toLowerCase().includes(q) ||     // ← 日時（検索不要）
  (project.tags ?? []).some((tag: string) => tag.toLowerCase().includes(q));  // ← 未実装
```

### 具体的な問題例
- 「Q」「計」と検索 → ステータス名「プロジェクト**計**画中」が一致
- 「行」と検索 → ステータス名「タスク実**行**中」「タスク実**行**待ち」が一致
- 「待」と検索 → チェックアウト状態「チェックイン待ち」が一致

## 実装ステップ

### Phase 1: 修正実装
- [ ] `frontend/src/components/project/ProjectManagement.tsx` の `filteredProjects` useMemo内のフィルタリングロジックを修正

### Phase 2: 動作確認（手動テスト）
- [ ] ステータス名の一部文字（「計」「行」「待」など）で検索した際に、プロジェクト名に含まれていないプロジェクトが表示されないことを確認
- [ ] プロジェクト名で検索できることを確認
- [ ] オーナー名で検索できることを確認
- [ ] 説明文で検索できることを確認

## 変更ファイル

### 修正
1. `frontend/src/components/project/ProjectManagement.tsx` - 検索フィルタリングロジックの修正

## 修正内容

### 修正前
```typescript
// 検索クエリでフィルタリング - すべての項目を対象（statusNameも含む）
const q = searchQuery.toLowerCase();
const matchesSearch =
  searchQuery === '' ||
  (project.id ?? '').toLowerCase().includes(q) ||
  (project.name ?? '').toLowerCase().includes(q) ||
  (project.folderName ?? '').toLowerCase().includes(q) ||
  (project.description ?? '').toLowerCase().includes(q) ||
  (project.owner ?? '').toLowerCase().includes(q) ||
  (project.department ?? '').toLowerCase().includes(q) ||
  ((project.statusName ?? '').toLowerCase().includes(q)) ||
  checkoutStatusLabel.toLowerCase().includes(q) ||
  (project.createdAt ?? '').toLowerCase().includes(q) ||
  (project.updatedAt ?? '').toLowerCase().includes(q) ||
  (project.tags ?? []).some((tag: string) => tag.toLowerCase().includes(q));
```

### 修正後
```typescript
// 検索クエリでフィルタリング - 一覧表示項目かつドロップダウンフィルタなしの項目のみ
// 対象: プロジェクト名、説明、オーナー名
const q = searchQuery.toLowerCase();
const matchesSearch =
  searchQuery === '' ||
  (project.name ?? '').toLowerCase().includes(q) ||
  (project.description ?? '').toLowerCase().includes(q) ||
  (project.ownerName ?? '').toLowerCase().includes(q);
```

### 除外した項目と理由

| 項目 | 除外理由 |
|------|---------|
| `project.id` | 内部ID（画面非表示） |
| `project.folderName` | `project.name` と同値のため重複 |
| `project.owner` | オーナーID（内部コード、画面非表示）。オーナー名 `ownerName` で検索可能 |
| `project.department` | 部門CD（内部コード）かつ部門ドロップダウンフィルタが別途存在 |
| `project.statusName` | ステータスドロップダウンフィルタが別途存在（本バグの主要因） |
| `checkoutStatusLabel` | チェックアウト状態ドロップダウンフィルタが別途存在 |
| `project.createdAt` | 日時文字列での検索は実用性が低い |
| `project.updatedAt` | 日時文字列での検索は実用性が低い |
| `project.tags` | タグ機能が未実装（常に空配列） |

### 追加した項目と理由

| 項目 | 追加理由 |
|------|---------|
| `project.ownerName` | 一覧にオーナー名が表示されており、名前で検索したいユースケースあり |

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| onerNameがundefinedの場合に検索が壊れる | 低 | 低 | `?? ''` でnullish coalescingを使用 |
| 既存の検索挙動への依存（意図してステータス名で検索していたユーザー） | 低 | 低 | ステータスはドロップダウンフィルタで代替可能 |

## テスト計画

### 手動テスト

#### 修正後に意図しない検索結果が出ないことの確認
- [ ] 「計」と検索 → プロジェクト名/説明/オーナー名に「計」がないプロジェクトが表示されないこと
- [ ] 「行」と検索 → 同上
- [ ] 「待」と検索 → 同上
- [ ] 「中」と検索 → 同上

#### 正常な検索が動作することの確認
- [ ] プロジェクト名の一部で検索 → 一致するプロジェクトが表示されること
- [ ] プロジェクト名の全体で検索 → 一致するプロジェクトが表示されること
- [ ] オーナー名の一部で検索 → 一致するプロジェクトが表示されること
- [ ] 説明文の一部で検索 → 一致するプロジェクトが表示されること
- [ ] 検索窓を空にする → 全プロジェクトが表示されること
- [ ] ドロップダウンフィルタと組み合わせて検索 → 両方のフィルタが正常に機能すること

## 承認記録

- **計画書提示日時**: 2026-05-15 09:28
- **承認日時**: 2026-05-15 09:31
- **承認者コメント**: 承認。実装を進めてください。

## 実施記録

### 実施日時
開始: 2026-05-15 09:31  
完了: 2026-05-15 09:32

### 変更内容
`frontend/src/components/project/ProjectManagement.tsx` の `filteredProjects` useMemo内（278-291行目）を修正。

**修正前**: 12項目を検索対象（project.id / project.name / project.folderName / project.description / project.owner / project.department / project.statusName / checkoutStatusLabel / project.createdAt / project.updatedAt / project.tags）

**修正後**: 3項目のみを検索対象（project.name / project.description / project.ownerName）

### 最終的な成果物
- [x] 検索窓で検索した際に、プロジェクト名・説明・オーナー名のみがフィルタリング対象となる
- [x] ステータス名（「計画中」「実行中」など）の部分一致で意図しないプロジェクトが表示されなくなる
- [x] チェックアウト状態ラベルの文字列で意図しないプロジェクトが表示されなくなる
