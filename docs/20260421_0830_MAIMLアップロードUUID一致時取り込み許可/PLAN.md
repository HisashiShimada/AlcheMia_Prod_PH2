# タスク計画書: MAIMLアップロード時にUUID一致の場合取り込みを許可する改修

## メタデータ
- **作成日時**: 2026-04-21 08:30
- **タスクID**: maiml-upload-uuid-match
- **優先度**: 中
- **推定工数**: 2〜3時間

---

## 1. タスク概要

プロジェクトに既にMAIMLファイルが登録されている状態でMAIMLファイルをアップロードしようとすると、現在はアップロードがキャンセルされる。

**改修内容**: アップロードしようとするMAIMLファイルの `<maiml id="...">` のUUID（documentUuid）が、対象プロジェクトのDBに登録済みの `project_uuid` と一致している場合は「同一プロジェクトの最新ファイル更新」として扱い、アップロードを許可する。

> ⚠️ **バリデーションエラー（`MAIML_VALIDATION_ERROR`）によるキャンセルはそのまま維持する。今回の改修対象ではない。**

---

## 2. 現状の重複チェック箇所（2か所）

### ① 通常アップロード（小ファイル）— fileAccessService.ts

**場所**: `backend/src/services/fileAccessService.ts` 407〜416行

```typescript
// ② MAIMLファイル重複チェック
// プロジェクト直下に同名の .maiml ファイルが既に存在する場合はエラー
const existingMaimlPath = `${normalizedPath}/${sanitizedFileName}`;
const maimlExists = await this.storageService.fileExists(organizationId, existingMaimlPath);
if (maimlExists) {
  console.error(`❌ [Upload] MAIMLファイル重複: ${existingMaimlPath}`);
  throw new ValidationError(
    `プロジェクトにMAIMLファイルが既に存在します: ${sanitizedFileName}`
  );
}
```

- **判定基準**: ストレージ上に同名ファイルが存在するかどうか
- **特徴**: ファイルのバッファ（`file.buffer`）がこの時点で手元にあるため、**バックエンド側でUUIDを直接抽出できる**

さらに直後の **③ archiveフォルダ存在チェック**（420〜427行）も同様に拒否している：

```typescript
// ③ archiveフォルダ存在チェック
const archiveFolderPath = `projects/${projectName}/archive`;
const archiveFiles = await this.storageService.listFiles(organizationId, archiveFolderPath);
if (archiveFiles && archiveFiles.length > 0) {
  throw new ValidationError(`プロジェクトにarchiveフォルダが既に存在します`);
}
```

---

### ② チャンクアップロード（大ファイル）— fileAccessController.ts

**場所**: `backend/src/controllers/fileAccessController.ts` 752〜775行 (`initChunkUpload` 関数)

```typescript
// チェック1: 既存MAIMLプロジェクトへの上書き防止
if (isMaimlFile && isProjectPath && !isArchivePath) {
  const pathParts = filePath.split('/');
  if (pathParts.length >= 2) {
    const projectName = pathParts[1];
    const existingProject = await projectRepository.findByName(organizationId, projectName);
    if (existingProject?.project_maiml_flg) {
      // ← ここで全拒否（project_uuid との比較なし）
      res.status(400).json({
        error: { code: 'E7005', message: '既にMAIMLファイルが登録されています...' }
      });
      return;
    }
  }
}
```

- **判定基準**: DBの `project_maiml_flg` フラグ
- **特徴**: セッション初期化時点でファイルの中身はまだ届いていないため、**フロントエンドが事前にUUIDを抽出して送信する**必要がある

---

## 3. 目的と期待される成果

### 目的
通常アップロード・チャンクアップロードの両方で「同一プロジェクトのMAIMLファイル更新（UUID一致）」を許可する。

### 期待される成果
- [ ] **通常アップロード**: MAIMLのUUIDがプロジェクトの `project_uuid` と一致する場合はアップロードが許可される
- [ ] **チャンクアップロード**: MAIMLのUUIDがプロジェクトの `project_uuid` と一致する場合はアップロードが許可される
- [ ] UUID不一致の場合は従来通りキャンセルされる
- [ ] `project_uuid` が未設定（null）のプロジェクトは UUID一致とみなさない（従来通りキャンセル）

---

## 4. 実装ステップ

### Phase 1: バックエンド — fileAccessService.ts の重複チェック改修（通常アップロード）

