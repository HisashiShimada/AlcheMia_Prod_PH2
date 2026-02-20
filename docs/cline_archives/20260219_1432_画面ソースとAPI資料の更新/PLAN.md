# タスク計画書: 画面ソースとAPI資料の更新

## メタデータ
- **作成日時**: 2026-02-19 14:34
- **タスクID**: 画面ソースとAPI資料の更新
- **優先度**: 高（範囲拡大により変更）
- **推定工数**: 
  - フェーズ1（最優先3ファイル）: 3-4時間
  - フェーズ2（関連ファイル）: 6-8時間
  - フェーズ3（全体レビュー）: 8-10時間
  - **合計**: 17-22時間

## 1. タスク概要

実験管理者画面（experiment_admin）のUI仕様書全体とAPI仕様書について、実際のソースコードと設計資料の間に差分が発生しているため、資料を最新の実装に合わせて包括的に更新します。

### 対象範囲の拡大
- **当初の対象**: プロジェクト管理画面とMAIML編集画面の2ファイル
- **拡大後の対象**: 実験管理者画面の全UI仕様書（約25ファイル）+ 関連API仕様書（3-5ファイル）

## 2. 目的と期待される成果

### 目的
- 実装と設計資料の整合性を保つ
- 開発者が正確な情報にアクセスできるようにする
- 今後の機能追加時に混乱を避ける

### 期待される成果
- [x] プロジェクト管理画面の資料を最新化
- [x] MAIML編集画面の資料を最新化
- [x] API連携部分の実装状況を正確に反映

## 3. 修正方針

**重要**: このタスクでは、**ソースコードを正（真実）として資料を修正**します。

### 修正方針の理由
1. **実装が最新**: ソースコードは実際に動作しているため、現在の仕様を正確に反映している
2. **設計資料の遅延**: 開発の進行に伴い、資料の更新が追いついていない可能性がある
3. **一貫性の確保**: 実装と資料を一致させることで、開発者の混乱を防ぐ

### 修正対象
- ✅ **実装済み**と記載されているが実際は未実装 → **🔴 未実装**に修正
- 🔴 **未実装**と記載されているが実際は実装済み → **✅ 実装済み**に修正
- 記載されていない機能が実装されている → **新規追加として記載**
- Props、型定義、UI要素など実装と異なる記載 → **実装に合わせて修正**

## 4. 調査結果: 資料とソースの差分

### 3.1 プロジェクト管理画面 (ProjectManagement)

#### 差分1: タブ構成の変更
**資料の記載:**
- ファイル管理タブ
- タスク結果タブ

**実装の状況:**
- ファイル管理タブ
- **タスク登録タブ** (新規追加)
- **指示送信タブ** (新規追加)
- タスク結果タブ

#### 差分2: ファイル一覧取得APIの実装
**資料の記載:**
```
API: GET /api/v1/projects/:projectId/files - 🔴 未実装
```

**実装の状況:**
```typescript
const fileResponse = await getProjectFiles(selectedProject.name, true);
```
→ **実装済み**: `getProjectFiles()` API関数が存在し、使用されている

#### 差分3: タスク一覧取得APIの実装
**資料の記載:**
```
API: GET /api/v1/projects/:projectId/tasks - 🔴 未実装
```

**実装の状況:**
```typescript
const taskResponse = await getProjectTasks(selectedProject.name, 'all');
```
→ **実装済み**: `getProjectTasks()` API関数が存在し、使用されている

#### 差分4: プロジェクトリロード機能の詳細化
**資料の記載:**
- 基本的な流れのみ記載

**実装の状況:**
- プロジェクト一覧の最新化
- 選択状態の復元
- タブごとのデータ最新化
- エラーハンドリング

#### 差分5: ZIPダウンロード機能
**資料の記載:**
```
POST /api/v1/files/download - 共通API使用
```

**実装の状況:**
```typescript
await downloadFolderAsZip(folderPath);
```
→ **専用API関数**: `downloadFolderAsZip()` を使用

#### 差分6: プロジェクト作成API
**資料の記載:**
```
POST /api/v1/projects - ✅ 実装済み
```

**実装の状況:**
```typescript
const createdProject = await createProjectApi(requestData);
```
→ **確認**: 実装状況は資料と一致

#### 差分7: チェックイン/チェックアウトAPI
**資料の記載:**
```
POST /api/v1/projects/:projectId/checkout - ✅ 実装済み
POST /api/v1/projects/:projectId/checkin - ✅ 実装済み
```

