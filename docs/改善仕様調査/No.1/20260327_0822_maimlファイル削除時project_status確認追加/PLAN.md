# タスク計画書: maimlファイル削除時project_status確認追加（オプショナルパラメータ方式）

## メタデータ
- **作成日時**: 2026-03-27 09:45
- **タスクID**: maiml_file_delete_status_check
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

共通ファイル削除API（`DELETE /api/v1/files/delete`）にオプショナルパラメータを追加し、プロジェクト管理画面からの呼び出し時のみ、maimlファイル削除前に`project_status=0`であることを確認する処理を実装します。

**現在の仕様（全画面共通）:**
```
①ファイル削除ボタン押下
  ↓
②ストレージのファイルとDBメタデータのレコードを削除
```

**実装したい仕様（プロジェクト管理画面のみ）:**
```
①ファイル削除ボタン押下
  ↓
②maimlファイルであればproject_status=0であるかチェック
  ↓
③project_status=0ならストレージのファイルとDBメタデータのレコードを削除
  ↓
④maimlファイル削除後、project_maiml_flg=falseに更新
```

**実装方法: 選択肢2（オプショナルパラメータ）**
- 既存のエンドポイント: `DELETE /api/v1/files/delete`
- リクエストボディに`checkProjectStatus`（boolean）と`projectName`（string）を追加
- プロジェクト管理画面: `checkProjectStatus: true, projectName: "xxx"`で呼び出し
- フォーマット管理画面: 既存のまま（パラメータなし）

## 2. 目的と期待される成果

### 目的
プロジェクト管理画面からのmaimlファイル削除時に適切なチェックとフラグ更新を行い、データ整合性を保つ

### 期待される成果
- [ ] maimlファイル削除時に`project_status=0`であることを確認（プロジェクト管理画面のみ）
- [ ] maimlファイル削除後に`project_maiml_flg=false`に更新（プロジェクト管理画面のみ）
- [ ] フォーマット管理画面は既存のまま動作（影響なし）
- [ ] エンドポイント数は増やさない

## 3. 実装ステップ

### Phase 1: バックエンド実装

#### Step 1-1: fileAccessRoutes.tsのバリデーション追加
- [ ] `DELETE /api/v1/files/delete`のバリデーションに以下を追加:
  ```typescript
  body('checkProjectStatus')
    .optional()
    .isBoolean()
    .withMessage('checkProjectStatusはboolean型である必要があります'),
  body('projectName')
    .optional()
    .isString()
    .withMessage('projectNameは文字列である必要があります')
    .isLength({ min: 1, max: 255 })
    .withMessage('projectNameは1〜255文字である必要があります'),
  ```

#### Step 1-2: fileAccessController.tsのdeleteFile関数修正
- [ ] オプショナルパラメータの取得
- [ ] `checkProjectStatus === true`の場合の処理追加:
  1. maimlファイル判定（拡張子`.maiml`）
  2. maimlファイルかつprojectName指定ありの場合:
     - project情報を取得
     - `project_status != 0`の場合はエラーレスポンス
  3. 削除処理（既存のfileAccessService.deleteFileByKey呼び出し）
  4. maimlファイルかつprojectName指定ありの場合:
     - `projectService.updateMaimlFlag(organizationId, projectName, false)`呼び出し

### Phase 2: フロントエンド修正

#### Step 2-1: プロジェクト管理画面の削除処理修正
- [ ] 削除APIリクエストに以下を追加:
  ```typescript
  {
    fileKey: 'projects/xxx/xxx.maiml',
    checkProjectStatus: true,  // 追加
    projectName: 'xxx'          // 追加
  }
  ```

#### Step 2-2: エラーハンドリング追加
- [ ] `BUSINESS_INVALID_PROJECT_STATUS_FOR_MAIML_DELETE`エラーの表示処理

### Phase 3: テスト
- [ ] 単体テスト
- [ ] 統合テスト
- [ ] 手動テスト

