# タスク計画書: Insertion URI 正規化対応

## メタデータ
- **作成日時**: 2026-08-20 15:44
- **更新日時**: 2026-08-20 15:44
- **タスクID**: insertion-uri-normalization
- **優先度**: 中
- **推定工数**: 2〜3時間

---

## 1. タスク概要

`<insertion>` の `<uri>` 要素に記録される値を、常に有効な URI 形式で統一する。

### 背景・問題

現状の URI 値は以下のように非 URI 形式が混在している：

| 状況 | 現在の URI 値 | 問題 |
|------|-------------|------|
| ローカルファイル選択（D&D / ファイル選択ボタン） | `AB192026_C_2.tif`（ファイル名のみ） | スキームなし・URI 形式として不完全 |
| S3/Swift アップロード後 | `projects/sample_project/attachments/AB192026_C_2.tif`（相対パス） | スキームなし・URI 形式として不完全 |

XSD 仕様では `<uri>` は `xs:anyURI` 型であり、正規 URI 形式での記録が望ましい。

### ブラウザ制約の前提

Webブラウザの File API 仕様上、ローカルファイルのフルパスは取得不可能（セキュリティ制約）。  
ネットワークドライブ（`\\server\share\file.tif`）上のファイルを D&D しても `file.name`（ファイル名のみ）しか取得できない。

### 対応方針

- **ローカルファイル**: `file:///ファイル名` 形式に変換（ブラウザ制約のため）
- **アップロード後**: 環境変数で設定したスキームとバケット名を付与（`s3://バケット名/key` または `swift://コンテナ名/key`）
- **ガイダンス表示**: ローカルファイル（`file:///` 始まり）の場合、URI 欄の下に「他環境から参照不可・手動補完推奨」の旨を**常時**赤文字で表示する

---

## 2. 目的と期待される成果

### 目的
- `<insertion>` の `<uri>` 要素を XSD `xs:anyURI` 型の仕様に準拠した正規 URI 形式で記録する
- ストレージ種別（S3 / Swift）を環境変数で切り替えられる設計にする
- ローカルファイル選択時のユーザーへの意味的なガイダンスを提供する

### 期待される成果
- [ ] `frontend/src/utils/storageUriUtils.ts` を新規作成（URI 組み立てユーティリティ）
- [ ] `frontend/src/hooks/useInsertionEditor.ts` を修正
- [ ] `frontend/src/components/common/InsertionEditorForm.tsx` を修正（ガイダンス表示）
- [ ] `frontend/src/components/common/InsertionEditorCompact.tsx` を修正（ガイダンス表示）
- [ ] `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` を修正
- [ ] `frontend/src/locales/ja.json` を修正（ガイダンス i18n キー追加）
- [ ] `frontend/src/locales/en.json` を修正（同上・英語）
- [ ] `frontend/.env.local` を修正（新規環境変数追加）
- [ ] `.env.prod.aws.example` を修正（同上・AWS本番用）
- [ ] `.env.prod.onprem.example` を修正（同上・オンプレ用）

---

## 3. 実装ステップ

### Phase 1: `storageUriUtils.ts` 新規作成

- [ ] `frontend/src/utils/storageUriUtils.ts` を作成
  - 環境変数 `NEXT_PUBLIC_INSERTION_URI_SCHEME`（デフォルト: `s3`）
  - 環境変数 `NEXT_PUBLIC_INSERTION_URI_BUCKET`（デフォルト: 空文字）
  - `buildStorageUri(key: string): string` を実装
    - `BUCKET` が未設定の場合: `key` をそのまま返す（後方互換フォールバック）
    - `BUCKET` が設定済みの場合: `${SCHEME}://${BUCKET}/${key（先頭スラッシュ除去）}` を返す
  - `isLocalFileUri(uri: string): boolean` を実装
    - `file:///` で始まるかどうかを判定する

```typescript
// 組み立て例（SCHEME=s3, BUCKET=mmdpf-files-production）
buildStorageUri('projects/sample/attachments/AB192026_C_2.tif')
// → "s3://mmdpf-files-production/projects/sample/attachments/AB192026_C_2.tif"

// 組み立て例（SCHEME=swift, BUCKET=mmdpf-files）
buildStorageUri('projects/sample/attachments/AB192026_C_2.tif')
// → "swift://mmdpf-files/projects/sample/attachments/AB192026_C_2.tif"

// BUCKET が未設定の場合（後方互換）
buildStorageUri('projects/sample/attachments/AB192026_C_2.tif')
// → "projects/sample/attachments/AB192026_C_2.tif"
```

### Phase 2: `useInsertionEditor.ts` 修正

- [ ] ローカルファイル選択時の URI 変換（L142）
  ```typescript
  // Before
  uri: file.name,
  // After
  uri: 'file:///' + encodeURIComponent(file.name),
  ```

