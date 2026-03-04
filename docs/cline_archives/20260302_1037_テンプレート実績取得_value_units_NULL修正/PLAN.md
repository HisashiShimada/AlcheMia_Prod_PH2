# タスク計画書: テンプレート実績取得APIのvalue/unitsがNULLになる問題修正

## メタデータ
- **作成日時**: 2026-03-02 10:37
- **タスクID**: template_data_null_fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`GET /api/v1/experiments/projects/TestProjectOmori8/methods/method_TestProjectOmori8_6cc24b82/tasks/1/data?transitionId=transition-1772412556174`
のレスポンスで、テンプレートのプロパティの `value` と `units` が NULL になっている問題を修正する。

## 目的と期待される成果

### 目的
DBに実験データが0件のとき（初回アクセス時）、MAIMLファイルのテンプレート定義を読み取って
フォールバックレスポンスを生成する処理において、MAIMLに記録された `<value>` 要素の値が
正しくレスポンスに含まれるようにする。

### 期待される成果
- [ ] `value` フィールドにMAIMLの `<value>` 要素の値が返却される
  - 例: `property01` → `"1"`, `content01` → `"2"`, `parameter01` → `3`
- [ ] `units` フィールドにMAIMLの `units` 属性の値が返却される
  - 例: `property01` → `"nm"`, `conditionproperty` → `"cc"`
- [ ] 既存の動作（DBに実績がある場合）には影響を与えない

## 問題の詳細

### 問題箇所

**ファイル**: `backend/src/services/experimentDataService.ts`  
**関数**: `buildFallbackTemplates`（末尾付近のプライベート関数）

```typescript
// 問題のあるコード（現在）
const properties = (template.properties || []).map(p => ({
  key: p.key || '',
  xsiType: p.xsiType || 'stringType',
  value: null,      // ← 常にnull。MAIMLの<value>要素を無視している
  units: p.units || null,  // ← p.unitsは正しく取得できているが、念のため確認
}));
```

### 原因分析

1. `MaimlParserTyped` は `maimlTypeConverter.ts` の `convertXmlJsProperty` を経由して
   MAIMLファイルをパースする
2. `convertXmlJsProperty` は `xmlProp.value?._text` を取得して `value` に設定する
   → `template.properties` には正しく値が入っている
3. しかし `buildFallbackTemplates` で `value: null` と上書きしているため、
   MAIMLに値があってもNULLになってしまう

### MAIMLファイルの実際のデータ（TestProjectOmori8.maiml）

```xml
<materialTemplate id="materialTemplate_1772412605350">
  <property key="property01" units="nm" formatString="%2f" scaleFactor="1.0" xsi:type="stringType">
    <value>1</value>   <!-- value="1" が取れるべき -->
  </property>
  <property key="content01" units="stringType" xsi:type="stringType">
    <value>2</value>   <!-- value="2" が取れるべき -->
  </property>
  <property key="parameter01" xsi:type="longType">
    <value>3</value>   <!-- value=3 (数値) が取れるべき -->
  </property>
</materialTemplate>
<conditionTemplate id="conditionTemplate_1772413051238">
  <property key="conditionproperty" units="cc" xsi:type="stringType">
    <value>3</value>   <!-- value="3", units="cc" が取れるべき -->
  </property>
</conditionTemplate>
<resultTemplate id="resultTemplate_1772413089314">
  <property key="resultproperty" formatString="%.2f" xsi:type="stringType">
    <value>3</value>   <!-- value="3" が取れるべき -->
  </property>
</resultTemplate>
```

## 実装ステップ

### Phase 1: タスク計画書の作成
- [x] タスク専用フォルダを作成
- [x] タスク計画書（PLAN.md）を作成

### Phase 2: 修正実装
- [x] `backend/src/services/experimentDataService.ts` の `buildFallbackTemplates` 関数を修正
  - `value: null` → `value: p.value ?? null` に変更

### Phase 3: 動作確認
- [x] バックエンドの型エラーがないことを確認（tsc --noEmit → エラーなし）
- [ ] APIレスポンスを確認（curlまたはブラウザで動作確認）

## 変更ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `backend/src/services/experimentDataService.ts` | 修正 | `buildFallbackTemplates`関数内の`value: null`を`value: p.value ?? null`に変更 |

## 技術的詳細

### 修正内容

```typescript
// 修正前
const properties = (template.properties || []).map(p => ({
  key: p.key || '',
  xsiType: p.xsiType || 'stringType',
  value: null,
  units: p.units || null,
}));

// 修正後
const properties = (template.properties || []).map(p => ({
  key: p.key || '',
  xsiType: p.xsiType || 'stringType',
  value: p.value ?? null,   // MAIMLの<value>要素から値を取得
  units: p.units || null,
}));
```

### 型の整合性

- `Property.value` の型: `string | number | boolean | undefined`（`maiml-unified.ts` 参照）
- 修正後の `value` の型: `string | number | boolean | null`
- `PropertySet.properties` の `value` フィールドは `unknown` 型で受け付けるため問題なし

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| DBに実績がある場合の動作変更 | 低 | 低 | フォールバック処理はDB0件時のみ呼ばれるため影響なし |
| 型エラー | 低 | 低 | `p.value`の型（`string|number|boolean|undefined`）は`null`との`??`演算子で安全 |

## テスト計画

- [ ] TypeScriptコンパイルエラーがないことを確認
- [ ] GETリクエストでvalueが正しく返ることを確認
  ```
  GET http://localhost:3001/api/v1/experiments/projects/TestProjectOmori8/methods/method_TestProjectOmori8_6cc24b82/tasks/1/data?transitionId=transition-1772412556174
  ```
  期待レスポンス例（materialTemplateのproperty01）:
  ```json
  {
    "key": "property01",
    "xsiType": "stringType",
    "value": "1",
    "units": "nm"
  }
  ```

## 承認記録
- **計画書提示日時**: 2026-03-02 10:37
- **承認日時**: 2026-03-02 10:37
- **承認者コメント**: 修正計画も含めてタスク計画書を作成し実装するよう指示

## 実施記録

### 実施日時
開始: 2026-03-02 10:37
完了: （作業完了後に記入）

### 計画からの変更点
なし

### 発生した問題と解決方法
（実施中に記入）

### 最終的な成果物
- [ ] `backend/src/services/experimentDataService.ts` 修正完了
