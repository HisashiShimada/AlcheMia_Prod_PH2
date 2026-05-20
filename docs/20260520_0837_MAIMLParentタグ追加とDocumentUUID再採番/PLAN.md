# タスク計画書: MAIMLParentタグ追加とDocumentUUID再採番

## メタデータ
- **作成日時**: 2026-05-20 08:37
- **タスクID**: MAIMLParentタグ追加とDocumentUUID再採番
- **優先度**: 高
- **推定工数**: 3-4時間
- **参考資料**: `docs/20260520_0827_MAIML_UUID管理修正/調査結果レポート.md`

---

## 1. タスク概要

以下の2つのシーンで、Parentタグ挿入後にDocumentタグのUUIDを再採番する必要がある。

1. 読み込んだMAIMLのDocument UUIDをParentタグに書き込む（**既実装**）
2. Parentタグが書き込まれることで内容が変わるため、DocumentタグのUUIDを再採番する（**未実装 → 今回対応**）

**対象シーン（両方対応が必要）:**
- **編集画面起動時**: ProjectManagementの編集ボタン押下 → PetriNetEditorScreen起動 → `content-as-text` API呼び出し
- **ダウンロード時**: フロントエンドからのファイルダウンロード → `content-as-text` API呼び出し

両シーンとも `GET /files/content-as-text` → `fileAccessController.ts` → `injectParentTag()` を通るため、`injectParentTag()` にDocument UUID再採番を追加することで両方を一度に対応できる。

**⚠️ 前提: 本処理は「既存MAIMLの再編集・DL時」のみ発動する**

`injectParentTag()` は「一度ストレージに保存済みの `.maiml` ファイル」に対してのみ機能する。
- **新規MAIMLを作成する場合**: ストレージにまだファイルが存在しないため `projectUuid` が未設定 → `injectParentTag()` はスキップされ、Document UUID再採番も発生しない
- **既存MAIMLを再編集・DLする場合**: ストレージ上の既存ファイルを `content-as-text` API で取得するタイミングで `injectParentTag()` が呼ばれ、Document UUID再採番が行われる

**⚠️ 注意: プロジェクト選択時のContext読み込みとは別ルート**

ProjectManagementでプロジェクトを選択した際に呼ばれる `ProjectMaimlContext.loadMaiml()` は `getProjectMaiml()` → `GET /projects/:projectId/maiml`（`projectController.ts`）を使用しており、`fileAccessController.ts` とは**完全に別のエンドポイント**である。このルートでは `injectParentTag()` は呼ばれないため、プロジェクト選択だけで意図せずParentタグ生成・Document UUID再採番が発生することはない。

---

## 2. 現状と問題点

### 現在の動作

```
[プロジェクト選択時のフロー（Context読み込み）] ← injectParentTag() は呼ばれない
  フロントエンド: ProjectManagement でプロジェクト選択
    → ProjectMaimlContext.loadMaiml(projectId)
      → getProjectMaiml(projectId)
        → GET /projects/:projectId/maiml  ← projectController.ts 経由
          ※ injectParentTag() を呼ばない別ルート
      → Context の maimlContent に格納（ProjectManagement内の各タブで参照用）

[編集ボタン押下時のフロー] ← injectParentTag() が呼ばれる
  フロントエンド: ProjectManagement 編集ボタン押下
    → handleEditButtonClick()
      → onEdit(MaimlEditorParams) コールバック
        → PetriNetEditorScreen マウント
          → loadMaimlData()
            → getFileContentAsText(sourceS3Key)  ← content-as-text API 呼び出し
              ※ Contextの maimlContent は使わず、独自にAPIを呼ぶ
  バックエンド: GET /files/content-as-text
    → fileAccessController.ts
      → storageService.downloadFile() でMAIML取得
      → （projects/ 配下の .maiml ファイルの場合）
        → injectParentTag(maimlContent, projectUuid, buffer)  ← Parentタグ挿入
      → フロントエンドに返却

[ダウンロード時も同じAPIを経由]
  フロントエンド: ダウンロードボタン押下
    → getFileContentAsText(fileKey) or downloadFile() 呼び出し
  バックエンド: 上記と同じフロー

[injectParentTag() 処理後のMAIML（現状）]
  <document>
    <uuid>OLD-UUID-XXXX</uuid>  ← ❌ 変わっていない（問題）
    <parent>
      <uuid>OLD-UUID-XXXX</uuid>  ← 元UUIDがParentに入る
      <hash method="SHA-256">base64hash=</hash>
    </parent>
    ...
  </document>
```

