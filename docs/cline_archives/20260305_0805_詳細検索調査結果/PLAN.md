# タスク計画書: 詳細検索 Reference版仕様の取り込み

## メタデータ
- **作成日時**: 2026-03-05 08:17
- **タスクID**: 詳細検索_reference_仕様取り込み
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

詳細検索（ProjectSearchModal）について、REPORT.mdで把握したReference版仕様とmmdpf版の差異を解消する。
主な変更点は以下の2点：
1. JSONB配列の完全一致検索 → 部分一致検索（ILIKE）に変更
2. 検索条件のOR結合への変更（Reference版の仕様）

## 目的と期待される成果

- [ ] `id`, `ref`, `key`, `element`, `value`, `units`, `section_type`, `measurement_value` で部分一致検索が動作する
- [ ] 例: `place` と入力すると `place_01`, `place_02` などを含むプロジェクトがヒットする

## 実装ステップ

### Phase 1: バックエンドのJSONB検索方式変更
- [ ] `fileMetadataRepository.ts` の `searchByMaimlMetadata()` を修正
  - JSONB `@>` 完全一致 → `jsonb_array_elements_text()` + ILIKE 部分一致
  - 検索条件結合方式の確認（AND→ORへの変更要否はユーザーに確認）

### Phase 2: 動作確認
- [ ] バックエンドのビルドエラーがないこと確認

## 変更ファイル

1. `backend/src/repositories/fileMetadataRepository.ts` - JSONB検索方式変更

## 承認確認事項

**OR結合 vs AND結合について**:
- Reference版: OR結合（どれか1つの条件に一致すればヒット）
- mmdpf版現行: AND結合（全条件に一致するもののみヒット）

**→ どちらの仕様にしますか？**
- A. Reference版に合わせてOR結合にする
- B. AND結合のまま維持する（絞り込み検索として有用）

部分一致（ILIKE）への変更は確定で進めます。

## 承認記録
- **計画書提示日時**: 2026-03-05 08:17
