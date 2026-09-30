# タスク計画書: MaiMLファイルのインデント修正（`<parent>` / `<data>` / `<eventLog>`）

## メタデータ
- **作成日時**: 2026-09-30 14:30
- **タスクID**: 20260930_1430_MaiMLインデント修正
- **優先度**: 高
- **推定工数**: 0.5h

---

## 1. タスク概要

MAIMLファイルが更新された際に、以下の3要素でインデントが誤っている問題を修正する。

| 問題要素 | 原因関数 | ファイル |
|---------|---------|---------|
| `<parent>` | `updateDocumentUuidAndParent()` | `backend/src/utils/maimlDataWriter.ts` |
| `<eventLog>` | `buildEventLogXML()` 空ケース | `backend/src/utils/maimlDataWriter.ts` |
| `<data>` 内 `<results>` | `appendResultsToData()` | `backend/src/utils/maimlDataWriter.ts` |

---

## 2. 原因調査

### ① `<parent>` インデントが誤っている原因

**ファイル**: `backend/src/utils/maimlDataWriter.ts` — `updateDocumentUuidAndParent()` 関数（L1190-1193）

MAIMLの正しい構造は以下の通り（`<document>` は maiml 直下 = 2スペース、その子要素は 4スペース）:
```xml
  <document id="...">
    <name>...</name>
    <uuid>new-uuid</uuid>
    <parent>              ← 4スペース（document直下）
      <uuid>old</uuid>   ← 6スペース（parent直下）
    </parent>             ← 4スペース
    <date>...</date>
  </document>
```

現状コード（L1192）が生成するインデント（❌ 誤り）:
```
    <uuid>new-uuid</uuid>
  <parent>               ← 2スペース（❌）
    <uuid>old</uuid>     ← 4スペース（❌）
  </parent>              ← 2スペース（❌）
```

**根本原因**: L1192 の文字列リテラル内で `\n  <parent>` と **2スペース** が使用されているが、  
`<document>` 直下要素は **4スペース** が正しい。

---

### ② `<eventLog>` インデントが誤っている原因

**ファイル**: `backend/src/utils/maimlDataWriter.ts` — `buildEventLogXML()` の空ケース（L278）

通常ケース（L295）は正しく2スペースのインデントで始まる:
```typescript
let xml = `  <eventLog id="...">`;  // ✅ 2スペース
```

しかし空ケース（L278）はインデントなし:
```typescript
`<eventLog id="...">`,  // ❌ 0スペース
```

置換後のMAIMLで `  <eventLog>` が `<eventLog>` になり先頭インデントが消える。

**根本原因**: 空ケースの return 配列先頭要素に **2スペースのインデントが欠落** している。

---

### ③ `<data>` 内 `<results>` インデントが誤っている原因

**ファイル**: `backend/src/utils/maimlDataWriter.ts` — `appendResultsToData()` 関数（L975）

元のMAIML内の該当箇所:
```
    </results>
  </data>               ← "  " + "</data>" として存在
```

現状コード（L975）:
```typescript
return maimlContent.replace(/<\/data>/i, `${toAppend}  </data>`);
// ↑ "<\/data>" のみマッチ（前の "  " は残留）
// → "  " (残留) + "    <results>..." (toAppend) が連結 = 6スペース ❌
```

**根本原因**: 正規表現 `/<\/data>/i` が `</data>` のみにマッチし、  
**前の空白（`  `）を含まない**ため toAppend の前にそのまま残りインデントがずれる。

---

## 3. 修正前/修正後の機能フロー図

### 修正前
```
MAIMLファイル更新処理（writeDataAndEventLog / writeEventLogOnly 等）
│
├── updateDocumentUuidAndParent()
│     └── 挿入文字列: \n  <parent>\n    <uuid>...\n  </parent>
│                         ↑2sp(❌)      ↑4sp(❌)    ↑2sp(❌)
│
├── buildEventLogXML([]) ← ログが空のとき
│     └── 先頭要素: `<eventLog id="...">` ← インデントなし(❌)
│           ↓ replaceEventLogInMaiml で "  <eventLog>" と置換
│           → インデントが消える
│
└── appendResultsToData()
      └── replace(/<\/data>/i, `${toAppend}  </data>`)
            ↑ "  </data>" の "  " が残留
            → "  " + "    <results>" = 6スペース(❌)
```

