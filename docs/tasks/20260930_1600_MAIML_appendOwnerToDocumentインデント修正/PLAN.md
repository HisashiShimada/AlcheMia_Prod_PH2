# タスク計画書: MaiMLファイル `appendOwnerToDocument()` インデント修正

## メタデータ
- **作成日時**: 2026-09-30 16:00
- **タスクID**: 20260930_1600_MAIML_appendOwnerToDocumentインデント修正
- **優先度**: 高
- **推定工数**: 0.25h

---

## 1. タスク概要

MAIMLファイルが更新された際に `appendOwnerToDocument()` が生成する `<owner>` タグのインデントが
誤っていること、および `</document>` 直前に余分な空行が挿入される問題を修正する。

この問題は `<parent>` / `<date>` / `<results>` / `<eventLog>` の4件以外に存在していた
**追加のインデント誤り箇所**である。

---

## 2. 原因調査

### 問題箇所

**ファイル**: `backend/src/utils/maimlDataWriter.ts` — `appendOwnerToDocument()` 関数（L1134〜1143）

### MAIMLの正しいインデント構造

```xml
<?xml version="1.0" encoding="utf-8"?>
<maiml ...>
  <document id="...">           ← 2スペース（maiml直下）
    <name>...</name>            ← 4スペース（document直下）
    <uuid>...</uuid>            ← 4スペース
    <owner id="owner-001">      ← 4スペース（document直下）
      <name>...</name>          ← 6スペース（owner直下）
    </owner>                    ← 4スペース
  </document>                   ← 2スペース
</maiml>
```

### 現在のコード（問題あり）

```typescript
// L1134〜1143
const ownerXml = [
  `  <owner id="${escapeXml(ownerId)}">`,       // ❌ 2スペース（本来4スペース）
  `    <name>${escapeXml(ownerName)}</name>`,    // ❌ 4スペース（本来6スペース）
  `  </owner>`,                                  // ❌ 2スペース（本来4スペース）
].join('\n');

return maimlContent.replace(
  /(\s*)<\/document>/,
  `\n${ownerXml}\n$1</document>`  // ❌ \n + ownerXml + \n + $1 → </document>前に余分な空行が入る
);
```

`/(\s*)<\/document>/` の `$1` は `\n  `（改行+2スペース）を捕捉するため、
置換後は以下のようになる：

```
(修正前の出力)
  <owner id="xxx">               ← 2スペース ❌
    <name>...</name>             ← 4スペース ❌
  </owner>                       ← 2スペース ❌
                                 ← 余分な空行 ❌
  </document>
```

---

## 3. 修正・追加が必要なファイル一覧

| # | ファイル | 変更種別 | 変更内容の概要 |
|---|---------|---------|--------------| 
| 1 | `backend/src/utils/maimlDataWriter.ts` | 修正 | `appendOwnerToDocument()`: `<owner>` インデント 2sp→4sp、`<name>` 4sp→6sp、`</owner>` 2sp→4sp に修正。`</document>` 前の余分な空行を除去 |

**変更ファイル数**: 1ファイル（1箇所）

---

## 4. 実装内容の説明

`appendOwnerToDocument()` の2点を修正する。

1. **インデント修正**: `ownerXml` の各行のスペース数を正しい値に変更
2. **余分な空行除去**: `replace()` の置換文字列から余分な `\n` を削除

```typescript
// 修正前
const ownerXml = [
  `  <owner id="${escapeXml(ownerId)}">`,
  `    <name>${escapeXml(ownerName)}</name>`,
  `  </owner>`,
].join('\n');

return maimlContent.replace(
  /(\s*)<\/document>/,
  `\n${ownerXml}\n$1</document>`  // \n が1個余分
);

// 修正後
const ownerXml = [
  `    <owner id="${escapeXml(ownerId)}">`,      // 4スペース ✅
  `      <name>${escapeXml(ownerName)}</name>`,  // 6スペース ✅
  `    </owner>`,                                 // 4スペース ✅
].join('\n');

return maimlContent.replace(
  /(\s*)<\/document>/,
  `\n${ownerXml}$1</document>`  // 余分な \n を削除（$1 に改行が含まれる）✅
);
```

