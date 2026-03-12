# UI仕様書: MaiML公開管理（OpenData Pipeline）

**作成日**: 2026-03-10  
**最終更新**: 2026-03-10  
**バージョン**: 1.0.0  
**対象ロール**: experiment_admin  
**実装状況**: バックエンド実装済み、フロントエンド未実装

---

## 📋 概要

MaiML ファイルを OpenData Pipeline に登録・公開・非公開にする操作を行う UI コンポーネント群。  
プロジェクト管理画面またはファイル一覧画面に組み込むボタン＋ダイアログとして実装する。

---

## 🎯 画面構成

### 公開ボタン（インライン配置）

既存のプロジェクト一覧またはファイル一覧の行アクションに「公開」ボタンを追加する。

```
[プロジェクト名]  [ビューア] [編集] [公開 / 公開済み]
```

| 状態 | ボタン表示 | ボタン色 |
|------|-----------|---------|
| 未公開 | 公開 | プライマリ（青） |
| 公開中 | 公開済み | 緑（disabled） |
| 処理中 | 処理中... | グレー（disabled） |

---

## 🖥️ コンポーネント構成

```
MaimlPublishButton
  └─ MaimlPublishDialog（公開確認ダイアログ）
       ├─ PublishOptions（公開オプションフォーム）
       └─ PublishResult（完了結果表示）

MaimlUnpublishButton
  └─ MaimlUnpublishConfirmDialog（非公開確認ダイアログ）
```

---

## 📐 MaimlPublishDialog 仕様

### 概要

MaiML ファイルを公開する際の確認・オプション設定ダイアログ。

### トリガー

ファイル一覧行の「公開」ボタンクリック

### ダイアログ仕様

**タイトル**: MaiML を公開する

**サイズ**: 幅 520px

**フォーム項目**:

| 項目名 | 入力種別 | デフォルト | 必須 | 説明 |
|-------|---------|----------|------|------|
| プレビューモード | セレクト | uniform | ✅ | `uniform` / `maxhold` / `mmr` |
| 生データを保存する | チェックボックス | OFF | ❌ | `store_raw_series=true` に対応 |
| 非公開時も生データを保持 | チェックボックス | OFF | ❌ | `keep_raw_on_unpublish=true`（生データ保存ON時のみ表示） |
| データ保持期限 | 日付ピッカー | （なし） | ❌ | `retention_until`。空欄は無期限 |

**ボタン**:
- キャンセル（モーダルを閉じる）
- 公開する（API 呼び出し → 完了表示）

### 公開完了表示

公開成功後、ダイアログ内に結果サマリーを表示する。

```
✅ 公開が完了しました

ドキュメント名: XRF Analysis - Iron alloy
条件KV:     42 件
材料KV:     15 件
プレビュー:   3 件

[閉じる]
```

### エラー表示

公開失敗時は Ant Design の `Alert` コンポーネントで表示する。

```
⚠️ 公開処理中にエラーが発生しました
（エラーメッセージ）
```

---

## 📐 MaimlUnpublishConfirmDialog 仕様

### 概要

公開済み MaiML ファイルを非公開にする確認ダイアログ。

### トリガー

公開済みファイルの「公開済み」ボタンクリック → ドロップダウンから「非公開にする」選択

### ダイアログ仕様

**タイトル**: 公開を取り消しますか？

**サイズ**: 幅 440px

**本文**:
```
「{ドキュメント名}」の公開を取り消します。
公開後に収集されたKV・プレビューデータは削除されます。

削除モード:
○ データを削除（メタデータは保持） [デフォルト]
○ すべて削除
```

**ボタン**:
- キャンセル
- 非公開にする（危険操作 → 赤ボタン）

---

## 🔌 API 連携

| 操作 | API | 詳細仕様 |
|------|-----|---------|
| 公開 | `POST /api/v1/maiml-opendata/publish` | [api_maiml_opendata.md](../../api/api_maiml_opendata.md) API #1 |
| 非公開 | `DELETE /api/v1/maiml-opendata/unpublish/:assetId` | [api_maiml_opendata.md](../../api/api_maiml_opendata.md) API #2 |
| 状態取得 | `GET /api/v1/maiml-opendata/status` | [api_maiml_opendata.md](../../api/api_maiml_opendata.md) API #3 |

### 公開状態の初期ロード

ファイル一覧表示時に `GET /api/v1/maiml-opendata/status?file_uri={file_uri}` を呼び出し、ボタン状態を初期化する。

---

## 🗂️ 実装ファイル（フロントエンド・未実装）

| ファイル | 種別 | 説明 |
|---------|------|------|
| `frontend/src/components/maimlPublish/MaimlPublishButton.tsx` | コンポーネント | 公開ボタン（状態管理含む） |
| `frontend/src/components/maimlPublish/MaimlPublishDialog.tsx` | コンポーネント | 公開オプション設定ダイアログ |
| `frontend/src/components/maimlPublish/MaimlUnpublishConfirmDialog.tsx` | コンポーネント | 非公開確認ダイアログ |
| `frontend/src/services/maimlOpenDataService.ts` | サービス | API 呼び出し関数 |
| `frontend/src/types/maimlOpenData.ts` | 型定義 | リクエスト・レスポンス型 |

---

## 🔐 権限制御

| ロール | 公開ボタン表示 | 非公開ボタン表示 |
|-------|--------------|---------------|
| experiment_admin | ✅ 表示 | ✅ 表示 |
| system_admin | ✅ 表示 | ✅ 表示 |
| その他 | ❌ 非表示 | ❌ 非表示 |

フロントエンドでは `req.user.role` を確認してボタンの表示/非表示を制御すること。  
バックエンド側でも `authMiddleware` により二重チェックを行う。

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.1 | 2026-03-11 | 実装状況を確認（フロントエンド未実装のため仕様書をそのまま維持） | Cline |
| 1.0.0 | 2026-03-10 | 初版作成（バックエンド実装完了に伴い UI 仕様を策定） | Cline |
