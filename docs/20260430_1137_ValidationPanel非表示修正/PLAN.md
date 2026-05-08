# タスク計画書: ValidationPanel 非表示修正

## メタデータ
- **作成日時**: 2026-04-30 11:37
- **タスクID**: ValidationPanel非表示修正
- **優先度**: 低
- **推定工数**: 0.25時間

## タスク概要

バリデーションボタン押下後に表示される `ValidationPanel` モーダルの以下2要素のコードを完全削除する。

1. エラー詳細欄の各エラーに付いているチェックボックス（および関連ロジック）
2. 自動補正機能カード全体（「🔧 自動補正」セクション、および関連 Props・ハンドラー）

> ※ 初回対応（2026-04-30）では非表示（`display: none` / `{false && ...}`）としていたが、
> コードごと削除する方針に変更。

## 目的と期待される成果

- [ ] エラー詳細欄にチェックボックスが存在しなくなる
- [ ] 「🔧 自動補正」カードおよび関連コードが存在しなくなる
- [ ] 不要な import / Props / state / ハンドラーもすべて除去される

## 実装ステップ

対象ファイル: `frontend/src/components/editorv2/components/ValidationPanel.tsx`

### チェックボックス関連の削除
- [ ] import から `Checkbox` を削除
- [ ] `selectedErrors` state の削除（87行目）
- [ ] `setSelectedErrors([])` の呼び出しを削除（94行目）
- [ ] `handleApplyCorrections` 関数全体を削除（108〜118行目）
- [ ] `handleErrorCheckChange` 関数全体を削除（123〜129行目）
- [ ] `renderErrors()` 内の `<Checkbox>` JSX要素を削除（217〜221行目）

### 自動補正機能関連の削除
- [ ] import から `Spin`・`ToolOutlined`・`Paragraph` を削除
- [ ] Props 定義から `onAutoCorrect?` を削除（59行目）
- [ ] Props 定義から `isCorrecting?` を削除（62行目）
- [ ] コンポーネント引数から `onAutoCorrect`・`isCorrecting` を削除（72・75行目）
- [ ] 進行状態バーの `isCorrecting` 参照を削除（350〜358行目を `isValidating` のみに簡略化）
- [ ] 自動補正カードブロック全体を削除（369〜394行目、`{false && ...}` ラップごと）

## 変更ファイル

1. `frontend/src/components/editorv2/components/ValidationPanel.tsx` - コード削除

## リスク

| リスク | 対策 |
|--------|------|
| `onAutoCorrect`・`isCorrecting` を渡している呼び出し元でTypeScriptエラーになる | Props削除後、呼び出し元も確認・修正する |

## テスト計画

- [ ] バリデーションボタン押下後のモーダルを目視確認
  - エラー詳細欄にチェックボックスが存在しないこと
  - 「自動補正」カードが存在しないこと
  - その他のレイアウトに崩れがないこと
- [ ] TypeScript ビルドエラーがないこと

## 承認記録

- **計画書提示日時**: 2026-05-08 09:47
- **承認日時**: 
