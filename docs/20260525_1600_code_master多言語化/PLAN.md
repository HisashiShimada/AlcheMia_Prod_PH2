# タスク計画書: code_master多言語化対応

## メタデータ
- **作成日時**: 2026-05-25 16:00
- **タスクID**: code-master-i18n
- **優先度**: 中
- **推定工数**: 4時間

## 1. タスク概要

code_masterテーブルの`code_name`カラムに格納されている日本語文字列を、i18nキーに変更し、多言語対応を可能にする。
現在の日本語値は`code_remark`カラムに移行し、フロントエンドでは`t(code_name)`で翻訳を取得する。

### 現状の問題
- code_nameが日本語固定（「チェックイン中」「材料不足2」等）
- APIレスポンスも日本語をそのまま返却
- 英語対応が不可能

### 変更方針
- **code_name**: 日本語 → i18nキーのキー部分のみ（例: `materialShortage`、30文字以内）
- **i18nキー組み立て**: `codeMaster.{code_division}.{code_name}` 形式でバックエンドが生成
  - code_divisionはスネークケースのまま使用（変換不要）
  - 例: `codeMaster.issue_type.materialShortage`
- **code_remark**: 備考 → 日本語説明（元のcode_name値 + 元のcode_remark）
- **対象**: 全code_division（35件）
- **全組織**: 既存の全組織データを一括更新

## 2. 目的と期待される成果

### 目的
- code_masterを多言語対応可能な構造に変更
- 英語ユーザーへの対応を可能にする
- i18n管理を一元化する

### 期待される成果
- [x] 実装方針の決定（code_nameにi18nキー、code_remarkに説明）
- [x] 対象範囲の確定（全code_division）
- [x] i18nキーの命名規則の確定（`codeMaster.{division}.{key}`）
- [x] データベースマイグレーション作成（`20260525_convert_code_master_to_i18n.sql`）
- [x] insertInitialData.sql更新
- [x] ja.json/en.json更新（35件の翻訳追加）
- [x] Backend Service修正（`codeMasterService.ts` でi18nキー文字列を返却）
- [ ] マイグレーション実行
- [ ] Frontend修正（`t(option.label)` 使用箇所調査・修正）
- [ ] テスト実施

## 3. 実装ステップ

### Phase 1: i18nキーマッピング定義
- [ ] 全35件のcode_nameに対応するi18nキーを定義
- [ ] マッピングテーブルを作成（CSV形式で管理）

### Phase 2: データベースマイグレーション作成
- [ ] マイグレーションファイル作成: `20260525_convert_code_master_to_i18n.sql`
- [ ] 既存全組織のcode_masterレコードを更新
  - code_remarkに元のcode_nameを移行（既存remarkと結合）
  - code_nameをi18nキーに置き換え

### Phase 3: insertInitialData.sql更新
- [ ] `backend/src/sql/queries/codeMaster/insertInitialData.sql` を更新
- [ ] code_name列をi18nキーに変更
- [ ] code_remark列に日本語説明を追加

### Phase 4: i18nファイル更新
- [ ] `frontend/src/locales/ja.json` に `codeMaster` セクション追加（35件）
- [ ] `frontend/src/locales/en.json` に `codeMaster` セクション追加（35件、英訳）

### Phase 5: Backend修正
- [ ] codeMasterService: `label` を `codeMaster.${cm.code_division}.${cm.code_name}` で生成する修正
- [ ] API動作確認（labelがi18nキーになっているか）

### Phase 6: Frontend修正
- [ ] code_masterのlabelを使用している全箇所を調査
- [ ] `t(option.label)` で翻訳を適用
- [ ] 対象コンポーネントを特定・修正

### Phase 7: テスト
- [ ] マイグレーション実行テスト（開発環境）
- [ ] API動作確認（Postman/curl）
- [ ] フロントエンド表示確認（日本語/英語切り替え）
- [ ] 全code_divisionの表示確認

## 4. i18nキーマッピング定義

> **i18nキー組み立てルール**: `codeMaster.{code_division}.{code_name}`
> - code_divisionはスネークケースのまま使用
> - code_nameはキー部分のみ（30文字以内）
> - 例: `codeMaster.issue_type.materialShortage`

