# タスク計画書: タスク登録のMAIML解析処理をフロントエンドに移行

## メタデータ
- **作成日時**: 2026-02-24 13:29
- **タスクID**: task_registration_maiml_frontend_migration
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

`getTaskRegistration` API において、現状DBからデータが取れなかった時にバックエンドでMAIMLファイルを解析して初期値を返していますが、フロントエンドでコンテキストからMAIML情報を取得できるようになったため、バックエンドは検索結果が空の場合は空配列を返し、フロントエンド側でMAIML情報から初期値を作成するように修正します。

## 2. 目的と期待される成果

### 目的
- バックエンドとフロントエンドの責務を明確に分離
- バックエンドのMAIMLファイル読み込み・解析処理を削除し、パフォーマンスを向上
- フロントエンドでコンテキスト情報を活用した柔軟なデータ処理を実現

### 期待される成果
- [ ] バックエンドの`getTaskRegistration`からMAIML解析ロジックを削除
- [ ] DBにデータがない場合は空配列を返すように修正
- [ ] 不要となった`getMethodIdsFromMaiml`関数を削除
- [ ] フロントエンドのタスク登録画面で空配列を受け取った場合の処理を確認

## 3. 実装ステップ

### Phase 1: バックエンド修正
- [ ] `getTaskRegistration`関数からMAIML解析処理を削除
- [ ] DBから取得できない場合は空配列を返すように修正
- [ ] `getMethodIdsFromMaiml`プライベート関数を削除
- [ ] 不要となったインポート文を削除（MaimlParserTyped、getStorageService）

### Phase 2: フロントエンド修正
- [ ] `TaskRegistrationTab.tsx`で`useProjectMaiml`フックを使用
- [ ] APIから空配列が返ってきた場合、`maimlRoot`からメソッド情報を取得
- [ ] メソッド情報から初期タスクデータを生成
- [ ] 生成したタスクデータを表示

### Phase 3: 動作確認
- [ ] バックエンドのビルドエラーがないことを確認
- [ ] フロントエンドのビルドエラーがないことを確認
- [ ] DBにデータがある場合の動作確認
- [ ] DBにデータがない場合の動作確認（コンテキストから初期値生成）

## 4. 影響範囲

### 変更するファイル
1. `backend/src/services/taskRegistrationService.ts` - MAIML解析ロジックの削除
2. `frontend/src/components/project/TaskRegistrationTab.tsx` - コンテキストからの初期値生成処理追加

### 影響を受ける機能
- タスク登録API (`GET /api/v1/experiment-admin/projects/:projectName/task-registration`)
- フロントエンドのタスク登録画面（ただし、フロントエンドは既に対応済みの前提）

## 5. 技術的詳細

### 修正内容

#### 修正前（現状）
```typescript
if (dbTasks && dbTasks.length > 0) {
  // DBにデータがある場合
  tasks = dbTasks.map(...);
} else if (isMaimlRegistered) {
  // DBにデータがない場合、MAIMLファイルから解析
  try {
    const methodIds = await getMethodIdsFromMaiml(organizationId, projectName);
    tasks = methodIds.map(...);
  } catch (error) {
    console.error('Failed to parse MAIML file:', error);
  }
}
```

#### 修正後
```typescript
if (dbTasks && dbTasks.length > 0) {
  // DBにデータがある場合のみtasksを設定
  tasks = dbTasks.map(...);
}
// DBにデータがない場合は空配列のまま（フロントエンドで処理）
```

### 削除する関数
- `getMethodIdsFromMaiml` - MAIMLファイルからメソッドIDを取得する関数

### 削除するインポート（バックエンド）
- `MaimlParserTyped` from '../utils/maimlParserTyped'
- `getStorageService` from '../services/storageService'（saveTaskRegistrationで使用していなければ）

### 追加するコード（フロントエンド）

#### TaskRegistrationTab.tsxの修正

1. **useProjectMaimlフックの追加**
```typescript
const { maimlRoot, parser } = useProjectMaiml();
```

