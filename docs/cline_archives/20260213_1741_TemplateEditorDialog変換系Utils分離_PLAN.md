# タスク計画書: TemplateEditorDialog変換系Utils分離

## メタデータ
- **作成日時**: 2026-02-13 17:41
- **タスクID**: template_converter_utils_separation
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

TemplateEditorDialog.tsx（約1,650行）から変換系メソッド（約500-600行）をUtilファイルに分離し、コードの保守性をさらに向上させる。

## 2. 目的と期待される成果

### 目的
- ファイルサイズのさらなる削減（1,650行 → 1,100行程度）
- 変換ロジックの再利用性向上
- テスト容易性の向上
- 責任分離の徹底

### 期待される成果
- [x] TemplateEditorDialog.tsxを約1,100行に削減
- [x] 変換系メソッドを独立したUtilファイルに分離
- [x] 既存機能の動作を維持
- [x] TypeScript型定義の整合性を維持

## 3. 実装ステップ

### Phase 1: 移動対象メソッドの特定
- [x] 変換系メソッドのリストアップ（10個）
- [x] 各メソッドの依存関係を分析
- [x] 必要な型定義とインポートを特定

### Phase 2: Utilファイルの作成
- [ ] `frontend/src/components/editorv2/utils/templateConverter.ts`を作成
- [ ] 必要な型定義をインポート
- [ ] 変換系メソッドを実装
- [ ] 適切な関数コメントを追加

### Phase 3: TemplateEditorDialogの修正
- [ ] templateConverter.tsからのインポートを追加
- [ ] 元の変換メソッド定義を削除（約500-600行削減）
- [ ] メソッド呼び出しを確認

### Phase 4: 動作確認
- [ ] TypeScriptのコンパイルエラーがないことを確認
- [ ] 開発サーバーを起動して動作確認
- [ ] 変換機能が正常に動作することを確認
  - [ ] Property配列 → NestedPropertyEditor形式
  - [ ] NestedPropertyEditor形式 → Property配列
  - [ ] Content配列の変換
  - [ ] XML名前空間解析
  - [ ] フォルダツリー構築

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`
   - 変換系メソッド定義を削除（約500-600行削減）
   - インポート文を追加

### 新規作成するファイル
1. `frontend/src/components/editorv2/utils/templateConverter.ts`
   - 10個の変換系メソッド（約500-600行）
   - 型定義のインポート

### 影響を受ける機能
- Template編集の全機能
- Property/Content変換処理
- XML名前空間取り込み機能

## 5. 技術的詳細

### 移動するメソッド一覧

#### 1. Property変換系（4メソッド）
```typescript
// Property配列 → NestedPropertyEditor形式
export function convertPropertiesArrayToNestedFormat(
  propertiesArray: Property[]
): Record<string, PropertyData>

// 再帰的な子プロパティ変換
export function convertPropertiesArrayToNestedFormatRecursive(
  propertiesArray: Property[]
): PropertyData[]

// PropertyData形式 → Property配列
export function convertPropertyDataToPropertiesArray(
  propertyDataRecord: Record<string, PropertyData>
): Property[]

// PropertyDataの子要素配列をProperty/Content配列に分離
export function convertPropertyDataChildrenToArrays(
  children: PropertyData[]
): { properties: Property[]; contents: Content[] }
```

#### 2. Content変換系（2メソッド）
```typescript
// Content配列 → NestedPropertyEditor形式
export function convertContentsArrayToNestedFormat(
  contentsArray: Content[]
): Record<string, PropertyData>

// 再帰的な子Content変換
export function convertContentsArrayToNestedFormatRecursive(
  contentsArray: Content[]
): PropertyData[]

// PropertyData形式 → Content配列
export function convertPropertyDataToContentsArray(
  propertyDataRecord: Record<string, PropertyData>
): Content[]
```

#### 3. XML解析系（2メソッド）
```typescript
// XMLから名前空間定義を解析
export function parseNamespacesFromXml(
  xmlContent: string
): Record<string, PropertyData>

