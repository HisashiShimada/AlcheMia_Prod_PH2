# タスク計画書: MAIMLアップロード時のUUID重複をエラーとして返す対応

## メタデータ
- **作成日時**: 2026-05-14 10:20
- **タスクID**: maiml-upload-uuid-duplicate-error
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## 1. タスク概要

MAIMLファイルをアップロードした際、そのMAIMLの `<document><uuid>` が **別のプロジェクトの `project_uuid`** に既に登録されている場合、現状は以下の問題が発生する。

### 現状の問題

1. ストレージへのファイルアップロードは成功する
2. その後、`project.project_uuid` を UPDATE しようとすると **ユニーク制約違反（`uk_project_project_uuid`）** が発生する
3. catch ブロックで「**警告ログのみ・処理続行**」（throw しない）
4. APIレスポンスは **「アップロード成功」** として返る ← ❌ 問題
5. 結果として：
   - ストレージにはファイルが保存されている（不要なファイルが残る）
   - `project.project_uuid` は NULL のまま
   - `project.project_maiml_flg` は false のまま
   - DB とストレージが不整合状態になる

### 対応方針

アップロード処理の**事前チェック**として、アップロードしようとするMAIMLのUUIDが
**他のプロジェクト（アップロード先以外）に既に登録されていないか**を確認し、
重複があれば明確なエラーメッセージを返してアップロードを拒否する。

ストレージへの書き込み前にチェックするため、ロールバック処理は不要。

---

## 2. 目的と期待される成果

### 目的
UUID重複時に「成功」を返す不整合な動作を修正し、ユーザーに分かりやすいエラーを返す。

### 期待される成果
- [ ] **通常アップロード**: 別プロジェクトに登録済みのUUIDを持つMAIMLをアップロードした場合、ストレージ書き込み前にエラーが返される
- [ ] **チャンクアップロード**: 同様に `initChunkUpload` の段階でエラーが返される
- [ ] エラーメッセージは「別のプロジェクトに同じUUIDのMAIMLが登録されています」等、ユーザーが原因を理解できる内容
- [ ] アップロード先プロジェクト自身との UUID 一致（更新アップロード）は引き続き許可される（既存仕様維持）

---

## 3. 現状の処理フロー（問題箇所）

### 通常アップロード（`fileAccessService.ts`）

```
① project_maiml_flg チェック
   ├─ true  → documentUuid vs project_uuid 比較（既存仕様）
   └─ false → チェックなし → ストレージ書き込み ✅
② ストレージ書き込み（成功）
③ project_maiml_flg / project_uuid を DB 更新
   → ユニーク制約違反発生
   → catch して警告ログのみ（throw しない） ← ❌ ここが問題
```

### チャンクアップロード（`fileAccessController.ts` `initChunkUpload`）

```
① project_maiml_flg チェック
   ├─ true  → documentUuid vs project_uuid 比較（既存仕様）
   └─ false → チェックなし → セッション発行 ✅
② チャンク受信・ストレージ書き込み（成功）
③ completeChunkUpload で project_uuid を DB 更新
   → ユニーク制約違反発生
   → catch して警告ログのみ ← ❌ ここが問題
```

---

## 4. 実装ステップ

### Phase 1: `projectRepository.ts` に UUID 重複チェック関数を追加

**対象ファイル**: `backend/src/repositories/projectRepository.ts`

UUID を指定して **別プロジェクト** に既に登録されていないか確認する関数を追加する。

```typescript
/**
 * project_uuid が他のプロジェクト（除外プロジェクト以外）に既に登録されているか確認
 * @param organizationId 組織ID
 * @param projectUuid 確認するUUID
 * @param excludeProjectName 除外するプロジェクト名（更新元プロジェクト自身）
 * @returns 重複しているプロジェクト名（null = 重複なし）
 */
export async function findProjectNameByUuid(
  organizationId: string,
  projectUuid: string,
  excludeProjectName?: string
): Promise<string | null>
```

**実装内容**:
- `project` テーブルで `organization_id = $1 AND project_uuid = $2` を検索
- `excludeProjectName` が指定されている場合は `AND project_name != $3` を追加
- 見つかった場合はそのプロジェクト名を返す（null = 重複なし）
- インライン SQL で実装（単純な1行クエリのため SQL ファイル不要）

---

### Phase 2: `fileAccessService.ts` の通常アップロード事前チェックに UUID 重複チェックを追加

**対象ファイル**: `backend/src/services/fileAccessService.ts`

