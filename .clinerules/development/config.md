# コーディング規約

## タスク実行ワークフロー

Clineがタスクを実行する際は、必ず事前にタスク計画書を作成し、ユーザーの承認を得てから作業を開始します。

**詳細は [core/workflow.md](../core/workflow.md) を参照してください。**

---

## 一般原則

### マジックナンバー禁止（Magic Number Prohibition）

**コード内に数値・文字列リテラルを直接記述することを禁止する。**

#### 必須ルール

1. **code_master に登録されているコード値は必ずENUM定数を使用する**

   ```typescript
   // ❌ 禁止: マジックナンバーの直接使用
   if (project.project_status === 2) { ... }
   if (inst.instruction_status === 0) { ... }
   const statusFilter = 'AND project_status IN (1, 2, 3)';
   
   // ✅ 正しい: ENUM定数を使用
   if (project.project_status === ProjectStatusEnum.TASK_IN_PROGRESS) { ... }
   if (inst.instruction_status === InstructionStatusEnum.UNSENT) { ... }
   const allowed = [ProjectStatusEnum.TASK_PENDING, ProjectStatusEnum.TASK_IN_PROGRESS, ProjectStatusEnum.REVIEW_WAITING];
   const statusFilter = `AND project_status IN (${allowed.join(', ')})`;
   ```

2. **ローカル定数による回避も禁止する**

   ```typescript
   // ❌ 禁止: ファイル内のローカル定数による定義
   const PROJECT_STATUS_REVIEW_WAITING = 3; // ← 別ファイルでも同じ定義が生まれる
   
   // ✅ 正しい: 共通ENUMファイルから import
   import { ProjectStatusEnum } from '../enums/projectStatus.enum';
   ```

3. **同じマッピングを複数ファイルで再定義しない**

   ```typescript
   // ❌ 禁止: 各ファイルで独自に TASK_STATUS_MAP を定義
   const TASK_STATUS_MAP = { 0: 'pending', 1: 'in_progress', ... }; // ← 重複
   
   // ✅ 正しい: 共通の型定義ファイルから import
   import { TASK_STATUS_MAP } from '../types/project';
   ```

4. **HTTPステータスコードも定数化を推奨する**

   ```typescript
   // 🟡 推奨（必須ではないが推奨）
   // ❌ 非推奨
   if (error.response?.status === 409) { ... }
   
   // ✅ 推奨
   import { HTTP_STATUS } from '../constants/httpStatus';
   if (error.response?.status === HTTP_STATUS.CONFLICT) { ... }
   ```

#### ENUM定義ファイルの場所

| 対象 | バックエンド | フロントエンド |
|------|------------|--------------|
| code_master のコード値 | `backend/src/enums/*.enum.ts` | `frontend/src/constants/*.ts` |
| HTTPステータスコード | `backend/src/constants/httpStatus.ts` | `frontend/src/constants/httpStatus.ts` |
| 共通マッピング | `backend/src/types/*.ts` | `frontend/src/types/*.ts` |

#### 対応済みENUM一覧

| code_division | バックエンドENUM | フロントエンド定数 |
|--------------|----------------|----------------|
| `project_status` | `ProjectStatusEnum` (`enums/projectStatus.enum.ts`) | `ProjectStatus` (`constants/projectStatus.ts`) |
| `checkout_status` | `CheckoutStatusEnum` (`enums/projectStatus.enum.ts`) | `CheckoutStatus` (`constants/projectStatus.ts`) |
| `instruction_status` | `InstructionStatusEnum` (`enums/instructionStatus.enum.ts`) | `InstructionStatus` (`constants/instructionStatus.ts`) |
| `instruction_priority` | `InstructionPriorityEnum` (`enums/instructionStatus.enum.ts`) | `InstructionPriority` (`constants/instructionStatus.ts`) |
| `instruction_target` | `InstructionTargetEnum` (`enums/instructionStatus.enum.ts`) | `InstructionTarget` (`constants/instructionStatus.ts`) |
| `instruction_type`（数値） | `InstructionTypeEnum` (`enums/instructionStatus.enum.ts`) | `InstructionTypeCode` (`constants/instructionStatus.ts`) |
| `issue_type` | `IssueTypeEnum` (`enums/issueType.enum.ts`) | `IssueType` (`constants/issueType.ts`) |
| `experiment_condition` | `ExperimentConditionEnum` (`enums/experimentCondition.enum.ts`) | `ExperimentCondition` (`constants/experimentCondition.ts`) |
| `task_status` | `TaskStatusEnum` (`services/taskService.ts`) | — |
| トランジションステータス | `TransitionStatusEnum` (`types/transitionData.ts`) | — |

