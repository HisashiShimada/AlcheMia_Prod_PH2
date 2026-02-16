# タスク計画書: NestedPropertyEditor分離

## メタデータ
- **作成日時**: 2026-02-13 17:25
- **タスクID**: NestedPropertyEditor_separation
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

TemplateEditorDialog.tsx（約1,500行）が大きすぎるため、内部のNestedPropertyEditorコンポーネント（約300行）を別ファイルに分離してコードの保守性を向上させる。

## 2. 目的と期待される成果

### 目的
- ファイルサイズの削減による可読性向上
- コンポーネントの責任分離
- テスト容易性の向上
- 再利用性の向上

### 期待される成果
- [x] TemplateEditorDialog.tsxを約1,200行に削減
- [x] NestedPropertyEditorを独立したファイルに分離
- [x] 既存機能の動作を維持
- [x] TypeScript型定義の整合性を維持

## 3. 実装ステップ

### Phase 1: 依存関係の分析
- [x] NestedPropertyEditorが使用している型定義を特定
- [x] NestedPropertyEditorが使用しているインポートを特定
- [x] NestedPropertyEditorが受け取るPropsの完全な定義を確認
- [x] 再帰的な呼び出し構造を確認

### Phase 2: 新規ファイルの作成
- [ ] `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx`を作成
- [ ] 必要なインポートを追加
- [ ] 型定義（PropertyData, NestedPropertyEditorProps）を移動
- [ ] MAIML_PROPERTY_TYPES定数を移動（または共通化）

### Phase 3: コンポーネント本体の移動
- [ ] NestedPropertyEditorコンポーネントを新ファイルにコピー
- [ ] 不要なインポートを削除
- [ ] export defaultでコンポーネントをエクスポート

### Phase 4: TemplateEditorDialogの修正
- [ ] NestedPropertyEditorのインポート文を追加
- [ ] 元のNestedPropertyEditor定義を削除
- [ ] PropertyData型定義の共通化（または両ファイルで使用）

### Phase 5: 動作確認
- [ ] TypeScriptのコンパイルエラーがないことを確認
- [ ] 開発サーバーを起動して動作確認
- [ ] NestedPropertyEditorの全機能が正常に動作することを確認
  - [ ] 展開/折りたたみ
  - [ ] 属性の追加・編集・削除
  - [ ] 要素の追加・編集・削除
  - [ ] 子要素の追加
  - [ ] 同階層コピー
  - [ ] プロパティの削除

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`
   - NestedPropertyEditorコンポーネント定義を削除（約300行削減）
   - インポート文を追加（1行追加）

### 新規作成するファイル
1. `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx`
   - NestedPropertyEditorコンポーネント（約300行）
   - 型定義（PropertyData, NestedPropertyEditorProps）
   - MAIML_PROPERTY_TYPES定数（必要に応じて）

### 影響を受ける機能
- TemplateEditorDialogの全機能（Propertiesセクション、Contentsセクション）
- ネストされたプロパティの編集機能

## 5. 技術的詳細

### 移動する型定義

```typescript
/**
 * PropertyData型定義（NestedPropertyEditor用）
 */
interface PropertyData {
  key: string;
  tagName: string;
  attributes: Record<string, string>;
  elements: Record<string, string>;
  children: PropertyData[];
}

/**
 * NestedPropertyEditor Props
 */
