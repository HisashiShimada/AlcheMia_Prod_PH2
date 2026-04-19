# 修正結果: MAIML編集画面から戻った際のMaimlProvider未更新修正

## 修正日時
2026-04-16 11:39〜12:00

## 修正ファイル

| ファイル | 変更種別 |
|---|---|
| `frontend/src/components/project/ProjectManagement.tsx` | 修正 |

---

## 問題の概要

`ProjectFolderTree`（プロジェクト管理画面）からMAIML編集画面に遷移し、ファイルを保存してプロジェクト管理画面に戻った際に、`ProjectMaimlProvider` が保持している MAIML 情報が古いまま更新されなかった。その結果、ビューアボタン押下時に「読み込む対象がない」エラーが発生していた。

---

## 根本原因

各トリガーで `loadMaiml()` が呼ばれないケースが存在した。

| トリガー | プロジェクト一覧 | MAIML | ファイル一覧 |
|---|---|---|---|
| プロジェクトクリック | ❌ | ✅ | ✅ |
| リロードボタン（修正前） | ✅ | ❌ **欠けていた** | ❌ |
| 編集画面から戻る（修正前） | ✅ | ❌ **欠けていた** | ✅ |

---

## 修正内容

### 変更① `useRef` のインポートを追加

```tsx
// 修正前
import React, { useState, useEffect, useMemo, useCallback } from 'react';

// 修正後
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
```

---

### 変更② `handleRefresh` を async 化し `loadMaiml` 呼び出しを追加

プロジェクト一覧更新に加え、選択中のプロジェクトの MAIML も最新化するよう強化した。

```tsx
// 修正前
const handleRefresh = useCallback(() => {
  console.log('Refreshing project list...');
  refetchProjects();
}, [refetchProjects]);

// 修正後
const handleRefresh = useCallback(async () => {
  console.log('Refreshing project list...');
  await refetchProjects();

  // プロジェクトが選択されていれば MAIML も最新化（編集後のキャッシュ更新）
  if (selectedProjectId) {
    try {
      console.log('🔄 [ProjectManagement] リフレッシュ後 MAIML 更新開始:', selectedProjectId);
      await loadMaiml(selectedProjectId);
      console.log('✅ [ProjectManagement] リフレッシュ後 MAIML 更新完了');
    } catch (error) {
      // エラーは Context 側でハンドリング済み
    }
  }
}, [refetchProjects, selectedProjectId, loadMaiml]);
```

---

### 変更③ 初回マウント時に `handleRefresh` を呼ぶ `useEffect` を追加

編集画面から戻った際、`selectedProjectId` は `sessionStorage` から即座に復元されるが、
`handleRefresh` が呼ばれないため MAIML が更新されなかった。
初回マウント時に `selectedProjectId` が復元済みであれば `handleRefresh` を実行するよう追加した。

```tsx
// 新規追加
const hasInitialRefreshRef = useRef(false);
useEffect(() => {
  if (hasInitialRefreshRef.current) return; // Strict Mode の二重発火を防ぐ
  hasInitialRefreshRef.current = true;

  if (selectedProjectId) {
    console.log('🔄 [ProjectManagement] 初期マウント - selectedProjectId 復元検知、リフレッシュ実行:', selectedProjectId);
    handleRefresh();
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

> **`hasInitialRefreshRef` の役割**: React Strict Mode（開発環境）では `useEffect` が意図的に2回実行されるため、
> `useRef` フラグで2回目の実行をスキップし、不要な API 呼び出しを防いでいる。

---

## 修正後の動作

| トリガー | プロジェクト一覧 | MAIML | ファイル一覧 |
|---|---|---|---|
| プロジェクトクリック | ❌ | ✅ | ✅ |
| リロードボタン | ✅ | ✅ **修正** | ✅ |
| 編集画面から戻る | ✅ | ✅ **修正** | ✅ |

---

## 設計上のポイント

- **共通化**: 「リロードボタン押下」と「編集画面から戻る」の両方が `handleRefresh` という同一ロジックを経由するようになり、将来的なメンテナンス性が向上した。
- **副作用なし**: ファイル一覧の再取得は既存の `useEffect[selectedProjectId, selectedProject?.id]` が自動で行うため、`handleRefresh` 内での追加は不要（重複 API 呼び出しは発生しない）。
