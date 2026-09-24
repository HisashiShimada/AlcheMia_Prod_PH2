# タスク計画書: 集約ルール設定項目への注釈追加

## メタデータ
- **作成日時**: 2026-09-24
- **タスクID**: 20260924_0000
- **優先度**: 中
- **推定工数**: 2〜3時間

---

## タスク概要

`AggregationRuleSettings.tsx` の各フォーム項目に注釈（ヘルプツールチップ）を追加する。

- **項目の説明**を各ラベルの横に表示する
- **選択肢がある項目**は、各選択肢を選んだ場合にどうなるかの説明も含めて表示する

---

## 目的と期待される成果

- [ ] 集約ルール設定画面の各フォーム項目のラベル横に「？」アイコンを追加し、ホバー（またはクリック）でツールチップ注釈が表示される
- [ ] 注釈テキストは ja.json / en.json の翻訳キーで管理される（ハードコーディング禁止）
- [ ] 日本語・英語の両方に対応している
- [ ] 既存の UI レイアウトへの影響が最小限である

---

## 対象項目と注釈内容

### カード1: 定性評価基準値（scoreMappingTitle）

| 項目名 | 翻訳キー | 注釈内容（ja） |
|--------|----------|---------------|
| **カードタイトル**（scoreMappingTitle） | scoreMappingTooltip | 良好・要確認・不良の三段階評価を数値スコアに変換する際の基準値を設定します。設定した数値は階層スコアの算出（平均・最小値）の計算基礎として使用され、代表ステータスの判定にも影響します。 |
| 良好スコア（score_good） | scoreGoodTooltip | 定性評価「良好」に対応する数値スコアの基準値です（既定値: 100）。 |
| 要確認スコア（score_caution） | scoreCautionTooltip | 定性評価「要確認」に対応する数値スコアの基準値です（既定値: 50）。 |
| 不良スコア（score_bad） | scoreBadTooltip | 定性評価「不良」に対応する数値スコアの基準値です（既定値: 0）。 |

### カード2: 集計ルール設定（aggregationRuleTitle）

| 項目名 | 翻訳キー | 注釈内容（ja） |
|--------|----------|---------------|
| 対象ロールアップ（target_rollup） | targetRollup.label | 定性評価結果のロールアップ（集約）方法を指定します。<br>**ワーストケース**: 子要素の中で最も悪い評価を採用します。<br>**多数決**: 最も多い評価を採用します（同数の場合は悪い方）。<br>**平均**: 数値スコアの平均から評価を算出します。 |
| 階層代表ステータス（level_status_rule） | levelStatusRule.label | 各階層（実験・レベル等）の代表ステータスの決定方法を指定します。<br>**最悪値採用**: 子要素の中で最も悪いステータスを採用します。<br>**多数決**: 最も多いステータスを採用します（同数の場合は悪い方）。 |
| 階層スコア（level_score_rule） | levelScoreRule.label | 各階層のスコア算出方法を指定します。<br>**平均**: 子要素スコアの平均値を使用します。<br>**最小値**: 子要素スコアの最小値を使用します。 |
| 未評価の扱い（missing_handling） | missingHandling.label | 評価値が未設定の項目をスコア集計に含める方法を指定します。<br>**別カウント**: 未評価を独立したカテゴリとして集計します。<br>**分母除外**: 未評価項目をスコア計算の分母から除外します。<br>**良好扱い**: 未評価項目を「良好」として集計に含めます。 |
| トランジション階層（transition_hierarchy） | transitionHierarchy.label | トランジション（作業工程）の階層表示方法を指定します。<br>**合算**: 全トランジションを同一レベルで合算表示します。<br>**分離表示**: トランジションの階層構造を維持して分けて表示します。 |

---

## 実装方針

### UIアプローチ: Ant Design `Form.Item` の `tooltip` prop を使用

Ant Design の `Form.Item` コンポーネントには `tooltip` prop が標準装備されており、ラベル横に `?` アイコンが自動追加される。

```tsx
<Form.Item
  label={t('aggregationRule.targetRollup.label')}
  name="target_rollup"
  tooltip={t('aggregationRule.targetRollup.tooltip')}
>
```

この方式が最もシンプルで既存コードへの影響が最小限であるため採用する。

> **代替案**: Ant Design `Tooltip` コンポーネントで手動実装する方法もあるが、`Form.Item` の `tooltip` prop が標準的かつシンプルなため、こちらを優先する。

---

## 実装ステップ

- [ ] **STEP1**: `ja.json` に各項目の `tooltip` 翻訳キーを追加
- [ ] **STEP2**: `en.json` に各項目の `tooltip` 翻訳キーを追加（英語版）
- [ ] **STEP3**: `AggregationRuleSettings.tsx` の各 `Form.Item` に `tooltip` prop を追加
  - scoreMappingTitle カードのスコア項目（score_good, score_caution, score_bad）
  - aggregationRuleTitle カードの集計ルール項目（target_rollup, level_status_rule, level_score_rule, missing_handling, transition_hierarchy）

---

## 変更ファイル

