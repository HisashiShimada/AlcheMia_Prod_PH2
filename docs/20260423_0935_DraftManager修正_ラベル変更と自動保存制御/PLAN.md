# タスク計画書: DraftManager修正 - ラベル変更と自動保存制御

## メタデータ
- **作成日時**: 2026-04-23 09:35
- **タスクID**: DraftManager修正_ラベル変更と自動保存制御
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

`DraftManager.tsx` の UI ラベル変更と、Draft管理ダイアログ表示中の自動保存停止対応を行う。

---

## 2. 調査結果サマリー

### 2-1. ファイル構成

| ファイル | 役割 |
|---------|------|
| `frontend/src/components/editorv2/components/DraftManager.tsx` | Draft管理UIコンポーネント（Modal） |
| `frontend/src/components/editorv2/hooks/useDraftManager.ts` | Draft管理フック（自動保存タイマー管理） |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | エディタ本体（draftManagerOpen状態管理、useDraftManager呼び出し） |

### 2-2. 自動保存の仕組み

```
PetriNetEditorInner.tsx
  └── useDraftManager(currentEditState, { autoSaveInterval: 30秒, ... })
        └── useEffect: autoSaveEnabled が true → startAutoSaveTimer() 呼び出し
              └── setInterval(30秒) → saveDraft() を定期実行
```

- **自動保存タイマーは `useDraftManager.ts` の `setInterval` で管理**
- `PetriNetEditorInner.tsx` では `useDraftManager` フックから `stopAutoSaveTimer` / `startAutoSaveTimer` を取得可能
- ただし現状は `PetriNetEditorInner.tsx` 内で `stopAutoSaveTimer` / `startAutoSaveTimer` を **取得していない**（`deleteDraft`, `fetchDrafts`, `autoSaveEnabled`, `setAutoSaveEnabled`, `lastSavedDraft`, `lastAutoSaveTime` のみ取得）

### 2-3. Draft管理ダイアログ表示中に自動保存は動くか？

**→ 動く（問題あり）**

- `draftManagerOpen` が `true` になっても `stopAutoSaveTimer()` が呼ばれていない
- ダイアログ表示中に自動保存が発火すると、Draft一覧の `fetchDrafts()` が内部で呼ばれ、一覧が突然更新される可能性がある

### 2-4. トグルスイッチによる自動保存停止は動くか？

**→ 動作が不確実（問題あり）**

- `PetriNetEditorInner.tsx` でのトグルハンドラー実装:
  ```tsx
  // EditorToolbar
  onAutoSaveToggle={() => setAutoSaveEnabled(!autoSaveEnabled)}
  // DraftManager
  onAutoSaveToggle={() => setAutoSaveEnabled(!autoSaveEnabled)}
  ```
- これは `useDraftManager` 内の `autoSaveEnabled` ステートを更新する間接的な制御
- `useDraftManager` 内の `useEffect` が `autoSaveEnabled` 変化を検知して `stopAutoSaveTimer()` を呼ぶ設計だが、`currentEditState` 等の変化でも `startAutoSaveTimer` の参照が変わり `useEffect` が再実行されるため、停止後に意図せず再開してしまうリスクがある
- 確実に停止・再開するためには、トグル時に **直接 `stopAutoSaveTimer()` / `startAutoSaveTimer()` を呼ぶ** 実装に統一すべき

---

## 3. 修正内容

### 修正①: ボタンラベル変更（DraftManager.tsx）

| 変更前 | 変更後 |
|--------|--------|
| `新規保存` | `Draft保存` |

対象箇所: `DraftManager.tsx` 319行目

### 修正②: 更新ボタンの削除（DraftManager.tsx）

対象箇所: `DraftManager.tsx` 321〜323行目  
削除するコード:
```tsx
<Button icon={<ReloadOutlined />} onClick={() => fetchDrafts()} loading={isLoading}>
  更新
</Button>
```
また、`ReloadOutlined` のインポートも不要になるため削除する。

### 修正③: ダイアログ表示中の自動保存停止（PetriNetEditorInner.tsx）

**方針**: `draftManagerOpen` が `true` になったとき自動保存を停止し、`false` になったとき再開する。

**変更手順**:
1. `PetriNetEditorInner.tsx` の `useDraftManager` の destructuring に `stopAutoSaveTimer` と `startAutoSaveTimer` を追加
2. `draftManagerOpen` を監視する `useEffect` を追加し、`true` で停止 / `false` で再開