---

## 5. 修正前/修正後の機能フロー図

### 修正前

```
appendOwnerToDocument(maimlContent, ownerId, ownerName)
│
├── ownerXml を組み立て
│     "  <owner id=\"xxx\">"      ← 2スペース ❌
│     "    <name>...</name>"      ← 4スペース ❌
│     "  </owner>"                ← 2スペース ❌
│
└── maimlContent.replace(/(\s*)<\/document>/, "\n{ownerXml}\n$1</document>")
      $1 = "\n  "（改行+2スペース）
      ↓
      出力: "...\n  <owner...>...\n  </owner>\n\n  </document>"
                                               ↑ 余分な空行 ❌
```

### 修正後

```
appendOwnerToDocument(maimlContent, ownerId, ownerName)
│
├── ownerXml を組み立て
│     "    <owner id=\"xxx\">"      ← 4スペース ✅
│     "      <name>...</name>"      ← 6スペース ✅
│     "    </owner>"                ← 4スペース ✅
│
└── maimlContent.replace(/(\s*)<\/document>/, "\n{ownerXml}$1</document>")
      $1 = "\n  "（改行+2スペース）
      ↓
      出力: "...\n    <owner...>...\n    </owner>\n  </document>"
                                                 ↑ 余分な空行なし ✅
```

---

## 6. 影響範囲の分析

| 影響範囲 | 詳細 |
|---------|------|
| `appendOwnerToDocument()` を呼び出す箇所 | `maimlWriterService.ts` の `writeDataAndEventLog()` / `writeEventLogOnly()` / `appendOwnerToDocument()` メソッドの3箇所 |
| フロントエンドへの影響 | なし（バックエンドのXML生成ロジックのみ） |
| UIの変更 | なし |
| 実験記録タブへのMAIML保存 | なし |
| 認証・認可への影響 | なし |
| データ保護への影響 | なし |
| マルチテナント分離への影響 | なし |

---

## 7. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `$1` の内容が想定外（改行を含まない場合）の動作変化 | 低 | 低 | `<document>` は常に `\n  </document>` の形式で存在するため `$1 = "\n  "` は確実。万一 `$1` が空の場合も `\n{ownerXml}</document>` となり破損しない |
| 既存MAIMLの `</document>` 直前に空行が既にある場合 | 低 | 低 | `replace()` は最初のマッチのみ置換するため、既存空行には影響しない |

---

## 8. テスト計画

### ビルド確認
- [ ] バックエンド TypeScript ビルドエラーがないこと（`cd backend && npx tsc --noEmit`）

### 手動確認ポイント
- [ ] 承認・訂正完了後のMAIMLで `<owner>` が `<document>` 直下に4スペースインデントで出力されること
- [ ] `<owner>` 内の `<name>` が6スペースインデントで出力されること
- [ ] `</document>` 直前に余分な空行が挿入されないこと

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-30 16:00
- **承認日時**: 2026-09-30（承認済み・Act モード移行）
- **承認者コメント**: 承認済み

---

## 10. 実施記録

### 実施日時
開始: 2026-09-30 16:00
完了: 2026-09-30 16:00

### 変更ファイル
1. `backend/src/utils/maimlDataWriter.ts` — `appendOwnerToDocument()` の `<owner>` インデントを 2sp→4sp・`<name>` 4sp→6sp・`</owner>` 2sp→4sp に修正、かつ `</document>` 前の余分な `\n` を除去

### 最終的な成果物
- [x] `backend/src/utils/maimlDataWriter.ts` 修正完了
- [x] TypeScript ビルドエラーなし（`npx tsc --noEmit` exit code 0 ✅）