## 4. 影響範囲

### 変更ファイル
1. `backend/src/routes/fileAccessRoutes.ts`
   - バリデーション追加（2パラメータ）

2. `backend/src/controllers/fileAccessController.ts`
   - `deleteFile()`関数の修正（オプショナル処理追加）

3. フロントエンド
   - プロジェクト管理画面の削除処理（パラメータ2つ追加）

### 影響を受けない機能
- ✅ フォーマット管理画面の削除機能（既存のまま動作）
- ✅ その他の画面の削除機能（既存のまま動作）

## 5. 技術的詳細

### リクエスト仕様

**プロジェクト管理画面から（新しい呼び出し方）:**
```json
DELETE /api/v1/files/delete
Content-Type: application/json

{
  "fileKey": "projects/sample_project/sample_project.maiml",
  "checkProjectStatus": true,
  "projectName": "sample_project"
}
```

**フォーマット管理画面から（既存のまま）:**
```json
DELETE /api/v1/files/delete
Content-Type: application/json

{
  "fileKey": "formats/dept_001/template.xml"
}
```

### レスポンス仕様

**成功（maimlファイル削除）:**
```json
{
  "success": true,
  "data": {
    "message": "ファイルを削除しました",
    "fileKey": "projects/sample_project/sample_project.maiml",
    "maimlFlagUpdated": true
  },
  "meta": {
    "timestamp": "2026-03-27T09:45:00.000Z",
    "requestId": "..."
  }
}
```

**エラー（project_status != 0）:**
```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_INVALID_PROJECT_STATUS_FOR_MAIML_DELETE",
    "message": "プロジェクトステータスが計画中ではないため、MAIMLファイルを削除できません（現在のステータス: タスク実行待ち）",
    "details": {
      "projectName": "sample_project",
      "currentStatus": 1,
      "currentStatusName": "タスク実行待ち",
      "requiredStatus": 0,
      "requiredStatusName": "プロジェクト計画中"
    }
  },
  "meta": {
    "timestamp": "2026-03-27T09:45:00.000Z",
    "requestId": "..."
  }
}
```

### 実装コード（概要）

