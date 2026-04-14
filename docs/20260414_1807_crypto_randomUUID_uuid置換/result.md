# 修正結果レポート: crypto.randomUUID → uuidv4() 置換

- **作業日時**: 2026-04-14 18:07〜18:20
- **対応者**: Cline

---

## 1. 問題の概要

JSビルド後のデプロイ環境で以下のエラーが発生。

```
crypto.randomUUID is not a function
```

`frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` をはじめとする複数ファイルで `crypto.randomUUID()` を使用していたことが原因。

---

## 2. 根本原因

`crypto.randomUUID()` は **Web Crypto API** のメソッドであり、**HTTPS（セキュアコンテキスト）環境でのみ利用可能**。

- HTTP 環境（開発・一部デプロイ環境）では `undefined` になり `TypeError` となる
- Next.js の SSR（サーバーサイド）や一部の Node.js バージョンでも未サポートの場合がある

---

## 3. 対応方針

`uuid` パッケージ（既に `node_modules` に存在）の `v4` 関数（`uuidv4`）に統一置換。

- `crypto.randomUUID()` → `uuidv4()`
- 各ファイルに `import { v4 as uuidv4 } from 'uuid';` を追加

---

## 4. 修正ファイル一覧

| ファイル | 置換箇所数 | 主な用途 |
|---|---|---|
| `frontend/src/utils/documentInitializer.ts` | 2件 | Document/Method ID生成 |
| `frontend/src/utils/documentParser.ts` | 複数件 | MAIMLパース時のID生成 |
| `frontend/src/components/Provider/OrganizationManagement.tsx` | 1件 | 組織管理画面のID生成 |
| `frontend/src/components/editorv2/components/PropertyPanel.tsx` | 複数件 | テンプレートのuuid生成 |
| `frontend/src/components/editorv2/components/FormatEditorDialog.tsx` | 複数件 | フォーマットエディタのuuid生成 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | 4件 | テンプレート仮ノードのuuid生成 |

※ `TemplateEditorDialog.tsx` は使用箇所が0件のため変更なし。

---

## 5. 変更内容の詳細（共通パターン）

### Before
```typescript
uuid: crypto.randomUUID(),
```

### After
```typescript
import { v4 as uuidv4 } from 'uuid';
// ...
uuid: uuidv4(),
```

---

## 6. 確認結果

プロジェクト全体（`frontend/src/**/*.ts`, `frontend/src/**/*.tsx`）で `crypto.randomUUID` の残存を検索した結果、**0件**を確認済み。

---

## 7. 補足

今後 UUID 生成が必要な場合は必ず `uuidv4()` を使用すること。`crypto.randomUUID()` は使用禁止とする。
