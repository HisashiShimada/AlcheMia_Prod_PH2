# タスク計画書: MAIMLアップロード重複チェック実装

## メタデータ
- **作成日時**: 2026-04-14 14:45
- **タスクID**: maiml-upload-duplicate-check
- **優先度**: 高
- **推定工数**: 1〜2時間

## タスク概要

チャンクアップロード（`initChunkUpload`）において、MAIMLファイルの重複アップロードを防ぐ2つのチェックが実装されていない。

### 追加が必要なチェック

1. **バッチ内複数MAIMLチェック**  
   同一バッチで複数の `.maiml` ファイルがアップロードされた場合はエラー

2. **既存MAIMLプロジェクトへの上書きチェック**  
   対象プロジェクトが既にMAIMLファイルを持っている場合（`project_maiml_flg = true`）はエラー

### 併せて削除するチェック

- 現在 `initChunkUpload` にある「ファイル名 = プロジェクト名」チェックは廃止（ユーザー確認済み）

---

## 実装方針の比較（フロントエンド vs バックエンド）

| 観点 | フロントエンド実装 | バックエンド実装 |
|------|-------------------|-----------------|
| ユーザー体験 | ✅ 即時フィードバック（アップロード前に警告） | ⚠️ チャンク送信完了後にエラーが判明 |
| 安全性 | ❌ クライアント側なので回避可能 | ✅ サーバー側で必ず防げる |
| 実装コスト | 中（BulkUploadDialog の onChange に追加） | 中（initChunkUpload に DB アクセス追加） |
| 「既存MAIML持ちプロジェクトへの上書き」 | ❌ フロントは project_maiml_flg を知らない（API呼び出しが必要） | ✅ DBアクセスで直接確認可能 |
| 「バッチ内複数MAIML」 | ✅ ファイル選択時点でローカル判定可能 | ✅ batchId でセッションを追跡して判定可能 |

### 推奨方針

**バックエンドとフロントエンドの両方に実装（多層防御）**

| チェック | 実装場所 | 理由 |
|---------|---------|------|
| バッチ内複数MAIML | **フロントエンド（優先）+ バックエンド（保険）** | フロントはファイル選択時点で検知できる。バックエンドはフォールバック。 |
| 既存MAIMLプロジェクトへの上書き | **バックエンドのみ** | `project_maiml_flg` の状態はサーバー側にしかない。フロントで事前取得も可能だが、競合状態が解消できない。 |

---

## 実装ステップ

### Phase 1: バックエンド実装（`initChunkUpload`）

- [ ] 「ファイル名 = プロジェクト名」チェックを**削除**
- [ ] **既存MAIMLプロジェクトへの上書きチェック**を追加
  - `projects/` パスへ `.maiml` ファイルをアップロードする場合
  - `archive/` 配下は除外（上書きではなくアーカイブ）
  - `projectRepository.findByName()` でプロジェクトを取得
  - `project_maiml_flg === true` の場合は `400` エラー
- [ ] **バッチ内複数MAIMLチェック**を追加（バックエンド保険）
  - `ChunkSession` に `batchId` フィールドを追加
  - `sessions` マップを走査して同一 `batchId` 内に `.maiml` セッションが既にあればエラー
  - `initChunkUpload` リクエストの `batchId` を `initSession()` に渡す

### Phase 2: フロントエンド実装（`BulkUploadDialog`）

- [ ] **バッチ内複数MAIMLチェック**を追加
  - `handleFileChange` / `handleFolderSelect` にチェックを追加
  - `.maiml` ファイルが2つ以上選択された場合、`message.error()` を表示してアップロードボタンを無効化
  - エラー表示: `「MAIMLファイルは1回のアップロードに1件のみ選択できます」`

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/chunkUploadService.ts` | `ChunkSession` に `batchId` 追加、`initSession()` の引数に `batchId` 追加、`hasMaimlInBatch()` メソッド追加 |
| `backend/src/controllers/fileAccessController.ts` | `initChunkUpload` のチェックロジックを修正（旧チェック削除・新チェック2件追加） |
| `frontend/src/components/project/BulkUploadDialog.tsx` | `handleFileChange` / `handleFolderSelect` に複数MAIMLチェック追加 |

---

## エラーレスポンス仕様

### バッチ内複数MAIMLエラー
```json
{
  "success": false,
  "error": {
    "code": "E1003",
    "message": "1回のアップロードにMAIMLファイルは1件のみ指定できます"
  }
}
```

### 既存MAIMLプロジェクトへの上書きエラー
```json
{
  "success": false,
  "error": {
    "code": "E7005",
    "message": "このプロジェクトには既にMAIMLファイルが登録されています。上書きする場合はプロジェクトの更新機能を使用してください"
  }
}
```

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `sessions` マップへの batchId 追加により、既存のセッション初期化ロジックが変わる | 低 | `batchId` は optional フィールドとして追加（後方互換） |
| フロントのチェックがアップロード前にしかかからず、API直叩きでは素通りする | 中 | バックエンドにも保険チェックを実装 |

---

## 承認記録
- **計画書提示日時**: 2026-04-14 14:45
- **承認日時**: （承認後記入）
