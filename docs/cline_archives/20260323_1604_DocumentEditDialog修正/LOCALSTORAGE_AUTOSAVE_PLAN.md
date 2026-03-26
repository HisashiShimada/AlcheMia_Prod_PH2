# タスク計画書: MaiML編集 LocalStorage自動保存・復元機能

## メタデータ
- **作成日時**: 2026-03-23 16:55
- **タスクID**: LocalStorageAutoSave
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

MaiML編集中にセッションタイムアウトが発生しても、編集内容が失われないよう、ブラウザのLocalStorageに自動保存・復元する機能を実装する。

## 現状調査結果（重要）

以下の機能は**すでに実装済み**：
- `ProjectManagement.tsx` の `handleEditButtonClick` → LocalStorage `petri-net-draft-{projectId}` を確認してダイアログ表示
- `DraftRestoreDialog.tsx` → 復元確認ダイアログコンポーネント（既存）
- 「新規作成/既存ファイルを開く」→ LocalStorageを削除してエディタを開く（既存）

**未実装**（今回の実装対象）：
1. エディタ側（`PetriNetEditorInner`）でLocalStorageへの**自動保存**
2. 「一時保存を復元する」ボタン押下後、エディタがLocalStorageから**読み込み**

## 目的と期待される成果

- [ ] MaiML編集中に一定間隔（デフォルト30秒）でLocalStorageに自動保存される
- [ ] プロジェクト管理画面の編集ボタン → LocalStorage確認 → 復元ダイアログ（既存フロー）が正しく動作する
- [ ] 「一時保存を復元する」押下後、エディタがLocalStorageデータを正しく復元する
- [ ] MAIML保存成功時にLocalStorageのデータが自動削除される
- [ ] 自動保存間隔・保存期限が環境変数で設定可能

---

## 背景・設計方針

### 2種類のDraft保存の違い

| 項目 | バックエンドDraft（既存） | LocalStorageDraft（今回実装） |
|------|--------------------------|------------------------------|
| 保存先 | DB（PostgreSQL） | ブラウザのLocalStorage |
| トリガー | ユーザーが「自動保存」スイッチをONにした時のみ | **常にON（スイッチ不要）** |
| API | バックエンドAPI `/maiml/draft` | なし（フロントエンドのみ） |
| 世代管理 | 3世代 | 1世代（最新のみ） |
| 共有 | 別端末からもアクセス可能 | 同一ブラウザのみ |
| 目的 | 長期保存・チーム共有 | **セッションタイムアウト対策** |

---

## 実装ファイル一覧

### 新規作成（2件）

1. `frontend/src/services/localStorageDraftService.ts`
   - LocalStorage読み書き操作サービス
   
2. `frontend/src/components/editorv2/hooks/useLocalStorageAutoSave.ts`
   - 自動保存カスタムフック（setInterval付き）

### 修正（2件）

3. `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
   - フック統合・復元処理追加・MAIML保存時のLocalStorage削除

4. `frontend/.env.local`
   - 環境変数追加

---

## 詳細設計

### 識別キーの方針

`ProjectManagement.tsx` の `handleEditButtonClick` で使われているキーに合わせる。

```
LocalStorageキー形式:
  petri-net-draft-{projectId}

例: petri-net-draft-abc123-def456
```

`projectId` は `MaimlEditorParams.documentId`（= `selectedProject.id`）として
`PetriNetEditorInner` の props `initialDocumentId` 経由で受け取る。

---

### 1. localStorageDraftService.ts

**LocalStorage保存データ型（既存の `draftInfo` 構造に合わせる）:**
```typescript
interface LocalStorageDraftData {
  savedAt: string;        // ISO 8601形式 例: "2026-03-23T16:00:00.000Z"
  nodes: Node[];
  edges: Edge[];
  templates: any[];
  documentData: DocumentData | null;
  fileName: string;       // 表示用ファイル名
  version: string;        // スキーマバージョン "1.0"（将来の互換性対応）
}
```

**既存の `DraftRestoreDialog` が参照する `draftInfo` 構造:**
```typescript
// ProjectManagement.tsx の handleEditButtonClick で解析される
{
  savedAt: string;
  methodCount: number;  // nodes内のmethodノード数
  nodeCount: number;    // nodes.length
}
```

**主要関数（引数は `projectId: string`）:**
- `saveDraftToLocalStorage(projectId, editState): void`
- `loadDraftFromLocalStorage(projectId): LocalStorageDraftData | null`
- `removeDraftFromLocalStorage(projectId): void`
- `hasDraftInLocalStorage(projectId): boolean`
- `cleanupOldLocalStorageDrafts(daysToKeep: number): void`

### 2. useLocalStorageAutoSave.ts

**インターフェース:**
```typescript
interface UseLocalStorageAutoSaveOptions {
  projectId: string;      // initialDocumentId (= selectedProject.id)
  editState: EditState | null;
  interval?: number;      // 環境変数から取得（デフォルト30秒）
}