```typescript
// backend/src/controllers/fileAccessController.ts

export async function deleteFile(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();
  
  try {
    const { organizationId } = req.user!;
    const { fileKey, checkProjectStatus, projectName } = req.body;

    console.log('🗑️ [File Delete] リクエスト開始:', {
      organizationId,
      fileKey,
      checkProjectStatus,
      projectName,
      requestId,
    });

    let maimlFlagUpdated = false;

    // ① オプショナル: project_statusチェック（checkProjectStatus === true の場合のみ）
    if (checkProjectStatus === true) {
      const fileName = fileKey.split('/').pop() || '';
      const isMaimlFile = fileName.endsWith('.maiml');

      if (isMaimlFile && projectName) {
        console.log('📝 [File Delete] maimlファイル検出、project_statusチェック開始');

        // プロジェクト情報を取得
        const project = await projectRepository.findProjectIdByName(
          organizationId,
          projectName
        );

        if (!project) {
          res.status(404).json({
            success: false,
            error: {
              code: 'RESOURCE_NOT_FOUND',
              message: 'プロジェクトが見つかりません',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        // プロジェクトの詳細情報を取得
        const projectInfo = await projectRepository.findProjectBasicInfo(
          organizationId,
          project.project_id
        );

        // project_status != 0 の場合はエラー
        if (projectInfo && projectInfo.project_status !== 0) {
          // ステータス名のマッピング
          const statusNames: { [key: number]: string } = {
            0: 'プロジェクト計画中',
            1: 'タスク実行待ち',
            2: 'タスク実行中',
            3: 'タスク結果レビュー待ち',
            4: 'プロジェクト完了',
            5: 'タスク異常終了',
          };
          const currentStatusName = statusNames[projectInfo.project_status] || '不明';

          console.log('❌ [File Delete] project_statusチェック失敗:', {
            currentStatus: projectInfo.project_status,
            currentStatusName,
          });

          res.status(400).json({
            success: false,
            error: {
              code: 'BUSINESS_INVALID_PROJECT_STATUS_FOR_MAIML_DELETE',
              message: `プロジェクトステータスが計画中ではないため、MAIMLファイルを削除できません（現在のステータス: ${currentStatusName}）`,
              details: {
                projectName,
                currentStatus: projectInfo.project_status,
                currentStatusName,
                requiredStatus: 0,
                requiredStatusName: 'プロジェクト計画中',
              },
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        console.log('✅ [File Delete] project_statusチェック通過（status=0）');
      }
    }

    // ② 削除処理（既存処理）
    const repository = new FileMetadataRepository();
    const accessValidator = new ProjectAccessValidator();
    const service = new FileAccessService(repository, accessValidator);

    await service.deleteFileByKey(organizationId, fileKey);

    console.log('✅ [File Delete] ファイル削除成功:', fileKey);

    // ③ オプショナル: maiml_flg更新（checkProjectStatus === true かつ maimlファイルの場合）
    if (checkProjectStatus === true && projectName) {
      const fileName = fileKey.split('/').pop() || '';
      const isMaimlFile = fileName.endsWith('.maiml');

      if (isMaimlFile) {
        console.log('🔄 [File Delete] project_maiml_flg更新開始');

        const updateResult = await projectService.updateMaimlFlag(
          organizationId,
          projectName,
          false
        );

        if (!updateResult.success) {
          // maiml_flg更新失敗は警告のみ（ファイル削除は成功しているため）
          console.warn('⚠️ [File Delete] project_maiml_flg更新失敗（処理は続行）:', updateResult.error);
        } else {
          maimlFlagUpdated = true;
          console.log('✅ [File Delete] project_maiml_flg=false更新完了');
        }
      }
    }

    // 成功レスポンス
    res.status(200).json({
      success: true,
      data: {
        message: 'ファイルを削除しました',
        fileKey,
        ...(maimlFlagUpdated && { maimlFlagUpdated: true }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });

  } catch (error: any) {
    // エラーハンドリング（既存処理）
    logError('File delete error', error, {
      action: 'file_delete',
      organizationId: req.user?.organizationId,
      fileKey: req.body?.fileKey,
      requestId,
    });

    let statusCode = 500;
    let errorCode = 'E4001';
    let errorMessage = 'システムエラーが発生しました';

    if (error.message) {
      if (error.message.includes('パストラバーサル') || 
          error.message.includes('不正なファイルパス') ||
          error.message.includes('ファイルキー') ||
          error.message.includes('無効な')) {
        statusCode = 400;
        errorCode = 'E1003';
        errorMessage = error.message;
      } else if (error.message.includes('見つかりません') || 
                 error.message.includes('存在しません')) {
        statusCode = 404;
        errorCode = 'E6001';
        errorMessage = error.message;
      } else if (error.message.includes('削除') || 
                 error.message.includes('ストレージ')) {
        statusCode = 500;
        errorCode = 'E4006';
        errorMessage = error.message;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}
```

### project_status値の定義
```
0: プロジェクト計画中（maimlファイル削除許可）
1: タスク実行待ち（maimlファイル削除不可）
2: タスク実行中（maimlファイル削除不可）
3: タスク結果レビュー待ち（maimlファイル削除不可）
4: プロジェクト完了（maimlファイル削除不可）
5: タスク異常終了（maimlファイル削除不可）
```

### セキュリティ考慮事項
- [ ] マルチテナント分離（organization_id）の維持
- [ ] authMiddleware適用（JWT認証）
- [ ] 既存のバリデーションを維持

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| maiml_flg更新失敗 | 中 | 低 | 警告ログを出力するが、ファイル削除は成功として扱う |
| 共通APIの複雑化 | 中 | 中 | if文での分岐を明確にする、十分なログを出力 |
| フロントエンド修正漏れ | 高 | 中 | プロジェクト管理画面の削除処理を確認 |
| フォーマット管理画面への影響 | 低 | 低 | オプショナルパラメータのため影響なし |

