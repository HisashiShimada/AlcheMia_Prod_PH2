# タスク計画書: MAIML保存エラー修正

## メタデータ
- **作成日時**: 2026-03-02 17:51
- **タスクID**: maiml-save-error-fix
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

MAIML編集画面で保存ボタンを押下した際に500 Internal Server Errorが発生する問題を修正する。

### エラー詳細
```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
AxiosError: Request failed with status code 500
```

## 2. 目的と期待される成果

### 目的
- MAIML編集画面での保存機能を正常に動作させる
- エラーの根本原因を特定し、恒久的に修正する

### 期待される成果
- [ ] バックエンドログからエラー原因を特定
- [ ] MAIML保存APIの問題箇所を修正
- [ ] 正常に保存できることを確認

## 3. 実装ステップ

### Phase 1: エラー原因の特定
- [ ] バックエンドのログファイルを確認
- [ ] MAIML保存APIのエンドポイントを特定
- [ ] エラーが発生している箇所を特定

### Phase 2: コードレビュー
- [ ] バックエンドのコントローラーを確認
- [ ] サービス層のロジックを確認
- [ ] リクエストボディの検証を確認

### Phase 3: 修正実施
- [ ] 特定した問題箇所を修正
- [ ] エラーハンドリングを改善
- [ ] バリデーションロジックを見直し

### Phase 4: 動作確認
- [ ] 修正後の動作確認
- [ ] エラーログの出力確認
- [ ] 正常系・異常系テスト

## 4. 影響範囲

### 調査対象ファイル
1. `frontend/src/services/maimlApiService.ts` - フロントエンドAPI呼び出し
2. `backend/src/routes/maimlRoutes.ts` - バックエンドルート定義
3. `backend/src/controllers/maimlController.ts` - コントローラー
4. `backend/src/services/maimlService.ts` - サービス層
5. バックエンドログファイル

### 修正予定ファイル
- エラー原因特定後に決定

## 5. 技術的詳細

### 使用する技術・ライブラリ
- Express.js (バックエンドAPI)
- Axios (フロントエンドHTTPクライアント)
- TypeScript

### 調査ポイント
- リクエストボディの構造
- バリデーションロジック
- エラーハンドリング
- ファイル保存処理

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| データ損失 | 高 | 低 | バックアップの確認 |
| 他の保存処理への影響 | 中 | 低 | 影響範囲の慎重な特定 |

## 7. テスト計画

### 手動テスト
- [ ] MAIML編集画面で保存操作
- [ ] バックエンドログの確認
- [ ] 保存後のファイル内容確認

## 8. 承認記録

- **計画書提示日時**: 2026-03-02 17:51
- **承認日時**: （承認待ち）

## 9. 実施記録

開始: 2026-03-02 17:51
完了: 2026-03-02 17:58

### 作業ログ

#### Phase 1: エラー原因の特定（完了）
- [x] フロントエンド `maimlApiService.ts` の `saveMaiml` メソッドを確認
  - `POST /maiml/save` に `{ fileKey, content, archive }` を送信
- [x] バックエンド `maimlRoutes.ts` のルート定義を確認
  - バリデーションで `content` と `archive` のみ定義
  - **`fileKey` のバリデーションが欠落していることを発見**
- [x] バックエンド `maimlController.ts` のコントローラーを確認
  - `save` 関数で `fileKey` を使用しているが、バリデーションで受け取れていない

#### Phase 2: 根本原因の特定（完了）
**問題の原因:**
1. フロントエンドは `fileKey` をリクエストボディに含めて送信
2. バックエンドのバリデーションで `fileKey` が定義されていない
3. バリデーションエラーまたはコントローラーで `undefined` になり500エラー

#### Phase 3: 修正実施（完了）
- [x] `backend/src/routes/maimlRoutes.ts` の `/save` ルートを修正
  - `body('fileKey')` のバリデーションを追加
  - 必須パラメータとして定義

```typescript
body('fileKey')
  .notEmpty()
  .withMessage('fileKeyは必須です')
  .isString()
  .withMessage('fileKeyは文字列である必要があります'),
```

### 修正内容

#### 修正ファイル
- `backend/src/routes/maimlRoutes.ts`

#### 変更内容
- `/save` エンドポイントのバリデーションに `fileKey` を追加
- `fileKey` を必須の文字列パラメータとして定義

### エラー原因の詳細調査結果

#### fileKey情報
- **fileKey**: `a0718dc5-21f3-44e6-87e9-cc2ae83f3385/formats/DEP004/maiml_1/EditTEST.maiml`
- **ファイル種別**: フォーマットファイル（`formats/`配下）

#### 問題箇所
`backend/src/services/maimlService.ts` の `saveMaiML` 関数（197-260行目付近）

#### 問題の詳細
1. すべてのMAIMLファイル保存時に`project_maiml_flg`更新処理を実行
2. フォーマットファイルには`projects/`が含まれない
3. `projectsIndex`が`-1`になる
4. エラーをthrow → 500エラー

#### 修正実施（完了）
- [x] `backend/src/services/maimlService.ts`の`saveMaiML`関数を修正
  - プロジェクト更新処理を**プロジェクトファイルの場合のみ**実行
  - `fileKey.includes('/projects/')`で条件分岐
  - フォーマットファイルの場合は`project_maiml_flg`更新をスキップ

**修正内容:**
```typescript
// project_maiml_flgをtrueに更新（プロジェクトファイルの場合のみ）
if (fileKey.includes('/projects/')) {
  // 既存のプロジェクト更新処理
} else {
  // フォーマットファイルの場合はスキップ
  console.log('ℹ️ [MAIML Save] フォーマットファイルのためproject_maiml_flg更新をスキップ');
}
```

### 修正完了サマリー

#### 修正したファイル
1. `backend/src/routes/maimlRoutes.ts` - fileKeyバリデーション追加
2. `backend/src/services/maimlService.ts` - プロジェクトファイルのみproject_maiml_flg更新

#### 修正内容
1. **第1の修正**: ルートバリデーション
   - `POST /maiml/save`に`fileKey`バリデーションを追加
   
2. **第2の修正**: ファイル種別判定
   - プロジェクトファイル（`projects/`配下）のみ`project_maiml_flg`を更新
   - フォーマットファイル（`formats/`配下）は更新をスキップ

### 次のステップ（ユーザーによる手動作業）

#### 1. バックエンド再起動
```bash
# Dockerコンテナの再起動
docker-compose restart backend

# または
docker restart mmdpf-backend-1
```

#### 2. 動作確認
1. MAIML編集画面を開く
2. 編集を行う
3. 保存ボタンをクリック
4. エラーが発生しないことを確認
5. ファイルが正常に保存されることを確認

#### 3. 確認ポイント
- [ ] 500エラーが発生しない
- [ ] フロントエンドで「保存成功」のメッセージが表示される
- [ ] バックエンドログに保存成功ログが出力される
- [ ] S3/Swiftにファイルが保存される
- [ ] アーカイブが作成される（archive=true の場合）
