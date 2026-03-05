# タスク計画書: getMaimlFileContent 組織ID抽出ロジック修正

## メタデータ
- **作成日時**: 2026-03-04 15:46
- **タスクID**: getMaimlFileContent-orgId-fix
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`backend/src/services/maimlService.ts` の `getMaimlFileContent` 関数内で、
`fileKey` から組織IDを抽出する正規表現が旧仕様（`org_xxx/` プレフィックス）に基づいているため、
新仕様（最初の `/` までの部分が組織ID = UUID形式）に合わせて修正する。

## 目的と期待される成果

### 目的
S3/Swiftのファイルパスから組織IDを抽出する処理が、現行の仕様（組織プレフィックスなし・UUIDが組織ID）に対応していないため、正しく動作するよう修正する。

### 期待される成果
- [ ] `getMaimlFileContent` が新仕様の `fileKey` 形式で正しく組織IDを抽出できる

## 変更前後の比較

### 変更前（旧仕様）
```
fileKey = "org_maiml_lab_001/projects/sample/sample.maiml"
正規表現: /^org_([^/]+)\//
→ orgMatch[0] = "org_maiml_lab_001/"
→ organizationPrefix = "org_maiml_lab_001/"
→ relativePath = "projects/sample/sample.maiml"
```

### 変更後（新仕様）
```
fileKey = "550e8400-e29b-41d4-a716-446655440000/projects/sample/sample.maiml"
ロジック: 最初の "/" の位置でスプリット
→ organizationId = "550e8400-e29b-41d4-a716-446655440000"
→ relativePath = "projects/sample/sample.maiml"
```

## 実装ステップ
- [x] `getMaimlFileContent` 関数の組織ID抽出ロジックを修正する
- [x] タスク計画書の実施記録を更新する

## 変更ファイル
1. `backend/src/services/maimlService.ts` - `getMaimlFileContent` 関数内の組織ID抽出ロジック修正

## リスク
| リスク | 対策 |
|--------|------|
| `fileKey` に `/` が含まれない場合のエラー | スラッシュが存在しない場合のバリデーションを追加する |

## テスト計画
- [ ] `fileKey = "550e8400-e29b-41d4-a716-446655440000/projects/sample/sample.maiml"` で正しく動作することを確認
- [ ] スラッシュが含まれない不正な `fileKey` でエラーになることを確認

## 承認記録
- **計画書提示日時**: 2026-03-04 15:46
- **承認日時**: 2026-03-04 15:46（ユーザー指示により実施）

## 実施記録

### 実施日時
開始: 2026-03-04 15:46
完了: -

### 最終的な成果物
- [ ] `getMaimlFileContent` 関数の修正完了
