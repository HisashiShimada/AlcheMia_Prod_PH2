# PetriNetEditorV2移植 Phase 11 計画書

## メタデータ
- **作成日時**: 2026-01-29 15:56
- **タスクID**: PetriNetEditorV2_Phase11_TemplateViewer
- **優先度**: 🔴 高（機能欠落中）
- **推定工数**: 2時間

## 1. タスク概要

TemplateViewerフォルダ（3ファイル）をreference版からeditorv2へ移植します。これらはテンプレート一覧表示機能を提供する独立したコンポーネント群です。

## 2. 目的と期待される成果

### 目的
- テンプレート一覧表示機能の実装
- Material/Condition/Result テンプレートの可視化
- PetriNetEditorV2からの参照エラー解消

### 期待される成果
- [x] TemplateItem.tsx の実装完了
- [x] TemplateList.tsx の実装完了
- [x] index.ts のエクスポート設定完了
- [x] TypeScript化（型定義付き）
- [x] Ant Design対応

## 3. 実装ステップ

### Phase 11-1: TemplateItem.tsx（基礎コンポーネント）
- [x] reference版 TemplateItem.jsx を確認
- [x] TypeScript型定義を作成
- [x] Ant Designコンポーネントに変換
  - Card → Ant Design Card
  - Typography → Ant Design Typography
  - Chip → Ant Design Tag
  - IconButton → Ant Design Button
- [x] テンプレートアイテム表示機能を実装
- [x] クリックイベントハンドリング

### Phase 11-2: TemplateList.tsx（リストコンポーネント）
- [x] reference版 TemplateList.jsx を確認
- [x] TypeScript型定義を作成
- [x] Ant Designコンポーネントに変換
  - Box → Space/div
  - Paper → Card
- [x] TemplateItemを使用したリスト表示
- [x] カテゴリ別グルーピング機能

### Phase 11-3: index.ts（エクスポート）
- [x] TemplateListをデフォルトエクスポート
- [x] TemplateItemを名前付きエクスポート
- [x] 型定義のエクスポート

## 4. 影響範囲

### 新規作成するファイル
1. `frontend/src/components/editorv2/components/TemplateViewer/TemplateItem.tsx`
2. `frontend/src/components/editorv2/components/TemplateViewer/TemplateList.tsx`
3. `frontend/src/components/editorv2/components/TemplateViewer/index.ts`

### 参照元（修正予定なし）
- `PetriNetEditorV2.tsx` - 現在はimportがコメントアウトされている可能性

## 5. 技術的詳細

### 使用する技術・ライブラリ
- React 18.2.0
- TypeScript
- Ant Design v6
  - Card
  - Typography (Text, Title)
  - Tag
  - Button
  - Space

### 型定義（予定）

```typescript
// TemplateItem用
interface TemplateItemProps {
  template: {
    id: string;
    name: string;
    type: 'Material' | 'Condition' | 'Result';
    description?: string;
    namespace?: string;
  };
  selected?: boolean;
  onClick?: (template: any) => void;
}

// TemplateList用
interface TemplateListProps {
  templates: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
    namespace?: string;
  }>;
  selectedTemplateId?: string;
  onTemplateClick?: (template: any) => void;
  groupByType?: boolean;
}
```

### コンポーネント変換マッピング

| Material-UI (reference) | Ant Design (editorv2) |
|------------------------|---------------------|
| Card | Card |
| CardContent | Card (bodyタグ) |
| Typography | Typography.Text / Title |
| Chip | Tag |
| IconButton | Button (icon付き) |
| Box | Space / div |
| Paper | Card |

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| reference版が見つからない | 高 | 低 | 類似コンポーネントから推測実装 |
| 型定義の不足 | 中 | 中 | 使用箇所から型を逆算 |
| スタイリングの違い | 低 | 高 | Ant Designのデフォルトスタイルで対応 |

## 7. テスト計画

### 手動テスト
- [x] TemplateItemが正しく表示される
- [x] TemplateListがテンプレートをグループ化して表示
- [x] クリックイベントが正常に発火
- [x] TypeScriptエラーなし

## 8. ロールバック計画

新規ファイル作成のため、削除のみで対応可能。

## 9. 関連ドキュメント

- [PetriNetEditorV2_移植統合ドキュメント.md](./PetriNetEditorV2_移植統合ドキュメント.md)
- [Phase 10完了報告](./20260129_1455_PetriNetEditorV2移植_Phase10完了報告.md)

## 10. 承認記録

- **計画書提示日時**: 2026-01-29 15:56
- **承認日時**: 承認待ち
- **承認者コメント**: -

## 11. 実施記録

### 実施日時
開始: 2026-01-29 15:56
完了: 未完了

### 計画からの変更点
（実施後に記録）

### 発生した問題と解決方法
（実施後に記録）

## 12. 振り返り

（完了後に記録）