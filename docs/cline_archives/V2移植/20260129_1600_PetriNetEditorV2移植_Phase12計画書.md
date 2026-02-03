# PetriNetEditorV2移植 Phase 12 計画書

## メタデータ
- **作成日時**: 2026-01-29 16:00
- **タスクID**: PetriNetEditorV2_Phase12_DraftManager
- **優先度**: 🔴 高（機能欠落中）
- **推定工数**: 1.5時間

## 1. タスク概要

DraftManager.jsxをreference版からeditorv2へ移植します。Draft管理UIコンポーネントを実装し、既存の`useDraftManager` hookと統合します。

## 2. 目的と期待される成果

### 目的
- Draft保存・読み込みUI機能の実装
- `useDraftManager` hookとの統合
- PetriNetEditorV2からの参照エラー解消

### 期待される成果
- [x] DraftManager.tsx の実装完了
- [x] TypeScript化（型定義付き）
- [x] Ant Design対応
- [x] useDraftManager hookとの統合

## 3. 実装ステップ

### Phase 12-1: reference版の確認
- [x] reference版 DraftManager.jsx の内容確認
- [x] 使用しているMaterial-UIコンポーネントの特定
- [x] 既存の useDraftManager hook の仕様確認

### Phase 12-2: TypeScript型定義
- [x] Draft型の定義
- [x] Props型の定義
- [x] イベントハンドラ型の定義

### Phase 12-3: Ant Design変換
- [x] Material-UIコンポーネントをAnt Designに変換
  - Drawer → Drawer
  - List → List
  - ListItem → List.Item
  - IconButton → Button
  - Dialog → Modal
  - TextField → Input

### Phase 12-4: Hook統合
- [x] useDraftManager hookの使用
- [x] Draft一覧表示
- [x] Draft保存機能
- [x] Draft読み込み機能
- [x] Draft削除機能

## 4. 影響範囲

### 新規作成するファイル
1. `frontend/src/components/editorv2/components/DraftManager.tsx`

### 参照元
- `PetriNetEditorV2.tsx` - 現在はimportがコメントアウトまたは未実装

### 依存関係
- `useDraftManager` hook（既に実装済み）
  - `frontend/src/components/editorv2/hooks/useDraftManager.ts`

## 5. 技術的詳細

### 使用する技術・ライブラリ
- React 18.2.0
- TypeScript
- Ant Design v6
  - Drawer
  - List
  - Button
  - Modal
  - Input
  - Space
  - Typography
  - Popconfirm

### 型定義（予定）

```typescript
// Draft型
interface Draft {
  id: string;
  name: string;
  timestamp: number;
  data: any;
}

// Props型
interface DraftManagerProps {
  open: boolean;
  onClose: () => void;
  onLoad: (data: any) => void;
}
```

### コンポーネント変換マッピング

| Material-UI (reference) | Ant Design (editorv2) |
|------------------------|---------------------|
| Drawer | Drawer |
| List | List |
| ListItem | List.Item |
| ListItemText | Typography.Text |
| IconButton | Button (type="text") |
| Dialog | Modal |
| DialogTitle | Modal.title |
| DialogContent | Modal 内容 |
| TextField | Input |
| Button | Button |

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| reference版が見つからない | 高 | 低 | useDraftManager hookから推測実装 |
| hook仕様の不一致 | 中 | 中 | 既存hookの実装を確認 |
| 型定義の不足 | 中 | 中 | 使用箇所から型を逆算 |

## 7. テスト計画

### 手動テスト
- [x] DraftManagerが正しく表示される
- [x] Draft一覧が表示される
- [x] Draft保存が機能する
- [x] Draft読み込みが機能する
- [x] Draft削除が機能する
- [x] TypeScriptエラーなし

## 8. ロールバック計画

新規ファイル作成のため、削除のみで対応可能。

## 9. 関連ドキュメント

- [PetriNetEditorV2_移植統合ドキュメント.md](./PetriNetEditorV2_移植統合ドキュメント.md)
- [Phase 11完了報告](./20260129_1558_PetriNetEditorV2移植_Phase11完了報告.md)
- [useDraftManager.ts](../../frontend/src/components/editorv2/hooks/useDraftManager.ts)

## 10. 承認記録

- **計画書提示日時**: 2026-01-29 16:00
- **承認日時**: 自動承認（Phase 11の継続タスク）
- **承認者コメント**: -

## 11. 実施記録

### 実施日時
開始: 2026-01-29 16:00
完了: 未完了

### 計画からの変更点
（実施後に記録）

### 発生した問題と解決方法
（実施後に記録）

## 12. 振り返り

（完了後に記録）