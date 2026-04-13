# タスク計画書: No.8 PropertyViewer「値なし」区別対応 テストシナリオ追加

## メタデータ
- **作成日時**: 2026-04-03 13:24
- **タスクID**: No8-test-scenario-add
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

改善仕様No.8「テンプレート『値なし』表示対応」の実装済み機能に対して、
E2Eテストシナリオ一覧ファイルへのテストシナリオ追加を行う。

対応した実装内容は `docs/改善仕様調査/No.8/result.md` を参照。

## 目的と期待される成果

- [ ] `tests/e2e/test-scenarios/4_experiment_admin.md` の `4-2: MAIML編集（PetriNetEditor）` グループにシナリオ10件を追加する
- [ ] スコープテーブルのシナリオ数を 39件 → 49件 に更新する

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] タスク計画書を `docs/20260403_1324_No8テストシナリオ追加/PLAN.md` に作成

### Phase 2: スコープテーブルの更新
- [ ] `4_experiment_admin.md` の「スコープ内」テーブルの `4-2` 行のシナリオ数を 39件 → 49件 に変更

### Phase 3: シナリオ詳細の追記（4-2-40〜4-2-49）
- [ ] 4-2-40: `value=undefined` → 「未設定」斜体 ＋ ツールチップ表示確認
- [ ] 4-2-41: `value=null` → 「null」斜体 ＋ ツールチップ表示確認
- [ ] 4-2-42: `value=""` → `""(空文字)` ＋ ツールチップ表示確認
- [ ] 4-2-43: `value=0` → 「0」として正しく表示（「未設定」と誤表示しない）確認
- [ ] 4-2-44: `value=false` → `<Tag>false</Tag>` 表示確認
- [ ] 4-2-45: `value=true` → `<Tag>true</Tag>` 表示確認
- [ ] 4-2-46: テンプレートタブ `xsi:type` 未設定 → ツールチップ付き「-」表示確認
- [ ] 4-2-47: テンプレートタブ「説明/単位」未設定 → ツールチップ付き「-」表示確認
- [ ] 4-2-48: テンプレート/データタブが空 → ツールチップ付き「表示するプロパティがありません」確認
- [ ] 4-2-49: StructuredPropertySelector での null/undefined/"" 区別表示確認

### Phase 4: 前提条件の追記
- [ ] 新規シナリオ用の前提条件をシナリオ詳細テーブル直下の「前提条件」セクションに追記

## 変更ファイル

### 修正
1. `tests/e2e/test-scenarios/4_experiment_admin.md`
   - スコープテーブルの `4-2` 行: シナリオ数 39件 → 49件
   - `4-2` シナリオテーブル末尾: 4-2-40〜4-2-49 の10件追加
   - `4-2` 前提条件セクション: 新規シナリオ用前提条件の追記

## テスト観点まとめ

| シナリオID | 観点 | 確認コンポーネント |
|-----------|------|------------------|
| 4-2-40 | `undefined` → 「未設定」ツールチップ | PropertyViewer / PropertyViewerWithSelection |
| 4-2-41 | `null` → 「null」ツールチップ | PropertyViewer / PropertyViewerWithSelection |
| 4-2-42 | `""` → `""(空文字)` ツールチップ | PropertyViewer / PropertyViewerWithSelection |
| 4-2-43 | `0` → 「0」正常表示（falsy誤判定なし） | PropertyViewer / PropertyViewerWithSelection |
| 4-2-44 | `false` → `<Tag>false</Tag>` | PropertyViewer / PropertyViewerWithSelection |
| 4-2-45 | `true` → `<Tag>true</Tag>` | PropertyViewer / PropertyViewerWithSelection |
| 4-2-46 | `xsi:type` 未設定 → ツールチップ「-」 | PropertyViewer / PropertyViewerWithSelection（テンプレートタブ） |
| 4-2-47 | 説明/単位 未設定 → ツールチップ「-」 | PropertyViewer / PropertyViewerWithSelection（テンプレートタブ） |
| 4-2-48 | プロパティ0件 → ツールチップ付きメッセージ | PropertyViewer / PropertyViewerWithSelection |
| 4-2-49 | null/undefined/"" 区別表示 | StructuredPropertySelector |

## リスク

| リスク | 対策 |
|--------|------|
| MAIMLパーサーが `value=""` を `undefined` として扱う場合、4-2-42の再現が困難 | テストデータ作成前にパーサー動作を確認する |
| `value=0`/`value=false` の修正が `PetriNetViewer.tsx` の `templateProperties` 構築まで反映されていない可能性 | 4-2-43/4-2-44 の手動確認で発覚した場合、別タスクとして起票 |

## 承認記録
- **計画書提示日時**: 2026-04-03 13:24
- **承認日時**: -
- **承認者コメント**: -