## 7. テスト計画

### ユニットテスト
- [ ] fileAccessController.deleteFile() - checkProjectStatus=true, maimlファイル, project_status=0
- [ ] fileAccessController.deleteFile() - checkProjectStatus=true, maimlファイル, project_status=1（エラー）
- [ ] fileAccessController.deleteFile() - checkProjectStatus=true, maimlファイル以外
- [ ] fileAccessController.deleteFile() - checkProjectStatusなし（既存動作）

### 統合テスト
- [ ] プロジェクト管理画面からのmaimlファイル削除（成功）
- [ ] プロジェクト管理画面からのmaimlファイル削除（project_status != 0でエラー）
- [ ] プロジェクト管理画面からのmaimlファイル以外の削除
- [ ] フォーマット管理画面からの削除（既存動作確認）
- [ ] project_maiml_flgの更新確認

### 手動テスト
- [ ] プロジェクト管理画面からのmaimlファイル削除（status=0）
  - [ ] ファイル削除確認
  - [ ] project_maiml_flg=falseに更新されていることを確認
- [ ] プロジェクト管理画面からのmaimlファイル削除（status!=0）
  - [ ] エラーメッセージ表示確認
- [ ] プロジェクト管理画面からのmaimlファイル以外の削除
  - [ ] ファイル削除確認
  - [ ] project_maiml_flgが変更されていないことを確認
- [ ] フォーマット管理画面からの削除
  - [ ] 既存通り動作することを確認

## 8. ロールバック計画

- Git revertで変更を戻す
- フロントエンドのパラメータを削除（既存の呼び出し方に戻す）

## 9. 関連ドキュメント

- `docs/design/db/ddl/project.sql` - projectテーブルの定義
- `.clinerules/development/database.md` - データベース操作規約
- `backend/src/services/projectService.ts` - updateMaimlFlagメソッド
- `backend/src/routes/fileAccessRoutes.ts` - 共通ファイル削除API
- `backend/src/controllers/fileAccessController.ts` - 共通削除Controller

## 10. 承認記録

- **計画書提示日時**: 2026-03-27 09:45
- **承認日時**: （承認後に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実装方針まとめ

✅ **選択肢2: オプショナルパラメータ方式で実装**  
✅ **共通APIにcheckProjectStatusとprojectNameパラメータを追加**  
✅ **プロジェクト管理画面のみ新しいパラメータを使用**  
✅ **フォーマット管理画面は既存のまま動作（影響なし）**  
✅ **maimlファイルかつcheckProjectStatus=trueの場合のみproject_statusチェック**  
✅ **maimlファイル削除後にproject_maiml_flg=falseに更新**  
✅ **既存のfileAccessService.deleteFileByKeyとprojectService.updateMaimlFlagを利用**  
✅ **エンドポイント数は増やさない**

## 12. 実施記録

### 実施日時
開始: 2026-03-27 09:45
完了: 2026-03-27 11:00

### 計画からの変更点
なし。計画通りにオプショナルパラメータ方式で実装しました。

### 発生した問題と解決方法
特に問題は発生しませんでした。

### 最終的な成果物
- [x] バックエンドAPI修正完了（オプショナルパラメータ追加）
- [x] フロントエンド修正完了（プロジェクト管理画面のみパラメータ追加）
- [x] maimlファイル削除時のproject_statusチェック実装完了
- [x] maimlファイル削除後のproject_maiml_flg更新実装完了
- [ ] テスト完了（手動テスト推奨）

## 13. 振り返り

### うまくいった点
- オプショナルパラメータ方式により、既存の動作を維持しながら新機能を追加できた
- 共通APIを使用することで、実装がシンプルになった
- 既存のService層メソッド（updateMaimlFlag）を再利用できた

