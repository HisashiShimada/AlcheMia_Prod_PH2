# タスク計画書: 名前空間管理タブ 非アクティブ確認ダイアログ追加

## メタデータ
- **作成日時**: 2026-07-13 09:22
- **タスクID**: namespace-deactivate-confirm
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
実験管理者メニューの名前空間管理タブにある「Prefix管理」「用語管理」の非アクティブボタンを押した際に、システム管理者メニューと同様の確認ダイアログを表示する。

## 目的と期待される成果
- [ ] PrefixManagement.tsx の行単位「非アクティブ」ボタンに確認ダイアログを追加
- [ ] PrefixManagement.tsx の一括「選択したPrefixを非アクティブ」ボタンに確認ダイアログを追加
- [ ] NamespaceMain.tsx の行単位「非アクティブ」ボタンに確認ダイアログを追加
- [ ] NamespaceMain.tsx の一括非アクティブ処理に確認ダイアログを追加

## 変更ファイル
1. `frontend/src/components/namespace/PrefixManagement.tsx`
2. `frontend/src/components/namespace/NamespaceMain.tsx`

## 確認ダイアログ仕様（システム管理者メニューと同じ形式）
- **行単位（非アクティブ時のみ）**
  - title: 「{prefix/qname}を非アクティブにしますか？」
  - content: 「このPrefix/用語を非アクティブ状態に変更します。」
  - OKボタン: 「非アクティブ」(danger=true)
  - キャンセル: 「キャンセル」
- **一括（非アクティブ）**
  - title: 「選択した〇〇を非アクティブにしますか？」
  - content: 「{N}件の〇〇が非アクティブになります。」
  - OKボタン: 「非アクティブ」(danger=true)
  - キャンセル: 「キャンセル」

## 承認記録
- **承認日時**: 2026-07-13 09:22
