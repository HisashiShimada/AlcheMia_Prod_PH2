# タスク計画書: Document UUID 自動更新処理の実装

## メタデータ
- **作成日時**: 2026-05-18 13:07
- **更新日時**: 2026-05-18 13:19
- **タスクID**: document_uuid_auto_update
- **優先度**: 中
- **推定工数**: 3〜4時間
- **前提タスク**: project_uuid採番分離（完了済み前提）

---

## 1. タスク概要

MAIML規約では「ファイルの内容が変わった場合は `<Document>/<uuid>` 要素を更新する必要がある」。  
現状、`saveMaiML()` で編集保存するとき、Document UUID は更新されないまま保存されており規約違反の状態。  
本タスクでは **方式C（手動変更検知 + 自動更新 + フロントエンド通知）** で Document UUID の自動更新を実装する。

---

## 2. 目的と期待される成果

### 目的
- MAIML規約「内容変更時は Document UUID を更新する」に準拠する
- ユーザーが手動で UUID を変更した場合はその値を尊重する
- UUID が自動更新された場合はフロントエンドに通知し、表示と実態の乖離を防ぐ

### 期待される成果
- [ ] 編集保存時に内容差分がある場合、`<Document>/<uuid>` が新しい UUID に自動更新される
- [ ] ユーザーが UUID を手動変更した場合はその値が保存される（自動更新しない）
- [ ] 自動更新された場合はフロントエンドに通知メッセージが表示される
- [ ] フロントエンドの `documentData.uuid` がバックエンドで実際に保存された値と一致する
- [ ] アップロード時・初回保存時は既存 UUID をそのまま維持する

---

## 3. 方式の決定（方式C採用）

REPORTで検討済みの方式B を出発点として、以下の問題を解決するために方式Cに改良した。

### 方式Bの問題点（解決が必要だった）

| 問題 | 内容 |
|------|------|
| 問題1 | ユーザーが手動で UUID を変更すると、バックエンドが「内容差分あり」と判定して自動更新し、ユーザーの意図が無視される |
| 問題2 | バックエンドで UUID が自動更新されても、フロントエンドの `documentData.uuid` が古いまま残り、再読み込みするまで表示と実態がずれる |

### 方式C: 手動変更検知 + 自動更新 + フロントエンド通知

| 項目 | 内容 |
|------|------|
| 採用方式 | バックエンドで手動変更検知 → 未変更時のみ内容差分チェック → 自動更新時はレスポンスに通知 |
| フロントエンド変更 | 必要（レスポンス処理・通知メッセージ・state更新の追加） |
| 対象関数 | `backend/src/services/maimlService.ts` の `saveMaiML()` |
| 新規ファイル | `backend/src/utils/maimlDocumentUtils.ts` |

---

## 4. ケース別動作まとめ

| ケース | UUID 変化 | バックエンド動作 | フロントエンド通知 |
|--------|----------|----------------|-------------------|
| MAIMLアップロード時 | なし | `saveMaiML()` を呼ばない | なし |
| 初回保存（既存ファイルなし） | なし | そのまま保存 | なし |
| 内容変更なし | なし | そのまま保存 | なし |
| UUID手動変更あり（内容変更有無問わず） | あり（手動値） | ユーザーの値を尊重 | なし（ユーザー自身が変更したため不要） |
| UUID未変更かつ内容変更あり | **あり（自動更新）** | `uuidv4()` で新UUID採番 | ✅ 「Document UUID が自動更新されました」 |

---

## 5. 事前調査結果（コード確認済み）

### 5-1: `<Document>/<uuid>` の XML 構造確認

既存コード `maimlParentInjector.ts` / `maimlMetadataExtractor.ts` より確認済み：
- MAIML の uuid は **XML属性ではなく子要素** として定義
- 例: `<document id="..."><uuid>xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</uuid>...</document>`
- `MaimlParserTyped.getDocument().uuid` で確実に取得できている（`extractDocumentUuid()` が既に利用中）
- タグ名は **小文字 `<document>`**（REPORT の正規表現サンプルは大文字だったが実際は小文字）

### 5-2: アーカイブファイルの UUID 扱い

`saveMaiML()` の処理順（line 154-196 確認）：
1. まず `createMaimlBackup()` でアーカイブを作成（既存ファイルを退避）← ここで**旧UUID**が保存
2. 次に差分チェック・UUID更新を行い新しい content をアップロード

→ **アーカイブには更新前 UUID、本体ファイルには更新後 UUID が保存される（自然な動作）**

### 5-3: `extractDocumentUuid()` の扱い

現在 `saveMaiML()` では、content から Document UUID を抽出して `project.project_uuid` を DB 同期している。  
Document UUID 更新後は、**更新後の UUID を使って DB 同期する**必要がある。

---

## 6. 実装ステップ

### Phase 1: ユーティリティ作成（バックエンド）

