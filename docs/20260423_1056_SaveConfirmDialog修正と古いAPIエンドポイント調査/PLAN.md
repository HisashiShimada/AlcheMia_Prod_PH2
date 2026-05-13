# タスク計画書: SaveConfirmDialog修正と古いAPIエンドポイント調査

## メタデータ
- **作成日時**: 2026-04-23 10:57
- **タスクID**: SaveConfirmDialog修正と古いAPIエンドポイント調査
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`frontend/src/components/editorv2/components/SaveConfirmDialog.tsx` に対して以下2点を対応する。

1. **修正**: フォルダパス手動入力項目の削除  
   現行はプロジェクト配下への保存先が決まっているため、「新規フォルダパスを入力」UIは不要。

2. **調査**: `fetchS3Folders()` で呼び出している `/api/s3/folders` が古いエンドポイントであることを確認し、reference版の処理内容を把握する。

---

## 調査結果サマリー

### 呼び出しているエンドポイント（現状）

```typescript
// SaveConfirmDialog.tsx - 132行目
const response = await fetch(`/api/s3/folders?organizationId=${currentOrgId}`, {
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
});
```

### reference版 `/api/s3/folders` の処理内容

**ファイル**: `backend/reference/routes/s3/listingRoutes.js` (391〜572行)

**処理フロー**:
1. テナントコンテキスト（`req.tenantContext.allowedOrgIds`）で認証済み組織IDを取得
2. クエリパラメータ `organizationId` を許可組織IDと照合（不一致は403）
3. `getOrganizationS3Prefix(targetOrgId)` でDB経由のS3ルートパスを取得
4. S3に `ListObjectsV2Command` を発行し最大1000件取得
5. Key が `/` 終わりかつ Size=0 の「実体フォルダオブジェクト」のみ抽出（プレフィックス除外）
6. `.folder_placeholder` ファイルを読み込み、`exclude: true` のフォルダをフィルタリング
7. orgPrefix外のパスを除外（セキュリティ）
8. orgPrefixからの**相対パス**（`fullPath`）と**絶対パス**（`absolutePath`）の両方を返却

**レスポンス形式**:
```json
{
  "success": true,
  "folders": [
    {
      "name": "sample_project",
      "fullPath": "projects/sample_project",
      "absolutePath": "550e8400-e29b-41d4-a716-446655440000/projects/sample_project",
      "parentPath": "projects",
      "level": 2,
      "fileCount": 3,
      "lastModified": "...",
      "organizationId": "550e8400-..."
    }
  ],
  "totalFolders": 1
}
```

### 現行バックエンドの対応状況

`backend/src/routes/` に `/api/s3/folders` に相当するエンドポイントは**存在しない**。

| reference版エンドポイント | 現行バックエンド対応 |
|---|---|
| `GET /api/s3/folders` | **なし**（未移行） |
| `GET /api/s3/files` | `GET /api/v1/maiml/files` |
| `POST /api/s3/save` | `POST /api/v1/maiml/save` |
| `GET /api/s3/file-content` | `GET /api/v1/maiml/file-content` |

**結論**: `SaveConfirmDialog.tsx` の `fetchS3Folders()` は現行バックエンドに存在しないエンドポイントを呼んでいるため、実際には404またはエラーになっている。

---

## 修正内容の詳細

### 削除対象UI・ロジック

`SaveConfirmDialog.tsx` から以下を削除する。

**状態変数（削除）**:
- `customFolder` state（95行目）
- `showCustomFolderInput` state（97行目）

**UIブロック（削除）**:
- `showCustomFolderInput` が `true` の場合の Input フォームブランチ（353〜369行目）
- 「➕ 新規フォルダパスを入力」ボタン（397〜404行目）
- `showCustomFolderInput ? ... : ...` の3項演算子を解除してツリー表示側に統一

**ロジック（簡略化）**:
- `handleChoice` 関数内の `showCustomFolderInput ? customFolder : selectedFolder` を `selectedFolder` に変更（239行目）

**フォルダ取得ロジック（削除）**:
- `fetchS3Folders()` 関数ごと削除（古いエンドポイント `/api/s3/folders` を呼んでいるため）
- フォルダツリー表示UIも不要のため合わせて削除
- 関連する `useEffect`（`fetchS3Folders` 呼び出し）も削除
- `treeData` / `expandedKeys` state も削除
- `folders` state も削除
- `loadingFolders` state も削除
- `buildTreeData` / `buildTreeNodes` / `handleFolderSelect` 関数も削除

**未使用インポートの削除**:
- `Input` コンポーネント（Antd）が不要になる場合は削除

---

## 実装ステップ

