# タスク計画書: petriNetExtractor.ts 型定義明確化・XSD準拠化

## メタデータ
- **作成日時**: 2025-02-04 08:07
- **タスクID**: petriNetExtractor_type_definition
- **優先度**: 高
- **推定工数**: 3-4時間

## 1. タスク概要

`frontend/src/utils/petriNetExtractor.ts`の型定義を明確化し、既存の返却型やオブジェクトをXSD準拠の型定義に変更する。

### 現状の問題点

1. **暗黙的なany型の使用**
   - ヘルパー関数の戻り値型が不明確
   - `properties: any[]`などのany型使用
   
2. **XSD型との乖離**
   - Property配列の型が`any[]`
   - 一部の箇所でXSD型が活用されていない
   
3. **拡張型定義の不足**
   - XSD型に存在しない情報（pnmlId, templateIdなど）を扱う際の型定義が不明確

### XSD準拠型定義の活用方針（重要）

✅ **基本方針**: XSD型（maiml-unified.ts）を最大限活用
- `MaterialTemplate`, `ConditionTemplate`, `ResultTemplate`
- `Place`, `Transition`, `Arc`
- `Property`, `PlaceRef`, `TemplateRef`

✅ **拡張型の作成**: XSD型に存在しない情報が必要な場合
- editorv2/types/index.tsで定義されている型（例: `pnmlId`, `templateId`）
- XSD型を基底として拡張する形で定義
- 例: `Place` + `{ pnmlId?: string }` → エディタ用Place型

**実装済み確認:**
- ✅ 主要3関数はすでに型定義済み
- ✅ XSD型のインポート済み
- ⚠️ 内部ヘルパー関数の型定義が不明確（any使用）

## 2. 目的と期待される成果

### 目的
- XSD準拠の型定義への統一
- 型安全性の向上
- コードの保守性・可読性の向上
- IDEの型推論サポートの改善

### 期待される成果
- [x] すべての関数に明示的な型定義
- [x] XSD準拠の型（`maiml-unified.ts`）の使用
- [x] 型エラーのゼロ化
- [x] 型安全なXMLパース処理

## 3. 実装ステップ（メソッド単位の段階的実装）

### 実装方針

✅ **段階的アプローチ**
1. メソッド単位で型定義を修正
2. 各メソッドの返却型を明確化
3. メソッド全量の一覧表で進捗管理
4. 動作確認は全メソッド完了後にまとめて実施

### メソッド一覧と実装状況

| No | メソッド名 | 公開/非公開 | 現状の型定義 | XSD型対応 | 状態 |
|----|-----------|------------|-------------|-----------|------|
| 1 | `extractPetriNetStructure` | 公開 | ✅ 明確 | 部分的 | ⏳ 未着手 |
| 2 | `buildTemplateMap` | 公開 | ✅ 明確 | 部分的 | ⏳ 未着手 |
| 3 | `generateSubnetData` | 公開 | ✅ 明確 | N/A | ⏳ 未着手 |
| 4 | `extractInsertionFromProperties` | 非公開 | ❌ 不明確 | なし | ⏳ 未着手 |
| 5 | `convertPropertiesArrayToNestedFormat` | 非公開 | ❌ 不明確 | なし | ⏳ 未着手 |
| 6 | `convertPropertiesArrayToChildren` | 非公開 | ❌ 不明確 | なし | ⏳ 未着手 |

**状態の凡例:**
- ⏳ 未着手
- 🚧 作業中
- ✅ 完了

### Phase 1: 準備（完了）
- [x] maiml-unified.tsのXSD準拠型を確認
- [x] editorv2/types/index.tsの型を確認
- [x] 現状のpetriNetExtractor.tsの型使用状況を分析
- [x] メソッド一覧表の作成

### Phase 2: XSD型拡張定義の作成
- [ ] XSD型で不足している情報（pnmlId, templateId等）をリストアップ
- [ ] editorv2/types/index.tsに拡張型定義を追加（必要に応じて）
- [ ] ドキュメントコメントで拡張理由を明記

