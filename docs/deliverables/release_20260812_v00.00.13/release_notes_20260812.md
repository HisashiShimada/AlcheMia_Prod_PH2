# リリースノート

**リリース日**: 2026-08-12  
**対象ブランチ**: main  
**前回リリースコミット**: `30b6df822`  
**今回リリースコミット**: `ba3f44378`

---

## バグ修正

### 1. 作業者画面のエラー修正

- **フロントエンド対応**:
  - `ExperimentRecordTab.tsx` : 表示エラーを修正
  - `InstructionConfirmationTab.tsx` : 表示エラーを修正
  - `ProgressCheckTab.tsx` : 表示エラーを修正
  - `codeMaster.ts` : 不足していた定数定義を追加

### 2. ユーザー管理バリデーション修正（ISSUE#43）

- **バックエンド対応**:
  - `backend/src/routes/userRoutes.ts` : バリデーション処理を修正
- **フロントエンド対応**:
  - `frontend/src/components/SystemManagement/UserManagement.tsx` : バリデーション関連の表示処理を修正
- **ドキュメント**:
  - `docs/minutes/2026.08.10_userManagement_validation_investigation.md` : 調査内容をドキュメント化

---

## ドキュメント

### 1. 名前空間機能の要件定義資料を追加・修正

- **新規作成**:
  - `docs/requirement/phase2/01_namespace/03_Use_Cases.md` : ユースケース一覧を新規作成
  - `docs/requirement/phase2/01_namespace/04_Business_Flow.md` : ビジネスフローを新規作成
- **更新**:
  - `docs/requirement/phase2/01_namespace/01_Objectives.md` : 目的・概要を更新
  - `docs/requirement/phase2/01_namespace/02_Required_Features.md` : 要求機能を更新・追記

### 2. 実験指示・作業者UI機能の要件定義資料を新規作成

- `docs/requirement/phase2/02_experiment_instruction_workerUI/01_Objectives.md` : 目的・概要を新規作成
- `docs/requirement/phase2/02_experiment_instruction_workerUI/02_Required_Features.md` : 要求機能を新規作成
- `docs/requirement/phase2/02_experiment_instruction_workerUI/03_Use_Cases.md` : ユースケース一覧を新規作成
- `docs/requirement/phase2/02_experiment_instruction_workerUI/04_Business_Flow.md` : ビジネスフローを新規作成

### 3. Uncertainty機能の要件定義資料を新規作成

- `docs/requirement/phase2/03_Uncertainty/01_Objectives.md` : 目的・概要を新規作成
- `docs/requirement/phase2/03_Uncertainty/02_Required_Features.md` : 要求機能を新規作成
- `docs/requirement/phase2/03_Uncertainty/03_Use_Cases.md` : ユースケース一覧を新規作成
- `docs/requirement/phase2/03_Uncertainty/04_Business_Flow.md` : ビジネスフローを新規作成

### 4. 議事録ファイルを追加

以下の定例会・打ち合わせ議事録を追加：

| ファイル | 内容 |
|---------|------|
| `docs/minutes/2026.06.04_定例会.md` | 2026/06/04 定例会 |
| `docs/minutes/2026.06.08_定例会.md` | 2026/06/08 定例会 |
| `docs/minutes/2026.06.09_定例会.md` | 2026/06/09 定例会 |
| `docs/minutes/2026.06.11_定例会.md` | 2026/06/11 定例会 |
| `docs/minutes/2026.06.15_定例会.md` | 2026/06/15 定例会 |
| `docs/minutes/2026.06.16_定例会.md` | 2026/06/16 定例会 |
| `docs/minutes/2026.06.18_定例会.md` | 2026/06/18 定例会 |
| `docs/minutes/202606.23_定例会.md` | 2026/06/23 定例会 |
| `docs/minutes/2026.06.25_定例会.md` | 2026/06/25 定例会 |
| `docs/minutes/2026.06.29_定例会.md` | 2026/06/29 定例会 |
| `docs/minutes/2026.06.30_定例会.md` | 2026/06/30 定例会 |
| `docs/minutes/2026.07.01_定例会.md` | 2026/07/01 定例会 |
| `docs/minutes/2026.07.02_定例会.md` | 2026/07/02 定例会 |
| `docs/minutes/2026.07.06_定例会.md` | 2026/07/06 定例会 |
| `docs/minutes/2026.07.07_定例会.md` | 2026/07/07 定例会 |
| `docs/minutes/2026.07.08_定例会.md` | 2026/07/08 定例会 |
| `docs/minutes/2026.07.09_定例会.md` | 2026/07/09 定例会 |
| `docs/minutes/2026.07.13_定例会.md` | 2026/07/13 定例会 |
| `docs/minutes/2026.07.14_定例会.md` | 2026/07/14 定例会 |
| `docs/minutes/2026.07.16_定例会.md` | 2026/07/16 定例会 |
| `docs/minutes/2026.07.17_定例会.md` | 2026/07/17 定例会 |
| `docs/minutes/2026.07.21_定例会.md` | 2026/07/21 定例会 |
| `docs/minutes/2026.07.23_定例会.md` | 2026/07/23 定例会 |
| `docs/minutes/2026.07.24_定例会.md` | 2026/07/24 定例会 |
| `docs/minutes/2026.07.27_定例会.md` | 2026/07/27 定例会 |
| `docs/minutes/2026.07.28_定例会.md` | 2026/07/28 定例会 |
| `docs/minutes/2026.07.29_定例会.md` | 2026/07/29 定例会 |
| `docs/minutes/2026.07.30_定例会.md` | 2026/07/30 定例会 |
| `docs/minutes/2026.08.03_定例会.md` | 2026/08/03 定例会 |

---

## DB マイグレーション

なし

---

## 主な変更ファイル（抜粋）

### バックエンド

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/routes/userRoutes.ts` | ユーザー管理バリデーション修正（ISSUE#43） |

### フロントエンド

| ファイル | 変更概要 |
|---------|---------|
| `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | 作業者画面のエラー修正 |
| `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` | 作業者画面のエラー修正 |
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | 作業者画面のエラー修正 |
| `frontend/src/constants/codeMaster.ts` | 不足定数の追加 |
| `frontend/src/components/SystemManagement/UserManagement.tsx` | ユーザー管理バリデーション修正（ISSUE#43） |

### ドキュメント

| ファイル | 変更概要 |
|---------|---------|
| `docs/requirement/phase2/01_namespace/`（追加・更新） | 名前空間機能の要件定義資料 |
| `docs/requirement/phase2/02_experiment_instruction_workerUI/`（新規） | 実験指示・作業者UI機能の要件定義資料 |
| `docs/requirement/phase2/03_Uncertainty/`（新規） | Uncertainty機能の要件定義資料 |
| `docs/minutes/`（多数追加） | 定例会議事録（2026/06/04〜2026/08/10） |