---

### タイムスタンプ処理規約（Timestamp Policy）

**すべてのタイムスタンプ処理は以下のルールに従うこと。**

#### 基本方針

| 操作 | ルール |
|------|--------|
| **DBへの書き込み** | 変換不要。`NOW()` や `new Date()` を UTC のままDBに格納する |
| **APIレスポンスへの変換** | 必ず `toJSTIsoString()` または `toISOStringJST()` を使用する |
| **`.toISOString()` の直接使用** | **禁止**（UTC文字列のまま返ることになる） |

#### 正しい使用例

```typescript
// ✅ DBから取得した日時をAPIレスポンスに返す場合
import { toJSTIsoString } from '../utils/dateUtils';

createdAt: toJSTIsoString(row.create_at)
updatedAt: row.update_at ? toJSTIsoString(row.update_at) : ''

// ✅ 現在時刻をAPIレスポンスに返す場合
timestamp: toJSTIsoString(new Date())
```

#### 禁止例

```typescript
// ❌ 禁止: .toISOString() を直接使用
createdAt: row.create_at.toISOString()     // UTCのまま返る
timestamp: new Date().toISOString()         // UTCのまま返る

// ❌ 禁止: DBへの書き込み時に JST変換
create_at: toJSTIsoString(new Date())       // DBへの挿入値は変換不要
```

#### 変換不要な例外ケース

以下はUTCのまま維持すること：

- S3 署名付き URL の有効期限（UTCが仕様）
- X.509 証明書の有効期限（notBefore / notAfter）
- MaiML XML ファイル内コンテンツの日時（`'edit-timestamp'` 等）
- MaiMLイベントログに格納する日時（`sentAt` 等）
- DB更新用の比較タイムスタンプ（楽観的ロック）

#### 使用可能な関数一覧

| 関数 | 用途 | 出力例 |
|------|------|--------|
| `toJSTIsoString(date)` | ISO8601形式でJST変換 | `"2026-08-31T12:00:00.000+09:00"` |
| `toISOStringJST(date)` | 同上（null/undefined対応あり） | `"2026-08-31T12:00:00.000+09:00"` |
| `formatDateTimeJST(date)` | YYYYMMDDhhmmss形式 | `"20260831120000"` |
| `toDisplayStringJST(date)` | 表示用 "YYYY-MM-DD HH:mm:ss" 形式 | `"2026-08-31 12:00:00"` |
| `toDateStringJST(date)` | 日付のみ "YYYY-MM-DD" 形式 | `"2026-08-31"` |
| `formatJST(date, format)` | 汎用フォーマット（dayjs形式） | `"2026/08/31"` 等 |
| `getNowJST()` | 現在JST時刻をYYYYMMDDhhmmss形式 | `"20260831120000"` |

#### DBカラム型

- **すべてのタイムスタンプカラムは `TIMESTAMPTZ`（TIMESTAMP WITH TIME ZONE）を使用する**
- `TIMESTAMP WITHOUT TIME ZONE` の新規作成は禁止

---

### インラインオブジェクト引数禁止（No Inline Object Arguments）

**関数・メソッドの引数にオブジェクトリテラルをインラインで渡すことを禁止する。**

呼び出し元で必ず変数に代入してから引数として渡すこと。

#### 必須ルール