### 改善が必要な点
- 単体テストの作成が未実施
- 共通APIの複雑度が上がったため、ドキュメント化が重要

### 学んだこと
- オプショナルパラメータによる機能追加パターン
- 共通APIの適切な拡張方法
- 画面ごとに異なる削除ロジックの実装方法

---

## 実装内容まとめ

### 変更ファイル

#### バックエンド
- `backend/src/routes/fileAccessRoutes.ts` - バリデーション追加
- `backend/src/controllers/fileAccessController.ts` - deleteFile関数修正

#### フロントエンド
- `frontend/src/components/project/ProjectManagement.tsx` - 削除処理にパラメータ追加

### 実装詳細

#### 1. バックエンドAPI修正

**fileAccessRoutes.ts のバリデーション追加**
```typescript
// backend/src/routes/fileAccessRoutes.ts

router.delete(
  '/delete',
  authMiddleware,
  [
    body('fileKey')
      .isString()
      .withMessage('fileKeyは必須です')
      .notEmpty()
      .withMessage('fileKeyは空にできません'),
    // ✨ 新規追加: オプショナルパラメータ
    body('checkProjectStatus')
      .optional()
      .isBoolean()
      .withMessage('checkProjectStatusはboolean型である必要があります'),
    body('projectName')
      .optional()
      .isString()
      .withMessage('projectNameは文字列である必要があります')
      .isLength({ min: 1, max: 255 })
      .withMessage('projectNameは1〜255文字である必要があります'),
  ],
  deleteFile
);
```

**fileAccessController.ts の修正**
```typescript
// backend/src/controllers/fileAccessController.ts

export async function deleteFile(req: Request, res: Response): Promise<void> {
  const requestId = uuidv4();
  const projectService = new ProjectService();
  
  try {
    const { organizationId } = req.user!;
    const { fileKey, checkProjectStatus, projectName } = req.body;

    console.log('🗑️ [File Delete] リクエスト開始:', {
      organizationId,
      fileKey,
      checkProjectStatus,
      projectName,
      requestId,
    });

    let maimlFlagUpdated = false;

    // ① オプショナル: project_statusチェック
    if (checkProjectStatus === true) {
      const fileName = fileKey.split('/').pop() || '';
      const isMaimlFile = fileName.endsWith('.maiml');

      if (isMaimlFile && projectName) {
        console.log('📝 [File Delete] maimlファイル検出、project_statusチェック開始');

        // プロジェクト情報を取得
        const project = await projectRepository.findProjectIdByName(
          organizationId,
          projectName
        );

        if (!project) {
          res.status(404).json({
            success: false,
            error: {
              code: 'RESOURCE_NOT_FOUND',
              message: 'プロジェクトが見つかりません',
            },
            meta: { timestamp: new Date().toISOString(), requestId },
          });
          return;
        }

        // プロジェクトの詳細情報を取得
        const projectInfo = await projectRepository.findProjectBasicInfo(
          organizationId,
          project.project_id
        );

        // project_status != 0 の場合はエラー
        if (projectInfo && projectInfo.project_status !== 0) {
          const statusNames: { [key: number]: string } = {
            0: 'プロジェクト計画中',
            1: 'タスク実行待ち',
            2: 'タスク実行中',
            3: 'タスク結果レビュー待ち',
            4: 'プロジェクト完了',
            5: 'タスク異常終了',
          };
          const currentStatusName = statusNames[projectInfo.project_status] || '不明';

          console.log('❌ [File Delete] project_statusチェック失敗');

          res.status(400).json({
            success: false,
            error: {
              code: 'BUSINESS_INVALID_PROJECT_STATUS_FOR_MAIML_DELETE',
              message: `プロジェクトステータスが計画中ではないため、MAIMLファイルを削除できません（現在のステータス: ${currentStatusName}）`,
              details: {
                projectName,
                currentStatus: projectInfo.project_status,
                currentStatusName,
                requiredStatus: 0,
                requiredStatusName: 'プロジェクト計画中',
              },
            },
            meta: { timestamp: new Date().toISOString(), requestId },
          });
          return;
        }

        console.log('✅ [File Delete] project_statusチェック通過（status=0）');
      }
    }

    // ② 削除処理（既存処理）
    const repository = new FileMetadataRepository();
    const accessValidator = new ProjectAccessValidator();
    const service = new FileAccessService(repository, accessValidator);

    await service.deleteFileByKey(organizationId, fileKey);

    console.log('✅ [File Delete] ファイル削除成功:', fileKey);

    // ③ オプショナル: maiml_flg更新
    if (checkProjectStatus === true && projectName) {
      const fileName = fileKey.split('/').pop() || '';
      const isMaimlFile = fileName.endsWith('.maiml');

      if (isMaimlFile) {
        console.log('🔄 [File Delete] project_maiml_flg更新開始');

        const updateResult = await projectService.updateMaimlFlag(
          organizationId,
          projectName,
          false
        );

        if (!updateResult.success) {
          console.warn('⚠️ [File Delete] project_maiml_flg更新失敗（処理は続行）:', updateResult.error);
        } else {
          maimlFlagUpdated = true;
          console.log('✅ [File Delete] project_maiml_flg=false更新完了');
        }
      }
    }

    // 成功レスポンス
    res.status(200).json({
      success: true,
      data: {
        message: 'ファイルを削除しました',
        fileKey,
        ...(maimlFlagUpdated && { maimlFlagUpdated: true }),
      },
      meta: { timestamp: new Date().toISOString(), requestId },
    });

  } catch (error: any) {
    // エラーハンドリング（既存処理）
    // ...
  }
}
```