### state 削除
- [ ] `folders` state（93行）を削除
- [ ] `selectedFolder` state（94行）を削除（保存先として `sourceFolder` を直接使う）
- [ ] `customFolder` state（95行）を削除
- [ ] `loadingFolders` state（96行）を削除
- [ ] `showCustomFolderInput` state（97行）を削除
- [ ] `treeData` state（98行）を削除
- [ ] `expandedKeys` state（99行）を削除

### useEffect 削除
- [ ] `sourceFolder` → `selectedFolder` セット用 useEffect（102〜107行）を削除
- [ ] `fetchS3Folders()` 呼び出し useEffect（110〜114行）を削除

### 関数削除
- [ ] `fetchS3Folders()` 関数（116〜165行）を削除
- [ ] `buildTreeData()` 関数（168〜202行）を削除
- [ ] `buildTreeNodes()` 関数（205〜228行）を削除
- [ ] `handleFolderSelect()` 関数（231〜235行）を削除

### ロジック修正
- [ ] `handleChoice()` の `showCustomFolderInput ? customFolder : selectedFolder` を `sourceFolder` に変更（239行）

### UI削除（S3フォルダ選択ブロック）
- [ ] 「📁 保存先フォルダ:」以降のフォルダ選択ブロック全体（346〜412行）を削除
- [ ] `selectedFolder` 表示 Alert を削除
- [ ] フォルダ Tree コンポーネントを削除
- [ ] カスタムフォルダ Input フォームを削除
- [ ] 「➕ 新規フォルダパスを入力」ボタンを削除

### インポート整理
- [ ] 不要になったインポートを削除
  - `Input`（Antd）
  - `Tree`（Antd）
  - `DataNode`（antd/es/tree）
  - `FolderOutlined`、`FolderOpenOutlined`（@ant-design/icons）
  - 使用箇所がなければ `Spin` も削除確認

### 型定義整理
- [ ] `S3Folder` interface（56〜59行）を削除
- [ ] `FolderNode` interface（69〜78行）を削除
- [ ] `FolderStructure` type（80行）を削除

### 確認
- [ ] TypeScriptコンパイルエラーなし
- [ ] `sourceFolder` の受け渡しが `onSave` コールバックで正しく動作することを確認

---

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `frontend/src/components/editorv2/components/SaveConfirmDialog.tsx` | フォルダパス手動入力UI・state・ロジックの削除 |
| `docs/20260423_1056_SaveConfirmDialog修正と古いAPIエンドポイント調査/PLAN.md` | 本計画書 |

---

## 調査まとめ（別タスクへの申し送り）

`/api/s3/folders` は現行バックエンドに存在しないため、`fetchS3Folders()` は常にエラーになっている。
フォルダツリー表示が必要な場合は、別タスクで以下を検討する：

- 現行の `GET /api/v1/maiml/files` から取得したファイル一覧を元にフォルダ階層を構築
- または、現行バックエンドに `GET /api/v1/maiml/folders` 相当のエンドポイントを新設し、reference版の処理を移植

---

## リスク

| リスク | 対策 |
|---|---|
| カスタムフォルダ指定を使用している箇所が他にある | `customFolder` / `showCustomFolderInput` の参照箇所を確認してから削除 |
| TypeScriptコンパイルエラー | 削除後に未使用インポートを確認して修正 |

---

## 承認記録
- **計画書提示日時**: 2026-04-23 10:57
- **承認日時**: 2026-04-23 11:02
- **承認者コメント**: フォルダツリー構造も不要のため古いエンドポイント呼び出し部分も削除する

## 実施記録

### 実施日時
開始: 2026-04-23 11:02  
完了: 2026-04-23 11:04

### 最終的な成果物
- [x] `folders` / `selectedFolder` / `customFolder` / `loadingFolders` / `showCustomFolderInput` / `treeData` / `expandedKeys` state を削除
- [x] `sourceFolder → selectedFolder` セット用 useEffect を削除
- [x] `fetchS3Folders()` 呼び出し useEffect を削除
- [x] `fetchS3Folders()` 関数（古いエンドポイント `/api/s3/folders` 呼び出し）を削除
- [x] `buildTreeData()` / `buildTreeNodes()` / `handleFolderSelect()` 関数を削除
- [x] `handleChoice()` の保存先フォルダを `sourceFolder`（props）に固定
- [x] フォルダ選択UIブロック全体（Tree・Input・ボタン）を削除
- [x] 不要型定義（`S3Folder` / `FolderNode` / `FolderStructure`）を削除
- [x] 不要インポート（`Input` / `Tree` / `DataNode` / `FolderOutlined` / `FolderOpenOutlined` / `Spin` / `Divider` / `useEffect` / `useCallback`）を削除
- [x] ファイルサイズ: 486行 → 220行（約55%削減）
