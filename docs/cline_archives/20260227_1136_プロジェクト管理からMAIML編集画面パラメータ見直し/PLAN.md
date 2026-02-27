# タスク計画書: プロジェクト管理からMAIML編集画面へのパラメータ見直し

## メタデータ
- **作成日時**: 2026-02-27 11:37
- **タスクID**: maiml-editor-params-review
- **優先度**: 高
- **推定工数**: 1〜2時間

## タスク概要

プロジェクト管理画面（`ProjectManagement.tsx`）からMAIML編集画面（`PetriNetEditorScreen.tsx`）を開く際に渡している `ProjectEditParams` の内容、特に `sourceS3Key` の構築方法に不整合があるため、見直しを行う。

また、フォーマット管理画面（`FormatManagement.tsx`）からも同じ `PetriNetEditorInner` を呼び出している。現状はプロジェクト管理ベースで実装されており、フォーマット管理との共通化が必要。

---

## 現状の呼び出し構造

| 呼び出し元 | 経路 | 渡しているもの |
|---|---|---|
| `ProjectManagement` | → `PetriNetEditorScreen` → `PetriNetEditorInner` | `ProjectEditParams`（projectId/projectName/projectOverview/sourceS3Key） |
| `FormatManagement` | → `PetriNetEditorInner` **直接** | `editingFileName`・`editMode="format"` のみ（S3キーなし） |
| `ExperimentAdminMenu` | → `PetriNetEditorScreen` | `editorProjectParams`（上記 `ProjectEditParams` を使用） |

---

## 現状の問題点

### 1. `sourceS3Key` の構築が3箇所で不一致

`ProjectManagement.tsx` 内で `sourceS3Key` を構築している箇所が3つあり、それぞれ異なるパスを生成している：

#### ① `handleEditButtonClick`（Draftなし → 直接エディタ起動）
```typescript
const sourceS3Key = `/projects/${selectedProject.name}/${selectedProject.name}.maiml`;
```
- **問題**: `organization_id` プレフィックスが**ない**

#### ② `handleRestoreDraft`（Draft復元時）
```typescript
const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '');
const sourceS3Key = userInfo ? `/org_${userInfo.organizationPrefix}/projects/${selectedProject.name}/${selectedProject.name}.maiml` : '';
```
- **問題**: `org_${organizationPrefix}` 形式だが、S3構造規約は `{organization_id}（UUID）` 形式

#### ③ `handleCreateNewOrExisting`（Draft破棄 → エディタ起動）
```typescript
const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || '');
const sourceS3Key = userInfo ? `/org_${userInfo.organizationPrefix}/projects/${selectedProject.name}/${selectedProject.name}.maiml` : '';
```
- **問題**: ②と同じ形式の不一致

### 2. `PetriNetEditorScreen` でS3からのMAIML読み込みが未実装

`PetriNetEditorScreen.tsx` の `loadProjectData()` では：
```typescript
// TODO: プロジェクトに関連するMAIMLファイルを検索して読み込む
setMaimlContent(undefined); // 仮実装: 新規作成モードで開始
```
- **問題**: `sourceS3Key` を受け取っているが、実際にはS3からMAIMLを読み込んでいない（常に新規作成モード）

### 3. S3パス構造規約との不整合

`.clinerules/references/s3_structure.md` によるパス形式：
```
{organization_id}/projects/{project_name}/{project_name}.maiml
```
- `organization_id` は UUID形式（例: `550e8400-e29b-41d4-a716-446655440000`）
- `org_xxx` のようなプレフィックス形式ではない

### 4. `ProjectEditParams` 型がプロジェクト専用であり、フォーマットと共通化されていない

現在の型定義：
```typescript
export interface ProjectEditParams {
  projectId: string;       // プロジェクトIDのみ
  projectName: string;
  projectOverview?: string;
  sourceS3Key: string;
}
```
- `projectId` など、プロジェクト固有のフィールドしか持っていない
- フォーマット管理からも同じエディタ画面を開くため、共通の型定義が必要

### 5. `FormatManagement` がS3キーなしで `PetriNetEditorInner` を直接呼んでいる

```typescript
// FormatManagement.tsx の現状
<PetriNetEditorInner
  maimlData={maimlFileContent}
  editingFileName={editingMaimlFile.name}
  editMode="format"
  // sourceS3Key なし → 保存先が不定
/>
```
- `PetriNetEditorScreen` を経由せず直接 `PetriNetEditorInner` を呼んでいる
- S3キーが渡されていないため、保存先フォルダが不定
- MAIMLの読み込みは独自実装（バックエンドプロキシ経由）で行っているが、`PetriNetEditorScreen` の仕組みと統一されていない

