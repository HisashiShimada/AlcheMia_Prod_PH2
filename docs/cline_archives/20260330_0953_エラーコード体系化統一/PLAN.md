# タスク計画書: エラーコード体系化統一

## メタデータ
- **作成日時**: 2026-03-30 09:53
- **タスクID**: error-code-unification
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

プロバイダー・システム管理者・データ管理者の各画面において、実験管理者画面と同様の
`extractErrorMessage(error)` を使ったエラーコード体系化を実装する。

## 問題の根本原因

### 差異①：サービス層でAxiosErrorを変換してしまっている
`userApiService.ts` / `departmentApiService.ts` / `roleApiService.ts` の各`catch`ブロックで
AxiosError を `new Error("API Error: ...")` に変換してスローしているため、
コンポーネントに届く時点でエラーコード情報（`error.response.data.error.code`）が失われている。

### 差異②：コンポーネントのcatchブロックが未対応
`extractErrorMessage(error)` を使わず、ハードコードされた翻訳キーや `error.message` を直接表示している。

## 修正対象ファイルと方針

### Phase 1: サービス層修正（AxiosError変換を除去）
| ファイル | 修正内容 |
|---|---|
| `frontend/src/services/userApiService.ts` | catch内の `new Error(...)` 変換を除去し、AxiosErrorをそのままスロー |
| `frontend/src/services/departmentApiService.ts` | 同上 |
| `frontend/src/services/roleApiService.ts` | 同上 |

### Phase 2: Provider画面修正（コンポーネントのcatch）
※ Providerはサービス層なし（コンポーネント直接呼び出し）のためPhase2のみ対応
| ファイル | 修正内容 |
|---|---|
| `frontend/src/components/Provider/OrganizationManagement.tsx` | catchを `extractErrorMessage(error)` に統一 |
| `frontend/src/components/Provider/CorporationManagement.tsx` | 同上 |

### Phase 3: SystemManagement画面修正
| ファイル | 修正内容 |
|---|---|
| `frontend/src/components/SystemManagement/UserManagement.tsx` | catchを `extractErrorMessage(error)` に統一 |
| `frontend/src/components/SystemManagement/DepartmentManagement.tsx` | 同上 |
| `frontend/src/components/SystemManagement/RoleManagement.tsx` | 同上 |

### Phase 4: DataManagement画面修正
| ファイル | 修正内容 |
|---|---|
| `frontend/src/components/DataManagement/MasterManagement.tsx` | catchを `extractErrorMessage(error)` に統一 |

## 注意事項
- `OrganizationManagement.tsx` の409エラー時フォームフィールドへのエラー表示ロジックは維持する
- 各サービス層の 409 Conflict 特殊処理（`throw new Error('入力されたIDは既に存在しています')`）はコンポーネント側に移管するか、サービス層でエラーコード付きでスローする
- CSVアップロードのバリデーションエラー（`instanceof Error && !isAxiosError`）のre-throwはそのまま維持

## 承認記録
- **計画書提示日時**: 2026-03-30 09:53
- **承認日時**: 2026-03-30 09:53（ユーザーによりAct Mode切替で承認）

## 実施記録

### 実施日時
開始: 2026-03-30 09:53
完了: 2026-03-30 10:14

### 実施内容

#### Phase 1: サービス層修正
- `userApiService.ts` / `departmentApiService.ts` / `roleApiService.ts`：catch内の`new Error(...)`変換を除去し、AxiosErrorをそのままスロー

#### Phase 2: Provider画面修正
- `OrganizationManagement.tsx`：`extractErrorMessage`import追加、handleModalOkのcatchを統一
- `CorporationManagement.tsx`：同上

#### Phase 3: SystemManagement画面修正
- `UserManagement.tsx`：`extractErrorMessage`import追加、CSV/保存catchを統一、バリデーションエラーの早期return追加
- `DepartmentManagement.tsx`：同上
- `RoleManagement.tsx`：同上

#### Phase 4: DataManagement画面修正
- `MasterManagement.tsx`：`extractErrorMessage`import追加、handleModalOkのcatchを統一、バリデーションエラーの早期return追加

### 最終的な成果物
- [x] 全画面でAxiosErrorのエラーコードが`extractErrorMessage`経由で正しく表示される
- [x] バリデーションエラー（errorFields）時の不要なエラーメッセージ表示を排除
- [x] エラーハンドリングパターンが実験管理者画面と統一された
