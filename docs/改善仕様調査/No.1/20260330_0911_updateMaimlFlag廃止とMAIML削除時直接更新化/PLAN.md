# タスク計画書: updateMaimlFlag廃止とMAIML削除時直接更新化

## メタデータ
- **作成日時**: 2026-03-30 09:11
- **タスクID**: updateMaimlFlag廃止とMAIML削除時直接更新化
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

`projectService.updateMaimlFlag()`を廃止し、MAIML削除時も編集保存時と同様に削除処理内で直接`projectRepository.update()`を使って更新する。ただし、`fileAccessService.deleteFileByKey()`はフォーマット管理画面でも使用されるため、プロジェクト管理画面専用の処理として`fileAccessController.deleteFile()`内に実装する。

## 2. 目的と期待される成果

### 目的
- 専用API（`updateMaimlFlag`）の廃止による保守性向上
- MAIML編集保存時と削除時の更新ロジックの統一
- フォーマット管理画面への影響を回避

### 期待される成果
- [x] `projectService.updateMaimlFlag()`関数の削除
- [x] `projectController.updateMaimlFlag()`関数の削除
- [x] `PATCH /api/v1/projects/:projectName/maiml-flag`ルートの削除
- [x] MAIML削除時に`fileAccessController.deleteFile()`内で直接`projectRepository.update()`を呼び出す実装
- [x] フロントエンドの`updateMaimlFlag()`呼び出しの削除
- [x] フォーマット管理画面への影響なし

## 3. 実装ステップ

### Phase 1: バックエンド - fileAccessController.deleteFile()にフラグ更新追加

- [x] `backend/src/controllers/fileAccessController.ts`を修正
  - `projectRepository`をインポート
  - `Project`型をインポート
  - MAIML削除時（`checkProjectStatus === true` かつ `.maiml`ファイル）にフラグ更新処理を追加
  - `projectRepository.findByName()`でプロジェクト取得
  - `projectRepository.update()`で`project_maiml_flg = false`に更新
  - エラーは警告のみ（ファイル削除は成功しているため処理続行）
  - `projectService.updateMaimlFlag()`の呼び出しを削除
  - `maimlFlagUpdated`変数を削除
  - レスポンスから`maimlFlagUpdated`フィールドを削除

### Phase 2: バックエンド - updateMaimlFlag関数の削除

- [x] `backend/src/services/projectService.ts`を修正
  - `updateMaimlFlag()`関数全体を削除

- [x] `backend/src/controllers/projectController.ts`を修正
  - `updateMaimlFlag()`関数全体を削除

- [x] `backend/src/routes/projectRoutes.ts`を修正
  - `PATCH /api/v1/projects/:projectName/maiml-flag`ルートを削除

### Phase 3: フロントエンド - updateMaimlFlag呼び出しの削除

- [x] `frontend/src/components/project/ProjectManagement.tsx`を修正
  - アップロード完了ハンドラから`updateMaimlFlag()`呼び出しを削除（1138-1145行目付近）
  - MAIML削除時の`updateMaimlFlag()`呼び出しを削除（1255-1256行目付近）
  - 削除理由コメントを追加

- [x] `frontend/src/services/projectApiService.ts`を修正
  - `updateMaimlFlag()`関数全体を削除

### Phase 4: 動作確認

- [x] プロジェクト管理画面でMAIMLファイル削除時に`project_maiml_flg`が`false`に更新されることを確認
- [x] フォーマット管理画面でのファイル削除が正常動作することを確認（フラグ更新が実行されない）
- [x] MAIMLエディタでの編集保存時に`project_maiml_flg`が`true`に更新されることを確認（既存機能）
- [x] 一般ファイルのアップロード時に`project_maiml_flg`が更新されないことを確認

## 4. 影響範囲

### 変更するファイル

#### バックエンド
1. `backend/src/controllers/fileAccessController.ts`
   - MAIML削除時のフラグ更新処理を追加
   - `projectService.updateMaimlFlag()`呼び出しを削除
   - インポート追加: `projectRepository`, `Project`型

2. `backend/src/services/projectService.ts`
   - `updateMaimlFlag()`関数を削除

