# タスク計画書: テンプレート一覧モックデータAPI化

## メタデータ
- **作成日時**: 2026-02-27 20:50
- **タスクID**: template-list-mock-to-api
- **優先度**: 中
- **推定工数**: 0.5時間

---

## 1. タスク概要

`DataRecordDialog.tsx`（実験データ記録ダイアログ）の左サイドバー「テンプレート一覧」が、
`frontend/src/data/projectsData.ts` に定義されたモックデータ（`templatesList`）を参照している。
これを、Props で渡される `transition.templates`（MAIMLファイル解析結果のAPIベースのデータ）に切り替える。

---

## 2. 調査結果

### 2.1 問題のある箇所

**ファイル**: `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`

```typescript
// 128行目: モックデータをインポートしている
import { templatesList } from '@/data/projectsData';

// 145行目: filteredTemplates がモックデータを参照している
const filteredTemplates = useMemo(() => {
  let filtered = templatesList;  // ← ここがモックデータ
  // ...
}, [templateSearchText, selectedTemplateCategory]);
```

### 2.2 モックデータの内容

`templatesList`（`frontend/src/data/projectsData.ts`）には以下の汎用テンプレートが定義されている:
- 材料テンプレート: 金属材料情報、化学試薬情報、複合材料情報
- 条件テンプレート: 温度条件、圧力・雰囲気条件、測定条件
- 結果テンプレート: 物性測定結果、化学分析結果、画像・スペクトルデータ

これらはすべてモックデータであり、実際の実験プロジェクトとは無関係なデータが表示されている。

### 2.3 正しいデータソース

`DataRecordDialogProps` の `transition` プロパティに `templates?: Template[]` が含まれており、
これが実際のトランジションに紐づいたテンプレート一覧（MAIMLファイルから解析されたデータ）である。

```typescript
interface Transition {
  transitionId: string;
  transitionName: string;
  // ...
  templates?: Template[];  // ← これを使うべき
}
```

### 2.4 バックエンドAPI状況

- `GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data?transitionId=xxx`  
  → すでに実装済み（フォーム初期値の復元に使用されている）
- テンプレート一覧自体は `transition.templates` がすでにAPIデータを保持しているため、
  追加のAPI呼び出しは不要

---

## 3. 目的と期待される成果

### 目的
- モックデータ依存を排除し、実際のプロジェクトデータに基づいたテンプレート一覧を表示する
- `templatesList` のインポートを削除してコードの無駄な依存を解消する

### 期待される成果
- [ ] テンプレート一覧に `transition.templates` のデータが表示される
- [ ] `templatesList` のインポートが削除される
- [ ] 検索・カテゴリフィルター機能が引き続き正常動作する
- [ ] `transition.templates` が空または未定義の場合は空配列として扱われる

---

## 4. 実装ステップ

### Step 1: モックデータのインポートを削除
- `DataRecordDialog.tsx` から `import { templatesList } from '@/data/projectsData'` を削除

### Step 2: `filteredTemplates` の参照元を変更
- `let filtered = templatesList;` → `let filtered = transition?.templates ?? [];` に変更
- `useMemo` の依存配列に `transition?.templates` を追加

---

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - モックデータ参照を削除・修正

### 影響を受ける機能
- 実験データ記録ダイアログのテンプレート一覧表示
- テンプレート検索・カテゴリフィルター（ロジックは変わらないため影響なし）

### 変更しないファイル
- `frontend/src/data/projectsData.ts`（他の機能が使用している可能性があるため削除しない）

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `transition.templates` が undefined の場合に空表示になる | 低 | 低 | `?? []` でフォールバック済み |
| 既存の動作確認ができない | 中 | 低 | 変更箇所が2行のみで影響範囲が限定的 |

---

## 7. テスト計画

### 手動テスト
- [ ] 実験データ記録ダイアログを開き、テンプレート一覧に `transition.templates` のデータが表示されること
- [ ] テンプレート名検索が動作すること
- [ ] カテゴリフィルター（材料/条件/結果）が動作すること
- [ ] `transition.templates` が空の場合、テンプレート一覧が空表示になること

---

## 8. 承認記録

- **計画書提示日時**: 2026-02-27 20:50
- **承認日時**: 2026-02-27 20:50
- **承認者コメント**: 実装承認済み

---

## 9. 実施記録

### 実施日時
開始: 2026-02-27 20:50
完了: 2026-02-27 20:53

### 変更内容
- `DataRecordDialog.tsx` の `import { templatesList } from '@/data/projectsData'` を削除
- `filteredTemplates` の `let filtered = templatesList;` → `let filtered: Template[] = transition?.templates ?? [];` に変更
- `useMemo` の依存配列を `[templateSearchText, selectedTemplateCategory]` → `[transition?.templates, templateSearchText, selectedTemplateCategory]` に更新

### 確認事項
- `DataRecordDialog.tsx` 内に `templatesList` の参照が0件であることを確認済み
- `transition?.templates` が正しく参照されていることを確認済み（3箇所）
