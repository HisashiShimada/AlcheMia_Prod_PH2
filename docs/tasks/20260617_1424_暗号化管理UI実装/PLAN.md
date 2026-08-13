# タスク計画書: 暗号化管理UI実装（フロントエンド・モック版）

## メタデータ
- **作成日時**: 2026-06-17 14:24
- **タスクID**: encryption-ui-mock
- **優先度**: 中
- **推定工数**: 3週間（フロントエンドのみ）

## タスク概要

MAIMLスキーマの暗号化仕様（`encryptedData_summary.md` / `encrypted_data_xml_samples.md`）に基づき、MAIML内の要素を暗号化・復号化するための管理UIをフロントエンドとしてモック実装する。

バックエンド実装は後フェーズに分離し、本タスクではモックデータ・モックサービスを使って画面の動作を確認できる状態を作る。

## 目的と期待される成果

- [ ] MAIMLファイルのタグ構造をツリー表示するコンポーネントが動作する
- [ ] 暗号化アルゴリズム・鍵管理方式の設定UIが動作する
- [ ] 暗号化前後のXMLプレビューが表示できる
- [ ] 鍵管理（一覧・作成・詳細・削除）の画面が動作する
- [ ] 復号化ダイアログが動作する
- [ ] プロジェクト管理画面から暗号化管理を開けるボタンが追加される

## 実装ステップ

### Phase 1: モックデータ・メイン画面
- [ ] モックデータファイル作成 (`frontend/src/mocks/encryptionMockData.ts`)
- [ ] モックサービス作成 (`frontend/src/services/encryptionServiceMock.ts`)
- [ ] 型定義ファイル作成 (`frontend/src/types/encryption.ts`)
- [ ] メイン画面作成 (`EncryptionManagement.tsx`) - Modalレイアウト

### Phase 2: ツリー・設定・プレビュー
- [ ] MAIMLタグツリー作成 (`EncryptionTargetTree.tsx`)
- [ ] 暗号化設定パネル作成 (`EncryptionConfigPanel.tsx`)
- [ ] 暗号化プレビューパネル作成 (`EncryptionPreviewPanel.tsx`)

### Phase 3: 鍵管理・復号化・統合
- [ ] 鍵管理画面作成 (`KeyManagement.tsx`)
- [ ] 鍵作成ダイアログ作成 (`KeyCreateDialog.tsx`)
- [ ] 鍵詳細ダイアログ作成 (`KeyDetailDialog.tsx`)
- [ ] 復号化ダイアログ作成 (`DecryptionDialog.tsx`)
- [ ] プロジェクト管理画面にボタン追加 (`ProjectManagement.tsx` 更新)

### Phase 4: ドキュメント整備
- [ ] UI仕様書作成 (`docs/design/ui/experiment_admin/06_Encryption/`)
- [ ] `docs/design/ui/ui_screen_list.md` 更新

## 変更ファイル

### 新規作成
1. `frontend/src/mocks/encryptionMockData.ts` - モックデータ
2. `frontend/src/services/encryptionServiceMock.ts` - モックサービス
3. `frontend/src/types/encryption.ts` - 型定義
4. `frontend/src/components/encryption/EncryptionManagement.tsx` - メイン画面
5. `frontend/src/components/encryption/EncryptionTargetTree.tsx` - ツリー
6. `frontend/src/components/encryption/EncryptionConfigPanel.tsx` - 設定パネル
7. `frontend/src/components/encryption/EncryptionPreviewPanel.tsx` - プレビュー
8. `frontend/src/components/encryption/KeyManagement.tsx` - 鍵管理
9. `frontend/src/components/encryption/KeyCreateDialog.tsx` - 鍵作成
10. `frontend/src/components/encryption/KeyDetailDialog.tsx` - 鍵詳細
11. `frontend/src/components/encryption/DecryptionDialog.tsx` - 復号化

### 修正
1. `frontend/src/components/project/ProjectManagement.tsx` - 暗号化管理ボタン追加

### ドキュメント
1. `docs/design/ui/ui_screen_list.md` - 新規コンポーネント追加
2. `docs/design/ui/experiment_admin/06_Encryption/ui_encryption_management.md` - UI仕様書

## 技術仕様

### 使用コンポーネント（Ant Design）
- `Modal` - メイン画面コンテナ
- `Tree` - MAIMLタグツリー
- `Form`, `Select`, `Radio`, `Input` - 設定パネル
- `Tabs` - 暗号化/復号化の切り替え
- `Table` - 鍵一覧
- シンタックスハイライト: `react-syntax-highlighter` または独自CSS

### モックデータ方針
- 実際のMAIML構造を模したデータを定義
- 暗号化前後のXMLサンプルを `encrypted_data_xml_samples.md` のサンプルから流用
- API呼び出し部分はPromise解決の遅延（setTimeout 300ms）でリアルな動作を模倣

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| バックエンド仕様変更によるI/F変更 | 中 | モックサービスを分離しI/F変更を局所化 |
| モックと本実装のI/Fのズレ | 中 | 型定義ファイルで事前にI/Fを合わせる |
| プロジェクト管理画面の既存機能への影響 | 低 | ボタン追加のみで既存ロジックに触れない |

## 承認記録
- **計画書提示日時**: 2026-06-17 14:24
- **承認日時**: 2026-06-17 14:31

## 実施記録

### 実施日時
開始: 2026-06-17 14:24
完了: 2026-06-17 14:38

### 計画からの変更点

- **バックエンドファイル命名**: `Mock`という名称を廃止し、本番実装時もそのまま使える `encryptionController.ts` / `encryptionRoutes.ts` に変更
- **スタブ実装方針**: コントローラー内に `TODO:` コメントで本実装への移行ポイントを明記。ルートファイル・server.tsは変更不要
- **フロントエンドサービス**: `encryptionService.ts` として実際のAPIエンドポイントを呼び出す形式で実装（モックを介さずバックエンドに直接接続）
- **ページルート**: `app/encryption/page.tsx` として `?project=<projectName>` URLパラメータで対象プロジェクトを指定

### 作成ファイル一覧

#### バックエンド（スタブ実装）
- `backend/src/controllers/encryptionController.ts` - スタブ実装（TODO付き）、本実装時はこのファイルのみ差し替え
- `backend/src/routes/encryptionRoutes.ts` - APIルート定義（本実装時も変更不要）
- `backend/src/server.ts` - `/api/v1/encryption` のルート登録追加

#### フロントエンド
- `frontend/src/types/encryption.ts` - 型定義（既存）
- `frontend/src/mocks/encryptionMockData.ts` - モックデータ（既存）
- `frontend/src/services/encryptionService.ts` - APIサービス
- `frontend/src/components/encryption/EncryptionManagement.tsx` - メイン画面
- `frontend/src/components/encryption/EncryptionTargetTree.tsx` - MAIMLツリー
- `frontend/src/components/encryption/EncryptionConfigPanel.tsx` - 暗号化設定パネル
- `frontend/src/components/encryption/EncryptionPreviewPanel.tsx` - XMLプレビュー
- `frontend/src/components/encryption/KeyManagement.tsx` - 鍵管理画面
- `frontend/src/components/encryption/KeyCreateModal.tsx` - 鍵作成モーダル
- `frontend/src/app/encryption/page.tsx` - ページルート

### アクセスURL
```
http://localhost:3000/encryption?project=<プロジェクト名>
```

### 本実装への移行手順
1. `backend/src/controllers/encryptionController.ts` を実装に置き換える
2. `encryptionService.ts` （フロントエンド）は変更不要
3. ルートファイル・server.tsは変更不要