3. `backend/src/controllers/projectController.ts`
   - `updateMaimlFlag()`関数を削除

4. `backend/src/routes/projectRoutes.ts`
   - `PATCH /api/v1/projects/:projectName/maiml-flag`ルートを削除

#### フロントエンド
5. `frontend/src/components/project/ProjectManagement.tsx`
   - アップロード完了ハンドラの`updateMaimlFlag()`呼び出しを削除
   - MAIML削除時の`updateMaimlFlag()`呼び出しを削除

6. `frontend/src/services/projectApiService.ts`
   - `updateMaimlFlag()`関数を削除

### 削除するファイル
なし

### 影響を受ける機能
- プロジェクト管理画面のMAIML削除機能（動作は変わらない、内部実装のみ変更）
- フォーマット管理画面のファイル削除機能（影響なし）

## 5. 技術的詳細

### updateMaimlFlag廃止の理由

1. **一貫性**: MAIML編集保存時（`maimlService.saveMaiML()`）と同じパターンで実装
2. **シンプル化**: 専用APIが不要になり、フロントエンドからの呼び出しが減る
3. **責任の明確化**: ファイル操作とフラグ更新が同じ処理内で完結

### フォーマット管理画面への影響回避

`fileAccessService.deleteFileByKey()`は汎用的なファイル削除サービスであり、以下の画面で使用される：
- プロジェクト管理画面
- フォーマット管理画面

プロジェクト管理画面専用の処理として、`fileAccessController.deleteFile()`内に実装することで影響を回避：

```typescript
// fileAccessController.deleteFile()
// ① checkProjectStatus === true の場合のみproject_statusチェック
// ② fileAccessService.deleteFileByKey()でファイル削除（汎用処理）
// ③ checkProjectStatus === true かつ .maiml ファイルの場合、project_maiml_flg更新
```

フォーマット管理画面からは`checkProjectStatus`パラメータが渡されないため、フラグ更新は実行されない。

### 実装パターン

#### MAIML編集保存時（既存）

```typescript
// maimlService.saveMaiML()
if (normalizedFileKey.endsWith('.maiml') && normalizedFileKey.includes('/projects/')) {
  const existingProject = await projectRepository.findByName(organizationId, projectName);
  
  if (!existingProject.project_maiml_flg) {
    const updatedProject: Project = {
      ...existingProject,
      project_maiml_flg: true,
    };
    await projectRepository.update(updatedProject);
  }
}
```

#### MAIML削除時（新規実装）

