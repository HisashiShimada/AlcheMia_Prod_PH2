# タスク計画書: frontend/src/api → frontend/src/services インポートパス修正

## メタデータ
- **作成日時**: 2026-02-20 13:19
- **タスクID**: api_to_services_import修正
- **優先度**: 中
- **推定工数**: 30分

## 1. タスク概要

frontend/src/apiディレクトリがfrontend/src/servicesに変更されたことに伴い、旧パス`@/api/projectApiService`を参照している5つのコンポーネントファイルのインポート文を修正します。

## 2. 目的と期待される成果

### 目的
- ディレクトリ構造の変更に合わせてインポートパスを統一する
- コンパイルエラーを防止する
- コードの保守性を向上させる

### 期待される成果
- [x] 影響範囲の調査完了
- [ ] 5つのファイルのインポート文が正しく修正される
- [ ] TypeScriptコンパイルエラーがない
- [ ] 実験作業者メニューが正常に動作する

## 3. 実装ステップ

### Phase 1: 準備
- [x] 影響を受けるファイルの特定（検索完了）
- [x] tsconfig.jsonのパスエイリアス確認
- [x] 実体ファイルの存在確認
- [ ] タスク計画書の作成

### Phase 2: インポート文の修正
- [x] ExperimentWorkerMenu.tsx の修正
- [x] ProjectSelectionModal.tsx の修正
- [x] ProgressCheckTab.tsx の修正
- [x] InstructionConfirmationTab.tsx の修正
- [x] ExperimentRecordTab.tsx の修正

### Phase 3: 検証
- [ ] TypeScriptコンパイルチェック（`npm run build`）
- [ ] 実験作業者メニューの動作確認
- [ ] プロジェクト一覧取得の動作確認
- [ ] タスク一覧取得の動作確認

## 4. 影響範囲

### 変更するファイル（5ファイル）

#### 1. frontend/src/components/menus/ExperimentWorkerMenu.tsx
**変更内容:**
```typescript
// 修正前
import { getWorkerAccessibleProjects, requestApproval, type WorkerProject } from '@/api/projectApiService';

// 修正後
import { getWorkerAccessibleProjects, requestApproval, type WorkerProject } from '@/services/projectApiService';
```
**影響:** プロジェクト一覧取得、承認依頼機能

#### 2. frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx
**変更内容:**
```typescript
// 修正前
import type { WorkerProject } from '@/api/projectApiService';

// 修正後
import type { WorkerProject } from '@/services/projectApiService';
```
**影響:** プロジェクト選択モーダルの型定義

#### 3. frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx
**変更内容:**
```typescript
// 修正前
import { getWorkerTasks } from '@/api/projectApiService';
import type { WorkerTasksResponse, WorkerMethod, WorkerTask } from '@/api/projectApiService';

// 修正後
import { getWorkerTasks } from '@/services/projectApiService';
import type { WorkerTasksResponse, WorkerMethod, WorkerTask } from '@/services/projectApiService';
```
**影響:** 進捗確認タブのタスク一覧取得、型定義

#### 4. frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx
**変更内容:**
```typescript
// 修正前
import { getWorkerTasks } from '@/api/projectApiService';
import type { WorkerMethod, WorkerTask } from '@/api/projectApiService';

// 修正後
import { getWorkerTasks } from '@/services/projectApiService';
import type { WorkerMethod, WorkerTask } from '@/services/projectApiService';
```
**影響:** 指示確認タブのタスク一覧取得、型定義

#### 5. frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx
**変更内容:**
```typescript
// 修正前
import { getWorkerTasks } from '@/api/projectApiService';
import type { WorkerMethod, WorkerTask } from '@/api/projectApiService';

// 修正後
import { getWorkerTasks } from '@/services/projectApiService';
import type { WorkerMethod, WorkerTask } from '@/services/projectApiService';
```
**影響:** 実験記録タブのタスク一覧取得、型定義

### 影響を受ける機能
- 実験作業者メニュー全体
  - プロジェクト選択機能
  - 進捗確認タブ
  - 指示確認タブ
  - 実験記録タブ
  - 承認依頼機能

## 5. 技術的詳細

### 使用する技術・ライブラリ
- TypeScript: 型システムによるコンパイル時チェック
- Next.js: パスエイリアス機能（tsconfig.json）

### 修正パターン
**一括置換:**
```
@/api/projectApiService → @/services/projectApiService
```

### 確認事項
- ✅ tsconfig.jsonのパスエイリアス設定: `"@/*": ["./src/*"]` - 正常
- ✅ 実体ファイルの存在: `frontend/src/services/projectApiService.ts` - 存在確認済み
- ✅ エクスポート内容: 関数・型定義は変更なし - 互換性あり

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| コンパイルエラー | 低 | 低 | TypeScriptコンパイラで自動検出。修正漏れがあっても即座に発見可能 |
| ランタイムエラー | 低 | 極低 | パス変更のみでロジック変更なし。インポート成功すれば問題なし |
| 置換ミス | 低 | 低 | 5ファイルのみで範囲が限定的。手動確認も容易 |
| 他のインポート文への影響 | なし | なし | `@/api/projectApiService`のみを対象とし、他のパスには影響しない |

## 7. テスト計画

### コンパイルテスト
```bash
cd frontend
npm run build
```
**期待結果:** エラーなくビルドが完了すること

### 動作確認項目
1. **実験作業者メニューの表示**
   - メニューが正常に表示される
   - プロジェクト選択ドロップダウンが動作する

2. **プロジェクト一覧取得**
   - プロジェクト一覧が正常に取得できる
   - プロジェクト選択モーダルが開ける

3. **タスク一覧取得**
   - 進捗確認タブでタスク一覧が表示される
   - 指示確認タブでタスク情報が取得できる
   - 実験記録タブでタスク選択ができる

4. **承認依頼機能**
   - 承認依頼ボタンが機能する

## 8. ロールバック計画

修正は単純なパス変更のみのため、問題が発生した場合は以下の手順でロールバック可能：

1. 各ファイルのインポート文を元に戻す
   ```typescript
   @/services/projectApiService → @/api/projectApiService
   ```

2. コンパイルチェック
   ```bash
   npm run build
   ```

## 9. 関連ドキュメント

- tsconfig.json: パスエイリアス設定
- frontend/src/services/projectApiService.ts: 実体ファイル
- .clinerules/development/config.md: コーディング規約

## 10. 承認記録

- **計画書提示日時**: 2026-02-20 13:19
- **承認日時**: （ユーザー承認待ち）
- **承認者コメント**: （記入待ち）

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に記入）

### 発生した問題と解決方法
（実施中に記入）

### 最終的な成果物
- [ ] ExperimentWorkerMenu.tsx - インポートパス修正
- [ ] ProjectSelectionModal.tsx - インポートパス修正
- [ ] ProgressCheckTab.tsx - インポートパス修正
- [ ] InstructionConfirmationTab.tsx - インポートパス修正
- [ ] ExperimentRecordTab.tsx - インポートパス修正

## 12. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）