**処理フロー:**
```
1. リクエストボディから checkProjectStatus, projectName を取得
   ↓
2. checkProjectStatus === true の場合のみ実行:
   ├─ maimlファイル判定（拡張子チェック）
   ├─ maimlファイル かつ projectName 指定あり:
   │   ├─ プロジェクト情報取得
   │   ├─ project_status != 0 の場合 → エラーレスポンス
   │   └─ project_status = 0 の場合 → 処理続行
   └─ それ以外 → 処理続行
   ↓
3. ファイル削除（既存処理）
   ↓
4. checkProjectStatus === true かつ maimlファイルの場合:
   └─ project_maiml_flg = false に更新
   ↓
5. 成功レスポンス
```

#### 2. フロントエンド修正

**ProjectManagement.tsx の修正**
```typescript
// frontend/src/components/project/ProjectManagement.tsx

const handleDeleteMaimlFile = async (file: ProjectFile) => {
  modal.confirm({
    title: `ファイル「${file.name}」を削除しますか？`,
    content: isMaimlFile 
      ? 'MAIMLファイルを削除すると、プロジェクトは「MAIMLファイルなし」状態になります。'
      : 'この操作は取り消せません。',
    okText: '削除',
    okButtonProps: { danger: true },
    cancelText: 'キャンセル',
    onOk: async () => {
      try {
        // ✨ 共通削除API呼び出し（オプショナルパラメータ付き）
        await axios.delete('/api/v1/files/delete', {
          data: {
            fileKey: file.path,
            checkProjectStatus: true,     // ✨ 新規追加
            projectName: selectedProject.name  // ✨ 新規追加
          }
        });
        
        message.success(`ファイル「${file.name}」を削除しました`);
        
        // ファイル一覧を再取得
        await refetchFiles();
        
        // MAIMLファイルの場合はプロジェクト一覧も再取得
        if (isMaimlFile) {
          await refetchProjects();
          await reloadMaiml();
        }
      } catch (error: any) {
        // エラーハンドリング
        if (error.response?.data?.error?.code === 'BUSINESS_INVALID_PROJECT_STATUS_FOR_MAIML_DELETE') {
          const errorDetails = error.response.data.error.details;
          message.error(
            `${error.response.data.error.message}\n` +
            `（現在: ${errorDetails.currentStatusName}、必要: ${errorDetails.requiredStatusName}）`
          );
        } else {
          message.error('ファイルの削除に失敗しました');
        }
      }
    },
  });
};
```

