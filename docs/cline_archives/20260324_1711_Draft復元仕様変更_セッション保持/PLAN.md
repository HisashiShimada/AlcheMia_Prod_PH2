# タスク計画書: Draft復元仕様変更 & 編集画面セッション保持

## メタデータ
- **作成日時**: 2026-03-24 17:11
- **更新日時**: 2026-03-24 17:30（Draft削除タイミング追加・最終版）
- **タスクID**: Draft復元仕様変更_セッション保持
- **優先度**: 高
- **推定工数**: 3〜4時間

## タスク概要

以下2件の修正を実施する。

1. **Draft復元仕様変更**: プロジェクト管理画面の「編集」ボタン押下時にDraft確認していた処理を、**画面初期表示時**に移動する。バックエンドDraftが存在する場合のみ「復元する」「復元しない」の2択ダイアログを表示し、復元する場合はプロジェクト選択 → 編集画面遷移 → Draft管理ダイアログへ誘導する。

2. **編集画面のセッション保持**: MAIML編集画面（`PetriNetEditorInner`）から定期的に「ハートビートAPI」を呼び出し、編集中にセッションが切れないようにする。

---

## 仕様前提・方針

| 項目 | 方針 |
|------|------|
| LocalStorage Draft | **廃止**。リリース前の機能のため、ファイルを削除するだけでよい（クリーンアップ処理は不要） |
| バックエンド Draft | これまで通り DB 保存（`/maiml/drafts` API）で管理。今回はこちらのみ扱う |
| ダイアログ選択肢 | 「**復元する**」「**復元しない**」の2択（文言をシンプル化） |
| セッション保持 | ハートビートAPIで定期的にセッションを延長する。「切れ検知後の処理」は今回スコープ外 |

---

## Draft削除タイミング

| タイミング | 対応 | 実装箇所 |
|-----------|------|---------|
| **MAIML保存成功時** | ✅ **削除する** | `PetriNetEditorInner.tsx` の保存成功コールバック |
| **「復元しない」を選んだ時** | ✅ **削除する** | `DraftRestoreDialog` のコールバック |
| 編集画面を閉じた時（未保存） | ❌ 何もしない（Draftを残す） | - |
| 編集画面を閉じた時（保存済み） | 保存時に削除済みのため対応不要 | - |
| 古いDraftの自動削除 | ❌ スコープ外 | - |

---

## 現状調査結果

### Draft復元フローの現状

| 項目 | 現状 |
|------|------|
| Draft確認のタイミング | 編集ボタン押下時（`handleEditButtonClick`） |
| LocalStorage Draft | `localStorageDraftService.ts` / `useLocalStorageAutoSave.ts` 実装済み → **今回廃止（削除のみ、クリーンアップ不要）** |
| バックエンド Draft | `fetchDrafts()` で取得（`/maiml/drafts` API） |
| 復元ダイアログ | `DraftRestoreDialog` コンポーネント実装済み（文言を変更する） |

### セッション管理の現状

| 項目 | 現状 |
|------|------|
| セッション延長 | `POST /api/v1/auth/refresh` でリフレッシュトークンを使って延長可能 |
| 生存確認API | **未実装**（編集画面からのハートビート送信なし） |

---

## 目的と期待される成果

### 課題1: Draft復元仕様変更

- [ ] プロジェクト管理画面の**初期表示時**にバックエンドDraftの有無を確認する
- [ ] Draftが存在する場合は「復元する」「復元しない」ダイアログを表示する（画面ロード直後）
- [ ] 「復元する」を選んだ場合: 対象プロジェクトを選択状態にして編集画面に遷移 → Draft管理ダイアログを表示
- [ ] 「復元しない」を選んだ場合: Draftを削除してダイアログを閉じる
- [ ] MAIML保存成功時にそのプロジェクトのDraftを削除する
- [ ] 編集ボタン押下時のDraft確認処理を削除（シンプル化）
- [ ] LocalStorage Draft 関連ファイル（未リリース）を削除する
- [ ] 必要に応じて `maiml_draft` テーブルに `project_id` カラムを追加する

### 課題2: 編集画面のセッション保持

- [ ] バックエンドに「ハートビートAPI」を新規実装する
- [ ] 編集画面（`PetriNetEditorInner`）から定期的にハートビートAPIを呼び出す
- [ ] 編集中はセッションが自動的に延長され続ける

---

## 詳細設計

### 課題1: Draft復元フロー変更

#### 新しい復元フロー

```
プロジェクト管理画面 初期表示
  ↓
バックエンドDraft一覧を取得（fetchDrafts）
  ↓
Draftが存在する？
  ├─ NO  → 通常表示（何もしない）
  └─ YES → DraftRestoreDialog 表示
              ↓
       [復元する]              [復元しない]
           ↓                        ↓
   DraftのprojectIdで          Draftを削除（deleteDraft）
   プロジェクトを選択状態に     ダイアログを閉じる
           ↓
     編集画面へ遷移
   （openDraftManagerOnStart: true）
```

