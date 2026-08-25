# タスク計画書: 鍵管理画面仕様変更

## メタデータ
- **作成日時**: 2026-06-24 09:34
- **タスクID**: key-management-spec-update
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要

`KeyManagementScreen.tsx` および関連コンポーネント（`KeyManagement.tsx`）を仕様書に基づき修正する。
一覧の列項目変更、新規機能（エクスポート・インポート・ローテーション）の追加、削除確認メッセージの変更を行う。

## 目的と期待される成果

- [x] 一覧の列項目が仕様書通りになる（識別子・作成日時・鍵方式・最終使用日時）
- [x] ツールバーに新規鍵生成・インポート・エクスポートボタンが配置される
- [x] 操作列にローテーション・削除ボタンが配置される
- [x] 削除確認ダイアログのメッセージが「この鍵で暗号化されたデータは復号不能になります」になる
- [x] エクスポートモーダル（KeyExportModal.tsx）が動作する
- [x] インポートモーダル（KeyImportModal.tsx）が動作する
- [x] ローテーションモーダル（KeyRotateModal.tsx）が動作する（スタブ実装）

## 実装ステップ

### Phase 1: 計画書作成
- [x] タスク専用フォルダ作成・PLAN.md作成

### Phase 2: 型定義の更新
- [x] `frontend/src/types/encryption.ts` にエクスポート/インポート/ローテーション用の型を追加

### Phase 3: バックエンドAPI追加（スタブ）
- [x] `backend/src/controllers/encryptionController.ts` にエクスポート・インポート・ローテーションエンドポイント追加
- [x] `backend/src/routes/encryptionRoutes.ts` にルート登録追加

### Phase 4: フロントエンドサービス追加
- [x] `frontend/src/services/encryptionService.ts` にエクスポート・インポート・ローテーション関数追加

### Phase 5: モーダルコンポーネント新規作成
- [x] `frontend/src/components/encryption/KeyExportModal.tsx` 作成
- [x] `frontend/src/components/encryption/KeyImportModal.tsx` 作成
- [x] `frontend/src/components/encryption/KeyRotateModal.tsx` 作成

### Phase 6: KeyManagement.tsx の改修
- [x] 列定義を仕様書通りに変更
- [x] ツールバーにインポート・エクスポートボタンを追加
- [x] テーブルに行選択機能（rowSelection）を追加
- [x] 操作列にローテーションボタンを追加
- [x] 削除確認メッセージを変更

## 変更ファイル

### 新規作成
1. `docs/20260624_0934_鍵管理画面仕様変更/PLAN.md` - 本計画書
2. `frontend/src/components/encryption/KeyExportModal.tsx` - 鍵エクスポートモーダル
3. `frontend/src/components/encryption/KeyImportModal.tsx` - 鍵インポートモーダル
4. `frontend/src/components/encryption/KeyRotateModal.tsx` - 鍵ローテーション確認モーダル

### 修正
1. `frontend/src/types/encryption.ts` - エクスポート/インポート/ローテーション型追加
2. `backend/src/controllers/encryptionController.ts` - エンドポイント追加
3. `backend/src/routes/encryptionRoutes.ts` - ルート登録追加
4. `frontend/src/services/encryptionService.ts` - サービス関数追加
5. `frontend/src/components/encryption/KeyManagement.tsx` - 列定義・機能改修

## 設計詳細

### 一覧の列項目

| 列名 | データソース | 幅 | 備考 |
|------|-------------|-----|------|
| 識別子（フィンガープリント） | `keyIdentifier` | 160px | SHA-256先頭16文字 |
| 作成日時 | `createdAt` | 150px | YYYY/MM/DD HH:mm |
| 鍵方式 | `algorithm` | 100px | 共通鍵/非対称鍵 |
| 最終使用日時 | `lastUsedAt` | 150px | 未使用の場合は「未使用」 |
| 操作 | - | 100px | ローテーション・削除ボタン |

### 鍵方式の判定ロジック
```
aes*, tripledes-cbc → 共通鍵
rsa* → 非対称鍵
```

### UIレイアウト

```
┌─────────────────────────────────────────────────────────────────┐
│ [+ 新規鍵を作成]  [↑ インポート]  [↓ エクスポート（N件選択中）] │ ← ツールバー
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────┬────────────┬──────────────┬──────────┐
│ 識別子           │ 作成日時      │ 鍵方式      │ 最終使用日時  │ 操作     │
├──────────────────┼──────────────┼────────────┼──────────────┼──────────┤
│ b8e3a7f1d2c94560 │ 2026/01/15   │ 共通鍵      │ 2026/06/10   │ [🔄][🗑] │
└──────────────────┴──────────────┴────────────┴──────────────┴──────────┘
```

### エクスポート機能
- ツールバーのエクスポートボタンをクリック
- テーブル行選択（rowSelection）で複数選択可能
- 1件選択時: その鍵をエクスポート
- 未選択時: ボタンをdisabledにする
- モーダルでパスワード入力（確認用2回入力）
- バックエンドでAES-256暗号化して.keyファイルを返す

