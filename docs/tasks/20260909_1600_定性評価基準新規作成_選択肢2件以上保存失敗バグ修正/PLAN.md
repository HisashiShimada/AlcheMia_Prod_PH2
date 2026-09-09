# タスク計画書: 定性評価基準新規作成 選択肢2件以上保存失敗バグ修正

## メタデータ
- **作成日時**: 2026-09-09 16:00
- **タスクID**: 20260909_1600_定性評価基準新規作成_選択肢2件以上保存失敗バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

---

## タスク概要

実験管理者画面の「定性評価基準 新規作成」モーダルにて、選択肢（qualitativeOptions）を
2件以上追加して保存ボタンを押下すると「保存に失敗しました。再度お試しください。」が表示され
保存に失敗する不具合を修正する。

---

## 根本原因

### 問題箇所
`frontend/src/components/uncertainty/QualitativeOptionEditor.tsx` 118行目

```tsx
// ❌ 問題のあるコード
<ColorPicker
  size="small"
  value={option.color}
  onChange={(_, hex) => onUpdate(option.id, 'color', hex)}
/>
```

### 原因詳細

| 項目 | 詳細 |
|------|------|
| antd v6 `ColorPicker.onChange` シグネチャ | `(value: Color, css: string) => void` |
| 第2引数 `css` | `Color.toCssString()` の結果。フォーマットに応じて `rgb(92, 86, 41)` のような文字列を返す |
| DB制約 | `intuition_selector.display_color` が `CHARACTER VARYING(7)`（`#RRGGBB` = 7文字想定） |
| 発生条件 | 選択肢を2件以上追加すると、antd ColorPicker が2件目以降の色を RGB 形式で内部保持し返却 |
| 結果 | `rgb(92, 86, 41)`（14文字）が INSERT されると VARCHAR(7) 制約違反でトランザクション全体が ROLLBACK → 保存失敗 |

---

## 目的と期待される成果

- [x] 定性評価基準の新規作成で選択肢を2件以上追加しても正常に保存できる
- [x] `display_color` が常に `#RRGGBB` 形式（7文字）で DB に保存される
- [x] バックエンド側にも防衛的バリデーションを追加し、形式外の値を早期にはじく

---

## 実装ステップ

- [x] タスク専用フォルダ・計画書の作成
- [x] `QualitativeOptionEditor.tsx` の `ColorPicker.onChange` を修正
  - `color.toHexString()` で常に `#RRGGBB` 形式を取得
  - `disabledAlpha` でアルファ付き hex（9文字）を防止
  - `disabledFormat` で RGB/HSB へのフォーマット切替 UI を無効化
- [x] `uncertaintyCriteriaRoutes.ts` に `qualitativeOptions` 要素レベルのバリデーションを追加
  - `displayColor` が `#RRGGBB` 形式であることをサーバー側でも検証

---

## 変更ファイル

| # | ファイル | 変更種別 | 説明 |
|---|---------|---------|------|
| 1 | `frontend/src/components/uncertainty/QualitativeOptionEditor.tsx` | 修正（主修正） | ColorPicker onChange を `color.toHexString()` に変更、`disabledAlpha`/`disabledFormat` 追加 |
| 2 | `backend/src/routes/uncertaintyCriteriaRoutes.ts` | 修正（防衛的） | `qualitativeOptions.*.displayColor` の `#RRGGBB` 形式バリデーション追加 |

---

## 変更しないファイル（理由）

| ファイル | 理由 |
|---------|------|
| `intuition_selector` DDL | フロントエンド修正で根本解決。DB マイグレーション不要 |
| `insertIntuitionSelector.sql` | SQL 自体に問題なし |
| `uncertaintyCriteriaRepository.ts` | DB 処理に問題なし |
| `UncertaintyCreateModal.tsx` | 送信データ変換ロジックに問題なし |
| UI レイアウト | Do Not 条件（UI の変更は行わない）に該当 |

---

## リスク

| リスク | 対策 |
|--------|------|
| `disabledFormat` が antd v6.1.0 で使用できない可能性 | antd v6.1.0 リリースノート確認済み（v5.22.0 追加）。問題なし |
| `toHexString()` がアルファ付き（`#RRGGBBAA`）を返す可能性 | `disabledAlpha` により alpha=1 固定になるため `#RRGGBB` 7文字のみ返却される |

---

## 承認記録
- **計画書提示日時**: 2026-09-09 16:00
- **承認日時**: 2026-09-09（act モード切替により承認）
- **承認者コメント**: 承認済み・act モードで実装開始
