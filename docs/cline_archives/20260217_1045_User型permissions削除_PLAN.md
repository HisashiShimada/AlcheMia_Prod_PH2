# タスク計画書: User型からpermissionsを削除（セキュリティ対応）

## メタデータ
- **作成日時**: 2026-02-17 10:45
- **タスクID**: remove-permissions-from-user-type
- **優先度**: 高
- **推定工数**: 30分

## 1. タスク概要

User型に含まれているpermissions?: Permission[]をsessionStorageに保存するのはセキュリティリスク（書き換えの可能性）があるため、以下の対応を行います：

1. User型からpermissionsフィールドを削除
2. permissionsはJWTトークンから動的に取得する
3. JWTデコード処理を実装

## 2. 目的と期待される成果

### 目的
- sessionStorageに保存されるUser情報から機密データ（permissions）を除外
- permissionsはJWTトークン（改ざん不可）から取得することでセキュリティを強化

### 期待される成果
- [ ] User型からpermissions削除
- [ ] JWTデコード処理実装
- [ ] メニューコンポーネントでJWTからpermissions取得
- [ ] 動作確認完了

## 3. 実装ステップ

### Phase 1: JWTデコード処理の実装
- [ ] `frontend/src/utils/jwtUtils.ts`を作成
- [ ] decodeJwt関数を実装（JWTペイロードのデコード）
- [ ] getPermissionsFromToken関数を実装（sessionStorageからトークン取得→デコード→permissions返却）
- [ ] エラーハンドリング実装

### Phase 2: User型とVerifyPINResponse.user型の修正
- [ ] `frontend/src/types/auth.ts`のUser interfaceからpermissions削除
- [ ] `frontend/src/types/auth.ts`のVerifyPINResponse.user.permissionsも削除
  - **理由**: バックエンド（authService.ts）がpermissionsを返さないことを確認済み
  - バックエンドはJWTにpermissionsを含めて返すため、APIレスポンスには不要

### Phase 2.5: page.tsx修正 → **不要（スキップ）**
- ~~page.tsxでpermissionsを除外する処理~~ → 不要
- **理由**: バックエンドがpermissionsを返さないため、sessionStorageに保存されることはない

### Phase 3: メニューコンポーネントの修正
- [ ] 各メニューコンポーネントで`getPermissionsFromToken()`をインポート
- [ ] `user.permissions`の代わりにJWTから取得したpermissionsを使用
- [ ] ProviderMenu.tsx修正
- [ ] SystemAdminMenu.tsx修正
- [ ] DataAdminMenu.tsx修正
- [ ] ExperimentAdminMenu.tsx修正
- [ ] ExperimentWorkerMenu.tsx修正

### Phase 4: 動作確認
- [ ] ログインしてセッション確立を確認
- [ ] sessionStorageを開いて`userInfo`を確認
  - permissionsが含まれていないことを確認
  - sessionTokenが保存されていることを確認
- [ ] メニュー切り替えボタンが正しく動作することを確認
  - 権限のあるメニューのみ表示されることを確認
  - 権限のないメニューは表示されないことを確認
- [ ] JWTの有効期限切れ時の動作確認

## 4. 影響範囲

### 修正するファイル
1. `frontend/src/types/auth.ts` - User型からpermissions削除 + VerifyPINResponse.user.permissionsも削除
2. ~~`frontend/src/app/page.tsx`~~ - **修正不要**（バックエンドがpermissionsを返さないため）
3. `frontend/src/components/menus/ProviderMenu.tsx` - JWT取得に変更
4. `frontend/src/components/menus/SystemAdminMenu.tsx` - JWT取得に変更
5. `frontend/src/components/menus/DataAdminMenu.tsx` - JWT取得に変更
6. `frontend/src/components/menus/ExperimentAdminMenu.tsx` - JWT取得に変更
7. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - JWT取得に変更

### 新規作成するファイル
1. `frontend/src/utils/jwtUtils.ts` - JWTデコード処理

## 5. 技術的詳細

### JWTからpermissionsを取得する仕組み

**JWTの構造:**
```
header.payload.signature
```

**payload（デコード後）:**
```typescript
{
  userId: string;
  organizationId: string;
  sessionId: string;
  permissions: Permission[];  // ★ここに含まれている
  iat: number;
  exp: number;
}
```

### JWTデコード実装

```typescript
// frontend/src/utils/jwtUtils.ts
import { Permission } from '@/types/auth';

export interface JwtPayload {
  userId: string;
  organizationId: string;
  sessionId: string;
  permissions: Permission[];
  iat: number;
  exp: number;
}

/**
 * JWTトークンをデコードしてpayloadを取得
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Base64デコード
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.error('[jwtUtils] JWT decode error:', error);
    return null;
  }
}

/**
 * sessionStorageからJWTトークンを取得してpermissionsを返す
 */
export function getPermissionsFromToken(): Permission[] | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  
  const token = sessionStorage.getItem('sessionToken');
  if (!token) {
    return undefined;
  }
  
  const payload = decodeJwt(token);
  return payload?.permissions;
}
```

### VerifyPINResponse.user型の修正