**変更箇所**: 407〜467行の MAIML 重複チェックブロック

**変更内容**:  
`project_maiml_flg = false`（新規登録ケース）の場合も、アップロードファイルの UUID を事前抽出し、他プロジェクトへの重複を確認する。

**変更後のロジック**:

```
① project_maiml_flg チェック
   ├─ true  → 既存: documentUuid vs project_uuid 比較（変更なし）
   └─ false → 【追加】documentUuid を抽出して他プロジェクトに同UUID がないか確認
               ├─ UUID 未抽出 or 重複なし → アップロード続行
               └─ 他プロジェクトに重複あり → ValidationError でアップロード拒否
```

**追加コード（概要）**:

```typescript
// project_maiml_flg = false（新規登録）の場合も UUID 事前チェックを行う
if (!maimlRegistered) {
  // アップロードファイルの UUID を抽出
  let documentUuidForNewCheck: string | undefined;
  try {
    const maimlParser = new MaimlParserTyped(file.buffer.toString('utf-8'));
    const doc = maimlParser.getDocument();
    const uuid = doc?.uuid?.trim();
    if (uuid && uuid.length > 0) {
      documentUuidForNewCheck = uuid;
    }
  } catch (parseError) {
    console.warn('⚠️ [Upload] UUID抽出失敗（新規UUID重複チェック用）:', parseError);
  }

  // UUID が取得できた場合のみ重複チェック
  if (documentUuidForNewCheck) {
    const conflictProjectName = await projectRepository.findProjectNameByUuid(
      organizationId,
      documentUuidForNewCheck,
      projectName  // 自プロジェクトは除外（念のため）
    );
    if (conflictProjectName) {
      console.error(`❌ [Upload] UUID重複: uuid=${documentUuidForNewCheck} は既にプロジェクト「${conflictProjectName}」に登録済み`);
      throw new ValidationError(
        `このMAIMLファイルのUUID（${documentUuidForNewCheck}）は別のプロジェクト「${conflictProjectName}」に既に登録されています。`
      );
    }
  }
}
```

> **注意**: MAIMLバリデーション（`analyzeMaiMLFile`）により `document.uuid` が存在しない・UUID v3〜5 形式でない場合は
> `canBeIgnoredOnUpload=false` の fatalError として**アップロード前に必ず弾かれる**。
> そのため、UUID 抽出に失敗するケースは実質発生しない（バリデーションが先に動くため）。
> 万一 try-catch で UUID が取得できなかった場合のみ重複チェックをスキップする。

---

### Phase 3: `fileAccessController.ts` の `initChunkUpload` に UUID 重複チェックを追加

**対象ファイル**: `backend/src/controllers/fileAccessController.ts`

**変更箇所**: `initChunkUpload` 関数（793〜820行）の `project_maiml_flg = false` ケース

**変更内容**:  
`project_maiml_flg = false` の場合も `documentUuid`（フロントエンドから送信済み）を使って他プロジェクトへの重複チェックを行う。

チャンクアップロードでは既にフロントエンドが事前にUUIDを抽出して `req.body.documentUuid` で送信しているため、バックエンドでの再抽出は不要。

**変更後のロジック**:

```typescript
if (isMaimlFile && isProjectPath && !isArchivePath) {
  const pathParts = filePath.split('/');
  if (pathParts.length >= 2) {
    const projectName = pathParts[1];
    const existingProject = await projectRepository.findByName(organizationId, projectName);
    const documentUuid: string | undefined = req.body.documentUuid;

    if (existingProject?.project_maiml_flg) {
      // 既存仕様: アップロード先プロジェクトに MAIML 登録済み → UUID 一致チェック
      const projectUuid = existingProject.project_uuid;
      if (documentUuid && projectUuid && documentUuid === projectUuid) {
        console.log(`✅ [ChunkInit] UUID一致のため上書き許可`);
      } else {
        // 拒否（変更なし）
        res.status(400).json({ ... });
        return;
      }
    } else if (documentUuid) {
      // 【追加】新規登録ケース: 他プロジェクトへの UUID 重複チェック
      const conflictProjectName = await projectRepository.findProjectNameByUuid(
        organizationId,
        documentUuid,
        projectName
      );
      if (conflictProjectName) {
        console.error(`❌ [ChunkInit] UUID重複: uuid=${documentUuid} は既にプロジェクト「${conflictProjectName}」に登録済み`);
        res.status(400).json({
          success: false,
          error: {
            code: 'E7001',  // または新規エラーコード（後述）
            message: `このMAIMLファイルのUUID（${documentUuid}）は別のプロジェクト「${conflictProjectName}」に既に登録されています。`,
          },
          meta: { timestamp: new Date().toISOString(), requestId },
        });
        return;
      }
    }
  }
}
```

