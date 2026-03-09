# タスク計画書: file_metadataテーブルとSwiftストレージの同期修正

## メタデータ
- **作成日時**: 2026-03-04 09:36
- **タスクID**: file_metadata同期修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

file_metadataテーブルのデータが登録エラーでも処理が続いていた影響で、
DBのfile_metadataとSwiftストレージの実際のファイルにずれが生じている。
Swiftの実態に合わせてDBを正しい状態に修正する。

## ずれの詳細（調査結果）

対象組織: `a0718dc5-21f3-44e6-87e9-cc2ae83f3385`

### A. DBにあってSwiftにないレコード → 削除対象 (58件)

#### A-1. テストデータのゴミ（実体なしのゴミデータ）
- `realtime-validation` (size: 0)
- `/projects/QuantumDotLED/QuantumDotLED.maiml` (先頭スラッシュあり、誤登録)
- `/projects/RareEarthMagnet/RareEarthMagnet.maiml` (先頭スラッシュあり、誤登録)
- `/projects/TestProjectOmori9/TestProjectOmori9.maiml` (先頭スラッシュあり、誤登録)

#### A-2. formats配下のゴミデータ（登録エラーで実体なし）
- `formats/DEP004/material/disp.xml` (size: 0)
- `formats/DEP004/material/material/TEST/disp.xml` (size: 0)
- `formats/DEP004/material/material/TEST/test.xml` (size: 0)
- `formats/DEP004/material/TEST/disp.xml` (size: 0)
- `formats/DEP004/material/testMAIML.maiml` (size: 0)
- `formats/DEP004/material/TEST/testMAIML.maiml` (size: 0)
- `formats/DEP004/material/TEST/test.xml` (size: 0)
- `formats/DEP004/material/uploadtest/disp.xml` (size: 0)
- `formats/DEP004/material/uploadtest/testMAIML.maiml` (size: 0)
- `formats/DEP004/material/uploadtest/test.xml` (size: 0)
- `formats/DEP004/material/アップロードテスト/disp.xml` (size: 0)
- `formats/DEP004/material/アップロードテスト/testMAIML.maiml` (size: 0)
- `formats/DEP004/material/アップロードテスト/test.xml` (size: 0)
- `formats/material/disp.xml` (size: 0)

#### A-3. テストプロジェクトの補助ファイル（Swiftに存在しない）
- 各プロジェクト(FuelCellElectrolyte, GrapheneComposite, HighTempSuperconductor, LithiumBatteryCathode,
  NanoparticleCatalyst, OrganicSolarCell, PerovskiteSolarCell, RareEarthMagnet)配下の
  - archive/xxx_v1.maiml, archive/xxx_v2.maiml
  - data.csv, results.csv, README.txt

### B. SwiftにあってDBにないファイル → 追加対象 (15件)

- `formats/DEP004/condition/test2.xml` (189 bytes)
- `formats/DEP004/maiml_1/TEST.maiml` (791 bytes)
- `formats/DEP004/material/test.xml` (464 bytes)
- `formats/DEP004/result/result.xml` (429 bytes)
- `projects/QuantumDotLED/QuantumDotLED.maiml` (4575 bytes)
- `projects/QuantumDotLED/archive/QuantumDotLED_001.maiml` (5164 bytes)
- `projects/QuantumDotLED/archive/QuantumDotLED_002.maiml` (2656 bytes)
- `projects/QuantumDotLED/archive/QuantumDotLED_003.maiml` (2321 bytes)
- `projects/RareEarthMagnet/archive/RareEarthMagnet_001.maiml` (1008 bytes)
- `projects/RareEarthMagnet/archive/RareEarthMagnet_002.maiml` (1864 bytes)
- `projects/RareEarthMagnet/archive/RareEarthMagnet_003.maiml` (1864 bytes)
- `projects/TestProjectOmori10/TestProjectOmori10.maiml` (4445 bytes)
- `projects/TestProjectOmori7/TestProjectOmori7.maiml` (4210 bytes)
- `projects/TestProjectOmori8/TestProjectOmori8.maiml` (4438 bytes)
- `projects/TestProjectOmori9/TestProjectOmori9.maiml` (3989 bytes)

### C. file_sizeが異なるファイル → 更新対象 (8件 ※実際にサイズ差がある)

※ subTEST.maiml と EditTEST.maiml はDB/Swift共に同サイズだが比較ロジックが誤判定したため除外

- `projects/FuelCellElectrolyte/FuelCellElectrolyte.maiml`: DB=2280 → Swift=1021
- `projects/GrapheneComposite/GrapheneComposite.maiml`: DB=2200 → Swift=1013
- `projects/HighTempSuperconductor/HighTempSuperconductor.maiml`: DB=2500 → Swift=1034
- `projects/LithiumBatteryCathode/LithiumBatteryCathode.maiml`: DB=2400 → Swift=1035
- `projects/NanoparticleCatalyst/NanoparticleCatalyst.maiml`: DB=2350 → Swift=1019
- `projects/OrganicSolarCell/OrganicSolarCell.maiml`: DB=2180 → Swift=1003
- `projects/PerovskiteSolarCell/PerovskiteSolarCell.maiml`: DB=2300 → Swift=1039
- `projects/RareEarthMagnet/RareEarthMagnet.maiml`: DB=2250 → Swift=2433

## 実装ステップ

- [ ] Step1: タスク計画書作成・承認
- [ ] Step2: 修正SQLスクリプト作成
  - DBにあってSwiftにないレコードをDELETE
  - SwiftにあってDBにないレコードをINSERT
  - file_sizeが異なるレコードをUPDATE
- [ ] Step3: SQLスクリプト実行
- [ ] Step4: 再度check-file-metadata-sync.tsで確認

## 変更ファイル

1. `backend/scripts/fix-file-metadata-sync.ts` - 新規作成（修正スクリプト）

## 承認記録
- **計画書提示日時**: 2026-03-04 09:36
- **承認日時**: 
