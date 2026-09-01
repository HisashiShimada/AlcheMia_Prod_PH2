# タスク計画書: DataRecordDialog convertRawPropertyToProperty フィールドマッピング追加

## メタデータ
- **作成日時**: 2026-08-23 16:12
- **タスクID**: DataRecordDialog_convertRawProperty修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

`DataRecordDialog.tsx` の `convertRawPropertyToProperty` 関数で、バックエンドから受け取る
`plannedValue`・`toleranceValue`・`uncertaintyNote`・`uncertaintyKey`・`uncertaintyName`・
`qualitativeOptions`・`qualitativeEval`・`qualitativeNote` の8フィールドが
`base` オブジェクトにマッピングされていないバグを修正する。

これにより以下の問題が発生している：
- カードの「想定値」が常に「—」になる（plannedValue 未マッピング）
- 「不確かさ値」ヘッダが常にデフォルトになる（uncertaintyName 未マッピング）
- 「不確かさ説明」セルが常に「—」になる（uncertaintyNote 未マッピング）
- 定性評価の選択肢が常にデフォルトになる（qualitativeOptions 未マッピング）

## 目的と期待される成果

- [ ] plannedValue がカードの「想定値」セルに表示される
- [ ] uncertaintyName がカードの「不確かさ値」ヘッダに反映される
- [ ] uncertaintyNote がカードの「不確かさ説明」セルに表示される
- [ ] qualitativeOptions が DB 取得の選択肢として使用される
- [ ] qualitativeEval が定性評価の初期選択値として反映される
- [ ] qualitativeNote が定性評価タイトル右横の説明として表示される

## 実装ステップ

### Phase 1: convertRawPropertyToProperty の base オブジェクトに8フィールドを追加

`frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` の
`convertRawPropertyToProperty` 関数内の `base` オブジェクト（160〜169行付近）に以下を追加：

```typescript
plannedValue: (p.plannedValue as string | number | null | undefined) ?? undefined,
toleranceValue: (p.toleranceValue as string | null | undefined) ?? undefined,
uncertaintyNote: (p.uncertaintyNote as string | null | undefined) ?? undefined,
uncertaintyKey: (p.uncertaintyKey as string | null | undefined) ?? undefined,
uncertaintyName: (p.uncertaintyName as string | null | undefined) ?? undefined,
qualitativeOptions: Array.isArray(p.qualitativeOptions)
  ? (p.qualitativeOptions as string[])
  : [],
qualitativeEval: (p.qualitativeEval as string | null | undefined) ?? undefined,
qualitativeNote: (p.qualitativeNote as string | null | undefined) ?? undefined,
```

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
   - `convertRawPropertyToProperty` の `base` オブジェクトに8フィールドを追加

## リスク

| リスク | 対策 |
|--------|------|
| qualitativeOptions の型が QualitativeOptionRow[] の可能性 | フロントの Property 型は string[] なので変換が必要か確認 |

## 承認記録
- **承認日時**: 2026-08-23 16:12
