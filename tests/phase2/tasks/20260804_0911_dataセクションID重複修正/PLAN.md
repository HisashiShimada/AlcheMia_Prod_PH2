# タスク計画書: dataセクションID重複修正

## メタデータ
- **作成日時**: 2026-08-04 09:11
- **タスクID**: data_id_dedup_fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

MaiMLファイルの `<data>` セクションで生成される `<material>` / `<condition>` / `<result>` 要素の `id` 属性が、
`<protocol>/<pnml>` 内の `<place>` 要素の `id` 属性と同じ値（例: `material-1782799767371`）になっており、
Duplicate IDバリデーションエラーが発生している。

`buildDataXML()` で生成する instanceId に `data-` プレフィックスを付与し、重複を解消する。

## 変更ファイル

1. `backend/src/utils/maimlDataWriter.ts` - instanceId生成とresultsRef参照の修正

## 実装ステップ

- [ ] instanceId に `data-` プレフィックスを付与（150行目付近）
- [ ] `<eventLog>` の `<resultsRef ref="...">` も `data-` プレフィックスを付与（436行目付近）