### Phase 3: メソッド単位の型定義修正

#### 3-1. extractInsertionFromProperties（優先度: 高）
- [ ] 関数シグネチャに型定義を追加
- [ ] パラメータ: `properties: Property[]` (XSD型)
- [ ] 戻り値: `{ insertion: InsertionData | null; properties: Property[] }`
- [ ] 内部のany型を置き換え
- [ ] メソッド一覧表を更新（🚧 → ✅）

#### 3-2. convertPropertiesArrayToNestedFormat（優先度: 高）
- [ ] 関数シグネチャに型定義を追加
- [ ] パラメータ: `propertiesArray: Property[]` (XSD型)
- [ ] 戻り値: `Record<string, NestedPropertyNode>`
- [ ] 内部のany型を置き換え
- [ ] メソッド一覧表を更新（🚧 → ✅）

#### 3-3. convertPropertiesArrayToChildren（優先度: 高）
- [ ] 関数シグネチャに型定義を追加
- [ ] パラメータ: `propertiesArray: Property[]` (XSD型)
- [ ] 戻り値: `NestedPropertyNode[]`
- [ ] 内部のany型を置き換え
- [ ] メソッド一覧表を更新（🚧 → ✅）

#### 3-4. extractPetriNetStructure（優先度: 中）
- [ ] XSD型（MaterialTemplate等）の完全活用を確認
- [ ] Property[]型への統一
- [ ] 戻り値型の再確認
- [ ] メソッド一覧表を更新（🚧 → ✅）

#### 3-5. buildTemplateMap（優先度: 中）
- [ ] XSD型（MaterialTemplate等）の完全活用を確認
- [ ] Property[]型への統一
- [ ] 戻り値型の再確認
- [ ] メソッド一覧表を更新（🚧 → ✅）

#### 3-6. generateSubnetData（優先度: 低）
- [ ] 型定義の再確認（すでに明確）
- [ ] 必要に応じて微調整
- [ ] メソッド一覧表を更新（🚧 → ✅）

### Phase 4: 最終確認
- [ ] TypeScript型エラーのゼロ化確認
- [ ] メソッド一覧表の全メソッドが✅になっているか確認
- [ ] IDEの型補完が正しく動作することを確認

### Phase 5: 統合テスト（全メソッド完了後）
- [ ] PetriNetEditorでの動作確認
- [ ] ViewRendererDialogでの動作確認
- [ ] 複数メソッドのMAIMLファイルでのテスト
- [ ] エッジケースのテスト

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/utils/petriNetExtractor.ts` - メイン対象ファイル
   - すべての型定義を明確化
   - XSD準拠型への変更

### 新規作成するファイル
なし（既存ファイルの修正のみ）

### 影響を受ける機能
- **PetriNetEditor**: petriNetExtractorを使用してXMLからPetri Netを抽出
- **ViewRendererDialog**: 実験フロー図の表示
- **SubNetViewer**: サブネットの可視化

### 使用している型定義ファイル
- `frontend/src/types/maiml-unified.ts` - XSD準拠の型定義
- `frontend/src/components/editorv2/types/index.ts` - エディタ用の型定義
- `@xyflow/react` - ReactFlowの型定義

## 5. 技術的詳細

### 型マッピング計画（XSD型拡張方式）

#### XSD型の活用

**maiml-unified.tsから直接使用:**
```typescript
import type {
  MaterialTemplate,    // XSD準拠
  ConditionTemplate,   // XSD準拠
  ResultTemplate,      // XSD準拠
  Property,            // XSD準拠
  PlaceRef,            // XSD準拠
  TemplateRef          // XSD準拠
} from '@/types/maiml-unified';
```

#### XSD型を拡張する型定義（editorv2/types/index.tsに追加）

```typescript
/**
 * XSD型の拡張: Place型にpnmlIdを追加
 * pnmlIdは複数PNMLを扱う際にどのPNMLに属するかを識別するため
 */