- [ ] アップロード成功時の URI 更新（L171）
  ```typescript
  // Before
  onChange({ ...nextInsertion, uri: uploaded.s3Key });
  // After
  onChange({ ...nextInsertion, uri: buildStorageUri(uploaded.s3Key) });
  ```

### Phase 3: `DataRecordDialog.tsx` 修正

- [ ] L1095: 非カスタム Insertion の URI 更新
  ```typescript
  // Before
  nonCustomInsertionUriMap[insIdx] = uploadedFile.s3Key;
  // After
  nonCustomInsertionUriMap[insIdx] = buildStorageUri(uploadedFile.s3Key);
  ```

- [ ] L1141: カスタム Insertion の URI 更新
  ```typescript
  // Before
  handleUpdateCustomProperty(template.templateId, cp.id, { uri: uploadedFile.s3Key, file: undefined });
  // After
  handleUpdateCustomProperty(template.templateId, cp.id, { uri: buildStorageUri(uploadedFile.s3Key), file: undefined });
  ```

### Phase 4: ガイダンス表示の追加

#### i18n キー追加（`ja.json` / `en.json`）

`insertionEditor` オブジェクト配下に以下を追加：

| キー | 日本語 | 英語 |
|------|--------|------|
| `localFileWarning` | `ローカルファイルのため他の環境からは参照できません。必要に応じて正確なパスを手動で補完してください。` | `This is a local file and cannot be accessed from other environments. Manually complete the path if needed.` |
| `localFileUriExampleTitle` | `記載形式の例:` | `URI format examples:` |
| `localFileUriExampleLocal` | `ローカル: file:///C:/data/ファイル名.tif` | `Local: file:///C:/data/filename.tif` |
| `localFileUriExampleNetwork` | `ネットワーク: file://///server/share/data/ファイル名.tif` | `Network: file://///server/share/data/filename.tif` |

#### `InsertionEditorForm.tsx` 修正

- [ ] `isLocalFileUri(insertion.uri)` が true の場合に URI `Form.Item` 直下にガイダンスを**常時**表示
  - 赤文字（`color: '#ff4d4f'`）、フォントサイズ 12px
  - ⚠️ 警告文 + 記載形式例（ローカル / ネットワーク）を表示
  - `readOnly` 時も表示する（参照者へのガイダンスとして有用）

#### `InsertionEditorCompact.tsx` 修正

- [ ] 同条件（`isLocalFileUri`）で URI `Input` 直下にガイダンスを**常時**表示
  - フォントサイズ 11px（コンパクトレイアウトに合わせる）

### Phase 5: 環境変数ファイルの更新

- [ ] `frontend/.env.local`
  ```
  # Insertion URI スキーム設定（s3 または swift）
  NEXT_PUBLIC_INSERTION_URI_SCHEME=s3
  # S3/Swift バケット名（MAIML の <insertion><uri> に付与）
  NEXT_PUBLIC_INSERTION_URI_BUCKET=mmdpf-files
  ```

- [ ] `.env.prod.aws.example`（AWS本番用）
  ```
  NEXT_PUBLIC_INSERTION_URI_SCHEME=s3
  NEXT_PUBLIC_INSERTION_URI_BUCKET=mmdpf-files-production
  ```

- [ ] `.env.prod.onprem.example`（オンプレ用）
  ```
  NEXT_PUBLIC_INSERTION_URI_SCHEME=swift
  NEXT_PUBLIC_INSERTION_URI_BUCKET=mmdpf-files
  ```

### Phase 6: TypeScript コンパイル確認

- [ ] `cd frontend && npx tsc --noEmit` で 0 エラーを確認

---

## 4. 変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `frontend/src/utils/storageUriUtils.ts` | URI 組み立てユーティリティ（`buildStorageUri` / `isLocalFileUri`） |

### 修正
| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/hooks/useInsertionEditor.ts` | ローカルファイル URI → `file:///` 変換、S3キー → `buildStorageUri` 変換 |
| `frontend/src/components/common/InsertionEditorForm.tsx` | `isLocalFileUri` 時のガイダンス常時表示追加 |
| `frontend/src/components/common/InsertionEditorCompact.tsx` | 同上（コンパクト版） |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | S3キー → `buildStorageUri` 変換（2箇所） |
| `frontend/src/locales/ja.json` | ガイダンス用 i18n キー追加（4キー） |
| `frontend/src/locales/en.json` | 同上（英語） |
| `frontend/.env.local` | `NEXT_PUBLIC_INSERTION_URI_SCHEME` / `NEXT_PUBLIC_INSERTION_URI_BUCKET` 追加 |
| `.env.prod.aws.example` | 同上（AWS本番用） |
| `.env.prod.onprem.example` | 同上（オンプレ用） |

