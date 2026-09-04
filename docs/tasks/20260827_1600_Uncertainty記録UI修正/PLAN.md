# タスク計画書: Uncertainty記録UI修正

## メタデータ
- **作成日時**: 2026-08-27 16:00
- **タスクID**: 20260827_1600_Uncertainty記録UI修正
- **優先度**: 高
- **推定工数**: 4〜6時間

---

## タスク概要

WorkRecordPanel（作業記録パネル）と実験指示タブ（ExperimentInstructionTab）における
不確かさ（Uncertainty）記録のUIとロジックを以下の3点修正する。

1. **レイアウト修正（WorkRecordPanel）**: PropertyCard の定量評価入力行を件数分表示し、
   各行の上部に対応する許容値・説明をセットで表示する
2. **ロジック修正**: 定量評価の判定結果は複数件あっても「1つ」に集約する仕様に変更
   （全良好→「良好」、1件でも不良→「不良」）
3. **ダイアログ修正（UncertaintyJudgeDetailDialog）**: プロパティ情報欄にメソッド・タスク・
   トランジション・テンプレート情報を追加する（現状は Key / 想定値 / 実績値のみ）

### 影響範囲
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` （PropertyCard）
- `frontend/src/components/project/ExperimentInstructionTab.tsx` （定量評価4列・ダイアログ呼び出し）
- `frontend/src/components/project/UncertaintyJudgeDetailDialog.tsx` （Props追加・表示拡張）
- `backend/src/services/experimentDataService.ts` （`convertPropertyForFallback`）
- `backend/src/services/maimlWriterService.ts` （MAIML書き込み）
- `frontend/src/locales/ja.json` / `en.json` （翻訳キー）

---

## 実装ステップ

### Phase 1-A: WorkRecordPanel PropertyCard UIモック【完了】

**確認済みレイアウト方針:**
- カード全体を大きめに（fontSize 14〜15、padding 12〜14px）
- 上部は「想定値」のみ（許容値・説明の固定表示は廃止）
- 定量評価セクション: 各入力行カードの上部に対応する許容値（基準名 + 値）・説明をセットで表示

**モックファイル:** `frontend/src/app/mock/uncertainty-ui/MockPropertyCardSection.tsx`

### Phase 1-B: 実験指示タブ 定量評価列 UIモック【完了】

**確認済みレイアウト方針:**

定量評価4列の複数件対応:
- `quantitativeCriteriaName`: 変更なし（既存: 1件→テキスト / 複数件→「N件」ボタン→ダイアログ）
- `quantitativeTolerance`: 複数件→「N件」ボタン→ダイアログ（従来の「—」表示を修正）
- `quantitativeRecordedValue`: 複数件→「N件」ボタン→ダイアログ（従来の「—」表示を修正）
- `quantitativeJudgeResult`: 件数によらず集約バッジ1個 + 複数件は「N件」ボタン→ダイアログ

**UncertaintyJudgeDetailDialog 表示拡張（モックで確認済み）:**
- 上段: メソッド / タスク# / トランジション / テンプレート
- 下段: Key / 想定値 / 実績値 / 総合評価（集約バッジ）

**モックファイル:** `frontend/src/app/mock/uncertainty-ui/MockExperimentInstructionSection.tsx`

**モックアクセス:** `http://localhost:3000/mock/uncertainty-ui`

---

### Phase 2-A: WorkRecordPanel PropertyCard 本実装【後続タスク】

- [ ] `WorkProperty` 型に `quantitativeUncertainties` フィールド追加
- [ ] `PropertyCard` のレイアウトをモック確認済みの新デザインに変更
  - 後方互換フィールド（`uncertaintyValue` / `uncertaintyDescription`）は維持
- [ ] 翻訳キー追加（必要に応じて）

### Phase 2-B: 実験指示タブ 定量評価列・ダイアログ本実装【後続タスク】

- [ ] `quantitativeTolerance` 列: 複数件→「N件」ボタン→ダイアログ誘導
- [ ] `quantitativeRecordedValue` 列: 複数件→「N件」ボタン→ダイアログ誘導
- [ ] `quantitativeJudgeResult` 列: 件数によらず集約バッジ1個を表示

#### UncertaintyJudgeDetailDialog 拡張（Phase 2-B と同時）

- [ ] `UncertaintyJudgeDetailDialogProps` に以下フィールドを追加
  - `methodId`, `methodName`, `taskNumber`, `transitionId`, `transitionName`, `templateName`
