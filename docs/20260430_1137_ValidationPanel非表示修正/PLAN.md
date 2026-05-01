# タスク計画書: ValidationPanel 非表示修正

## メタデータ
- **作成日時**: 2026-04-30 11:37
- **タスクID**: ValidationPanel非表示修正
- **優先度**: 低
- **推定工数**: 0.25時間

## タスク概要

バリデーションボタン押下後に表示される `ValidationPanel` モーダルの以下2要素を非表示にする。  
実装コード自体は削除せず、表示のみを抑制する。

1. エラー詳細欄の各エラーに付いているチェックボックス
2. 自動補正機能カード（「🔧 自動補正」セクション全体）

## 目的と期待される成果

- [ ] エラー詳細欄のチェックボックスが画面上に表示されなくなる
- [ ] 「🔧 自動補正」カードが画面上に表示されなくなる
- [ ] 実装コード（`handleApplyCorrections`, `handleErrorCheckChange`, `Checkbox` 等）は残存する

## 実装ステップ

- [ ] `frontend/src/components/editorv2/components/ValidationPanel.tsx` を修正
  - [ ] `renderErrors()` 内 `<Checkbox>` に `style={{ display: 'none' }}` を追加
  - [ ] 自動補正カード全体（370〜394行目）を `{false && (...)}` でラップ

## 変更ファイル

1. `frontend/src/components/editorv2/components/ValidationPanel.tsx` - 非表示対応

## リスク

| リスク | 対策 |
|--------|------|
| Checkboxのスペースが残ってレイアウトが崩れる | `display: none` に加え、親 div の marginRight も調整する |

## テスト計画

- [ ] バリデーションボタン押下後のモーダルを目視確認
  - エラー詳細欄にチェックボックスが表示されないこと
  - 「自動補正」カードが表示されないこと
  - その他のレイアウトに崩れがないこと

## 承認記録

- **計画書提示日時**: 2026-04-30 11:37
- **承認日時**: 