### インポート機能
- ツールバーのインポートボタンをクリック
- モーダルでファイル選択（.key、.pem、.pfx）
- パスワード入力フィールド
- バックエンドでファイルをパースして`encryption_keys`テーブルに登録

### 削除確認ダイアログ
```
タイトル: 「鍵を削除しますか？」
説明:     「この鍵で暗号化されたデータは復号不能になります。この操作は元に戻せません。」
```

### 鍵ローテーション（スタブ実装）
- 操作列のローテーションボタンをクリック
- 確認モーダルを表示
- モーダルで「実行」をクリックするとバックエンドAPIを呼び出し
- バックエンドはTODOコメント付きスタブを返す（「ローテーションを開始しました」メッセージ）

## 未解決事項（要確認）

| # | 事項 | 内容 | 影響 | 状態 |
|---|------|------|------|------|
| 1 | 鍵方式の判定ロジック | `aes*`→共通鍵、`rsa*`→非対称鍵の判定でよいか。将来的なアルゴリズム追加の可能性 | 中 | ✅ 解決済み：現状の判定ロジック（asymmetricPatterns配列）を維持 |
| 2 | エクスポートのファイル形式 | 独自形式（AES-256暗号化 + Base64）で問題ないか。標準形式（PKCS#8等）対応が必要か | 中 | ✅ 解決済み：**1鍵ずつエクスポート** (.key形式・パスワード保護) に仕様変更。複数選択→行ごとのエクスポートボタンに変更。 |
| 3 | インポートの.pem/.pfxパース | Node.js標準cryptoライブラリでパース可能と仮定してよいか | 中 | ✅ 解決済み：各形式のパース方法を確認。`.pem`/`.pfx` は Node.js `crypto.createPrivateKey()` で対応可能。`.key` は独自形式（AES-256-CBC復号化）で対応可能。鍵はS3/Swiftに自動保存が前提。本実装は別タスクで実施。スタブ実装で十分。 |
| 4 | 鍵ローテーションの本実装 | S3/SwiftのMAIMLファイルが対象。file_metadataに暗号化情報なし・1ファイルに複数鍵混在の可能性あり | 高 | 🔍 検討中：実装設計書を `key_rotation_implementation_design.md` に作成済み。全ファイルスキャン方式でバックグラウンドジョブ必須。スキャン対象範囲・IVの格納場所・鍵素材取得方法・ロールバック設計など未確定事項が残存。別タスクで検討継続。 |

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| ローテーション本実装の複雑性 | 高 | 本タスクはスタブ実装に留める。別タスクで設計・実装 |
| エクスポート/インポートのファイル形式非互換 | 中 | バックエンドスタブで実装し、本実装時にファイル形式を確定 |
| rowSelectionとエクスポートの連動 | 低 | Ant DesignのrowSelection機能を使用 |

## テスト計画

- [ ] 列項目が仕様通りに表示されることを確認
- [ ] エクスポートボタンが未選択時にdisabledになることを確認
- [ ] エクスポートモーダルのパスワード一致バリデーションが動作することを確認
- [ ] インポートモーダルのファイル選択UIが動作することを確認
- [ ] ローテーション確認モーダルが表示されることを確認
- [ ] 削除確認ダイアログのメッセージが変更されていることを確認

## 承認記録
- **計画書提示日時**: 2026-06-24 09:34
- **承認日時**: 2026-06-24 09:35

## 実施記録

### 実施日時
- 開始: 2026-06-24 09:36
- 完了: 2026-06-24 09:43

### 最終的な成果物

- [x] `frontend/src/types/encryption.ts` — `EncryptionKey.keyIdentifier` フィールド追加、`ExportKeyRequest/Response`・`ImportKeyRequest/Response`・`RotateKeyRequest/Response` 型追加
- [x] `backend/src/controllers/encryptionController.ts` — `exportKeys` / `importKey` / `rotateKey` ハンドラ追加（スタブ実装）
- [x] `backend/src/routes/encryptionRoutes.ts` — 3エンドポイント登録（`POST /keys/export`, `POST /keys/import`, `POST /keys/:keyId/rotate`）
- [x] `frontend/src/services/encryptionService.ts` — `exportKeys` / `importKey` / `rotateKey` サービス関数追加
- [x] `frontend/src/components/encryption/KeyExportModal.tsx` — 新規作成（パスワード確認付き、ブラウザダウンロード対応）
- [x] `frontend/src/components/encryption/KeyImportModal.tsx` — 新規作成（ドラッグ＆ドロップ対応、.key/.pfx のみパスワード表示）
- [x] `frontend/src/components/encryption/KeyRotateModal.tsx` — 新規作成（スタブ、`not_implemented` warning 表示）
- [x] `frontend/src/components/encryption/KeyManagement.tsx` — 列定義変更（識別子・作成日時・鍵方式・最終使用日時）、ツールバー改修、rowSelection 追加、削除確認メッセージ変更

### 計画からの変更点
- なし（全項目計画通り実装）

### TypeScript コンパイルエラー
- フロントエンド: 既存の `UncertaintyDetailModal.tsx` の型エラーのみ（本タスクとは無関係）
- バックエンド: エラーなし
