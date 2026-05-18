# 検討レポート: DocumentタグUUID自動更新処理

## メタデータ
- **作成日時**: 2026-05-18 08:53
- **ステータス**: 検討中（未実装）
- **前提タスク**: project_uuid採番分離（`docs/20260518_0810_project_uuid採番分離/PLAN.md`）

---

## 1. 背景・目的

### MAIML規約上の要件

MAIML（Materials Informatics Markup Language）の規約として、**ファイルの内容が変わった場合は `<Document>` タグの `<uuid>` 要素を更新する必要がある**。

現状、編集画面からの保存時（`saveMaiML()`）にはこの Document UUID の自動更新処理がなく、規約違反の状態になっている。

### 対象箇所

| 要素 | 場所 | 役割 |
|------|------|------|
| `<Document>/<uuid>` | MAIMLファイル内 | そのMAIMLドキュメントを一意に識別するUUID。内容変更のたびに更新する |
| `project.project_uuid` | DBテーブル | プロジェクトの不変識別子（Document UUIDとは別管理：project_uuid採番分離タスクで対応済み） |

---

## 2. 検討した実装方式

### 方式A: 編集画面に入る時に新しく採番 + 変更なしなら保存不可

**概要**: 編集画面を開いた時点で新しい Document UUID を採番しておき、画面に変更がない場合は保存ボタンを押せなくする。

**メリット:**
- MAIML規約に厳密に準拠（編集開始時点で「新しいドキュメント」として扱う）
- 保存時の処理が軽い（差分チェック不要）

**デメリット:**
- ユーザーが編集画面を開いただけで UUID が変わる（実際に保存しない場合でも）
- フロントエンドで UUID を生成・管理する必要がある
- 「画面に変更がない」の判定ロジックが必要（フォーム全体の差分検出）
- 編集画面を開いて何もせずに閉じた場合、UUID だけが変わった状態になる可能性

### 方式B: 保存時に差分チェック + 差分があれば Document UUID を再採番

**概要**: 保存処理（`saveMaiML()`）の中で、ストレージにある既存MAIMLと保存しようとしているMAIMLを比較し、Document UUID 以外に差分があれば新しい `uuidv4()` で Document UUID を更新してから保存する。

**メリット:**
- **実質的な変更があった場合のみ** UUID が更新される（MAIML規約の本来の意図に沿う）
- フロントエンド側の変更が不要（すべてバックエンドで完結）
- ユーザー体験がシンプル（「編集して保存」だけでUUID更新も自動）
- 誤って編集画面を開いた場合でも影響なし

**デメリット:**
- 保存時に差分チェック処理が必要（既存ファイルの読み込み + 文字列比較）

---

## 3. 方式比較

| 項目 | 方式A（画面入場時採番） | 方式B（保存時差分チェック） |
|------|----------------------|--------------------------|
| MAIML規約準拠 | ◎（厳密） | ○（実質的） |
| フロントエンド変更 | 必要 | 不要 |
| 保存時の処理コスト | 軽い | やや重い（ファイル読み込み+比較） |
| ユーザー体験 | △（開いただけでUUID変化） | ○（保存時のみ変化） |
| 実装難易度 | 中（フロント管理が複雑） | 低（バックエンドのみ） |
| 予期しない副作用 | あり（保存なしでも変化） | なし |

---

## 4. 方式B（推奨）の実装詳細

### 差分の定義

- **Document UUID 以外の要素**（テキスト・属性・子要素など）が変わっていれば「差分あり」と判定する
- Document UUID 自体の違いは差分判定から除外する（UUID が既に変わっていても内容が同じなら再採番しない）

### ケース別の動作

| ケース | Document UUID の扱い |
|--------|---------------------|
| **MAIMLアップロード時** | アップロードファイルのUUIDをそのまま使用（変更しない） |
| **新規プロジェクトへの初回保存** | 保存時に Document の UUID に設定された値をそのまま使用（既存ファイルなし → 差分チェックスキップ） |
| **編集保存時（差分あり）** | 新しい `uuidv4()` で Document UUID を自動更新してからストレージに保存 |
| **編集保存時（差分なし）** | Document UUID を変更せずそのままストレージに保存 |

### パフォーマンス