```typescript
// ❌ 禁止: オブジェクトリテラルを引数にインラインで渡す
await projectRepository.insert({
  id: uuidv4(),
  name: projectName,
  organization_id: organizationId,
  created_at: new Date(),
});

// ❌ 禁止: 関数呼び出しのネスト内でオブジェクトリテラルを生成
await sendNotification({ type: 'email', recipient: user.email, body: message });

// ✅ 正しい: 変数に代入してから渡す
const projectData: Project = {
  id: uuidv4(),
  name: projectName,
  organization_id: organizationId,
  created_at: new Date(),
};
await projectRepository.insert(projectData);

// ✅ 正しい
const notificationParams: NotificationParams = {
  type: 'email',
  recipient: user.email,
  body: message,
};
await sendNotification(notificationParams);
```

#### この規約の目的

- **デバッグ容易性**: 変数名によりデータの意味が明確になる
- **ログ出力**: 渡す値をログに出力しやすくなる
- **型安全性**: 型注釈を付けることでコンパイル時にエラーを検出できる
- **可読性**: 引数の構造が関数呼び出しと分離されて読みやすい
- **テスタビリティ**: 渡したオブジェクトを変数経由で検証しやすい

#### 例外

以下の場合のみインラインオブジェクトを許容する：

```typescript
// ✅ 許容: 1〜2プロパティ以下の極めてシンプルな設定オブジェクト（型が自明な場合）
router.get('/path', { strict: true }, handler);

// ✅ 許容: テストコード内のモックデータ（テストの可読性を優先する場合）
expect(result).toEqual({ success: true, count: 3 });
```

---

### DRY (Don't Repeat Yourself)
- 重複するコードを避け、再利用可能な関数・コンポーネントに抽出する
- 共通ロジックはユーティリティ関数やサービス層に配置する
- 定数は constants/ ディレクトリで一元管理する

### SOLID原則
- **Single Responsibility**: 1つのクラス/関数は1つの責任のみを持つ
- **Open/Closed**: 拡張に対して開いており、修正に対して閉じている
- **Liskov Substitution**: サブタイプは基底タイプと置換可能
- **Interface Segregation**: 使用しないメソッドへの依存を強制しない
- **Dependency Inversion**: 具象ではなく抽象に依存する

### 関心の分離
- **フロントエンド**: プレゼンテーション層、UIロジックのみ
- **バックエンド**: ビジネスロジック、データアクセス層
- **サービス**: 再利用可能なビジネスロジック
- **ミドルウェア**: 横断的関心事（認証、ロギング、テナント分離）

### コードの可読性
- 自己説明的な変数名・関数名を使用する
- 複雑なロジックには適切なコメントを追加する
- ネストを深くしすぎない（最大3レベル）
- 早期リターンを活用して条件分岐を単純化する

## フロントエンド規約

詳細は [frontend.md](frontend.md) を参照してください。

### 主要なポイント
- React 18.2.0 + Ant Design v6を使用
- 関数コンポーネント + Hooksパターンを採用
- コンポーネントは components/ ディレクトリに配置
- カスタムフックは hooks/ ディレクトリに配置
- API通信は services/ ディレクトリで一元管理
- 状態管理は Context API を使用

### 画面コンポーネントからの直接API呼び出し禁止（重要）

**画面コンポーネント（pages/・components/ 配下）から `fetch()` や `axios` を直接呼び出すことを禁止する。**
必ず `services/` 配下の APIサービスクラス・関数を経由すること。

```typescript
// ❌ 禁止: コンポーネント内で fetch / axios を直接呼び出す
const ProjectList: React.FC = () => {
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => setProjects(data));
  }, []);
};

// ❌ 禁止: コンポーネント内に API URL をハードコーディング
const response = await axios.get('/api/v1/projects?status=1');

// ✅ 正しい: services/ 配下の APIサービスを経由する
import { getProjects } from '@/services/projectApiService';

const ProjectList: React.FC = () => {
  useEffect(() => {
    getProjects().then(data => setProjects(data));
  }, []);
};
```

