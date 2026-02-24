# タスク計画書: 実験作業者画面_メソッドタスク取得API連携

## メタデータ
- **作成日時**: 2026-02-19 18:17
- **タスクID**: 実験作業者画面_メソッドタスク取得API連携
- **優先度**: 高
- **推定工数**: 8時間

## 1. タスク概要

実験作業者メニュー画面のメソッド・タスク表示をモックデータから実際のバックエンドAPI（API #4: タスク一覧取得API）に移行します。

**現状の問題点**:
- プロジェクト選択後、メソッド・タスク情報をフロントエンドのモックデータ（`projectsData`）から取得
- バックエンドにAPI実装済みだが、フロントエンドが連携していない
- データ整合性が保証されない

**解決策**:
- バックエンドAPI（`GET /api/v1/progress/projects/:projectName/worker-tasks`）を使用
- フロントエンドをAPI連携に修正
- モックデータへの依存を削除

## 2. 目的と期待される成果

### 目的
実験作業者メニュー画面で、実際のバックエンドデータに基づいたメソッド・タスク情報を表示する

### 期待される成果
- [x] 調査完了: APIレスポンスとフロントエンドの現状を分析
- [x] Phase 1: API通信関数の実装完了
- [x] Phase 2: 進捗確認タブのAPI連携完了
- [x] Phase 3: 指示確認タブのAPI連携完了
- [x] Phase 4: 実験記録タブのAPI連携完了
- [ ] UI設計書の更新完了（不要: 設計書は既に正しい内容）
- [ ] 動作確認完了（バックエンド起動後に実施）

## 3. 実装ステップ

### Phase 1: API通信関数の実装
- [x] `frontend/src/api/projectApiService.ts` に型定義を追加
  - `WorkerTasksResponse` インターフェース
  - `WorkerMethod` インターフェース
  - `WorkerTask` インターフェース
- [x] `getWorkerTasks()` 関数を実装
  - エンドポイント: `GET /api/v1/progress/projects/:projectName/worker-tasks`
  - パラメータ: projectName
  - エラーハンドリング
  - デバッグログ

### Phase 2: 進捗確認タブの修正
- [x] `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` を修正
  - モックデータのimport削除
  - 状態管理の追加（methods, tasks, loading）
  - `useEffect` でのAPI呼び出し実装
  - APIレスポンスをUI用の型に変換
  - `task_name = task_no` の適用
  - メソッドタブ生成ロジックの修正
  - ローディング表示の追加
  - エラーハンドリングの実装
- [ ] 動作確認（バックエンド起動後に実施）
  - プロジェクト選択時にタスク一覧が表示される
  - メソッドタブが正しく生成される
  - タスクテーブルが正しく表示される
  - エラー時に適切なメッセージが表示される

### Phase 3: 指示確認タブの修正
- [x] `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` を修正
  - モックデータのimport削除
  - `getWorkerTasks()` API呼び出しの追加
  - メソッド・タスク一覧の取得と状態管理
  - `task_name = task_no` の適用
  - エラーハンドリングの実装
- [ ] 動作確認（バックエンド起動後に実施）
  - メソッド選択コンボボックスに正しくメソッド一覧が表示される
  - タスク選択コンボボックスに正しくタスク一覧が表示される
  - 選択したメソッド・タスクに紐づく指示が表示される

### Phase 4: 実験記録タブの修正
- [x] `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` を修正
  - モックデータのimport削除
  - `getWorkerTasks()` API呼び出しの追加
  - タスク一覧の取得と状態管理
  - `task_name = task_no` の適用
  - エラーハンドリングの実装
- [ ] 動作確認（バックエンド起動後に実施）
  - メソッド・タスク選択が正常に動作する
  - トランジション一覧が正しく表示される