**対象**: `backend/src/services/fileAccessService.ts` 407〜427行

`file.buffer` が手元にあるため、バックエンド側でUUIDを直接抽出して `project_uuid` と比較する。

**変更前（現状）**:
```typescript
// ② MAIMLファイル重複チェック
const existingMaimlPath = `${normalizedPath}/${sanitizedFileName}`;
const maimlExists = await this.storageService.fileExists(organizationId, existingMaimlPath);
if (maimlExists) {
  throw new ValidationError(
    `プロジェクトにMAIMLファイルが既に存在します: ${sanitizedFileName}`
  );
}

// ③ archiveフォルダ存在チェック
const archiveFolderPath = `projects/${projectName}/archive`;
const archiveFiles = await this.storageService.listFiles(organizationId, archiveFolderPath);
if (archiveFiles && archiveFiles.length > 0) {
  throw new ValidationError(`プロジェクトにarchiveフォルダが既に存在します`);
}
```

**変更後（案）**:
```typescript
// ② MAIMLファイル重複チェック
const existingMaimlPath = `${normalizedPath}/${sanitizedFileName}`;
const maimlExists = await this.storageService.fileExists(organizationId, existingMaimlPath);
if (maimlExists) {
  // ファイルが既に存在する場合、UUID一致チェックを行う
  const existingProject = await projectRepository.findByName(organizationId, projectName);
  const projectUuid = existingProject?.project_uuid ?? null;

  // アップロードファイルのUUIDを MaimlParserTyped で抽出（既存パターンと同じ方式）
  let documentUuid: string | undefined;
  try {
    const maimlParser = new MaimlParserTyped(file.buffer.toString('utf-8'));
    const doc = maimlParser.getDocument();
    documentUuid = doc.uuid || undefined;
    console.log('🔍 [Upload] Document UUID 抽出成功（重複チェック用）:', documentUuid);
  } catch (parseError) {
    console.warn('⚠️ [Upload] UUID抽出失敗（重複チェック用）:', parseError);
  }

  if (documentUuid && projectUuid && documentUuid === projectUuid) {
    // UUID一致 → 同一プロジェクトのMAIML更新として許可
    console.log(`✅ [Upload] UUID一致のため上書き許可: projectName=${projectName}, uuid=${documentUuid}`);
  } else {
    // UUID不一致 または UUID未取得 → 従来通り拒否
    console.error(`❌ [Upload] MAIMLファイル重複: ${existingMaimlPath}`);
    throw new ValidationError(
      `プロジェクトにMAIMLファイルが既に存在します: ${sanitizedFileName}`
    );
  }
}

// ③ archiveフォルダ存在チェック（UUID一致で許可された場合はスキップ）
// ※上記のUUID一致分岐でthrowされなかった場合のみ到達
const archiveFolderPath = `projects/${projectName}/archive`;
const archiveFiles = await this.storageService.listFiles(organizationId, archiveFolderPath);
if (archiveFiles && archiveFiles.length > 0) {
  // UUID一致で許可されたケース（maimlExists=true かつ UUID一致）はarchiveチェックもスキップ
  if (!maimlExists) {
    throw new ValidationError(`プロジェクトにarchiveフォルダが既に存在します`);
  }
  // maimlExists=true かつここに到達している = UUID一致で許可済みのためarchiveチェックはスキップ
}
```

> **補足**: archiveフォルダの存在チェックは「新規登録時のみ」行うべきチェックであるため、UUID一致による更新時はスキップする。

---

### Phase 1.5: `createBackup` を共通ユーティリティとして抽出

**背景**: `maimlService.ts` に `createBackup` 関数（611〜681行）があるが、`private` 扱い（export なし）のため他のサービスから使えない。`export` するのではなく、共通ユーティリティとして **新規ファイルに抜き出す**。

**新規作成ファイル**: `backend/src/utils/maimlArchiveHelper.ts`