interface UseLocalStorageAutoSaveReturn {
  localLastSavedAt: Date | null;
}
```

**動作:**
- `setInterval` で定期保存（デフォルト30秒）
- 保存間隔は環境変数 `NEXT_PUBLIC_MAIML_LOCALSTORAGE_AUTOSAVE_INTERVAL`（ミリ秒）から取得
- `projectId` が未設定の場合はスキップ
- `localLastSavedAt` を返し、UI表示用に使用（将来のToolbar表示拡張用）
- コンポーネントアンマウント時にタイマーをクリア

### 3. PetriNetEditorInner.tsx 変更点

**追加するProps（既存の `initialDocumentId` を使用）:**
```typescript
// 既存: initialDocumentId?: string;  ← これがprojectId相当
// 変更なし（既に渡されている）
```

**useLocalStorageAutoSaveフックの組み込み:**
```typescript
useLocalStorageAutoSave({
  projectId: initialDocumentId || '',
  editState: currentEditState,
});
```

**起動時: LocalStorageからの復元処理:**

`ProjectManagement` の `handleRestoreDraft` はそのままエディタを開くだけで、
エディタ側でLocalStorageからデータを読み込む必要がある。

```typescript
// PetriNetEditorInner 初期化時
useEffect(() => {
  if (!initialDocumentId) return;

  // 起動時に古いデータをクリーンアップ
  const days = parseInt(
    process.env.NEXT_PUBLIC_MAIML_LOCALSTORAGE_RETENTION_DAYS || '7'
  );
  cleanupOldLocalStorageDrafts(days);

  // LocalStorageにDraftがあれば読み込む
  const draft = loadDraftFromLocalStorage(initialDocumentId);
  if (draft) {
    console.log('🔄 [PetriNetEditorInner] LocalStorage Draftを復元:', draft.savedAt);
    // nodes/edges/templates/documentData を editState に反映
    setNodes(draft.nodes || []);
    setEdges(draft.edges || []);
    // templates, documentData の反映（既存のhandleLoadDraft相当の処理）
  }
}, [initialDocumentId]);
```

**MAIML保存成功時:**
```typescript
// 既存の保存成功コールバックに追加
removeDraftFromLocalStorage(initialDocumentId || '');
```

### 5. 環境変数（.env.local）

```bash
# LocalStorage自動保存間隔（ミリ秒）デフォルト: 30000 (30秒)
NEXT_PUBLIC_MAIML_LOCALSTORAGE_AUTOSAVE_INTERVAL=30000

# LocalStorage保存データの有効期限（日数）デフォルト: 7
NEXT_PUBLIC_MAIML_LOCALSTORAGE_RETENTION_DAYS=7
```

---

## フロー図

### 保存フロー

```
nodes/edges 変更
  ↓
useLocalStorageAutoSave（debounce: 保存間隔ミリ秒）
  ↓
saveToLocalStorage(projectId, editState)
  ↓
LocalStorage["maiml_local_{projectId}"] に保存
  ↓
lastSavedAt 更新（UI表示用）
```

### 復元フロー

```
PetriNetEditorInner 起動
  ↓
hasLocalStorageDraft(projectId)？
  ├─ NO  → 通常起動
  └─ YES → LocalStorageRestoreDialog 表示
              ↓
  ┌───────────┴───────────────┐
[復元する]                [破棄して新規開始]
  ↓                             ↓
loadFromLocalStorage()     removeFromLocalStorage()
  ↓                             ↓
editStateに反映              通常起動
  ↓
編集再開
```

### MAIML保存フロー

```
MAIML保存ボタンクリック
  ↓
保存処理（既存）
  ↓
保存成功
  ↓
removeFromLocalStorage(projectId)  ← 追加
  ↓
完了メッセージ
```

---

## エラーハンドリング

| エラーケース | 対処方法 |
|------------|--------|
| LocalStorage容量オーバー | try-catchで捕捉、古いデータをクリーンアップして再試行、失敗時はconsole.errorで記録のみ（ユーザー通知なし） |
| JSONパースエラー（データ破損） | null を返す、破損データを削除、console.errorで記録 |
| 環境変数未設定 | デフォルト値を使用（30秒 / 7日） |
| projectId 未設定 | 保存・復元をスキップ |

---

## 実装ステップ

### Phase 1: サービス層の作成
- [ ] `localStorageDraftService.ts` の作成（型定義・保存・読み込み・削除・クリーンアップ）

### Phase 2: カスタムフックの作成
- [ ] `useLocalStorageAutoSave.ts` の作成（debounce付き自動保存・環境変数対応）

### Phase 3: 復元ダイアログの作成
- [ ] `LocalStorageRestoreDialog.tsx` の作成（確認モーダル・復元/破棄ボタン）

### Phase 4: PetriNetEditorInner への統合
- [ ] 起動時の復元ダイアログ表示ロジックの追加
- [ ] `useLocalStorageAutoSave` フックの組み込み
- [ ] MAIML保存成功時のLocalStorage削除処理の追加

### Phase 5: 環境変数の追加
- [ ] `frontend/.env.local` に環境変数追加
- [ ] `frontend/.env.prod.aws.example` / `.env.prod.onprem.example` への追加（必要であれば）

---

## テスト計画

### 手動テスト
- [ ] 編集後30秒でLocalStorageに保存されることを確認（ブラウザDevToolsで確認）
- [ ] ページリロード後に復元ダイアログが表示されることを確認
- [ ] 復元ボタンで正しくデータが復元されることを確認
- [ ] 破棄ボタンでLocalStorageがクリアされることを確認
- [ ] MAIML保存成功後にLocalStorageがクリアされることを確認
- [ ] 7日以上前のデータが自動削除されることを確認
- [ ] 環境変数でAutoSave間隔を変更できることを確認

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| LocalStorageの容量制限（5-10MB）によるMAIMLデータ保存失敗 | 中 | 低 | try-catchで捕捉、失敗時はconsole.errorで記録のみ |
| PetriNetEditorInner のpropsにprojectIdが渡されていない | 高 | 中 | 実装前に既存コードでprojectId取得経路を確認 |

---

## 承認記録

- **計画書提示日時**: 2026-03-23 16:55
- **承認日時**: （承認時に記入）
- **承認者コメント**:
