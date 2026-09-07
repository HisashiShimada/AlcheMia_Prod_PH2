# タスク計画書: プロパティカード 定性評価説明・定性評価理由 実装

## メタデータ
- **作成日時**: 2026-09-07 09:00
- **タスクID**: 20260907_0900_プロパティカード定性評価説明理由実装
- **優先度**: 高
- **推定工数**: 4時間

## タスク概要

実験作業者メニュー「実験記録タブ」の PropertyCard に以下の機能を追加する。

1. **定性評価説明欄の表示**: MAIMLファイルの `uncertainty[].description`（指示側の説明文）を  
   「定性評価説明」ラベル付きの読み取り専用欄として常時表示する。
2. **定性評価理由入力欄の追加**: 作業者が定性評価の根拠を自由記入できる Input 欄を  
   「定性評価理由」ラベル付きで常時表示する（`!readOnly` 時）。
3. **定性評価理由の保存**: 「保存」ボタン押下時に入力された理由を  
   `template_data.property_set` の `properties[].uncertainty[].description` に保存する。

## 対応要件

- 要件１-① 定性評価説明欄（ラベル）
- 要件１-② 定性評価理由入力欄（テキスト）
- 要件２ MaiMLファイルから取得した定性評価の description を「定性評価説明欄」へ表示
- 要件３ 「定性評価理由」欄に入力された値を保存ボタン押下時に  
  `template_data.property_set` の `uncertainty[].description` として登録

## 目的と期待される成果

- [x] PropertyCard に「定性評価説明」欄が常時表示される（`prop.description` の値を表示、未設定時は空欄）
- [x] PropertyCard に「定性評価理由」入力欄が常時表示される（`!readOnly` 時）
- [x] 定性評価説明の右隣インライン表示は削除される（独立欄に変更）
- [x] 「保存」ボタン押下時に定性評価理由が `template_data.property_set.properties[].uncertainty[].description` に保存される
- [x] 多言語対応（ja.json / en.json）が実施されている

## データフロー

### 表示側（定性評価説明）

```
MAIMLファイル
  └─ <uncertainty key="ns1:Accuracy">
       └─ <description>...</description>
                ↓ experimentDataService.convertPropertyForFallback()
  qualitativeNote = unc.description
                ↓ APIレスポンス
  property.qualitativeNote
                ↓ WorkRecordPanel.convertRawProperty()
  WorkProperty.description
                ↓ PropertyCard
  「定性評価説明」欄に表示
```

### 保存側（定性評価理由）

```
作業者が「定性評価理由」Input 入力
      ↓ onQualitativeReasonChange(propKey, value)
confidenceValuesRef[placeId__propKey].description に保存
      ↓ 「保存」ボタン押下 (handleSave / handleSaveAndNext)
rawItems.map() 内で
  baseData.properties[].uncertainty[].description = reasonEntry.description
      ↓ saveBatchExperimentData({ records })
experimentController.saveBatchData()
      ↓ TemplateDataRepository.upsert()
template_data.property_set（JSONB）に保存
```

## 実装ステップ

### Phase 1: UI 実装（PropertyCard）

- [x] STEP 1-1: 「定性評価」ラベル右隣の `（description）` インライン表示を削除
- [x] STEP 1-2: 「定性評価説明」ブロックを常時表示に追加（`prop.description ?? ''`）
- [x] STEP 1-3: 「定性評価理由」`Input` 欄を追加（`!readOnly` 時に表示）

### Phase 2: State 接続（PropertyCard）

- [x] STEP 2-1: `PropertyCardProps` に `onQualitativeReasonChange` コールバック追加
- [x] STEP 2-2: `PropertyCard` 内に `qualitativeReason` state 追加
- [x] STEP 2-3: 「定性評価理由」Input に `value` / `onChange` を接続
- [x] STEP 2-4: `PropertyListProps` に `onQualitativeReasonChange` コールバック追加
- [x] STEP 2-5: `PropertyList` 内の `PropertyCard` 呼び出しにコールバック連鎖追加
- [x] STEP 2-6: `PropertyList` 分割代入に `onQualitativeReasonChange` 追加

### Phase 3: WorkRecordPanel 本体の Ref 管理

- [x] STEP 3-1: `confidenceValuesRef` の型に `description?: string | null` を追加
- [x] STEP 3-2: `onConfidenceChange` ハンドラで既存 `description` を保持するよう更新
- [x] STEP 3-3: `onQualitativeReasonChange` ハンドラを追加

### Phase 4: 保存ロジック（handleSave / handleSaveAndNext）