---

## 5. 影響範囲の分析

### フロントエンド
- `useInsertionEditor` を使用するすべての Insertion 入力コンポーネントに影響
  - `InsertionEditorForm`（TemplateEditorDialog）
  - `InsertionEditorCompact`（WorkRecordPanel）
  - `TemplateInputPanel`（`insertionAdapter` 経由）
- `DataRecordDialog` の Insertion ファイルアップロード処理に影響

### バックエンド
- **影響なし**: URI 値はそのまま DB に格納・XML に出力されるため変換不要

### 既存データ
- **既存の XML/DB 内の URI**（スキームなし相対パス）は変更しない
- 今後ファイル選択・アップロードされる Insertion のみ新形式になる
- `NEXT_PUBLIC_INSERTION_URI_BUCKET` が未設定の場合は従来通りのキーを返す（後方互換フォールバック）

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存環境（`BUCKET` 未設定）での動作変化 | 中 | 低 | `BUCKET` 未設定時は従来通りキーを返すフォールバック実装 |
| `file.name` に特殊文字が含まれる場合の文字化け | 低 | 低 | `encodeURIComponent` でエスケープ |
| `DataRecordDialog` の `buildStorageUri` 組み込み漏れ | 中 | 低 | 修正箇所を明示（L1095 / L1141 の 2箇所）し `tsc --noEmit` で確認 |
| 画像プレビューが `file:///` URI で表示試行される | 低 | 低 | 既存の `isImageUri` 判定（`http` / `data:` / `/` 始まりのみ表示）により影響なし |

---

## 7. テスト計画

### 手動テスト

#### ローカルファイル選択
- [ ] `InsertionEditorForm` でファイルを選択 → URI 欄が `file:///ファイル名` 形式になること
- [ ] `InsertionEditorCompact` で D&D → 同上
- [ ] URI 欄の下にガイダンスが赤文字で常時表示されること（`file:///` 始まりの場合）
- [ ] アップロードキャンセル → URI は `file:///ファイル名` のまま維持され、ガイダンスが表示されること

#### S3/Swift アップロード後
- [ ] アップロード確認ダイアログで「アップロード」→ URI が `s3://バケット名/key` 形式に更新されること
- [ ] アップロード後はガイダンスが表示されないこと（`file:///` 始まりでなくなるため）
- [ ] `DataRecordDialog` でのアップロード後も同様に `s3://` 形式になること

#### 環境変数フォールバック
- [ ] `NEXT_PUBLIC_INSERTION_URI_BUCKET` を未設定にした状態でアップロード → URI がキーのまま（従来通り）になること

#### TypeScript コンパイル
- [ ] `cd frontend && npx tsc --noEmit` で 0 エラーを確認

---

## 8. ロールバック計画

- `storageUriUtils.ts` を削除し、`useInsertionEditor.ts` / `DataRecordDialog.tsx` を元に戻す
- 環境変数（`NEXT_PUBLIC_INSERTION_URI_SCHEME` / `NEXT_PUBLIC_INSERTION_URI_BUCKET`）を削除
- i18n キー追加は互換性に影響しないため、ロールバック不要

---

## 9. 承認記録

- **計画書提示日時**: 2026-08-20 15:44
- **承認日時**: （承認後に記入）
- **承認者コメント**: （承認後に記入）

---

## 10. 実施記録

### 実施日時
- 開始: 2026-08-20 15:44
- 完了: 2026-08-20 16:10

### 計画からの変更点
なし（計画通り実施）

### 完了チェックリスト
- [x] `frontend/src/utils/storageUriUtils.ts` 新規作成（`buildStorageUri` / `isLocalFileUri`）
- [x] `frontend/src/hooks/useInsertionEditor.ts` 修正（`file:///` 変換・`buildStorageUri` 呼び出し）
- [x] `frontend/src/components/common/InsertionEditorForm.tsx` 修正（ガイダンス常時表示追加）
- [x] `frontend/src/components/common/InsertionEditorCompact.tsx` 修正（同上・コンパクト版）
- [x] `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` 修正（`buildStorageUri` 呼び出し 2箇所）
- [x] `frontend/src/locales/ja.json` 修正（ガイダンス i18n キー 4件追加）
- [x] `frontend/src/locales/en.json` 修正（同上・英語）
- [x] `frontend/.env.local` 修正（`NEXT_PUBLIC_INSERTION_URI_SCHEME` / `NEXT_PUBLIC_INSERTION_URI_BUCKET` 追加）
- [x] `.env.prod.aws.example` 修正（同上・AWS本番用）
- [x] `.env.prod.onprem.example` 修正（同上・オンプレ用）
- [x] `tsc --noEmit` で今回変更ファイルに起因するエラー 0 件を確認

