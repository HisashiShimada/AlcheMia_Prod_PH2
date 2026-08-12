# タスク計画書: experiment_plan.planned_values 旧キー変換・UUID系キー削除

## メタデータ
- **作成日時**: 2026-08-12 16:00
- **タスクID**: 20260812_1600_planned-values-key-migration
- **優先度**: 中
- **推定工数**: 3時間
- **依存タスク**: `20260812_1530_Alchemia共通名前空間追加とmgr-instruction廃止`（先行タスク完了後に実施）

---

## 1. タスク概要

`experiment_plan.planned_values` JSONB カラムには旧キー形式でデータが保存されている。
本タスクでは以下2種類の変換・削除を行う。

**① 注意事項系キー（変換）**
先行タスクで `NoteType` 定数が新キー（`Alchemia:SupervisorDirectiveXxx`）に変更されるが、
DB の既存データは旧キーのまま残るため、実験計画ダイアログでの復元が壊れる。

**② UUID系キー（削除）**
`mgr-instruction:requiredCreatorUUID` 等は `mgr-instruction` プレフィックス廃止に伴い
`planned_values` から**除去**する。
UUID情報はバックエンドが MAIML 文書から直接取得（`experimentInstructionService.ts` L534-536）
しており、`planned_values` への保存は不要となる。

---

## 2. 変換・削除対象キー一覧

### ① 変換する（旧キー → 新キー）

| 旧キー | 新キー |
|--------|--------|
| `mgr-instruction:caution` | `Alchemia:SupervisorDirectiveCaution` |
| `mgr-instruction:operationNote` | `Alchemia:SupervisorDirectiveOperationNote` |
| `mgr-instruction:checkItem` | `Alchemia:SupervisorDirectiveCheckItem` |
| `mgr-instruction:prohibitedAction` | `Alchemia:SupervisorDirectiveProhibitedAction` |
| `mgr-instruction:OtherNotes` | `Alchemia:SupervisorDirectiveOtherNotes` |

### ② 削除する（planned_values から除去）

| 削除するキー | 理由 |
|-------------|------|
| `mgr-instruction:requiredCreatorUUID` | mgr-instruction 廃止。UUID はMAIML文書から直接取得のため不要 |
| `mgr-instruction:requiredInstrumentUUID` | 同上 |
| `mgr-instruction:requiredOwnerUUID` | 同上 |

---

## 3. 期待される成果

- [ ] `planned_values` 内の注意事項系旧キーが新キーに変換されること
- [ ] `planned_values` 内の UUID系キー（3件）が除去されること
- [ ] 変換・削除は冪等（再実行しても重複・エラーなし）
- [ ] 実験計画ダイアログで既存の注意事項データが正しく表示されること
- [ ] UUID系キー削除後も担当者・機器の絞り込み機能が正常に動作すること
- [ ] バックエンド・フロントエンドの型定義から `mgr-instruction:requiredXxxUUID` が除去されること
- [ ] TypeScriptビルドエラーがないこと

---

## 4. 変換イメージ

```jsonc
// 変換前
{
  "transition-uuid-1": {
    "mgr-instruction:caution":               "注意事項",
    "mgr-instruction:requiredCreatorUUID":   ["user-uuid-001"],
    "mgr-instruction:requiredInstrumentUUID":["inst-uuid-001"],
    "condition-template-1": { "temperature": "200" }
  }
}
// 変換後
{
  "transition-uuid-1": {
    "Alchemia:SupervisorDirectiveCaution": "注意事項",
    "condition-template-1": { "temperature": "200" }
  }
}
```

---

## 5. 実装ステップ

### Phase 1: マイグレーション SQL

- [ ] `backend/migrations/20260812_1600_migrate_planned_values_keys.sql` 新規作成

  **① 注意事項系キー変換（5件）**
  各キーに対して以下の形式で UPDATE:
  ```sql
  UPDATE experiment_plan
  SET planned_values = (
    SELECT jsonb_object_agg(
      transition_id,
      CASE
        WHEN transition_val ? 'mgr-instruction:caution'
        THEN (transition_val - 'mgr-instruction:caution')
             || jsonb_build_object('Alchemia:SupervisorDirectiveCaution',
                                   transition_val -> 'mgr-instruction:caution')
        ELSE transition_val
      END
    )
    FROM jsonb_each(planned_values) AS t(transition_id, transition_val)
  )
  WHERE planned_values::text LIKE '%mgr-instruction:caution%';
  ```
  （上記を5キー分繰り返す）

  **② UUID系キー削除（一括）**
  ```sql
  UPDATE experiment_plan
  SET planned_values = (
    SELECT jsonb_object_agg(
      transition_id,
      transition_val
        - 'mgr-instruction:requiredCreatorUUID'
        - 'mgr-instruction:requiredInstrumentUUID'
        - 'mgr-instruction:requiredOwnerUUID'
    )
    FROM jsonb_each(planned_values) AS t(transition_id, transition_val)
  )
  WHERE planned_values::text LIKE '%mgr-instruction:required%';
  ```

  **③ カラムコメント更新**
  ```sql
  COMMENT ON COLUMN experiment_plan.planned_values IS
    '実験計画データ（Transition単位）: { [transitionId]: { "Alchemia:SupervisorDirectiveXxx": value, [templateId]: { [fieldKey]: value } } }';
  ```

