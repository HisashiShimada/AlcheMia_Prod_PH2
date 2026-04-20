# リリースノート

**リリース日**: 2026-04-20  
**対象ブランチ**: main  
**前回リリースコミット**: `cd028f7114dfe85e8e9f6e7af8fd9e695fd6b787`  
**今回リリースコミット**: `4b24d6ab276a18959c0e7639f6559d438ef7fe65`

---

## バグ修正

### 1. 部署なしユーザーのフォーマット管理が正常に動作しない問題を修正

- **問題**: 組織追加時に自動登録されるシステム管理者など `departmentCd=null` のユーザーがフォーマット管理を開くと、S3上に対応フォルダが存在しないため何も表示されなかった
- **修正**: `departmentCd` が null/空の場合は `default` フォルダを参照するようフォールバックを追加。組織作成時に `formats/default/condition/`、`formats/default/material/`、`formats/default/result/` を自動作成するよう対応
- **合わせて対応**: ユーザー管理フォームの部署コードを必須（required）から任意に変更

### 2. MAIML 編集画面から戻った際にビューアが正常に動作しない問題を修正（GitHub Issue#24）

- **問題**: MAIML 編集画面でファイルを保存してプロジェクト管理画面に戻ると、`ProjectMaimlProvider` が保持する `maimlContent` が古いまま更新されず、ビューアボタン押下時に「読み込む対象がない」エラーが発生した
- **修正**: `handleRefresh` を強化し、プロジェクト一覧再取得に加えて選択中プロジェクトの MAIML も最新化するよう変更。コンポーネント初回マウント時に `selectedProjectId` が復元済みであれば自動的にリフレッシュを実行するよう対応

### 3. 共通テンプレートチェックボックスが連動しない問題を修正（GitHub Issue#22）

- **問題**: PropertyPanel の「共通テンプレート参照」セレクトで共通テンプレートを選択した際に、「共通テンプレート（全methodで共有）」チェックボックスがONにならなかった
- **修正**: `PropertyPanel.tsx` の `commonTemplateRef` セレクトの `onChange` ハンドラーを修正し、`commonTemplateRef` 更新と同時に `isCommonTemplate` フラグも連動して更新するよう対応。参照解除時は `false` に戻る

### 4. プロジェクトダウンロードボタンの非活性化（GitHub Issue#25）

- プロジェクトダウンロードボタンを適切な条件で非活性化するよう修正

### 5. 実験作業者画面（5-2-15）の表示修正

- `DataRecordDialog` の表示内容を修正

### 6. 実験記録タブ メソッド・タスク選択モーダルにタスクが表示されない問題を修正

- **問題**: 実験作業者メニューの「実験記録タブ」でメソッド・タスク選択モーダルを開くとタスク一覧が表示されなかった
- **修正**: `ExperimentRecordTab.tsx` の `methodsData` 変換処理で `tasks` フィールドのマッピングが抜けていたため追加。`InstructionConfirmationTab.tsx` と同様の実装に統一

### 7. フォーマット管理の部署コード セッション管理の修正

- **問題**: フォーマット管理の部署コードが `req.session` に登録されており、他のユーザー情報の管理方式（`req.user`）と異なっていた
- **修正**: 部署コード（`departmentCd`）を `req.session` ではなく `req.user` で一律管理するよう変更。`authController.ts`、`authHelpers.ts`、`formatController.ts`、`authService.ts`、`auth.ts` を修正

---

## 改善

### 1. 多言語化の設定漏れ対応（改善仕様書 No.17a）

- `frontend/src/locales/ja.json` に多言語化対応が漏れていたキーを追加
- `frontend/src/locales/en.json` の不要な項目を整理

### 2. プロジェクト作成時のレコード追加処理の改善

- `projectService.ts` でプロジェクト作成時に必要なレコードが追加されない問題を修正

---

## インフラ・デプロイ対応

### 1. SaaS 検証環境 HTTPS 対応

- ALB/NLB 共存構成のデプロイスクリプト（`scripts/deploy.ecr.phase1.sh`）を新規作成
- NLB 移行手順書・実施メモを整備（`docs/deploy-guide/saas/`）
- クライアント証明書の発行・再生成手順書を整備
- サーバー証明書の AWS SSM Parameter Store 登録手順書・スクリプトを整備（`scripts/setup-ssm-ssl.sh`）
- nginx の本番設定ファイル（`config/nginx/nginx.prod.conf`）に証明書関連の設定を追加