**この規約の目的:**
- API呼び出しロジックをサービス層に集約し、コンポーネントの責務をUIに限定する（関心の分離）
- エラーハンドリング・認証ヘッダー付与などを一元管理できる
- API仕様変更時の修正箇所を最小化できる
- テスト時にAPIをモックしやすくなる

## バックエンド規約

詳細は [database.md](database.md) を参照してください。

### 主要なポイント
- Node.js 18+ + Express.js 4.18.3を使用
- ミドルウェアチェーン: auth → tenantIsolation → permissionCheck
- すべてのDBクエリでParameterized Queryを使用
- すべてのクエリに organization_id フィルタを含める
- エラーハンドリングは統一された形式で行う
- ログは winston を使用して記録

## TypeScript型定義の必須ルール

詳細は [typescript.md](typescript.md) を参照してください。

### すべての型定義は専用ファイルに集約

**禁止事項:**
```typescript
// ❌ インライン型定義（禁止）
function createUser(data: { name: string; email: string }) { }

// ❌ ファイル内に型定義（再利用不可）
interface User {
  name: string;
  email: string;
}
function createUser(data: User) { }
```

**推奨事項:**
```typescript
// ✅ 型定義ファイルに集約
// types/user.ts
export interface User {
  name: string;
  email: string;
}

// service.ts
import { User } from './types/user';
function createUser(data: User) { }
```

### 型定義作成時の確認ポイント

1. **既存の型定義を検索する**
   ```bash
   # バックエンド
   grep -r "interface Project" backend/src/types/
   
   # フロントエンド
   grep -r "interface Project" frontend/src/types/
   ```

2. **適切な型定義ファイルを選択する**
   - `database.ts` - DBテーブルの型
   - `api.ts` - API リクエスト/レスポンス
   - `components.ts` - コンポーネントProps
   - `common.ts` - 共通型

3. **JSDocコメントを追加する**
   ```typescript
   /**
    * ユーザー情報の型定義
    * 
    * @remarks
    * user テーブルのスキーマに対応
    */
   export interface User {
     // ...
   }
   ```

詳細は `.clinerules/development/typescript.md` を参照してください。

## レビュー依頼時の注意点

### コミット前の確認事項
- [ ] コードが正常に動作することを確認
- [ ] 関連するテストがすべて成功することを確認
- [ ] Lintエラーがないことを確認
- [ ] フォーマットが統一されていることを確認
- [ ] 機密情報が含まれていないことを確認
- [ ] コミットメッセージが明確であることを確認

### プルリクエスト作成時
- タイトルは変更内容を簡潔に表現する
- 説明には以下を含める：
  - 変更の目的
  - 実装の概要
  - テスト方法
  - 関連するIssue番号
- スクリーンショットやデモGIFを添付（UI変更の場合）
- レビュアーを適切にアサインする

### 特に確認してほしい点を明記
- 複雑なロジックの実装
- パフォーマンスへの影響
- セキュリティ上の懸念
- アーキテクチャの変更

## コードレビューの流れ

### 1. レビュアーの確認項目

#### コード品質
- [ ] コードが読みやすく、理解しやすい
- [ ] DRY原則に従っている
- [ ] 適切なエラーハンドリングが実装されている
- [ ] 適切なコメントが記述されている

#### 機能性
- [ ] 要件を満たしている
- [ ] エッジケースが考慮されている
- [ ] エラーケースが適切に処理されている

#### セキュリティ
- [ ] 認証・認可が適切に実装されている
- [ ] SQLインジェクション対策がされている
- [ ] XSS対策がされている
- [ ] マルチテナント分離が維持されている
- [ ] 機密情報が漏洩していない

#### パフォーマンス
- [ ] N+1問題がない
- [ ] 不要なデータベースクエリがない
- [ ] 大量データの処理が適切に行われている

#### テスト
- [ ] 適切なテストが追加されている
- [ ] テストカバレッジが維持されている
- [ ] すべてのテストが成功している

### 2. レビューコメントの書き方