### checkout_status (2件)
| code_value | 現code_name | code_name（DB格納値） | 完全i18nキー | ja | en |
|------------|-------------|----------------------|-------------|----|----|
| 0 | チェックイン中 | checkedIn | codeMaster.checkout_status.checkedIn | チェックイン中 | Checked In |
| 1 | チェックアウト済 | checkedOut | codeMaster.checkout_status.checkedOut | チェックアウト済 | Checked Out |

### experiment_condition (2件)
| code_value | 現code_name | code_name（DB格納値） | 完全i18nキー | ja | en |
|------------|-------------|----------------------|-------------|----|----|
| 0 | 全て同一条件で実行 | allSameCondition | codeMaster.experiment_condition.allSameCondition | 全て同一条件で実行 | All Same Condition |
| 1 | 実験条件 | experimentCondition | codeMaster.experiment_condition.experimentCondition | 実験条件 | Experiment Condition |

### instruction_priority (4件)
| code_value | 現code_name | code_name（DB格納値） | 完全i18nキー | ja | en |
|------------|-------------|----------------------|-------------|----|----|
| 0 | 低 | low | codeMaster.instruction_priority.low | 低 | Low |
| 1 | 通常 | normal | codeMaster.instruction_priority.normal | 通常 | Normal |
| 2 | 中 | medium | codeMaster.instruction_priority.medium | 中 | Medium |
| 3 | 高 | high | codeMaster.instruction_priority.high | 高 | High |

### instruction_status (2件)
| code_value | 現code_name | code_name（DB格納値） | 完全i18nキー | ja | en |
|------------|-------------|----------------------|-------------|----|----|
| 0 | 未送信 | unsent | codeMaster.instruction_status.unsent | 未送信 | Unsent |
| 1 | 送信済 | sent | codeMaster.instruction_status.sent | 送信済 | Sent |

### instruction_target (3件)
| code_value | 現code_name | code_name（DB格納値） | 完全i18nキー | ja | en |
|------------|-------------|----------------------|-------------|----|----|
| 0 | ファイル全体 | entireFile | codeMaster.instruction_target.entireFile | ファイル全体 | Entire File |
| 1 | 特定タスク | specificTask | codeMaster.instruction_target.specificTask | 特定タスク | Specific Task |
| 2 | 特定トランジション | specificTransition | codeMaster.instruction_target.specificTransition | 特定トランジション | Specific Transition |

### instruction_type (5件)
| code_value | 現code_name | code_name（DB格納値） | 完全i18nキー | ja | en |
|------------|-------------|----------------------|-------------|----|----|
| 0 | 一般 | general | codeMaster.instruction_type.general | 一般 | General |
| 1 | セットアップ | setup | codeMaster.instruction_type.setup | セットアップ | Setup |
| 2 | 測定 | measurement | codeMaster.instruction_type.measurement | 測定 | Measurement |
| 3 | 安全 | safety | codeMaster.instruction_type.safety | 安全 | Safety |
| 4 | 清掃 | cleaning | codeMaster.instruction_type.cleaning | 清掃 | Cleaning |

### issue_type (7件)
| code_value | 現code_name | code_name（DB格納値） | 完全i18nキー | ja | en |
|------------|-------------|----------------------|-------------|----|----|
| 0 | 材料不足2 | materialShortage | codeMaster.issue_type.materialShortage | 材料不足 | Material Shortage |
| 1 | 機器故障 | equipmentFailure | codeMaster.issue_type.equipmentFailure | 機器故障 | Equipment Failure |
| 2 | 手順不明確 | unclearProcedure | codeMaster.issue_type.unclearProcedure | 手順不明確 | Unclear Procedure |
| 3 | 安全性の懸念 | safetyConcern | codeMaster.issue_type.safetyConcern | 安全性の懸念 | Safety Concern |
| 4 | 品質問題 | qualityIssue | codeMaster.issue_type.qualityIssue | 品質問題 | Quality Issue |
| 5 | 時間制約 | timeConstraint | codeMaster.issue_type.timeConstraint | 時間制約 | Time Constraint |
| 6 | その他 | other | codeMaster.issue_type.other | その他 | Other |

※注: code_value=0 の「材料不足2」は「材料不足」に修正

