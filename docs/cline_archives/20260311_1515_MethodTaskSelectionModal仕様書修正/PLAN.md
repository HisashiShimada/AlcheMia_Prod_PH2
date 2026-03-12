# タスク計画書: MethodTaskSelectionModal仕様書修正

## メタデータ
- **作成日時**: 2026-03-11 17:15
- **タスクID**: MethodTaskSelectionModal仕様書修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`docs/design/ui/experiment_worker/ui_method_task_selection_modal.md` の仕様書をソースコード（`frontend/src/components/ExperimentWorker/MethodTaskSelectionModal.tsx`）と照合した結果、7件の差分が見つかった。仕様書をソースコードの実装と一致するよう修正する。

## 目的と期待される成果

- [ ] 仕様書がソースコードの実装と一致した状態になる
- [ ] 開発者が仕様書を参照した際に正確な情報を得られる

## 実装ステップ

### Step 1: Section 3 Props定義に `methods` プロパティを追加
- [ ] `methods: Method[]` プロパティを Props インターフェースに追加
- [ ] 「重要な前提条件」の説明を更新

### Step 2: Section 5.1 型定義の説明を修正
- [ ] `Method`、`Task`、`TaskStatus` が `@/types/experimentWorker` からインポートされることを明記
- [ ] ローカル定義のように見える記述を修正

### Step 3: Section 5.2 データソースの説明を全面修正
- [ ] 内部でのデータ取得設計の記述を削除
- [ ] propsでメソッド一覧を受け取る設計に書き直す
- [ ] `allTasks` の依存配列を `projectData` → `methods` に修正

### Step 4: Section 5 or 7 に `statusOptions` の定義を追加
- [ ] `statusOptions` 定数の定義をソースコードと対応する箇所に追加

### Step 5: Section 8.1 列定義のサンプルコードを修正
- [ ] `Tag` コンポーネントに `style={{ margin: 0 }}` を追加

### Step 6: Section 13.2 の不完全なセクションを完成させる
- [ ] 途中で切れている `### 13.2 他のコンポー` を完成させる

## 変更ファイル

1. `docs/design/ui/experiment_worker/ui_method_task_selection_modal.md` - 7件の差分を修正

## リスク

| リスク | 対策 |
|--------|------|
| 修正漏れ | ステップごとに細かく修正・確認 |
| 記述の矛盾 | 各修正後にソースコードと照合確認 |

## 承認記録
- **承認日時**: 2026-03-11 17:15