### 問題点

- Parentタグを挿入することで `<document>` の内容が変化しているのに、Document直下の `<uuid>` が再採番されていない
- Documentタグの `<uuid>` と Parentタグの `<uuid>` が同じ値になってしまっている

### 期待される動作

```
[injectParentTag() + Document UUID再採番後のMAIML]
  <document>
    <uuid>NEW-UUID-YYYY</uuid>  ← ✅ 新しいUUIDに更新（編集時もダウンロード時も）
    <parent>
      <uuid>OLD-UUID-XXXX</uuid>  ← 元UUIDがParentに入る
      <hash method="SHA-256">base64hash=</hash>
    </parent>
    ...
  </document>
```

**補足: フロントエンド側への影響**
- 編集画面起動時: `PetriNetEditorScreen` がAPIから受け取るMAIMLに新しいDocument UUIDが含まれるため、`documentParser.ts` が自動的に新UUIDを解析して `documentData.uuid` に設定する → 追加対応不要
- ダウンロード時: ダウンロードされるファイルに新しいDocument UUIDが含まれる → 追加対応不要

---

## 3. 実装方針（Phase 1: Document UUID再採番）

### 修正箇所

**ファイル**: `backend/src/utils/maimlParentInjector.ts`

**方針**:
- `injectParentTag()` 内でParentタグ挿入後に、Document直下の `<uuid>` 要素を新しいUUIDで置換する
- `replaceDocumentUuid()` というヘルパー関数を新規追加する
- Parentタグが実際に挿入された場合のみDocument UUIDを再採番する（スキップされた場合は再採番しない）

### 実装詳細

#### `replaceDocumentUuid()` の実装方針

Document直下の `<uuid>` を特定し、文字列置換で新しいUUIDに差し替える。

```typescript
/**
 * MAIMLコンテンツの <document> 直下の <uuid> 要素を新しいUUIDで置換する
 *
 * @param maimlContent - MAIML XML文字列
 * @param newUuid      - 置換後のUUID
 * @returns 置換後のMAIML XML文字列
 */
function replaceDocumentUuid(maimlContent: string, newUuid: string): string {
  // <document> 開始タグの位置を特定
  // <document> 直後の最初の <uuid>...</uuid> を置換
  // ※ 子要素（parent等）の <uuid> を誤って置換しないよう注意
}
```

#### `injectParentTag()` の修正

```typescript
export function injectParentTag(...): string {
  // ... 既存処理 ...

  // Parentタグが挿入された場合のみ Document UUID を再採番
  const newDocumentUuid = crypto.randomUUID();
  const finalResult = replaceDocumentUuid(result, newDocumentUuid);

  console.log(
    `[maimlParentInjector] Document UUID を再採番しました: ${newDocumentUuid}`
  );
  return finalResult;
}
```

#### スキップ時の処理

以下の場合はParentタグ挿入をスキップするため、Document UUIDの再採番も不要：
- `projectUuid` が未設定の場合
- MaimlParserTypedのパース失敗の場合
- 同一UUIDのParentが既に存在する場合（重複スキップ）
- `<document>` タグが見つからない場合

---

## 4. 連動修正（Phase 2: アップロード上書きチェック変更）

### 背景（なぜ変更が必要か）

Phase 1の修正後、アップロード時の上書きチェックが正常に動作しなくなる。

```
[Phase 1修正前]
  ストレージのMAIML:    <uuid>OLD-UUID</uuid>
  アップロードするMAIML: <uuid>OLD-UUID</uuid>  ← 同一UUID
  → 上書きチェック: OLD-UUID === OLD-UUID → ✅ 上書き許可

[Phase 1修正後]
  ストレージのMAIML:    <uuid>OLD-UUID</uuid>
  編集開始時: injectParentTag() によりDocument UUID再採番 → エディタに NEW-UUID が渡る
  保存時アップロード:    <uuid>NEW-UUID</uuid>
                         <parent><uuid>OLD-UUID</uuid></parent>
  → 上書きチェック: NEW-UUID === OLD-UUID → ❌ 不一致 → 拒否される（バグ）
```

### 修正方針