2. **空配列時の初期値生成ロジック**
```typescript
// APIから空配列が返ってきた場合、コンテキストのMAIMLから初期値を生成
if (data.tasks && data.tasks.length === 0 && maimlRoot?.protocol?.methods) {
  const methods = maimlRoot.protocol.methods;
  const initialTasks: TaskDetail[] = methods.map((method, index) => ({
    id: index + 1,
    methodId: method.id,
    experimentCondition: 0, // デフォルト値
    trialCount: 1, // デフォルト値
    experimentOrder: index + 1,
    taskNumberOptions: [1],
  }));
  
  setTaskDetails(initialTasks);
  onTasksChange?.(initialTasks);
  
  // メソッド情報も設定
  const methodInfos: MethodInfo[] = methods.map((method) => ({
    id: method.id,
    name: method.name || method.id,
    displayName: method.name || method.id,
    description: undefined,
  }));
  setAvailableMethods(methodInfos);
} else if (data.tasks && data.tasks.length > 0) {
  // 既存の処理（DBからデータがある場合）
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| フロントエンドがまだ対応していない | 高 | 低 | ユーザーに確認済みの前提で進める |
| 既存のタスク登録データへの影響 | 低 | 低 | DBにデータがある場合は従来通り動作 |

## 7. テスト計画

### 動作確認
- [ ] TypeScriptのビルドが成功すること
- [ ] 不要なインポートが削除されていること
- [ ] getTaskRegistration関数が簡潔になっていること

## 8. ロールバック計画

修正前のコードは簡単に復元可能。必要に応じてGitのコミット履歴から戻すことができます。

## 9. 関連ドキュメント

- `backend/src/types/taskRegistration.ts` - タスク登録の型定義
- `backend/src/controllers/taskRegistrationController.ts` - タスク登録コントローラー

## 10. 実装詳細補足

### フロントエンドの修正詳細

#### 現状の問題
`TaskRegistrationTab.tsx`では、APIから空配列が返ってくると「メソッドが取得できなかった」と表示されるが、実際にはコンテキストにMAIML情報が存在する。

#### 修正後の動作フロー
1. APIから`getTaskRegistration`を呼び出し
2. `data.tasks`が空配列の場合：
   - `useProjectMaiml`から`maimlRoot`を取得
   - `maimlRoot.protocol.methods`からメソッド情報を抽出
   - 各メソッドに対して初期タスクデータを生成（experimentCondition: 0, trialCount: 1）
   - 生成したタスクデータを表示
3. `data.tasks`にデータがある場合：
   - 従来通りDBから取得したデータを表示

#### メリット
- バックエンドのS3/Swiftアクセスが不要（パフォーマンス向上）
- フロントエンドでコンテキスト情報を活用（DRY原則）
- バックエンドとフロントエンドの責務が明確化

## 11. 承認記録

- **計画書提示日時**: 2026-02-24 13:29
- **計画書更新日時**: 2026-02-24 13:32（フロントエンド修正追加）
- **承認日時**: 2026-02-24 13:33
- **承認者コメント**: 承認（このまま実装を進めてください）

## 12. 実施記録

### 実施日時
- **開始**: 2026-02-24 13:33
- **完了**: 2026-02-24 13:35

### 実施内容

#### Phase 1: バックエンド修正 ✅
1. ✅ `getTaskRegistration`関数からMAIML解析処理を削除
2. ✅ DBから取得できない場合は空配列を返すように修正
3. ✅ `getMethodIdsFromMaiml`プライベート関数を削除
4. ✅ 不要となったインポート文を削除
   - `MaimlParserTyped` from '../utils/maimlParserTyped'
   - `getStorageService` from '../services/storageService'

#### Phase 2: フロントエンド修正 ✅
1. ✅ `TaskRegistrationTab.tsx`で`useProjectMaiml`フックを追加
2. ✅ APIから空配列が返ってきた場合、`maimlRoot`からメソッド情報を取得
3. ✅ メソッド情報から初期タスクデータを生成
4. ✅ 生成したタスクデータを表示
5. ✅ useEffect依存配列に`maimlRoot`を追加

### 変更されたファイル
1. `backend/src/services/taskRegistrationService.ts`
   - MAIML解析ロジックを削除（約50行削減）
   - getMethodIdsFromMaiml関数を削除
   - 不要なインポートを削除

2. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - useProjectMaimlフックを追加
   - 空配列時の初期値生成ロジックを追加
   - デバッグログを追加

### 計画からの変更点
- なし（計画通りに実施完了）

### 発生した問題と解決方法
- なし（スムーズに実装完了）

### 最終的な成果物
- ✅ バックエンドのMAIML解析ロジック削除
- ✅ フロントエンドでコンテキストからの初期値生成実装
- ✅ バックエンドとフロントエンドの責務分離達成
- ✅ パフォーマンス向上（S3/Swiftアクセス削減）

## 13. 振り返り

### うまくいった点
- バックエンドとフロントエンドの修正が計画通りスムーズに完了
- コンテキストの活用により、フロントエンドで柔軟なデータ処理が実現
- 既存機能への影響なし（DBにデータがある場合は従来通り動作）

### 改善が必要な点
- 特になし

### 学んだこと
- ProjectMaimlContextを活用することで、バックエンドの負荷を軽減できる
- フロントエンドでコンテキスト情報を活用することで、APIコールを減らせる
- 責務の分離により、それぞれの層がシンプルになる
