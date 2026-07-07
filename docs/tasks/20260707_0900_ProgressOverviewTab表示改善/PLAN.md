# タスク計画書: ProgressOverviewTab 表示改善

## メタデータ
- **作成日時**: 2026-07-07 09:00
- **タスクID**: ProgressOverviewTab表示改善
- **優先度**: 中
- **推定工数**: 1〜2時間

## タスク概要

`frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` の表示品質を改善する。
具体的には以下3点を対応する。

1. **左右マージンなし問題**：`ExperimentWorkerMenu.tsx` に未使用の `ResponsiveContainer` が定義されているが、`contentBody` には適用されていないため、全体進捗タブ（および実験記録タブ）のコンテンツが画面端にベタ付けになっている。
2. **フォントサイズが小さい問題**：`ProgressOverviewTab.tsx` 内に `fontSize: 10/11/12` の極小フォントが多数使われており、視認性が低い。
3. **1024px幅でのテーブル崩れ問題**：テーブル列幅の合計が約1130pxあり、1024px幅の画面ではレイアウト崩れが発生する可能性がある（※保留）。

## 目的と期待される成果

- [ ] 全体進捗タブに適切な左右マージンが付き、文字が画面端にベタ付けにならない
- [ ] `ProgressOverviewTab` 内のフォントサイズが統一されて視認性が向上する
- [ ] 〔保留〕1024px幅のタブレットでテーブル列が崩れない

## 実装ステップ

### Phase1: 左右マージンの適用（ExperimentWorkerMenu.tsx）

- [ ] `ExperimentWorkerMenu.tsx` の `contentBody` 全体、またはタブコンテンツ部分を `ResponsiveContainer` でラップする
  - 適用範囲: **タブコンテンツ部分のみ**（プロジェクト選択エリアは現状のまま画面幅いっぱいとする）
  - 具体的には `tabItems` の `children` を `<ResponsiveContainer>` でラップ、もしくは `Tabs` 全体をラップする
  - padding はコンパクト方向（`padding: 0 8px` / `@media 768px+: 0 12px` 程度）で実際に見ながら微調整
  
### Phase2: フォントサイズ統一（ProgressOverviewTab.tsx）

変更対象と変更内容：

| 箇所 | 現在値 | 変更後 |
|------|--------|--------|
| SummaryCard: 未着手/作業中/完了ラベル | `fontSize: 11` | `fontSize: 12` |
| SummaryCard: 全体進捗テキスト `fontSize: 13` | `fontSize: 13` | `fontSize: 13`（据え置き可） |
| FilterBar: 「フィルタ:」テキスト | `fontSize: 12` | `fontSize: 12`（据え置き可） |
| FilterBar: 件数表示 | `fontSize: 11` | `fontSize: 12` |
| テーブルセル: メソッド名/トランジション名 | `fontSize: 12` | `fontSize: 13` |
| テーブルセル: Material/Condition/Result の `rec/tot` 数値 | `fontSize: 10` | `fontSize: 12` |

- [ ] `SummaryCard` 内の `fontSize: 11` を `fontSize: 12` に変更
- [ ] `FilterBar` 内の `fontSize: 11` を `fontSize: 12` に変更
- [ ] テーブルセル `fontSize: 12`（メソッド名・トランジション名）を `fontSize: 13` に変更
- [ ] テーブルセル `fontSize: 10`（Material/Condition/Result）を `fontSize: 12` に変更

### Phase3: 1024px幅対応（保留）

> ⚠️ **この Phase はユーザー側で過去実装を確認中のため、実施を保留する**
> 確認後に方針が決定次第、対応を再開する。

現状の問題点のみ記録：
- テーブルの列幅合計: メソッド名160 + タスクNo80 + トランジション名180 + ステータス160 + Material130 + Condition130 + Result130 + 問題60 + 操作100 = **1130px**
- `ExperimentWorkerMenu.tsx` の `ResponsiveContainer` は 992px 幅で `max-width: 992px` を適用するため、そのまま復元するとテーブルが 992px 内に収まらず横スクロールが発生する
- 対応案: `Table` に `scroll={{ x: 'max-content' }}` を追加、および列幅の見直し（Material/Condition/Result を 110px 程度に縮小）

## 変更ファイル

1. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - タブコンテンツに `ResponsiveContainer` を適用
2. `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx` - フォントサイズ統一

## リスク

| リスク | 対策 |
|--------|------|
| `ResponsiveContainer` 適用範囲が広すぎてプロジェクト選択エリアの見た目が壊れる | タブコンテンツ部分のみに限定して適用する |
| フォントサイズ変更でカード・セル内のレイアウトが崩れる | 各 `Statistic` のラベル・値サイズは独立しているため影響は限定的 |
| TypeScript ビルドエラー（styled-components / emotion の型） | Phase1・2 は既存構造に沿った変更のみのため発生リスク低 |

## テスト計画

- [ ] TypeScript ビルドエラーなし（`npm run build` または型チェック）
- [ ] ブラウザで全体進捗タブを表示し、左右マージンが付いていることを目視確認
- [ ] フォントサイズが改善されていることを目視確認（特に Material/Condition/Result の数値表示）

## 承認記録

- **計画書提示日時**: 2026-07-07 09:00
- **承認日時**: （承認時に記入）
- **承認者コメント**: レスポンシブ（Phase3）は保留。Phase1・2 を先に実施する。

## 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 最終的な成果物
- [ ] `ExperimentWorkerMenu.tsx` 修正済み
- [ ] `ProgressOverviewTab.tsx` フォントサイズ修正済み
- [ ] TypeScript ビルド確認済み