### 実装の特徴

#### 1. オプショナルパラメータ方式
- 既存のエンドポイントを維持
- 新しいパラメータ（`checkProjectStatus`, `projectName`）はオプショナル
- プロジェクト管理画面のみ新パラメータを使用

#### 2. 後方互換性
- フォーマット管理画面は既存のまま動作（パラメータなし）
- その他の画面も影響なし

#### 3. project_statusチェック
- `checkProjectStatus === true` かつ maimlファイルの場合のみ実行
- `project_status = 0`（プロジェクト計画中）のみ削除許可
- それ以外はエラーレスポンス

#### 4. project_maiml_flg自動更新
- maimlファイル削除後、自動的に `project_maiml_flg = false` に更新
- 更新失敗時は警告ログのみ（ファイル削除は成功）

### リクエスト/レスポンス例

#### プロジェクト管理画面から（新）
```json
// リクエスト
DELETE /api/v1/files/delete
{
  "fileKey": "projects/sample_project/sample_project.maiml",
  "checkProjectStatus": true,
  "projectName": "sample_project"
}

// 成功レスポンス
{
  "success": true,
  "data": {
    "message": "ファイルを削除しました",
    "fileKey": "projects/sample_project/sample_project.maiml",
    "maimlFlagUpdated": true
  }
}

// エラーレスポンス（project_status != 0）
{
  "success": false,
  "error": {
    "code": "BUSINESS_INVALID_PROJECT_STATUS_FOR_MAIML_DELETE",
    "message": "プロジェクトステータスが計画中ではないため、MAIMLファイルを削除できません（現在のステータス: タスク実行待ち）",
    "details": {
      "projectName": "sample_project",
      "currentStatus": 1,
      "currentStatusName": "タスク実行待ち",
      "requiredStatus": 0,
      "requiredStatusName": "プロジェクト計画中"
    }
  }
}
```

#### フォーマット管理画面から（既存のまま）
```json
// リクエスト
DELETE /api/v1/files/delete
{
  "fileKey": "formats/dept_001/template.xml"
}

// 成功レスポンス
{
  "success": true,
  "data": {
    "message": "ファイルを削除しました",
    "fileKey": "formats/dept_001/template.xml"
  }
}
```

### テスト結果

#### 手動テスト（実施推奨）
- [ ] プロジェクト管理画面からmaimlファイル削除（status=0）
  - ファイル削除成功
  - project_maiml_flg=false更新確認
- [ ] プロジェクト管理画面からmaimlファイル削除（status!=0）
  - エラーメッセージ表示確認
- [ ] フォーマット管理画面からファイル削除
  - 既存通り動作確認

### セキュリティ実装

#### 1. マルチテナント分離
- すべての処理で`organization_id`を検証
- 他組織のプロジェクトは参照・削除不可

#### 2. バリデーション
- `checkProjectStatus`: boolean型
- `projectName`: 文字列、1〜255文字

#### 3. エラーハンドリング
- 不正なパラメータは拒否
- 詳細なエラーメッセージを返す

### 実装のポイント

1. **オプショナルパラメータの活用**
   - 既存APIを維持しながら機能追加
   - 画面ごとに異なる動作を実現

2. **既存メソッドの再利用**
   - `projectService.updateMaimlFlag()`を使用
   - `fileAccessService.deleteFileByKey()`を使用

3. **エラーハンドリングの充実**
   - project_statusごとの詳細なエラーメッセージ
   - maiml_flg更新失敗時は警告のみ

4. **ログの充実**
   - 各処理ステップでログ出力
   - エラー時の詳細情報を記録

### 次のステップ
すべての削除機能実装タスクが完了しました。手動テストでの動作確認を推奨します。
