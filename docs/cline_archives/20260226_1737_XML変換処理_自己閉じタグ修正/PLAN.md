# タスク計画書: XML変換処理の自己閉じタグ修正

## メタデータ
- **作成日時**: 2026-02-26 17:37
- **タスクID**: xml_converter_self_closing_tag_fix
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

フォーマット管理画面のXML編集機能において、property要素とcontent要素が自己閉じタグ（`<property .../>`）で出力されている問題を修正し、正しい開始タグ+終了タグ形式（`<property>...</property>`）に変更する。

## 2. 目的と期待される成果

### 目的
`frontend/src/utils/xmlConverter.ts`のXML生成処理を修正し、MAIMLスキーマに準拠した正しいXML構造を出力する。

### 期待される成果
- [x] 問題箇所を特定（convertPropertyToXml関数）
- [ ] convertPropertyToXml関数を修正
- [ ] convertContentToXml関数を修正
- [ ] 修正内容をテスト
- [ ] 正しいXML出力を確認

## 3. 実装ステップ

### Phase 1: convertPropertyToXml関数の修正
- [ ] 自己閉じタグの条件分岐を削除
- [ ] 常に開始タグ+終了タグ形式で出力するように変更
- [ ] コードの可読性を向上

### Phase 2: convertContentToXml関数の修正
- [ ] property関数と同様に自己閉じタグを削除
- [ ] 開始タグ+終了タグ形式に統一

### Phase 3: テスト
- [ ] 修正後のコードで正しいXMLが生成されることを確認
- [ ] 以下の構造が正しく出力されることを確認：
  ```xml
  <property formatString="0.000" key="LocationX" scaleFactor="1.000" xsi:type="doubleType">
  </property>
  ```

## 4. 変更ファイル

### 修正対象
1. `frontend/src/utils/xmlConverter.ts`
   - `convertPropertyToXml()` 関数（136-196行目付近）
   - `convertContentToXml()` 関数（198-270行目付近）

## 5. 技術詳細

### 現在の問題のあるコード
```typescript
// 子要素がない場合は自己閉じタグ
if (!hasValue && !hasDescription && !hasCustomElements && !hasChildren) {
  xml += ' />\n';
} else {
  xml += '>\n';
  // ... 子要素を追加 ...
  xml += `${spaces}</property>\n`;
}
```

### 修正後のコード
```typescript
// 常に開始タグ+終了タグ形式を使用
xml += '>\n';

// value要素
if (hasValue) {
  xml += `${spaces}  <value>${escapeXml(String(prop.value))}</value>\n`;
}
// ... その他の子要素 ...

xml += `${spaces}</property>\n`;
```

### 修正の理由
1. **MAIMLスキーマ準拠**: スキーマでは開始タグ+終了タグ形式が標準
2. **一貫性**: すべての要素で同じ形式を使用することで可読性向上
3. **互換性**: 既存のMAIMLパーサーとの互換性確保

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のXMLファイルとの互換性 | 低 | 低 | 両方の形式でパース可能（DOMParserは両方サポート） |
| ファイルサイズの微増 | 低 | 高 | 影響は微小（1要素あたり数バイト）|
| パフォーマンスへの影響 | 低 | 低 | 文字列結合の回数は変わらない |

## 7. テスト計画

### 手動テスト
- [ ] フォーマット管理画面でXMLファイルを新規作成
- [ ] propertyを追加してXMLを保存
- [ ] 保存されたXMLの構造を確認
- [ ] 期待される出力形式になっていることを確認

### 確認ポイント
```xml
✅ 正しい形式:
<property formatString="0.000" key="LocationX" scaleFactor="1.000" xsi:type="doubleType">
</property>

❌ 間違った形式（修正前）:
<property formatString="0.000" key="LocationX" scaleFactor="1.000" xsi:type="doubleType" />
```

## 8. 関連ドキュメント

- タスク発見元: ユーザーからの報告（2026-02-26）
- 参照コード: `frontend/src/components/project/FormatManagement.tsx`
- 参照コード: `frontend/src/components/editorv2/components/FormatEditorDialog.tsx`

## 9. 承認記録

- **計画書提示日時**: 2026-02-26 17:37
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

## 10. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 計画からの変更点
（なし）

### 発生した問題と解決方法
（なし）

### 最終的な成果物
- [ ] convertPropertyToXml関数の修正
- [ ] convertContentToXml関数の修正
- [ ] テスト完了

## 11. 振り返り

### うまくいった点
（実施後に記入）

### 改善が必要な点
（実施後に記入）

### 学んだこと
（実施後に記入）