### Phase 2: バックエンド ソース修正

- [ ] `backend/src/services/experimentInstructionService.ts`
  - L559-564: UUID系キー読み取り条件（`field.key === 'mgr-instruction:requiredCreatorUUID'` 等）を削除
  - コメント（L538-540）から UUID系キーの言及を削除

- [ ] `backend/src/types/database.ts`
  - `TransitionPlanValues` インターフェースから UUID系3フィールドを削除

- [ ] `backend/src/types/api.ts`
  - `defaultBasicInfo` コメントから `mgr-instruction:requiredXxxUUID` の言及を削除

### Phase 3: フロントエンド ソース修正

- [ ] `frontend/src/services/experimentPlanApiService.ts`

  **削除する内容:**
  - `TransitionPlanValues` インターフェースの UUID系3フィールド（L23-25）
  - `transitionValuesToTabData()` 内の UUID系キー読み取り（L69-71）
  - `tabDataToTransitionValues()` 内の UUID系キー書き込み（L127-133）
  - `reservedKeys` から UUID系3キー（L90-92）
  - `PlanDialogData` のコメントから UUID系キーの言及（L235-237）

  **追加する内容（注意事項系の互換フォールバック）:**
  `transitionValuesToTabData()` 内で旧キーをフォールバック読み取り（5件）:
  ```typescript
  // 新キー優先・旧キーでフォールバック（DB変換移行期間の安全対策）
  const caution =
    (transValues['Alchemia:SupervisorDirectiveCaution'] as string | undefined) ??
    (transValues['mgr-instruction:caution'] as string | undefined);
  ```

---

## 6. 変更ファイル一覧

| # | ファイル | 種別 | 変更内容 |
|---|---------|------|---------|
| 1 | `backend/migrations/20260812_1600_migrate_planned_values_keys.sql` | 新規 | 注意事項系キー変換 + UUID系キー削除 + コメント更新 |
| 2 | `backend/src/services/experimentInstructionService.ts` | 更新 | UUID系キー読み取りロジック削除 |
| 3 | `backend/src/types/database.ts` | 更新 | `TransitionPlanValues` から UUID系フィールド削除 |
| 4 | `backend/src/types/api.ts` | 更新 | コメントから UUID系キー言及を削除 |
| 5 | `frontend/src/services/experimentPlanApiService.ts` | 更新 | UUID系キー読み書き削除 + 注意事項系旧キーフォールバック追加 |

---

## 7. 注意事項

- **先行タスク（20260812_1530）完了後、同一リリースバッチで実施すること**
- `creatorRefs` / `instrumentRefs` / `ownerRefs` という**変数名・機能は削除しない**
  （MAIML文書から取得する経路は維持する）
- `defaultBasicInfo.creatorRefs` 等（テンプレートフィールドのデフォルト値経由）も
  不要となるため、バックエンドの `if (field.key === 'mgr-instruction:requiredCreatorUUID')` 分岐を削除する

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| JSON 変換 SQL の誤りで planned_values が破損 | 高 | 中 | ステージングで事前検証。変換前に SELECT で件数確認 |
| UUID系キー削除後に担当者絞り込みが動作しなくなる | 高 | 低 | MAIML経由の取得パス（L534-536）が維持されることを手動確認 |
| 先行タスクより先に本タスクが適用される | 高 | 低 | リリース手順書に「先行タスクと同一バッチで適用」と明記 |
| フロントエンドのビルドエラー | 中 | 中 | `npx tsc --noEmit` で確認必須 |

---

## 9. テスト計画

- [ ] `cd backend && npx tsc --noEmit` がエラーなし
- [ ] `cd frontend && npx tsc --noEmit` がエラーなし
- [ ] 変換 SQL 実行後 `planned_values::text LIKE '%mgr-instruction:caution%'` 等が 0 件
- [ ] 変換 SQL 実行後 `planned_values::text LIKE '%mgr-instruction:required%'` が 0 件
- [ ] 実験計画ダイアログで既存の注意事項データが正しく表示されることを手動確認
- [ ] 担当者・機器の絞り込み（creatorRefs 等）が正常に動作することを手動確認

---

## 10. 承認記録

- **計画書提示日時**: 2026-08-12 16:00
- **承認日時**: ―
- **承認者コメント**: ―

---

## 11. 実施記録

開始: ―　完了: ―

### 計画からの変更点  ―

### 最終的な成果物  ―