---

### Phase 4: DB 更新失敗 catch ブロックの修正（安全網の強化）

**対象ファイル**:
- `backend/src/services/fileAccessService.ts`（673〜678行）
- `backend/src/controllers/fileAccessController.ts`（ChunkComplete の catch ブロック）

**変更内容**:  
現状は `console.error` のみで `throw` していない。Phase 2・3 の事前チェックで基本的には防げるが、
万一 catch に到達した場合（並列アップロード競合等）はエラーログに `[CRITICAL]` を付与して
監視ツールで検知しやすくする。（**throw への変更は行わない** — ストレージ書き込みは成功しているため、
ユーザーへの「アップロード成功」通知を変えると混乱を招く）

> **設計方針**: catch でのロールバック（ストレージからの削除）は複雑度が増すため今回のスコープ外とする。
> Phase 2・3 の事前チェックで重複を防ぐことを主目的とする。

---

## 5. 影響範囲

### 変更するファイル

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/repositories/projectRepository.ts` | `findProjectNameByUuid()` 関数を追加 |
| `backend/src/services/fileAccessService.ts` | `project_maiml_flg=false` の新規登録ケースに UUID 事前重複チェックを追加（407〜466行付近） |
| `backend/src/controllers/fileAccessController.ts` | `initChunkUpload` に UUID 事前重複チェックを追加（793〜820行付近） |

### 新規作成するファイル
なし（SQL は inline で実装）

### 影響を受ける機能
- ProjectManagement での通常アップロード（10MB 以下）
- ProjectManagement でのチャンクアップロード（10MB 超）
- 既存の「同一プロジェクトへの MAIML 更新アップロード（UUID 一致）」は変更なし

---

## 6. エラーコードの選定

新規エラーコード **E7009** を追加する（`error_codes.md` の E7008 が現在の最大値）。

| コード | 説明 | HTTPステータス |
|---|---|---|
| E7009 | MAIML UUID重複（別プロジェクトに登録済み） | 409 |

### 追加が必要なファイル

| ファイル | 変更内容 |
|---|---|
| `backend/src/enums/errorCodes.ts` | `E7009` 定数追加、`ErrorCode` 型に追加 |
| `frontend/src/utils/errorCodes.ts` | `E7009` 定数追加、`ErrorCode` 型に追加 |
| `frontend/src/utils/errorMapper.ts` | `E7009` の日本語メッセージマッピングを追加 |
| `.clinerules/references/error_codes.md` | E7009 をエラーコード一覧表・エンドポイント対応表に追記 |

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| UUID 抽出失敗時にチェックがスキップされる（通常アップロード） | 中 | 低 | Phase 4 の catch ログ強化で検知可能。UUID 抽出失敗時はそもそもMAIMLとして不正 |
| フロントエンドが `documentUuid` を送信しない場合（チャンクアップロード） | 中 | 低 | `documentUuid` が未送信の場合は重複チェックをスキップ（既存の DB ユニーク制約が安全網として機能） |
| 競合（2ユーザーが同時に同UUIDを新規プロジェクトにアップロード） | 低 | 極低 | SELECT → INSERT の間に競合する可能性はあるが DB ユニーク制約で最終防衛 |
| `findProjectNameByUuid` の DB クエリ追加によるパフォーマンス影響 | 低 | 低 | `project_uuid` にはユニーク制約インデックスがあるため高速 |

---

## 8. テスト計画

### 手動テスト
- [ ] UUID が別プロジェクトに登録済みの MAIML を**通常アップロード**→ エラーメッセージが表示されアップロード失敗
- [ ] UUID が別プロジェクトに登録済みの MAIML を**チャンクアップロード**→ セッション初期化の段階でエラーが返される
- [ ] UUID が別プロジェクトに登録済みの MAIML をアップロード後、ストレージに余分なファイルが残っていないことを確認
- [ ] 同一プロジェクトへの UUID 一致更新アップロードが引き続き正常に動作すること
- [ ] UUID が未登録のプロジェクトへの新規アップロードが引き続き正常に動作すること
- [ ] MAIML ファイル以外のファイルアップロードに影響がないこと

---

## 9. 承認記録

- **計画書提示日時**: 2026-05-14 10:20
- **承認日時**: （承認時に記入）
- **承認者コメント**: （コメント）
