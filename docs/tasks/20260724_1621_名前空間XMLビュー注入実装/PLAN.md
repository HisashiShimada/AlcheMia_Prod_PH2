# タスク計画書: 名前空間XMLビュー注入実装

## メタデータ
- **作成日時**: 2026-07-15 09:04
- **タスクID**: namespace-xml-inject
- **優先度**: 高
- **推定工数**: 6時間（Phase 0〜9 合算）

## タスク概要

実験管理者メニューのXMLビュー（`<maiml>` タグ）に組織の名前空間宣言（`xmlns="URI"`）を自動注入する。
あわせてバックエンドのRepository実装をDDL通りのテーブル構造に修正し、URI自動生成のモック値を解消する。

以下を一連の作業として実施する。

1. **URI生成仕様変更**（Phase 0）: `namespaceUriGenerator.ts` のドメイン形式・個人URI・重複採番対応
2. **注入ユーティリティ作成**（Phase 1）: `namespaceInjector.ts` を新規作成
3. **フロントエンドAPI確認**（Phase 2）: `namespaceApiService.ts` に名前空間一覧取得関数追加
4. **XMLビューへの注入**（Phase 3）: `XMLViewerWrapper.tsx` に注入処理を追加
5. **保存処理への注入**（Phase 4）: `PetriNetEditorInner.tsx` の保存前に注入
6. **DBマイグレーション**（Phase 5）: `namespace.organization_id` に UNIQUE 制約追加
7. **バックエンド Repository 修正**（Phase 6）: DDL準拠の全面修正
8. **バックエンド Controller 修正**（Phase 7）: Repository変更への追従
9. **フロントエンドモックCD解消**（Phase 8）: `NamespaceAddDialog.tsx` の組織CDをコンテキストから取得
10. **注入形式確定・最終調整**（Phase 9）: `xmlns="URI"`（デフォルト名前空間）形式への統一

---

## 調査結果

### 現状の実装フロー

```
ユーザーがXMLビューを開く
  ↓
frontend: XMLViewerWrapper.tsx → XML生成後に名前空間注入を試みる
  ↓
frontend: namespaceApiService.ts → GET /api/v1/namespaces/declarations
  ↓
backend: namespaceController.ts → getDeclarations()
  ↓
backend: namespaceTermRepository.ts → findDeclarationsByOrganization(organizationId)
  ↓
SQL: SELECT prefix, uri FROM namespace WHERE organization_id=$1 AND is_active=true
  ↓
frontend: namespaceInjector.ts → injectNamespacesToMaiml(xmlString, uri)
  ↓
XMLViewer に渡して表示
```

### DDL上の正しいテーブル構造

```
namespace       (organization_id, namespace_id, scope_key, uri, global_flg)
    ↓ FK (namespace_id)
prefix          (organization_id, namespace_id, prefix, is_active)
    ↓ FK (prefix)
namespace_term  (organization_id, namespace_id, prefix, localname)
```

### namespace テーブル構造（DDL抜粋）

```sql
namespace (
  organization_id  UUID         -- 組織ID（UNIQUE 制約を追加予定）
  namespace_id     VARCHAR(20)  -- 名前空間ID（内部識別子）
  scope_key        VARCHAR(100) -- スコープ: NULL=組織全体, userId=個人, groupId=チーム等
  uri              TEXT         -- 名前空間URI
  global_flg       BOOLEAN      -- TRUE=グローバル（全組織共通）
  create_user_id   VARCHAR(50)
  ...
)
```

### 過去の実装上の誤り（Phase 6 で修正済み）

| 問題 | 箇所 |
|------|------|
| `namespace.scope_key AS prefix` を SELECT（`prefix`テーブル未使用） | `findDeclarationsByOrganization()` |
| `namespace`テーブルに`prefix`カラムとして保存（DDLに存在しない） | `createNamespace()` |
| `namespace_term` INSERT時に `namespace_id` カラムを含めない | `create()` |
| URI自動生成にモック組織CD `'ORG001'` をハードコード | `NamespaceAddDialog.tsx` |
| `scope_key`（個人/チーム/部署スコープ）を考慮していない | `findDeclarationsByOrganization()` |

