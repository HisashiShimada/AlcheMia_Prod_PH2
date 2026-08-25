# タスク計画書: 想定値・不確かさ値・不確かさ説明 未表示修正

## メタデータ
- **作成日時**: 2026-08-24 08:46
- **タスクID**: 想定値不確かさ値不確かさ説明未表示修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験作業者メニューの実験記録タブ、トランジションカード内の「想定値」「不確かさ値」「不確かさ説明」が表示されない不具合を修正する。

## 根本原因

`experimentDataService.ts` の `getTemplateData` 関数内に2つのデータ返却パスがある：

- **パスA（未保存・フォールバック）**: `buildFallbackTemplates()` → `convertPropertyForFallback()` が呼ばれ、`uncertainty[]` 配列からフラットフィールド（`toleranceValue`/`uncertaintyNote`/`uncertaintyName`）が生成される → **正常**

- **パスB（保存済みDBデータ）**: `property_set` をそのまま `data` として返す → `Property` 型の `uncertainty[]` 配列はそのままで、フラットフィールドが存在しない → フロントエンド `WorkRecordPanel.tsx` の `convertRawPropertyToMockProperty` が `toleranceValue`/`uncertaintyNote`/`uncertaintyName` を参照しても `undefined` になる → **バグ**

## 修正対象ファイル

- `backend/src/services/experimentDataService.ts`（1ファイルのみ）

## 実装ステップ

- [x] 調査・根本原因特定
- [ ] `experimentDataService.ts` のパスB修正（保存済みデータの properties に `convertPropertyForFallback` を適用）
- [ ] 動作確認

## 修正内容

`getTemplateData` 内の保存済みデータ返却部分（`if (dbRecord)` ブロック）で、`ps.properties` に対して `convertPropertyForFallback()` を適用し、`uncertainty[]` → フラットフィールドに展開した上で `data` として返す。

## 承認記録
- **承認日時**: 2026-08-24 08:46（ユーザーがAct modeに切り替えたことで承認済み）