// 子property要素を再帰的に解析
export function parseChildPropertiesFromXml(
  propertyElements: ElementCompact | ElementCompact[]
): PropertyData[]
```

#### 4. UI支援系（1メソッド）
```typescript
// フォルダツリー構築
export function buildTreeData(
  files: TemplateFile[]
): TreeNode[]
```

### 新規Utilファイルの構造

```typescript
// frontend/src/components/editorv2/utils/templateConverter.ts

/**
 * templateConverter - Template変換ユーティリティ
 * 
 * TemplateEditorDialogから分離
 * Property/Content変換、XML解析、UIヘルパー関数を提供
 * 
 * @version 1.0.0
 * @date 2026-02-13
 */

import { Property, Content, PropertyCustomElement } from '@/types/maiml-unified';
import { xml2js, ElementCompact } from 'xml-js';
import type { PropertyData } from '../components/NestedPropertyEditor';
import type { TemplateFile } from '@/api/templateApi';
import { FileOutlined, FolderOutlined } from '@ant-design/icons';

// ===== Property変換系 =====
export function convertPropertiesArrayToNestedFormat(...) { ... }
export function convertPropertiesArrayToNestedFormatRecursive(...) { ... }
export function convertPropertyDataToPropertiesArray(...) { ... }
export function convertPropertyDataChildrenToArrays(...) { ... }

// ===== Content変換系 =====
export function convertContentsArrayToNestedFormat(...) { ... }
export function convertContentsArrayToNestedFormatRecursive(...) { ... }
export function convertPropertyDataToContentsArray(...) { ... }

// ===== XML解析系 =====
export function parseNamespacesFromXml(...) { ... }
export function parseChildPropertiesFromXml(...) { ... }

// ===== UI支援系 =====
interface TreeNode {
  title: string;
  value: string;
  key: string;
  isLeaf?: boolean;
  children?: TreeNode[];
  icon?: React.ReactNode;
}

export function buildTreeData(...) { ... }
```

### 必要なインポート

**templateConverter.tsで必要:**
```typescript
import { Property, Content, PropertyCustomElement } from '@/types/maiml-unified';
import { xml2js, ElementCompact } from 'xml-js';
import type { PropertyData } from '../components/NestedPropertyEditor';
import type { TemplateFile } from '@/api/templateApi';
import { FileOutlined, FolderOutlined } from '@ant-design/icons';
import React from 'react';
```

**TemplateEditorDialog.tsxで追加:**
```typescript
import {
  convertPropertiesArrayToNestedFormat,
  convertPropertiesArrayToNestedFormatRecursive,
  convertContentsArrayToNestedFormat,
  convertPropertyDataToPropertiesArray,
  convertPropertyDataToContentsArray,
  parseNamespacesFromXml,
  buildTreeData,
} from '../utils/templateConverter';
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| インポートパスの誤り | 高 | 中 | TypeScriptコンパイルで即座に検知 |
| 型定義の不整合 | 高 | 低 | 適切な型エクスポート/インポート |
| 再帰関数の動作不良 | 高 | 低 | 関数単位でテスト |
| 循環インポート | 中 | 低 | 依存関係を明確に設計 |
| XML解析の失敗 | 中 | 低 | エラーハンドリングを維持 |

## 7. テスト計画

### 単体テスト（将来実装）
- [ ] convertPropertiesArrayToNestedFormat
- [ ] convertPropertyDataToPropertiesArray
- [ ] convertContentsArrayToNestedFormat
- [ ] parseNamespacesFromXml
- [ ] buildTreeData

### 手動テスト

#### Property変換
- [ ] Property配列からNestedPropertyEditor形式への変換
- [ ] NestedPropertyEditor形式からProperty配列への逆変換
- [ ] ネスト構造の保持確認
- [ ] customElementsの変換確認