#### 建設的なフィードバック
```
✅ 良い例：
「この実装は機能しますが、パフォーマンスの観点から〇〇のように変更することを提案します。
理由は△△だからです。」

❌ 悪い例：
「この実装は良くない。」
```

#### 質問形式を活用
```
「〇〇の場合、この処理はどのように動作しますか？」
「△△のケースは考慮されていますか？」
```

#### 重要度を明示
```
[必須] セキュリティ: organization_id のチェックが欠けています
[推奨] パフォーマンス: ここでキャッシュを使うと改善できます
[提案] 可読性: この変数名をより明確にすることを提案します
```

### 3. レビュー後の対応

#### 作成者（PR作成者）
- すべてのコメントに返信する
- 必須の指摘事項は必ず修正する
- 推奨・提案事項は検討して対応方針を説明する
- 修正完了後、再度レビューを依頼する

#### レビュアー
- 修正内容を確認する
- 追加の懸念事項があれば指摘する
- 問題がなければApproveする

### 4. マージ基準

以下の条件をすべて満たした場合のみマージ可能：
- [ ] 最低1名のレビュアーがApprove
- [ ] すべてのコメントが解決済み
- [ ] CIが成功している
- [ ] コンフリクトが解消されている
- [ ] セキュリティチェックリストを確認済み

## ファイル命名規則

### フロントエンド
- コンポーネント: `PascalCase.js`（例: `PetriNetViewer.js`）
- フック: `use*.js`（例: `useDragAndDrop.js`）
- ユーティリティ: `camelCase.js`（例: `formatDate.js`）
- サービス: `camelCase.js`（例: `apiService.js`）

### バックエンド
- ルート: `camelCaseRoutes.js`（例: `workerRoutes.js`）
- ミドルウェア: `camelCase.js`（例: `auth.js`）
- サービス: `camelCaseService.js`（例: `s3Service.js`）
- ユーティリティ: `camelCaseHelper.js`（例: `s3PathHelper.js`）

## インポート順序

### 標準的な順序
1. Node.js組み込みモジュール / React・サードパーティライブラリ
2. 内部モジュール（コンポーネント、サービスなど）
3. 型定義
4. 定数
5. スタイル

### フロントエンド例
```javascript
// 1. React・サードパーティ
import React, { useState } from 'react';

// 2. 内部モジュール
import PetriNetViewer from '../components/PetriNetViewer';
import apiService from '../services/apiService';

// 3. 定数
import { API_BASE_URL } from '../constants/constants';

// 4. スタイル
import './styles.css';
```

### バックエンド例
```javascript
// 1. Node.js組み込み
import fs from 'fs';
import path from 'path';

// 2. サードパーティ
import express from 'express';
import { S3Client } from '@aws-sdk/client-s3';

// 3. 内部モジュール
import { auth } from '../middleware/auth';
import s3Service from '../services/s3Service';
import db from '../database/db';
```

## コメント規約

### 関数・メソッドのコメント
- 複雑なロジックには必ずコメントを追加
- 目的、パラメータ、戻り値を明記
- エッジケースや注意点を記載

### インラインコメント
- なぜそのコードが必要なのかを説明
- 何をしているかは自明なコードで表現

### TODO/FIXME コメント
```javascript
// TODO: [2024-11-17] パフォーマンス最適化 - バッチ処理を実装
// FIXME: [Critical] エラーハンドリングが不完全 - タイムアウト処理を追加
// NOTE: この実装は一時的なもの。Phase 3で再設計予定
```

## エラーメッセージ

### ユーザー向けメッセージ
- 日本語で分かりやすく
- 具体的な対処方法を含める
- 機密情報を含めない

### ログ出力
- 詳細なエラー情報を記録
- スタックトレースを含める
- 関連するコンテキスト情報を付与

## バージョン管理

### ブランチ戦略
- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 新機能開発
- `fix/*`: バグ修正
- `hotfix/*`: 緊急修正

### コミットメッセージ
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: フォーマット
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: ビルド・ツール