### 関連ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/repositories/namespaceTermRepository.ts` | namespace/prefix/namespace_term テーブルへのアクセス |
| `backend/src/controllers/namespaceController.ts` | `getDeclarations()` / `getProjectDeclarations()` |
| `backend/migrations/20260724_namespace_unique_organization_id.sql` | UNIQUE制約追加マイグレーション |
| `frontend/src/utils/namespaceInjector.ts` | XML への xmlns 注入処理 |
| `frontend/src/utils/namespaceUriGenerator.ts` | URI自動生成ユーティリティ |
| `frontend/src/services/namespaceApiService.ts` | `getOrganizationNamespaceUri()` / `fetchProjectDeclarations()` |
| `frontend/src/components/editorv2/XMLViewerWrapper.tsx` | XML生成 → 名前空間注入 → XMLViewer 表示 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | 保存処理（注入対象） |
| `frontend/src/components/namespace/NamespaceAddDialog.tsx` | 名前空間新規登録ダイアログ（モックCD使用箇所） |
| `frontend/src/components/namespace/DepartmentNodeAddDialog.tsx` | generateNamespaceUri 呼び出し箇所 |

---

## 確定仕様

| 項目 | 仕様 |
|------|------|
| 注入形式 | `xmlns="URI"`（デフォルト名前空間、prefix なし） |
| URI 取得元 | `namespace.uri` WHERE `organization_id = $1` |
| 1組織1件制約 | `namespace.organization_id` に UNIQUE 制約を追加 |

### XMLビュー注入フロー（修正後のあるべき姿）

```
XMLViewerWrapper.tsx
  → namespaceApiService.fetchProjectDeclarations(projectId) または getOrganizationNamespaceUri()
  → GET /api/v1/namespaces/declarations
  → namespaceController.getDeclarations()
  → namespaceTermRepository.findDeclarationsByOrganization()
     SELECT n.uri
     FROM namespace n
     WHERE n.organization_id = $1
  → injectNamespacesToMaiml(xmlString, uri)
  → <maiml xmlns="https://ORG001.Alchemia.co.jp" ...>
```

---

## Phase 0: namespaceUriGenerator.ts の仕様修正（完了済み）

### 新URI形式

| スコープ | URI形式 | 例 |
|---------|---------|---|
| 組織のみ | `https://{org_cd}.Alchemia.co.jp` | `https://ORG001.Alchemia.co.jp` |
| 組織＋グループCD | `https://{org_cd}.Alchemia.co.jp/{group_cd}` | `https://ORG001.Alchemia.co.jp/RD` |
| 組織＋グループ＋レイヤー | `https://{org_cd}.Alchemia.co.jp/{group_cd}/{layer...}` | `https://ORG001.Alchemia.co.jp/RD/layer1` |
| 個人 | `https://{org_cd}.Alchemia.co.jp/{login_name}` | `https://ORG001.Alchemia.co.jp/taro.yamada` |
| 個人（重複時） | `https://{org_cd}.Alchemia.co.jp/{login_name}{N}` | `https://ORG001.Alchemia.co.jp/taro.yamada1` |

### 変更点（現行との差分）

| 項目 | 現行 | 新仕様 |
|------|------|--------|
| ドメイン | `https://{org_cd}/` | `https://{org_cd}.Alchemia.co.jp` |
| 末尾スラッシュ | あり | **なし（全パターン）** |
| 個人URI | 未対応 | `loginName`（`first.last` 形式）引数を追加 |
| 重複採番 | 未対応 | `resolveUriConflict(uri, existingUris)` 関数を追加 |

### 修正後のシグネチャ

```typescript
export function generateNamespaceUri(
  organizationCd: string,
  groupCd?: string,
  layerParts?: string[],
  loginName?: string,
): string

export function resolveUriConflict(
  uri: string,
  existingUris: string[],
): string
```

### 実装ステップ
- [x] URI形式を新仕様に変更
- [x] 既存の呼び出し箇所（`DepartmentNodeAddDialog.tsx`, `NamespaceAddDialog.tsx`）への影響確認・修正

### 変更ファイル
1. `frontend/src/utils/namespaceUriGenerator.ts` - URI仕様変更・個人URI・重複採番対応
2. `frontend/src/components/namespace/DepartmentNodeAddDialog.tsx` - generateNamespaceUri 呼び出し修正
3. `frontend/src/components/namespace/NamespaceAddDialog.tsx` - generateNamespaceUri 呼び出し修正

---

## Phase 1: 名前空間注入ユーティリティの作成（完了済み）

### 実装ステップ
- [x] `frontend/src/utils/namespaceInjector.ts` を新規作成

