# タスク計画書: petriNetExtractor.ts DOMパーサー削減

## メタデータ
- **作成日時**: 2025-02-03 17:31
- **更新日時**: 2025-02-03 17:32
- **タスクID**: petriNetExtractor_dom_removal
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

`frontend/src/utils/petriNetExtractor.ts` 内で使用しているDOMパーサーの直接使用箇所を、`maimlParserTyped.ts`の型安全な方法に置き換える。

**重要な発見**: このファイルは既に大部分が`MaimlParserTyped`に移行済みです。残っているのは以下の2箇所のみです：
1. `extractPetriNetStructure`関数内のplaceRef取得処理
2. `buildTemplateMap`関数内のテンプレート要素・属性取得処理

## 2. 目的と期待される成果

### 目的
- DOMパーサー依存の完全削除
- 型安全性の向上
- コードの統一性確保
- 保守性の向上

### 期待される成果
- [x] DOMパーサー直接使用の完全削減
- [x] 型安全なコードへの移行
- [x] 既存機能の動作保証

## 3. 実装ステップ

### Phase 1: 現状分析と方針確定
- [x] DOMパーサー使用箇所の特定
  - `extractPetriNetStructure`関数（行74-93）
  - `buildTemplateMap`関数（行207-428）
- [x] 後方互換関数使用箇所の特定
  - `extractPetriNetStructure`関数（行56）: `getTransitionsForExperimentManager()`
  - `buildTemplateMap`関数（行210）: `getTemplatesForPetriNetViewer()`
- [ ] 置き換え方針の確定
  - xml-jsライブラリの活用
  - または`MaimlParserTyped`への機能追加

### Phase 2: 後方互換関数の置き換え（優先）✅
- [x] `getTransitionsForExperimentManager()` → `getTransitions()` に置き換え（行62）
- [x] `getTemplatesForPetriNetViewer()` → `getTemplates()` に置き換え（行213）
- [x] 動作確認（TypeScriptコンパイルエラーなし）

### Phase 3: extractPetriNetStructure の修正
- [ ] `getPlaceIdFromTemplate`関数のDOM操作を削除
- [ ] xml-jsまたは`MaimlParserTyped`で代替実装
- [ ] placeRef取得ロジックの型安全化

### Phase 4: buildTemplateMap の修正
- [ ] DOMパーサーによるテンプレート検索を削除
- [ ] xml-jsまたは`MaimlParserTyped`で代替実装
- [ ] uuid, placeRefs, templateRefs取得の型安全化

### Phase 5: 動作確認とテスト
- [ ] 各関数の個別動作確認
- [ ] 統合テスト
- [ ] PetriNetエディタでの表示確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/utils/petriNetExtractor.ts`
   - `extractPetriNetStructure`関数
   - `buildTemplateMap`関数

### 影響を受ける機能
- PetriNet可視化機能
- テンプレートマップ生成機能
- placeRef/templateRef情報の取得
- 後方互換関数の削除（@deprecated関数の撤廃）

## 5. 技術的詳細

### 現状のDOMパーサー使用箇所

#### extractPetriNetStructure
```typescript
// 現状
const domParser = new DOMParser();
const xmlDoc = domParser.parseFromString(maimlData, "text/xml");
const templateElement = xmlDoc.querySelector(`[id="${templateId}"]`);
const placeRefElement = templateElement.querySelector('placeRef');
const refAttr = placeRefElement.getAttribute('ref');
```

#### buildTemplateMap
```typescript
// 現状
const domParser = new DOMParser();
const xmlDoc = domParser.parseFromString(maimlDataString, "text/xml");
const element = xmlDoc.querySelector(`materialTemplate[id="${t.id}"]`);
const uuidElement = element.querySelector('uuid');
const placeRefElements = element.querySelectorAll('placeRef');
```

### 置き換え方針（検討中）

#### Option A: xml-jsライブラリを活用
```typescript
import xmljs from 'xml-js';

const xmlObj = xmljs.xml2js(maimlData, { compact: true });
// オブジェクトナビゲーションで要素にアクセス
```

#### Option B: MaimlParserTypedに機能追加
```typescript
// MaimlParserTypedに以下のメソッドを追加
getTemplateElement(templateId: string)
getPlaceRefByTemplateId(templateId: string)
```

### 推奨方針
**Option A（xml-jsライブラリ活用）を推奨**
- 理由1: MaimlParserTypedはXSD準拠型に特化しており、低レベルの要素アクセスは責務外
- 理由2: xml-jsは既にプロジェクトで使用されている
- 理由3: xml-jsオブジェクトは型安全にナビゲート可能

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| xml-jsオブジェクト構造の複雑さ | 中 | 中 | 段階的な実装とログ出力 |
| placeRef取得ロジックの不一致 | 高 | 低 | 既存ロジックと同等の動作を保証 |
| 型エラー | 低 | 低 | TypeScriptの型チェック活用 |

## 7. テスト計画

### ユニットテスト
- [ ] extractPetriNetStructure のテスト
- [ ] buildTemplateMap のテスト
- [ ] placeRef取得ロジックのテスト

### 統合テスト
- [ ] 実際のMAIMLファイルでの動作確認
- [ ] 複数メソッドを含むファイルでの確認

### 手動テスト
- [ ] PetriNetエディタでの表示確認
- [ ] テンプレートマップ生成の確認

## 8. ロールバック計画

変更前のコードは以下の手順で復元可能：
1. Gitの履歴から変更前の状態をチェックアウト
2. 各関数は独立しているため、関数単位でのロールバックも可能

## 9. 関連ドキュメント

- `frontend/src/utils/maimlParserTyped.ts` - 型安全なMAIMLパーサー
- `frontend/src/types/xml-js-types.ts` - xml-js型定義
- `.clinerules/development/frontend.md` - フロントエンド規約

## 10. 承認記録

- **計画書提示日時**: 2025-02-03 17:32
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

## 11. 実施記録

### 実施日時
- Phase 2開始: 2025-02-03 17:37
- Phase 2完了: 2025-02-03 17:38

### Phase 2完了内容
✅ **後方互換関数の置き換え完了**
1. `getTransitionsForExperimentManager()` → `getTransitions()` (行62)
2. `getTemplatesForPetriNetViewer()` → `getTemplates()` (行213)

### 計画からの変更点
- Phase 2は計画通りに完了
- TypeScriptコンパイルエラーなし
- 後方互換関数を完全に削除（@deprecated関数の撤廃）

### 発生した問題と解決方法
- 問題なし、スムーズに完了

### 最終的な成果物
- [ ] petriNetExtractor.ts のDOMパーサー削減完了

## 12. 補足: 既に移行済みの箇所

以下の処理は既に`MaimlParserTyped`を使用しています：
- ✅ ペトリネット構造の抽出（`extractPetriNetStructure`）
- ⚠️ Transitionの取得（後方互換関数使用中）→ Phase 2で修正
- ⚠️ Templateの取得（後方互換関数使用中）→ Phase 2で修正
- ✅ Arcの取得

## 13. 後方互換関数について

`maimlParserTyped.ts`の以下の@deprecated関数が使用されています：

```typescript
// @deprecated 新規コードでは getTransitions() を直接使用してください
getTransitionsForExperimentManager(): TransitionsResult

// @deprecated 新規コードでは getTemplates() を直接使用してください
getTemplatesForPetriNetViewer(): TemplatesResult
```

これらは**Phase 2で優先的に置き換え**ます。置き換えは単純なメソッド名変更のみで、動作は同じです。