#### Draftテーブル設計の見直し

初期表示時に「どのプロジェクトのDraftか」を特定するため、`maiml_draft` テーブルに `project_id` カラムが必要。

**Phase 1 で確認・対応:**
- `docs/design/db/ddl/` の DDL ファイルで `project_id` カラムの有無を確認
- なければ `ALTER TABLE` マイグレーションを作成
- `GET /maiml/drafts` のレスポンスに `projectId` を含めるよう修正

#### DraftRestoreDialog の変更

| 変更点 | 変更前 | 変更後 |
|--------|--------|--------|
| ボタン文言 | 「一時保存を復元する」「新規作成/既存を開く」「バックエンドDraftを復元」 | 「**復元する**」「**復元しない**」の2択 |
| props | 複数のDraft種別対応 | バックエンドDraftのみ（シンプル化） |

#### ProjectManagement.tsx の変更点

```typescript
// 【追加】初期表示時のDraft確認
useEffect(() => {
  const checkDraftOnMount = async () => {
    try {
      const drafts = await fetchDrafts();
      if (Array.isArray(drafts) && drafts.length > 0) {
        setDraftToRestore(drafts[0]); // 最新Draftを保持
        setDraftRestoreDialogOpen(true);
      }
    } catch {
      // 取得失敗は無視（エディタを開く妨げにしない）
    }
  };
  checkDraftOnMount();
}, []); // マウント時1回だけ実行

// 【削除】handleEditButtonClick 内のDraft確認処理
// 【シンプル化】handleEditButtonClick はDraft確認なしで直接エディタへ遷移
```

---

### 課題2: セッション保持（ハートビートAPI）

#### バックエンド: ハートビートAPIの新規実装

```
POST /api/v1/auth/heartbeat
```

- **認証**: `authMiddleware` 必須
- **処理**: `authMiddleware` でトークン検証が通れば成功レスポンスを返す（アクセストークンが有効な間は認証継続）
- **レスポンス**: `{ success: true, message: 'Session is active' }`
- **実装方針**: ミドルウェアが通ることで「生存確認」を行う。有効期限延長は既存の `/auth/refresh` が担う

#### フロントエンド: ハートビートフックの新規実装

**新規ファイル:** `frontend/src/components/editorv2/hooks/useSessionHeartbeat.ts`

```typescript
interface UseSessionHeartbeatOptions {
  /** ハートビート間隔（ミリ秒）。デフォルト: 5分（300,000ms） */
  interval?: number;
}

function useSessionHeartbeat(options?: UseSessionHeartbeatOptions): void {
  // setInterval で定期的に POST /api/v1/auth/heartbeat を呼び出す
  // コンポーネントアンマウント時にタイマーをクリア
  // エラーは console.warn で記録するのみ（ユーザーへの通知は行わない）
}
```

**`PetriNetEditorInner.tsx` への組み込み:**

```typescript
// 5分ごとにハートビート送信（環境変数 NEXT_PUBLIC_HEARTBEAT_INTERVAL で変更可能）
useSessionHeartbeat();
```

---

## 実装ステップ

### Phase 1: Draftテーブル設計確認・マイグレーション作成（バックエンド）
- [x] `docs/design/db/ddl/` で `maiml_draft` テーブルのDDLを確認
- [x] `project_id` カラムの有無を確認（→ 不足していたためマイグレーション作成）
- [x] マイグレーションSQL `20260324_add_project_id_to_maiml_draft.sql` を作成
- [x] `maimlDraftsRepository.ts` の `save()` に `project_id` を追加（INSERT/ON CONFLICT DO UPDATE）
- [x] `backend/src/types/editor.ts` の `Draft` 型に `projectId?: string | null` を追加
- [x] `maimlService.ts` の `convertRowToDraft()` に `projectId` マッピングを追加

### Phase 2: ハートビートAPI実装（バックエンド）
- [x] `authController.ts` に `heartbeat()` 関数を追加
- [x] `authRoutes.ts` に `POST /heartbeat` ルートを追加（`authMiddleware` を適用）

### Phase 3: ハートビートフック実装（フロントエンド）
- [x] `frontend/src/hooks/useSessionHeartbeat.ts` カスタムフックを新規作成（デフォルト5分間隔）
- [x] `PetriNetEditorInner.tsx` に `useSessionHeartbeat()` を組み込む
- [ ] ~~`frontend/src/services/authService.ts` にハートビートAPI呼び出し関数を追加~~ → フック内で `createApiClient()` を直接使用したため不要

