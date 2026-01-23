# タスク計画書: login_history IPアドレス・User-Agent未登録問題調査

## メタデータ
- **作成日時**: 2026-01-23 09:02
- **タスクID**: login_history_investigation
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

login_historyテーブルに新規追加した「IPアドレス」カラムと「User-Agent」カラムに値が登録されていない問題を調査し、修正する。

## 2. 目的と期待される成果

### 目的
ログイン履歴にIPアドレスとUser-Agentを記録することで、セキュリティ監査とトラブルシューティングを強化する。

### 期待される成果
- [ ] login_historyテーブルのDDL構造を確認
- [ ] ログイン処理での登録コードを確認
- [ ] IPアドレス・User-Agent取得処理を確認
- [ ] 問題箇所を特定
- [ ] 修正案を提示

## 3. 実装ステップ

### Phase 1: 現状確認
- [ ] login_historyテーブルのDDL確認
- [ ] login_historyテーブルのカラム構成確認

### Phase 2: ログイン処理コード確認
- [ ] authController.tsのログイン処理確認
- [ ] login_historyへの登録処理確認
- [ ] IPアドレス取得処理の有無確認
- [ ] User-Agent取得処理の有無確認

### Phase 3: 問題特定
- [ ] 登録処理の欠落箇所を特定
- [ ] 原因を分析

### Phase 4: 修正方針提案
- [ ] IPアドレス取得方法の提案
- [ ] User-Agent取得方法の提案
- [ ] 実装箇所の提案

## 4. 影響範囲

### 確認するファイル
1. `docs/design/db/ddl/login_history.sql` - テーブル定義
2. `backend/src/controllers/authController.ts` - ログイン処理
3. `backend/src/types/` - 型定義

## 5. 調査記録

### 調査結果

#### テーブル定義（DDL）
✅ **正常**: login_historyテーブルには以下のカラムが正しく定義されています：
- `ip_address CHARACTER VARYING(45)` - IPv4/IPv6対応
- `user_agent TEXT` - ブラウザ・OS情報

#### ログイン処理コード（authController.ts）
❌ **問題発見**: `login`関数内の2箇所のINSERT文で、ip_addressとuser_agentが含まれていません。

**問題箇所1: パスワード不一致時（147-155行目）**
```typescript
const historyQuery = `
  INSERT INTO login_history (user_name, organization_id, login_at, login_sf, failure_reason)
  VALUES ($1, $2, NOW(), $3, $4)
`;
await pool.query(historyQuery, [
  user.user_name,
  user.organization_id,
  false,
  'Invalid password',
]);
```
→ ip_address, user_agentが含まれていない！

**問題箇所2: ログイン成功時（195-200行目）**
```typescript
const successHistoryQuery = `
  INSERT INTO login_history (user_name, organization_id, login_at, login_sf)
  VALUES ($1, $2, NOW(), $3)
`;
await pool.query(successHistoryQuery, [
  user.user_name,
  user.organization_id,
  true,
]);
```
→ ip_address, user_agentが含まれていない！

### 問題箇所
**backend/src/controllers/authController.ts の login関数**
- パスワード不一致時のログイン履歴登録（147-155行目）
- ログイン成功時のログイン履歴登録（195-200行目）

### 根本原因
INSERT文のカラムリストとVALUES句に、ip_addressとuser_agentが含まれていないため、これらのカラムにNULLが登録されている。

### 修正方針

#### 1. IPアドレス取得方法
Express.jsのRequestオブジェクトから取得：
```typescript
const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
```

**注意**: プロキシ経由の場合は`x-forwarded-for`ヘッダーも考慮：
```typescript
const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] 
  || req.ip 
  || req.socket.remoteAddress 
  || 'unknown';
```

#### 2. User-Agent取得方法
HTTPヘッダーから取得：
```typescript
const userAgent = req.headers['user-agent'] || 'unknown';
```

#### 3. INSERT文の修正

**パスワード不一致時:**
```typescript
const historyQuery = `
  INSERT INTO login_history (
    user_name, 
    organization_id, 
    login_at, 
    login_sf, 
    failure_reason,
    ip_address,
    user_agent
  )
  VALUES ($1, $2, NOW(), $3, $4, $5, $6)
`;

const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] 
  || req.ip 
  || req.socket.remoteAddress 
  || 'unknown';
const userAgent = req.headers['user-agent'] || 'unknown';

await pool.query(historyQuery, [
  user.user_name,
  user.organization_id,
  false,
  'Invalid password',
  ipAddress,
  userAgent,
]);
```

**ログイン成功時:**
```typescript
const successHistoryQuery = `
  INSERT INTO login_history (
    user_name, 
    organization_id, 
    login_at, 
    login_sf,
    ip_address,
    user_agent
  )
  VALUES ($1, $2, NOW(), $3, $4, $5)
`;

const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] 
  || req.ip 
  || req.socket.remoteAddress 
  || 'unknown';
const userAgent = req.headers['user-agent'] || 'unknown';

await pool.query(successHistoryQuery, [
  user.user_name,
  user.organization_id,
  true,
  ipAddress,
  userAgent,
]);
```

#### 4. 共通化の提案
IPアドレスとUser-Agent取得処理を関数内の先頭で1回だけ実行し、両方のINSERT文で再利用する：

```typescript
export async function login(req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const requestId = uuidv4();
  
  // IPアドレスとUser-Agentを取得（共通化）
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] 
    || req.ip 
    || req.socket.remoteAddress 
    || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // ... 以降の処理で使用
}
```

### 次のステップ
1. ユーザーに修正方針を承認してもらう
2. authController.tsを修正
3. 動作確認（ログイン試行してDBを確認）
