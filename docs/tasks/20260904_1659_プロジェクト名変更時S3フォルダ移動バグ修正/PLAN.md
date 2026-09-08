# タスク計画書: プロジェクト名変更時 S3 フォルダ移動バグ修正

## メタデータ

- **作成日時**: 2026-09-04 16:59
- **タスクID**: 20260904_1659_プロジェクト名変更時S3フォルダ移動バグ修正
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## 1. タスク概要

プロジェクト管理画面からプロジェクト名を変更した際、DB 上のプロジェクト名は新名称に更新されるが、
ファイルサーバ（S3/Swift）上のフォルダは旧プロジェクト名のまま移動されていない。
その結果、名前変更後にファイル（MAIMLファイルなど）が見つからなくなる。

**原因**: `backend/src/services/renameService.ts` の S3 物理移動処理において、
`storageService.listFiles()` が返すファイルキーの形式（フルキー）を誤って解釈しているバグ。

---

## 2. 根本原因の詳細分析

### 問題のある処理フロー

```
1. storageService.listFiles(organizationId, "projects/old_name") を呼び出す
2. listFiles は S3 ListObjectsV2Command の結果を返す
   → item.Key をそのまま返す
   → 返るキーの形式: "{organizationId}/projects/old_name/file.maiml"
3. renameService.ts では file.key を「organizationId なしの相対パス」と誤認
4. ^projects/old_name/ の正規表現で replace しようとする
5. 実際のキーは "{organizationId}/projects/old_name/..." なのでマッチしない
6. oldKey === newKey → すべてのファイルがスキップされる
7. S3 のフォルダ移動が一切行われない
```

### コード上の問題箇所

**`backend/src/services/renameService.ts` 96〜116行目**

```typescript
for (const file of files) {
  const oldKey = file.key; // ← コメント「organizationId なしの相対パス」は誤り
                            //   実際: "{organizationId}/projects/old_name/file.maiml"

  const newKey = oldKey.replace(
    new RegExp(`^projects/${escapeRegExp(oldProjectName)}/`), // ← マッチしない！
    `projects/${newProjectName}/`
  );

  if (oldKey === newKey) {
    // ↑ 常に true になりすべてのファイルがここでスキップされる
    console.warn(`⚠️ [RenameService] コピー元と先が同じためスキップ: ${oldKey}`);
    continue;
  }
  // ← ここに到達しないため copyFile / deleteFile が一切実行されない
}
```

### 正しいキーの形式

- `storageService.listFiles()` の戻り値（`FileMetadata[]`）の `key` フィールド
  → `ListObjectsV2Command` の `item.Key` をそのまま返す（355行目）
  → 形式: `"{organizationId}/projects/{projectName}/{fileName}"`（フルキー）

- `storageService.copyFile(organizationId, sourceFilePath, destinationFilePath)` の引数
  → `buildKey(organizationId, filePath)` で `{organizationId}/{filePath}` に変換される
  → すでに organizationId プレフィックスが付いている場合は二重付与を防ぐ（165行目）
  → `sourceFilePath` は相対パス（`projects/...`）でも、フルキー（`organizationId/projects/...`）でも OK

### 正しい修正パターン（`storageService.ts` の `deleteFolderRecursive` 参照）

```typescript
// storageService.ts 613〜616行目 に同様の実装がある
let relativePath = file.key;
if (file.key.startsWith(`${organizationId}/`)) {
  relativePath = file.key.substring(organizationId.length + 1);
}
// → relativePath = "projects/old_name/file.maiml"（相対パス）
```

---

## 3. 影響範囲

### S3 フォルダ移動（コピー→削除）の実態

| 処理ステップ | 現状 | 修正後 |
|-------------|------|--------|
| S3 フォルダ移動（コピー） | ❌ 全ファイルスキップ（実行されない） | ✅ 正常に実行 |
| S3 フォルダ移動（旧フォルダ削除） | ❌ 全ファイルスキップ（実行されない） | ✅ 正常に実行 |
| `project.project_name` 更新 | ✅ 正常 | ✅ 変わらず正常 |
| `file_metadata.file_key` 一括更新 | ✅ SQL は実行されるが S3 パスと乖離 | ✅ S3 と整合 |
| `maiml_publish_job.project_name` 更新 | ✅ 正常 | ✅ 変わらず正常 |
| `maiml_asset.file_uri` 更新 | ✅ 正常 | ✅ 変わらず正常 |
| `transition_set.project_name` 更新 | ✅ 正常 | ✅ 変わらず正常 |

### 影響するユーザー操作

- プロジェクト名変更後のファイル閲覧・編集が一切できない状態
- 具体的には `projects/{new_name}/{new_name}.maiml` を取得しようとして「File not found」エラー

---

## 4. 修正内容

### 変更ファイル