```tsx
// 追加する destructuring
const {
  autoSaveEnabled,
  setAutoSaveEnabled,
  lastSavedDraft,
  lastAutoSaveTime,
  deleteDraft,
  fetchDrafts,
  stopAutoSaveTimer,    // ← 追加
  startAutoSaveTimer,  // ← 追加
} = useDraftManager(currentEditState, { ... });

// 追加する useEffect（ダイアログ表示中の自動保存停止）
useEffect(() => {
  if (draftManagerOpen) {
    console.log('🛑 [PetriNetEditorInner] DraftManagerダイアログ表示 - 自動保存停止');
    stopAutoSaveTimer();
  } else {
    console.log('▶️ [PetriNetEditorInner] DraftManagerダイアログ非表示 - 自動保存再開');
    if (autoSaveEnabled) {
      startAutoSaveTimer();
    }
  }
}, [draftManagerOpen]);
```

### 修正④: トグルスイッチによる自動保存停止を確実にする（PetriNetEditorInner.tsx）

**方針**: `setAutoSaveEnabled(!autoSaveEnabled)` の間接制御をやめ、`handleAutoSaveToggle` ハンドラーを作成して `stopAutoSaveTimer()` / `startAutoSaveTimer()` を直接呼ぶ。

```tsx
// 新規追加するハンドラー
const handleAutoSaveToggle = useCallback((enabled: boolean) => {
  setAutoSaveEnabled(enabled);
  if (enabled) {
    console.log('▶️ [PetriNetEditorInner] 自動保存トグル ON - タイマー開始');
    startAutoSaveTimer();
  } else {
    console.log('🛑 [PetriNetEditorInner] 自動保存トグル OFF - タイマー停止');
    stopAutoSaveTimer();
  }
}, [setAutoSaveEnabled, startAutoSaveTimer, stopAutoSaveTimer]);
```

**変更箇所**（EditorToolbar と DraftManager への渡し方）:
```tsx
// 変更前
onAutoSaveToggle={() => setAutoSaveEnabled(!autoSaveEnabled)}

// 変更後
onAutoSaveToggle={handleAutoSaveToggle}
// ※ EditorToolbar側は checked:boolean を引数で渡してくるので、handleAutoSaveToggle(checked) として機能する
// ※ DraftManager側も同様
```

---

## 4. 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/editorv2/components/DraftManager.tsx` | ①「新規保存」→「Draft保存」ラベル変更、②「更新」ボタン削除、ReloadOutlinedインポート削除 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | ③ stopAutoSaveTimer/startAutoSaveTimer のdestructuring追加、draftManagerOpen監視のuseEffect追加、④ handleAutoSaveToggle追加、onAutoSaveToggle渡し方変更 |

---

## 5. 実装ステップ

- [ ] DraftManager.tsx: 「新規保存」→「Draft保存」ラベル変更
- [ ] DraftManager.tsx: 「更新」ボタン削除（ReloadOutlinedインポートも削除）
- [ ] PetriNetEditorInner.tsx: useDraftManagerのdestructuringにstopAutoSaveTimer/startAutoSaveTimerを追加
- [ ] PetriNetEditorInner.tsx: draftManagerOpenを監視するuseEffectを追加（修正③）
- [ ] PetriNetEditorInner.tsx: handleAutoSaveToggleハンドラーを追加（修正④）
- [ ] PetriNetEditorInner.tsx: EditorToolbarとDraftManagerへのonAutoSaveToggle渡し方を変更（修正④）
- [ ] 動作確認（コンソールログ確認）

---

## 6. リスクと対策

| リスク | 対策 |
|--------|------|
| ダイアログを閉じた際に自動保存が再開されない | autoSaveEnabled が true の場合のみ startAutoSaveTimer() を呼ぶ条件付き実装 |
| ESLint の react-hooks/exhaustive-deps 警告 | useEffect の依存配列に必要な値を追加（または意図的に無視するコメントを付与） |
| トグルOFF後に currentEditState 変化で自動保存が再開される | 修正④で直接 stopAutoSaveTimer() を呼ぶことで、ステート経由の間接制御を排除 |

---

## 7. 承認記録

- **計画書提示日時**: 2026-04-23 09:36
- **承認日時**: 
- **承認者コメント**: 
