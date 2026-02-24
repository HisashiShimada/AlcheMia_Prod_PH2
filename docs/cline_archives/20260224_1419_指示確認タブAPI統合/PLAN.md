# タスク計画書: 指示確認タブAPI統合

## メタデータ
- **作成日時**: 2026-02-24 14:19
- **タスクID**: 指示確認タブAPI統合
- **優先度**: 高
- **推定工数**: 4-6時間

## 1. タスク概要

指示確認タブの実装をモックデータからバックエンドAPIへ移行します。現在はフロントエンドでモックデータを使用していますが、実装済みのバックエンドAPI（`GET /api/v1/projects/:projectName/worker-instructions`）を使用するように変更します。

## 2. 目的と期待される成果

### 目的
- モックデータ依存を解消し、実際のバックエンドAPIと連携する
- 実験作業者が実際の作業指示を確認できるようにする
- 指示確認履歴を適切に記録する

### 期待される成果
- [x] バックエンドAPI実装状況の確認（完了）
- [ ] フロントエンドAPI関数の実装
- [ ] useInstructionsフックのAPI移行
- [ ] 指示確認機能の実装
- [ ] UI設計書の更新

## 3. 実装ステップ

### Phase 1: API型定義とサービス関数の実装
- [ ] Step 1-1: `WorkerInstruction`型定義を`projectApiService.ts`に追加
- [ ] Step 1-2: `InstructionConfirmationData`型定義を追加
- [ ] Step 1-3: `getWorkerInstructions()` API関数を実装
- [ ] Step 1-4: `confirmInstruction()` API関数を実装

### Phase 2: データ変換関数の実装
- [ ] Step 2-1: `convertApiToInstruction()` 変換関数を実装
- [ ] Step 2-2: API型→フロントエンド型のマッピングロジック実装
- [ ] Step 2-3: 変換関数のユニットテスト追加（必要に応じて）

### Phase 3: useInstructionsフックの修正
- [ ] Step 3-1: モックデータ（`projectsData`）依存の削除
- [ ] Step 3-2: ローディング状態管理の追加
- [ ] Step 3-3: エラーハンドリングの追加
- [ ] Step 3-4: API呼び出しロジックの実装
- [ ] Step 3-5: プロジェクト名の管理追加

### Phase 4: InstructionCardコンポーネントの修正
- [ ] Step 4-1: 確認ボタンクリック時のAPI呼び出し実装
- [ ] Step 4-2: 確認成功時のメッセージ表示
- [ ] Step 4-3: 確認失敗時のエラーハンドリング
- [ ] Step 4-4: 確認後の再取得処理実装

### Phase 5: UI設計書の更新
- [ ] Step 5-1: APIエンドポイント情報の更新
- [ ] Step 5-2: 実装状況の更新（TODO → 実装済み）
- [ ] Step 5-3: データソース情報の更新

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/services/projectApiService.ts` - API関数とレスポンス型定義の追加
2. `frontend/src/hooks/useInstructions.ts` - モックデータからAPI呼び出しへの変更
3. `frontend/src/components/ExperimentWorker/InstructionCard.tsx` - 確認ボタン機能の実装
4. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` - props追加（必要に応じて）
5. `docs/design/ui/ui_instruction_confirmation_tab.md` - UI設計書の更新

### 新規作成するファイル
なし（既存ファイルの修正のみ）

### 削除するファイル
なし

### 影響を受ける機能
- 指示確認タブ（実験作業者メニュー）
- 指示一覧表示機能
- 指示確認履歴記録機能

## 5. 技術的詳細

### 使用する技術・ライブラリ
- React 18.2.0
- TypeScript 5.x
- Ant Design v6（message コンポーネント）
- Axios（API通信）
- カスタムフック（useInstructions）

### バックエンドAPI仕様

#### API 1: 指示一覧取得
```
GET /api/v1/projects/:projectName/worker-instructions
```

**レスポンス:**
```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    project_id: string;
    project_name: string;
    method_id: string;
    method_name: string;
    transition_id: string;
    transition_name: string;
    task_no: number;
    instruction_target: number; // 0: file, 1: task, 2: transition
    instruction_content: string;
    priority: number; // 0: low, 1: normal, 2: medium, 3: high
    type: number; // 0: general, 1: setup, 2: measurement, 3: safety, 4: cleanup
    create_at: string;
    created_by: string;
    created_by_name: string;
    is_acknowledged: boolean;
  }>;
  meta: { timestamp: string; requestId: string; }
}
```

#### API 2: 指示確認
```
PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm
```

