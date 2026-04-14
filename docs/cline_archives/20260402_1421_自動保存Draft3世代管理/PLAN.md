# タスク計画書: 自動保存Draft 3世代管理（フロントエンド修正）

## メタデータ
- **作成日時**: 2026-04-02 14:21
- **タスクID**: autosave-draft-3gen
- **優先度**: 中
- **推定工数**: 30分

## タスク概要

MAIML編集画面の自動保存Draftが3件を超えてDBに蓄積し続ける問題を修正する。

`cleanupOldAutoSaves()` 内で `fetchDrafts()` を再呼び出しせず、`saveDraft()` 後に更新済みの `drafts` ステートを直接使うよう修正することで解決する。

---

## 現状の問題分析

### 問題の根本原因

`cleanupOldAutoSaves()` が `fetchDrafts()` を呼ぶが、その直前の `saveDraft()` 内でも `fetchDrafts()` が呼ばれているため、2秒クールダウン中でスキップされる。

```
自動保存タイマー発火
  ↓
saveDraft() → DB新規レコード追加
  ↓ ← saveDraft内でfetchDrafts()が呼ばれ、draftsステートが最新に更新される
  ↓   （かつ lastFetchTimeRef が更新される → 2秒クールダウン開始）
cleanupOldAutoSaves()
  ↓
fetchDrafts() を呼ぶ → クールダウン中 → undefined を返す
  ↓
if (!currentDrafts) return; → 何も削除されない ★
```

### ポイント

`saveDraft()` 内の `fetchDrafts()` により `drafts` ステートは**既に最新**になっている。  
→ `cleanupOldAutoSaves()` は `fetchDrafts()` を呼ばず、`drafts` ステートをそのまま使えばよい。

---

## 目的と期待される成果

### 目的
`cleanupOldAutoSaves()` を正しく動作させ、自動保存Draftを確実に3世代以内に制限する

### 期待される成果
- [ ] 自動保存のたびに古い自動保存Draftが3世代を超えていれば削除される
- [ ] 手動保存Draftや他ユーザーのDraftには影響しない
- [ ] 既存の自動保存・手動保存・削除・読み込み動作に影響しない

---

## 実装ステップ

### Phase 1: `cleanupOldAutoSaves()` の修正
- [ ] `frontend/src/components/editorv2/hooks/useDraftManager.ts` の `cleanupOldAutoSaves()` を修正
  - `fetchDrafts()` の呼び出しを削除
  - `drafts` ステート（既に最新）を直接使って古い自動保存を検出・削除

---

## 変更ファイル

### 修正（1ファイル）
1. `frontend/src/components/editorv2/hooks/useDraftManager.ts`
   - `cleanupOldAutoSaves()` 内の `fetchDrafts()` 呼び出しを `drafts` ステートの参照に変更

---

## 技術詳細

### 変更前

```typescript
const cleanupOldAutoSaves = useCallback(async (): Promise<void> => {
  try {
    const currentDrafts = await fetchDrafts();  // ← クールダウン中でundefinedになる
    
    if (!currentDrafts) {
      return;  // ← ここで終了
    }
    
    const autoSaves = currentDrafts
      .filter(d => d.draftName && d.draftName.includes('自動保存'))
      .sort((a, b) => new Date(b.lastSavedAt || new Date()).getTime() - new Date(a.lastSavedAt || new Date()).getTime());
    
    if (autoSaves.length > autoSaveGenerations) {
      const toDelete = autoSaves.slice(autoSaveGenerations);
      for (const draft of toDelete) {
        await deleteDraft(draft.draftKey);
      }
    }
  } catch (err) {
    console.error('❌ [useDraftManager V2] 自動保存クリーンアップエラー:', err);
  }
}, [fetchDrafts, deleteDraft, autoSaveGenerations]);
```

### 変更後

```typescript
const cleanupOldAutoSaves = useCallback(async (): Promise<void> => {
  try {
    // saveDraft()内でfetchDrafts()が呼ばれているため、draftsステートは既に最新
    // fetchDrafts()を再呼び出しせずにdraftsステートを直接使用する
    const autoSaves = drafts
      .filter(d => d.draftName && d.draftName.includes('自動保存'))
      .sort((a, b) => new Date(b.lastSavedAt || new Date()).getTime() - new Date(a.lastSavedAt || new Date()).getTime());
    
    console.log(`🧹 [useDraftManager V2] 自動保存クリーンアップ: 総数${autoSaves.length}, 保持世代${autoSaveGenerations}`);
    
    if (autoSaves.length > autoSaveGenerations) {
      const toDelete = autoSaves.slice(autoSaveGenerations);
      console.log(`🗑️ [useDraftManager V2] ${toDelete.length}件の古い自動保存を削除`);
      for (const draft of toDelete) {
        await deleteDraft(draft.draftKey);
      }
    }
  } catch (err) {
    console.error('❌ [useDraftManager V2] 自動保存クリーンアップエラー:', err);
  }
}, [drafts, deleteDraft, autoSaveGenerations]);
// 依存配列: fetchDrafts → drafts に変更
```

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `drafts` ステートが古い場合 | 低 | 低 | `saveDraft()` → `fetchDrafts()` の順で実行されるため、`cleanupOldAutoSaves()` 呼び出し時点で最新のはず |
| 削除処理が失敗した場合 | 低 | 低 | try/catchで握りつぶし、次回の自動保存時に再試行される |

---

## テスト計画

### 手動テスト
- [ ] MAIML編集画面で自動保存を有効にして、30秒ごとに4回以上保存されるのを待ち、DraftManagerで自動保存が3件以下であることを確認
- [ ] DBで `SELECT draft_name, last_saved_at FROM maiml_drafts WHERE draft_name LIKE '%自動保存%' ORDER BY last_saved_at DESC;` を実行して3件以下であることを確認

---

## 承認記録
- **計画書提示日時**: 2026-04-02 14:27
- **承認日時**: 2026-04-02 14:29
- **承認者コメント**: 承認します。

## 実施記録

### 実施日時
開始: 2026-04-02 14:29
完了: 2026-04-02 14:30

### 変更内容
- `frontend/src/components/editorv2/hooks/useDraftManager.ts`
  - `cleanupOldAutoSaves()` 内の `const currentDrafts = await fetchDrafts()` と `if (!currentDrafts) return;` を削除
  - `currentDrafts` の参照を `drafts`（ステート）に変更
  - 依存配列を `[fetchDrafts, deleteDraft, autoSaveGenerations]` → `[drafts, deleteDraft, autoSaveGenerations]` に変更
  - コメントを追加（なぜdraftsステートを直接使うかの説明）

### 最終的な成果物
- [x] `cleanupOldAutoSaves()` が正しく `drafts` ステートを参照して動作するよう修正
