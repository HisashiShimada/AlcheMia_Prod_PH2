# タスク計画書: トランジション進捗更新時イベントログ追加

## メタデータ
- **作成日時**: 2026-03-03 15:10
- **タスクID**: transition-event-log
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

トランジションの進捗が更新される以下の2つのタイミングで、`maiml_event_log` テーブルへイベントログを追加する。

| # | エンドポイント | 契機 |
|---|---|---|
| ① | POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data | みなし進捗更新あり の場合 |
| ② | PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status | 手動でトランジションステータスを更新した場合 |

---

## 2. 調査結果

### 2.1 対象ファイルと処理フロー

#### ① POST /data（みなし進捗更新）

```
experimentController.ts#saveBatchData()
  └─ experimentDataService.ts#saveBatchData()
       └─ updateDeemedProgress()   ← ここにイベントログ追加
            └─ transitionRepo.updateStatusDeemed()
               ★ ← insertTransitionProgressLog() を追加する
```

- `updateDeemedProgress()` は `use_deemed_progress = true` の組織のみ動作
- MAIMLのアーク解析でトランジションIDを特定してから `updateStatusDeemed()` を呼ぶため、トランジションIDは明確に存在する
- ステータス:
  - `TransitionStatusEnum.IN_PROGRESS (3)` → ラベル: `"running"`
  - `TransitionStatusEnum.COMPLETED (5)` → ラベル: `"completed"`
- 進捗率: `newProgressRate`（計算済みの値）
- コメント: なし（みなし進捗は自動更新のためコメント不要）

#### ② PATCH /transitions/:transitionId/status

```
progressRoutes.ts → progressController.ts#updateTransitionStatus()
  └─ progressService.ts#updateTransitionStatus()
       ├─ transitionDataRepository.updateStatus()
       └─ eventLogRepository.logEvent()   ← 旧フォーマット（今回置き換え）
          ★ ← insertTransitionProgressLog() に置き換える
```

- `progressService.ts#updateTransitionStatus()` 内に既に `logEvent()` の呼び出しがあるが、旧フォーマット（単純なキーバリューJSON）を使用
- 今回は**指定のXML構造を模したJSONフォーマット**に置き換える
- `comment` がリクエストボディに含まれるが、`progressController.ts` → `progressService.ts` に渡されていないため、`comment` を渡す経路を追加する

### 2.2 comment の引き回し調査

現在の `progressController.ts#updateTransitionStatus()` のリクエスト処理:
```typescript
const { taskNo: _taskNo, status, progressRate, comment: _comment } = req.body;
// TODO: _taskNo、_commentはmaiml_event_logテーブルに格納する処理を実装予定
```

`_comment` を受け取っているが `progressService.updateTransitionStatus()` には渡していない。  
`TransitionDataUpdate` 型にも `comment` は含まれるが、今回は `EventLog` 用に別途渡す必要がある。

### 2.3 maiml_event_log テーブル構造

```sql
maiml_event_log (
  organization_id UUID NOT NULL,
  project_id VARCHAR NOT NULL,
  sequence_no INTEGER NOT NULL,
  log JSONB,
  create_user_id VARCHAR,
  update_user_id VARCHAR,
  create_at TIMESTAMP,
  update_at TIMESTAMP,
  PRIMARY KEY (organization_id, project_id, sequence_no)
)
```

---

## 3. ログJSON仕様

### 3.1 サンプル（タスク指示より）

```xml
<eventLog id="eventLogID">
  <log id="work_1772413250598_yukihiro_log_transition_transition-1772412556174" ref="transition-1772412556174">
    <trace id="trace_transition-1772412556174_work_1772413250598_yukihiro" ref="transition-1772412556174">
      <event id="event_report_yukihiro.omori@soft-service.co.jp_1772500018461" ref="transition-1772412556174">
        <property key="timestamp" xsi:type="xs:dateTime">2026-03-03T01:06:58.461Z</property>
        <property key="worker_id" xsi:type="xs:string">yukihiro.omori@soft-service.co.jp</property>
        <property key="status" xsi:type="xs:string">start</property>
        <property key="progress_percentage" xsi:type="xs:int">15</property>
        <property key="report_type" xsi:type="xs:string">transition_progress</property>
        <property key="comments" xsi:type="xs:string">あかさたな</property>
      </event>
    </trace>
  </log>
</eventLog>
```

