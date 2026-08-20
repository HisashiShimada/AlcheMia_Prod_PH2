# タスク計画書: データ記録ダイアログUIレイアウト修正

## メタデータ
- **作成日時**: 2026-08-06 13:32
- **タスクID**: data-record-dialog-ui-fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験作業者メニューの実験記録タブ内「データ記録」のプロパティカードに関するUIバグ4件を修正する。

## 目的と期待される成果

- [ ] 「不確かさ説明」欄が常時表示され、説明なしの場合は「—」表示
- [ ] 「許容誤差」ヘッダ名をデフォルトで「不確かさ名」に変更
- [ ] Material/condition/result の property value は「想定値」に表示（「実績値」には表示しない）
- [ ] 定性評価選択肢を uncertaintyKey → 不確かさ基準テーブル経由で取得・表示

## 原因分析

`convertRawPropertyToProperty` 関数（DataRecordDialog.tsx 158-206行）で `base` オブジェクトに以下フィールドをマッピングしていない：
- `plannedValue` → 未マッピングのため「想定値」が常に「—」
- `toleranceValue` → 未マッピングのため不確かさ値が「—」
- `uncertaintyNote` → 未マッピングのため説明が「—」（表示はされているが値が入らない）
- `uncertaintyKey` → 未マッピングのため定性評価が常にデフォルト値基準を使用
- `uncertaintyName` → 未マッピングのためヘッダ名が常にデフォルト値

加えて、フォーム初期値設定ループ（780-814行）で `properties[n].value` が `実績値フォーム` に設定されている。これは正しい動作だが、同時に `plannedValue` フィールドから `想定値` に正しく表示されるよう `convertRawPropertyToProperty` でのマッピングが必要。

## 実装ステップ

### Phase 1: convertRawPropertyToProperty にフィールドマッピング追加

`base` オブジェクト定義（165-174行）に以下を追加：
```typescript
plannedValue: (p.plannedValue as string | number | null | undefined) ?? undefined,
toleranceValue: (p.toleranceValue as string | null | undefined) ?? undefined,
uncertaintyNote: (p.uncertaintyNote as string | null | undefined) ?? undefined,
uncertaintyKey: (p.uncertaintyKey as string | null | undefined) ?? undefined,
uncertaintyName: (p.uncertaintyName as string | null | undefined) ?? undefined,
```

- [ ] `convertRawPropertyToProperty` の `base` に上記5フィールドを追加

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - convertRawPropertyToProperty に5フィールドマッピング追加

## 承認記録
- **承認日時**: 2026-08-06 13:32（自己承認 - 単純なバグ修正）