### 修正後
```
MAIMLファイル更新処理（writeDataAndEventLog / writeEventLogOnly 等）
│
├── updateDocumentUuidAndParent()
│     └── 挿入文字列: \n    <parent>\n      <uuid>...\n    </parent>
│                           ↑4sp(✅)        ↑6sp(✅)     ↑4sp(✅)
│
├── buildEventLogXML([]) ← ログが空のとき
│     └── 先頭要素: `  <eventLog id="...">` ← 2スペース付き(✅)
│           ↓ replaceEventLogInMaiml で "  <eventLog>" と一致
│           → インデントが正しく維持される
│
└── appendResultsToData()
      └── replace(/\n[ \t]*<\/data>/i, `\n${toAppend}  </data>`)
            ↑ 改行+前空白ごとマッチして除去
            → "    <results>..." = 4スペース(✅)
```

---

## 4. 修正・追加が必要なファイル一覧

| # | ファイル | 変更種別 | 変更内容の概要 |
|---|---------|---------|--------------|
| 1 | `backend/src/utils/maimlDataWriter.ts` | 修正 | `updateDocumentUuidAndParent()`: `<parent>` インデントを 2sp→4sp、子 `<uuid>` を 4sp→6sp に修正 |
| 2 | `backend/src/utils/maimlDataWriter.ts` | 修正 | `buildEventLogXML()` 空ケース: `<eventLog>` 先頭に 2スペースを追加 |
| 3 | `backend/src/utils/maimlDataWriter.ts` | 修正 | `appendResultsToData()`: `</data>` 置換正規表現を改行・前空白も含む形に修正 |

**変更ファイル数**: 1ファイル（3箇所）

---

## 5. 実装ステップ

- [x] Step 1: タスクフォルダ・PLAN.md 作成
- [x] Step 2: `updateDocumentUuidAndParent()` の `<parent>` インデント修正
- [x] Step 3: `buildEventLogXML()` 空ケースの `<eventLog>` インデント修正
- [x] Step 4: `appendResultsToData()` の `</data>` 正規表現修正
- [x] Step 5: バックエンド TypeScript ビルド確認（`npx tsc --noEmit` → exit code 0 ✅）

---

## 6. 影響範囲の分析

- `updateDocumentUuidAndParent()` → `writeDataAndEventLog()` / `writeEventLogOnly()` / `writeExperimentPlanProperties()` / `qualityEvaluationMaimlService.ts` から呼ばれる
- `buildEventLogXML()` → 上記メソッドと `qualityEvaluationMaimlService.ts` から呼ばれる
- `appendResultsToData()` → `writeDataAndEventLog()` / `writeExperimentPlanProperties()` から呼ばれる
- **フロントエンドへの影響なし**（バックエンドのXML生成ロジックのみ）
- **UIの変更なし**
- **実験記録タブへのMAIML保存なし**

---

## 7. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `appendResultsToData()` の正規表現変更で既存MAIMLで誤マッチ | 低 | 低 | `\n[ \t]*` は改行+任意空白のみマッチ。`</data>` は必ず改行の後に空白付きで存在するため問題なし |
| `<parent>` インデント変更で既存の除去ロジックと不整合 | 低 | 低 | 除去正規表現 `/<parent>[\s\S]*?<\/parent>\n?/g` はインデントに依存しないため影響なし |

---

## 8. テスト計画

### ビルド確認
- [ ] バックエンド TypeScript ビルドエラーがないこと（`cd backend && npx tsc --noEmit`）

### 手動確認ポイント
- [ ] チェックアウト後のMAIMLで `<parent>` が `<document>` 直下に4スペースインデントで出力されること
- [ ] 空ログ時の `<eventLog>` が2スペースインデントで出力されること
- [ ] `appendResultsToData()` 後の `<results>` が4スペースインデントで出力されること

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-30 14:30
- **承認日時**: 2026-09-30 （承認済み・Act モード移行）
- **承認者コメント**: 承認済み

---

## 10. 実施記録

### 実施日時
開始: 2026-09-30 14:30

### 変更ファイル
1. `backend/src/utils/maimlDataWriter.ts` - 4箇所のインデント修正（`<date>` インデントずれ追加修正含む）

### 追加修正（`<date>` インデントずれ）

**問題**: 2回目以降のMAIML更新時、`<parent>` 除去正規表現が手前の行頭インデントを含まないため、
除去後に孤立した空白が残り `<date>` 等の後続要素のインデントがずれる。

```diff
- result = result.replace(/<parent>[\s\S]*?<\/parent>\n?/g, '');
+ result = result.replace(/[ \t]*<parent>[\s\S]*?<\/parent>\n?/g, '');
```

`[ \t]*` を追加し手前のインデントごと除去することで修正。