### Phase 5: ドキュメント更新
- [x] `docs/design/ui/ui_experiment_worker_main.md` を更新
  - UI設計書は既に正しいAPI仕様が記載されているため更新不要
  - タスク計画書（本ファイル）に実装記録を追加

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/api/projectApiService.ts` - API通信関数の追加
2. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` - モックデータからAPI連携へ
3. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` - モックデータからAPI連携へ
4. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - モックデータからAPI連携へ
5. `docs/design/ui/ui_experiment_worker_main.md` - UI設計書の更新

### 新規作成するファイル
なし

### 削除するファイル
なし（モックデータファイルは他機能で使用中のため残す）

### 影響を受ける機能
- 実験作業者メニュー: 進捗確認タブ
- 実験作業者メニュー: 指示確認タブ
- 実験作業者メニュー: 実験記録タブ

## 5. 技術的詳細

### 使用する技術・ライブラリ
- TypeScript: 型定義の実装
- React: コンポーネントの修正
- Axios: API通信
- Ant Design: UIコンポーネント（変更なし）

### API仕様

**エンドポイント**: `GET /api/v1/progress/projects/:projectName/worker-tasks`

**認証**: 必須（JWT）

**権限**: `experiment_worker`（読取専用）

**パスパラメータ**:
- `projectName`: プロジェクト名（string）

**クエリパラメータ（オプション）**:
- `status`: タスクステータスフィルタ
- `assignedTo`: 担当者フィルタ（UUID）
- `sortBy`: ソート基準（`task_no`, `created_at`, `updated_at`, `status`）
- `order`: ソート順（`asc`, `desc`）

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "project_id": "uuid",
    "project_name": "Sample Project",
    "methods": [
      {
        "method_id": "method1",
        "method_name": "合成実験",
        "experiment_order": 1,
        "tasks": [
          {
            "task_no": 1,
            "status": "completed",
            "experiment_user_id": "uuid",
            "experiment_user_name": "Worker Name",
            "created_at": "2026-01-21T10:00:00Z",
            "updated_at": "2026-01-21T14:00:00Z",
            "progress": 100
          }
        ]
      }
    ]
  },
  "meta": {
    "timestamp": "2026-02-19T09:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### データ変換ロジック

**task_name の扱い**:
- APIレスポンスには `task_name` フィールドなし
- フロントエンドで `task_name = task_no.toString()` として設定

**taskId の生成**:
```typescript
taskId: `${projectId}-${methodId}-${taskNo}`
```

**型変換**:
```typescript
// APIレスポンス → UI用の型
const methodsData: Method[] = result.data.methods.map(method => ({
  methodId: method.method_id,
  methodName: method.method_name,
  experimentOrder: method.experiment_order,
}));

