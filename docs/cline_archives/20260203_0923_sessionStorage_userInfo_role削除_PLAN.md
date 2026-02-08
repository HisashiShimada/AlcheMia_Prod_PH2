# タスク計画書: sessionStorage userInfo role削除

## メタデータ
- **作成日時**: 2026-02-03 09:23
- **タスクID**: sessionStorage_userInfo_role削除
- **優先度**: 中
- **推定工数**: 0.5時間

## 1. タスク概要

session storageに保存しているKey:userInfoにroleが含まれているが、不要なので削除する。

## 2. 目的と期待される成果

### 目的
- userInfoに不要なroleプロパティが含まれているため、これを削除してデータ構造をシンプルにする
- role情報は別途管理されているため、userInfoに含める必要がない

### 期待される成果
- [x] userInfoの型定義からroleを削除
- [x] session storage保存時にroleを含めない
- [x] role削除後も既存機能が正常に動作する

## 3. 実装ステップ

### Phase 1: 現状調査
- [x] session storageのuserInfo保存箇所を特定
- [x] userInfoの型定義を確認
- [x] roleが使用されている箇所を確認

### Phase 2: 型定義の修正
- [ ] `frontend/src/types/auth.ts`のUserInfo型からroleを削除

### Phase 3: 保存処理の修正
- [ ] authServiceでのuserInfo保存処理を確認・修正

### Phase 4: 影響確認とテスト
- [ ] roleを使用している箇所がないか確認
- [ ] ログイン機能の動作確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/types/auth.ts` - UserInfo型定義からrole削除
2. `frontend/src/services/authService.ts` - 保存処理確認（必要に応じて修正）

### 影響を受ける機能
- ログイン機能: session storage保存処理

## 5. 技術的詳細

### 現状のuserInfo構造（推測）
```typescript
interface UserInfo {
  userId: string;
  userName: string;
  role?: string; // 削除対象
  organizationId: string;
  // その他のプロパティ
}
```

### 修正後のuserInfo構造
```typescript
interface UserInfo {
  userId: string;
  userName: string;
  organizationId: string;
  // その他のプロパティ（roleは削除）
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| roleを参照している箇所が残っている | 中 | 低 | 全ファイル検索で使用箇所を確認 |
| 既存のsession storageデータとの互換性 | 低 | 中 | 既存データは読み込み時に無視される（問題なし） |

## 7. テスト計画

### 手動テスト
- [ ] ログイン実行
- [ ] session storageのuserInfo内容確認（roleが含まれていないこと）
- [ ] ログイン後の画面遷移が正常に動作すること

## 8. 承認記録

- **計画書提示日時**: 2026-02-03 09:23
- **承認日時**: （承認待ち）

## 9. 実施記録

### 実施日時
開始: 2026-02-03 09:23
完了: 2026-02-03 09:38

### 計画からの変更点
**元のタスク**: session storageのuserInfoから`role`を削除
**実際の実装**: `role`を`roleName`にリネームし、roleテーブルの`role_name`カラムから取得するように変更

**理由**: ユーザーからの要望により、`role`プロパティを完全に削除するのではなく、より適切な名前（`roleName`）にリネームし、roleテーブルから正しい値を取得することになった

### 実施内容

#### 1. バックエンド型定義修正
- ファイル: `backend/src/types/auth.ts`
- 変更: `role: UserRole` → `roleName: UserRole`
- コメント: roleテーブルのrole_nameカラムから取得

#### 2. pinCodeService修正
- ファイル: `backend/src/services/pinCodeService.ts`
- 変更: 
  - roleテーブルをJOINして`role_name`を取得
  - `role: row.role_cd` → `roleName: row.role_name`
- SQL: `INNER JOIN role r ON ou.role_cd = r.role_cd AND ou.organization_id = r.organization_id`

#### 3. authController修正
- ファイル: `backend/src/controllers/authController.ts`
- 変更:
  - JWT生成: `role: userInfo.role` → `role: userInfo.roleName`
  - レスポンス: `role: userInfo.role` → `roleName: userInfo.roleName`

#### 4. フロントエンド型定義修正
- ファイル: `frontend/src/types/auth.ts`
- 変更: `role: UserRole` → `roleName: string`
- 理由: DBから取得する文字列値のため`string`型を使用

#### 5. page.tsx修正
- ファイル: `frontend/src/app/page.tsx`
- 変更: demoUsersの`role`を`roleName`に変更

### 最終的な成果物
- [x] バックエンド型定義からroleを削除し、roleNameを追加
- [x] roleテーブルからrole_nameを取得するようにSQLを修正
- [x] authControllerでroleNameを使用するように修正
- [x] フロントエンド型定義でroleNameを使用するように修正
- [x] page.tsxのdemoUsersを修正
- [x] TypeScriptのコンパイルエラーをすべて解消

### 動作確認項目
- [x] ログイン実行
- [x] PINコード検証実行
- [x] session storageのuserInfo確認（`roleName`が含まれ、`role`が削除されていること）
- [x] メニュー表示が正常に動作すること
- [x] ヘッダーのロール表示確認（undefinedが解消されたこと）

### 追加修正（ロール表示問題対応）

#### 7. Header.tsx修正
- ファイル: `frontend/src/components/common/Header.tsx`
- 変更: `user.role` → `user.roleName`
- 理由: ログイン後のヘッダーにロール名を表示する際、undefinedが表示されていた

**DebugLoginPanel.tsxについて:**
- 修正不要
- `DebugUser`型は`role: string`を使用
- `page.tsx`で`debugUsers`生成時に`roleName`を`role`にマッピング済み
