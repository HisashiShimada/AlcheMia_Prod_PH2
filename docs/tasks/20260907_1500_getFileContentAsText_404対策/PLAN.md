# タスク計画書: getFileContentAsText 404 エラー対策（A＋B両方）

## メタデータ

- **作成日時**: 2026-09-07 15:00
- **タスクID**: 20260907_1500_getFileContentAsText_404対策
- **優先度**: 中
- **推定工数**: 1時間

---

## 1. タスク概要

`fileAccessService.getFileContentAsText`（`POST /api/v1/files/content-as-text`）が
MAIMLファイル未登録のプロジェクトでも呼ばれ、404 を返してエラーログが汚染されている問題を修正する。

### 問題の構造

プロジェクト選択時にエディタを起動しようとすると、以下のフローで404が発生する。

```
useProjectMaimlEditor.buildEditorParams()
  → project.maimlFileKey が null/undefined の場合
  → 命名規則で sourceS3Key を推定: ${orgId}/projects/${name}/${name}.maiml
         ↓
PetriNetEditorScreen.loadMaimlData()
  → getFileContentAsText(sourceS3Key) を呼び出し
         ↓
POST /api/v1/files/content-as-text
  → FileAccessService.getFileTextWithParentInjection()
  → FileAccessService.streamFileByKey()
  → storageService.fileExists() → false
  → throw new NotFoundError(...)   ← HTTP 404
```

`PetriNetEditorScreen` はエラーを catch して新規作成モードで続行しているため
機能的には問題ないが、不要な 404 エラーがネットワーク・サーバーログに蓄積する。

### 対策方針：A案（バックエンド）＋ B案（フロントエンド）

- **A案（バックエンド防衛的実装）**：`getFileTextWithParentInjection` でファイル未存在時に
  空文字を返す（`streamFileByKey` の NotFoundError を吸収）
- **B案（フロントエンド根本対処）**：`MaimlEditorParams` に `maimlFileRegistered` フラグを追加し、
  `PetriNetEditorScreen` で未登録時は API 呼び出し自体をスキップする

---

## 2. 目的と期待される成果

- [ ] MAIMLファイル未登録プロジェクトでエディタを起動してもサーバーに 404 が出ない
- [ ] MAIMLファイル未登録プロジェクトでエディタを起動しても新規作成モードで正常に動作する（既存挙動を維持）
- [ ] `ViewRendererDialog` など既存のファイル取得フローに影響を与えない
- [ ] `PetriNetEditorScreen` をフォーマット管理など他の文脈で使う場合（`maimlFileRegistered` 未指定時）も従来通り動作する

---

## 3. 実装ステップ

### A案：バックエンド（`fileAccessService.ts`）

- [ ] `getFileTextWithParentInjection` の先頭にファイル存在確認を追加
  - `relativeFileKey` を算出（organizationId プレフィックスを除去）
  - `storageService.fileExists(organizationId, relativeFileKey)` を呼ぶ
  - 存在しない場合は `console.log` を出してから空文字 `''` を返す
  - 存在する場合は従来通り `streamFileByKey` を呼ぶ
- [ ] `streamFileByKey` 自体は変更しない（他の呼び出し元は NotFoundError をそのまま受け取る）

### B案：フロントエンド

#### ① `frontend/src/types/maimlEditor.ts`
- [ ] `MaimlEditorParams` インターフェースに以下のオプショナルフィールドを追加
  ```typescript
  /** MAIMLファイルがS3に登録済みかどうか（false時はAPI呼び出しをスキップ） */
  maimlFileRegistered?: boolean;
  ```

#### ② `frontend/src/hooks/project/useProjectMaimlEditor.ts`
- [ ] `buildEditorParams` 内で `maimlFileRegistered: !!project.maimlFileKey` をセット
  - `project.maimlFileKey` が存在する場合 → `true`（登録済み）
  - `project.maimlFileKey` が null/undefined の場合 → `false`（未登録）

#### ③ `frontend/src/components/editorv2/PetriNetEditorScreen.tsx`
- [ ] `loadMaimlData` 関数の先頭に以下の判定を追加
  ```typescript
  // maimlFileRegistered が明示的に false → APIを呼ばず新規作成モードで開始
  if (params.maimlFileRegistered === false) {
    console.log('ℹ️ [PetriNetEditorScreen] MAIMLファイル未登録 → 新規作成モードで開始');
    setMaimlContent(null);
    setIsLoading(false);
    return;
  }
  ```
  - `undefined` のときはスキップせず従来通り API を呼ぶ（後方互換）

---

## 4. 変更ファイル

| # | ファイルパス | 変更内容 |
|---|---|---|
| 1 | `backend/src/services/fileAccessService.ts` | A案：`getFileTextWithParentInjection` にファイル未存在時の空文字フォールバック追加 |
| 2 | `frontend/src/types/maimlEditor.ts` | B案：`MaimlEditorParams` に `maimlFileRegistered?: boolean` 追加 |
| 3 | `frontend/src/hooks/project/useProjectMaimlEditor.ts` | B案：`buildEditorParams` に `maimlFileRegistered: !!project.maimlFileKey` 追加 |
| 4 | `frontend/src/components/editorv2/PetriNetEditorScreen.tsx` | B案：`loadMaimlData` で `maimlFileRegistered === false` 時にスキップ |