### 3.2 JSON変換後の構造

```json
{
  "eventLog": {
    "@id": "eventLogID",
    "log": {
      "@id": "work_{timestamp}_{userShortName}_log_transition_{transitionId}",
      "@ref": "{transitionId}",
      "trace": {
        "@id": "trace_{transitionId}_work_{timestamp}_{userShortName}",
        "@ref": "{transitionId}",
        "event": {
          "@id": "event_report_{loginId}_{timestamp2}",
          "@ref": "{transitionId}",
          "property": [
            { "@key": "timestamp", "@xsi:type": "xs:dateTime", "#text": "2026-03-03T01:06:58.461Z" },
            { "@key": "worker_id", "@xsi:type": "xs:string", "#text": "{loginId}" },
            { "@key": "status", "@xsi:type": "xs:string", "#text": "{statusLabel}" },
            { "@key": "progress_percentage", "@xsi:type": "xs:int", "#text": 15 },
            { "@key": "report_type", "@xsi:type": "xs:string", "#text": "transition_progress" },
            { "@key": "comments", "@xsi:type": "xs:string", "#text": "{comment}" }
          ]
        }
      }
    }
  }
}
```

### 3.3 ID採番ルール

| フィールド | ルール | 例 |
|---|---|---|
| `eventLog @id` | 固定値 `"eventLogID"` | `"eventLogID"` |
| `log @id` | `"work_{ts1}_{shortName}_log_transition_{transitionId}"` | `"work_1772413250598_yukihiro_log_transition_transition-xxx"` |
| `log @ref` | `{transitionId}` | `"transition-1772412556174"` |
| `trace @id` | `"trace_{transitionId}_work_{ts1}_{shortName}"` | `"trace_transition-xxx_work_1772413250598_yukihiro"` |
| `trace @ref` | `{transitionId}` | `"transition-1772412556174"` |
| `event @id` | `"event_report_{loginId}_{ts2}"` | `"event_report_yukihiro.omori@soft-service.co.jp_1772500018461"` |
| `event @ref` | `{transitionId}` | `"transition-1772412556174"` |

- `ts1` = `Date.now()`（ログ生成時のUnixミリ秒）
- `ts2` = `Date.now()`（同じかわずかに異なる可能性あり、実装上は同じ値を使用）
- `shortName` = `loginId`（メールアドレス）の `@` より前の部分（例: `yukihiro.omori@...` → `yukihiro`）
- `loginId` = `user_authentication.login_id`（メールアドレス形式）

### 3.4 statusLabel マッピング

| 場面 | 元の値 | statusLabel |
|---|---|---|
| みなし進捗更新 | `TransitionStatusEnum.IN_PROGRESS (3)` | `"running"` |
| みなし進捗更新 | `TransitionStatusEnum.COMPLETED (5)` | `"completed"` |
| 手動更新(PATCH) | status=0 (INITIAL) | `"initial"` |
| 手動更新(PATCH) | status=1 (PREPARING) | `"preparing"` |
| 手動更新(PATCH) | status=2 (READY) | `"ready"` |
| 手動更新(PATCH) | status=3 (IN_PROGRESS) | `"running"` |
| 手動更新(PATCH) | status=4 (PAUSED) | `"paused"` |
| 手動更新(PATCH) | status=5 (COMPLETED) | `"completed"` |
| 手動更新(PATCH) | status=6 (ERROR) | `"error"` |

---

## 4. 実装ステップ

