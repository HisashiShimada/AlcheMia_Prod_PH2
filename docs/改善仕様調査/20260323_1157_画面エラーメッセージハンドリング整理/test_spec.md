# テスト仕様書: エラーメッセージハンドリング整理

**作成日**: 2026-03-23  
**対象タスク**: 画面エラーメッセージハンドリング整理  
**対象ファイル**: `frontend/src/utils/errorUtils.ts`, `frontend/src/utils/errorMapper.ts`  

---

## 概要

`extractErrorMessage()` を通じたエラーメッセージ表示の統一化が正しく機能することを確認する。  
エラー処理フローの各パターン（AxiosError・success:false・nullなど）に対して期待するメッセージが返ることをテストする。

---

## テストファイル配置

```
frontend/src/utils/__tests__/
├── errorMapper.test.ts   # mapErrorToMessage() のユニットテスト
└── errorUtils.test.ts    # extractErrorMessage() のユニットテスト
```

---

## 1. `errorMapper.test.ts`

### テスト対象: `mapErrorToMessage(errorCode, defaultMessage?)`

#### TC-EM-001: 既知エラーコードが正しいメッセージに変換される

| コード | 期待するメッセージ |
|--------|-----------------|
| `E5001` | `ユーザー名またはパスワードが正しくありません` |
| `E5002` | `セッションの有効期限が切れました。再度ログインしてください` |
| `E5003` | `PINコードが正しくありません` |
| `E5007` | `ログイン試行回数が上限に達しました。しばらくしてから再度お試しください` |
| `E3001` | `サーバーに接続できません。ネットワークを確認してください` |
| `E3002` | `リクエストがタイムアウトしました。再度お試しください` |
| `E4001` | `サーバー内部エラーが発生しました。管理者にお問い合わせください` |
| `E9999` | `エラーが発生しました。しばらくしてから再度お試しください` |

```typescript
// 実装例
it.each([
  ['E5001', 'ユーザー名またはパスワードが正しくありません'],
  ['E5002', 'セッションの有効期限が切れました。再度ログインしてください'],
  ['E5003', 'PINコードが正しくありません'],
  ['E5007', 'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください'],
  ['E3001', 'サーバーに接続できません。ネットワークを確認してください'],
  ['E3002', 'リクエストがタイムアウトしました。再度お試しください'],
  ['E4001', 'サーバー内部エラーが発生しました。管理者にお問い合わせください'],
  ['E9999', 'エラーが発生しました。しばらくしてから再度お試しください'],
])('TC-EM-001: %s → "%s"', (code, expected) => {
  expect(mapErrorToMessage(code)).toBe(expected);
});
```

#### TC-EM-002: 未知のエラーコードはデフォルトメッセージを返す

```typescript
it('TC-EM-002: 未知コードはデフォルトメッセージ', () => {
  expect(mapErrorToMessage('E9998')).toBe(
    'エラーが発生しました。しばらくしてから再度お試しください'
  );
  expect(mapErrorToMessage('UNKNOWN_CODE')).toBe(
    'エラーが発生しました。しばらくしてから再度お試しください'
  );
});
```

#### TC-EM-003: カスタムデフォルトメッセージが使われる

```typescript
it('TC-EM-003: カスタムデフォルトメッセージ', () => {
  expect(mapErrorToMessage('INVALID_CODE', 'カスタムエラー')).toBe('カスタムエラー');
});
```

#### TC-EM-004: 空文字・null・undefined はデフォルトを返す

```typescript
it('TC-EM-004: 空文字はデフォルトメッセージ', () => {
  expect(mapErrorToMessage('')).toBe(
    'エラーが発生しました。しばらくしてから再度お試しください'
  );
});
```

---

## 2. `errorUtils.test.ts`

### テスト対象: `extractErrorMessage(error)`

#### TC-EU-001: AxiosError — バックエンドがエラーコードを返す場合

```typescript
it('TC-EU-001: response.data.error.code がある場合はそのコードのメッセージ', () => {
  const error = new AxiosError('Request failed');
  error.response = {
    status: 401,
    data: { success: false, error: { code: 'E5001', message: 'Login failed' } },
  } as any;

  expect(extractErrorMessage(error)).toBe(
    'ユーザー名またはパスワードが正しくありません'
  );
});
```

#### TC-EU-002: AxiosError — バックエンドがコードなし、HTTPステータスでフォールバック

```typescript
it('TC-EU-002: error.code なし・HTTP 401 → E5013 メッセージ', () => {
  const error = new AxiosError('Unauthorized');
  error.response = { status: 401, data: {} } as any;

  expect(extractErrorMessage(error)).toBe(
    '認証が必要です。再度ログインしてください'
  );
});

it('TC-EU-002b: HTTP 403 → E5012 メッセージ', () => {
  const error = new AxiosError('Forbidden');
  error.response = { status: 403, data: {} } as any;

  expect(extractErrorMessage(error)).toBe('アクセスが拒否されました');
});

it('TC-EU-002c: HTTP 500 → E4001 メッセージ', () => {
  const error = new AxiosError('Internal Server Error');
  error.response = { status: 500, data: {} } as any;

  expect(extractErrorMessage(error)).toBe(
    'サーバー内部エラーが発生しました。管理者にお問い合わせください'
  );
});

it('TC-EU-002d: HTTP 429 → E5007 メッセージ（レート制限）', () => {
  const error = new AxiosError('Too Many Requests');
  error.response = { status: 429, data: {} } as any;

  expect(extractErrorMessage(error)).toBe(
    'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください'
  );
});
```