- 現状のMAIMLファイルサイズは数百KB程度
- 保存時に既存ファイルを読み込んで文字列比較するコストは十分低い
- 将来的に数MBになっても問題ない範囲

### 実装イメージ

#### 新規ユーティリティ: `backend/src/utils/maimlDocumentUtils.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';

/**
 * MAIML XML 文字列の <Document>/<uuid> を新しい uuidv4() で置換する
 */
export function updateDocumentUuid(content: string): string {
  // <Document> 直下の <uuid>...</uuid> を新しい UUID で置換
  return content.replace(
    /(<Document[^>]*>[\s\S]*?<uuid>)[^<]*([\s\S]*?<\/uuid>)/,
    `$1${uuidv4()}$2`
  );
}

/**
 * MAIML XML 文字列から <Document>/<uuid> の値を除去して正規化する（差分比較用）
 */
export function normalizeForDiffCheck(content: string): string {
  // <Document> 直下の <uuid>...</uuid> の値を空文字に置換して比較
  return content.replace(
    /(<Document[^>]*>[\s\S]*?<uuid>)[^<]*([\s\S]*?<\/uuid>)/,
    '$1__UUID_PLACEHOLDER__$2'
  );
}
```

#### `maimlService.ts` の `saveMaiML()` 変更箇所

```typescript
// 1. ストレージから既存MAIMLを取得
let existingContent: string | null = null;
try {
  const buffer = await storageService.downloadFile(organizationId, filePath);
  existingContent = buffer.toString('utf-8');
} catch {
  // 既存ファイルなし（新規作成） → 差分チェックスキップ
}

// 2. Document UUID 以外で差分があるか確認
let contentToSave = newContent;
if (existingContent !== null) {
  const existingNormalized = normalizeForDiffCheck(existingContent);
  const newNormalized = normalizeForDiffCheck(newContent);
  
  if (existingNormalized !== newNormalized) {
    // 差分あり → Document UUID を新しく採番
    contentToSave = updateDocumentUuid(newContent);
    logger.info(`Document UUID updated for project: ${projectName}`);
  }
  // 差分なし → そのまま保存（Document UUID を変更しない）
}

// 3. ストレージに保存
await storageService.uploadFile(organizationId, filePath, Buffer.from(contentToSave));
```

---

## 5. 影響範囲（方式B実装時）

### 変更するファイル
1. `backend/src/services/maimlService.ts` - `saveMaiML()` に差分チェック + Document UUID 自動更新を追加

### 新規作成するファイル
1. `backend/src/utils/maimlDocumentUtils.ts` - Document UUID 更新・正規化ユーティリティ

### 影響を受ける機能
- MAIMLファイル編集保存機能のみ
- MAIMLファイルアップロード機能：影響なし
- プロジェクト作成機能：影響なし

---

## 6. 未解決の検討事項

以下の点について、方式Bで実装を進める前にさらなる検討が必要：

### 6-1: `<Document>` タグの構造確認

MAIML XML における `<Document>/<uuid>` の正確な構造（ネスト、属性、名前空間など）をコードで確認し、正規表現またはXMLパーサーで確実に抽出・置換できることを検証する必要がある。

### 6-2: 既存の XML 操作ライブラリとの整合

`backend/src/services/maimlService.ts` や `maimlParserService.ts` で使用している XML 操作ライブラリ（xmlbuilder2、fast-xml-parser 等）を流用して Document UUID を操作する方が、正規表現より安全な可能性がある。

### 6-3: アーカイブファイルへの Document UUID 更新適用

編集保存時には現在のMAIMLファイル（`projects/{name}/{name}.maiml`）に書き込み、アーカイブ（`projects/{name}/archive/`）への退避も行われる。アーカイブファイルに更新前の Document UUID を保持するか、更新後の UUID を書き込むかを確認する。

---

## 7. 次のアクション

- [ ] `project_uuid採番分離` タスクの実装完了・確認後に本タスクに着手する
- [ ] 実装前に `<Document>/<uuid>` の MAIML XML 構造を確認する
- [ ] 方式Bで実装計画書（PLAN.md）を作成する
- [ ] ユーザーの最終承認を得て実装開始

---

## 8. 更新履歴

| 日時 | 内容 |
|------|------|
| 2026-05-18 08:53 | 初版作成（方式A/B検討、方式Bを推奨として記録） |
