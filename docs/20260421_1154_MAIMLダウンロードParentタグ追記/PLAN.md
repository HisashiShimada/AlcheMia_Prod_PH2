# タスク計画書: MAIMLダウンロード時Parentタグ追記

## メタデータ
- **作成日時**: 2026-04-21 11:54
- **タスクID**: maiml-download-parent-tag
- **優先度**: 中
- **推定工数**: 2〜3時間

## タスク概要

ProjectManagement画面でプロジェクトのMAIMLファイルをダウンロードする際、
ダウンロードされるMAIML XMLに `<parent>` タグを自動的に追記してダウンロードさせる。

現状はストレージに保存されたMAIMLファイルをそのままバイトストリームとして返しており、
`<parent>` タグの挿入は行われていない。

---

## 目的と期待される成果

### 目的
- MAIMLファイルのダウンロード時に、そのファイルのプロベナンス（来歴）情報として
  `<parent>` タグを `<document>` セクションに埋め込む
- ダウンロードされたファイルを別システムや別プロジェクトで取り込んだ際に
  元プロジェクトとの関係を追跡できるようにする

### 期待される成果
- [ ] MAIMLファイル（`.maiml`）をProjectManagementからダウンロードした場合、
      `<document>` 内に `<parent>` タグ（uuid + hash + parents のネスト構造）が追記されている
- [ ] 非MAIMLファイルや ZIP ダウンロードの場合は影響しない
- [ ] MAIMLのXML構造が壊れない（既存 `<parent>` が既にある場合でも重複しない）

---

## 前提調査結果

### Parent 型定義（`backend/src/types/maiml-unified.ts`）

```typescript
export interface Parent {
  uuid: Uuid;
  hash: Hash;
  parents: Parent[];
  key?: string;
}
```

### XSD確認結果（`docs/design/maiml/maiml-document.xsd` / `maiml-core.xsd`）

```xml
<!-- parentType (maiml-document.xsd) -->
<xs:complexType name="parentType">
  <xs:sequence>
    <xs:element name="uuid" type="uuid" />
    <xs:element name="hash" type="hashType" />         <!-- 必須: minOccurs省略=1 -->
    <xs:element name="parent" type="parentType" minOccurs="0" maxOccurs="unbounded" />
  </xs:sequence>
</xs:complexType>

<!-- hashType (maiml-core.xsd) -->
<xs:complexType name="hashType">
  <xs:simpleContent>
    <xs:extension base="xs:base64Binary">              <!-- 内容はBase64エンコード値 -->
      <xs:attribute name="method" type="xs:string" />  <!-- method属性はオプション -->
    </xs:extension>
  </xs:simpleContent>
</xs:complexType>
```

対応するXML形式:
```xml
<parent>
  <uuid>xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</uuid>
  <hash method="SHA-256">Base64エンコードされたSHA-256ハッシュ値</hash>
</parent>
```

※ `<hash>` の内容は `xs:base64Binary` のため、SHA-256ダイジェスト（32バイト）を
  Base64エンコードした文字列を設定する。

### ダウンロードの流れ（現状）

#### 単一ファイルダウンロード（ProjectManagement → ファイル行の「ダウンロード」ボタン）
```
Frontend: getFileDownloadUrlByKey(fileKey)
  → POST /api/v1/files/download-url  { fileKey }
  → fileAccessController.getFileDownloadUrl()
  → FileAccessService.streamFileByKey(organizationId, fileKey)
  → ストレージから Buffer をそのまま返す → res.send(buffer)
```

#### ZIPダウンロード（「プロジェクト一括ダウンロード」ボタン）
```
Frontend: downloadFolderAsZip(folderPath)
  → POST /api/v1/files/download-folder-as-zip  { folderPath }
  → fileAccessController.downloadFolderAsZip()
  → FileAccessService.downloadFolderAsZip(organizationId, folderPath)
  → ZIPストリームをパイプ
```

### Parentタグを追記すべきタイミング
- **単一ファイルダウンロード**（`getFileDownloadUrl`）でMAIMLファイルを返す直前
- ZIPダウンロードは今回のスコープ外（対象ファイルが多数になりうるため別タスクとする）

---

## 実装方針

### Phase 1: MAIMLへのParentタグ挿入ユーティリティ作成

**新規ファイル**: `backend/src/utils/maimlParentInjector.ts`

```typescript
/**
 * MAIMLコンテンツに <parent> タグを注入するユーティリティ
 *
 * @param maimlContent  元のMAIML XML文字列
 * @param projectUuid   プロジェクトのDocument UUID（project.project_uuid）
 * @param fileHash      元ファイルのSHA-256ハッシュ（省略可）
 * @returns             <parent> タグが挿入されたMAIML XML文字列
 */
export function injectParentTag(
  maimlContent: string,
  projectUuid: string,
  fileHash?: string
): string
```