- [x] STEP 4-1: `handleSave` の `rawItems.map()` 内で `uncertainty[].description` に理由を書き込む処理を追加
- [x] STEP 4-2: `handleSaveAndNext` の `rawItems.map()` 内で同様の処理を追加

### Phase 5: 多言語対応

- [x] STEP 5-1: `ja.json` に `qualitativeEvalDesc` / `qualitativeEvalReason` / `qualitativeEvalReasonPlaceholder` 追加
- [x] STEP 5-2: `en.json` に同3キーの英語版追加

## 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | Phase 1〜4 の全変更（PropertyCard UI・State・Ref・保存ロジック） |
| 2 | `frontend/src/locales/ja.json` | `workRecord` セクションに3キー追加 |
| 3 | `frontend/src/locales/en.json` | `workRecord` セクションに3キー追加 |

## 変更しないファイル（不要と判断）

バックエンド側（`experimentController.ts` / `experimentDataService.ts` / Repository / SQL）は変更不要。  
`records` に `uncertainty[].description` を含めて送信するだけで既存の `TemplateDataRepository.upsert()` フローにより `template_data.property_set` に保存される。

## 影響範囲

### 直接影響
- `WorkRecordPanel.tsx` の `PropertyCard` コンポーネント
- `PropertyList` コンポーネント（コールバック連鎖）
- `WorkRecordPanel` 本体（`confidenceValuesRef` の型拡張・ハンドラ追加）

### 間接影響
- `template_data.property_set` の `properties[].uncertainty[].description` に  
  定性評価理由が書き込まれる（新規保存データのみ。既存データには影響なし）

### 影響なし
- バックエンド全層（Controller / Service / Repository / SQL）
- 他の画面・コンポーネント

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `uncertainty` 配列が存在しないプロパティへの書き込みでエラー | 低 | 低 | `Array.isArray(p.uncertainty)` チェック済み |
| 確信度未選択のまま理由のみ入力した場合に保存されない | 中 | 中 | 確信度未選択時も `value: ''` で Ref に格納し、`records` の `uncertainty[].description` に書き込む設計で対応済み |
| `readOnly` 時に Input が表示されてしまう | 低 | 低 | `!readOnly` 条件で包んでいるため問題なし |

## テスト計画

### 手動テスト（動作確認）
- [ ] 定性評価が設定されているプロパティで「定性評価説明」欄に `qualitativeNote` の値が表示されること
- [ ] 定性評価が設定されていないプロパティで「定性評価説明」欄が空欄で表示されること
- [ ] 「定性評価理由」欄にテキストを入力できること
- [ ] 「保存」ボタン押下後、`template_data.property_set.properties[].uncertainty[].description` に入力値が保存されること（DB直接確認）
- [ ] 「保存して次へ」ボタンでも同様に保存されること
- [ ] `readOnly` モード（完了済みトランジション参照時）では「定性評価理由」欄が表示されないこと
- [ ] 日本語 / 英語切替でラベルが正しく表示されること

## 承認記録
- **計画書提示日時**: 2026-09-07 09:00
- **承認日時**: 2026-09-07（Act モード移行により承認済み・実装完了後に計画書を事後作成）
- **承認者コメント**: 実装完了後の計画書事後作成

## 実施記録

### 実施日時
開始: 2026-09-07  
完了: 2026-09-07

### 計画からの変更点

- **保存先の確認と修正**: 当初 `experiment_instruction_detail.uncertainty_comment`（TEXT）への保存を実装したが、  
  要件の正しい保存先は `template_data.property_set.properties[].uncertainty[].description`（JSONB）であることが判明。  
  誤り実装をリバートし、フロントエンドの `records` 構築時に `uncertainty[].description` に書き込む方式に変更した。
- **バックエンド変更なし**: 上記修正により、バックエンド側（Controller / Service / Repository / SQL）の変更は不要となった。

### 発生した問題と解決方法

- **PowerShell のテンプレートリテラル問題**: スクリプトファイル内でバッククォートが正しく扱われず  
  `` `${placeId}__${propKey}` `` が `"__"` に壊れる問題が発生。  
  スクリプトファイル内で `[char]96` を使ったリテラル組み立てで修正した。

### 最終的な成果物
- [x] `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - PropertyCard に「定性評価説明」「定性評価理由」欄追加（UI・State・Ref・保存ロジック）
- [x] `frontend/src/locales/ja.json` - `workRecord` セクションに3キー追加
- [x] `frontend/src/locales/en.json` - `workRecord` セクションに3キー追加