1. `frontend/src/locales/ja.json` — tooltip 翻訳キー追加（aggregationRule セクション）
2. `frontend/src/locales/en.json` — tooltip 翻訳キー追加（aggregationRule セクション）
3. `frontend/src/components/SystemManagement/AggregationRuleSettings.tsx` — Form.Item に tooltip prop 追加

---

## 翻訳キー設計

`ja.json` / `en.json` の `aggregationRule` セクション内に以下の構造で追加する：

```json
"aggregationRule": {
  ...既存キー...,
  "scoreMappingTooltip": "良好・要確認・不良の三段階評価を数値スコアに変換する際の基準値を設定します。設定した数値は階層スコアの算出（平均・最小値）の計算基礎として使用され、代表ステータスの判定にも影響します。",
  "scoreGoodTooltip": "定性評価「良好」に対応する数値スコアの基準値です（既定値: 100）。",
  "scoreCautionTooltip": "定性評価「要確認」に対応する数値スコアの基準値です（既定値: 50）。",
  "scoreBadTooltip": "定性評価「不良」に対応する数値スコアの基準値です（既定値: 0）。",
  "targetRollup": {
    ...既存キー...,
    "tooltip": "定性評価結果のロールアップ（集約）方法を指定します。\nワーストケース: 子要素の中で最も悪い評価を採用します。\n多数決: 最も多い評価を採用します（同数の場合は悪い方）。\n平均: 数値スコアの平均から評価を算出します。"
  },
  "levelStatusRule": {
    ...既存キー...,
    "tooltip": "各階層の代表ステータスの決定方法を指定します。\n最悪値採用: 子要素の中で最も悪いステータスを採用します。\n多数決: 最も多いステータスを採用します（同数の場合は悪い方）。"
  },
  "levelScoreRule": {
    ...既存キー...,
    "tooltip": "各階層のスコア算出方法を指定します。\n平均: 子要素スコアの平均値を使用します。\n最小値: 子要素スコアの最小値を使用します。"
  },
  "missingHandling": {
    ...既存キー...,
    "tooltip": "評価値が未設定の項目をスコア集計に含める方法を指定します。\n別カウント: 未評価を独立したカテゴリとして集計します。\n分母除外: 未評価項目をスコア計算の分母から除外します。\n良好扱い: 未評価項目を「良好」として集計に含めます。"
  },
  "transitionHierarchy": {
    ...既存キー...,
    "tooltip": "トランジション（作業工程）の階層表示方法を指定します。\n合算: 全トランジションを同一レベルで合算表示します。\n分離表示: トランジションの階層構造を維持して分けて表示します。"
  }
}
```

> **注意**: JSON は改行文字 `\n` で記述するが、Tooltip コンポーネントでは改行が解釈されない場合があるため、TSX 側で適切に処理する（後述）。

### Tooltip 内の改行対応

JSON の `\n` を実際の改行として表示するため、`AggregationRuleSettings.tsx` にヘルパーを追加する：

```tsx
/** tooltipテキストの \n を <br/> に変換して React.ReactNode として返す */
const formatTooltip = (text: string): React.ReactNode => (
  text.split('\n').map((line, i) => (
    <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>
  ))
);
```

各 `Form.Item` の `tooltip` には `formatTooltip(t('...'))` を渡す。

---

## 影響範囲

- **変更対象**: 上記3ファイルのみ
- **既存機能への影響**: なし（tooltip prop の追加はUIの追加のみ）
- **バックエンドへの影響**: なし
- **テスト影響**: なし（UIの表示追加のみ）

---

## リスク

| リスク | 対策 |
|--------|------|
| Tooltip テキストが長すぎて UI が壊れる | Ant Design Tooltip は自動で折り返し対応。最大幅はデフォルト（250px）を使用。必要であれば `overlayStyle` で調整可能。 |
| JSON の改行文字が Tooltip で表示されない | `formatTooltip` ヘルパーで `\n` → `<br/>` 変換して対応 |

---

## テスト計画

- [ ] 開発環境で各項目のラベル横に「?」アイコンが表示されることを確認
- [ ] ホバーでツールチップが表示されることを確認
- [ ] 日本語・英語切り替えでツールチップの内容が切り替わることを確認
- [ ] 改行が正しく表示されることを確認
- [ ] スコア入力項目（score_good, score_caution, score_bad）にもツールチップが表示されることを確認

---

## 承認記録

- **計画書提示日時**: 2026-09-24
- **承認日時**: 2026-09-24
- **承認者コメント**: 承認

## 実施記録

### 実施日時
開始: 2026-09-24
完了: 2026-09-24

### 最終的な成果物
- [x] STEP1: `frontend/src/locales/ja.json` — tooltip 翻訳キー追加（scoreMappingTooltip / scoreGoodTooltip / scoreCautionTooltip / scoreBadTooltip / targetRollup.tooltip / levelStatusRule.tooltip / levelScoreRule.tooltip / missingHandling.tooltip / transitionHierarchy.tooltip）
- [x] STEP2: `frontend/src/locales/en.json` — 同上（英語版）
- [x] STEP3: `frontend/src/components/SystemManagement/AggregationRuleSettings.tsx` — formatTooltip ヘルパー追加、scoreMappingTitle 変数（Tooltip付きカードタイトル）追加、全 Form.Item に tooltip prop 追加