---

## 目的と期待される成果

- [ ] プロジェクト・フォーマット共通のエディタパラメータ型 `MaimlEditorParams` を定義する
- [ ] `sourceS3Key` の構築を統一し、正しいS3パス形式（`{organization_id}/projects/...` または `{organization_id}/formats/...`）を使用する
- [ ] `FormatManagement` の `PetriNetEditorInner` 直接呼出しを `PetriNetEditorScreen` 経由に統一する
- [ ] `PetriNetEditorScreen` でS3からMAIMLファイルを読み込む処理を実装する

---

## 設計提案

### 共通パラメータ型 `MaimlEditorParams` の導入

プロジェクト管理・フォーマット管理どちらからも使える共通型を新規作成する：

```typescript
// frontend/src/types/maimlEditor.ts（新規）
export interface MaimlEditorParams {
  /** 編集コンテキスト（プロジェクトかフォーマットか） */
  editMode: 'project' | 'format';
  /** 表示用ファイル名（例: projectName.maiml） */
  editingFileName: string;
  /** Document名の初期値（拡張子なし） */
  originalFileName: string;
  /** S3上のファイルキー（正しいパス） */
  sourceS3Key: string;
  /** ヘッダー表示用タイトル（プロジェクト名 or フォーマット名） */
  displayTitle: string;
  /** ヘッダー表示用サブタイトル（概要等、任意） */
  displaySubtitle?: string;
  /**
   * DocumentData.id の初期値（任意）
   * 新規作成時にプロジェクトIDなどを Document ID として設定したい場合に使用
   * 設定しない場合は `document_${Date.now()}` が自動生成される
   */
  documentId?: string;
  /**
   * DocumentData.description の初期値（任意）
   * プロジェクトの概要などを Document の説明として引き継ぐ場合に使用
   */
  description?: string;
}
```

> **注意**: `documentId` / `description` はどちらも任意項目。新規作成時のみ適用され、S3から既存のMAIMLを読み込んだ場合はMAIML内の値が優先される。

### `project_id` 型の変更（DBマイグレーション）

現状 `project.project_id` は `uuid` 型だが、エディタの `DocumentData.id` 初期値として連携できるよう `varchar` 型に変更する。

```sql
-- docs/design/db/ddl/project.sql の変更
-- 変更前: project_id uuid NOT NULL
-- 変更後: project_id character varying NOT NULL
```

> この変更により、プロジェクト作成時に UUID 以外の文字列（例: プロジェクト名ベースのID）も使用可能になる。  
> ただし既存データとの互換性を維持するため、マイグレーションスクリプトも作成する。

### 正しいS3パス形式

```
プロジェクト: {organizationId}/projects/{projectName}/{projectName}.maiml
フォーマット: {organizationId}/formats/{departmentCd}/{folderName}/{fileName}.maiml
```

`organizationId` は `getUserInfo().organizationId`（UUID形式）で取得する。

### `MaimlEditorParams` の構築例

```typescript
// ProjectManagement.tsx
import { getUserInfo } from '@/utils/sessionStorageHelper';

const buildMaimlEditorParams = (project: Project): MaimlEditorParams => {
  const userInfo = getUserInfo();
  const orgId = userInfo?.organizationId || '';
  return {
    editMode: 'project',
    editingFileName: `${project.name}.maiml`,
    originalFileName: project.name,
    sourceS3Key: `${orgId}/projects/${project.name}/${project.name}.maiml`,
    displayTitle: project.name,
    displaySubtitle: project.description,
    documentId: project.id,           // プロジェクトIDをDocument IDの初期値に（任意）
    description: project.description, // プロジェクト概要をDocumentの説明に（任意）
  };
};

// FormatManagement.tsx
const buildFormatMaimlEditorParams = (file: FormatFileDetailData, format: Format): MaimlEditorParams => {
  const userInfo = getUserInfo();
  const orgId = userInfo?.organizationId || '';
  return {
    editMode: 'format',
    editingFileName: file.name,
    originalFileName: file.name.replace('.maiml', ''),
    sourceS3Key: file.path ? `${orgId}/${file.path}` : '',
    displayTitle: format.name,
    displaySubtitle: file.name,
    // documentId / description は任意のため省略可
  };
};
```

