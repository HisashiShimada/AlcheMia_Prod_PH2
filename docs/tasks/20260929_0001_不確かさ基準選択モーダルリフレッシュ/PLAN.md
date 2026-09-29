# タスク計画書: 不確かさ基準選択モーダルのリフレッシュ対応

## メタデータ
- **作成日時**: 2026-09-29 11:20
- **タスクID**: 20260929_0001
- **優先度**: 中
- **推定工数**: 0.5時間

---

## タスク概要

テンプレート編集の不確かさ選択モーダル（`UncertaintyCriteriaSelectorModal`）内で「新規不確かさ基準を作成」を行い「保存」ボタンを押下した際、基準一覧が最新のDBデータに更新されない問題を修正する。

---

## 調査結果・原因分析

### 問題の構造

```
TemplateEditorDialog.tsx
  └─ UncertaintyCriteriaSelectorModal.tsx（不確かさ基準選択ダイアログ）
       ├─ [open時] fetchUncertaintyCriteriaForSelector() → criteriaList をセット
       ├─ UncertaintyCreateModal.tsx（新規作成モーダル）
       │    └─ handleSave() 保存成功 → onSaved?.() を呼ぶ
       │                         ↑ここに何も渡されていなかった ❌
       └─ criteriaList = モーダルを開いた時点のデータのまま（更新されない）
```

### 根本原因

`UncertaintyCriteriaSelectorModal.tsx` 内で `UncertaintyCreateModal` をレンダリングする際に、`onSaved` プロパティが渡されていなかった。

`UncertaintyCreateModal` の `handleSave()` は保存成功後に `onSaved?.()` を呼ぶ実装になっているが（321行目）、呼び出し側で `onSaved` を渡していないためコールバックが実行されず、基準一覧が再取得されない。

### 修正前コード（712〜718行目）

```tsx
<UncertaintyCreateModal
  open={createModalOpen}
  allCriteria={[]}
  organizationGroupCd={organizationGroupCd}
  onClose={() => setCreateModalOpen(false)}
  // ← onSaved 未設定のため保存後に一覧が更新されない
/>
```

---

## 修正前/修正後の機能フロー図

### 修正前

```
[新規作成ボタン押下]
  → UncertaintyCreateModal が開く
  → フォーム入力 → 「保存」ボタン押下
  → saveUncertaintyCriteriaNewVersion() 成功
  → onSaved?.()  ← undefined のため何もしない
  → CreateModal が閉じる
  → SelectorModal の criteriaList = 古いデータのまま ❌
```

### 修正後

```
[新規作成ボタン押下]
  → UncertaintyCreateModal が開く（onSaved=refreshCriteriaList を渡す）
  → フォーム入力 → 「保存」ボタン押下
  → saveUncertaintyCriteriaNewVersion() 成功
  → onSaved() → refreshCriteriaList() が呼ばれる
    → fetchUncertaintyCriteriaForSelector() を再実行
    → criteriaList が最新DBデータに更新 ✅
  → CreateModal が閉じる
  → SelectorModal に新規作成した基準が表示される 🎉
```

---

## 実装内容

### 変更ファイル一覧

| ファイル | 変更概要 |
|----------|----------|
| `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx` | データ取得を `refreshCriteriaList` として切り出し、`UncertaintyCreateModal` に `onSaved` として渡す |

### 実装詳細

1. **`useCallback` をimportに追加**

2. **データ取得ロジックを `refreshCriteriaList` 関数として切り出し**（useCallbackでメモ化）
   - 依存配列: `[organizationGroupCd, message, t]`

3. **`useEffect` の本体を簡略化**（`refreshCriteriaList()` を呼ぶだけに）
   - 依存配列に `refreshCriteriaList` を追加

4. **`UncertaintyCreateModal` に `onSaved={refreshCriteriaList}` を渡す**

---

## 影響範囲

- ✅ UIの変更なし
- ✅ バックエンド変更なし
- ✅ MaiMLへの保存なし
- ✅ 変更ファイルは1ファイルのみ
- ✅ 既存の「モーダルを開いた時に取得する」動作は維持

---

## テスト確認

- [ ] テンプレート編集画面でプロパティに不確かさ基準を設定する操作を開く
- [ ] 「新規評価基準を作成」リンクをクリックして新規作成モーダルを開く
- [ ] フォームを入力して「保存」ボタンを押下する
- [ ] 保存成功後、選択モーダルの基準一覧に新規作成した基準が表示されることを確認する

---

## 承認記録

- **計画書提示日時**: 2026-09-29 11:20
- **承認日時**: 2026-09-29 11:20
- **承認者コメント**: 承認済み（Act モードで実施）

---

## 実施記録

### 実施日時
開始: 2026-09-29 11:20
完了: 2026-09-29 11:25

### 変更内容

```diff
// UncertaintyCriteriaSelectorModal.tsx

// ① useCallback を import に追加
- import React, { useState, useMemo, useEffect } from 'react';
+ import React, { useState, useMemo, useEffect, useCallback } from 'react';

// ② データ取得ロジックを useCallback 関数として切り出し
+ const refreshCriteriaList = useCallback(() => {
+   setCriteriaLoading(true);
+   fetchUncertaintyCriteriaForSelector(organizationGroupCd)
+     .then((data) => { /* 変換・setCriteriaList */ })
+     .catch(() => { /* エラー処理 */ })
+     .finally(() => setCriteriaLoading(false));
+ }, [organizationGroupCd, message, t]);

// ③ useEffect を簡略化（refreshCriteriaList を呼ぶだけに）
  useEffect(() => {
    if (!open) return;
    setFilter(INITIAL_FILTER);
    setSelectedCriteria(null);
-   // インラインで fetch していたロジックを削除
+   refreshCriteriaList();
    // フィルタプリセット処理は維持...
- }, [open, targetProperty, organizationGroupCd]);
+ }, [open, targetProperty, organizationGroupCd, refreshCriteriaList]);

// ④ onSaved を渡す
  <UncertaintyCreateModal
    open={createModalOpen}
    allCriteria={[]}
    organizationGroupCd={organizationGroupCd}
    onClose={() => setCreateModalOpen(false)}
+   onSaved={refreshCriteriaList}
  />
```

### 最終的な成果物

- [x] `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx` 修正完了
- [x] TSビルドエラーなし（既存エラーのみ、今回の変更に無関係）