---

## 5. 影響範囲の分析

### 変更なしで動作が変わる可能性があるファイル

| ファイル | 影響 |
|---|---|
| `frontend/src/components/viewer/ViewRendererDialog.tsx` | `getFileContentAsText` は引き続き呼ぶが、A案でファイル未存在時に空文字を返す（既存は `catch` でエラー処理していたが呼び出し元はそのまま。空文字でも `setFileContent('')` になるだけで問題なし） |
| `frontend/src/components/editorv2/PetriNetEditorScreen.tsx`（フォーマット管理から呼ぶ場合） | `maimlFileRegistered` が `undefined` → 従来通り API 呼び出しへ進む（影響なし） |

### セキュリティ影響
- なし（`getFileTextWithParentInjection` 内の fileKey バリデーション（パストラバーサル等）は `streamFileByKey` が担っており引き続き有効。ただし A案では存在しない場合は早期リターンするため `streamFileByKey` を経由しないので、バリデーションが走らない）
- → **対応**: A案で `fileExists` を呼ぶ前に、`streamFileByKey` と同等のバリデーション（空チェック・パストラバーサル）を実施する

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| A案でセキュリティバリデーションが抜ける（パストラバーサル等） | 高 | 中 | `fileExists` 呼び出し前にバリデーションを実施（`fileKey` 空チェック・`..`・`//` 含む場合は throw） |
| B案で `maimlFileRegistered` が間違って `false` になり既存MAIMLが読まれなくなる | 高 | 低 | `!!project.maimlFileKey` → `maimlFileKey` が truthy な文字列のときのみ `true`。意図通り |
| `ViewRendererDialog` で空文字が返りビューアが真っ白になる | 中 | 低 | A案は `getFileTextWithParentInjection` のみ変更。`ViewRendererDialog` が呼ぶ `file.type === 'maiml'` は必ずファイルツリー上に実在するファイルであるため、空文字が返るケースは限定的（実在するのに S3 に存在しない壊れたデータの場合のみ）。既存挙動（404 → エラーメッセージ表示）より劣化しないよう注意する |

---

## 7. テスト計画

### 手動テスト

- [ ] **MAIMLファイル未登録プロジェクト** でエディタ起動ボタンを押す
  - サーバーログに 404 が出ないことを確認
  - エディタが新規作成モードで開くことを確認
- [ ] **MAIMLファイル登録済みプロジェクト** でエディタ起動ボタンを押す
  - 既存のMAIMLが正常に読み込まれることを確認
- [ ] **ViewRendererDialog** でファイルツリーの MAIML ファイルをビューアで開く
  - 正常に表示されることを確認（デグレがないこと）

---

## 8. ロールバック計画

- 変更ファイルは 4 ファイル（バックエンド 1、フロントエンド 3）
- 問題発生時は git revert で各ファイルを元に戻す
- A案（バックエンド）と B案（フロントエンド）は独立しているため、片方のみロールバックも可能

---

## 9. 関連ドキュメント

- [調査記録（本スレッドでの会話）]
- `backend/src/services/fileAccessService.ts`
- `frontend/src/types/maimlEditor.ts`
- `frontend/src/hooks/project/useProjectMaimlEditor.ts`
- `frontend/src/components/editorv2/PetriNetEditorScreen.tsx`

---

## 10. 承認記録

- **計画書提示日時**: 2026-09-07 15:00
- **承認日時**: 2026-09-07 15:10
- **承認者コメント**: 承認します。

---

## 11. 実施記録

### 実施日時
開始: 2026-09-07 15:10
完了: 2026-09-07 15:20

### 計画からの変更点
なし

### 発生した問題と解決方法
- `getFileTextWithParentInjection` 内で `relativeFileKey` が既存コードと二重定義になる箇所を発見し、既存の定義行を削除して一本化した

### 最終的な成果物
- [x] `backend/src/services/fileAccessService.ts` - A案：`getFileTextWithParentInjection` にセキュリティバリデーション＋ファイル未存在時の空文字フォールバック追加
- [x] `frontend/src/types/maimlEditor.ts` - B案：`MaimlEditorParams` に `maimlFileRegistered?: boolean` フィールド追加
- [x] `frontend/src/hooks/project/useProjectMaimlEditor.ts` - B案：`buildEditorParams` に `maimlFileRegistered: !!project.maimlFileKey` セット
- [x] `frontend/src/components/editorv2/PetriNetEditorScreen.tsx` - B案：`loadMaimlData` で `maimlFileRegistered === false` 時はAPIをスキップして新規作成モードへ
- [x] TypeScriptコンパイルエラーなし（バックエンド・フロントエンドとも exit:0）