export interface PlaceWithPnmlId extends Place {
  data: Place['data'] & {
    pnmlId?: string | null;  // 拡張プロパティ
  };
}

/**
 * XSD型の拡張: Transition型にpnmlIdを追加
 */
export interface TransitionWithPnmlId extends Transition {
  data: Transition['data'] & {
    pnmlId?: string | null;  // 拡張プロパティ
    hasInstruction?: boolean; // 拡張プロパティ
  };
}
```

#### ヘルパー関数の型定義

```typescript
/**
 * insertion要素をproperties配列から分離
 * @param properties - XSD準拠のProperty配列
 * @param templateId - テンプレートID
 * @returns 分離されたinsertion情報とプロパティ配列
 */
const extractInsertionFromProperties = (
  properties: Property[],  // ✅ XSD型
  templateId: string
): {
  insertion: InsertionData | null;
  properties: Property[];  // ✅ XSD型
}

/**
 * Property配列をネスト形式に変換
 * @param propertiesArray - XSD準拠のProperty配列
 * @returns NestedPropertyEditor形式
 */
const convertPropertiesArrayToNestedFormat = (
  propertiesArray: Property[]  // ✅ XSD型
): Record<string, NestedPropertyNode>

/**
 * 子Property配列を変換
 * @param propertiesArray - XSD準拠のProperty配列
 * @returns NestedPropertyNode配列
 */
const convertPropertiesArrayToChildren = (
  propertiesArray: Property[]  // ✅ XSD型
): NestedPropertyNode[]
```

### セキュリティ考慮事項
- [x] XMLパース時のインジェクション対策
- [x] 型安全性によるランタイムエラーの削減
- [x] 不正なXML構造への対処

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存機能の動作不良 | 高 | 中 | 段階的な変更と各段階でのテスト実施 |
| 型定義の複雑化 | 中 | 中 | 適切なコメントと型エイリアスの使用 |
| パフォーマンス低下 | 低 | 低 | 型チェックはコンパイル時のみ |
| XSD型との不整合 | 高 | 低 | maiml-unified.tsの型を厳密に使用 |

## 7. テスト計画

### ユニットテスト
- [ ] extractPetriNet関数の型チェック
- [ ] 型ガード関数のテスト
- [ ] 変換関数の型安全性テスト

### 統合テスト
- [ ] PetriNetEditorでの動作確認
- [ ] ViewRendererDialogでの動作確認
- [ ] 複数メソッドのMAIMLファイルでのテスト

### 手動テスト
- [ ] TypeScript型エラーのゼロ化確認
- [ ] IDEの型補完が正しく動作することを確認
- [ ] エッジケース（空のXML、不正な構造）のテスト

## 8. ロールバック計画

型定義の変更のみで実装ロジックは変更しないため、問題が発生した場合は：
1. Gitで変更を元に戻す
2. 型定義のみを段階的に修正
3. 型エラーが発生する箇所を特定して個別に対処

## 9. 関連ドキュメント

- [maiml-unified.ts型定義](../frontend/src/types/maiml-unified.ts)
- [editorv2型定義](../frontend/src/components/editorv2/types/index.ts)
- [MAIML XSD仕様](../specification/)
- [既存実装計画](./20250203_1731_petriNetExtractor_新方式変換_PLAN.md)

## 10. 承認記録

- **計画書提示日時**: 2025-02-04 08:07
- **承認日時**: （承認待ち）
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
開始: （承認後）
完了: （実施後）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）

### 最終的な成果物
- [ ] 型定義が明確化されたpetriNetExtractor.ts
- [ ] XSD準拠の型定義への変換完了
- [ ] 型エラーのゼロ化
- [ ] 既存機能の正常動作確認

## 12. 振り返り

### うまくいった点
（実施後に記録）

### 改善が必要な点
（実施後に記録）

### 学んだこと
（実施後に記録）