#### Content変換
- [ ] Content配列からNestedPropertyEditor形式への変換
- [ ] ResultTemplate用のContent編集確認
- [ ] uncertaintyの変換確認

#### XML名前空間取り込み
- [ ] テンプレートファイル選択
- [ ] XMLプレビュー表示
- [ ] 名前空間解析
- [ ] プロパティ取り込み
- [ ] 重複チェック

#### フォルダツリー
- [ ] テンプレートファイル一覧表示
- [ ] フォルダ構造の表示
- [ ] ファイル選択

## 8. ロールバック計画

問題が発生した場合の手順：
1. 新規作成した`templateConverter.ts`を削除
2. `TemplateEditorDialog.tsx`を元の状態に戻す（gitから復元）
3. 動作確認

**Gitコマンド:**
```bash
# 変更を破棄してロールバック
git checkout frontend/src/components/editorv2/components/TemplateEditorDialog.tsx
rm frontend/src/components/editorv2/utils/templateConverter.ts
```

## 9. 関連ドキュメント

- [TemplateEditorDialog仕様](./frontend/src/components/editorv2/components/TemplateEditorDialog.tsx)
- [NestedPropertyEditor分離計画](./docs/20260213_1725_NestedPropertyEditor分離_PLAN.md)
- [maiml-unified型定義](./frontend/src/types/maiml-unified.ts)
- [editor型定義](./frontend/src/types/editor.ts)

## 10. 承認記録

- **計画書提示日時**: 2026-02-13 17:41
- **承認日時**: （ユーザーの承認待ち）
- **承認者コメント**: （承認後に記入）

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] `templateConverter.ts` - 新規作成（約550行）
- [ ] `TemplateEditorDialog.tsx` - 約550行削減（1,650行 → 1,100行）
- [ ] 既存機能の動作確認完了

## 12. 振り返り

### うまくいった点
（作業完了後に記入）

### 改善が必要な点
（作業完了後に記入）

### 学んだこと
（作業完了後に記入）

---

## 補足: ファイル分離の追加メリット

### 1. 再利用性の大幅向上
- 他のコンポーネントからも変換関数を使用可能
- テスト環境での独立した動作確認が容易

### 2. 保守性の向上
- 変換ロジックの修正が独立して可能
- バグ修正の影響範囲が限定される

### 3. 単体テストの実装が容易
- 純粋関数として独立したテストが可能
- モックデータでの動作確認が容易

### 4. 開発効率
- 複数の開発者が並行して作業可能
- Git差分が見やすくなる
- コードレビューが効率化

### 5. パフォーマンス
- 変換関数の最適化が独立して実施可能
- メモ化などの最適化を適用しやすい

## 13. 実装後の構造

### ディレクトリ構成
```
frontend/src/components/editorv2/
├── components/
│   ├── TemplateEditorDialog.tsx  (約1,100行)
│   └── NestedPropertyEditor.tsx  (約650行)
└── utils/
    └── templateConverter.ts      (約550行)
```

### モジュール依存関係
```
TemplateEditorDialog.tsx
  ↓ import
  ├── NestedPropertyEditor.tsx
  └── templateConverter.ts
      ↓ import
      ├── maiml-unified.ts (型定義)
      └── NestedPropertyEditor.tsx (PropertyData型)
```

## 14. 長期的な改善計画

### Phase 2: 単体テストの実装（将来）
- [ ] Jest/Vitestでテストファイルを作成
- [ ] 各変換関数のテストケースを実装
- [ ] エッジケースのテストを追加

### Phase 3: パフォーマンス最適化（将来）
- [ ] 大規模データでのプロファイリング
- [ ] メモ化の導入
- [ ] 不要な再計算の削減

### Phase 4: エラーハンドリング強化（将来）
- [ ] より詳細なエラーメッセージ
- [ ] リカバリー処理の実装
- [ ] バリデーション機能の追加
