# 対応結果: SaveConfirmDialog修正と古いAPIエンドポイント調査

- **日時**: 2026-04-23
- **タスクID**: 20260423_1056_SaveConfirmDialog修正と古いAPIエンドポイント調査

---

## 1. 対応概要

以下の2点を実施した。

1. `SaveConfirmDialog.tsx` のフォルダパス入力項目削除と多言語対応
2. 旧APIエンドポイント（`/api/s3/folders`）の調査

---

## 2. 修正内容

### 2-1. フォルダパス入力項目の削除（SaveConfirmDialog.tsx）

**背景**

保存先フォルダをユーザーが自由入力できるUIが存在していたが、現行仕様ではプロジェクト配下への保存先が固定されているため不要。

**削除したもの（旧実装）**

| 削除対象 | 内容 |
|---|---|
| state変数 | `s3FolderPath`, `s3SubFolders`, `selectedS3Folder`, `isLoadingFolders`, `folderError`, `useCustomPath`, `customPathValue` |
| useEffect | S3フォルダ一覧取得処理（`fetchS3Folders` 呼び出し）、`saveDestination` 変更時のフォルダリセット |
| 関数 | `fetchS3Folders()`, `handleFolderSelect()`, `handleCustomPathChange()`, `getEffectivePath()` |
| UI | フォルダ選択 Select/Input/TreeSelect などを含む「保存先フォルダ」入力ブロック全体 |
| import | `TreeSelect`, `Input`, `Spin`, `Select` など不要になったコンポーネント |

**追加したもの（新実装）**

- S3保存先選択時に `sourceFolder` props の値を読み取り専用 Alert で表示
- `handleChoice()` の保存先パスを `sourceFolder` で固定

**変更後の props インターフェース（変更なし）**

```typescript
interface SaveConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  validationResult?: ValidationResult | null;
  onSave: (
    action: 'save' | 'auto-correct' | 'force-save' | 'cancel',
    destination: string,
    folder?: string,
  ) => void;
  sourceFolder?: string;  // ← この値を読み取り専用で表示
}
```

---

### 2-2. 多言語対応の追加

**背景**

旧実装ではUI文字列がハードコードされており、多言語対応が未実施だった。

**対応内容**

- `useLanguage` フックを導入し、全表示文字列を `t('saveConfirmDialog.*')` に置換
- `frontend/src/locales/ja.json` / `en.json` に `saveConfirmDialog` セクション（27キー）を追加

**追加した翻訳キー一覧**

| キー | ja | en |
|---|---|---|
| titleError | バリデーションエラー検出 | Validation Errors Detected |
| titleSave | MaiML保存 | Save MaiML |
| validationSummary | バリデーション結果 | Validation Result |
| errorCount | ❌ エラー: | ❌ Errors: |
| warningCount | ⚠️ 警告: | ⚠️ Warnings: |
| correctionCount | 🔧 自動補正可能: | 🔧 Auto-correctable: |
| unit | 件 | （空文字） |
| errorDetailLabel | エラー詳細 (上位3件) | Error Details (top 3) |
| errorDetailMore | ... 他 {{count}} 件のエラー | ... {{count}} more error(s) |
| errorDetailNone | エラー詳細なし | No error details |
| validationErrorFallback | バリデーションエラー | Validation Error |
| destinationLabel | 保存先を選択 | Select Destination |
| destinationS3 | S3に保存 | Save to S3 |
| destinationDownload | ローカルダウンロード | Download Locally |
| destinationFolderLabel | 保存先フォルダ | Destination Folder |
| destinationFolderNone | （パス未指定） | (No path specified) |
| descriptionS3 | 💡 S3の指定フォルダにファイルを保存します | 💡 Saves the file to the specified S3 folder |
| descriptionDownload | 💡 ファイルをブラウザからダウンロードします | 💡 Downloads the file via browser |
| actionPromptError | 保存を続行するには、以下のいずれかを選択してください: | Choose one of the following to proceed: |
| actionPromptNormal | 保存先を選択して保存してください: | Select a destination and save: |
| autoCorrectButton | 🔧 自動補正して保存 (推奨) | 🔧 Auto-correct and Save (Recommended) |
| forceButton | ⚠️ エラーを無視して強制保存 | ⚠️ Force Save (Ignore Errors) |
| saveButton | 💾 保存 | 💾 Save |
| cancelButton | 閉じる | Close |
| destinationTagS3 | → S3 | → S3 |
| destinationTagDownload | → ダウンロード | → Download |
| hintMessage | ValidationPanelでエラー詳細を確認できます | Check error details in the ValidationPanel |

---

## 3. 旧APIエンドポイント調査結果

### 調査対象

旧実装の `fetchS3Folders()` が呼び出していたエンドポイント: `GET /api/s3/folders`

### 調査結果

`backend/reference/routes/s3/` に該当するルートファイルが存在していたことを確認。
処理内容は以下の通り。

| 項目 | 内容 |
|---|---|
| エンドポイント | `GET /api/s3/folders` |
| クエリパラメータ | `prefix`（対象フォルダのパスプレフィックス） |
| 処理 | AWS S3 `ListObjectsV2` を使用し、`/` 区切りのオブジェクトキーからフォルダ（CommonPrefixes）を抽出 |
| レスポンス | フォルダパスの配列（`folders: string[]`） |
| 認証 | リクエスト時のテナント情報から `organization_id` を取得し、`org_{organization_id}/` プレフィックスでフィルタ |

### 現行バックエンドとの差異

- 現行バックエンド（`backend/src/routes/`）には `/api/s3/folders` に相当するエンドポイントは**存在しない**
- フォルダ一覧機能が必要な場合は、`GET /api/v1/maiml/folders` などとして新規実装が必要

### 影響

- 今回のフォルダ入力UI削除により、未移行エンドポイントへの呼び出しが**完全に除去**された
- 機能的な退行なし（保存先パスは `sourceFolder` props で固定されるため）

---

## 4. 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `frontend/src/components/editorv2/components/SaveConfirmDialog.tsx` | 修正 | フォルダ入力UI削除、useLanguage導入、全文字列をt()に置換 |
| `frontend/src/locales/ja.json` | 修正 | `saveConfirmDialog` セクション（27キー）追加 |
| `frontend/src/locales/en.json` | 修正 | `saveConfirmDialog` セクション（27キー）追加 |

---

## 5. 申し送り事項

- `/api/s3/folders` に相当するエンドポイントが現行バックエンドに未実装
  - フォルダ選択UIを将来的に復活させる場合は、`storageService.ts` の `listFiles()` を使用したエンドポイントの新規実装が必要
- Ant Design v6 の `Alert` コンポーネントについて、表示文字列はすべて `message`（文字列）または `description`（ReactNode）に適切に振り分け済み