### project_status (6件)
| code_value | 現code_name | code_name（DB格納値） | 完全i18nキー | ja | en |
|------------|-------------|----------------------|-------------|----|----|
| 0 | プロジェクト計画中 | planning | codeMaster.project_status.planning | プロジェクト計画中 | Planning |
| 1 | タスク実行待ち | taskPending | codeMaster.project_status.taskPending | タスク実行待ち | Task Pending |
| 2 | タスク実行中 | taskInProgress | codeMaster.project_status.taskInProgress | タスク実行中 | Task In Progress |
| 3 | タスク結果レビュー待ち | reviewPending | codeMaster.project_status.reviewPending | タスク結果レビュー待ち | Review Pending |
| 4 | プロジェクト完了 | completed | codeMaster.project_status.completed | プロジェクト完了 | Completed |
| 5 | タスク異常終了 | taskFailed | codeMaster.project_status.taskFailed | タスク異常終了 | Task Failed |

### task_status (5件)
| code_value | 現code_name | code_name（DB格納値） | 完全i18nキー | ja | en |
|------------|-------------|----------------------|-------------|----|----|
| 0 | 実行待ち | pending | codeMaster.task_status.pending | 実行待ち | Pending |
| 1 | 実行中 | inProgress | codeMaster.task_status.inProgress | 実行中 | In Progress |
| 2 | レビュー待ち | reviewPending | codeMaster.task_status.reviewPending | レビュー待ち | Review Pending |
| 3 | 完了 | completed | codeMaster.task_status.completed | 完了 | Completed |
| 4 | 異常終了 | failed | codeMaster.task_status.failed | 異常終了 | Failed |

## 5. 影響範囲

### 変更するファイル
1. `backend/migrations/20260525_convert_code_master_to_i18n.sql` - 新規作成（マイグレーション）
2. `backend/src/sql/queries/codeMaster/insertInitialData.sql` - 更新（初期データ）
3. `backend/src/services/codeMasterService.ts` - 修正（labelをi18nキーに変更）
4. `frontend/src/locales/ja.json` - キー追加（codeMasterセクション、35件）
5. `frontend/src/locales/en.json` - キー追加（codeMasterセクション、35件）
6. Frontendコンポーネント（調査後に確定）

### 影響を受けるAPI
- `GET /api/v1/code-master/:codeDivision/options` - label値がi18nキーになる
- `POST /api/v1/code-master/options/bulk` - 同上

### 影響を受けるフロントエンド機能
- Selectコンポーネントでcode_masterを使用している全箇所
- 問題報告、プロジェクト管理、タスク管理、指示管理など

## 6. 技術的詳細

### マイグレーションSQL構造
```sql
-- 既存全組織のcode_masterを更新（キー部分のみに置き換え）
UPDATE code_master SET
  code_remark = CONCAT(code_name, 
    CASE WHEN code_remark IS NOT NULL AND code_remark != '' 
         THEN CONCAT(' / ', code_remark) 
         ELSE '' 
    END),
  code_name = CASE
    WHEN code_division = 'checkout_status' AND code_value = '0' THEN 'checkedIn'
    WHEN code_division = 'checkout_status' AND code_value = '1' THEN 'checkedOut'
    WHEN code_division = 'issue_type'      AND code_value = '0' THEN 'materialShortage'
    WHEN code_division = 'issue_type'      AND code_value = '1' THEN 'equipmentFailure'
    -- ... 全35件
  END,
  update_at = NOW();
```

### Backend Service修正
```typescript
// codeMasterService.ts
export async function getSelectOptions(
  organizationId: string,
  codeDivision: string
): Promise<SelectOption[]> {
  const codeMasters = await codeMasterRepository.findByDivision(
    organizationId,
    codeDivision
  );

  const options: SelectOption[] = codeMasters.map((cm) => ({
    value: isNaN(Number(cm.code_value)) ? cm.code_value : Number(cm.code_value),
    // シンプルな文字列連結でi18nキーを生成（ヘルパー関数不要）
    label: `codeMaster.${cm.code_division}.${cm.code_name}`,
  }));

  return options;
}
```

### Frontend使用例
```tsx
import { useTranslation } from 'react-i18next';

// APIから取得
const { data } = await api.getCodeMasterOptions('issue_type');
// data.options = [{ value: 0, label: 'codeMaster.issue_type.materialShortage' }, ...]

// 表示
const { t } = useTranslation();
<Select>
  {options.map(opt => (
    <Option key={opt.value} value={opt.value}>
      {t(opt.label)} {/* i18nキーで翻訳 */}
    </Option>
  ))}
</Select>
```

