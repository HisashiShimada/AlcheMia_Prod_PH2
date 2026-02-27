# タスク計画書: 画面入力内容をXML形式に書き起こす処理の調査

## メタデータ
- **作成日時**: 2026-02-26 17:58
- **タスクID**: xml_conversion_investigation
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

ソース全体で、画面に入力された内容をXML形式に書き起こす処理を調査し、全て列挙する。

## 2. 目的と期待される成果

### 目的
XML変換処理の全体像を把握し、自己閉じタグ修正の影響範囲を特定する。

### 期待される成果
- [ ] XML変換処理を実装しているファイルのリスト作成
- [ ] 各処理の概要と変換内容の説明
- [ ] 自己閉じタグ修正の影響を受ける可能性のある箇所の特定

## 3. 調査ステップ

### Phase 1: フロントエンドのXML変換処理調査
- [ ] frontend/src/utils/ 配下のXML関連ユーティリティを検索
- [ ] frontend/src/services/ 配下のXML変換サービスを検索
- [ ] frontend/src/components/ 配下のXML生成ロジックを検索

### Phase 2: 検索キーワードによる調査
- [ ] "toXML" で検索
- [ ] "XMLSerializer" で検索
- [ ] "buildXML" で検索
- [ ] "createXML" で検索
- [ ] "DOMParser" で検索
- [ ] "xml2js" で検索
- [ ] "xmlbuilder" で検索

### Phase 3: MAIML変換処理の特定
- [ ] MAIMLフォーマットへの変換処理を特定
- [ ] Petri Net → MAIML 変換処理を確認
- [ ] テンプレート → MAIML 変換処理を確認

### Phase 4: 結果のまとめ
- [ ] 発見した全ての変換処理をリスト化
- [ ] 各処理の詳細を記録
- [ ] 影響範囲を評価

## 4. 調査対象ディレクトリ

### フロントエンド
- frontend/src/utils/
- frontend/src/services/
- frontend/src/components/
- frontend/src/app/

### バックエンド
- backend/src/utils/
- backend/src/services/

## 5. 成果物

### 調査レポート
- ファイル: docs/20260226_1758_XML変換処理調査/investigation_report.md
- 内容: 発見した全てのXML変換処理の詳細

## 6. 承認記録

- **計画書提示日時**: 2026-02-26 17:58
- **承認日時**: （承認待ち）
