# タスク計画書: 進捗確認タブ余白レイアウト修正

## メタデータ
- **作成日時**: 2026-05-15 10:18
- **タスクID**: progress-tab-layout-fix
- **優先度**: 低
- **推定工数**: 0.5時間

## タスク概要

実験管理者画面において、「進捗確認」タブのレイアウト（余白）を「プロジェクト管理」タブおよび「フォーマット管理」タブと統一する。

## 目的と期待される成果

### 目的
進捗確認タブとプロジェクト管理タブ・フォーマット管理タブのレイアウト差異を解消し、画面全体として一貫した見た目を提供する。

### 期待される成果
- [x] 進捗確認タブの外側余白が他タブと統一される
- [x] 進捗確認タブのスクロール挙動が他タブと統一される
- [x] 進捗確認タブの上部フィルタエリアの余白がプロジェクト管理タブと統一される

## 差異の詳細

### ExperimentAdminMenu.tsx のタブラッパー比較

| タブ | overflow 設定 |
|------|-------------|
| Tab1: プロジェクト管理 | `overflow: 'hidden'` |
| Tab2: フォーマット管理 | `overflow: 'hidden'` |
| Tab3: 進捗確認 | `overflow: 'auto'` ← **差異あり** |

### コンポーネントのルートdiv比較

| コンポーネント | スタイル |
|---|---|
| `ProjectManagement.tsx` | `padding` なし、`height: '100%'` |
| `ProgressMonitoring.tsx` | `padding: token.paddingLG` あり、`minHeight: '100vh'` ← **差異あり** |

### フィルタCard比較（追加対応）

| コンポーネント | スタイル |
|---|---|
| `ProjectManagement.tsx` ツールバーCard | `borderBottom`, `borderRadius: 0`, `body.padding: margin×paddingLG` |
| `ProgressMonitoring.tsx` フィルタCard | `marginBottom`, デフォルト `body.padding`（24px）← **差異あり** |

## 実装ステップ

### Phase 1: タスク計画書作成・承認
- [x] タスク計画書作成
- [x] ユーザー承認

### Phase 2: 実装
- [x] `ProgressMonitoring.tsx` のルートdivスタイル修正
- [x] `ExperimentAdminMenu.tsx` の Tab3 ラッパーの overflow 修正
- [x] `ProgressMonitoring.tsx` のフィルタCardスタイル修正（追加対応）

### Phase 3: 確認
- [x] 変更内容のレビュー・計画書更新

## 変更したファイル

### 1. `frontend/src/components/progress/ProgressMonitoring.tsx`

#### ルートdiv（366行目）
```tsx
// 変更前
<div style={{ padding: token.paddingLG, backgroundColor: token.colorBgLayout, minHeight: '100vh' }}>

// 変更後
<div style={{ backgroundColor: token.colorBgLayout, height: '100%', display: 'flex', flexDirection: 'column' }}>
```
- `padding: token.paddingLG` を削除
- `minHeight: '100vh'` → `height: '100%'` に変更
- `display: 'flex', flexDirection: 'column'` を追加（縦並びレイアウト）

#### フィルタCard（368行目）（追加対応）
```tsx
// 変更前
<Card style={{ marginBottom: token.paddingLG }} variant="borderless">

// 変更後
<Card
  variant="borderless"
  style={{
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 0,
  }}
  styles={{ body: { padding: `${token.margin}px ${token.paddingLG}px` } }}
>
```
- `marginBottom` を削除
- `borderBottom`・`borderRadius: 0` を追加（ProjectManagementのツールバーCardに統一）
- `body.padding` を `token.margin × token.paddingLG` に変更（上下余白小さめ・左右余白大きめ）

### 2. `frontend/src/components/menus/ExperimentAdminMenu.tsx`（167行目）
```tsx
// 変更前
<div style={{ display: currentTab === '3' ? 'block' : 'none', height: '100%', overflow: 'auto' }}>

// 変更後
<div style={{ display: currentTab === '3' ? 'block' : 'none', height: '100%', overflow: 'hidden' }}>
```
- `overflow: 'auto'` → `overflow: 'hidden'`（Tab1/Tab2と統一）

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| テーブルのスクロールが効かなくなる | 中 | 低 | ProgressMonitoring内のCardには scroll 設定があるため問題なし |

## テスト計画

### 手動テスト
- [x] 実験管理者でログインし、進捗確認タブを表示
- [x] プロジェクト管理タブと余白が同じであることを確認
- [x] テーブルのスクロールが正常に動作することを確認

## 承認記録

- **計画書提示日時**: 2026-05-15 10:18
- **承認日時**: 2026-05-15 10:22
- **承認者コメント**: 承認

## 実施記録

### 実施日時
開始: 2026-05-15 10:22
完了: 2026-05-15 11:18

### 計画からの変更点
- フィルタCardのスタイル修正を追加対応（ユーザーからの追加依頼）
- ルートdivに `display: 'flex', flexDirection: 'column'` を追加（縦並びレイアウト実現のため）
- テーブルCardの `padding: 0` 適用はユーザー要望によりリバート（デフォルト padding を維持）

### 最終的な成果物
- [x] `frontend/src/components/progress/ProgressMonitoring.tsx` 修正
- [x] `frontend/src/components/menus/ExperimentAdminMenu.tsx` 修正
