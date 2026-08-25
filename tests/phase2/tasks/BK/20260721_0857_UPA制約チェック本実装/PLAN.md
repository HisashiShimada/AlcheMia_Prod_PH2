# タスク計画書: UPA制約チェック本実装

## メタデータ
- **作成日時**: 2026-07-21 08:57
- **タスクID**: upa-constraint-check-impl
- **優先度**: 中
- **推定工数**: 2〜3時間

## タスク概要

`maimlEncryptionService.validateEncryptionScope()` は現在常に `{ isValid: true }` を返すスタブ実装のままになっている。
MAIML XSD スキーマを解析して `<xs:choice>` を持つ要素の親型を特定し、
暗号化対象要素を `<EncryptedData>` に置き換えた際に型パーサーが要素を一意識別できなくなる（UPA制約違反）かどうかを判定する本実装に置き換える。

## 目的と期待される成果

- [ ] `validateEncryptionScope(targetPath)` が実際にUPA制約を判定して返す
- [ ] 違反時は `{ isValid: false, message: "..." }` を返す
- [ ] フロントエンドの「UPA制約チェック」ボタンを押したとき、違反がある場合に警告が表示される
- [ ] XSD解析結果はキャッシュして2回目以降の呼び出しを高速化する

## 実装ステップ

### Phase 1: XSD スキーマ解析ユーティリティの新規作成
- [ ] `backend/src/utils/maimlSchemaHelper.ts` を新規作成
  - `loadSchemaChoiceMap()`: `backend/reference/schemas/maiml-*.xsd` を読み込み、`complexType` ごとに内容モデルが `<xs:choice>` かどうかのマップをビルド
  - `isUpaViolatingElement(parentTypeName, targetLocalName)`: 判定関数
  - 解析結果はモジュールレベル変数でキャッシュ（起動時または初回呼び出し時に読み込み）

### Phase 2: `validateEncryptionScope()` の本実装への置き換え
- [ ] `backend/src/services/maimlEncryptionService.ts` の `validateEncryptionScope()` を修正
  - `targetElement`（targetPath）から親要素名を取得（スラッシュ区切り）
  - `maimlSchemaHelper.isUpaViolatingElement()` を呼び出して違反を判定
  - 違反時: `{ isValid: false, message: "親要素 <XXX> は xs:choice モデルを持つため、暗号化により一意識別が失われます。content スコープの使用を推奨します。" }`

### Phase 3: 型定義の拡張確認・修正
- [ ] `backend/src/types/encryptionTypes.ts` の `EncryptionScopeValidationResult` に `violations?` フィールドが必要か確認
  - フロント側 `UpaCheckResult` は `violations: UpaViolation[]` を想定
  - コントローラー側で `message` を `violations[0].message` にマッピング済みなので型拡張は任意

### Phase 4: FLOW.md 更新
- [ ] `docs/tasks/20260717_1032_暗号化鍵参照固定化とアルゴリズム分岐完全化/FLOW.md`
  - エンドポイント #17 の状態を `⚠️ スタブ` → `✅` に更新
  - 「6-1. 今後の本実装」の該当行を完了マーク

## 変更ファイル

### 新規作成
1. `backend/src/utils/maimlSchemaHelper.ts` — XSD choice解析・キャッシュ

### 修正
1. `backend/src/services/maimlEncryptionService.ts` — `validateEncryptionScope()` 本実装
2. `docs/tasks/20260717_1032_暗号化鍵参照固定化とアルゴリズム分岐完全化/FLOW.md` — ステータス更新

## 技術的詳細

### UPA制約違反の判定ロジック

暗号化すると要素名が `<xenc:EncryptedData>` に変わる。
XML Schema パーサーが要素を一意識別できなくなるのは以下のケース:

```
<xs:choice>
  <xs:element name="A" type="TypeA"/>   ← 暗号化すると → <EncryptedData>
  <xs:element name="B" type="TypeB"/>   ← 暗号化すると → <EncryptedData>
</xs:choice>
```

どちらの要素が暗号化されているかわからなくなる → **UPA違反**

```
<xs:choice>
  <xs:element name="A" type="TypeA" maxOccurs="unbounded"/>  ← 1種類のみ
</xs:choice>
```

1種類なら問題なし → **問題なし**

### XSD解析方法

既存の `generate-types-from-xsd.ts` が `xml2js` で XSD を解析する前例を持つ。
同様に `parseStringPromise` で XSD をパースし、`xs:complexType` → `xs:choice` → `xs:element` の構造を辿る。

```typescript
// 擬似コード
const parsed = await parseStringPromise(xsdContent);
for (const ct of parsed['xs:schema']['xs:complexType'] ?? []) {
  const name = ct.$?.name;
  const choices = ct['xs:choice'] ?? [];
  const hasMultipleChoiceOptions = choices.some(c => (c['xs:element']?.length ?? 0) > 1);
  if (hasMultipleChoiceOptions) {
    choiceTypes.add(name);
  }
}
```

### キャッシュ戦略

サーバー起動時ではなく `validateEncryptionScope()` 初回呼び出し時に遅延初期化。
メモリキャッシュ（`Map<string, boolean>`）に `complexType名 → UPA違反リスクあり/なし` を格納。

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| XSD スキーマの `include`/`import` により全型情報が単一 XSD に収まらない | 中 | 複数 XSD を全て読み込んで型マップをマージする |
| targetPath からの親要素名特定が不正確なケース | 低 | XSD マップに存在しない型は「不明」として `isValid: true` を返しフォールスネガティブを防ぐ |
| 起動時の XSD 読み込みでパフォーマンス影響 | 低 | 遅延初期化 + Promise キャッシュで初回以降はゼロコスト |

## テスト計画

- [ ] 手動テスト: `maiml-property.xsd` に多数の `<xs:choice>` があることを確認済み。フロントの「UPA制約チェック」ボタンで `xs:choice` を持つ親要素のパスを指定したとき `isValid: false` が返ること
- [ ] 単体テスト: `maimlSchemaHelper.ts` に対して `xs:choice` を持つ型が正しく検出されることを確認（`jest`）

## 承認記録
- **計画書提示日時**: 2026-07-21 08:57
- **承認日時**: 
- **承認者コメント**: 