### ja.json構造
```json
{
  "codeMaster": {
    "issue_type": {
      "materialShortage": "材料不足",
      "equipmentFailure": "機器故障"
    },
    "project_status": {
      "planning": "プロジェクト計画中",
      "taskPending": "タスク実行待ち"
    }
    // ... 全code_divisionをスネークケースのまま使用
  }
}
```

## 7. リスク と対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| マイグレーション失敗でデータ損失 | 高 | 低 | 事前にDBバックアップ、トランザクション使用 |
| 一部のフロントエンドで翻訳漏れ | 中 | 中 | 全画面で動作確認、grepで使用箇所を洗い出し |
| 既存組織のデータ更新漏れ | 高 | 低 | WHERE句を使わず全レコード更新、件数確認 |
| i18nキーのタイポ | 中 | 中 | マッピングテーブルをCSVで管理、レビュー |
| Backend APIが古いcode_nameを返却 | 低 | 低 | 動作確認、code_nameをそのまま返却するため影響なし |

## 8. テスト計画

### 単体テスト
- [ ] マイグレーションSQL実行テスト（開発DB）
- [ ] code_master全レコードの更新確認（35件 × 組織数）
- [ ] code_remark に日本語が移行されているか確認

### 統合テスト
- [ ] API `GET /api/v1/code-master/issue_type/options` 実行
  - レスポンスのlabelがi18nキーになっているか
- [ ] API `POST /api/v1/code-master/options/bulk` 実行
  - 複数code_divisionで正しくi18nキーが返却されるか

### E2Eテスト
- [ ] 問題報告画面: issue_typeセレクトで日本語表示
- [ ] 問題報告画面: 言語切り替えで英語表示
- [ ] プロジェクト一覧: project_statusで日本語/英語表示
- [ ] タスク管理: task_statusで日本語/英語表示
- [ ] 指示管理: instruction_priority/type/target/statusで日本語/英語表示
- [ ] 全画面で「codeMaster.xxx」というキーがそのまま表示されていないか確認

### 手動テスト手順
1. マイグレーション実行
2. サーバー再起動
3. フロントエンド再ビルド
4. 日本語モードで全機能確認
5. 英語モードに切り替え
6. 全機能で英語表示確認
7. 翻訳漏れがないか目視確認

## 9. ロールバック計画

### マイグレーション失敗時
```sql
-- ロールバックSQL（事前に準備）
-- code_remarkからcode_nameを復元
UPDATE code_master SET
  code_name = SPLIT_PART(code_remark, ' / ', 1),
  code_remark = CASE 
    WHEN POSITION(' / ' IN code_remark) > 0 
    THEN SUBSTRING(code_remark FROM POSITION(' / ' IN code_remark) + 3)
    ELSE NULL
  END,
  update_at = NOW()
WHERE code_name LIKE 'codeMaster.%';
```

### 本番環境での対応
1. DBバックアップ取得
2. マイグレーション実行
3. 動作確認
4. 問題発生時は即座にロールバックSQL実行

## 10. 関連ドキュメント

- [code_masterテーブル定義](../../design/db/ddl/code_master.sql)
- [i18n規約](.clinerules/development/frontend.md)
- [マイグレーション規約](../../backend/migrations/README.md)

## 11. 承認記録

- **計画書提示日時**: 2026-05-25 16:00
- **承認日時**: （承認後に記入）
- **承認者コメント**: 

## 12. 実施記録

### 実施日時
開始: 2026-05-25 16:00
完了: （作業完了時に記入）

### 計画からの変更点
- code_remarkへの日本語移行は実施（マイグレーションSQL内）
- Backend Serviceの修正はシンプルな文字列連結で実装（ヘルパー関数不要と判断）

### 発生した問題と解決方法
（実施中に発生した問題を記録）

### 最終的な成果物
- [x] マイグレーションファイル作成（`backend/migrations/20260525_convert_code_master_to_i18n.sql`）
- [x] insertInitialData.sql更新（`backend/src/sql/queries/codeMaster/insertInitialData.sql`）
- [x] ja.json/en.json更新（35件）
- [x] Backend Service修正（`backend/src/services/codeMasterService.ts`）
- [x] Frontend修正（`frontend/src/hooks/useCodeMaster.ts` — rawOptions保持 + render時t()適用）
- [x] Frontend修正（`frontend/src/components/project/InstructionEditDialog.tsx` — getMultipleSelectOptions使用箇所にt()適用）
- [ ] マイグレーション実行（開発DB）
- [ ] テスト完了

## 13. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）