- [ ] プロパティ情報欄を2段構成に変更
  - 上段: メソッド / タスク# / トランジション / テンプレート
  - 下段: Key / 想定値 / 実績値 / 総合評価（集約バッジ）
- [ ] `ExperimentInstructionTab` の呼び出し箇所で新Propsを渡すよう修正
- [ ] 翻訳キー追加

### Phase 3-A: WorkRecordPanel 判定結果集約ロジック修正【後続タスク】

- [ ] `lastJudgeResultMap` 参照を集約ロジックに変更
- [ ] PropertyCard ヘッダーに集約バッジ1個を表示（全良好→良好、1件でも不良→不良）
- [ ] 各入力行の個別バッジ廃止

### Phase 3-B: バックエンド 複数定量評価展開対応【後続タスク】

- [ ] `backend/src/services/experimentDataService.ts`
  - `convertPropertyForFallback` の `toleranceValue`（1件）を
    `toleranceValues` 配列に変更（後方互換のため `toleranceValue` 1件目は維持）
- [ ] `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
  - `convertRawProperty` で `p.toleranceValues` を `quantitativeUncertainties` にマッピング

### Phase 4: MAIML への判定結果書き込み【後続タスク】

- [ ] `backend/src/services/maimlWriterService.ts`
  - 承認時に `experiment_uncertainty_judge` の判定結果をプロパティごとに集約
  - uncertainty 要素の value として集約判定結果（良好/不良）を書き込む
- [ ] `backend/src/repositories/experimentUncertaintyJudgeRepository.ts`
  - 必要に応じてメソッド追加（既存 `findAllByProject` で対応可能か確認）

---

## 変更ファイル一覧

### Phase 1（モック・完了）
1. `frontend/src/app/mock/uncertainty-ui/page.tsx` - モックページルート（新規）
2. `frontend/src/app/mock/uncertainty-ui/MockPropertyCardSection.tsx` - Phase 1-A モック（新規）
3. `frontend/src/app/mock/uncertainty-ui/MockExperimentInstructionSection.tsx` - Phase 1-B モック（新規）

### Phase 2（本実装・後続）
4. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - PropertyCard レイアウト修正・型追加
5. `frontend/src/components/project/ExperimentInstructionTab.tsx` - 定量評価列修正・ダイアログProps追加
6. `frontend/src/components/project/UncertaintyJudgeDetailDialog.tsx` - Props追加・プロパティ情報欄拡張
7. `frontend/src/locales/ja.json` - 翻訳キー追加
8. `frontend/src/locales/en.json` - 翻訳キー追加

### Phase 3〜4（後続）
9. `backend/src/services/experimentDataService.ts`
10. `backend/src/services/maimlWriterService.ts`
11. `backend/src/repositories/experimentUncertaintyJudgeRepository.ts`

---

## リスク

| リスク | 対策 |
|--------|------|
| `WorkProperty` 型変更による既存コード影響 | `quantitativeUncertainties` は optional とし後方互換を維持 |
| モック用データが本番データと乖離する | モック定数を確認済みとして後続フェーズで参照する |
| `quantitativeJudgeResult` 集約で judges が空の場合 | `judges.length === 0` のときは「—」のまま維持 |
| `UncertaintyJudgeDetailDialog` のProps追加で呼び出し元の修正漏れ | `ExperimentInstructionTab` の1箇所のみのため影響範囲は限定的 |

---

## テスト計画

- [ ] WorkRecordPanel で `quantitativeUncertainties` が2件以上のプロパティカードが正しく表示されること
- [ ] WorkRecordPanel で `quantitativeUncertainties` が未設定の場合、既存フィールドで表示されること
- [ ] 実験指示タブで `uncertaintyJudges.length === 1` の各列が変わらず動作すること
- [ ] 実験指示タブで `uncertaintyJudges.length > 1` のとき `quantitativeTolerance` / `quantitativeRecordedValue` がボタン表示になること
- [ ] 実験指示タブで `uncertaintyJudges` に不良が1件でもあれば `quantitativeJudgeResult` が「不良」バッジになること
- [ ] 実験指示タブで `uncertaintyJudges` が全件良好なら「良好」バッジになること
- [ ] `UncertaintyJudgeDetailDialog` でメソッド・タスク・トランジション・テンプレートが表示されること
- [ ] `UncertaintyJudgeDetailDialog` で総合評価バッジが正しく表示されること

---

## 承認記録
- **計画書提示日時**: 2026-08-27 16:00
- **承認日時**: 2026-08-27
- **承認者コメント**: Phase 1-A・1-B から開始

## 実施記録

### Phase 1-A（完了）
- `MockPropertyCardSection.tsx` 作成
- 新レイアウト確認: 定量評価入力行カードに許容値・説明をセット表示するデザインを採択

### Phase 1-B（完了）
- `MockExperimentInstructionSection.tsx` 作成
- `MockFlatRow` にメソッド・タスク・トランジション・テンプレートフィールド追加
- `JudgeDetailDialog` のプロパティ情報欄を2段構成に更新（上段: コンテキスト情報 / 下段: Key・値・総合評価）
- 定量評価4列の複数件対応レイアウト・集約バッジを確認

### Phase 2-A（完了）
- `WorkRecordPanel.tsx` の `WorkProperty` 型に `QuantitativeUncertaintyInfo` / `quantitativeUncertainties` を追加
- `PropertyCard` カードヘッダーに集約判定結果バッジを追加（全良好→良好、1件でも不良→不良）
- 想定値エリアから固定の不確かさ値・説明欄を廃止（上部は想定値のみ）
- 定量評価セクションを刷新: 各入力行カードの上部に許容値・説明をセット表示
- `addedValues` 初期化を `quantitativeUncertainties` 件数分に対応（初期行に uncertaintyKey をプリセット）

### Phase 2-B（完了）
- `backend/src/services/experimentDataService.ts` の `convertPropertyForFallback` を修正:
  - 定量評価の全件を `toleranceValues[]` として展開（後方互換のため `toleranceValue` 1件目は維持）
  - 各要素: `{ uncertaintyKey, toleranceValue, uncertaintyNote, uncertaintyName }`
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` の `convertRawProperty` を修正:
  - `p.toleranceValues[]` を `quantitativeUncertainties[]` にマッピング
  - 後方互換フィールド（`uncertaintyValue` / `uncertaintyDescription`）は引き続き維持

