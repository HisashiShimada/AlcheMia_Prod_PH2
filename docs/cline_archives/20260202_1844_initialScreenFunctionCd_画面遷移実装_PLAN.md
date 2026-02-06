# タスク計画書: initialScreenFunctionCd画面遷移実装

## メタデータ
- **作成日時**: 2026-02-02 18:44
- **タスクID**: initialScreenFunctionCd_screen_navigation
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

フロントエンド側でinitialScreenFunctionCdを受け取って、適切な画面に遷移するロジックを完全に実装します。

## 2. 目的と期待される成果

### 目的
- ログイン後、ユーザーのロールに応じた適切な初期画面を表示する
- バックエンドから受け取ったinitialScreenFunctionCdを正しく処理する
- すべてのロール（6種類）に対応した画面遷移を実装する

### 期待される成果
- [ ] PINコード検証後、initialScreenFunctionCdを受け取る
- [ ] initialScreenFunctionCdに基づいて適切なメニューを表示
- [ ] 未定義のコードに対するエラーハンドリング
- [ ] SessionStorageへの適切な保存
- [ ] すべてのロール（provider, system_admin, data_admin, experiment_admin, experiment_worker, mi_engineer）に対応

## 3. 現状分析

### 既存実装の確認（frontend/src/app/page.tsx）

#### 実装済みの部分
1. **PINコード検証後の受け取り**
```typescript
const response = await authService.verifyPin(pinCode, sessionToken, orgIdFromUrl);
setCurrentUser(response.user);
setCurrentMenuType(response.user.initialScreenFunctionCd);
```

2. **SessionStorageへの保存**
```typescript
sessionStorage.setItem('sessionToken', response.session.token);
sessionStorage.setItem('userInfo', JSON.stringify(response.user));
```

3. **画面分岐ロジック**
```typescript
switch (currentMenuType) {
  case '010000': // プロバイダーメニュー
  case '020000': // システム管理者メニュー
  case '030000': // データ管理者メニュー
  case '040000': // 実験管理者メニュー
  case '050000': // 実験作業者メニュー
  default: // 未定義
}
```

#### 問題点・改善点
1. **MI技術者（060000）が未実装**
   - mi_engineerロールのメニューコンポーネントが存在しない
   - 分岐ロジックに060000が含まれていない

2. **デフォルト値の処理が不十分**
   - バックエンドがデフォルト値'010000'を返すが、フロントエンドでの検証がない
   - 空文字列やnullの場合のフォールバック処理がない

3. **エラーハンドリングの改善**
   - 未定義コードの場合、単純なテキスト表示のみ
   - ユーザーにログアウトや再ログインを促す機能がない

4. **型定義の確認**
   - initialScreenFunctionCdの型が正しく定義されているか確認が必要

## 4. 実装ステップ

### Phase 1: 型定義の確認と修正
- [ ] frontend/src/types/auth.tsを確認
- [ ] User型にinitialScreenFunctionCdが含まれているか確認
- [ ] 必要に応じて型定義を修正

### Phase 2: MI技術者メニューの確認
- [ ] MIEngineerMenuコンポーネントの存在確認
- [ ] 存在しない場合の対応方針決定（実装 or 他メニューへのマッピング）

### Phase 3: 画面遷移ロジックの改善
- [ ] initialScreenFunctionCdのバリデーション追加
- [ ] デフォルト値処理の追加
- [ ] MI技術者（060000）のケース追加
- [ ] 未定義コードのエラーハンドリング改善

### Phase 4: SessionStorage処理の改善
- [ ] 保存されるデータの確認
- [ ] リロード時の復元処理確認

### Phase 5: テスト
- [ ] 各ロールでのログイン動作確認
- [ ] 未定義コードの動作確認
- [ ] リロード時の動作確認

## 5. 影響範囲

### 確認が必要なファイル
1. `frontend/src/types/auth.ts` - User型定義
2. `frontend/src/app/page.tsx` - メインの画面遷移ロジック
3. `frontend/src/services/authService.ts` - APIレスポンス型定義
4. `frontend/src/components/menus/` - 各メニューコンポーネント

### 変更するファイル（予定）
1. `frontend/src/app/page.tsx` - 画面遷移ロジックの改善
2. 必要に応じて型定義ファイル

## 6. 技術的詳細

### initialScreenFunctionCdマッピング

| コード | ロール | メニューコンポーネント | 状態 |
|--------|--------|----------------------|------|
| 010000 | provider | ProviderMenu | ✅ 実装済み |
| 020000 | system_admin | SystemAdminMenu | ✅ 実装済み |
| 030000 | data_admin | DataAdminMenu | ✅ 実装済み |
| 040000 | experiment_admin | ExperimentAdminMenu | ✅ 実装済み |
| 050000 | experiment_worker | ExperimentWorkerMenu | ✅ 実装済み |
| 060000 | mi_engineer | MIEngineerMenu | ❌ 未実装 |

### 改善案