#### TC-EU-003: AxiosError — レスポンスなし（ネットワーク断）

```typescript
it('TC-EU-003: response なし → E3001 メッセージ', () => {
  const error = new AxiosError('Network Error');
  // response は undefined のまま

  expect(extractErrorMessage(error)).toBe(
    'サーバーに接続できません。ネットワークを確認してください'
  );
});
```

#### TC-EU-004: AxiosError — タイムアウト (`ECONNABORTED`)

```typescript
it('TC-EU-004: code === ECONNABORTED → E3002 メッセージ', () => {
  const error = new AxiosError('timeout of 5000ms exceeded', 'ECONNABORTED');

  expect(extractErrorMessage(error)).toBe(
    'リクエストがタイムアウトしました。再度お試しください'
  );
});
```

#### TC-EU-005: null / undefined を渡した場合（success:false ルート用）

```typescript
it('TC-EU-005: null → デフォルトメッセージ', () => {
  expect(extractErrorMessage(null)).toBe(
    'エラーが発生しました。しばらくしてから再度お試しください'
  );
});

it('TC-EU-005b: undefined → デフォルトメッセージ', () => {
  expect(extractErrorMessage(undefined)).toBe(
    'エラーが発生しました。しばらくしてから再度お試しください'
  );
});
```

#### TC-EU-006: 通常の Error オブジェクト

```typescript
it('TC-EU-006: 通常の Error → デフォルトメッセージ（AxiosError でないため）', () => {
  const error = new Error('something went wrong');

  expect(extractErrorMessage(error)).toBe(
    'エラーが発生しました。しばらくしてから再度お試しください'
  );
});
```

---

## 3. 画面コンポーネントの動作確認（手動テスト）

### Phase 1: 認証系

| 画面 | 操作 | 確認ポイント |
|------|------|------------|
| LoginForm | 誤ったパスワードでログイン | `ユーザー名またはパスワードが正しくありません` が表示される |
| LoginForm | ネットワーク切断してログイン | `サーバーに接続できません。ネットワークを確認してください` が表示される |
| LoginForm | 5回連続失敗（レート制限） | `ログイン試行回数が上限に達しました。しばらくしてから再度お試しください` が表示される |
| PINCodeForm | 誤ったPINコード入力 | `PINコードが正しくありません` が表示される |
| PINCodeForm | PINコード有効期限切れ | `PINコードの有効期限が切れました。再送信してください` が表示される |
| PasswordResetRequest | 存在しないメールアドレス | エラーメッセージが `extractErrorMessage` 経由で表示される |
| PasswordResetExecute | 無効なリセットトークン | `パスワードリセットトークンが正しくありません` が表示される |
| PasswordResetExecute | 期限切れトークン | `パスワードリセットトークンの有効期限が切れています` が表示される |

### Phase 2: 実験作業系

| 画面 | 操作 | 確認ポイント |
|------|------|------------|
| ExperimentWorkerMenu | プロジェクト一覧取得失敗（API 500） | `サーバー内部エラーが発生しました。管理者にお問い合わせください` が表示される |
| ExperimentWorkerMenu | プロジェクト一覧 success:false | `result.error.message` またはデフォルトメッセージが表示される |
| ExperimentWorkerMenu | 承認依頼 success:false | `result.error.message` またはデフォルトメッセージが表示される |
| ExperimentRecordTab | タスク操作失敗（API 404） | `指定されたリソースが見つかりません` が表示される |
| InstructionConfirmationTab | getWorkerTasks success:false | `result.error.message` またはデフォルトメッセージが表示される |
| InstructionConfirmationTab | getProjectMaiml success:false | `result.error.message` またはデフォルトメッセージが表示される |
| IssueManagementModal | 課題取得失敗（API 500） | `サーバー内部エラーが発生しました。管理者にお問い合わせください` が表示される |
| DataRecordDialog | データ保存失敗 | エラーメッセージが表示される |
| ProgressCheckTab | タスク一覧取得失敗 | エラーメッセージが表示される |
| TransitionList | トランジション操作失敗 | エラーメッセージが表示される |

### Phase 3: エディタ系

| 画面 | 操作 | 確認ポイント |
|------|------|------------|
| useWorkflow | ワークフロー保存失敗（API 500） | エラーメッセージが表示される |
| useNamespaceOperations | 名前空間操作失敗 | エラーメッセージが表示される |

---

## 4. 回帰確認チェックリスト

以下の観点でリグレッションがないことを確認する。

- [ ] ログイン成功時に不要なエラーメッセージが表示されない
- [ ] PINコード正常入力時にエラーが表示されない
- [ ] エラー後に再試行して成功した場合にエラーメッセージが消える
- [ ] 複数のエラーが連続した場合に最後のエラーのみ表示される
- [ ] `console.error` が適切なタイミングで呼ばれている

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-03-23 | 新規作成 | Cline |