### Phase 4（完了）
- `backend/src/services/maimlWriterService.ts` の `writeDataAndEventLog` に判定結果注入を追加:
  - `ExperimentUncertaintyJudgeRepository.findAllByProject` で判定結果を全件取得
  - `(placeId, propertyKey)` ごとに集約（1件でも不良→不良、全良好→良好）
  - `templateDataRows.property_set.properties[].uncertainties[0].value` に集約結果を設定
  - 注入失敗は警告ログのみ（MAIML 書き込み処理は継続）

- `UncertaintyJudgeDetailDialog.tsx` の Props にメソッド・タスク・トランジション・テンプレート・単位を追加
- プロパティ情報欄を2段構成に変更（上段: メソッド/タスク/トランジション/テンプレート / 下段: Key/想定値/実績値/総合評価）

### Phase 3-B（完了）
- `backend/src/services/experimentDataService.ts` の `convertPropertyForFallback` を修正:
  - 定量評価の全件を `toleranceValues[]` として展開（後方互換のため `toleranceValue` 1件目は維持）
  - 各要素: `{ uncertaintyKey, toleranceValue, uncertaintyNote, uncertaintyName }`
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` の `convertRawProperty` を修正:
  - `p.toleranceValues[]` を `quantitativeUncertainties[]` にマッピング
  - 後方互換フィールド（`uncertaintyValue` / `uncertaintyDescription`）は引き続き維持

### Phase 4（完了）
- `backend/src/services/maimlWriterService.ts` の `writeDataAndEventLog` に判定結果注入を追加:
  - `ExperimentUncertaintyJudgeRepository.findAllByProject` で判定結果を全件取得
  - `(placeId, propertyKey)` ごとに集約（1件でも不良→不良、全良好→良好）
  - `templateDataRows.property_set.properties[].uncertainties[0].value` に集約結果を設定
  - 注入失敗は警告ログのみ（MAIML 書き込み処理は継続）

- 集約判定結果（`aggregateJudgeResult`）を実装し「総合評価」バッジとして表示
- `ExperimentInstructionTab.tsx` の定量評価3列を複数件対応に修正:
  - `quantitativeTolerance`: 複数件→「N件」ボタン→ダイアログ
  - `quantitativeRecordedValue`: 複数件→「N件」ボタン→ダイアログ
  - `quantitativeJudgeResult`: 件数によらず集約バッジ1個（複数件は「N件」ボタン併置）
- `ExperimentInstructionTab.tsx` のダイアログ呼び出しに新Props追加（unit 含む）
- 翻訳キー追加: `judgeDetailDialog.method/taskNo/transition/template/key/expectedValue/actualValue/overallJudge`（ja.json・en.json）