```typescript
/**
 * MAIMLアーカイブ処理ヘルパー
 *
 * 既存MAIMLファイルをarchiveフォルダに連番バックアップする処理を提供。
 * maimlService.ts / fileAccessService.ts から共通利用する。
 *
 * アーカイブ命名規則: {baseName}_v{n}.maiml（s3_structure.md 準拠）
 */
import { getStorageService } from '../services/storageService';

export async function createMaimlBackup(
  filePath: string,
  organizationId: string
): Promise<string | null> {
  const storageService = getStorageService();
  try {
    // 1. ファイル存在確認
    const exists = await storageService.fileExists(organizationId, filePath);
    if (!exists) return null;

    // 2. パス解析
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop(); // sample_project.maiml
    const dirPath = pathParts.join('/'); // projects/sample_project
    if (!fileName) return null;

    const baseName = fileName.replace('.maiml', '');
    const archivePath = `${dirPath}/archive`;

    // 3. archive内の既存バックアップから最大バージョン番号を取得
    let maxNumber = 0;
    try {
      const files = await storageService.listFiles(organizationId, archivePath);
      const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_v(\\d+)\\.maiml$`);
      files.forEach((file: any) => {
        const name = file.key.split('/').pop();
        if (name) {
          const match = name.match(pattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) maxNumber = num;
          }
        }
      });
    } catch {
      // archiveフォルダが存在しない場合は v1 から開始
    }

    // 4. バックアップファイル名生成・保存
    const backupFileName = `${baseName}_v${maxNumber + 1}.maiml`;
    const backupPath = `${archivePath}/${backupFileName}`;
    const buffer = await storageService.downloadFile(organizationId, filePath);
    await storageService.uploadFile(organizationId, backupPath, buffer, { uploadedBy: 'system' });

    console.log('📋 [maimlArchiveHelper] バックアップ作成:', backupPath);
    return backupPath;
  } catch (error) {
    console.warn('⚠️ [maimlArchiveHelper] バックアップ作成失敗:', error);
    return null;
  }
}
```

**maimlService.ts の変更**:
- 611〜681行の `createBackup` 関数の処理を `createMaimlBackup` に委譲し、本体を削除する
- `import { createMaimlBackup } from '../utils/maimlArchiveHelper'` を追加
- `createBackup` の呼び出し箇所（154〜164行）を `createMaimlBackup` に置き換える

**fileAccessService.ts の変更**:
- `import { createMaimlBackup } from '../utils/maimlArchiveHelper'` を追加
- UUID一致許可ブロック内でアップロード前に `createMaimlBackup` を呼び出す

```typescript
if (documentUuid && projectUuid && documentUuid === projectUuid) {
  // UUID一致 → 上書き前に既存MAIMLをarchiveにバックアップ
  console.log(`✅ [Upload] UUID一致のため上書き許可: projectName=${projectName}, uuid=${documentUuid}`);
  await createMaimlBackup(existingMaimlPath, organizationId);
  // バックアップ失敗はcreateMaimlBackup内で警告のみ（nullを返すだけでthrowしない）
}
```

---

### Phase 2: フロントエンド — チャンクアップロード開始前のUUID抽出

**対象**: `frontend/src/services/fileAccessService.ts`（チャンクアップロード セッション初期化呼び出し箇所）

チャンクアップロードのセッション初期化（`POST /api/v1/files/chunks/init`）前に、MAIMLファイルのUUIDを抽出してリクエストに含める。

フロントエンドにも `frontend/src/utils/maimlParserTyped.ts` があり `getDocument()` メソッドが利用可能。バックエンドと同一の方式でUUIDを抽出する。

```typescript
import { MaimlParserTyped } from '@/utils/maimlParserTyped';

// MAIMLファイルの Document UUID を抽出するヘルパー
// ※ バックエンドの MaimlParserTyped.getDocument().uuid と同等
async function extractMaimlUuid(file: File): Promise<string | null> {
  try {
    const content = await file.text();
    const maimlParser = new MaimlParserTyped(content);
    const doc = maimlParser.getDocument();
    return doc.uuid || null;
  } catch {
    return null;
  }
}
```

`initChunkUpload` の呼び出し時に `documentUuid` を body に追加する：

```typescript
// 変更前
const { uploadId } = await initChunkUploadSession({ fileName, totalChunks, filePath, batchId });