### `generateInitialDocumentData` の拡張

新規作成時に `documentId` と `description` を反映できるよう引数を拡張する：

```typescript
// documentInitializer.ts の変更
export const generateInitialDocumentData = (
  editingFileName?: string,
  options?: {
    documentId?: string;   // DocumentData.id の初期値
    description?: string;  // DocumentData.description の初期値
  }
) => {
  const baseFileName = editingFileName ? editingFileName.replace('.maiml', '') : '';
  const uuidFull = crypto.randomUUID();
  const uuidPrefix = uuidFull.substring(0, 8);
  const now = new Date();
  const formattedDate = now.toISOString().split('T')[0];

  const documentData = {
    id: options?.documentId || `document_${Date.now()}`, // documentIdが渡されていればそれを使用
    uuid: uuidFull,
    name: baseFileName || 'document',
    description: options?.description || '',  // descriptionが渡されていればそれを使用
    date: formattedDate,
    // ... 以下は既存のまま
  };
  // ...
};
```

> **適用タイミング**: S3から既存MAIMLを読み込んだ場合は `extractDocumentFromMaiML()` の結果を使うため、`options` は新規作成時（MAIMLが存在しない場合）のみ反映される。

---

## 実装ステップ

### Phase 1: 共通型の作成 ✅（調査完了）
- [x] `sessionStorage` の `userInfo` 構造を確認 → `organizationId`（UUID）が存在する
- [x] `maimlApiService.ts` の `getStorageFileContent(fileKey)` でS3読み込み可能を確認
- [x] `generateInitialDocumentData` の構造を確認 → `options.documentId` / `options.description` で拡張可能
- [x] `project.project_id` の型を確認 → 現在 `uuid`、`varchar` に変更が必要
- [ ] `frontend/src/types/maimlEditor.ts` を新規作成（`MaimlEditorParams` 定義）

### Phase 2: DBマイグレーション（`project_id` を varchar に変更）
- [ ] `docs/design/db/ddl/project.sql` の `project_id` 型を `uuid` → `character varying` に変更
- [ ] マイグレーションスクリプト作成（`backend/migrations/20260227_alter_project_id_to_varchar.sql`）
- [ ] バックエンドの型定義確認・修正（`backend/src/types/` の `project_id` が `string` であれば変更不要）

### Phase 3: `generateInitialDocumentData` の拡張
- [ ] `frontend/src/utils/documentInitializer.ts` の `generateInitialDocumentData` に `options` 引数を追加
- [ ] `documentId` が渡された場合は `id` の初期値に使用
- [ ] `description` が渡された場合は `description` の初期値に使用

### Phase 4: `ProjectManagement.tsx` の修正
- [ ] `buildMaimlEditorParams()` ヘルパー関数を作成（`documentId: project.id`・`description: project.description` 含む）
- [ ] `handleEditButtonClick`・`handleRestoreDraft`・`handleCreateNewOrExisting` の3箇所を統一
- [ ] `ProjectEditParams` 型の import を `MaimlEditorParams` に変更

### Phase 5: `FormatManagement.tsx` の修正
- [ ] `PetriNetEditorInner` 直接呼出しを `PetriNetEditorScreen` 経由に変更
- [ ] `buildFormatMaimlEditorParams()` でS3キーを正しく設定

### Phase 6: `PetriNetEditorScreen.tsx` の修正
- [ ] Props型を `MaimlEditorParams` ベースに変更（`projectId` 不要になる）
- [ ] `loadProjectData()` で `getStorageFileContent(sourceS3Key)` を使いS3からMAIML読み込みを実装
- [ ] MAIMLなし（新規作成）の場合、`generateInitialDocumentData(editingFileName, { documentId, description })` を呼ぶ
- [ ] ファイル未存在時は新規作成モードにフォールバック

### Phase 7: `PetriNetEditorInner.tsx` の修正
- [ ] `generateInitialDocumentData` 呼出し箇所に `options` を渡せるよう対応（`sourceS3Key` が渡されているProps経由で `documentId` / `description` を受け取る）

### Phase 8: `ExperimentAdminMenu.tsx` の更新
- [ ] `editorProjectParams` の型を `MaimlEditorParams` に変更
- [ ] `PetriNetEditorScreen` へのパラメータ渡しを更新

### Phase 9: `project.ts` の整理
- [ ] `ProjectEditParams` を削除（または `MaimlEditorParams` の型エイリアスとして残す）

