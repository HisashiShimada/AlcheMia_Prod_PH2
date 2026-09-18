# タスク計画書: toSupervisorKey 変換ロジック修正（コロンなし対応 + namespace_term 存在チェック）

## メタデータ
- **作成日時**: 2026-09-18
- **タスクID**: 20260918_toSupervisorKey修正
- **優先度**: 高
- **推定工数**: 1.5時間以内

---

## 1. タスク概要

`buildPlannedValuesResultsXML` 内の `toSupervisorKey()` に以下2点の修正を加える。

1. **コロンなし用語**: 現在は `propKey` をそのまま返しているが、`SupervisorDirective{propKey}` を返すよう変更する
2. **prefix 付き用語の存在チェック**: 変換後のキー（`{prefix}:SupervisorDirective{localName}`）が `namespace_term` テーブルに存在する場合のみ出力する（存在しない場合はスキップ）

---

## 2. 修正仕様

### 2-1. コロンなし用語の変換

```
変更前: colonIdx <= 0 の場合 → propKey をそのまま返す
変更後: colonIdx <= 0 の場合 → "SupervisorDirective" + propKey を返す
```

### 2-2. prefix 付き用語の namespace_term 存在チェック

変換後キー `{prefix}:SupervisorDirective{localName}` が `namespace_term` テーブルに
存在しない場合は、その property は `<results>` に出力しない。

**チェック方法（xmlns 解析ベース）**:

1. `writeExperimentPlanProperties()` 内で既にダウンロード済みの `maimlContent` から
   `<maiml>` タグの `xmlns:prefix="URI"` 宣言を正規表現で解析し、
   `{ [prefix: string]: string }` の URI マップを構築する

2. `findNamespacesByOrganization(organizationId)` で DB 上の `{ prefix, uri }` 一覧を取得する

3. **MAIML の xmlns 宣言に含まれる URI** と **DB の prefix → URI** を照合し、
   「MAIML で宣言されている URI に対応する DB prefix のセット」を特定する

   ```
   例（MaimlTagサンプルより）:
     MAIML xmlns宣言:
       xmlns:condition="https://ORG001-AIML.Alchemia.co.jp/test_group"
       xmlns:material="https://ORG001-AIML.Alchemia.co.jp/test_group"
       xmlns:result="https://ORG001-AIML.Alchemia.co.jp/test_group"
       xmlns:test="https://ORG001-AIML.Alchemia.co.jp/test_group"
     ↓ MAIMLのURI集合: { "https://ORG001-AIML.Alchemia.co.jp/test_group" }
     DB prefix行: material, condition, result, test → 全て同一URI
     → 有効なDB prefixセット: { material, condition, result, test }
   ```

   > **重要**: 同一 URI に複数 prefix が紐づく場合（サンプルの condition/material/result/test が全て
   > 同一 URI の例）は全て有効な prefix として扱う。

4. 有効な prefix 群 × `SupervisorDirective` 始まりの用語を `findAllByOrganization` で取得し、
   その `qname`（`{prefix}:SupervisorDirective{localName}`）セットを構築する

5. `buildPlannedValuesResultsXML()` に `validSupervisorKeySet?: Set<string>` として渡す

6. 関数内でセットに含まれる場合のみ出力（セットが未指定の場合は全件出力・後方互換維持）

---

## 3. 設計方針

`buildPlannedValuesResultsXML` は `utils/` の純粋ユーティリティ関数のため、
DB アクセスを直接持たせない。

- DB 取得は `maimlWriterService.ts`（呼び出し側）で行う
- 既に `maimlWriterService.ts` は `namespaceTermRepository` の
  `findDeclarationsByProjectScope`・`findProjectGroupCd` を import 済み
- 追加で `findAllByOrganization`・`findNamespacesByOrganization` を同 repository から import する
- MAIML の xmlns 解析ロジックはピュアな正規表現処理のため
  `maimlWriterService.ts` 内に inline で実装する
  （`injectNamespaceDeclarations()` 内で使用している既存パターンを参考）

---