### 2. nginx 正規表現バグ修正（GitHub Issue#27）

- **問題**: `config/nginx/nginx.prod.conf` の `map` ディレクティブで、クライアント証明書の Subject DN から UUID 形式の組織 ID を抽出する正規表現が壊れており（`\{8\}` が量指定子でなくリテラルとして解釈されていた）、`orgId` クエリパラメータが常に空文字列になっていた
- **修正**: 正規表現値全体をダブルクォートで囲み、`{8}` を量指定子として正しく機能させるよう修正。これにより NLB 経由でのクライアント証明書認証が正常に動作する

### 3. ECS タスク定義の Embedding 環境変数修正

- **問題**: ECS Fargate（検証環境）でトランジション検索を実行すると HTTP 500 エラーが発生。`EMBEDDING_PROVIDER` 未設定によりデフォルトの `ollama` が使用され、存在しない ollama ホストへの接続が試みられていた
- **修正**: `aws/ecs-task-definition-alchemia-backend.json` に以下の環境変数を追加・変更
  - `EMBEDDING_PROVIDER=bedrock` を追加
  - `BEDROCK_EMBEDDING_MODEL_ID` を `amazon.titan-embed-text-v2:0` → `cohere.embed-v4:0` に変更
  - `BEDROCK_EMBEDDING_OUTPUT_DIMENSION=1024` を追加

---

## DB マイグレーション

なし

---

## 主な変更ファイル（抜粋）

### バックエンド

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/controllers/authController.ts` | 部署コードのセッション管理を `req.session` から `req.user` に移行 |
| `backend/src/controllers/authHelpers.ts` | 部署コードのセッション管理を `req.user` に統一 |
| `backend/src/controllers/formatController.ts` | 部署コードの参照先を `req.user` に変更 |
| `backend/src/services/authService.ts` | `departmentCd` を `req.user` に保存するよう修正 |
| `backend/src/services/formatService.ts` | `departmentCd` が null/'' の場合に `default` フォルダを使用するフォールバック追加 |
| `backend/src/services/organizationService.ts` | 組織作成時に `formats/default/` 配下の3サブフォルダを自動作成 |
| `backend/src/services/projectService.ts` | プロジェクト作成時のレコード追加処理を修正 |
| `backend/src/types/auth.ts` | `departmentCd` フィールドを追加 |

### フロントエンド

| ファイル | 変更概要 |
|---------|---------|
| `frontend/src/components/SystemManagement/UserManagement.tsx` | 部署コードを必須から任意に変更 |
| `frontend/src/components/project/FormatManagement.tsx` | `departmentCd` が null/'' の場合に `default` フォルダを使用 |
| `frontend/src/components/project/ProjectManagement.tsx` | `handleRefresh` 強化・初回マウント時リフレッシュ追加・ダウンロードボタン非活性化対応 |
| `frontend/src/components/editorv2/components/PropertyPanel.tsx` | 共通テンプレート参照セレクト変更時に `isCommonTemplate` を連動更新 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | 共通テンプレート関連処理の修正 |
| `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | `methodsData` 変換処理に `tasks` マッピングを追加 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | 実験作業者画面 5-2-15 の表示修正 |
| `frontend/src/locales/ja.json` | 多言語化漏れキーを追加 |
| `frontend/src/locales/en.json` | 不要項目の整理 |

### インフラ

| ファイル | 変更概要 |
|---------|---------|
| `config/nginx/nginx.prod.conf` | クライアント証明書 orgId 抽出の正規表現バグ修正・証明書設定追加 |
| `config/nginx/entrypoint.sh` | SSL 設定スクリプト対応 |
| `aws/ecs-task-definition-alchemia-backend.json` | Embedding 環境変数追加・変更 |
| `aws/ecs-task-definition-alchemia-nginx.json`（新規） | HTTPS 対応 nginx タスク定義 |
| `scripts/deploy.ecr.phase1.sh`（新規） | ALB/NLB 共存構成のデプロイスクリプト |
| `scripts/setup-ssm-ssl.sh`（新規） | SSL 証明書 SSM 登録スクリプト |
