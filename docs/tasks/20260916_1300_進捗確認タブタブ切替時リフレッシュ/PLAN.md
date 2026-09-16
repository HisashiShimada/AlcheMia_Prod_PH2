# タスク計画書: 進捗確認タブ切り替え時リフレッシュ対応

## メタデータ
- **作成日時**: 2026-09-16 13:00
- **タスクID**: 20260916_1300
- **優先度**: 中
- **推定工数**: 0.5h

---

## 1. タスク概要

実験作業者画面において、実験記録タブで次のトランジションへ遷移した後、進捗確認タブに切り替えても最新状態が表示されない問題を修正する。  
ページリロードすると最新状態に更新されることから、タブ切り替え時にデータを再取得しないことが原因と確認された。

---

## 2. 調査結果（根本原因）

### 現状のデータ取得トリガー

`progressRows`（進捗確認タブに表示されるデータ）は以下のタイミングのみ更新される：

| タイミング | 関数 | 説明 |
|---|---|---|
| プロジェクト選択/変更時 | `fetchProgressRows()` | useEffect 内で実行 |
| 開始・終了・切替等のアクション後 | `reloadProgressRows()` | 各ハンドラ内で明示的に呼び出し |

### 問題のある箇所

```
【修正前 - ExperimentWorkerMenu.tsx L336-338】

const handleTabChange = (key: string) => {
  setCurrentTab(key);   // タブ切り替えのみ → progressRows 再取得なし ❌
};
```

### 問題の発生フロー図

```
【修正前のフロー（問題）】

[実験記録タブ(tab3)] → 「保存して次へ」「終了」等の操作
        │
        ├─ updateTransitionStatus() (API) ← DBは最新に更新される
        │
        └─ reloadProgressRows() ← メモリ上のstateは更新される（このケースは問題なし）

ただし、以下のケースで問題が起きる：
  ・別の画面操作後にタブ3→4へ直接切り替えた場合
  ・progressRows 未更新のまま tab4 を表示する場合

[進捗確認タブ(tab4)] ← タブクリック
        │
   handleTabChange('4')
        │
   setCurrentTab('4') のみ実行
        │
   progressRows の再取得なし → stale data で表示 ❌
```

### 修正後のフロー図

```
【修正後のフロー（正常）】

[進捗確認タブ(tab4)] ← タブクリック
        │
   handleTabChange('4')
        │
   setCurrentTab('4')       ← タブ切り替え
        │
   reloadProgressRows(selectedProject) ← ★追加（進捗確認タブ時のみ）
        │
   setProgressLoading(true) → Spin表示
        │
   Promise.all: getWorkerTasks + fetchTransitionStatus (API呼び出し)
        │
   setProgressRows(rows)    ← 最新データで更新
        │
   setProgressLoading(false) → Spin解除
        │
   最新データで進捗確認タブ表示 ✅
```

---

## 3. 実装内容

### 変更ファイル

| # | ファイルパス | 変更種別 | 変更概要 |
|---|------------|--------|--------|
| 1 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 修正 | `handleTabChange` でタブ4切り替え時に `reloadProgressRows` を呼び出す（3行追加） |

### 変更箇所の詳細

**対象**: `ExperimentWorkerMenu.tsx` L336-338

**修正前:**
```typescript
const handleTabChange = (key: string) => {
  setCurrentTab(key);
};
```

**修正後:**
```typescript
const handleTabChange = (key: string) => {
  setCurrentTab(key);
  // 進捗確認タブ（'4'）に切り替えた際、最新の進捗データを再取得する
  if (key === '4' && selectedProject) {
    void reloadProgressRows(selectedProject);
  }
};
```

### 実装上の注意点

- `reloadProgressRows` はすでに `setProgressLoading(true/false)` を内包するため、読み込み中のSpinが自動的に表示される
- `selectedProject` が null/undefined の場合は何もしない（プロジェクト未選択時の安全ガード）
- `void` により Promise を明示的に無視（lint 警告回避）
- DO NOT ルール遵守：UIの変更なし・MaiMLファイルへの保存なし

---

## 4. 影響範囲

- 影響ファイル: `ExperimentWorkerMenu.tsx` のみ
- 影響機能: 進捗確認タブ（タブ4）への切り替え時にAPIが追加呼び出しされる
- 副作用リスク: 極めて低い（既存の `reloadProgressRows` を再利用するだけ）

---

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 頻繁なタブ切り替えによるAPI多重呼び出し | 低 | 低 | `progressLoading` フラグで重複防止可能（既存の Spin で視覚的にも明確）|
| selectedProject が null の場合の不正呼び出し | 低 | 低 | `&& selectedProject` ガードで防止 |

---

## 6. テスト計画

### 手動テスト
- [ ] 実験記録タブ（tab3）で作業後、進捗確認タブ（tab4）に切り替えて最新ステータスが表示されることを確認
- [ ] プロジェクト未選択状態でタブ4に切り替えてもエラーが発生しないことを確認
- [ ] タブ4 → タブ3 → タブ4 の往復で毎回最新データが取得されることを確認
- [ ] `progressLoading` 中に Spin が表示されることを確認

### ビルド確認
- [ ] フロントエンド `npm run build` エラーなし
- [ ] TypeScriptエラーなし

---

## 7. 承認記録
- **計画書提示日時**: 2026-09-16 13:00
- **承認日時**: 2026-09-16（act モードへの切り替えにより承認済み）
- **承認者コメント**: act モード切り替えにて承認

---

## 8. 実施記録

### 実施日時
開始: 2026-09-16 13:00
完了: 2026-09-16 13:30

### 最終的な成果物
- [x] `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - `handleTabChange` 修正（3行追加）

### ビルド確認
- [x] TypeScript チェック: `tsc --noEmit` → exit code 0（エラーなし）
- [x] フロントエンドビルド: `npm run build` → exit code 0（エラーなし）