## 4. 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/src/utils/maimlDataWriter.ts` | `toSupervisorKey()` のコロンなし処理を修正。`buildPlannedValuesResultsXML()` に `validSupervisorKeySet?` 引数追加。出力時に存在チェック |
| 2 | `backend/src/services/maimlWriterService.ts` | MAIML の xmlns 解析 + DB 照合で validSupervisorKeySet を構築して `buildPlannedValuesResultsXML()` に渡す |

---

## 5. 実装詳細

### Step 1: `maimlDataWriter.ts` — `toSupervisorKey` 修正

```typescript
// 変更前
function toSupervisorKey(propKey: string): string {
  const colonIdx = propKey.indexOf(':');
  if (colonIdx <= 0) return propKey;  // コロンなし → そのまま
  const prefix = propKey.slice(0, colonIdx);
  const localName = propKey.slice(colonIdx + 1);
  return `${prefix}:SupervisorDirective${localName}`;
}

// 変更後
function toSupervisorKey(propKey: string): string {
  const colonIdx = propKey.indexOf(':');
  if (colonIdx <= 0) return `SupervisorDirective${propKey}`;  // コロンなし → 先頭に付与
  const prefix = propKey.slice(0, colonIdx);
  const localName = propKey.slice(colonIdx + 1);
  return `${prefix}:SupervisorDirective${localName}`;
}
```

### Step 2: `maimlDataWriter.ts` — `buildPlannedValuesResultsXML` 引数追加・出力チェック

```typescript
// シグネチャ変更
export function buildPlannedValuesResultsXML(
  experimentPlans: ExperimentPlan[],
  dataId: string = 'dataID',
  existingUuids?: Map<string, string>,
  validSupervisorKeySet?: Set<string>  // 追加: prefix 付き変換後キーの存在チェック用
): string

// 出力箇所の変更（entries ループ内）
for (const { propKey, value } of entries) {
  const outputKey = toSupervisorKey(propKey);
  // prefix 付き用語（コロンあり）は validSupervisorKeySet でチェック
  const colonIdx = propKey.indexOf(':');
  if (colonIdx > 0 && validSupervisorKeySet && !validSupervisorKeySet.has(outputKey)) {
    // namespace_term に変換後キーが存在しない → スキップ
    continue;
  }
  dataXml += `        <property key="${escapeXml(outputKey)}" xsi:type="stringType">\n`;
  dataXml += `          <value>${escapeXml(value)}</value>\n`;
  dataXml += `        </property>\n`;
}
```

### Step 3: `maimlWriterService.ts` — xmlns 解析 + DB 照合で validSupervisorKeySet を構築

import に追加:
```typescript
import {
  findDeclarationsByProjectScope,
  findProjectGroupCd,
  findAllByOrganization,        // 追加
  findNamespacesByOrganization, // 追加
} from '../repositories/namespaceTermRepository';
```

`writeExperimentPlanProperties()` の Step5（existingUuids取得後）〜Step6の間に追加:

```typescript
// --- 5.5. MAIML xmlns 解析 + DB 照合 → validSupervisorKeySet 構築 ---
// 1. MAIML の xmlns:prefix="URI" を解析
const maimlTagRawMatch = maimlContent.match(/<maiml[\s\S]*?>/);
const xmlnsUriMap: Record<string, string> = {};
if (maimlTagRawMatch) {
  const xmlnsPattern = /xmlns:([a-zA-Z0-9_.-]+)="([^"]*)"/g;
  let xmlnsMatch: RegExpExecArray | null;
  while ((xmlnsMatch = xmlnsPattern.exec(maimlTagRawMatch[0])) !== null) {
    xmlnsUriMap[xmlnsMatch[1]] = xmlnsMatch[2];
  }
}
const maimlUriSet = new Set<string>(Object.values(xmlnsUriMap));

// 2. DB から組織の全 prefix → URI と全用語を並列取得
const [dbNamespaces, allTerms] = await Promise.all([
  findNamespacesByOrganization(organizationId),
  findAllByOrganization(organizationId),
]);

// 3. MAIML の URI セット内に存在する URI を持つ DB prefix を収集
//    同一URIに複数prefixが紐づく場合（例: material/condition/result/testが同一URI）は全て有効
const validPrefixSet = new Set<string>(
  dbNamespaces
    .filter((ns) => maimlUriSet.has(ns.uri))
    .map((ns) => ns.prefix)
);

// 4. 有効 prefix に属する SupervisorDirective 系用語の qname セット
const validSupervisorKeySet: Set<string> | undefined =
  validPrefixSet.size > 0
    ? new Set<string>(
        allTerms
          .filter(
            (t) =>
              t.localName.startsWith('SupervisorDirective') &&
              validPrefixSet.has(t.prefix)
          )
          .map((t) => t.qname) // "{prefix}:{localName}" 形式
      )
    : undefined;
// validPrefixSet が空（xmlns なし or DB 未登録）→ undefined でチェックスキップ

// --- 6. planned_values から <data> XML を生成 ---
const plannedDataXml = buildPlannedValuesResultsXML(
  experimentPlans,
  dataId,
  existingUuids,
  validSupervisorKeySet
);
```

---

## 6. 処理フロー図

```
writeExperimentPlanProperties()
  ├─ Step 2: maimlContent ダウンロード
  ├─ Step 4: <data> ID 抽出
  ├─ Step 5: existingUuids 抽出
  │
  ├─ Step 5.5: validSupervisorKeySet 構築（今回追加）
  │   ├─ maimlContent から xmlns:prefix="URI" を正規表現抽出
  │   │     例: { material: "https://ORG001-.../test_group", condition: 同URI, ... }
  │   ├─ findNamespacesByOrganization + findAllByOrganization を並列取得
  │   ├─ MAIML URI セット ∩ DB URI → 有効 DB prefix セット
  │   │     例: { material, condition, result, test }（同一URI全て有効）
  │   └─ SupervisorDirective + 有効 prefix の qname セット
  │         例: { "material:SupervisorDirectivematerial1", ... }
  │
  ├─ Step 6: buildPlannedValuesResultsXML(plans, dataId, uuids, validSupervisorKeySet)
  │   └─ toSupervisorKey 変換後、validSupervisorKeySet でフィルタ出力
  │
  └─ Step 7〜9: MAIML 更新・アーカイブ・保存
```

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| namespace_term に SupervisorDirective 系用語が登録されていない場合に全件スキップ | 中 | 低 | `validSupervisorKeySet` が未指定の場合はチェックをスキップする設計 |
| MAIML の `<maiml>` タグに xmlns 宣言がない（古いファイル等）| 中 | 低 | `maimlUriSet` が空 → `validPrefixSet` も空 → `undefined` でチェックスキップ |
| 同一 URI に複数 prefix が存在する（サンプルで確認済み）| 低 | 高 | 全該当 prefix を validPrefixSet に含める設計で対応済み |
| コロンなし用語変換後のキーが namespace_term に存在しない | 低 | 低 | コロンなし用語はチェック対象外（prefix 付き用語のみチェック）|
| `findAllByOrganization` + `findNamespacesByOrganization` の DB アクセス増加 | 低 | 確実 | Promise.all で並列取得 |

---

## 8. テスト計画

- [ ] `cd backend && npx tsc --noEmit` がエラーなし
- [ ] MAIML に `xmlns:material="https://xxx"` があり DB に `material:SupervisorDirectivematerial1` が存在する → `<results>` に出力される
- [ ] MAIML で宣言されている URI に対応しない prefix の用語 → スキップされる
- [ ] MAIML に xmlns 宣言がない場合（`validSupervisorKeySet = undefined`）→ 全件出力（後方互換）
- [ ] コロンなし用語（例: `temperature`）は `SupervisorDirectivetemperature` として出力される
- [ ] 同一 URI に複数 prefix が紐づく場合 → 全 prefix の用語が有効として扱われる

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-18
- **承認日時**: ―
- **承認者コメント**: ―