---

## 変更ファイル

### 新規作成
1. `frontend/src/types/maimlEditor.ts` - `MaimlEditorParams` 共通型定義
2. `backend/migrations/20260227_alter_project_id_to_varchar.sql` - project_id型変更マイグレーション

### 修正
3. `docs/design/db/ddl/project.sql` - `project_id` を `uuid` → `character varying` に変更
4. `frontend/src/utils/documentInitializer.ts` - `generateInitialDocumentData` に `options` 引数追加
5. `frontend/src/types/project.ts` - `ProjectEditParams` 削除
6. `frontend/src/components/project/ProjectManagement.tsx` - `sourceS3Key` 構築統一、型変更
7. `frontend/src/components/project/FormatManagement.tsx` - `PetriNetEditorScreen` 経由に変更
8. `frontend/src/components/editorv2/PetriNetEditorScreen.tsx` - Props型変更、S3読み込み実装
9. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - `generateInitialDocumentData` に options を渡す対応
10. `frontend/src/components/menus/ExperimentAdminMenu.tsx` - パラメータ型更新

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `userInfo` の構造が不明確 | 中 | sessionStorage の内容を実際に確認してから実装 |
| S3パス変更によるファイル未検出 | 高 | フォールバック（新規作成モード）を必ず実装する |
| maimlApiService の読み込みAPIが未整備 | 中 | 既存の `getStorageFileContent` を活用する |

---

## テスト計画

### プロジェクト管理から
- [ ] Draftなしでプロジェクトを選択し編集ボタンを押す → 正しいS3パスでMAIMLが読み込まれること
- [ ] Draftがある状態で「復元する」→ 正しいパラメータでエディタが開くこと
- [ ] Draftがある状態で「新規作成」→ S3から読み込まれること（またはMAIMLなしで新規作成）
- [ ] MAIMLファイルが存在しないプロジェクト → 新規作成モードで開くこと

### フォーマット管理から
- [ ] MAIMLファイルをクリック → `PetriNetEditorScreen` が開くこと
- [ ] 正しいS3パスでMAIMLが読み込まれること
- [ ] 保存時に正しいS3パスに保存されること

---

## 承認記録

- **計画書提示日時**: 2026-02-27 11:37
- **更新日時**: 2026-02-27 11:47（調査結果・設計提案追記）
- **更新日時**: 2026-02-27 11:53（追加要件追記: documentId/description連携、project_id型変更）
- **承認日時**: 2026-02-27 11:57
- **承認者コメント**: ドキュメント修正のタスクとして実施

---

## 実施記録

### 実施日時
開始: 2026-02-27 11:57  
完了: 2026-02-27 15:22

### 実施内容（ドキュメント修正のみ）

本タスクでは、ソースコード実装は既に完了済みであったため、ドキュメントの更新のみを実施した。

#### 更新したドキュメント

1. **`docs/design/db/db_table_list.md`**
   - `project` テーブルの `project_id` 型を `uuid` → `character varying` に更新

2. **`docs/design/api/api_project_management.md`**
   - バージョン・最終更新日時を更新

3. **`docs/design/ui/experiment_admin/01_project_management/ui_project_management.md`**
   - `handleEditButtonClick` のコード例を `ProjectEditParams` → `MaimlEditorParams` に更新（正しい `sourceS3Key` 構築も反映）
   - Props定義セクションの `ProjectEditParams` インターフェース定義を削除し、`MaimlEditorParams` の import に変更
   - 変更理由の注釈を追加（2026-02-27）

4. **`docs/design/api/api_maiml_editor.md`**
   - バージョン 3.1.0 に更新
   - PUT `/api/v1/projects/:projectId/maiml` の `projectId` 型を UUID → string(varchar) に変更
   - GET `/api/v1/projects/:projectId/maiml` の `projectId` 型を UUID → string(varchar) に変更
   - 変更履歴に 3.1.0 エントリを追加

#### 確認したドキュメント（変更不要）

- `docs/design/ui/experiment_admin/02_format_management/ui_format_management.md`
  - `ProjectEditParams` の参照なし → 変更不要

### 最終的な成果物
- [x] DB一覧ファイルの project_id 型変更を反映
- [x] API仕様書（プロジェクト管理）の更新
- [x] UI仕様書（プロジェクト管理）の MaimlEditorParams への更新
- [x] MAIML編集API仕様書の projectId 型変更を反映
