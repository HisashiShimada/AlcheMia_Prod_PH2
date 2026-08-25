# タスク計画書: ExperimentInstructionTab ビューアボタン修正

## メタデータ

- **作成日時**: 2026-08-19
- **タスクID**: 20260819_ExperimentInstructionTabビューアボタン修正
- **優先度**: 高
- **推定工数**: 1時間
- **担当**: Cline

---

## 1. タスク概要

`frontend/src/components/project/ExperimentInstructionTab.tsx` に実装されているペトリネットビューアボタン（「ペトリネットを表示」ボタン）が正常に機能していなかった問題を修正する。

---

## 2. 問題の詳細

### 問題①: `projects/` プレフィックス欠落

`handleOpenPetriNetViewer` 内でS3ファイルパスを自前で組み立てていたが、`projects/` プレフィックスが抜けていた。

```typescript
// 修正前（誤り）
path: `${projectName}/${projectName}.maiml`
// 正しくは
path: `projects/${projectName}/${projectName}.maiml`
```

### 問題②（本質）: プロジェクト名ベースのパス組み立て自体が誤り

プロジェクト名（`project_name`）とMAIMLファイル名は必ずしも一致しない。  
バックエンドは `project_uuid → file_metadata → file_key` の順で正確なファイルパスを解決するため、フロントエンドが独自にパスを組み立てることは設計上誤り。

正しいアプローチは `GET /api/v1/projects/:projectId/maiml`（`getProjectMaiml`）を呼び出してバックエンドにファイル解決を委ねること。  
`ProgressCheckTable`・`InstructionConfirmationTab` 等の他コンポーネントはすでにこのパターンを採用している。

### 問題③: `fileContent` prop が渡されていない

`ViewRendererDialog` は `fileContent` prop が渡された場合はS3への再取得をスキップするが、`ExperimentInstructionTab` では `file.path` のみ渡していた。  
その結果、ダイアログ側が誤ったパスで `getFileContentAsText(file.path)` を呼び出してS3アクセスに失敗していた。

---

## 3. 修正方針

`ProgressCheckTable` と同パターンに統一する。

| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| MAIMLコンテンツ取得 | フロントでパスを自前組み立て | `getProjectMaiml(projectId)` 呼び出し（バックエンドが `project_uuid → file_metadata → file_key` で解決） |
| `handleOpenPetriNetViewer` | 同期関数 | async 化 |
| `file.path` | 不正なパス（`projects/` 欠落） | APIレスポンスの `projectName` から正規パスを組み立て（フォールバック用） |
| `fileContent` prop | 渡さない | API取得済み `maimlContent` を渡す |
| ローディング表示 | なし | `petriNetViewerLoading` state でボタンを loading 表示 |

---

## 4. 実装ステップ

- [x] **import 変更**
  - `ProjectFile`（`@/types/file`）を削除
  - `FileData`（`@/types/editor`）を追加
  - `getProjectMaiml`（`@/services/projectApiService`）を追加

- [x] **`viewerDialogs` state 型変更**
  - `file: ProjectFile` → `file: FileData`
  - `fileContent: string | null` フィールドを追加

- [x] **`petriNetViewerLoading` state 追加**
  - `useState(false)` で追加

- [x] **`handleOpenPetriNetViewer` 書き換え**
  - 同期 → async 化
  - `getProjectMaiml(projectId)` を呼び出す
  - 取得した `maimlContent`・`resolvedName`・`lastModified` で `FileData` を構築
  - `fileContent: maimlContent` を state に格納
  - エラーハンドリング追加（try/catch/finally）

- [x] **ビューアボタンに `loading` prop 追加**
  - `loading={petriNetViewerLoading}`

- [x] **`ViewRendererDialog` に `fileContent` prop 追加**
  - `fileContent={dialog.fileContent}` を渡す

---

## 5. 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/project/ExperimentInstructionTab.tsx` | 上記すべての修正（1ファイルのみ） |

---

## 6. 影響範囲

| 影響箇所 | 内容 |
|---------|------|
| `ExperimentInstructionTab` のビューアボタン | 動作が正常化する |
| 他コンポーネント | 変更なし |
| バックエンド | 変更なし（既存の `GET /projects/:projectId/maiml` エンドポイントを利用するだけ） |
| 認証・認可 | 影響なし |
| マルチテナント分離 | 影響なし（`getProjectMaiml` は認証情報から organization_id を自動取得） |

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `getProjectMaiml` がネットワークエラーで失敗 | 低 | 低 | try/catch で `message.error` 表示 |
| `project_uuid` 未設定プロジェクトで `maimlContent` が取れない | 低 | 低 | バックエンドが `project_name` でフォールバックするため問題なし |

---

## 8. テスト計画

### 手動テスト

- [ ] MAIMLファイル名がプロジェクト名と**一致する**プロジェクトでビューアボタンが正常に開くこと
- [ ] MAIMLファイル名がプロジェクト名と**一致しない**プロジェクトでビューアボタンが正常に開くこと
- [ ] ボタン押下中にローディング表示が出ること
- [ ] エラー時（MAIMLなし等）にエラーメッセージが表示されること
- [ ] ビューアダイアログが正常にペトリネットを描画すること

---

## 9. 関連ドキュメント

- `.clinerules/references/s3_structure.md` — S3ファイルパス設計
- `frontend/src/components/ExperimentWorker/ProgressCheckTable.tsx` — 正常動作している参照実装
- `frontend/src/services/projectApiService.ts` — `getProjectMaiml` 定義
- `backend/src/services/projectService.ts` — `getProjectMaiml` サービス層（`project_uuid → file_metadata → file_key` 解決ロジック）

---

## 10. 承認記録

- **計画書提示日時**: 2026-08-19
- **承認日時**: 2026-08-19（act モードで作業指示を受け実施）
- **承認者コメント**: ビューアボタンが正常に機能していないので修正するよう指示

---

## 11. 実施記録

### 実施日時

- 開始: 2026-08-19
- 完了: 2026-08-19

### 計画からの変更点

なし。計画どおりに実施。

### 発生した問題と解決方法

なし。

### 最終的な成果物

- [x] `import` 変更（`ProjectFile` → `FileData`、`getProjectMaiml` 追加）
- [x] `viewerDialogs` state 型に `fileContent: string | null` 追加
- [x] `petriNetViewerLoading` state 追加
- [x] `handleOpenPetriNetViewer` を async 化し `getProjectMaiml(projectId)` 呼び出しに変更
- [x] ビューアボタンに `loading={petriNetViewerLoading}` 追加
- [x] `ViewRendererDialog` に `fileContent={dialog.fileContent}` 追加
- [x] TypeScript 型チェック（`tsc --noEmit`）エラーなし確認済み

---

## 12. 振り返り

### うまくいった点

- 他コンポーネント（`ProgressCheckTable`・`InstructionConfirmationTab`）の正常動作実装を参照することで、正しい修正パターンをすぐに特定できた。

### 改善が必要な点

- 当初の実装が `ProgressCheckTable` と異なるパターンで作られていた点。ビューアを新規実装する際は既存の参照実装に揃えるべきだった。

### 学んだこと

- プロジェクト名とMAIMLファイル名は一致を保証されないため、フロントエンドでS3パスを直接組み立ててはいけない。必ず `getProjectMaiml(projectId)` 経由でバックエンドにファイル解決を委ねること。
