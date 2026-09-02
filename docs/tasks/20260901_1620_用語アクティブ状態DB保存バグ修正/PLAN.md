# タスク計画書: 用語管理グレーアウト・編集ボタン非活性バグ修正

## メタデータ
- **作成日時**: 2026-09-01 16:20
- **タスクID**: 用語管理グレーアウト・編集ボタン非活性バグ修正
- **優先度**: 中
- **推定工数**: 0.5時間

## 1. タスク概要

用語管理（NamespaceMain）で用語を非アクティブ化しても、一覧表の行がグレーアウトされない不具合を調査・修正する。
併せて、非アクティブ用語の編集ボタンを非活性（disabled）にする対応も実施する。

## 2. 目的と期待される成果

### 目的
- 非アクティブ用語を視覚的にグレーアウト表示し、ユーザーが状態を一目で識別できるようにする
- 非アクティブ用語の編集操作を UIレベルで禁止し、誤操作を防ぐ

### 期待される成果
- [x] 非アクティブ化した用語行が薄いグレー（背景 `#f0f0f0`、テキスト `#bbb`）で表示される
- [x] 非アクティブ用語の「編集」ボタンが disabled になる
- [x] 非アクティブ用語の「アクティブ化」ボタンは引き続き操作可能（再アクティブ化できる）

## 3. 根本原因の調査結果

### 原因 1: `.row-inactive-term` CSS クラスの定義がなかった（主原因）

`rowClassName` で `'row-inactive-term'` クラス名を返すコードが存在していたとしても、
`globals.css` を含むプロジェクト全体のどこにも `.row-inactive-term` の CSS が定義されていなかった。
そのため、クラスを付与しても見た目に変化が生じなかった。

### 原因 2: `rowClassName` に非アクティブ判定がなかった

`rowClassName` のコールバック内に `isActive` チェックが存在せず、
非アクティブ行に対して `'row-inactive-term'` クラスが付与されていなかった。

### 原因 3: `actionCell` の `readonly` 変数が編集ボタン・切り替えボタン共通だった

既存の `readonly` 変数には `isActive === false` の判定がなく、
また単一変数のため「編集ボタンのみ無効・切り替えボタンは有効」という分離ができなかった。

## 4. 実装ステップ

### Phase 1: 原因調査（完了）
- [x] `TermManagement.tsx` の `rowClassName`・`isActive` 処理を確認
- [x] `NamespaceMain.tsx` の `rowClassName` コールバックを確認
- [x] `globals.css` およびプロジェクト全体で `.row-inactive-term` の定義有無を確認

### Phase 2: 修正実装（完了）
- [x] `NamespaceMain.tsx` の `rowClassName` に `!term.isActive` 判定を追加
- [x] `NamespaceMain.tsx` の `<style>` タグに `.row-inactive-term` CSS を追加
- [x] `NamespaceMain.tsx` の `actionCell` を `readonlyEdit` / `readonlyToggle` に分離

## 5. 変更ファイル

### 修正ファイル
1. `frontend/src/components/namespace/NamespaceMain.tsx` — 以下の3箇所を修正

## 6. 変更内容詳細

### 変更 1: `rowClassName` に非アクティブ判定を追加

```tsx
// 修正後
rowClassName={(record) => {
  if ('_rowId' in record) return 'row-new-term';
  const term = record as Term;
  if (!term.isActive) return 'row-inactive-term';  // ← 追加
  if (isCompanyNodeSelected && ancestorPrefixesForSelected.has(term.prefix)) return 'row-readonly-scope';
  if (!isCompanyNodeSelected && isReadonlyPrefix(term.prefix)) return 'row-readonly-scope';
  return '';
}}
```

### 変更 2: `<style>` タグに `.row-inactive-term` CSS を追加

```css
/* 修正後 */
.row-new-term td { background: #fffbe6 !important; }
.row-readonly-scope td { background: #f5f5f5 !important; opacity: 0.55; pointer-events: none; }
.row-inactive-term td { color: #bbb !important; background: #f0f0f0 !important; }  /* ← 追加 */
```

### 変更 3: `actionCell` を `readonlyEdit` / `readonlyToggle` に分離

```tsx
// 修正後: 編集ボタン用（非アクティブ時も無効）
const readonlyEdit =
  isSystemNs ||
  record.isActive === false ||          // ← 追加
  (isCompanyNodeSelected && ancestorPrefixesForSelected.has(record.prefix)) ||
  (!isCompanyNodeSelected && isReadonlyPrefix(record.prefix)) ||
  effectiveViewOnly;

// 修正後: 切り替えボタン用（非アクティブ行でも「アクティブ化」は許可）
const readonlyToggle =
  isSystemNs ||
  (isCompanyNodeSelected && ancestorPrefixesForSelected.has(record.prefix)) ||
  (!isCompanyNodeSelected && isReadonlyPrefix(record.prefix)) ||
  effectiveViewOnly;
```

## 7. 影響範囲

- **影響コンポーネント**: `NamespaceMain`（用語管理タブ）
- **他コンポーネントへの影響**: なし（変更は NamespaceMain.tsx 1ファイルのみ）
- **バックエンドへの影響**: なし

## 8. テスト計画

### 手動テスト
- [x] 用語を非アクティブ化 → 行がグレーアウトされることを確認
- [x] 非アクティブ用語の「編集」ボタンが disabled（グレー・クリック不可）であることを確認
- [x] 非アクティブ用語の「アクティブ化」ボタンがクリック可能であることを確認
- [x] 「アクティブ化」をクリックして再アクティブ化 → グレーアウトが解除されることを確認

## 9. 承認記録

- **計画書提示日時**: 2026-09-01 16:49
- **承認日時**: 2026-09-01 16:51
- **承認者コメント**: タスク計画書を後追いで作成するよう指示

## 10. 実施記録

### 実施日時
開始: 2026-09-01 16:20
完了: 2026-09-01 16:42

### 最終的な成果物
- [x] `frontend/src/components/namespace/NamespaceMain.tsx` を修正（3箇所）
  - [x] `rowClassName` に `!term.isActive` 判定追加
  - [x] `<style>` タグに `.row-inactive-term` CSS 追加
  - [x] `actionCell` の `readonlyEdit` / `readonlyToggle` 分離（編集ボタンのみ非アクティブ時 disabled）