### Phase 1: EventLogRepository への新メソッド追加
- [ ] `insertTransitionProgressLog()` メソッドを追加
  - `user_authentication` テーブルから `login_id` を取得
  - sequence_no の自動採番（既存パターンと同じ）
  - 指定JSON構造を構築して INSERT

### Phase 2: progressService.ts の修正
- [ ] `updateTransitionStatus()` 内の `logEvent()` を `insertTransitionProgressLog()` に置き換え
- [ ] `comment` を `progressController.ts` → `progressService.ts` へ引き回す
  - `progressController.ts#updateTransitionStatus()` の `_comment` を `progressService.updateTransitionStatus()` に渡す
  - `progressService.updateTransitionStatus()` のシグネチャに `comment` 引数を追加（オプション）

### Phase 3: experimentDataService.ts の修正
- [ ] `updateDeemedProgress()` 内の `transitionRepo.updateStatusDeemed()` 成功後に `insertTransitionProgressLog()` を呼び出し

---

## 5. 変更ファイル

| ファイル | 変更種別 | 変更内容 |
|---|---|---|
| `backend/src/repositories/eventLogRepository.ts` | 修正 | `insertTransitionProgressLog()` メソッド追加 |
| `backend/src/services/progressService.ts` | 修正 | `updateTransitionStatus()` のログ呼び出しを新メソッドに切り替え・`comment` 引数追加 |
| `backend/src/controllers/progressController.ts` | 修正 | `_comment` を `progressService.updateTransitionStatus()` に渡す |
| `backend/src/services/experimentDataService.ts` | 修正 | `updateDeemedProgress()` にイベントログ呼び出し追加 |

---

## 6. セキュリティ考慮事項

- [ ] organization_id フィルタ必須（maiml_event_log INSERT時）
- [ ] Parameterized Queries を使用（SQLインジェクション対策）
- [ ] user_authentication からのlogin_id取得もorganization_idでフィルタ

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| user_authentication のlogin_id取得失敗 | 低 | 低 | 取得失敗時はuserIdをフォールバックとして使用 |
| イベントログ記録失敗 | 低 | 低 | ログ記録失敗はwarningログを出力し、メイン処理は継続 |
| みなし進捗の複数トランジション更新 | 低 | 中 | ループで1件ずつ記録（既存パターンと同じ） |

---

## 8. テスト計画

- [ ] `insertTransitionProgressLog()` 単体テスト（正常系・異常系）
- [ ] POST /data でみなし進捗更新後、maiml_event_log にレコードが追加されることを確認
- [ ] PATCH /transitions/:transitionId/status 後、maiml_event_log にレコードが追加されることを確認
- [ ] JSONのフォーマット（ID採番、property構造）が正しいことを確認

---

## 9. 承認記録

- **計画書提示日時**: 2026-03-03 15:10
- **承認日時**: 2026-03-03 15:10
- **承認者コメント**: Act modeへの切り替えにより承認

---

## 10. 実施記録

### 実施日時
開始: 2026-03-03 15:10
完了: 2026-03-03 15:19

### 実装状況
- [x] Phase 1: EventLogRepository への新メソッド追加
- [x] Phase 2: progressService.ts の修正
- [x] Phase 3: experimentDataService.ts の修正

### 変更ファイル一覧
1. `backend/src/repositories/eventLogRepository.ts` - `insertTransitionProgressLog()` メソッド追加
2. `backend/src/services/progressService.ts` - `updateTransitionStatus()` に `comment` 引数追加・ログ呼び出しを新メソッドに切り替え
3. `backend/src/controllers/progressController.ts` - `_comment` を `progressService.updateTransitionStatus()` に渡すよう修正（TODO削除）
4. `backend/src/services/experimentDataService.ts` - `EventLogRepository` import追加・`updateDeemedProgress()` に `insertTransitionProgressLog()` 呼び出し追加

### TypeScriptコンパイル確認
- tsc --noEmit エラーなし（正常終了）