### 処理ロジック

```typescript
// 保護する標準プレフィックス
const STANDARD_PREFIXES = new Set(['xsi', 'xs', 'xsd', 'xlink', 'xenc']);

export function injectNamespacesToMaiml(
  xml: string,
  uri: string
): string {
  if (!uri) return xml;
  // <maiml ...> タグを検出
  // 既存のカスタム xmlns を除去（標準プレフィックスは保持）
  // デフォルト名前空間 xmlns="URI" を挿入
}
```

### 注入前後のイメージ

**注入前:**
```xml
<maiml version="1.0" xmlns="http://www.maiml.org/schemas"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.maiml.org/schemas maiml.xsd">
```

**注入後:**
```xml
<maiml version="1.0" xmlns="https://ORG001.Alchemia.co.jp"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.maiml.org/schemas maiml.xsd">
```

### 変更ファイル
#### 新規作成
1. `frontend/src/utils/namespaceInjector.ts` - XML名前空間注入ユーティリティ

---

## Phase 2: フロントエンド名前空間APIの確認・追加（完了済み）

### 実装ステップ
- [x] バックエンドの名前空間一覧取得エンドポイントを確認
- [x] `frontend/src/services/namespaceApiService.ts` に `getOrganizationNamespaceUri()` / `fetchProjectDeclarations()` を追加

### 変更ファイル
1. `frontend/src/services/namespaceApiService.ts` - 名前空間一覧取得API追加・レスポンス型修正

---

## Phase 3: XMLビューへの注入（完了済み）

### 実装ステップ
- [x] `frontend/src/components/editorv2/XMLViewerWrapper.tsx` を修正
  - `projectId` が指定されている場合は `fetchProjectDeclarations()` から URI を取得
  - `projectId` がない場合は `getOrganizationNamespaceUri()` にフォールバック
  - 取得した URI を `injectNamespacesToMaiml()` に渡して注入

### 変更ファイル
1. `frontend/src/components/editorv2/XMLViewerWrapper.tsx` - XMLビュー生成時に注入・projectId フォールバック対応

---

## Phase 4: 保存処理への注入（完了済み）

### 実装ステップ
- [x] `frontend/src/components/editorv2/PetriNetEditorInner.tsx` の保存処理を修正
  - `convertMultipleMethodsToMaiML()` でXML生成後
  - `injectNamespacesToMaiml()` でxmlns注入してから `saveMaiml()` に渡す

### 変更ファイル
1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - 保存前に注入

---

## Phase 5: DBマイグレーション（完了済み）

### 実装ステップ
- [x] `backend/migrations/20260724_namespace_unique_organization_id.sql` を新規作成
  - `namespace` テーブルに `UNIQUE (organization_id)` 制約を追加

### 変更ファイル
#### 新規作成
1. `backend/migrations/20260724_namespace_unique_organization_id.sql` - UNIQUE制約追加マイグレーション

---

## Phase 6: バックエンド Repository 修正（完了済み）

### 実装ステップ
- [x] `backend/src/repositories/namespaceTermRepository.ts` を修正
  - `findDeclarationsByOrganization()`: `namespace.uri` のみ返すよう修正（DDL準拠、`scope_key` 考慮）
  - `findDeclarationsByProjectScope()`: 同様に修正
  - `createNamespace()`: `namespace`テーブル（URIのみ）+ `prefix`テーブル（prefix文字列）の2テーブルINSERTに修正
  - `create()` (namespace_term): `namespace_id` カラムを含めてINSERT
  - `findNamespacesByOrganization()`: `prefix` テーブルをJOINして返すよう修正
  - `existsNamespace()`: `prefix` テーブルを参照するよう修正
  - `removeNamespace()`: `namespace` + `prefix` テーブル両方を削除するよう修正

### 変更ファイル
1. `backend/src/repositories/namespaceTermRepository.ts` - DDL準拠の全面修正

---

## Phase 7: バックエンド Controller 修正（完了済み）

### 実装ステップ
- [x] `backend/src/controllers/namespaceController.ts` を修正
  - `getDeclarations()`: 修正後のリポジトリと整合が取れているか確認・調整
  - `getDeclarations()` でログインユーザーIDを取得して渡す

### 変更ファイル
1. `backend/src/controllers/namespaceController.ts` - Repository変更に伴う調整・ログインユーザーID対応

---

## Phase 8: フロントエンドモックCD解消（完了済み）

