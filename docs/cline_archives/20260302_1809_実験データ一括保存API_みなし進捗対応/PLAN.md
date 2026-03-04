# タスク計画書: 実験データ一括保存API みなし進捗対応

## メタデータ
- **作成日時**: 2026-03-02 18:09
- **タスクID**: experiment-data-deemed-progress
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

実験データ一括保存API（`POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`）に、みなし進捗の自動更新機能を追加する。

自組織の `use_deemed_progress` フラグが `true` の場合、template_data の保存完了後に、保存対象プレースが属するトランジションの `transition_data` レコードを自動更新する。

---

## 目的と期待される成果

### 目的
- 実験作業者がデータを入力した際に、自動的にトランジションの進捗（status, progress_rate）が更新されるようにする
- 手動でトランジションステータスを更新する手間を削減する

### 期待される成果
- [ ] `use_deemed_progress = true` の組織でデータ保存時、該当トランジションの `transition_data` が自動更新される
- [ ] 実績1件以上: status = IN_PROGRESS (3)
- [ ] 実績全件: status = COMPLETED (5)
- [ ] progress_rate = 実績登録済み数 / 総プレース数 × 100（整数）
- [ ] 状態遷移バリデーションは実施しない
- [ ] `use_deemed_progress = false` の組織では既存動作を維持

---

## 調査結果サマリー

### 既存コードの構造

| ファイル | 役割 |
|---------|------|
| `experimentDataService.saveBatchData()` | template_dataへのUPSERT（トランジション操作なし） |
| `transitionDataRepository.updateStatus()` | transition_dataのstatus/progress_rate更新（updateStatus.sql使用） |
| `progressService.validateStatusTransition()` | ステータス遷移バリデーション（みなし進捗では不要） |
| `organizationRepository.getIsEntry()` | 組織フラグ取得の既存実装（use_deemed_progressは未実装） |
| `template_data/countActualByPlaceIds.sql` | placeIdリストで実績数をtemplate_type別カウント |
| `transition_data/updateStatus.sql` | transition_data更新SQL（流用可能） |

### みなし進捗の判定ロジック
1. MAIMLファイルのアーク情報から `placeId → transitionId` を解決
2. 各トランジションに接続された全プレースIDを取得（総数）
3. `template_data` から実績登録済みのプレースIDをカウント
4. status・progress_rate を算出して `transition_data` を更新

---

## 実装ステップ

### Phase 1: organizationRepository への getUseDeemedProgress() 追加
- [ ] `backend/src/repositories/organizationRepository.ts` に `getUseDeemedProgress()` 関数を追加

### Phase 2: transitionDataRepository への updateStatusDeemed() 追加
- [ ] `backend/src/repositories/transitionDataRepository.ts` に `updateStatusDeemed()` メソッド追加
  - バリデーションなし版
  - 既存の `transition_data/updateStatus.sql` を流用

### Phase 3: experimentDataService へのみなし進捗ロジック追加
- [ ] `backend/src/services/experimentDataService.ts` の `saveBatchData()` を修正
  - template_data UPSERT完了後に以下を実行：
    1. `getUseDeemedProgress()` で組織フラグ確認
    2. `true` の場合のみ MAIMLダウンロード＆パース
    3. 保存されたplaceIdからアーク経由でtransitionIdを特定
    4. 各transitionIdの status/progress_rate を算出
    5. `updateStatusDeemed()` で transition_data を更新
    6. すべて同一トランザクション内で実行

### Phase 4: API設計書の更新
- [ ] `docs/design/api/api_experiment_data.md` のビジネスロジックセクションにみなし進捗仕様を追記
- [ ] 変更履歴を追記

---

## 変更ファイル

| No | ファイル | 変更種別 | 内容 |
|----|---------|---------|------|
| 1 | `backend/src/repositories/organizationRepository.ts` | 修正 | `getUseDeemedProgress()` 追加 |
| 2 | `backend/src/repositories/transitionDataRepository.ts` | 修正 | `updateStatusDeemed()` 追加 |
| 3 | `backend/src/services/experimentDataService.ts` | 修正 | `saveBatchData()` にみなし進捗ロジック追加 |
| 4 | `docs/design/api/api_experiment_data.md` | 修正 | ビジネスロジック・変更履歴追記 |

---

## 詳細設計

### みなし進捗ロジック（saveBatchData内）

```
[UPSERTループ完了後]
  ↓
1. getUseDeemedProgress(pool, organizationId)
   → false なら終了（既存動作のまま）

2. MAIMLをダウンロード（getStorageService().downloadFile()）
   → エラー時はログを記録してスキップ（メイントランザクションには影響させない）

3. MaimlParserTyped でパース

4. 保存されたplaceIds をユニーク化

5. 各placeId について:
   - arcs を参照して transitionId を解決
   - arcs: arc.source === placeId → arc.target が transitionId
   - arcs: arc.target === placeId → arc.source が transitionId

6. transitionId ごとにグルーピング

7. 各transitionId について:
   a. MAIML のアーク情報から接続全プレースIDを取得 → totalCount
   b. countActualByPlaceIds.sql で実績済みplaceId数をカウント → registeredCount
   c. status 決定:
      - registeredCount === 0         → スキップ（変更不要）
      - registeredCount < totalCount  → IN_PROGRESS (3)
      - registeredCount === totalCount → COMPLETED (5)
   d. progress_rate = Math.round(registeredCount / totalCount * 100)
   e. updateStatusDeemed() で transition_data を更新
```

### updateStatusDeemed() 仕様
- `transitionDataRepository.ts` に追加
- 既存の `transition_data/updateStatus.sql` を使用
- `progressService.validateStatusTransition()` を呼ばない
- トランザクション用 `PoolClient` を受け取る
- レコードが存在しない場合はエラーをスローしない（silently skip）

---

## セキュリティ考慮事項
- [ ] organization_id フィルタ必須（マルチテナント分離）
- [ ] 同一トランザクション内で template_data と transition_data を更新
- [ ] MAIML操作はストレージサービス経由（organization_id付き）

---

## リスク

| リスク | 対策 |
|--------|------|
| MAIMLファイルが存在しない | エラーをキャッチしてみなし進捗をスキップ（メイン処理は成功） |
| transition_dataレコードが存在しない | upsert または silent skip で対応 |
| placeIdがMAIML上のアークに存在しない | 警告ログを出力してスキップ |

---

## テスト計画
- [ ] `use_deemed_progress = true` の組織で実験データ保存時、transition_data が更新される
- [ ] 部分的な実績保存時: status = IN_PROGRESS
- [ ] 全実績保存時: status = COMPLETED
- [ ] `use_deemed_progress = false` の組織では transition_data が更新されない
- [ ] MAIMLファイル不在時でもメイン処理（template_data保存）は成功する

---

## 承認記録
- **計画書提示日時**: 2026-03-02 18:09
- **承認日時**: 2026-03-02 18:09
- **承認者コメント**: 実装を進めてください

---

## 実施記録

### 実施日時
開始: 2026-03-02 18:09
完了: （作業完了時に記入）

### 計画からの変更点
（記入予定）