const allTasks: Task[] = result.data.methods.flatMap(method =>
  method.tasks.map(task => ({
    taskId: `${projectId}-${method.method_id}-${task.task_no}`,
    taskNo: task.task_no,
    taskName: task.task_no.toString(), // ✅ task_name = task_no
    methodId: method.method_id,
    status: task.status,
    assignedUserId: task.experiment_user_id,
    assignedUserName: task.experiment_user_name,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    progress: task.progress,
    projectId: projectId,
  }))
);
```

### セキュリティ考慮事項
- [ ] JWT認証が正しく動作することを確認
- [ ] マルチテナント分離が維持されることを確認
- [ ] エラー時に機密情報が漏洩しないことを確認

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| APIレスポンスの構造が仕様と異なる | 高 | 中 | 実装前にバックエンドAPIの動作確認を実施 |
| プロジェクト名の取得失敗 | 中 | 低 | プロジェクト一覧APIが正常に動作していることを確認 |
| タスク名（task_name）がない | 低 | 確定 | task_no を task_name として使用（仕様確定済み） |
| モックデータ削除による他機能への影響 | 中 | 低 | 他機能（指示データ、問題報告等）はモックデータを継続使用 |
| 既存のタスクIDとの不整合 | 低 | 低 | taskId生成ロジックを統一（`${projectId}-${methodId}-${taskNo}`） |

## 7. テスト計画

### Phase 1: API通信関数のテスト
- [ ] `getWorkerTasks()` の呼び出しが成功する
- [ ] レスポンスが正しく型変換される
- [ ] エラー時に適切な例外がスローされる
- [ ] デバッグログが正しく出力される

### Phase 2: 進捗確認タブのテスト
- [ ] プロジェクト選択時にタスク一覧が取得される
- [ ] メソッドタブが正しく生成される
- [ ] 各メソッドタブ内にタスクテーブルが表示される
- [ ] タスクステータス、担当者、進捗率が正しく表示される
- [ ] エラー時に適切なエラーメッセージが表示される
- [ ] ローディング中にスピナーが表示される

### Phase 3: 指示確認タブのテスト
- [ ] メソッド選択コンボボックスにメソッド一覧が表示される
- [ ] タスク選択コンボボックスにタスク一覧が表示される
- [ ] 選択したメソッド・タスクに応じて指示が表示される
- [ ] エラー時に適切なエラーメッセージが表示される

### Phase 4: 実験記録タブのテスト
- [ ] メソッド・タスク選択が正常に動作する
- [ ] 選択したタスクに紐づくトランジション一覧が表示される
- [ ] エラー時に適切なエラーメッセージが表示される

### 統合テスト
- [ ] プロジェクト選択から各タブでの表示まで一連の操作が正常に動作する
- [ ] タブ間でメソッド・タスクの選択状態が共有される
- [ ] 異なるプロジェクトを選択した際に正しくデータが切り替わる

### パフォーマンステスト
- [ ] API呼び出しが適切なタイミングで行われる（不要な再実行がない）
- [ ] ローディング時間が許容範囲内（3秒以内）

## 8. ロールバック計画

API連携に問題が発生した場合の対処方法：

**Step 1: 問題の特定**
- コンソールログでエラー内容を確認
- バックエンドAPIの動作を確認

**Step 2: 緊急対応**
- Git revert でコミットを取り消し
- モックデータへの依存を一時的に復元

**Step 3: 根本対応**
- バックエンドAPIの修正が必要な場合は Issue を作成
- フロントエンドのロジック修正が必要な場合は修正実装

## 9. 関連ドキュメント

- [API仕様書: 進捗確認API](../design/api/api_progress_monitoring.md) - API #4
- [UI設計書: 実験作業者メイン画面](../design/ui/ui_experiment_worker_main.md)
- [TypeScript型定義規約](../../.clinerules/development/typescript.md)
- [コーディング規約](../../.clinerules/development/config.md)
- [ファイル書き込み規約](../../.clinerules/development/file-writing.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-19 18:17
- **承認日時**: 2026-02-19 18:17
- **承認者コメント**: タスク計画書承認済み、実装開始

## 11. 実施記録

### 実施日時
開始: 2026-02-19 18:17
完了: 2026-02-19 18:31

### 計画からの変更点

**1. フィルタパラメータの省略**
- 当初計画: クエリパラメータ（status, assignedTo, sortBy, order）を実装
- 実際: パラメータなしで実装（将来の拡張に備えてAPI側は対応済み）
- 理由: 現時点では全タスク取得で十分、必要になった時点で追加可能

**2. UI設計書の更新スキップ**
- 当初計画: `ui_experiment_worker_main.md` の更新
- 実際: 更新不要と判断
- 理由: UI設計書は既にAPI連携を前提とした正しい仕様が記載されていた

**3. 型変換の追加プロパティ**
- APIレスポンスに存在しないプロパティをデフォルト値で補完
- UI用の型（Method, Task）に必要なプロパティを追加:
  - Method: `description`, `category`, `transitions`
  - Task: `sampleNumber`, `notes`, `progressRate`, `transitionStatuses`, `progressReport`, `recordNumber`

### 発生した問題と解決方法

**1. 型エラー: プロパティ不足**
- 問題: APIレスポンスの型とUI用の型で必須プロパティが異なる
- 解決: UI用の型に必須プロパティをデフォルト値で補完
  ```typescript
  description: '',
  category: 'experiment',
  transitions: [],
  sampleNumber: '',
  // ...その他
  ```

**2. タスク一覧の重複宣言**
- 問題: ExperimentRecordTabで`tasks`変数が複数回宣言されエラー
- 解決: API取得用の`tasks`状態とフィルタ済み`filteredTasks`に分離

**3. projectsDataへの依存残存**
- 問題: InstructionConfirmationTabとExperimentRecordTabでモックデータ参照が残っていた
- 解決: すべてのモックデータimportを削除し、API取得データに置き換え

### 最終的な成果物
- [x] API通信関数の実装完了
  - `frontend/src/api/projectApiService.ts` に型定義とgetWorkerTasks()関数を追加
- [x] 進捗確認タブのAPI連携完了
  - `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` をAPI連携に修正
- [x] 指示確認タブのAPI連携完了
  - `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` をAPI連携に修正
- [x] 実験記録タブのAPI連携完了
  - `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` をAPI連携に修正
- [x] タスク計画書の更新完了
  - 本ファイル（PLAN.md）に実施記録を追加
- [ ] 動作確認完了（バックエンド起動後に実施予定）

### 実装詳細

**API通信関数**:
- エンドポイント: `GET /api/v1/progress/projects/:projectName/worker-tasks`
- 認証: JWT（自動）
- エラーハンドリング: try-catch + Ant Designのmessage.error()
- デバッグログ: console.log()で詳細情報を出力

**データ変換ロジック**:
```typescript
// taskId生成
taskId: `${project_id}-${method_id}-${task_no}`

