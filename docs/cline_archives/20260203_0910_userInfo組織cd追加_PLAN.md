# タスク計画書: userInfo組織cd追加

## メタデータ
- **作成日時**: 2026-02-03 09:10
- **タスクID**: userInfo組織cd追加
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

SessionStorageに保存しているKey:userInfoに組織cd（organization_cd）を含めるようにする。

## 2. 目的と期待される成果

### 目的
- フロントエンドで組織cdを参照できるようにする
- ログイン後に組織cdを使用した処理を可能にする

### 期待される成果
- [x] バックエンドの型定義にorganization_cdを追加
- [ ] フロントエンドの型定義にorganizationCdを追加
- [ ] バックエンドのverify-pin APIレスポンスにorganization_cdを含める
- [ ] フロントエンドでsessionStorageに保存する際にorganizationCdを含める
- [ ] 動作確認

## 3. 実装ステップ

### Phase 1: 型定義の更新
- [ ] backend/src/types/auth.ts の UserInfo型にorganizationCd: stringを追加
- [ ] frontend/src/types/auth.ts の User型にorganizationCd: stringを追加
- [ ] frontend/src/types/api.ts の VerifyPinResponseData型のuserにorganizationCdを追加

### Phase 2: バックエンドAPI実装
- [ ] backend/src/controllers/authController.ts のverifyPin関数を確認
- [ ] データベースクエリでorganizationテーブルからorganization_cdを取得
- [ ] レスポンスにorganizationCdを含める

### Phase 3: フロントエンド実装
- [ ] frontend/src/app/page.tsx のhandlePinVerify関数でorganizationCdを保存
- [ ] sessionStorage.setItem('userInfo', ...)にorganizationCdが含まれることを確認

### Phase 4: 動作確認
- [ ] ログイン→PIN入力→SessionStorageを確認
- [ ] userInfoにorganizationCdが含まれることを確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/types/auth.ts` - UserInfo型にorganizationCdを追加
2. `frontend/src/types/auth.ts` - User型にorganizationCdを追加
3. `frontend/src/types/api.ts` - VerifyPinResponseData型を更新
4. `backend/src/controllers/authController.ts` - verify-pin APIレスポンスにorganizationCdを追加
5. `frontend/src/app/page.tsx` - userInfo保存時にorganizationCdを含める

### 影響を受ける機能
- ログイン機能（PIN検証後のSessionStorage保存処理）
- 組織cdを使用する全ての画面（今後の実装で利用可能になる）

## 5. 技術的詳細

### 使用する技術・ライブラリ
- TypeScript: 型定義の追加
- SessionStorage: フロントエンドでの保存
- PostgreSQL: organizationテーブルからorganization_cdを取得

### データベース構造
```sql
-- organizationテーブルにはorganization_cdカラムが存在
SELECT organization_cd FROM organization WHERE id = $1
```

### SessionStorageの保存形式
```typescript
{
  id: string;
  username: string;
  email: string;
  role: UserRole;
  roleCd: string;
  organizationId: string;
  organizationName: string;
  organizationCd: string;  // 追加
  displayName: string;
  departmentCd: string;
  initialScreenFunctionCd: string;
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| organizationテーブルにorganization_cdが存在しない | 高 | 低 | データベース構造を事前確認 |
| 既存のuserInfo参照箇所でエラー | 中 | 低 | TypeScriptの型チェックで検出 |
| SessionStorageのサイズ増加 | 低 | 低 | 文字列1フィールド追加のみなので影響なし |

## 7. テスト計画

### 手動テスト
- [ ] ログイン画面でユーザー名・パスワード入力
- [ ] PIN入力画面でPINコードを入力
- [ ] ブラウザの開発者ツールでSessionStorageを確認
- [ ] userInfoキーにorganizationCdが含まれることを確認
- [ ] 値が正しく設定されていることを確認

## 8. ロールバック計画

変更は型定義とデータ取得のみなので、リスクは低い。
問題が発生した場合は、以下の手順でロールバック：
1. Gitで変更をrevert
2. フロントエンド・バックエンドを再起動

## 9. 関連ドキュメント

- [docs/20260202_1334_ログイン時UserInfo保存_PLAN.md](20260202_1334_ログイン時UserInfo保存_PLAN.md)
- [docs/20260202_1458_ログイン時部門CD保存_検討と実装_PLAN.md](20260202_1458_ログイン時部門CD保存_検討と実装_PLAN.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-03 09:10
- **承認日時**: （承認待ち）
- **承認者コメント**: （承認後記入）

## 11. 実施記録

### 実施日時
開始: （作業開始時記入）
完了: （作業完了時記入）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）

### 最終的な成果物
（完了後記録）