**現状の判定ロジック（`fileAccessService.ts`）:**
```typescript
if (uploadingDocumentUuid && currentDocumentUuid && uploadingDocumentUuid === currentDocumentUuid) {
  allowOverwrite = true;  // Document UUID完全一致のみ許可
}
```

**修正後の判定ロジック:**
- アップロードするMAIMLの `<parent>` タグチェーンを再帰的にたどり、現在ストレージにあるMAIMLのDocument UUIDが含まれているかのみを検証する
- 含まれている場合 → 同一MAIMLをベースにした変更 → 上書き許可
- **従来のDocument UUID完全一致チェックは削除する**（今回の対応以降はDocument UUIDが必ず再採番されるため、一致することは永遠にない → デッドコードになるため）

```typescript
// Parentチェーン抽出ユーティリティ（新規追加）
const parentUuids = extractParentUuids(uploadingMaimlContent);

// Parentチェーンに現在のDocument UUIDが含まれる → 上書き許可
const isBaseMatch = currentDocumentUuid != null && parentUuids.includes(currentDocumentUuid);

if (isBaseMatch) {
  allowOverwrite = true;
}
```

> **⚠️ 移行期の考慮事項**
> 今回の対応を入れる前にダウンロード済みのMAIMLを、対応後にアップロードし直すケースが存在する。
> そのMAIMLはParentタグがなく、Document UUIDも再採番されていない（旧形式）。
> このケースは上書き拒否（E7013）されることになるが、**意図的な仕様変更**として扱う。
> 旧形式のMAIMLは再ダウンロード（編集画面を開き直す）により新形式で取り直せばよい。

### 追加するユーティリティ

**`extractParentUuids(maimlContent: string): string[]`**
- MAIMLの `<parent>` タグチェーンを再帰的にたどり、UUID一覧を配列で返す
- `maimlParentInjector.ts` に追記する（Parentタグ関連の処理を集約）
- 例: `<parent><uuid>A</uuid><parent><uuid>B</uuid></parent></parent>` → `["A", "B"]`

### 修正箇所

**ファイル1**: `backend/src/utils/maimlParentInjector.ts`
- `extractParentUuids()` 関数を追加（export）

**ファイル2**: `backend/src/services/fileAccessService.ts`
- 上書きチェックロジックを修正（Parentチェーン一致も許可）

**ファイル3**: `backend/src/controllers/fileAccessController.ts`
- チャンクアップロード完了時の上書きチェックにも同様のロジックがあれば修正

---

## 5. 実装ステップ（チェックリスト）

### Phase 1: Document UUID再採番
- [x] `backend/src/utils/maimlParentInjector.ts` の `injectParentTag()` 実装を確認
- [x] `replaceDocumentUuid()` ヘルパー関数を追加（`<document>` 直下の最初の `<uuid>` のみ置換）
- [x] `injectParentTag()` の各挿入パス末尾で `replaceDocumentUuid()` を呼ぶ
- [x] スキップパス（projectUuid未設定 / パース失敗 / 重複スキップ / documentタグ未検出）では `replaceDocumentUuid()` を呼ばないことを実装で保証する

### Phase 2: アップロード上書きチェック修正
- [x] `extractParentUuids()` ユーティリティ関数を `maimlParentInjector.ts` に追加（export）
- [x] `backend/src/services/fileAccessService.ts` の上書きチェックロジックを修正（Document UUID完全一致チェックを削除しParentチェーン一致のみに変更）
- [x] `backend/src/controllers/fileAccessController.ts` にチャンクアップロード上書きチェックが存在するか確認し、存在する場合は同様に修正

### フロントエンド連動修正（計画外追加）
- [x] `frontend/src/types/file.ts` の `ChunkUploadOptions.documentUuid` → `parentUuids?: string[]` に変更
- [x] `frontend/src/utils/maimlParentInjector.ts` 新規作成（`extractParentUuids()` フロントエンド版）
- [x] `frontend/src/services/fileAccessService.ts` の `/files/chunks/init` リクエストを `documentUuid` → `parentUuids` に変更

### 確認
- [ ] テストがあれば確認・更新
- [ ] 動作確認: 編集→保存でE7013エラーが出ないこと
- [ ] 動作確認: 全く別のMAIMLのアップロードはE7013で弾かれること
- [ ] 動作確認: Document UUIDがダウンロード/編集開始時に再採番されること