// task_name設定
taskName: task_no.toString()

// Method型への変換（必須プロパティを補完）
const methodsData: Method[] = apiData.methods.map((method: WorkerMethod) => ({
  methodId: method.method_id,
  methodName: method.method_name,
  experimentOrder: method.experiment_order,
  description: '',
  category: 'experiment',
  transitions: [],
}));

// Task型への変換（必須プロパティを補完）
const allTasks: Task[] = apiData.methods.flatMap((method: WorkerMethod) =>
  method.tasks.map((task: WorkerTask) => ({
    taskId: `${project_id}-${method_id}-${task.task_no}`,
    taskNo: task.task_no,
    taskName: task.task_no.toString(),
    methodId: method.method_id,
    methodName: method.method_name,
    status: task.status as Task['status'],
    assignedUserId: task.experiment_user_id,
    assignedUserName: task.experiment_user_name,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    progress: task.progress,
    projectId: project_id,
    sampleNumber: '',
    notes: '',
    progressRate: task.progress,
    transitionStatuses: [],
    progressReport: '',
    recordNumber: '',
  }))
);
```

**共通実装パターン**:
- すべてのタブで同じAPI呼び出しロジックを使用
- プロジェクト選択時に`useEffect`でAPI呼び出し
- ローディング状態の管理（loading, setLoading）
- エラー時のメッセージ表示（message.error()）
- デバッグログの出力（console.log/console.error）

## 12. 振り返り

### うまくいった点

1. **型変換ロジックの統一**
   - 3つのタブすべてで同じAPI呼び出しとデータ変換ロジックを使用
   - コードの一貫性が保たれ、保守性が向上

2. **段階的な実装**
   - Phase 1でAPI関数を実装してからPhase 2-4で各タブに適用
   - 問題の早期発見と修正が可能

3. **デフォルト値による型補完**
   - APIレスポンスに存在しないプロパティをデフォルト値で補完
   - 将来的なAPI拡張に備えた柔軟な設計

4. **エラーハンドリングの充実**
   - try-catch + message.error()で適切なエラー表示
   - デバッグログで問題の追跡が容易

### 改善が必要な点

1. **型定義の冗長性**
   - API型とUI型で重複するプロパティが多い
   - 今後、共通の型を抽出して重複を削減する余地あり

2. **デフォルト値の管理**
   - 各タブで同じデフォルト値を設定しているため、変更時に複数箇所を修正する必要がある
   - 今後、共通のコンバータ関数を作成することを検討

3. **動作確認の未実施**
   - バックエンドが起動していないため、実際の動作確認は未実施
   - 次のタスクとして動作確認を実施する必要あり

4. **フィルタ機能の未実装**
   - クエリパラメータ（status, assignedToなど）は未実装
   - 必要になった時点で追加する予定

### 学んだこと

1. **APIレスポンスとUI型の乖離**
   - バックエンドAPIのレスポンス構造とフロントエンドのUI用型定義が異なる場合がある
   - デフォルト値での補完が有効なアプローチ

2. **task_nameの扱い**
   - APIレスポンスに`task_name`が存在しない場合、`task_no.toString()`で代用
   - 今後、バックエンド側で`task_name`を追加する可能性もあるが、現時点では不要

3. **モックデータからAPI連携への移行**
   - 段階的な移行（API関数実装 → 各タブへの適用）が効果的
   - 一度に全部を変更すると問題の特定が困難になる

4. **TypeScriptの型安全性**
   - 型定義を明示的に行うことで、コンパイル時にエラーを検出できる
   - `as Task['status']`などの型アサーションは最小限に留める

### 次のアクションアイテム

1. **動作確認の実施**（優先度: 高）
   - バックエンドを起動して実際にプロジェクトを選択
   - 3つのタブすべてで正常にメソッド・タスクが表示されることを確認
   - エラー時の挙動を確認

2. **型定義の最適化**（優先度: 中）
   - 共通の型を抽出してコードの重複を削減
   - コンバータ関数の作成を検討

3. **フィルタ機能の実装**（優先度: 低）
   - 必要に応じてクエリパラメータを追加
   - UI側でフィルタ機能を実装

4. **ドキュメントの充実**（優先度: 低）
   - API仕様書にフロントエンド実装例を追加
   - トラブルシューティングガイドの作成