**実装の状況:**
```typescript
// TODO: 実際のAPI呼び出しを実装
setProjects((prev) => prev.map(...));
```
→ **未実装**: ローカルステート更新のみ（資料と矛盾）

#### 差分8: 指示送信API
**資料の記載:**
```
POST /api/v1/projects/:projectId/instructions - 🔴 未実装
```

**実装の状況:**
```typescript
// TODO: チェックアウトAPIを呼び出す
console.log('指示データ送信:', data);
```
→ **未実装**: 資料と一致

### 3.2 MAIML編集画面 (PetriNetEditorScreen)

#### 差分1: Props定義の変更
**資料の記載:**
```typescript
interface PetriNetEditorScreenProps {
  projectId: string;
  projectName: string;
  projectOverview?: string;
  onClose: () => void;
}
```

**実装の状況:**
```typescript
interface PetriNetEditorScreenProps {
  projectId: string;
  projectName: string;
  projectOverview?: string;
  onClose: () => void;
  sourceS3Key: string;  // 新規追加
}
```

#### 差分2: PetriNetEditorInnerへのProps渡し
**資料の記載:**
```typescript
<PetriNetEditor
  initialContent={maimlContent}
  projectId={projectId}
  projectName={projectName}
  onSave={handleSave}
  onContentChange={handleContentChange}
  onError={handleError}
/>
```

**実装の状況:**
```typescript
<PetriNetEditorInner
  maimlData={maimlContent || null}
  editingFileName={`${projectName}.maiml`}
  editMode="project"
  originalFileName={projectName}
  sourceS3Key={sourceS3Key}
/>
```

#### 差分3: 保存処理の実装状況
**資料の記載:**
```
TODO: API未実装
仮実装: コンソールログのみ
```

**実装の状況:**
```typescript
const saveKey = `project-${projectId}-workflow`;
localStorage.setItem(saveKey, content);
```
→ **部分実装**: ローカルストレージへの保存は実装済み

#### 差分4: MAIMLファイル読み込みAPI
**資料の記載:**
```
API: GET /api/v1/projects/:projectId/maiml - 🔴 未実装
```

**実装の状況:**
```typescript
// TODO: プロジェクトに関連するMAIMLファイルを検索して読み込む
setMaimlContent(undefined);
```
→ **未実装**: 資料と一致

#### 差分5: 未保存状態の表示
**資料の記載:**
- 記載なし

**実装の状況:**
```typescript
{hasUnsavedChanges && (
  <div>● 未保存の変更があります</div>
)}
```
→ **追加実装**: UI要素が追加されている

## 5. 更新対象ファイル（拡大版）

### 5.1 UI仕様書（experiment_admin）

#### メニュー画面（1ファイル）
1. `00_menu/ExperimentAdminMenu.md`
   - メニュー構成の確認
   - 画面遷移の確認

#### プロジェクト管理（7ファイル）
2. `01_project_management/ProjectManagement.md` ⭐ **優先度：高**
   - タブ構成の追加（タスク登録・指示送信）
   - API実装状況の更新
   - リロード機能の詳細化
   - ZIPダウンロード機能の追記

3. `01_project_management/BulkUploadDialog.md`
   - API実装状況の確認

4. `01_project_management/CreateProjectModal.md`
   - API実装状況の確認

5. `01_project_management/FileListTable.md`
   - Props・型定義の確認

6. `01_project_management/ProjectDetailModal.md`
   - Props・型定義の確認

7. `01_project_management/ProjectFolderTree.md`
   - Props・型定義の確認

8. `01_project_management/ProjectSearchModal.md`
   - API実装状況の確認

#### フォーマット管理（8ファイル）
9. `02_format_management/FormatManagement.md`
   - API実装状況の確認
   - 機能実装状況の確認

10-16. その他フォーマット管理コンポーネント
   - Props・型定義の確認

#### 進捗監視（5ファイル）
17. `03_progress_monitoring/ProgressMonitoring.md`
   - API実装状況の確認

18-21. その他進捗監視コンポーネント
   - Props・型定義の確認

#### MAIML編集（14ファイル）
22. `04_maiml_editor/petri_net/PetriNetEditorScreen.md` ⭐ **優先度：高**
   - Props定義の更新（sourceS3Key追加）
   - PetriNetEditorInnerへのProps渡しの更新
   - 未保存状態表示の追記
   - 保存処理の実装状況更新

