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

### Phase3: 1024px幅対応（実施予定）

> 調査結果（`docs/20260707_0931_ExperimentWorkerMenuレスポンシブデザイン調査/REPORT.md`）に基づき方針を確定。

#### 問題

テーブル列幅合計 **1130px** が、`ResponsiveContainer` 適用後の `max-width: 992px` に収まらない。
タブレット操作を考慮し、横スクロールは導入しない。

#### 確定方針: Material / Condition / Result の3列を「進捗」1列に統合

| 列名 | 現在の幅 | 変更後の幅 |
|------|---------|----------|
| メソッド名 | 160px | 160px |
| タスクNo | 80px | 80px |
| トランジション名 | 180px | 180px |
| ステータス | 160px | 160px |
| 進捗（M/C/R 統合） | 130×3=390px | **150px** |
| 問題 | 60px | 60px |
| 操作 | 100px | 100px |
| **合計** | **1130px** | **890px** |

→ 890px は `max-width: 992px` に十分収まり、横スクロール不要。

#### 「進捗」列の表示仕様

- Material / Condition / Result を1セル内にテキストのみで横並び表示
- 表示例: `M 3/5  C 4/5  R 1/5`
- M/C/R はそれぞれ色分け（青/緑/オレンジ）したラベル + `rec/tot` 数値
- `tot === 0` の項目は非表示（例: Resultがないトランジションは `M 3/5  C 4/5` のみ）
- バー表示なし → 行の高さは現状のまま変化なし

#### 実施順序

```
Step 1: ProgressOverviewTab.tsx の Material/Condition/Result 3列を「進捗」1列に変更
        → テーブル合計幅が890pxに縮小されることを確認
Step 2: ExperimentWorkerMenu.tsx の contentBody ルート <div> を <ResponsiveContainer> に変更
        → max-width: 992px が適用された状態で表示確認
```

> ⚠️ Step 1 → Step 2 の順に実施すること。逆順では ResponsiveContainer 適用後にテーブルが収まらなくなる。

#### 実装チェックリスト

- [ ] `ProgressOverviewTab.tsx`: Material/Condition/Result 3列を「進捗」1列（テキスト表示）に置き換え
- [ ] TypeScript ビルドエラーなし確認
- [ ] `ExperimentWorkerMenu.tsx`: `contentBody` のルート `<div>` を `<ResponsiveContainer>` に変更
- [ ] TypeScript ビルドエラーなし確認
- [ ] ブラウザで 992px / 1024px 幅での表示確認（横スクロールなし・列が収まること）

### Phase4: ResponsiveContainer修正 + 画面幅による列切替（追加実装）

> Phase3実装後の追加確認により、ResponsiveContainerの仕様がユーザー意図とズレていたため追加対応。

#### 問題

`ResponsiveContainer` に `@media (min-width: 992px) { max-width: 992px }` 等の頭打ち設定がある。
ユーザーの意図は「大きい画面では制限なし（幅100%を使う）、小さい画面のみ適切に縮小する」だった。

#### Phase4-A: ResponsiveContainer修正

`ExperimentWorkerMenu.tsx` の `ResponsiveContainer` から `max-width` 頭打ちをすべて撤廃し、パディング調整のみ残す：

```tsx
const ResponsiveContainer = styled.div`
  width: 100%;          // 常に100%幅（制限なし）
  padding: 0 8px;       // デフォルト（小画面）: パディング小

  @media (min-width: 768px) {
    padding: 0 16px;    // 768px以上: パディング少し広め
  }
`;
```

#### Phase4-B: 画面幅に応じた列切替（ProgressOverviewTab.tsx）

Ant Design の `Grid.useBreakpoint()` で現在の画面幅を検知し、**1200px（`xl`）を閾値**として列構成を動的に切り替える：

| 画面幅 | 列構成 | 合計幅 |
|--------|--------|--------|
| 1200px以上（xl） | Material / Condition / Result 独立3列（Progressバー + rec/tot数値、各130px） | 1130px |
| 1200px未満 | 「進捗」統合1列（テキストのみ `M 3/5 C 4/5 R 1/5`、150px） | 890px |

**実装方針:**
- `ProgressOverviewTab` 内で `const screens = Grid.useBreakpoint()` を使用
- `const isWide = !!screens.xl` で切り替えフラグを生成
- Material / Condition / Result 独立3列の列定義（バー付き、以前の実装を復元）と統合1列の列定義を両方保持
- `columns` 配列を `isWide ? [3列] : [統合1列]` で動的切り替え

#### 実装チェックリスト

- [ ] `ExperimentWorkerMenu.tsx`: ResponsiveContainerからmax-width頭打ちを撤廃
- [ ] TypeScriptビルドエラーなし確認
- [ ] `ProgressOverviewTab.tsx`: Grid.useBreakpoint()導入・独立3列定義の復元・切替ロジック実装
- [ ] TypeScriptビルドエラーなし確認
- [ ] ブラウザで1200px境界での列切替を目視確認

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
