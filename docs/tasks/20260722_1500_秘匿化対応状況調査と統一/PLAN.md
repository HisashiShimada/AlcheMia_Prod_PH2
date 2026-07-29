# タスク計画書: 秘匿化対応状況調査と判定ロジック統一

## メタデータ
- **作成日時**: 2026-07-22 15:00
- **タスクID**: 20260722_1500_秘匿化対応状況調査と統一
- **優先度**: 中
- **推定工数**: 3時間

## 1. タスク概要

MAIMLガイドラインでは「グローバル要素と汎用データコンテナ（property/content）のみ秘匿化可能」と定義されている。
現行実装でこのガイドラインが取り込めているか調査し、矛盾しているハードコードリストをXSD動的解析ベースで統一する。

## 2. 目的と期待される成果

### 目的
- 秘匿化可否判定のロジックをXSD（仕様の信頼できる唯一の情報源）に基づいて統一する
- バックエンド・フロントエンドで矛盾した判定が起きないようにする

### 期待される成果
- [ ] 調査レポートの作成（不整合の詳細・XSD対応表）
- [ ] バックエンドのハードコード `ENCRYPTABLE_TAGS`（`maimlEncryptionXmlHelper.ts`）を `maimlSchemaHelper.ts` の XSD解析ベースに統一
- [ ] フロントエンドの `ENCRYPTABLE_TAGS`（`parseMaimlToEncryptionTree.ts`）をバックエンドAPIの`isEncryptable`フラグに依存する形に修正
- [ ] `place`/`transition`/`arc` が両実装で一貫して `isEncryptable: false` となることを確認

## 3. 実装ステップ

### Phase 1: 調査レポート作成
- [x] バックエンド・フロントエンドの判定ロジックを調査
- [x] XSD上の `encryptionGroup` 対応型を確認
- [ ] `docs/tasks/20260722_1500_秘匿化対応状況調査と統一/調査レポート.md` を作成

### Phase 2: バックエンド側の統一
- [ ] `maimlSchemaHelper.ts` に `getEncryptableElementNames()` 公開関数を追加（XSDから暗号化可能要素名を取得）
- [ ] `maimlEncryptionXmlHelper.ts` の誤った `ENCRYPTABLE_TAGS` ハードコードを廃止し `maimlSchemaHelper.ts` に統一
- [ ] `parseMaimlToEncryptionTree`（バックエンド版）が正しい `isEncryptable` フラグを返すことを確認

### Phase 3: フロントエンド側の統一
- [ ] `frontend/src/utils/parseMaimlToEncryptionTree.ts` の `ENCRYPTABLE_TAGS` をバックエンドAPIレスポンスの `isEncryptable` フラグで代替できるか確認
- [ ] `ENCRYPTABLE_TAGS` の内容をXSD動的解析結果と一致するよう修正（ハードコードが残る場合は明示的にコメントで根拠を記載）

### Phase 4: 動作確認
- [ ] `place`/`transition`/`arc` が `isEncryptable: false` になることを両実装で確認
- [ ] 既存テストの確認・更新

## 4. 変更ファイル

### 新規作成
1. `docs/tasks/20260722_1500_秘匿化対応状況調査と統一/調査レポート.md` - 調査結果まとめ

### 修正
1. `backend/src/utils/maimlSchemaHelper.ts` - `getEncryptableElementNames()` 公開関数を追加
2. `backend/src/utils/maimlEncryptionXmlHelper.ts` - 誤ったハードコード `ENCRYPTABLE_TAGS` を `maimlSchemaHelper.ts` に統一
3. `frontend/src/utils/parseMaimlToEncryptionTree.ts` - `ENCRYPTABLE_TAGS` をXSD準拠の正しい内容に修正

## 5. 技術的詳細

### 「一番正しい実装」: `maimlSchemaHelper.ts`

```
XSD ファイル（backend/src/schemas/*.xsd）
  ↓ parseXsdFile() で xml2js 解析
  ↓ detectEncryptionGroupInChoice() で encryptionGroup の xs:choice 保有を判定
  ↓ 結果を SchemaCache にキャッシュ
isUpaViolation(targetPath) → XSDに基づく正確な判定
```

### 既存の矛盾点

| 実装箇所 | 問題 |
|---|---|
| `maimlEncryptionXmlHelper.ts` の `ENCRYPTABLE_TAGS` | `transition`, `place` を含む（XSD上はencryptionGroup非対応）|
| `frontend/.../parseMaimlToEncryptionTree.ts` の `ENCRYPTABLE_TAGS` | XSD解析と独立したハードコード（将来XSDが変わっても追従しない）|

## 6. リスク

| リスク | 対策 |
|---|---|
| `maimlSchemaHelper.ts` の `elementTypeMap` がトップレベル要素のみ対象で `property`/`content` の解決が不完全 | `getEncryptableElementNames()` を新設し、直接 `encryptionSupportedTypes` から全暗号化可能型のタグ名を返す補助関数で回避 |
| フロントエンドのモック用途の `parseMaimlToEncryptionTree.ts` が本番でも使われている場合に修正影響がある | 変更前に本番 API とモックの使い分けを確認してから修正する |

## 7. 承認記録
- **計画書提示日時**: 2026-07-22 15:00
- **承認日時**: 2026-07-22 15:00