23. `04_maiml_editor/petri_net/PetriNetEditor.md`
   - Props・型定義の確認

24-35. その他MAIML編集コンポーネント
   - Props・型定義の確認

### 5.2 API仕様書

36. `docs/design/api/api_project_management.md` ⭐ **優先度：高**
   - ファイル一覧取得API（✅実装済みに更新）
   - タスク一覧取得API（✅実装済みに更新）
   - チェックイン/チェックアウトAPI（🔴未実装に修正）
   - プロジェクトリロードAPIの詳細化

37. `docs/design/api/api_format_management.md`
   - API実装状況の確認

38. `docs/design/api/api_maiml_editor.md`
   - MAIMLファイル読み込み/保存APIの実装状況確認

39. `docs/design/api/api_progress_monitoring.md`
   - API実装状況の確認

### 5.3 一覧ファイル（個別更新後に実施）

40. `docs/design/ui/ui_screen_list.md` ⭐ **優先度：高**
   - 画面一覧の更新
   - 実装状況の反映
   - 新規追加画面の記載

41. `docs/design/api/api_list.md` ⭐ **優先度：高**
   - API一覧の更新
   - 実装状況の反映
   - 新規追加APIの記載

### 5.3 更新優先度

| 優先度 | ファイル | 理由 |
|-------|---------|------|
| ⭐⭐⭐ 最高 | ProjectManagement.md | 差分が最も多い、主要画面 |
| ⭐⭐⭐ 最高 | PetriNetEditorScreen.md | Props定義変更、主要画面 |
| ⭐⭐⭐ 最高 | api_project_management.md | API実装状況の差分が大きい |
| ⭐⭐ 高 | その他プロジェクト管理系UI | 関連コンポーネント |
| ⭐⭐ 高 | api_maiml_editor.md | MAIML編集関連API |
| ⭐ 中 | その他UI仕様書 | Props・型定義の確認 |
| ⭐ 中 | その他API仕様書 | 実装状況の確認 |

### 5.4 段階的更新アプローチ

**フェーズ1（即時）**: 最優先3ファイル
- ProjectManagement.md
- PetriNetEditorScreen.md  
- api_project_management.md

**フェーズ2（次回）**: プロジェクト管理・MAIML編集関連
- プロジェクト管理系UI（6ファイル）
- MAIML編集系UI（6ファイル）
- api_maiml_editor.md

**フェーズ3（今後）**: 全体レビュー
- フォーマット管理系UI（8ファイル）
- 進捗監視系UI（5ファイル）
- その他API仕様書（2ファイル）

## 5. 実装ステップ

### Phase 1: ProjectManagement.md の更新
- [ ] セクション2.2.3「詳細ビュー」のタブ構成を更新
- [ ] セクション3.4「プロジェクトファイル管理」のAPI状態を更新
- [ ] セクション3.6「チェックイン/チェックアウト機能」の実装状況を修正
- [ ] セクション3.7「プロジェクト一括ダウンロード」の実装内容を更新
- [ ] セクション3.8「プロジェクトリロード」の処理フローを詳細化
- [ ] セクション5.1「使用するAPI一覧」の状態を更新

### Phase 2: PetriNetEditorScreen.md の更新
- [ ] セクション4.1「Props型定義」にsourceS3Keyを追加
- [ ] セクション2.2.2「PetriNetEditor」のProps渡しを更新
- [ ] セクション2.2.1「ヘッダー」に未保存状態表示を追加
- [ ] セクション3.1.2「保存処理」の実装状況を更新

### Phase 3: 検証
- [ ] 更新した資料を実装と照合
- [ ] 不整合がないか最終確認

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 他の箇所にも差分がある可能性 | 中 | 中 | 段階的に確認・更新 |
| API仕様が変更される可能性 | 低 | 低 | 実装確認後に資料更新 |

## 7. 承認記録

- **計画書提示日時**: 2026-02-19 14:34
- **承認日時**: 2026-02-19 14:52
- **承認者コメント**: 承認します。フェーズ1から実施してください

## 8. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [x] ProjectManagement.md 更新完了
- [x] PetriNetEditorScreen.md 更新完了
- [x] api_project_management.md 更新完了
- [x] CreateProjectModal.md 確認完了（更新不要）
- [x] 主要な差分の解消完了

## 9. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）