```typescript
// ❌ 修正前（permissionsを含む）
export interface VerifyPINResponse {
  user: {
    id: string;
    username: string;
    email: string;
    roleName: string;
    roleCd: string;
    organizationId: string;
    organizationName: string;
    displayName: string;
    departmentCd: string;
    initialScreenFunctionCd: string;
    permissions: Permission[];  // ← 削除
  };
  // ...
}

// ✅ 修正後（permissionsを削除）
export interface VerifyPINResponse {
  user: {
    id: string;
    username: string;
    email: string;
    roleName: string;
    roleCd: string;
    organizationId: string;
    organizationName: string;
    displayName: string;
    departmentCd: string;
    initialScreenFunctionCd: string;
    // permissions なし ✅
  };
  // ...
}
```

**理由:**
- バックエンド（`backend/src/services/authService.ts`）の`processVerifyPin`メソッドがpermissionsを返さない
- JWTトークンにpermissionsが含まれているため、APIレスポンスには不要

### メニューコンポーネントでの使用方法

```typescript
import { getPermissionsFromToken } from '@/utils/jwtUtils';

export default function SystemAdminMenu({ user, onLogout, onNavigate, onMenuChange }: SystemAdminMenuProps) {
  // JWTからpermissionsを取得
  const permissions = getPermissionsFromToken();
  
  return (
    <SubHeader 
      title={t('menu.system_admin.title')}
      tabs={tabItems}
      activeTabKey={currentTab}
      onTabChange={handleTabChange}
      currentMenu="system_admin"
      onMenuChange={handleMenuChange}
      userPermissions={permissions}  // ★JWTから取得したpermissions
    />
  );
}
```

## 6. セキュリティ考慮事項

### なぜJWTからの取得が安全か

1. **改ざん防止**
   - JWTは署名されており、改ざんすると検証が失敗する
   - バックエンドで署名検証が行われる

2. **sessionStorageのリスク**
   - JavaScriptで書き換え可能
   - XSS攻撃で情報が漏洩する可能性
   - **今回の対策**: User情報からpermissionsを除外して保存

3. **JWTのリスクと対策**
   - JWTもJavaScriptで読み取り可能（Base64デコード）
   - しかし改ざんはできない（署名があるため）
   - バックエンドで権限チェックを必ず実施（二重チェック）

### 今回の対策の効果

#### 修正前のリスク
```typescript
// sessionStorageに保存されるデータ（修正前）
{
  "id": "user123",
  "username": "test_user",
  "permissions": [                    // ★攻撃者が書き換え可能
    {"functionId": "020101", "permission": 1},
    {"functionId": "020102", "permission": 1}
  ]
}
```

攻撃者がブラウザのDevToolsで以下を実行可能：
```javascript
const user = JSON.parse(sessionStorage.getItem('userInfo'));
user.permissions.push({"functionId": "999999", "permission": 1});  // 不正な権限を追加
sessionStorage.setItem('userInfo', JSON.stringify(user));
```

#### 修正後の改善
```typescript
// sessionStorageに保存されるデータ（修正後）
{
  "id": "user123",
  "username": "test_user"
  // permissionsは含まれない ★
}

// permissionsはJWTから取得（改ざん不可）
const permissions = getPermissionsFromToken();
// → JWTの署名検証により、改ざんされたトークンは無効
```

### ベストプラクティス

✅ **フロントエンド**: JWTから権限を取得してUI制御
✅ **バックエンド**: 各APIで権限チェック（必須）
✅ **二重チェック**: フロントとバックエンドの両方で検証
✅ **sessionStorage**: 機密情報を保存しない

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| JWTデコード失敗 | 高 | 低 | try-catchでエラーハンドリング、undefinedを返してフォールバック |
| sessionTokenがない | 高 | 中 | undefinedを返し、メニュー切り替えボタンを非表示 |
| JWTの有効期限切れ | 中 | 中 | 既存のリフレッシュトークン機構で自動更新 |
| ~~page.tsxの修正漏れ~~ | ~~高~~ | ~~中~~ | **不要**（バックエンドがpermissionsを返さないため） |
| VerifyPINResponse.user.permissions削除漏れ | 中 | 中 | auth.tsで必ず削除 |
| メニューコンポーネントの修正漏れ | 中 | 中 | 5つすべてのメニューコンポーネントを修正 |

## 8. ロールバック計画

問題が発生した場合：
1. User型にpermissionsを戻す
2. 各メニューコンポーネントをuser.permissionsに戻す
3. Gitで以前のコミットに戻す

## 9. 関連ドキュメント

- [権限ベースメニュー制御実装](./20260217_0851_権限ベースメニュー制御実装_PLAN.md)
- [セキュリティ規約](.clinerules/development/security.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-17 10:45
- **承認日時**: （承認待ち）
- **承認者コメント**: （承認後記入）

## 11. 実施記録

### 実施日時
開始: （実施開始後記入）
完了: （実施完了後記入）

### 計画からの変更点
（実施中に記入）

### 発生した問題と解決方法
（実施中に記入）

### 最終的な成果物
- [ ] jwtUtils.ts作成（decodeJwt, getPermissionsFromToken）
- [ ] User型修正（permissionsフィールド削除）
- [ ] VerifyPINResponse.user.permissions削除（バックエンド仕様に合わせる）
- [ ] 5つのメニューコンポーネント修正
- [ ] メニュー切り替えが正常に動作することを確認