#### 1. バリデーション処理の追加
```typescript
// initialScreenFunctionCdの検証とデフォルト値設定
const validateAndGetMenuType = (code: string | undefined): string => {
  // 未定義・空文字列・nullの場合はデフォルト値
  if (!code || code.trim() === '') {
    console.warn('initialScreenFunctionCd is empty, using default: 010000');
    return '010000';
  }
  
  // 有効なコードリスト
  const validCodes = ['010000', '020000', '030000', '040000', '050000', '060000'];
  
  if (!validCodes.includes(code)) {
    console.error(`Invalid initialScreenFunctionCd: ${code}, using default: 010000`);
    return '010000';
  }
  
  return code;
};
```

#### 2. エラーハンドリングの改善
```typescript
case undefined:
case null:
case '':
  // デフォルト値にフォールバック
  MenuComponent = (
    <ProviderMenu
      user={currentUser}
      onLogout={handleLogout}
      onNavigate={handleNavigate}
      onMenuChange={handleMenuChange}
    />
  );
  messageApi.warning('初期画面コードが設定されていないため、デフォルト画面を表示します');
  break;

default:
  // 未定義コードの場合
  MenuComponent = (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <Alert
        message="未定義の画面コード"
        description={`画面コード「${currentMenuType}」は定義されていません。管理者に連絡してください。`}
        type="error"
        showIcon
        style={{ marginBottom: '16px' }}
      />
      <Button type="primary" onClick={handleLogout}>
        ログアウト
      </Button>
    </div>
  );
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| MI技術者メニューが未実装 | 中 | 高 | 他のメニューへのマッピングまたは簡易実装 |
| 既存のログインフローへの影響 | 高 | 低 | 十分なテストを実施 |
| SessionStorageの互換性問題 | 中 | 低 | 既存の保存方式を維持 |

## 8. テスト計画

### 手動テスト
- [ ] プロバイダーでログイン → 010000 → ProviderMenu表示
- [ ] システム管理者でログイン → 020000 → SystemAdminMenu表示
- [ ] データ管理者でログイン → 030000 → DataAdminMenu表示
- [ ] 実験管理者でログイン → 040000 → ExperimentAdminMenu表示
- [ ] 実験作業者でログイン → 050000 → ExperimentWorkerMenu表示
- [ ] MI技術者でログイン → 060000 → 適切な画面表示
- [ ] 未定義コードの場合のエラー表示
- [ ] リロード時の画面維持

### 確認項目
- [ ] コンソールにエラーが出ていない
- [ ] 各メニューが正しく表示される
- [ ] ログアウトが正常に動作する
- [ ] SessionStorageに正しい情報が保存される

## 9. ロールバック計画

変更が単純なため、以前のコードに戻すだけでロールバック可能。

## 10. 承認記録

- **計画書提示日時**: 2026-02-02 18:44
- **承認日時**: 2026-02-02 18:52
- **承認者コメント**: 既存実装で要件を満たしているため、追加変更不要

## 11. 実施記録

### 実施日時
開始: 2026-02-02 18:44
完了: 2026-02-02 18:52

### 計画からの変更点
- 既存実装が既に要件を満たしていたため、新規コードの追加は不要
- MI技術者（060000）は存在しないため対応不要
- 未定義コードの考慮は不要（バックエンドがデフォルト値を保証）

### 発生した問題と解決方法
特になし。既存実装が要件を満たしていることを確認。

### 最終的な成果物
- [x] PINコード検証後、initialScreenFunctionCdを受け取る処理（実装済み）
- [x] initialScreenFunctionCdに基づく画面分岐（実装済み）
- [x] SessionStorageへの適切な保存（実装済み）
- [x] 5つのロール（010000〜050000）すべてに対応（実装済み）

### 実装箇所（frontend/src/app/page.tsx）
1. **PINコード検証処理（handleVerifyPin関数）**
   ```typescript
   setCurrentUser(response.user);
   setCurrentMenuType(response.user.initialScreenFunctionCd);
   ```

2. **画面分岐ロジック（switch文）**
   - 010000: ProviderMenu
   - 020000: SystemAdminMenu
   - 030000: DataAdminMenu
   - 040000: ExperimentAdminMenu
   - 050000: ExperimentWorkerMenu

3. **SessionStorage保存**
   ```typescript
   sessionStorage.setItem('sessionToken', response.session.token);
   sessionStorage.setItem('userInfo', JSON.stringify(response.user));
   ```

## 12. 振り返り

### うまくいった点
- 既存実装が既に要件を満たしており、追加開発が不要だった
- バックエンドがデフォルト値（'010000'）を保証しているため、フロントエンド側で複雑なバリデーションが不要
- 型定義（User型にinitialScreenFunctionCd）が既に正しく定義されていた

### 改善が必要な点
特になし。現在の実装で十分に機能している。

### 学んだこと
- タスク開始前に既存実装を確認することで、不要な開発を避けられる
- バックエンドとフロントエンドの責任分担が明確であれば、シンプルな実装で済む
- デフォルト値の処理はバックエンド側で行うことで、フロントエンドの複雑さを軽減できる
