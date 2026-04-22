# 実施結果: MAIMLダウンロード時 Parentタグ追記

## 実施日時
- 開始: 2026-04-21 11:54
- 完了: 2026-04-21 13:54

---

## 対応概要

ProjectManagementでMAIMLファイルをプロジェクトからダウンロードする際に、`<parent>` タグを自動追記する機能を実装した。

---

## 実装内容

### 新規作成ファイル

#### `backend/src/utils/maimlParentInjector.ts`

MAIMLコンテンツに `<parent>` タグを注入するユーティリティ。

**主要関数:**
- `computeSha256Base64(buffer: Buffer): string`  
  ファイルのSHA-256ハッシュをBase64エンコードで計算する
- `injectParentTag(maimlContent, projectUuid, fileBuffer): string`  
  `<document>` 直下に `<parent>` タグを挿入する

**処理フロー:**
1. `projectUuid` が未設定の場合はスキップ
2. `MaimlParserTyped` でパースし先頭 `parent.uuid` を取得
3. 同一 UUID の `<parent>` が既にある場合は重複スキップ
4. 既存 `<parent>` がある場合は **ネスト**して来歴チェーンを保持
5. 既存 `<parent>` がない場合は `<document>` 開始タグ直後に新規挿入

**インデント自動検出:**
- `documentInner` の先頭行から実際のインデント文字列を動的検出
- 例: 4スペースのファイルでは `<parent>` も4スペースでインデント

**出力例（初回挿入）:**
```xml
<document id="project_xxx">
    <parent>
      <uuid>f7e1d68d-1009-42ad-856c-78389a633e43</uuid>
      <hash method="SHA-256">sq7xVB7o...dn5Y=</hash>
    </parent>
    <name>test_project</name>
    ...
</document>
```

**出力例（2回目ダウンロード・別プロジェクトUUID時のネスト）:**
```xml
<document id="project_xxx">
    <parent>
      <uuid>新しいprojectUuid</uuid>
      <hash method="SHA-256">新しいhash</hash>
        <parent>
          <uuid>f7e1d68d-1009-42ad-856c-78389a633e43</uuid>
          <hash method="SHA-256">sq7xVB7o...dn5Y=</hash>
        </parent>
    </parent>
    ...
</document>
```

---

### 修正ファイル

#### `backend/src/controllers/fileAccessController.ts` — `getFileDownloadUrl()`

MAIMLファイル（`.maiml`）のダウンロード時に `injectParentTag()` を呼び出す処理を追加。

**変更点:**
- `.maiml` 拡張子のファイルかつ `project_uuid` が設定されている場合のみ処理
- ストレージから取得したファイルのバッファを `injectParentTag()` に渡し、変換後の内容を一時バッファに入れて署名付きURLへアップロード
- 元のストレージファイルは変更しない（ダウンロード時のみ動的に付加）

---

## バグ修正履歴

### Bug 1: `<parent>` タグのインデントずれ

**症状:** 挿入された `<parent>` のインデントが既存要素と揃わない

**原因:** ハードコードした `'  '`（2スペース）を使用していたため、実際のファイルが4スペースインデントの場合にずれが発生

**修正:** `documentInner` の先頭行から実際のインデントを動的検出するよう変更

```typescript
const indentMatch = documentInner.match(/\n(\s+)</);
const baseIndent = indentMatch ? indentMatch[1] : '  ';
const childIndent = baseIndent + '  ';
```

---

### Bug 2: 同一 UUID ファイルで `<parent>` が重複挿入される

**症状:** 同じプロジェクトからダウンロードを繰り返すと `<parent>` が多重挿入される

**根本原因:** `maimlTypeConverter.ts` の `convertDocument()` が `parents: []` を常にハードコードして返すため、`MaimlParserTyped` 経由の重複チェックが機能しなかった

**workaround対応:** `extractFirstParentBlock()` を用いた文字列ベースの重複チェックを強化
- `lineStart` / `lineEnd` / `indent` の計算精度を改善
- 置換時の二重インデント付与バグを修正

**根本的な修正は別Issueで対応予定:**
→ `docs/github_issues/issue_maimlTypeConverter_chains_parents.md`

---

## 別途起票した Issue

### Issue: maimlTypeConverter が Document の chains / parents を変換しない

**ファイル:** `docs/github_issues/issue_maimlTypeConverter_chains_parents.md`

**概要:**
- バックエンド・フロントエンド両方の `maimlTypeConverter.ts` にて `convertDocument()` 内の `chains` / `parents` が常に `[]` でハードコードされており、XMLの実データが変換されない
- これが `maimlParentInjector` の重複チェック失敗の根本原因
- 修正方針（`convertParent()` / `convertChain()` 追加）を Issue に記載済み

---

## Issue対応: maimlTypeConverter chains/parents 修正（2026-04-21 14:00）

Issueに記載された `convertDocument()` の `chains` / `parents` 常時 `[]` 問題を修正した。

### 修正内容

**backend/src/utils/maimlTypeConverter.ts**
- `Chain`, `Parent` 型を import 文に追加
- `convertParent(xmlParent)` 関数を追加（再帰対応）
- `convertChain(xmlChain)` 関数を追加（再帰対応）
- `convertDocument()` の `chains` / `parents` をXMLから変換するよう変更

**frontend/src/utils/maimlTypeConverter.ts**
- 同様に `Chain`, `Parent` 型を import 文に追加
- `convertParent()` / `convertChain()` 関数を追加
- `convertDocument()` の `chains` / `parents` をXMLから変換するよう変更

### ビルド確認

- backend: `npx tsc --noEmit` → **EXIT:0（エラーなし）**
- frontend: `npx tsc --noEmit` → **EXIT:0（エラーなし）**

---

## 最終的な変更ファイル一覧

| ファイル | 種別 | 内容 |
|---------|------|------|
| `backend/src/utils/maimlParentInjector.ts` | 新規作成 | `<parent>` タグ注入ユーティリティ |
| `backend/src/controllers/fileAccessController.ts` | 修正 | `getFileDownloadUrl()` にMAIML変換処理を追加 |
| `docs/github_issues/issue_maimlTypeConverter_chains_parents.md` | 新規作成 | chains/parents未変換問題のIssue |
| `backend/src/utils/maimlTypeConverter.ts` | 修正 | `convertParent()` / `convertChain()` 追加、`convertDocument()` の chains/parents をXMLから変換 |
| `frontend/src/utils/maimlTypeConverter.ts` | 修正 | 同上（フロントエンド側） |