### 実装ステップ
- [x] `frontend/src/components/namespace/NamespaceAddDialog.tsx` を修正
  - `MOCK_ORG_CD` / `MOCK_DEPT_CD` を認証コンテキスト（`useAuth`等）から取得するよう修正

### 変更ファイル
1. `frontend/src/components/namespace/NamespaceAddDialog.tsx` - モック組織CD解消

---

## Phase 9: 注入形式確定・最終調整（完了済み）

### 実装ステップ
- [x] `namespaceTermRepository.ts` の `findDeclarationsByOrganization()` を最終形に修正
- [x] `namespaceInjector.ts` の注入形式を `xmlns="uri"` に変更
- [x] `namespaceApiService.ts` のレスポンス型修正
- [x] `XMLViewerWrapper.tsx` の namespace 取得ロジック整理

### 変更ファイル
1. `backend/src/repositories/namespaceTermRepository.ts` - findDeclarationsByOrganization() 最終修正
2. `frontend/src/utils/namespaceInjector.ts` - 注入形式を `xmlns="uri"` に変更
3. `frontend/src/services/namespaceApiService.ts` - レスポンス型修正
4. `frontend/src/components/editorv2/XMLViewerWrapper.tsx` - namespace 取得整理

---

## 変更ファイル一覧

### 新規作成
1. `frontend/src/utils/namespaceInjector.ts` - XML名前空間注入ユーティリティ
2. `backend/migrations/20260724_namespace_unique_organization_id.sql` - UNIQUE制約追加マイグレーション

### 修正
1. `frontend/src/utils/namespaceUriGenerator.ts` - URI仕様変更・個人URI・重複採番対応
2. `frontend/src/components/namespace/DepartmentNodeAddDialog.tsx` - generateNamespaceUri 呼び出し修正
3. `frontend/src/components/namespace/NamespaceAddDialog.tsx` - generateNamespaceUri 呼び出し修正・モック組織CD解消
4. `frontend/src/services/namespaceApiService.ts` - 名前空間一覧取得API追加・レスポンス型修正
5. `frontend/src/components/editorv2/XMLViewerWrapper.tsx` - XMLビュー生成時に注入・projectId フォールバック対応
6. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - 保存前に注入
7. `backend/src/repositories/namespaceTermRepository.ts` - DDL準拠の全面修正
8. `backend/src/controllers/namespaceController.ts` - Repository変更に伴う調整・ログインユーザーID対応

---

## 影響範囲

### 影響を受ける機能
- XMLビューの名前空間宣言注入（`<maiml xmlns="...">`）
- 保存処理のMAIMLファイルへの名前空間宣言埋め込み
- 名前空間（Prefix）の新規登録
- 用語（Term）の新規登録
- 名前空間宣言一覧取得 API（`GET /api/v1/namespaces/declarations`）
- プロジェクトスコープ名前空間取得 API（`GET /api/v1/namespaces/project-declarations`）

### セキュリティ考慮事項
- `organization_id` によるマルチテナント分離は維持（すべてのクエリに `organization_id` フィルタを含める）

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| UNIQUE制約追加時に既存の重複データが存在する | 高 | 低（開発環境のみデータ有り） | マイグレーション前に重複チェックを行い、不要データを削除 |
| namespace_term INSERT で namespace_id が取得できない | 中 | 中 | `prefix` テーブルから `namespace_id` を逆引きするサブクエリを使用 |
| フロントエンドの認証コンテキストに organization_cd がない | 中 | 中 | 認証コンテキストの型定義を確認し、なければバックエンドAPIから取得する |
| XMLViewerWrapperの非同期処理追加でチラつき | 低 | 低 | useEffect で適切にハンドリング（実装済み） |

---

## テスト計画

- [x] 名前空間（Prefix）を新規登録 → `prefix` テーブルにレコードが作成されること
- [x] 用語（Term）を新規登録 → `namespace_term` テーブルに `namespace_id` が含まれること
- [x] XMLビューを開く → `<maiml xmlns="（自動生成URI）" ...>` が正しく表示されること
- [x] `NamespaceAddDialog` で組織レベルを選択 → 実際の組織CDを使ったURIが生成されること
- [x] 名前空間が0件の状態でXMLビューを開いても正常表示されること
- [x] 保存したMAIMLファイルをダウンロードし、xmlns宣言が含まれること

---

## 承認記録
- **承認日時**: 2026-07-15 09:04