interface NestedPropertyEditorProps {
  propertyData: PropertyData;
  propertyKey: string;
  level?: number;
  expandedNodes: Set<string>;
  onToggleExpanded: (nodeId: string) => void;
  onAddNestedChild: (parentKey: string, childTagName: string, specifiedKey?: string) => void;
  onAddSameLevelCopy: (sourceData: PropertyData, newKey: string) => void;
  onUpdateNestedAttribute: (propertyKey: string, attrName: string, attrValue: string) => void;
  onUpdateNestedElement: (propertyKey: string, elemName: string, elemValue: string) => void;
  onDeleteNestedAttribute: (propertyKey: string, attrName: string) => void;
  onDeleteNestedElement: (propertyKey: string, elemName: string) => void;
  onDeleteProperty: (propertyKey: string) => void;
  forceRenderKey: number;
}
```

### 移動するインポート

```typescript
import React, { useState, useMemo } from 'react';
import {
  Button,
  Input,
  Alert,
  Space,
  Typography,
  Select,
  Tag,
  message,
  Modal,
} from 'antd';
import {
  CloseOutlined,
  DownOutlined,
  RightOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons';
```

### MAIML_PROPERTY_TYPES定数の扱い

**オプション1（推奨）**: 共通定数ファイルに移動
- `frontend/src/components/editorv2/constants/maimlPropertyTypes.ts`を作成
- 両ファイルからインポート

**オプション2**: NestedPropertyEditorに移動
- NestedPropertyEditor.tsxにのみ配置
- TemplateEditorDialogからは削除

**決定**: オプション2を採用（MAIML_PROPERTY_TYPESはNestedPropertyEditor内でのみ使用されている）

### 新規ファイルの構造

```typescript
// frontend/src/components/editorv2/components/NestedPropertyEditor.tsx

/**
 * NestedPropertyEditor - ネスト構造プロパティ編集（独立版）
 * 
 * TemplateEditorDialog.tsxから分離
 * 
 * @version 2.0.0
 * @date 2026-02-13
 */

import React, { useState, useMemo } from 'react';
import { ... } from 'antd';
import { ... } from '@ant-design/icons';

// 型定義
export interface PropertyData { ... }
export interface NestedPropertyEditorProps { ... }

// 定数
const MAIML_PROPERTY_TYPES = [ ... ];

// コンポーネント本体
const NestedPropertyEditor: React.FC<NestedPropertyEditorProps> = ({ ... }) => {
  // 実装
};

export default NestedPropertyEditor;
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| インポートパスの誤り | 高 | 中 | TypeScriptコンパイルで即座に検知、修正 |
| 型定義の不整合 | 高 | 低 | exportした型を正しくインポート |
| 再帰的な呼び出しが動作しない | 高 | 低 | 同一ファイル内で定義するため問題なし |
| MAIML_PROPERTY_TYPES定数が見つからない | 中 | 中 | 新ファイルに確実に含める |
| forceRenderKeyの動作不良 | 中 | 低 | Propsとして正しく渡されているか確認 |

## 7. テスト計画

### 手動テスト

#### プロパティ編集機能
- [ ] ルートレベルのプロパティ表示
- [ ] 属性の追加・編集・削除
- [ ] 要素の追加・編集・削除
- [ ] 子要素の追加（propertyListType）
- [ ] 同階層コピー機能
- [ ] プロパティの削除
- [ ] 展開/折りたたみ機能

#### ネスト構造のテスト
- [ ] 2階層のネスト構造
- [ ] 3階層以上のネスト構造
- [ ] 深いネストでの属性・要素編集
- [ ] 深いネストでの削除操作

#### 視覚的な確認
- [ ] インデントが正しく表示される
- [ ] レベルごとの色分けが正しい
- [ ] ボタン配置が正しい
- [ ] モーダルが正しく表示される

#### Contents機能（ResultTemplate）
- [ ] Contents編集でも同じコンポーネントが動作する
- [ ] Contents用のハンドラーが正しく動作する

### エラーケース
- [ ] 空のキーで追加しようとした場合
- [ ] 重複したキーで追加しようとした場合
- [ ] 不正な型を指定した場合

## 8. ロールバック計画

問題が発生した場合の手順：
1. 新規作成した`NestedPropertyEditor.tsx`を削除
2. `TemplateEditorDialog.tsx`を元の状態に戻す（gitから復元）
3. 動作確認

**Gitコマンド:**
```bash
# 変更を破棄してロールバック
git checkout frontend/src/components/editorv2/components/TemplateEditorDialog.tsx
rm frontend/src/components/editorv2/components/NestedPropertyEditor.tsx
```

## 9. 関連ドキュメント

- [TemplateEditorDialog仕様](./frontend/src/components/editorv2/components/TemplateEditorDialog.tsx)
- [maiml-unified型定義](./frontend/src/types/maiml-unified.ts)
- [editor型定義](./frontend/src/types/editor.ts)

## 10. 承認記録

- **計画書提示日時**: 2026-02-13 17:25
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
- [ ] `NestedPropertyEditor.tsx` - 新規作成（約350行）
- [ ] `TemplateEditorDialog.tsx` - 約300行削減（1,500行 → 1,200行）
- [ ] 既存機能の動作確認完了

## 12. 振り返り

### うまくいった点
（作業完了後に記入）

### 改善が必要な点
（作業完了後に記入）

### 学んだこと
（作業完了後に記入）

---

## 補足: ファイル分離のメリット

### 1. 可読性の向上
- TemplateEditorDialogが約1,200行に削減
- NestedPropertyEditorの責任範囲が明確化

### 2. 保守性の向上
- NestedPropertyEditorの修正が独立して可能
- 影響範囲が限定される

### 3. テスト容易性
- NestedPropertyEditorを独立してテスト可能
- モックデータでの動作確認が容易

### 4. 再利用性
- 将来、他のコンポーネントからも利用可能
- 汎用的なネスト構造編集コンポーネントとして活用

### 5. 開発効率
- 2つのファイルを並行して開発・レビュー可能
- Git差分が見やすくなる