### Phase 4: LocalStorage Draft 削除（フロントエンド）✅ 完了（2026-03-25）
- [x] `localStorageDraftService.ts` → 削除済み（ファイル不在を確認）
- [x] `useLocalStorageAutoSave.ts` → 削除済み（ファイル不在を確認）
- [x] `ProjectManagement.tsx` → LocalStorage Draft 参照なし（確認済み）
- [x] `PetriNetEditorInner.tsx` → LocalStorage Draft 参照なし（確認済み）
- [x] その他参照ファイルなし（確認済み）

### Phase 5: Draft復元フロー変更（フロントエンド）✅ 完了（2026-03-25）
- [x] `DraftRestoreDialog.tsx` → 「復元する」「復元しない」2択ボタン実装済み
- [x] `ProjectManagement.tsx` → 初期表示時Draft確認 `useEffect` 実装済み（`selectedProjectId` が null の時のみ実行）
- [x] `ProjectManagement.tsx` → `handleEditButtonClick` からDraft確認削除済み（直接エディタへ遷移）
- [x] 「復元する」→ `draftToRestore.projectId` からプロジェクト特定 → エディタへ遷移（`openDraftManagerOnStart: true`）
- [x] 「復元しない」→ `deleteDraft(draftKey)` 呼び出し → プロジェクト選択クリア
- [x] UI仕様書（`ui_project_management.md`）を更新（3.6, State, API一覧, 変更履歴）

### Phase 6: テスト・動作確認⚠️ 未実施
- [ ] ハートビートAPIの動作確認（NetworkタブでPOSTが5分ごとに飛ぶこと）
- [ ] Draft初期表示ダイアログの動作確認（画面ロード直後に表示）
- [ ] 「復元する」でプロジェクトが自動選択されDraft管理ダイアログが開くこと
- [ ] 「復元しない」でDraftが削除されダイアログが閉じること
- [ ] MAIML保存成功後にDraftが削除されること（次回起動時にダイアログが出ないこと）
- [ ] Draftなし時にダイアログが出ないこと
- [ ] LocalStorage Draftに関するコードが残っていないこと

---

## 変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `frontend/src/components/editorv2/hooks/useSessionHeartbeat.ts` | セッション保持ハートビートフック |
| `backend/migrations/20260324_add_project_id_to_maiml_draft.sql` | Draftテーブルにproject_idカラム追加（Phase 1の確認結果次第） |

### 修正
| ファイル | 変更内容 |
|---------|---------|
| `backend/src/controllers/authController.ts` | `heartbeat` メソッド追加 |
| `backend/src/routes/authRoutes.ts` | `POST /heartbeat` ルート追加 |
| `backend/src/controllers/maimlController.ts` | Draft一覧取得レスポンスに `projectId` を追加 |
| `frontend/src/components/project/ProjectManagement.tsx` | 初期表示時Draft確認追加、編集ボタンのDraft確認削除、LocalStorage参照削除 |
| `frontend/src/components/viewer/DraftRestoreDialog.tsx` | props・文言を「復元する」「復元しない」の2択に変更 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | `useSessionHeartbeat` 組み込み、`useLocalStorageAutoSave` 削除、保存成功時Draft削除追加 |
| `frontend/src/services/authService.ts` | `heartbeat` API呼び出し関数追加 |

### 削除
| ファイル | 理由 |
|---------|------|
| `frontend/src/services/localStorageDraftService.ts` | LocalStorage Draft 廃止（リリース前） |
| `frontend/src/components/editorv2/hooks/useLocalStorageAutoSave.ts` | LocalStorage Draft 廃止（リリース前） |

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `maiml_draft` テーブルに `project_id` がなくマイグレーションが必要 | 中 | 高 | Phase 1でDDL確認してから着手 |
| `DraftRestoreDialog` の props 変更で他の呼び出し箇所が壊れる | 中 | 中 | 事前に呼び出し箇所を全検索して確認 |

---

## テスト計画

### 手動テスト
- [ ] プロジェクト管理画面を開いた際にDraftがあれば復元ダイアログが表示される
- [ ] 「復元する」を押すと対象プロジェクトが選択されてエディタのDraft管理ダイアログが開く
- [ ] 「復元しない」を押すとDraftが削除されてダイアログが消える
- [ ] Draftがない状態で画面を開いてもダイアログが表示されない
- [ ] MAIMLを保存した後、再度プロジェクト管理画面を開いてもDraftダイアログが表示されない
- [ ] 編集中にNetworkタブで5分ごとにハートビートPOSTが飛んでいることを確認

---

## 承認記録

- **計画書提示日時**: 2026-03-24 17:11
- **最終更新日時**: 2026-03-24 17:30
- **承認日時**: （承認時に記入）
- **承認者コメント**:
