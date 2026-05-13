# タスク計画書: maiml-unified.ts 型定義検証 - XSD準拠確認

## メタデータ
- **作成日時**: 2025-02-05 10:25
- **タスクID**: maiml-unified-type-validation
- **優先度**: 高
- **推定工数**: 3-4時間

## 1. タスク概要

`frontend/src/types/maiml-unified.ts`の型定義が`backend/reference/schemas`配下のXSDスキーマファイルに基づいて正しく定義されているかを検証し、不整合や誤りがあれば修正する。

### 背景
- 現在、MAIML（Materials Informatics Markup Language）のXMLデータを扱うためのTypeScript型定義が`maiml-unified.ts`に存在
- XSDスキーマが`backend/reference/schemas`に存在するが、型定義との整合性が未検証
- 型の不整合により実行時エラーやバリデーションエラーが発生する可能性

## 2. 目的と期待される成果

### 目的
1. XSDスキーマファイルの仕様を正確に把握する
2. 現在のTypeScript型定義との差異を特定する
3. 型定義の誤りを修正し、XSDスキーマと完全に整合させる
4. 型安全性を向上させ、実行時エラーを防ぐ

### 期待される成果
- [x] XSDスキーマファイルの詳細分析レポート作成
- [ ] 型定義とXSDスキーマの差異リスト作成
- [ ] 修正が必要な型定義の特定
- [ ] 修正済みの`maiml-unified.ts`
- [ ] 検証テストの実施と結果報告

## 3. 実装ステップ

### Phase 1: XSDスキーマファイルの調査
- [ ] `backend/reference/schemas`配下の全XSDファイルをリストアップ
- [ ] 各XSDファイルの構造を分析
  - [ ] 要素定義（element）の確認
  - [ ] 複合型（complexType）の確認
  - [ ] 単純型（simpleType）の確認
  - [ ] 属性（attribute）の確認
  - [ ] 必須/任意の指定確認
  - [ ] cardinality（minOccurs, maxOccurs）の確認
- [ ] XSDの主要な型定義をドキュメント化

### Phase 2: 現在の型定義の分析
- [ ] `maiml-unified.ts`の全型定義をリストアップ
- [ ] 各型定義の構造を分析
  - [ ] インターフェース定義
  - [ ] プロパティの型
  - [ ] 必須/オプショナルの指定
  - [ ] 配列型の指定
  - [ ] ユニオン型の使用状況
- [ ] 型定義のカバレッジ確認（XSDに存在するがTypeScriptに未定義の型を特定）

### Phase 3: 差異分析と問題点の特定
- [ ] XSDとTypeScript型定義を項目ごとに比較
- [ ] 以下の観点で差異を分析：
  - [ ] 要素名の一致/不一致
  - [ ] 型の一致/不一致（string vs number, required vs optional等）
  - [ ] ネスト構造の一致/不一致
  - [ ] 配列型の一致/不一致
  - [ ] 属性（Attribute）の定義漏れ
  - [ ] デフォルト値の有無
- [ ] 差異の重要度を分類（Critical / High / Medium / Low）
- [ ] 修正優先度リストを作成

### Phase 4: 型定義の修正
- [ ] Critical/High優先度の修正実施
  - [ ] 型名の修正
  - [ ] プロパティ名の修正
  - [ ] 型の修正（string/number/boolean等）
  - [ ] 必須/オプショナルの修正
  - [ ] 配列型の修正
- [ ] Medium/Low優先度の修正実施
- [ ] JSDocコメントの追加/修正
- [ ] 型定義の整理（重複排除、命名規則統一）

### Phase 5: 検証とテスト
- [ ] 修正後の型定義でTypeScriptコンパイルが通ることを確認
- [ ] 既存コードへの影響を確認
  - [ ] `maimlParserTyped.ts`
  - [ ] `petriNetExtractor.ts`
  - [ ] `reactFlowConverter.ts`
  - [ ] `multiMethodConverter.ts`
- [ ] 必要に応じて関連ファイルを修正
- [ ] サンプルMAIMLファイルでの動作確認

### Phase 6: ドキュメント化
- [ ] 修正内容の詳細レポート作成
- [ ] XSDとTypeScript型定義の対応表作成
- [ ] 今後のメンテナンスガイドライン作成

## 4. 影響範囲

### 検証対象ファイル
1. `backend/reference/schemas/*.xsd` - 全XSDスキーマファイル

### 変更するファイル
1. `frontend/src/types/maiml-unified.ts` - 型定義の修正
2. （必要に応じて）関連する型定義ファイル

### 影響を受ける可能性があるファイル
1. `frontend/src/utils/maimlParserTyped.ts` - MAIML解析処理
2. `frontend/src/utils/petriNetExtractor.ts` - Petri Net抽出処理
3. `frontend/src/utils/reactFlowConverter.ts` - ReactFlow変換処理
4. `frontend/src/components/editorv2/utils/converters/multiMethodConverter.ts` - 複数メソッド変換
5. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - エディタ本体