**レスポンス:**
```typescript
{
  success: boolean;
  data: {
    instruction_id: string;
    is_acknowledged: boolean;
    acknowledged_at: string;
    acknowledged_user_id: string;
    acknowledged_user_name: string;
  };
  meta: { timestamp: string; requestId: string; }
}
```

### データ型マッピング

**バックエンド → フロントエンド**

| バックエンド | フロントエンド | 変換ロジック |
|------------|--------------|------------|
| `instruction_target: 0` | `targetType: 'file'` | マッピングテーブル |
| `instruction_target: 1` | `targetType: 'task'` | マッピングテーブル |
| `instruction_target: 2` | `targetType: 'transition'` | マッピングテーブル |
| `priority: 0` | `priority: 'low'` | マッピングテーブル |
| `priority: 1` | `priority: 'normal'` | マッピングテーブル |
| `priority: 2` | `priority: 'medium'` | マッピングテーブル |
| `priority: 3` | `priority: 'high'` | マッピングテーブル |
| `type: 0` | `instructionType: 'general'` | マッピングテーブル |
| `type: 1` | `instructionType: 'setup'` | マッピングテーブル |
| `type: 2` | `instructionType: 'measurement'` | マッピングテーブル |
| `type: 3` | `instructionType: 'safety'` | マッピングテーブル |
| `type: 4` | `instructionType: 'cleanup'` | マッピングテーブル |
| `is_acknowledged` | `isRead` | 直接マッピング |

### アーキテクチャ上の考慮事項
- useInstructionsフックでAPI呼び出しを集約
- エラーハンドリングはフック内で実装
- ローディング状態を適切に管理
- 確認後の指示一覧の再取得を実装

### セキュリティ考慮事項
- [ ] 認証トークンの適切な管理（既存のauthUtils使用）
- [ ] organization_idによるマルチテナント分離（バックエンド実装済み）
- [ ] 実験作業者は自分に割り当てられた指示のみ確認可能（バックエンド実装済み）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| API型定義の不一致 | 高 | 中 | バックエンド実装コードを確認済み、型定義を厳密に作成 |
| データ変換エラー | 中 | 中 | マッピング関数にデフォルト値を設定、エラーハンドリング実装 |
| 既存機能の破壊 | 高 | 低 | 段階的に実装、各ステップで動作確認 |
| プロジェクト名の管理 | 中 | 中 | useInstructionsフックでprojectNameを適切に管理 |

## 7. テスト計画

### 手動テスト
- [ ] プロジェクト選択時に指示一覧が表示されること
- [ ] 指示一覧のフィルタリングが正しく動作すること
- [ ] 確認ボタンクリックで指示が確認済みになること
- [ ] 確認後に指示一覧が更新されること
- [ ] エラー時に適切なメッセージが表示されること
- [ ] ローディング中にスピナーが表示されること

### APIテスト
- [ ] `GET /api/v1/projects/:projectName/worker-instructions` が正しく動作すること
- [ ] `PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm` が正しく動作すること

### 統合テスト
- [ ] プロジェクト選択 → 指示一覧表示 → 指示確認の一連の流れが正常に動作すること
- [ ] 複数の指示を連続で確認できること

## 8. ロールバック計画

問題が発生した場合:
1. Gitでコミット前の状態に戻す
2. モックデータの使用に一時的に戻す（if 必要）
3. エラーログを確認して原因を特定

## 9. 関連ドキュメント

- [UI設計書: 指示確認タブ](../design/ui/ui_instruction_confirmation_tab.md)
- [バックエンド実装: projectController.ts](../../backend/src/controllers/projectController.ts)
- [バックエンド実装: projectService.ts](../../backend/src/services/projectService.ts)
- [フロントエンド型定義: experimentWorker.ts](../../frontend/src/types/experimentWorker.ts)

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 14:19
- **承認日時**: 2026-02-24 14:19
- **承認者コメント**: Act Modeに切り替えて実装開始

## 11. 実施記録

### 実施日時
開始: 2026-02-24 14:20
完了: （未完了）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中に発生した問題を記録）

### 最終的な成果物
- [ ] Phase 1: API関数実装完了
- [ ] Phase 2: データ変換関数実装完了
- [ ] Phase 3: useInstructionsフック修正完了
- [ ] Phase 4: 指示確認機能実装完了
- [ ] Phase 5: UI設計書更新完了

## 12. 振り返り

### うまくいった点
（実施後に記録）

### 改善が必要な点
（実施後に記録）

### 学んだこと
（実施後に記録）
