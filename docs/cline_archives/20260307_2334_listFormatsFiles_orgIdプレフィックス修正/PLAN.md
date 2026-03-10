# タスク計画書: listFormatsFiles 組織IDプレフィックス修正

## メタデータ
- **作成日時**: 2026-03-07 23:34
- **タスクID**: listFormatsFiles_orgId_fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`GET /api/v1/maiml/formats` が常に `{ "departments": [] }` を返すバグを修正する。

原因は `maimlService.ts` の `listFormatsFiles` 関数内のパス解析ロジックにあり、
`storageService.listFiles` が返す `key` に組織ID（UUID）プレフィックスが含まれているにも関わらず、
含まれていない前提で解析しているため、全件スキップされている。

---

## 調査結果

### 再現手順

```
GET http://localhost:3001/api/v1/maiml/formats
→ { "success": true, "data": { "departments": [] } }
```

S3には以下のファイルが存在する：
```
http://10.1.1.219:3002/mmdpf-files/a0718dc5-21f3-44e6-87e9-cc2ae83f3385/formats/DEP004/condition/condition.xml
```

### 根本原因

#### 1. `storageService.listFiles` が返す `key` の実際の値

```typescript
// storageService.ts の buildKey()
private buildKey(organizationId: string, filePath: string): string {
  return `${organizationId}/${normalizedPath}`;
  // 例: 'a0718dc5.../formats/'
}
```

`ListObjectsV2Command` が返す `Contents[].Key` は **組織IDプレフィックス付き** の完全キー：
```
a0718dc5-21f3-44e6-87e9-cc2ae83f3385/formats/DEP004/condition/condition.xml
```

`listFiles` はこのキーを **そのまま** `key` フィールドに格納して返す。

#### 2. `listFormatsFiles` の解析ロジックの誤り

`maimlService.ts` の解析コードは「**組織IDなしの相対パスを返す前提**」とコメントされているが、
実際は組織IDプレフィックスが付いたまま返ってくる：

```typescript
const parts = key.split('/');
// 実際の parts:
// parts[0] = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'  ← 組織ID (UUID)
// parts[1] = 'formats'
// parts[2] = 'DEP004'
// parts[3] = 'condition'
// parts[4] = 'condition.xml'

if (parts[0] !== 'formats') continue;  // ← 常に true → 全件スキップ！
```

`parts[0]` は `'formats'` ではなく組織ID（UUID）なので、**全ファイルがスキップ**される。
その結果 `departmentMap` は空のまま終わり、レスポンスの `departments: []` が返る。

#### 3. バグの影響フロー

```
storageService.listFiles('a0718dc5...', 'formats/')
  → S3から取得した key = 'a0718dc5.../formats/DEP004/condition/condition.xml'
  → parts[0] = 'a0718dc5...'  ← 組織ID

listFormatsFiles の解析:
  if (parts[0] !== 'formats') continue;  ← 全件スキップ！
  ↓
departmentMap = 空
  ↓
departments: []  ← 空のレスポンスが返る
```

---

## 修正内容

### 変更ファイル
1. `backend/src/services/maimlService.ts` - `listFormatsFiles` 関数のパス解析ロジック修正

### 修正前後の差分

```typescript
// ===== 修正前 =====
for (const file of allFiles) {
  const key: string = file.key || '';
  if (!key) continue;

  if (!key.toLowerCase().endsWith('.xml')) continue;

  // パスを分解: formats/{departmentCd}/{folderName}/{...}/{fileName}
  // storageService.listFiles が組織IDなしの相対パスを返す前提
  const parts = key.split('/');
  if (parts.length < 4) continue;
  if (parts[0] !== 'formats') continue;

  const departmentCd = parts[1];
  const folderName = parts[2];
  const fileName = parts[parts.length - 1];
  // ...
}

// ===== 修正後 =====
for (const file of allFiles) {
  const key: string = file.key || '';
  if (!key) continue;

  if (!key.toLowerCase().endsWith('.xml')) continue;

  // storageService.listFiles は組織IDプレフィックス付きの絶対パスを返す
  // 例: 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/formats/DEP004/condition/condition.xml'
  // → 組織IDプレフィックスを除去して相対パスに変換する
  const orgPrefix = `${organizationId}/`;
  const relativePath = key.startsWith(orgPrefix) ? key.slice(orgPrefix.length) : key;

  // パスを分解: formats/{departmentCd}/{folderName}/{...}/{fileName}
  const parts = relativePath.split('/');
  if (parts.length < 4) continue;
  if (parts[0] !== 'formats') continue;

  const departmentCd = parts[1];
  const folderName = parts[2];
  const fileName = parts[parts.length - 1];
  // ...
}
```

---

## 実装ステップ

- [x] Phase 1: PLAN.md 作成（本ファイル）
- [x] Phase 2: `maimlService.ts` の `listFormatsFiles` 関数を修正
- [ ] Phase 3: 動作確認（curl コマンドで API 呼び出し）

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 他の呼び出し元に影響 | 低 | 低 | `listFormatsFiles` は独立した関数で、変更は関数内のみ |
| 修正後も空リストが返る | 中 | 低 | S3上のパス構造を curl で確認して検証 |

## テスト計画

### 手動テスト
- [ ] `GET /api/v1/maiml/formats` を呼び出し、`departments` に DEP004 等が含まれることを確認
- [ ] `condition.xml` が `folders[].files` に含まれることを確認

## 承認記録
- **計画書提示日時**: 2026-03-07 23:34
- **承認日時**: 2026-03-07 23:37
