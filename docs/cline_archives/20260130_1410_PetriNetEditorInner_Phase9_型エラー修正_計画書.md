# PetriNetEditorInner Phase 9 タスク計画書: 型エラー修正

## メタデータ
- **作成日時**: 2026-01-30 14:10
- **Phase**: Phase 9 - 型エラー修正
- **優先度**: 高
- **推定工数**: 1-2時間

---

## 1. タスク概要

Phase 8で統合されたPetriNetEditorInner.tsxに残存する約60箇所の型エラーを修正し、TypeScriptコンパイルとESLintチェックを通過させる。

## 2. 目的と期待される成果

### 目的
- TypeScript型エラーの完全解消
- ESLintエラーの解消
- 型安全性の確保
- ビルドエラーの解消

### 期待される成果
- [ ] TypeScriptコンパイルエラー 0件
- [ ] ESLintエラー 0件
- [ ] 型安全性の確保
- [ ] 動作確認完了

## 3. 実装ステップ

### Phase 9.1: 高優先度エラー修正（30分）

#### Step 1: handleOpenSaveConfirmDialog 定義順序修正
- **箇所**: Line 497
- **エラー**: ブロック スコープの変数が宣言の前に使用
- **対策**: useKeyboardShortcuts より前に関数を定義

```typescript
// ✅ 修正後の順序
// 1. handleOpenSaveConfirmDialog を定義
const handleOpenSaveConfirmDialog = useCallback(async () => {
  // ... 実装
}, [nodes, edges, documentData]);

// 2. useKeyboardShortcuts を呼び出し
const { pressedKeys: keysPressedFromHook } = useKeyboardShortcuts({
  handleOpenSaveConfirmDialog,
  // ...
});
```

#### Step 2: DocumentData 型不一致修正
- **箇所**: Line 690, 3672
- **エラー**: creators プロパティの型に互換性がない
- **対策**: editorTypes.ts で統一型を定義

```typescript
// editorTypes.ts に追加
export interface CreatorData {
  creator: string;
}

export interface VendorData {
  vendor: string;
}

export interface OwnerData {
  owner: string;
}

export interface InstrumentData {
  instrument: string;
}

export interface DocumentData {
  id?: string;
  protocolId?: string;
  methodId?: string;
  pnmlId?: string;
  programId?: string;
  name: string;
  description?: string;
  date?: string;
  uuid?: string;
  creators: CreatorData[];
  vendors: VendorData[];
  owners: OwnerData[];
  instruments: InstrumentData[];
}
```

### Phase 9.2: 中優先度エラー修正（40分）

#### Step 3: 暗黙的 any 型修正（約30箇所）

**パターン1: イベントハンドラ**
```typescript
// ❌ Before
const handlePaneClick = useCallback((event) => {

// ✅ After
const handlePaneClick = useCallback((event: React.MouseEvent) => {
```

**パターン2: map コールバック**
```typescript
// ❌ Before
.map((method, index) => {

// ✅ After
.map((method: Method, index: number) => {
```

**パターン3: filter コールバック**
```typescript
// ❌ Before
.filter((node) => {

// ✅ After
.filter((node: Node) => {
```

#### Step 4: ValidationResult 型不一致修正
- **箇所**: Line 3680
- **エラー**: プロパティ 'isValid' が必須
- **対策**: editorTypes.ts で統一型を定義

```typescript
// editorTypes.ts
export interface ValidationError {
  id: string;
  type: 'node' | 'edge';
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidationResult {
  success: boolean;
  isValid: boolean;  // ValidationPanel 用
  errors: ValidationError[];
  warnings: ValidationError[];
}
```

#### Step 5: TemplateRef 型不一致修正
- **箇所**: Line 3596, 3651, 3652
- **エラー**: TemplateRef と Template 間の型不一致
- **対策**: 統一型定義を作成

```typescript
// editorTypes.ts
export interface TemplateRef {
  id: string;
  name: string;
  type: 'material' | 'condition' | 'result';
  namespace?: string;
}

export interface Template extends TemplateRef {
  // 追加のプロパティ
  content?: string;
  properties?: Record<string, any>;
}
```

### Phase 9.3: 低優先度エラー修正（20分）

#### Step 6: React Flow 型不一致修正
- **箇所**: Line 3543, 3560
- **エラー**: SelectionMode, BackgroundVariant の型不一致
- **対策**: 型アサーションまたは互換性対応

```typescript
// Option A: 型アサーション
selectionMode={selectionMode as any}

// Option B: ReactFlow の型をインポート
import type { SelectionMode, BackgroundVariant } from 'reactflow';
```

### Phase 9.4: ESLint エラー解消（10分）

#### Step 7: ESLint ルール対応
- 未使用変数の削除
- 不要なコメントの整理
- Formatting の統一

### Phase 9.5: 動作確認（20分）

#### Step 8: ビルドとテスト
```bash
# TypeScript コンパイル確認
cd frontend
npm run type-check

# ESLint 確認
npm run lint

# ビルド確認
npm run build

# 開発サーバー起動
npm run dev
```

#### Step 9: 機能確認
- [ ] エディタ起動
- [ ] ノード追加・削除
- [ ] エッジ追加・削除
- [ ] キーボードショートカット（Ctrl+C, Ctrl+V, Delete）
- [ ] 保存・読み込み
- [ ] バリデーション

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
   - 関数定義順序の調整
   - 型アノテーション追加
   - 型アサーション追加

2. `frontend/src/components/editorv2/types/editorTypes.ts`
   - DocumentData 型定義追加
   - CreatorData, VendorData 等の型定義追加
   - ValidationResult 型定義修正
   - TemplateRef, Template 型定義追加

### 影響を受ける機能
- すべての機能（型安全性の向上）

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 型定義変更による他コンポーネントへの影響 | 中 | 中 | 段階的に修正、ビルドエラー確認 |
| React Flow バージョン互換性問題 | 低 | 低 | 型アサーションで対応 |
| 予期しない動作の変更 | 中 | 低 | 各ステップで動作確認 |

## 6. テスト計画

### ユニットテスト
- [ ] 型定義のエクスポート確認
- [ ] ValidationResult の互換性確認

### 手動テスト
- [ ] エディタ基本操作
- [ ] キーボードショートカット
- [ ] 保存・読み込み
- [ ] バリデーション機能

## 7. ロールバック計画

問題が発生した場合:
```bash
# Phase 8の状態に戻す
git checkout frontend/src/components/editorv2/PetriNetEditorInner.tsx
git checkout frontend/src/components/editorv2/types/editorTypes.ts
```

## 8. 関連ドキュメント

- [Phase 8 完了報告](20260130_1405_PetriNetEditorInner_Phase8_完了報告.md)
- [型定義ファイル](../frontend/src/components/editorv2/types/editorTypes.ts)

## 9. 承認記録

- **計画書提示日時**: 2026-01-30 14:10
- **承認日時**: （承認待ち）
- **承認者コメント**: （記入予定）

## 10. 実施記録

### 実施日時
- 開始: （実施開始時に記入）
- 完了: （実施完了時に記入）

### 計画からの変更点
- （実施中に記入）

### 発生した問題と解決方法
- （実施中に記入）

---

**Phase 9 計画書作成日時**: 2026-01-30 14:10
**次回作業**: 承認後、Phase 9.1 から実施開始
**ステータス**: 計画書作成完了、承認待ち