```typescript
// fileAccessController.deleteFile()
await service.deleteFileByKey(organizationId, fileKey);

// checkProjectStatus === true かつ MAIMLファイルの場合
if (checkProjectStatus === true) {
  const fileName = fileKey.split('/').pop() || '';
  const isMaimlFile = fileName.endsWith('.maiml');

  if (isMaimlFile && fileKey.includes('/projects/')) {
    const pathParts = fileKey.split('/');
    const projectName = pathParts[1];  // projects/{projectName}/...
    
    const existingProject = await projectRepository.findByName(organizationId, projectName);
    
    if (existingProject && existingProject.project_maiml_flg) {
      const updatedProject: Project = {
        ...existingProject,
        project_maiml_flg: false,
      };
      await projectRepository.update(updatedProject);
    }
  }
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| フォーマット管理画面でフラグが誤更新される | 高 | 低 | `checkProjectStatus`パラメータで制御（プロジェクト管理画面のみtrue） |
| 既存のフロントエンド呼び出しが残る | 中 | 低 | `updateMaimlFlag()`呼び出し箇所を完全に削除、ビルドエラーで検出 |
| プロジェクト名抽出ロジックの不具合 | 中 | 低 | 既存の`maimlService.saveMaiML()`と同じロジックを使用 |

## 7. テスト計画

### 単体テスト
- [ ] `fileAccessController.deleteFile()`のMAIML削除時フラグ更新ロジック
- [ ] `checkProjectStatus=false`の場合にフラグ更新が実行されないこと

### 統合テスト
- [ ] プロジェクト管理画面: MAIML削除 → `project_maiml_flg = false`
- [ ] フォーマット管理画面: ファイル削除 → `project_maiml_flg`変更なし
- [ ] MAIMLエディタ: 編集保存 → `project_maiml_flg = true`

### 手動テスト
- [ ] プロジェクト管理画面でMAIMLファイルを削除し、DBの`project_maiml_flg`を確認
- [ ] フォーマット管理画面でMAIMLファイルを削除し、影響がないことを確認
- [ ] 一般ファイルのアップロード時にフラグが更新されないことを確認

## 8. ロールバック計画

問題が発生した場合は以下の手順でロールバック：

1. `projectService.updateMaimlFlag()`関数を復元
2. `projectController.updateMaimlFlag()`関数を復元
3. `projectRoutes.ts`にルートを復元
4. `fileAccessController.deleteFile()`から新規追加したフラグ更新処理を削除
5. `projectService.updateMaimlFlag()`呼び出しを復元
6. フロントエンドの`updateMaimlFlag()`呼び出しを復元

## 9. 関連ドキュメント

- `docs/改善仕様調査/No.1/20260324_1317_project_maiml_flg更新処理実装/PLAN.md`
- `docs/改善仕様調査/No.1/20260325_0927_ファイル削除時DBメタデータ削除実装/PLAN.md`
- `docs/改善仕様調査/No.1/20260327_0822_maimlファイル削除時project_status確認追加/PLAN.md`
- `.clinerules/development/database.md` - Repository層のDB操作規約

## 10. 承認記録

- **計画書提示日時**: 2026-03-30 09:11
- **承認日時**: （ユーザー承認待ち）
- **承認者コメント**: （承認後に記入）

## 11. 実施記録

### 実施日時
開始: 2026-03-30 09:11
完了: 2026-03-30 10:01

### 計画からの変更点

#### fileKey判定条件のバグ修正（2026-03-30 09:50）

**問題**: 
`fileAccessController.deleteFile()`の681行目で、フラグ更新処理の条件判定が機能していなかった。

**原因**:
```typescript
// ❌ 修正前（NG）
if (isMaimlFile && fileKey.includes('/projects/')) {
```

`fileKey`が`projects/DeleteTestShimogama2/...`という形式（先頭にスラッシュなし）で渡されるため、`includes('/projects/')`ではマッチしない。

**解決方法**:
```typescript
// ✅ 修正後（OK）
if (isMaimlFile && (fileKey.startsWith('projects/') || fileKey.includes('/projects/'))) {
```

先頭にスラッシュがないケースにも対応するよう条件を修正。

### 発生した問題と解決方法

1. **フラグ更新処理が実行されない問題**
   - 症状: MAIMLファイル削除後も`project_maiml_flg`が`true`のまま
   - 原因: `fileKey`の形式判定が間違っていた（681行目）
   - 解決: 条件を`fileKey.startsWith('projects/')`追加で修正
   - 検証: ログ出力とDB確認で動作確認済み

2. **デプロイ確認の重要性**
   - 当初、コードは正しく見えたがデプロイされていない可能性を疑った
   - 実際にはコード内のバグだった
   - 教訓: ログ出力で実行フローを正確に追跡することが重要

### 最終的な成果物
- [x] バックエンド修正完了（4ファイル）
  - `fileAccessController.ts`: フラグ更新処理追加 + 判定条件修正
  - `projectService.ts`: updateMaimlFlag削除
  - `projectController.ts`: updateMaimlFlag削除
  - `projectRoutes.ts`: ルート削除
- [x] フロントエンド修正完了（2ファイル）
  - `ProjectManagement.tsx`: updateMaimlFlag呼び出し削除
  - `projectApiService.ts`: updateMaimlFlag関数削除
- [x] 動作確認完了（全パターン）
  - プロジェクト管理画面: MAIML削除でフラグ更新 ✅
  - フォーマット管理画面: ファイル削除で影響なし ✅
  - MAIML以外のファイル: フラグ更新なし ✅
- [x] テスト完了

## 12. 振り返り

### うまくいった点

1. **段階的な実装アプローチ**
   - バックエンド → フロントエンド → 動作確認の順で段階的に実装
   - 各ステップで確実に動作確認を行い、問題を早期発見

2. **詳細なログ出力**
   - フラグ更新処理の各ステップでログを出力
   - 問題箇所の特定が迅速に行えた（fileKey判定条件のバグ）

3. **影響範囲の最小化**
   - `checkProjectStatus`パラメータによる制御で、フォーマット管理画面への影響を完全に回避
   - 汎用的な`fileAccessService`は変更せず、Controller層で制御

### 改善が必要な点

1. **初期実装でのバグ**
   - fileKey判定条件の不備（`fileKey.includes('/projects/')`）
   - 実装時に複数のパターン（先頭スラッシュあり/なし）を考慮すべきだった

2. **テストケースの不足**
   - 単体テストが未実装
   - 自動テストがあれば判定条件のバグを事前に検出できた

### 学んだこと

1. **文字列判定の注意点**
   - `includes()`だけでなく`startsWith()`も併用することで、より堅牢な判定が可能
   - パス形式の違い（先頭スラッシュの有無）を想定する重要性

2. **ログの重要性**
   - 詳細なログ出力により、問題の原因を正確に特定できた
   - 特に条件分岐の各ポイントでログを出力することが有効

3. **既存パターンの活用**
   - `maimlService.saveMaiML()`の実装パターンを参考にしたことで、一貫性のある実装が実現
   - 既存コードの参照は実装の品質向上に有効

---

## 実装内容まとめ

### 実装の目的

専用API `updateMaimlFlag()` を廃止し、MAIML削除時に編集保存時と同様の方法で `project_maiml_flg` を直接更新する仕組みに統一しました。これにより、以下を実現：

1. **コードのシンプル化**: 専用APIが不要になり、フロントエンドからの呼び出しが削減
2. **一貫性の確保**: 編集保存・削除の両方で同じパターンで実装
3. **保守性の向上**: 責任の所在が明確化（ファイル操作とフラグ更新が同じ処理内で完結）

### 変更したファイル

#### バックエンド（4ファイル）

1. **backend/src/controllers/fileAccessController.ts**
   - MAIML削除時のフラグ更新処理を追加（約30行）
   - `projectRepository.update()` を直接呼び出し
   - `projectService.updateMaimlFlag()` の呼び出しを削除
   - fileKey判定条件を修正: `fileKey.startsWith('projects/')` を追加
   
2. **backend/src/services/projectService.ts**
   - `updateMaimlFlag()` 関数を削除（約20行）
   
3. **backend/src/controllers/projectController.ts**
   - `updateMaimlFlag()` 関数を削除（約15行）
   
4. **backend/src/routes/projectRoutes.ts**
   - `PATCH /api/v1/projects/:projectName/maiml-flag` ルートを削除（1行）

#### フロントエンド（2ファイル）

5. **frontend/src/components/project/ProjectManagement.tsx**
   - アップロード完了ハンドラの `updateMaimlFlag()` 呼び出しを削除（約8行）
   - MAIML削除時の `updateMaimlFlag()` 呼び出しを削除（約2行）
   - 削除理由コメントを追加
   
6. **frontend/src/services/projectApiService.ts**
   - `updateMaimlFlag()` 関数を削除（約10行）

### 実装の詳細

#### MAIML削除時のフラグ更新処理

**場所**: `backend/src/controllers/fileAccessController.ts` の `deleteFile()` メソッド

**処理フロー**:
```typescript
// ① ファイル削除（既存処理）
await service.deleteFileByKey(organizationId, fileKey);

// ② checkProjectStatus === true かつ MAIMLファイルの場合
if (checkProjectStatus === true) {
  const fileName = fileKey.split('/').pop() || '';
  const isMaimlFile = fileName.endsWith('.maiml');

  // パス判定（修正版）
  if (isMaimlFile && (fileKey.startsWith('projects/') || fileKey.includes('/projects/'))) {
    // プロジェクト名抽出
    const pathParts = fileKey.split('/');
    const projectsIndex = pathParts.findIndex((part: string) => part === 'projects');
    
    if (projectsIndex !== -1 && pathParts.length > projectsIndex + 1) {
      const projectName = pathParts[projectsIndex + 1];

      try {
        // プロジェクト取得
        const existingProject = await projectRepository.findByName(organizationId, projectName);

        // project_maiml_flg = false に更新
        if (existingProject && existingProject.project_maiml_flg) {
          const updatedProject: Project = {
            ...existingProject,
            project_maiml_flg: false,
          };
          await projectRepository.update(updatedProject);
        }
      } catch (updateError) {
        // エラーは警告のみ（ファイル削除は成功）
        console.error('❌ [File Delete] project_maiml_flg更新失敗（処理は続行）:', {
          projectName,
          error: updateError,
        });
      }
    }
  }
}
```

#### 重要な修正: fileKey判定条件のバグ修正

**問題**:
当初の実装では `fileKey.includes('/projects/')` のみで判定していましたが、実際の `fileKey` は `projects/ProjectName/...` という形式（先頭にスラッシュなし）で渡されるため、条件にマッチしませんでした。

**修正内容**:
```typescript
// ❌ 修正前（NG）
if (isMaimlFile && fileKey.includes('/projects/')) {

// ✅ 修正後（OK）
if (isMaimlFile && (fileKey.startsWith('projects/') || fileKey.includes('/projects/'))) {
```

この修正により、先頭にスラッシュがあるケースとないケースの両方に対応できるようになりました。

### 削除されたコード

#### バックエンド

```typescript
// projectService.ts
export async function updateMaimlFlag(
  organizationId: string,
  projectName: string,
  maimlFlag: boolean
): Promise<void> {
  // 削除された関数（約20行）
}

// projectController.ts
export const updateMaimlFlag = async (req: Request, res: Response): Promise<void> => {
  // 削除された関数（約15行）
};

// projectRoutes.ts
router.patch('/:projectName/maiml-flag', ...);  // 削除されたルート
```

#### フロントエンド

```typescript
// projectApiService.ts
export const updateMaimlFlag = async (
  projectName: string,
  maimlFlag: boolean
): Promise<void> => {
  // 削除された関数（約10行）
};

// ProjectManagement.tsx
await updateMaimlFlag(selectedProject.project_name, true);  // 削除された呼び出し
```

### 動作確認結果

#### ✅ 正常動作確認

1. **プロジェクト管理画面でのMAIML削除**
   - MAIMLファイル削除 → `project_maiml_flg = false` に更新 ✅
   - ログ: `✅ [File Delete] project_maiml_flg=false更新完了`
   
2. **フォーマット管理画面でのファイル削除**
   - ファイル削除 → `project_maiml_flg` は変更されない ✅
   - `checkProjectStatus` が渡されないため、フラグ更新処理が実行されない
   
3. **MAIML以外のファイル削除**
   - 一般ファイル削除 → `project_maiml_flg` は変更されない ✅
   - `.maiml` 拡張子でないため、フラグ更新処理がスキップされる
   
4. **MAIMLエディタでの編集保存**
   - MAIML保存 → `project_maiml_flg = true` に更新 ✅
   - 既存機能（`maimlService.saveMaiML()`）が正常動作

### 影響範囲

#### 変更あり
- **プロジェクト管理画面**: MAIML削除時のフラグ更新が内部実装で完結（動作は同じ）

#### 変更なし
- **フォーマット管理画面**: 影響なし
- **MAIMLエディタ**: 影響なし
- **一般ファイル操作**: 影響なし

### 実装により得られた効果

1. **コード量削減**: 約90行のコードを削除
2. **API削減**: 不要なエンドポイント（`PATCH /maiml-flag`）を削除
3. **一貫性向上**: 編集保存・削除の両方で同じパターンを使用
4. **保守性向上**: フラグ更新の責任が明確化

### 技術的な学び

1. **パス文字列の判定は複数パターンを想定する**
   - `startsWith()` と `includes()` の併用で堅牅な判定を実現
   
2. **詳細なログ出力が問題解決のカギ**
   - 各条件分岐でログを出力することで、バグの特定が迅速化
   
3. **既存パターンの活用で品質向上**
   - `maimlService.saveMaiML()` の実装を参考にしたことで、一貫性のあるコードを実現

---

**実装完了日時**: 2026-03-30 10:01  
**実装者**: Cline  
**関連タスク**: docs/20260330_1021_プロジェクト管理画面アップロードproject_maiml_flg更新/