---

## 6. 影響範囲

### 変更するファイル
1. `backend/src/utils/maimlParentInjector.ts` - `replaceDocumentUuid()` 追加 + `injectParentTag()` 修正 + `extractParentUuids()` 追加
2. `backend/src/services/fileAccessService.ts` - アップロード上書きチェックロジック修正
3. `backend/src/controllers/fileAccessController.ts` - チャンクアップロード上書きチェック部分のみ修正（該当箇所がある場合）
   ※ `injectParentTag()` の呼び出し部分は変更しない（返り値は引き続き `string`）

### 変更しないファイル
- フロントエンド全般（バックエンドのみの修正で完結）

### 影響を受けるAPIエンドポイント
- `GET /files/content-as-text` - Parentタグ挿入 + Document UUID再採番
- `POST /files/upload` - アップロード上書きチェック変更
- `POST /files/chunks/complete` - チャンクアップロード上書きチェック変更（該当箇所があれば）

### 影響を受けない機能
- `GET /projects/:id/maiml` エンドポイント（projectController経由 / `injectParentTag()` を呼ばない）
- MAIML保存処理（`maimlService.ts`）
- Draft保存/復元
- data/eventLog層の書き込み（`maimlWriterService.ts`）

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Phase 1後にアップロードがE7013で弾かれる | 高 | 高 | Phase 2で上書きチェックを連動修正する（必ずセットで対応） |
| `<document>` 直下以外の `<uuid>` を誤って置換する | 中 | 中 | 置換範囲を `<document>` 開始直後の最初の `<uuid>` に限定する |
| `extractParentUuids()` の抽出漏れで上書き拒否される | 中 | 低 | テストでParentチェーンの抽出内容を検証 |
| 既存テストの破壊 | 低 | 低 | テスト実行で確認 |

---

## 8. 承認記録

- **計画書提示日時**: 2026-05-20 09:16
- **承認日時**: 2026-05-20 11:19（実装開始）
- **承認者コメント**: 実装開始の指示

---

## 9. 実施記録

### 実施日時
開始: 2026-05-20 11:19
完了: 2026-05-20 11:24

### 計画からの変更点

- **フロントエンド側の連動修正が必要と判明**: `fileAccessService.ts`（バックエンド）の上書きチェック変更に伴い、フロントエンド側でもアップロード時に `documentUuid` ではなく `parentUuids` を送信する必要があった。以下のファイルを追加修正：
  - `frontend/src/types/file.ts`
  - `frontend/src/utils/maimlParentInjector.ts`（新規作成）
  - `frontend/src/services/fileAccessService.ts`
- **副産物: en.json のタイポ修正**: フロントエンドビルド時に `instruction_rgistration` → `instruction_registration` のタイポエラーを検出・修正（本タスクの変更起因ではなく既存のバグ）

### 最終的な成果物
- [x] `backend/src/utils/maimlParentInjector.ts` 修正完了（`replaceDocumentUuid()` 追加、`injectParentTag()` でDocument UUID再採番、`extractParentUuids()` 追加）
- [x] `backend/src/services/fileAccessService.ts` 上書きチェック修正完了（Document UUID完全一致 → Parentチェーン照合）
- [x] `backend/src/controllers/fileAccessController.ts` チャンクアップロード上書きチェック修正完了（`documentUuid` → `parentUuids` チェーン照合）
- [x] `frontend/src/types/file.ts` 型定義修正完了（`documentUuid` → `parentUuids?: string[]`）
- [x] `frontend/src/utils/maimlParentInjector.ts` 新規作成完了（`extractParentUuids()` フロントエンド版）
- [x] `frontend/src/services/fileAccessService.ts` 修正完了（`parentUuids` 送信対応）
- [x] `frontend/src/locales/en.json` タイポ修正完了（副産物）
- [x] バックエンド TypeScript ビルド確認（`tsc --noEmit` EXIT:0）
- [x] フロントエンド TypeScript ビルド確認（`tsc --noEmit` EXIT:0、エラーゼロ）
- [ ] 動作確認: 編集→保存でE7013エラーが出ないこと（手動確認待ち）
- [ ] 動作確認: 全く別のMAIMLのアップロードはE7013で弾かれること（手動確認待ち）
- [ ] 動作確認: Document UUIDがダウンロード/編集開始時に再採番されること（手動確認待ち）