## 5. 技術的詳細

### XSDからTypeScriptへの型マッピング

| XSD型 | TypeScript型 | 備考 |
|-------|-------------|------|
| xs:string | string | |
| xs:integer | number | |
| xs:decimal | number | |
| xs:boolean | boolean | |
| xs:date | string | ISO 8601形式 |
| xs:dateTime | string | ISO 8601形式 |
| minOccurs="0" | プロパティ?: 型 | オプショナル |
| minOccurs="1" | プロパティ: 型 | 必須 |
| maxOccurs="unbounded" | プロパティ: 型[] | 配列 |
| xs:attribute | プロパティ: 型 | 属性は通常プロパティとして定義 |
| xs:choice | 型1 \| 型2 | ユニオン型 |

### 検証ポイント

1. **要素名の一致**
   - XSDのelement名とTypeScriptのプロパティ名が一致しているか
   - キャメルケース vs スネークケース vs ケバブケースの違い

2. **型の正確性**
   - 数値型（xs:integer, xs:decimal）がnumber型になっているか
   - 文字列型（xs:string）がstring型になっているか
   - 日付型（xs:date, xs:dateTime）の扱い

3. **必須/オプショナル**
   - minOccurs="0"の要素がオプショナル（?）になっているか
   - minOccurs="1"の要素が必須になっているか

4. **配列型**
   - maxOccurs="unbounded"の要素が配列型（[]）になっているか
   - maxOccurs="1"の要素が単一型になっているか

5. **ネスト構造**
   - complexTypeのネスト構造が正しく型定義されているか
   - xs:sequenceやxs:allの順序制約

6. **属性（Attribute）**
   - xs:attributeで定義された属性が型定義に含まれているか
   - 属性のrequired/optionalが正しく定義されているか

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| XSDファイルが複数あり、どれが最新か不明 | 高 | 中 | ファイルのタイムスタンプとコメントから最新版を特定 |
| 型定義の変更が既存コードに広範囲に影響 | 高 | 高 | 段階的に修正し、各段階でコンパイルと動作確認を実施 |
| XSDとTypeScriptの型システムの差異による完全な一致が困難 | 中 | 中 | 現実的な妥協点を見つけ、ドキュメント化 |
| 修正により新たなバグが発生 | 中 | 中 | 十分なテストと段階的なリリース |
| XSDの複雑な制約（xs:choice, xs:sequence等）の型定義が困難 | 中 | 高 | ユニオン型やタグ付きユニオンで対応 |

## 7. テスト計画

### 型定義の検証
- [ ] TypeScriptコンパイルエラーがないことを確認
- [ ] ESLintエラーがないことを確認
- [ ] 型定義の網羅性確認（全XSD要素が型定義されているか）

### 既存コードへの影響確認
- [ ] `maimlParserTyped.ts`のコンパイル確認
- [ ] `petriNetExtractor.ts`のコンパイル確認
- [ ] `reactFlowConverter.ts`のコンパイル確認
- [ ] エディタ画面の動作確認

### 実データでの検証
- [ ] サンプルMAIMLファイルの読み込みテスト
- [ ] Petri Net変換テスト
- [ ] ReactFlow表示テスト
- [ ] 保存テスト

## 8. ロールバック計画

問題が発生した場合は以下の手順でロールバック：

1. Git commitを元に戻す
```bash
git checkout HEAD~1 -- frontend/src/types/maiml-unified.ts
```

2. 必要に応じて関連ファイルもロールバック
3. TypeScriptコンパイルとアプリケーション起動を確認
4. 問題の原因を分析し、再度修正計画を立てる

## 9. 関連ドキュメント

- [XSD型定義準拠型定義追加計画](./20250205_1008_Content型追加_XSD準拠型定義_PLAN.md)
- [reactFlowConverter XSD型定義置き換え](./20250204_1419_reactFlowConverter_XSD型定義置き換え_PLAN.md)
- [maimlParserTyped DOMメソッド追加](./20250203_1803_maimlParserTyped_DOMメソッド追加_PLAN.md)
- [petriNetExtractor 型定義明確化](./20250204_0807_petriNetExtractor_型定義明確化_PLAN.md)

## 10. 承認記録

- **計画書提示日時**: 2025-02-05 10:25
- **承認日時**: （承認待ち）
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
- 開始: （未開始）
- 完了: （未完了）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）

### 最終的な成果物
- [ ] 修正済み`maiml-unified.ts`
- [ ] 差異分析レポート
- [ ] XSD-TypeScript対応表
- [ ] テスト結果報告書

## 12. 振り返り

### うまくいった点
（完了後に記録）

### 改善が必要な点
（完了後に記録）

### 学んだこと
（完了後に記録）