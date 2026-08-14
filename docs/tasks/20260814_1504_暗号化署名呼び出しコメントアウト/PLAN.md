# タスク計画書: 暗号化・署名機能の呼び出し箇所コメントアウト

## メタデータ
- **作成日時**: 2026-08-14 15:04
- **タスクID**: 20260814_1504_暗号化署名呼び出しコメントアウト
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

暗号化（encryption）および署名（signature）機能は今回のリリースでは本実装しない。
ソースコードは将来の本実装のために残すが、現状呼び出している箇所を全てコメントアウトし、
ユーザーからアクセスできない状態にする。

## 目的と期待される成果

- [ ] 暗号化・署名機能のAPIエンドポイントが無効化される（バックエンド）
- [ ] 暗号化管理モーダルを開くボタンが非表示になる（フロントエンド）
- [ ] 署名管理モーダルを開くボタンが非表示になる（フロントエンド）
- [ ] 鍵管理タブ（実験管理者メニュータブ6）が非表示になる（フロントエンド）
- [ ] TypeScript コンパイルエラーが 0 件であること

## 方針

- **ソースは削除しない**（将来の本実装のために保持）
- **コメントアウトで無効化**する
- `certificateService` の呼び出し（組織作成時の証明書生成）は対象外
  - フロントエンドから直接呼ばれないため、フロント側コメントアウトだけで自然に無効化される

## 変更対象ファイルと変更内容

### 1. `backend/src/server.ts`

| 行番号 | 変更内容 |
|--------|---------|
| 40 | `import encryptionRoutes from './routes/encryptionRoutes';` をコメントアウト |
| 41 | `import signatureRoutes from './routes/signatureRoutes';` をコメントアウト |
| 152-153 | `app.use('/api/v1/encryption', encryptionRoutes);` および前後コメントをコメントアウト |
| 154-155 | `app.use('/api/v1/signature', signatureRoutes);` および前後コメントをコメントアウト |

### 2. `frontend/src/components/project/ProjectManagement.tsx`

| 行番号 | 変更内容 |
|--------|---------|
| 33 | `import EncryptionManagementModal ...` をコメントアウト |
| 34 | `import SignatureManagementModal ...` をコメントアウト |
| 258-259 | 暗号化管理モーダル state (`encryptionModalOpen`) 宣言をコメントアウト |
| 261-262 | 電子署名管理モーダル state (`signatureModalOpen`) 宣言をコメントアウト |
| 2212-2219 | 暗号化ボタン `<Button>` 全体をコメントアウト |
| 2220-2227 | 署名ボタン `<Button>` 全体をコメントアウト |
| 2535-2542 | `{/* 暗号化管理モーダル */}` ブロック全体をコメントアウト |
| 2544-2551 | `{/* 電子署名管理モーダル */}` ブロック全体をコメントアウト |

### 3. `frontend/src/components/menus/ExperimentAdminMenu.tsx`

| 行番号 | 変更内容 |
|--------|---------|
| 11 | `KeyOutlined` import をコメントアウト（アイコン）|
| 22 | `import KeyManagementScreen from '../key-management/KeyManagementScreen';` をコメントアウト |
| 105-109 | tabItems 内タブ6「鍵管理」定義をコメントアウト |
| 204-207 | タブ6コンテンツ `<KeyManagementScreen />` div をコメントアウト |

## 実装ステップ

- [ ] **Step 1**: `docs/tasks/` に計画書作成（本ファイル）
- [ ] **Step 2**: `backend/src/server.ts` のルート登録をコメントアウト
- [ ] **Step 3**: `frontend/.../ProjectManagement.tsx` の import・state をコメントアウト
- [ ] **Step 4**: `frontend/.../ProjectManagement.tsx` のボタン・JSXをコメントアウト
- [ ] **Step 5**: `frontend/.../ExperimentAdminMenu.tsx` の import・タブ定義・コンテンツをコメントアウト
- [ ] **Step 6**: バックエンド TypeScript コンパイルチェック（`tsc --noEmit`）
- [ ] **Step 7**: フロントエンド TypeScript コンパイルチェック（`tsc --noEmit`）

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `encryptionModalOpen` / `signatureModalOpen` が他箇所で参照されていた場合コンパイルエラー | 中 | tsc で検証・追加コメントアウト対応 |
| `KeyOutlined` が ExperimentAdminMenu 内の他の場所で使われている場合 | 低 | grep で確認してから対応 |
| コメントアウト漏れで未使用 import 警告が残る | 低 | tsc --noEmit で確認 |

## テスト計画

- [ ] バックエンド `tsc --noEmit` エラー 0 件
- [ ] フロントエンド `tsc --noEmit` エラー 0 件
- [ ] 暗号化・署名ボタンが UI から消えていることを目視確認（コードレビュー）
- [ ] 鍵管理タブが ExperimentAdminMenu から消えていることを目視確認（コードレビュー）
- [ ] 他の機能（プロジェクト管理・フォーマット管理等）には影響がないこと

## 承認記録

- **計画書提示日時**: 2026-08-14 15:04
- **承認日時**: 2026-08-14 15:04（Actモードへの切り替えにより承認済み）
- **承認者コメント**: 計画書に起こしてから実装を進めて下さい

## 実施記録

### 実施日時
開始: 2026-08-14 15:04
完了: 2026-08-14 15:30

### 計画からの変更点
なし

### 発生した問題と解決方法
- フロントエンド `tsc --noEmit` で3件のエラーが検出されたが、全て今回の変更とは無関係の既存エラーであることを確認済み
  - `EncryptionManagement.tsx(278, 370)`: `Type 'number' is not assignable to type 'string'` → 呼び出される側のソースのため今回の対象外
  - `DetailModal.tsx(90)`: `Argument of type 'string | undefined'` → 名前空間機能の既存エラー

### 最終的な成果物
- [x] Step 1: 計画書作成（PLAN.md）
- [x] Step 2: `backend/src/server.ts` — encryptionRoutes・signatureRoutes の import とルート登録をコメントアウト
- [x] Step 3: `frontend/.../ProjectManagement.tsx` — EncryptionManagementModal・SignatureManagementModal の import と state をコメントアウト
- [x] Step 4: `frontend/.../ProjectManagement.tsx` — 暗号化ボタン・署名ボタン・モーダル JSX をコメントアウト
- [x] Step 5: `frontend/.../ExperimentAdminMenu.tsx` — KeyManagementScreen の import・タブ定義・コンテンツをコメントアウト
- [x] Step 6: バックエンド tsc --noEmit — 既存エラー2件のみ（今回変更と無関係）
- [x] Step 7: フロントエンド tsc --noEmit — 既存エラー3件のみ（今回変更と無関係）
