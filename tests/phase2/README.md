# フェーズ２ 結合試験 テスト方針

**作成日**: 2026-08-10
**作成者**: SSV
**対象**: mmdpf フェーズ２ 追加機能・変更箇所

---

## 目次

- [1. テストの目的](#1-テストの目的)
- [2. テスト対象フェーズの概要](#2-テスト対象フェーズの概要)
- [3. テスト分類](#3-テスト分類)
- [4. フォルダ構成](#4-フォルダ構成)
- [5. 分類A：既存機能への影響箇所 回帰テスト](#5-分類a既存機能への影響箇所-回帰テスト)
- [6. 分類B：フェーズ２新機能 シナリオテスト](#6-分類bフェーズ２新機能-シナリオテスト)
- [7. 分類C：全体シナリオテスト](#7-分類c全体シナリオテスト)
- [8. フェーズ1テストシナリオの流用方針](#8-フェーズ1テストシナリオの流用方針)
- [9. テスト実施の前提・環境](#9-テスト実施の前提環境)

---

## 1. テストの目的

フェーズ２で追加・変更された機能について、以下の目的でテストを実施する。

1. **新機能の動作保証**：フェーズ２で新規追加された機能が要件通りに動作することを確認する
2. **既存機能の品質維持**：フェーズ２での変更が既存機能を破壊していないことを確認する（回帰テスト）
3. **エンドツーエンドの整合性確認**：フェーズ１・フェーズ２の機能が連携した状態で、実験の一連のフローが正常に動作することを確認する

---

## 2. テスト対象フェーズの概要

| 項目 | 内容 |
|------|------|
| **フェーズ** | フェーズ２（2026年6月〜） |
| **フェーズ２の追加機能** | 名前空間管理（Namespace）、実験計画指示記入機能・実験作業者UI、不確かさ（Uncertainty）記録、Insertion機能 |
| **主な変更起点** | 2026年6月以降のgitコミット |
| **フェーズ１テスト資産の格納場所** | `mmdpf/tests/e2e/`（変更しない・過去記録として保持） |
| **フェーズ２テスト資産の格納場所** | `mmdpf/tests/phase2/`（本フォルダ） |

---

## 3. テスト分類

フェーズ２の結合試験は以下の3分類で実施する。

| 分類 | 名称 | テスト種別 | 内容 |
|-----|------|---------|------|
| **A** | 既存機能への影響箇所 回帰テスト | 単体レベル | 変更されたAPIおよびテーブル定義への影響箇所をCRUD単位で確認する |
| **B** | フェーズ２新機能 シナリオテスト | E2E（結合） | 新機能を各権限ロールでシナリオ通りに動作確認する |
| **C** | 全体シナリオテスト | E2E（全体通し） | 実験管理者⇔実験作業者の一連のやり取りを含む全体フローを通しで確認する |

---

## 4. フォルダ構成

```
mmdpf/
├── backend/
│   └── tests/
│       └── phase2/               ← 分類A：Jest 単体テスト（本プロジェクトのテストランナー）
│           ├── repositories/     ← Repository 単体テスト
│           │   └── ...
│           └── services/         ← Service 単体テスト
│               └── ...
│
└── tests/
    ├── e2e/                      ← フェーズ１（既存・変更なし）
    │   ├── test-scenarios/
    │   ├── features/
    │   ├── steps/
    │   └── fixtures/
    │
    └── phase2/                   ← フェーズ２（本フォルダ）
        ├── README.md             ← 本ファイル
        │
        ├── test-scenarios/       ← シナリオ定義（Markdown）
        │   ├── 0_login.md
        │   ├── 1_provider.md
        │   ├── 2_system_management.md
        │   ├── 3_data_management.md
        │   ├── 4_experiment_admin.md
        │   ├── 5_experiment_worker.md
        │   └── category-C_e2e-full-scenario.md
        │
        ├── features/             ← Playwright 用 featureファイル
        │   ├── new-features/     ← 分類B
        │   │   ├── namespace/
        │   │   ├── experiment-instruction/
        │   │   ├── uncertainty/
        │   │   └── insertion/
        │   └── e2e/              ← 分類C
        │       └── full_flow.feature
        │
        ├── steps/                ← ステップ実装（TypeScript）
        │   ├── new-features/
        │   ├── e2e/
        │   └── common.ts
        │
        ├── fixtures/             ← フェーズ２用テストデータ
        │   ├── testdata/
        │   └── maiml/
        │
        ├── playwright.config.ts
        └── db.ts
```

> **注記：分類Aの配置について**
> 分類A（回帰テスト・単体レベル）は Jest を使用するため、Jest の設定が存在する
> `mmdpf/backend/tests/phase2/` に配置する。
> `mmdpf/tests/phase2/` は Playwright（E2E）専用とし、分類B・Cのみを管理する。

---

## 5. 分類A：既存機能への影響箇所 回帰テスト

### 5.1 テストの対象範囲

2026年6月以降にソース変更が加えられた箇所をフェーズ２改修箇所とし、以下の2種類の回帰テストを実施する。

- **既存APIに手を加えた部分の単体レベルテスト**
- **テーブル定義が変わった箇所に関わるCRUD（INSERT・UPDATE・SELECT・DELETE）の単体レベルテスト**

### 5.2 テーブル定義変更箇所

> **注記：** 以下の内容は `docs/design/db/ddl/` フォルダ内の DDL ファイルを基準として整理している。
> DDL ファイルが存在しない項目はマイグレーションファイルのみで管理されている可能性がある。

| テーブル名 | 変更種別 | 変更内容 | DDL確認 |
|-----------|---------|---------|---------|
| `transition_data` | カラム追加 | `work_order` INTEGER（トランジション作業順序）追加 | ✅ DDL確認済み |
| `transition_data` | カラム追加 | `prerequisite_transition_ids` TEXT[]（前提トランジションID配列）追加 | ✅ DDL確認済み |
| `namespace` | **新規テーブル** | MAIMLで使用する名前空間を管理 | ✅ DDL確認済み |
| `namespace_term` | **新規テーブル** | 名前空間の用語管理 | ✅ DDL確認済み |
| `prefix` | **新規テーブル** | 名前空間プレフィックス管理 | ✅ DDL確認済み |
| `project_task_detail` | カラム追加 | `review_result`（NG理由テキスト）追加 | ✅ DDL確認済み |
| `code_master` | データ追加 | `task_status` コード `05: reviewNg` 追加 | ✅ code_master.csv確認済み |
| `uncertainty_criteria` | **新規テーブル** | 不確かさ評価の基準定義（定量・定性）を管理 | ✅ DDL確認済み |
| `intuition_selector` | **新規テーブル** | 不確かさ基準の定性評価で使用する選択肢を管理 | ✅ DDL確認済み |
| `experiment_instruction_detail` | **新規テーブル** | 実験指示タブの一覧（想定値・実績値・不確かさ付与）を管理 | ✅ DDL確認済み |
| `instruction_acknowledged_history` | **新規テーブル** | 実験指示の確認履歴（監査証跡） | ✅ DDL確認済み |
| `project_instruction` | **新規テーブル** | 実験指示（管理者→作業者への指示情報）管理 | ✅ DDL確認済み |
| `organization_group` | **新規テーブル** | `department` 廃止・移行先テーブル。`project.department_cd`・`attribute.department_cd` → `organization_group_cd` にリネーム | ✅ DDL確認済み |
| `organization_group_user` | **新規テーブル** | 組織グループのユーザ所属管理 | ✅ DDL確認済み |
| `department_unit` | **新規テーブル** | 旧 `department` から移行した部署ユニット管理テーブル | ✅ DDL確認済み |
| `department` | **テーブル削除** | `organization_group` に移行後に削除 | - |
| `organization_group` | カラム追加 | `is_active` BOOLEAN（アクティブ判定）追加 | ✅ DDL確認済み |
| `experiment_plan` | **新規テーブル** | 実験計画データ（planned_values JSON）管理テーブル | ✅ DDL確認済み |

### 5.3 既存APIの変更箇所（controller/service/repository/routes）

変更が確認されたファイル（2026年6月以降）は以下の通り。

**Controller（変更あり）**

| ファイル | 主なテスト観点 |
|---------|-------------|
| `authHelpers.ts` | 認証ヘルパー変更の影響（ログイン・JWT検証） |
| `experimentEvaluationController.ts` | 実験評価（新規追加） |
| `experimentInstructionController.ts` | 実験指示（新規追加） |
| `formatController.ts` | フォーマット管理の変更箇所 |
| `maimlController.ts` | MaiML編集・保存の変更箇所 |
| `masterController.ts` | マスタ管理の変更箇所 |
| `namespaceController.ts` | 名前空間管理（新規追加） |
| `organizationGroupController.ts` | 組織グループ管理（新規追加） |
| `progressController.ts` | 進捗確認の変更箇所 |
| `projectController.ts` | プロジェクト管理の変更箇所（organization_group_cd対応） |
| `uncertaintyCriteriaController.ts` | 不確かさ基準管理（新規追加） |
| `userController.ts` | ユーザ管理の変更箇所 |

**Repository（変更あり）**

| ファイル | 主なテスト観点 |
|---------|-------------|
| `transitionDataRepository.ts` | `order`・`prerequisite` 追加後のINSERT/SELECT |
| `projectTaskDetailRepository.ts` | `review_result` 追加後のINSERT/UPDATE/SELECT |
| `projectRepository.ts` | `department_cd` → `organization_group_cd` リネーム後のSELECT/UPDATE |
| `attributeRepository.ts` | `organization_group_cd` リネーム後のSELECT/UPDATE |
| `namespaceTermRepository.ts` | 名前空間新テーブルの全CRUD |
| `organizationGroupRepository.ts` | 組織グループ新テーブルの全CRUD・`is_active` 制御 |
| `experimentPlanRepository.ts` | 実験計画新テーブルの全CRUD |
| `templateDataRepository.ts` | 変更箇所の動作確認 |
| `userRepository.ts` | ユーザ登録・更新での名前空間生成連携 |
| `organizationManagementRepository.ts` | 組織管理の変更箇所 |
| `organizationUserRepository.ts` | 組織ユーザの変更箇所 |

**Repository（新規追加）**

| ファイル | 対応テーブル | 主なテスト観点 |
|---------|------------|-------------|
| `uncertaintyCriteriaRepository.ts` | `uncertainty_criteria`・`intuition_selector` | 不確かさ基準の全CRUD・バージョン管理・定性選択肢の全CRUD |
| `projectInstructionRepository.ts` | `project_instruction` | 実験指示の全CRUD |
| `instructionRepository.ts` | `experiment_instruction_detail`・`instruction_acknowledged_history` | 実験指示詳細の全CRUD・確認履歴の登録・参照 |
| `departmentUnitRepository.ts` | `department_unit` | 部署ユニットの全CRUD（department廃止後） |

**Routes（変更あり）**

| ファイル | 主なテスト観点 |
|---------|-------------|
| `experimentEvaluationRoutes.ts` | 実験評価APIのルーティング（新規） |
| `experimentInstructionRoutes.ts` | 実験指示APIのルーティング（新規） |
| `namespaceRoutes.ts` | 名前空間APIのルーティング（新規） |
| `organizationGroupRoutes.ts` | 組織グループAPIのルーティング（新規） |
| `uncertaintyCriteriaRoutes.ts` | 不確かさ基準APIのルーティング（新規） |
| `progressRoutes.ts` | 進捗確認ルートの変更箇所 |
| `userRoutes.ts` | ユーザ管理ルートの変更箇所 |

**Service（変更あり）**

| ファイル | 主なテスト観点 |
|---------|-------------|
| `authService.ts` | 認証フローの変更箇所 |
| `experimentEvaluationService.ts` | 実験評価サービス（新規） |
| `experimentInstructionService.ts` | 実験指示サービス（新規） |
| `fileAccessService.ts` | ファイルアクセスの変更箇所 |
| `formatService.ts` | フォーマット管理の変更箇所 |
| `maimlService.ts` | MaiML処理の変更箇所 |
| `maimlWriterService.ts` | MaiML書き込みサービスの変更箇所 |
| `masterService.ts` | マスタ管理の変更箇所 |
| `namespaceService.ts` | 名前空間サービス（新規） |
| `organizationGroupService.ts` | 組織グループサービス（新規） |
| `organizationService.ts` | 組織管理の変更箇所 |
| `pinCodeService.ts` | PINコード認証の変更箇所 |
| `progressService.ts` | 進捗確認の変更箇所 |
| `projectService.ts` | プロジェクト管理の変更箇所（organization_group対応） |
| `taskRegistrationService.ts` | タスク登録の変更箇所 |
| `userService.ts` | ユーザ登録・更新での名前空間生成連携 |

### 5.4 シナリオ詳細

→ `test-scenarios/category-A_regression.md` を参照

---

## 6. 分類B：フェーズ２新機能 シナリオテスト

### 6.1 テスト対象機能

| 機能 | 概要 |
|------|------|
| **名前空間管理（Namespace）** | 組織階層（会社→部門→グループ→個人）でのキー登録・参照・継承、用語管理との連動 |
| **実験計画指示記入機能・実験作業者UI** | 実験管理者による指示記入→配布→実験作業者による指示確認・実績値入力→承認フロー |
| **不確かさ（Uncertainty）記録** | 実験計画時の評価基準設定→作業者による定性・定量評価入力→承認ワークフロー |
| **Insertion機能** | MaiMLトランジションへの補足情報（Insertion）の記録・編集。実験作業者が実験記録時に追加情報を入力し、MaiMLの`<insertion>`要素に保存する |

### 6.2 テスト対象ロール

各機能について、以下の権限ロールそれぞれでシナリオテストを実施する。

| ロール | 権限 | テスト対象機能 |
|--------|------|--------------|
| **provider（プロバイダー）** | Global層の管理 | 名前空間グローバル層の管理 |
| **system_admin（システム管理者）** | 組織内管理 | 組織グループ管理（department廃止後の確認） |
| **data_admin（データ管理者）** | マスタ管理 | マスタ参照（名前空間キー参照確認） |
| **experiment_admin（実験管理者）** | 実験設計・指示・承認 | 名前空間・指示記入・不確かさ設定・承認 |
| **experiment_worker（実験作業者）** | 実験実施・記録 | 指示確認・実績値入力・不確かさ評価・Insertion入力・承認依頼 |

### 6.3 シナリオ詳細

→ `test-scenarios/category-B_phase2-new-features.md` を参照

---

## 7. 分類C：全体シナリオテスト

### 7.1 シナリオ概要

実験管理者と実験作業者の双方が関与する実験全体の一連のフローを1本通しで確認する。

### 7.2 代表シナリオ

```
1. [実験管理者] プロジェクト・ワークフローを作成する
2. [実験管理者] 名前空間でキーを登録し、不確かさ評価基準を設定する
3. [実験管理者] 実験作業者への指示を記入・配布する
4. [実験作業者] 配布された指示を確認する
5. [実験作業者] 各ステップの実績値・不確かさ評価を入力する
6. [実験作業者] 実験結果の承認依頼を送信する
7. [実験管理者] 実験結果・不確かさ評価を確認し承認（または差し戻し）する
8. [確認] MaiMLファイルにすべての情報（指示・実績値・不確かさ・承認記録）が正しく記録されていること
```

### 7.3 シナリオ詳細

→ `test-scenarios/category-C_e2e-full-scenario.md` を参照

---

## 8. フェーズ1テストシナリオの流用方針

フェーズ1のテストシナリオ（`tests/e2e/test-scenarios/`）の流用可否は以下の通り。

| ファイル | 流用可否 | 理由・対応方針 |
|---------|--------|-------------|
| `0_login.md` | △ 一部修正 | ログイン機能自体は変更なし。ただし組織グループ関連の初期データ構造変更により前提データの修正が必要 |
| `1_provider.md` | ○ そのまま流用可 | フェーズ２での変更なし |
| `2_system_management.md` | △ 修正必要 | `department`（部署）廃止・`organization_group`移行のため、部署管理に関わるシナリオは書き直し。ユーザ管理は流用可 |
| `3_data_management.md` | ○ そのまま流用可 | マスタ管理への変更なし |
| `4_experiment_admin.md` | △ 一部修正 | グループ4-1〜4-4・4-7〜4-12は流用可。4-5（指示登録）・4-6（進捗確認）・4-10（プロジェクト公開）は新機能との連携により修正必要 |
| `5_experiment_worker.md` | △ 一部修正 | 5-1〜5-3は流用可。5-2（実験記録）・5-4（指示確認）・5-5（進捗確認・承認依頼）は不確かさ・実験計画追加により修正必要 |

**全体として約60〜70%が流用可能。** フェーズ１シナリオをベースに、フェーズ２の変更差分を上書き・追記する形でシナリオを更新する。

---

## 9. テスト実施の前提・環境

| 項目 | 内容 |
|------|------|
| テスト実施対象バージョン | フェーズ２リリースビルド |
| テスト環境 | ローカルDocker環境（`docker-compose.yml`） |
| テスト自動化ツール | Playwright（BDD: Cucumber形式） |
| 手動テスト対象 | 自動化が困難なUI操作（MaiMLエディタ等）は手動テストで実施 |
| テストデータ格納場所 | `tests/phase2/fixtures/testdata/` |
| テスト結果の記録場所 | 各 `test-scenarios/category-*.md` 内の結果列に記録 |
| フェーズ1との共通処理 | `tests/phase2/steps/common.ts` からフェーズ1の共通ヘルパーを参照可 |
