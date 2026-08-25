# タスク計画書: 想定値・不確かさ値・不確かさ説明 未表示修正

## メタデータ
- **作成日時**: 2026-08-24 08:57
- **タスクID**: 想定値不確かさ未表示修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験記録タブのトランジションカードに表示される「想定値」「不確かさ値」「不確かさ説明」が未表示になっている問題を修正する。

対象プロジェクト: `project_id = project_s4mRmPp9e_98`

## 根本原因

`WorkRecordPanel.tsx` の `buildTransitions` 内で `getExperimentPlans` から取得した `plannedValues` を解析する際、**保存形式と解析ロジックが不一致**。

`tabDataToTransitionValues` で保存される `plannedValues[transitionId]` の実際の構造:
```json
{
  "__task__":        { "creatorRefs": [...] },
  "__uncertainty__": { "propKey1": { "uncertaintyKey": "xxx", "value": "0.1", "description": "..." } },
  "propKey1":        "123.45",   ← 想定値（プリミティブ文字列）
  "propKey2":        "456.78"
}
```

### バグ①: `__uncertainty__` が除外されない
`__task__` はスキップ条件があるが `__uncertainty__` にはない
→ プロパティ名に `__uncertainty__` が表示される

### バグ②: 想定値（プリミティブ）がスキップされる
`typeof propVal !== 'object'` の条件でプリミティブ値を全除外している
→ 想定値が「未設定」になる

### バグ③: 不確かさ情報の取得先が違う
`__uncertainty__[propKey]` から `toleranceValue`/`uncertaintyNote`/`uncertaintyName` を取り出す処理がない
→ 不確かさ値・説明が「—」になる

## 修正内容

**変更ファイル**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` 1ファイルのみ

### 修正箇所（buildTransitions 内 1886〜1908行目付近）

1. ループの前に `__uncertainty__` マップを先に抽出
2. `__task__` と `__uncertainty__` を両方 skip
3. プリミティブ値（想定値）を `{ value: propVal }` として処理する
4. `uncertaintyMap[propKey]` から `toleranceValue` / `uncertaintyNote` を補完する

## 承認記録
- **計画書提示日時**: 2026-08-24 08:57