// 変更後
const documentUuid = fileName.endsWith('.maiml') ? await extractMaimlUuid(file) : null;
const { uploadId } = await initChunkUploadSession({
  fileName, totalChunks, filePath, batchId,
  ...(documentUuid ? { documentUuid } : {}),
});
```

---

### Phase 3: バックエンド — initChunkUpload のUUID一致チェック追加（チャンクアップロード）

**対象**: `backend/src/controllers/fileAccessController.ts` → `initChunkUpload` 関数（752〜775行）

**変更前（現状）**:
```typescript
if (existingProject?.project_maiml_flg) {
  // 全拒否
  res.status(400).json({ error: { code: 'E7005', message: '...' } });
  return;
}
```

**変更後（案）**:
```typescript
if (existingProject?.project_maiml_flg) {
  const documentUuid: string | undefined = req.body.documentUuid;
  const projectUuid = existingProject.project_uuid;

  if (documentUuid && projectUuid && documentUuid === projectUuid) {
    // UUID一致 → 同一プロジェクトのMAIML更新として許可
    console.log(`✅ [ChunkInit] UUID一致のため上書き許可: projectName=${projectName}, uuid=${documentUuid}`);
  } else {
    // UUID不一致 または UUID未送信 → 従来通り拒否
    console.error(`❌ [ChunkInit] 既存MAIMLプロジェクトへの上書き拒否: projectName=${projectName}`);
    res.status(400).json({
      success: false,
      error: {
        code: 'E7005',
        message: `このプロジェクトには既にMAIMLファイルが登録されています。上書きする場合はプロジェクトの更新機能を使用してください（プロジェクト名: ${projectName}）`,
      },
      meta: { timestamp: new Date().toISOString(), requestId },
    });
    return;
  }
}
```

---

### Phase 4: フロントエンド — UUID一致アップロード完了時の警告メッセージ表示

**対象**: `frontend/src/components/project/ProjectManagement.tsx` → `handleUploadComplete`（458行〜）

アップロードが完了したファイルが `.maiml` かつプロジェクトに既に `project_uuid` が設定されている場合（＝UUID一致による更新アップロード）に、`antd` の `message.warning` で注意メッセージを表示する。

**警告メッセージ内容**:
```
MAIMLファイルを更新しました。手作業で編集した場合は、「Parent」タグが正しく設定されていることを確認してください。
```

**変更箇所（handleUploadComplete 内）**:

```typescript
// アップロード完了ハンドラ（抜粋）
const handleUploadComplete = useCallback(
  async (result: { success: boolean; uploadedFiles?: ...; ... }) => {
    if (!result.success) return;

    // ... 既存のファイル一覧更新処理 ...

    // MAIMLファイルがアップロードされた場合はMAIMLもリロード
    const hasMaiml = result.uploadedFiles?.some(f => f.name.endsWith('.maiml'));
    if (hasMaiml) {
      // ... 既存のMAIMLリロード処理 ...

      // UUID一致による更新アップロードだった場合（プロジェクトに既にproject_uuidが設定済み）の警告
      const wasUpdate = currentProject?.project_uuid != null;
      if (wasUpdate) {
        message.warning(
          'MAIMLファイルを更新しました。手作業で編集した場合は、「Parent」タグが正しく設定されていることを確認してください。',
          8  // 8秒間表示
        );
      }
    }
  },
  [...]
);
```

> **判定方法**: フロントエンドは既にプロジェクト情報（`currentProject`）を保持しており、`project_uuid` が null でなければ「既存MAIMLあり → UUID一致更新」と判断できる。バックエンドからの追加情報は不要。

---

## 5. 影響範囲

### 新規作成するファイル
1. `backend/src/utils/maimlArchiveHelper.ts` — `createMaimlBackup` 共通ユーティリティ

### 変更するファイル
1. `backend/src/services/maimlService.ts` — `createBackup` の処理を `createMaimlBackup` に委譲（611〜681行）
2. `backend/src/services/fileAccessService.ts` — 通常アップロード時のMAIML重複チェックにUUID比較＋バックアップ処理を追加（407〜427行）
3. `frontend/src/services/fileAccessService.ts` — チャンクアップロード セッション初期化前にUUID抽出・送信
4. `backend/src/controllers/fileAccessController.ts` — `initChunkUpload` のproject_maiml_flgチェックにUUID比較を追加（752〜775行）
5. `frontend/src/components/project/ProjectManagement.tsx` — `handleUploadComplete` にMAIML更新時の警告メッセージを追加（458行〜）

### 影響を受ける機能
- 通常アップロード（小ファイル）でのMAIMLファイルアップロード
- チャンクアップロード（大ファイル）でのMAIMLファイルアップロード

---

## 6. 技術的詳細

### UUID抽出方法の違い
| アップロード種別 | UUID抽出場所 | 方法 |
|----------------|-------------|------|
| 通常アップロード | バックエンド（fileAccessService.ts） | `new MaimlParserTyped(content).getDocument().uuid` で抽出（既存パターンと同一） |
| チャンクアップロード | フロントエンド（セッション初期化前） | `new MaimlParserTyped(content).getDocument().uuid` で抽出し `documentUuid` として送信（`frontend/src/utils/maimlParserTyped.ts` を使用） |

> **備考**: フロントエンド・バックエンドともに `MaimlParserTyped.getDocument().uuid` で `<document>` 要素内の `<uuid>` 子要素を取得する。同一インターフェース。

### project_uuid が null のケース
- `project_uuid` が `null` のプロジェクトは UUID一致とみなさない → 従来通り拒否

### archiveフォルダチェックの扱い（通常アップロード）
- 新規登録時のみ行うべきチェックのため、UUID一致による更新時はスキップする
- ロジック: `maimlExists=true` かつ UUID一致でスキップ

### アーカイブ処理の共通化
- `maimlService.ts` の `createBackup` 処理を `backend/src/utils/maimlArchiveHelper.ts` の `createMaimlBackup` として抽出
- `maimlService.ts` は `createMaimlBackup` を呼び出す形に変更（既存動作は維持）
- `fileAccessService.ts` でも同じ `createMaimlBackup` を使用

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| フロントエンドでUUID抽出に失敗した場合 | 中 | 低 | UUID未送信として従来通り拒否 |
| `project_uuid` が null のプロジェクトで誤許可される | 高 | 低 | `projectUuid` が null の場合は明示的に拒否 |
| 別プロジェクトのMAIMLを誤って取り込む | 高 | 低 | UUID一致チェック + organizationId による検索で防止 |

---

## 8. テスト計画

### 手動テスト
- [ ] **通常アップロード**: UUID一致のMAIMLファイル → 許可＋完了時に警告メッセージが表示されることを確認
- [ ] **通常アップロード**: UUID一致でアップロード後、archiveに旧バージョンが `_v{n}.maiml` 形式で保存されていることを確認
- [ ] **通常アップロード**: UUID不一致のMAIMLファイル → 拒否されることを確認
- [ ] **チャンクアップロード**: UUID一致のMAIMLファイル → 許可されることを確認
- [ ] **チャンクアップロード**: UUID一致でアップロード後、archiveに旧バージョンが保存されていることを確認
- [ ] **チャンクアップロード**: UUID不一致のMAIMLファイル → 拒否されることを確認
- [ ] `project_uuid` が未設定のプロジェクトへのMAIMLアップロード → 従来通り拒否されることを確認
- [ ] UUID一致でアップロード後、MAIMLビューアで最新ファイルが反映されることを確認
- [ ] maimlService.ts 経由の既存バックアップ処理（エディタ保存時）が引き続き正常に動作することを確認
- [ ] MAIMLではないファイルをアップロードした場合に警告メッセージが表示されないことを確認
- [ ] 新規（project_uuid未設定）プロジェクトへのMAIMLアップロード時に警告メッセージが表示されないことを確認

---

## 9. 承認記録

- **計画書提示日時**: 2026-04-21 08:39
- **承認日時**: （承認時に記入）
- **承認者コメント**: （コメント）

---

## 付録: 処理フロー（改修後）

```
[通常アップロード (fileAccessService.ts)]

  ① ストレージに同名MAIMLファイルが存在するか確認
  ② [存在する場合]
      - file.buffer から MaimlParserTyped でUUIDを抽出
      - DB の project_uuid と比較
      - UUID一致 → createMaimlBackup で既存MAIMLをarchiveにバックアップ → アップロード許可（archiveフォルダチェックもスキップ）
      - UUID不一致 or UUID抽出失敗 → ValidationError

[チャンクアップロード (fileAccessController.ts)]

  フロントエンド:
    ① ファイルが .maiml の場合、File.text() でUUIDを事前抽出
    ② POST /api/v1/files/chunks/init に documentUuid を含めて送信

  バックエンド (initChunkUpload):
    ③ project_maiml_flg=true のプロジェクトか確認
    ④ [project_maiml_flg=true の場合]
        - リクエストの documentUuid と DB の project_uuid を比較
        - UUID一致 → アップロード許可（セッション発行）
        - UUID不一致 or UUID未送信 → 拒否（E7005）
```