**1ファイルのみ変更**

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/src/services/renameService.ts` | S3 移動ループ内で `file.key` から `organizationId/` プレフィックスを除去してから replace 処理を行うよう修正 |

### 修正詳細

**`backend/src/services/renameService.ts`**

修正前（96〜116行目）：
```typescript
// 6. 各ファイルを新パスへコピー → 削除
const renamedFiles: Array<{ oldKey: string; newKey: string }> = [];
for (const file of files) {
  const oldKey = file.key; // organizationId なしの相対パス
  const newKey = oldKey.replace(
    new RegExp(`^projects/${escapeRegExp(oldProjectName)}/`),
    `projects/${newProjectName}/`
  );
  // 同じキーへのコピーは S3 でエラーになるためスキップ
  if (oldKey === newKey) {
    console.warn(`⚠️ [RenameService] コピー元と先が同じためスキップ: ${oldKey}`);
    continue;
  }
  await storageService.copyFile(organizationId, oldKey, newKey);
  renamedFiles.push({ oldKey, newKey });
}
```

修正後：
```typescript
// 6. 各ファイルを新パスへコピー → 削除
// listFiles が返す file.key は S3 のフルキー（"{organizationId}/projects/..."）のため、
// organizationId プレフィックスを除去して相対パスに変換してから処理する
const renamedFiles: Array<{ oldKey: string; newKey: string }> = [];
for (const file of files) {
  // organizationId プレフィックスを除去（storageService.deleteFolderRecursive と同パターン）
  let oldKey = file.key;
  if (oldKey.startsWith(`${organizationId}/`)) {
    oldKey = oldKey.substring(organizationId.length + 1);
  }
  const newKey = oldKey.replace(
    new RegExp(`^projects/${escapeRegExp(oldProjectName)}/`),
    `projects/${newProjectName}/`
  );
  // 同じキーへのコピーは S3 でエラーになるためスキップ
  if (oldKey === newKey) {
    console.warn(`⚠️ [RenameService] コピー元と先が同じためスキップ: ${oldKey}`);
    continue;
  }
  await storageService.copyFile(organizationId, oldKey, newKey);
  renamedFiles.push({ oldKey, newKey });
}
```

---

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 修正により既存の正常動作が壊れる | 高 | 低 | 修正箇所は1つのみ、変数名変更なし。`buildKey` の二重付与防止ロジック（`startsWith` チェック）と同一パターンのため安全 |
| S3 移動中のエラーによりロールバック不可状態になる | 高 | 低 | 既存の設計通り（コピー完了後に削除）。修正前から同じ設計で変更なし |
| `copyFile` に渡すパスが変わることで S3 パスが二重付与される | 高 | 低 | `buildKey` は `organizationId/` で始まる場合は二重付与しないため問題なし |

---

## 6. テスト計画

### 手動テスト（修正後に実施）

- [ ] プロジェクト名変更後、ファイル一覧が新プロジェクト名配下で正しく表示されること
- [ ] プロジェクト名変更後、MAIMLファイルの閲覧・編集が正常に動作すること
- [ ] S3/Swift 上のフォルダが旧名称から新名称に移動されていること（直接確認）
- [ ] 旧プロジェクト名フォルダが S3/Swift 上に残っていないこと
- [ ] archive/ フォルダ内のアーカイブファイルも正しく移動されること

### 異常系テスト

- [ ] ファイルが 0 件の場合（空プロジェクト）でもエラーにならないこと
- [ ] 同名プロジェクトへの変更は `E7001` エラーになること
- [ ] 存在しないプロジェクト名への変更は `E6001` エラーになること

---

## 7. ロールバック計画

修正箇所は1行追加（プレフィックス除去）と変数の `const` → `let` 変更のみ。
問題発生時は Git で当該コミットを revert するだけで即時ロールバック可能。

---

## 8. 関連ドキュメント

- `backend/src/services/renameService.ts` - 修正対象
- `backend/src/services/storageService.ts` - `listFiles` / `buildKey` / `deleteFolderRecursive` の参照実装
- `docs/改善仕様調査/No.2/PLAN.md` - プロジェクト名変更機能の設計書
- `.clinerules/references/s3_structure.md` - S3 フォルダ構成定義

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-04 16:59
- **承認日時**: 2026-09-04 17:07
- **承認者コメント**: 承認

---

## 10. 実施記録

### 実施日時
開始: 2026-09-04 17:07
完了: 2026-09-04 17:08

### 変更内容

**`backend/src/services/renameService.ts`**（96〜111行目付近）

- `const oldKey = file.key;`（1行）→ organizationId プレフィックス除去ロジック（4行）に変更
  - `const` → `let` に変更
  - `if (oldKey.startsWith(...)) { oldKey = oldKey.substring(...); }` を追加
- コメントを修正（「organizationId なしの相対パス」→ フルキーであることを明記）

### 最終的な成果物

- [x] `backend/src/services/renameService.ts` - S3 フォルダ移動バグ修正
- [x] TypeScript コンパイルエラーなし（`tsc --noEmit` 確認済み）