- [ ] `backend/src/utils/maimlDocumentUtils.ts` を新規作成
  - `updateDocumentUuid(content: string): string`
    - `<document>` 直下の `<uuid>...</uuid>` を新しい `uuidv4()` で置換して返す
  - `normalizeForDiffCheck(content: string): string`
    - `<document>` 直下の `<uuid>` 値を固定プレースホルダーに置換して返す（差分比較用）

### Phase 2: レスポンス型の拡張（バックエンド）

- [ ] `backend/src/types/maimlEditor.ts` の `maimlSaveResult` 型に以下を追加
  - `documentUuid?: string` — 保存後の Document UUID
  - `uuidChanged?: boolean` — UUID が変わったか（自動更新フラグ）

### Phase 3: `saveMaiML()` の修正（バックエンド）

- [ ] `backend/src/services/maimlService.ts` の `saveMaiML()` を修正
  - アーカイブ作成の**後**、アップロードの**前**に以下を追加：
    1. ストレージから既存 MAIML を取得（`storageService.downloadFile()`）
    2. 既存 UUID と新しい UUID を比較して手動変更の有無を確認
    3. **UUID が手動変更されていれば**: 自動更新をスキップ、content そのまま保存
    4. **UUID が変わっていなければ**: `normalizeForDiffCheck()` で内容差分チェック
       - 差分あり → `updateDocumentUuid()` で新UUID採番し `uuidWasAutoUpdated = true`
       - 差分なし → content そのまま保存
  - `extractDocumentUuid()` は **更新後の contentToSave** から呼び出すように変更
  - レスポンスに `documentUuid`, `uuidChanged` を追加

### Phase 4: フロントエンド型の拡張

- [ ] `frontend/src/types/storage.ts` の `SaveMaimlResponse` 型（または `maimlApiService.ts` の型）に以下を追加
  - `documentUuid?: string`
  - `uuidChanged?: boolean`

### Phase 5: フロントエンドのレスポンス処理修正

- [ ] `frontend/src/components/editorv2/PetriNetEditorInner.tsx` の `handleSaveConfirmAction()` を修正
  - `maimlService.saveMaiml()` のレスポンスから `documentUuid`, `uuidChanged` を取得
  - `uuidChanged === true` の場合:
    - `setDocumentData(prev => prev ? { ...prev, uuid: response.documentUuid } : prev)` で state 更新
    - `message.info('Document UUID が自動更新されました')` で通知
  - `uuidChanged === false` の場合: 何もしない

### Phase 6: テスト

- [ ] ユニットテスト `backend/tests/utils/maimlDocumentUtils.test.ts` を作成
- [ ] 手動テスト: 開発環境で各ケースの動作確認

---

## 7. 変更ファイル一覧（全5ファイル）

### 新規作成（バックエンド）
| ファイル | 内容 |
|---------|------|
| `backend/src/utils/maimlDocumentUtils.ts` | Document UUID 更新・差分正規化ユーティリティ |
| `backend/tests/utils/maimlDocumentUtils.test.ts` | 上記のユニットテスト |

### 変更（バックエンド）
| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/maimlService.ts` | `saveMaiML()` に手動変更検知・差分チェック・UUID自動更新・レスポンス拡張 |
| `backend/src/types/maimlEditor.ts` | `maimlSaveResult` に `documentUuid`, `uuidChanged` を追加 |

### 変更（フロントエンド）
| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/types/storage.ts` | `SaveMaimlResponse` 型に `documentUuid`, `uuidChanged` を追加（該当する型がある場合） |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | `handleSaveConfirmAction()` にレスポンス処理・通知・state更新を追加 |

---

## 8. 実装詳細（コードイメージ）

### `maimlDocumentUtils.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';

// <document> 直下の <uuid> にマッチ（タグ名は小文字）
const DOCUMENT_UUID_PATTERN = /(<document[^>]*>[\s\S]*?<uuid>)[^<]*(<\/uuid>)/;

/**
 * MAIML XML 文字列の <document> 直下 <uuid> を新しい uuidv4() で置換する
 */
export function updateDocumentUuid(content: string): string {
  return content.replace(DOCUMENT_UUID_PATTERN, `$1${uuidv4()}$2`);
}

/**
 * MAIML XML 文字列の <document> 直下 <uuid> の値を固定文字列に置換する（差分比較用）
 */
export function normalizeForDiffCheck(content: string): string {
  return content.replace(DOCUMENT_UUID_PATTERN, '$1__UUID_PLACEHOLDER__$2');
}
```

### `saveMaiML()` 修正箇所（アーカイブ後・アップロード前に挿入）

```typescript
// ① 既存ファイルを取得して手動変更検知 + 差分チェック
let contentToSave = content;
let uuidWasAutoUpdated = false;

const relativeFileKey = normalizedFileKey.startsWith(organizationId + '/')
  ? normalizedFileKey.slice(organizationId.length + 1)
  : normalizedFileKey;

