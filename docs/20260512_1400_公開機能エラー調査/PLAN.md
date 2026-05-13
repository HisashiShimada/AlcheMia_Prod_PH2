# タスク計画書: 公開機能エラーメッセージ改善

## メタデータ
- **作成日時**: 2026-05-13 09:22
- **タスクID**: 公開機能エラーメッセージ改善
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

調査報告（`docs/20260512_1400_公開機能エラー調査/調査報告.md`）の「修正案」に基づき、
権限不足ユーザーが公開ボタンを押した際に表示される「システムエラーが発生しました」を、
適切な権限不足メッセージに改善する。

## 目的と期待される成果

### 目的
- 実験管理の読取専用ユーザーが公開ボタンを押した際に「システムエラーが発生しました」と表示されるのを解消する
- ユーザーが何をすべきか（誰に権限付与を依頼すべきか）を理解できる適切なメッセージを表示する

### 期待される成果
- [x] `permissionCheckMiddleware.ts` が E5xxx 形式のエラーコードを返す
- [x] `ja.json` の `maimlPublish.errors` に E5012 / E5015 が追加され、適切な日本語メッセージが表示される
- [x] `en.json` の `maimlPublish.errors` に E5012 / E5015 / E7010 が追加され、適切な英語メッセージが表示される

## 実装ステップ

### Phase 1: バックエンド修正
- [ ] `backend/src/middleware/permissionCheckMiddleware.ts` の `PERMISSION_DENIED` を `E5012` に変更（3箇所）
- [ ] `backend/src/middleware/permissionCheckMiddleware.ts` の `INSUFFICIENT_PERMISSION` を `E5015` に変更（1箇所）

### Phase 2: フロントエンド修正（ロケールファイル）
- [ ] `frontend/src/locales/ja.json` の `maimlPublish.errors` に `E5012` / `E5015` を昇順で追加
- [ ] `frontend/src/locales/en.json` の `maimlPublish.errors` に `E5012` / `E5015` / `E7010` を昇順で追加

## 変更ファイル

| ファイル | 変更内容 | 変更量 |
|---|---|---|
| `backend/src/middleware/permissionCheckMiddleware.ts` | `PERMISSION_DENIED`→`E5012`（3箇所）、`INSUFFICIENT_PERMISSION`→`E5015`（1箇所） | 4行 |
| `frontend/src/locales/ja.json` | `maimlPublish.errors` に `E5012`・`E5015` を昇順で追加 | 2行 |
| `frontend/src/locales/en.json` | `maimlPublish.errors` に `E5012`・`E5015`・`E7010` を昇順で追加 | 3行 |

## 変更内容の詳細

### permissionCheckMiddleware.ts

**変更前 → 変更後 の対応表**

| 変更前コード | 変更後コード | 発生条件 | 行番号 |
|---|---|---|---|
| `PERMISSION_DENIED` | `E5012` | functionId が JWT に存在しない | 68行、144行、202行 |
| `INSUFFICIENT_PERMISSION` | `E5015` | permission が必要レベル未満 | 83行 |

### ja.json（maimlPublish.errors セクション）

```json
// 変更後（昇順）
"errors": {
  "E5012": "公開操作には実験管理の書込権限が必要です",
  "E5015": "公開操作には実験管理の書込権限が必要です",
  "E6001": "プロジェクトが見つかりません",
  "E6002": "MAIMLファイルが存在しません",
  "E7002": "プロジェクトがチェックアウトされていません",
  "E7005": "プロジェクトステータスがタスク結果レビュー待ちではありません",
  "E7010": "完了・異常終了以外のタスクが残っています",
  "E7011": "公開処理がすでに進行中です",
  "E4001": "システムエラーが発生しました"
}
```

### en.json（maimlPublish.errors セクション）

```json
// 変更後（昇順、E7010 も追加）
"errors": {
  "E5012": "Write permission for Experiment Management is required to publish",
  "E5015": "Write permission for Experiment Management is required to publish",
  "E6001": "Project not found",
  "E6002": "MAIML file does not exist",
  "E7002": "Project is not checked out",
  "E7005": "Project status is not awaiting task review",
  "E7010": "There are tasks that are not completed or abnormally terminated",
  "E7011": "Publish process is already in progress",
  "E4001": "A system error occurred"
}
```

## 影響範囲

### 影響を受ける機能
- プロジェクト管理の「公開」ボタン押下時のエラー表示
- `permissionCheckMiddleware` を使用するすべての API エンドポイント（エラーコード形式の変更のみ。既存の挙動変化なし）

### 影響を受けないもの
- フォールバック動作（E4001）は変更なし
- 公開ボタンの活性/非活性制御は変更なし（別タスクとして対応余地あり）

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| `permissionCheckMiddleware` を利用する他エンドポイントへの影響 | 低 | 低 | エラーコード文字列の変更のみ。クライアントが `PERMISSION_DENIED` / `INSUFFICIENT_PERMISSION` 文字列に依存していないことを確認済み（MaimlPublishDialog はコード → ロケールキー変換方式） |
| en.json に E7010 が存在しない状態のまま | 低 | 確定 | 本修正で同時対応 |

## テスト計画

### 手動テスト
- [ ] 実験管理：読取専用ユーザー（permission=0）でログインし、公開ボタンを押下
  - 期待: 「公開できません　公開操作には実験管理の書込権限が必要です」が表示される
- [ ] 実験管理：書込可ユーザー（permission=1）でログインし、公開ボタンを押下
  - 期待: 正常に公開ダイアログが動作する（エラーなし）

## 承認記録

- **計画書提示日時**: 2026-05-13 09:22
- **承認日時**: ※承認後に記入
- **承認者コメント**: ※承認後に記入
