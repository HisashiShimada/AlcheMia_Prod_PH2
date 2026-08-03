# タスク計画書: 名前空間Repository修正

## メタデータ
- **作成日時**: 2026-07-27 09:00
- **タスクID**: 名前空間Repository修正
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

`backend/src/repositories/namespaceTermRepository.ts` が実DBスキーマと乖離しており、
`namespace` テーブルに存在しない `prefix` カラムを参照している。
正しい3テーブル構成（`namespace` / `prefix` / `namespace_term`）に合わせて修正する。

## 目的と期待される成果

### 目的
- Repositoryコードを実際のDBスキーマに準拠させ、実行時エラーを解消する

### 期待される成果
- [ ] `namespaceTermRepository.ts` の各関数が実DBの正しいカラム・テーブルを参照する
- [ ] 型定義が実DBのカラム名と一致する

## 正しいテーブル構造（実DB）

```
namespace     (organization_id, namespace_id)
  - uri, scope_key, global_flg

    ↑FK (organization_id, namespace_id)
prefix        (organization_id, namespace_id, prefix)
  - prefix, description, is_active

    ↑FK (organization_id, namespace_id, prefix)
namespace_term(organization_id, namespace_id, prefix, localname)
  - localname, units, xsi_type, is_active, display_name, description
```

## 修正内容詳細

### 関数ごとの修正方針

| 関数 | 現在の問題 | 修正後 |
|---|---|---|
| `createNamespace()` | `namespace`テーブルに`prefix`等の存在しないカラムへINSERT | `namespace`INSERT後、`prefix`テーブルにもINSERT（2テーブル操作） |
| `existsNamespace()` | `WHERE prefix = $2` on namespace → カラムなし | `prefix`テーブルで `WHERE organization_id=$1 AND prefix=$2` |
| `findNamespacesByOrganization()` | `SELECT prefix, uri FROM namespace` → prefixカラムなし | `prefix p JOIN namespace n` でJOIN取得 |
| `removeNamespace()` | `WHERE prefix = $2` on namespace → カラムなし | `prefix`テーブルからDELETE |
| `findDeclarationsByProjectScope()` | `scope_key AS prefix` → scope_keyをprefixとして誤用 | `prefix` JOIN `namespace` の正規JOINに変更 |
| `NamespaceTerm`型 | `local_name`, `type_hint`, `unit_hint` → 実DBと乖離 | `localname`, `xsi_type`, `units` に修正 |
| `create()` | `local_name`, `type_hint`, `unit_hint`カラム名 | `localname`, `xsi_type`, `units`に修正 |
| `update()` | `local_name`, `type_hint`, `unit_hint`カラム名 | `localname`, `xsi_type`, `units`に修正 |
| `remove()` | `local_name`カラム名 | `localname`に修正 |

### 型定義の修正

**現在（誤）:**
```typescript
export interface NamespaceTerm {
  local_name: string;      // 実DBは localname
  type_hint: string | null; // 実DBは xsi_type
  unit_hint: string | null; // 実DBは units
}
```

**修正後（正）:**
```typescript
export interface NamespaceTerm {
  localname: string;       // 実DBに準拠
  xsi_type: string | null; // 実DBに準拠
  units: string | null;    // 実DBに準拠
  is_active: boolean;      // 実DBにあるが現在の型定義にない
}
```

## 変更ファイル

1. `backend/src/repositories/namespaceTermRepository.ts` - 修正

## リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| Controllerの呼び出し側との不整合 | 中 | `namespaceController.ts`の呼び出しも確認し必要なら修正 |
| `namespace_term`のカラム名変更による`create()`/`update()`の影響 | 中 | フロントエンドのAPIレスポンス形式が変わらないよう、APIレスポンス変換は維持する |

## テスト計画
- [ ] `createNamespace()` が `namespace` + `prefix` 両テーブルに正しくINSERTすること
- [ ] `existsNamespace()` が `prefix` テーブルで存在確認すること
- [ ] `findNamespacesByOrganization()` が正しく `prefix + uri` を返すこと
- [ ] `removeNamespace()` が `prefix` テーブルからDELETEすること

## 承認記録
- **計画書提示日時**: 2026-07-27 09:00
- **承認日時**: 2026-07-27 09:02