try {
  const existingBuffer = await storageService.downloadFile(organizationId, relativeFileKey);
  const existingContent = existingBuffer.toString('utf-8');

  const existingUuid = extractDocumentUuid(existingContent);
  const newUuid      = extractDocumentUuid(content);

  if (existingUuid !== newUuid) {
    // UUID が変更されている → ユーザーが手動変更した
    // → 自動更新をスキップし、ユーザーの値を尊重
    console.log('ℹ️ [MAIML Save] Document UUID が手動変更されています → 自動更新スキップ');
  } else {
    // UUID は変わっていない → 内容差分チェック
    const existingNormalized = normalizeForDiffCheck(existingContent);
    const newNormalized      = normalizeForDiffCheck(content);

    if (existingNormalized !== newNormalized) {
      // 差分あり → Document UUID を自動更新
      contentToSave = updateDocumentUuid(content);
      uuidWasAutoUpdated = true;
      console.log('🔄 [MAIML Save] 内容変更あり → Document UUID を自動更新');
    } else {
      console.log('ℹ️ [MAIML Save] 内容変更なし → Document UUID を維持');
    }
  }
} catch {
  // 既存ファイルなし（初回保存）→ そのまま保存
  console.log('ℹ️ [MAIML Save] 既存ファイルなし → Document UUID を維持（初回保存）');
}

// ② 以降は contentToSave を使用（Document UUID が更新済みの場合あり）
const documentUuid = extractDocumentUuid(contentToSave); // ← content → contentToSave に変更
```

### `saveMaiML()` レスポンス拡張

```typescript
return {
  fileKey: normalizedFileKey,
  size: Buffer.byteLength(contentToSave, 'utf-8'),
  lastModified: new Date().toISOString(),
  contentHash,
  documentUuid: documentUuid ?? undefined,
  uuidChanged: uuidWasAutoUpdated,
};
```

### `PetriNetEditorInner.tsx` の保存後処理

```typescript
const response = await maimlService.saveMaiml(fileKey, base64Data, archive);

// Document UUID が自動更新された場合、state を更新して通知
if (response.uuidChanged && response.documentUuid) {
  setDocumentData(prev => prev ? { ...prev, uuid: response.documentUuid! } : prev);
  message.info(t('document.uuidAutoUpdated'));
  console.log('🔄 [handleSaveConfirmAction] Document UUID が自動更新されました:', response.documentUuid);
}
```

---

## 9. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 正規表現が `<document>` タグを正しくマッチしない | 高 | 低 | ユニットテストで複数パターンを検証 |
| `downloadFile()` が失敗して差分チェックがスキップされる | 中 | 低 | try-catch でスキップ、既存動作を維持 |
| `extractDocumentUuid()` が null を返す場合の UUID比較 | 中 | 低 | `existingUuid !== newUuid` は null !== null = false で自動更新に進む（問題なし） |
| `SaveMaimlResponse` 型が見つからない場合 | 低 | 低 | 実装前に `maimlApiService.ts` の型を確認してから修正 |

---

## 10. テスト計画

### ユニットテスト（自動）: `backend/tests/utils/maimlDocumentUtils.test.ts`

- [ ] `updateDocumentUuid()`: `<document>` 直下 `<uuid>` が新しい UUID に変わること
- [ ] `updateDocumentUuid()`: 変換後も有効な UUID 形式（uuidv4）になること
- [ ] `normalizeForDiffCheck()`: `<uuid>` が `__UUID_PLACEHOLDER__` に置換されること
- [ ] `normalizeForDiffCheck()`: `<document>` 以外の `<uuid>`（protocol/method等）は変わらないこと

### 手動テスト

- [ ] **ケース①**: 内容を編集して保存 → Document UUID が変わること・フロントエンドに通知が出ること
- [ ] **ケース②**: 何も変更せずに保存 → Document UUID が変わらないこと
- [ ] **ケース③**: UUID を手動変更して保存 → ユーザーの UUID が保存されること（自動更新されないこと）
- [ ] **ケース④**: `project.project_uuid` が保存後の UUID と一致していることを DB で確認

---

## 11. 承認記録

- **計画書提示日時**: 2026-05-18 13:19（更新版）
- **承認日時**: （承認時に記入）
- **承認者コメント**: （承認時に記入）

---

## 12. 実施記録

### 実施日時
開始: （作業開始時に記入）  
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に記入）

### 最終的な成果物
- [ ] `backend/src/utils/maimlDocumentUtils.ts` 作成
- [ ] `backend/tests/utils/maimlDocumentUtils.test.ts` 作成
- [ ] `backend/src/types/maimlEditor.ts` 修正
- [ ] `backend/src/services/maimlService.ts` 修正
- [ ] `frontend/src/types/storage.ts`（または対応型ファイル）修正
- [ ] `frontend/src/components/editorv2/PetriNetEditorInner.tsx` 修正

---

## 13. 更新履歴

| 日時 | 内容 |
|------|------|
| 2026-05-18 13:07 | 初版作成（方式B採用） |
| 2026-05-18 13:19 | 方式C（手動変更検知＋通知）に改訂。フロントエンド修正を追加 |