挿入ロジック:
1. `<document` ... `>` タグを検索し、その直下（終了タグ `</document>` の直前）に挿入
2. 既に `<parent>` タグが存在する場合は挿入をスキップ（重複防止）
3. XML解析は文字列操作で行う（xml-jsパースは重くなるため正規表現/文字列検索を使用）

### Phase 2: ダウンロードエンドポイントでの挿入処理

**変更ファイル**: `backend/src/controllers/fileAccessController.ts`

`getFileDownloadUrl` 関数内で以下を追加:
1. ファイルキーが `.maiml` で終わる かつ `projects/` 配下の場合のみ処理
2. `result.buffer.toString('utf-8')` でMAIMLコンテンツを取得
3. ファイルキーからプロジェクト名を抽出し、`projectRepository.findByName()` でプロジェクト情報取得
4. `injectParentTag(maimlContent, project.project_uuid, fileHash)` を呼び出し
5. 変更後コンテンツを Buffer に変換してレスポンスとして返す

---

## 実装ステップ

### Phase 1: Parentタグ注入ユーティリティ
- [ ] `backend/src/utils/maimlParentInjector.ts` を新規作成
  - `injectParentTag(maimlContent, projectUuid, fileHash?)` 関数を実装
  - `<document>` タグの直下の最初の子要素として `<parent>` を挿入する
  - 既存 `<parent>` タグがある場合はスキップ
  - XMLが壊れない文字列操作で実装

### Phase 2: ダウンロードコントローラーへの組み込み
- [ ] `backend/src/controllers/fileAccessController.ts` の `getFileDownloadUrl` 関数を修正
  - MAIMLファイル かつ `projects/` 配下の場合に `injectParentTag` を呼び出す
  - プロジェクト情報（`project_uuid`）を `projectRepository` から取得
  - 変換後の Buffer をレスポンスとして送信

### Phase 3: テスト・動作確認
- [ ] ProjectManagement画面でMAIMLファイルをダウンロードし `<parent>` タグが入っているか確認
- [ ] 非MAIMLファイルのダウンロードが変わらないことを確認
- [ ] `project_uuid` が null の場合（MAIMLが未登録）のエラーハンドリング確認

---

## 変更ファイル

### 新規作成
1. `backend/src/utils/maimlParentInjector.ts` - Parentタグ注入ユーティリティ

### 修正
2. `backend/src/controllers/fileAccessController.ts` - `getFileDownloadUrl` 関数に注入処理を追加

---

## Parentタグ挿入後のXML構造（例）

`hashType` は `xs:base64Binary` の `simpleContent` + `method` 属性のため、
要素の内容がBase64値・`method` は属性となります。

```xml
<maiml ...>
  <document id="document_xxx">
    <parent>
      <uuid>7fbcc8ec-6317-4e16-bed1-4a46b5d4e13c</uuid>
      <hash method="SHA-256">4z7ARz/sSBTSGxbVrQF2x+h7UjJpV/FkVJhpQ7LHTz8=</hash>
      <!-- ↑ SHA-256の32バイトダイジェストをBase64エンコードした値 -->
    </parent>
    <name>...</name>
    <uuid>...</uuid>
    ...
  </document>
  ...
</maiml>
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| XML挿入位置のミスによる XML破損 | 高 | 低 | 挿入前後のコンテンツをログ出力して検証、単体テスト作成 |
| project_uuid が null（MAIMLファイル未紐付け） | 中 | 中 | null の場合は `<parent>` タグ挿入をスキップしてそのまま返す |
| 大容量MAIMLファイルでのメモリ使用増大 | 低 | 低 | バッファからUTF-8変換 → 挿入 → Buffer変換は既存パターンと同じ |
| ZIPダウンロード時の未対応 | 低 | - | 今回スコープ外（別タスク化） |

---

## テスト計画

### 手動テスト
- [ ] MAIMLファイルを単一ダウンロード → `<parent>` タグが `<document>` 直下に存在する
- [ ] `<parent>` タグ内に `<uuid>` がプロジェクトのUUIDと一致することを確認
- [ ] CSV等の非MAIMLファイルをダウンロード → ファイル内容が変わっていない
- [ ] `project_uuid` が未設定のプロジェクトのMAIMLをダウンロード → エラーにならずそのまま返る

---

## 承認記録
- **計画書提示日時**: 2026-04-21 11:54
- **承認日時**: 
- **承認者コメント**: 

---

## 11. 実施記録

### 実施日時
開始: （承認後に記入）
完了: 

### 最終成果物
- [ ] `backend/src/utils/maimlParentInjector.ts` 作成
- [ ] `backend/src/controllers/fileAccessController.ts` 修正完了
