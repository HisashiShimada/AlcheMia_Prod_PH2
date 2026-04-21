# タスク計画書: MAIMLファイルパス解決修正（フロントエンドのsourceS3Key生成問題）

## メタデータ
- **作成日時**: 2026-04-20 09:45
- **タスクID**: maiml-path-fix
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

`a0718dc5.../projects/Raman_test2/Raman.maiml/Raman.maiml` というパスで保存されたMAIMLファイルにエディタでアクセスすると、Methodタブが表示されず単体メソッド扱いになる。

原因は `ProjectManagement.tsx` が以下のように**命名規則決め打ち**でS3パスを組み立てているため。

```typescript
// 現状（問題あり）
const sourceS3Key = `${orgId}/projects/${selectedProject.name}/${selectedProject.name}.maiml`;
// → a0718dc5.../projects/Raman_test2/Raman_test2.maiml  ← 存在しない
```

実際のS3ファイルは `projects/Raman_test2/Raman.maiml/Raman.maiml` に存在するが、
フロントエンドは `projects/Raman_test2/Raman_test2.maiml` を取得しようとして404になり、
`maimlContent = null` のままエディタが起動 → 空の単体メソッドエディタが表示される。

## 根本原因

| 箇所 | 状況 |
|------|------|
| バックエンド `getProjectMaiml` | `project_uuid → file_metadata → 実際の file_key` の正しいルックアップ済み |
| フロントエンド `ProjectManagement.tsx` | `${orgId}/projects/${name}/${name}.maiml` の命名規則決め打ち（**ここが問題**）|

## 目的と期待される成果

- [ ] プロジェクト名≠MAIMLファイル名でも編集画面が正しく開く
- [ ] Methodタブが正常に表示される
- [ ] 既存の正常なプロジェクト（名前が一致）への影響なし

## 修正方針

### 方針A（採用）: プロジェクト一覧APIに `maimlFileKey` を追加

バックエンドのプロジェクト一覧レスポンスに実際のMAIMLファイルキーを含め、フロントエンドはそれを使用する。

**メリット**: 
- フロントエンドがパス構築ロジックを持たなくて済む
- 既存の `file_metadata` ルックアップ機構を再利用
- `ExperimentWorker` 系の同様の箇所も統一的に修正可能

**デメリット**: 
- プロジェクト一覧APIのクエリに join が増える（軽微）

### 方針B（不採用）: エディタ起動前に専用APIを呼ぶ

追加API呼び出しが必要で、レイテンシが増える。

## 実装ステップ

### Phase 1: バックエンド — プロジェクト一覧に maimlFileKey を追加

- [ ] `backend/src/services/projectService.ts`
  - プロジェクト一覧取得クエリに `file_metadata` との LEFT JOIN を追加
  - `.maiml` ファイルの `file_key` を `maiml_file_key` として取得
  - レスポンスマッピングに `maimlFileKey: row.maiml_file_key || null` を追加

### Phase 2: フロントエンド — 型定義に maimlFileKey を追加

- [ ] `frontend/src/types/project.ts`
  - `Project` インターフェースに `maimlFileKey?: string | null` を追加

### Phase 3: フロントエンド — ProjectManagement.tsx を修正

- [ ] `frontend/src/components/project/ProjectManagement.tsx`
  - `sourceS3Key` の生成箇所（3箇所）を `maimlFileKey` 優先に修正
  - フォールバック: `maimlFileKey` が null の場合は従来の命名規則パスを維持

### Phase 4: フロントエンド — ExperimentWorker 系の修正（同様の問題あり）

- [ ] `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`
- [ ] `frontend/src/components/ExperimentWorker/ProgressCheckTable.tsx`
  - `path: \`projects/${projectName}/${projectName}.maiml\`` の箇所を確認・修正

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/projectService.ts` | プロジェクト一覧クエリに maiml_file_key を追加 |
| `frontend/src/types/project.ts` | Project 型に maimlFileKey を追加 |
| `frontend/src/components/project/ProjectManagement.tsx` | sourceS3Key 生成3箇所を修正 |
| `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` | path 生成を修正（要確認） |
| `frontend/src/components/ExperimentWorker/ProgressCheckTable.tsx` | path 生成を修正（要確認） |

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| maiml_file_key が null の場合のフォールバック漏れ | 高 | 必ず既存ロジックをフォールバックとして維持 |
| LEFT JOIN でパフォーマンス低下 | 低 | file_metadata の project_uuid インデックスを確認 |
| ExperimentWorker 系の修正が不完全 | 中 | InstructionConfirmationTab / ProgressCheckTable を調査後に判断 |

## テスト計画

- [ ] プロジェクト名 ≠ MAIMLファイル名のプロジェクト（Raman_test2）で編集画面が開く
- [ ] Methodタブが正常に表示される
- [ ] プロジェクト名 = MAIMLファイル名の既存プロジェクトで動作変わらず
- [ ] maiml_file_key が null のプロジェクト（MAIMLファイルなし）でエラーなし

## 承認記録
- **計画書提示日時**: 2026-04-20 09:45
- **承認日時**: 
- **承認者コメント**: 
