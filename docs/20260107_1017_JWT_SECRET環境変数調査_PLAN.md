# タスク計画書: JWT_SECRET環境変数調査

## メタデータ
- **作成日時**: 2026-01-07 10:17
- **タスクID**: JWT_SECRET_ENV_INVESTIGATION
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

jwtService.tsで`this.secret`が空になっており、`process.env.JWT_SECRET`がundefinedになっている問題を調査し、解決する。

## 2. 目的と期待される成果

### 目的
JWT認証が正しく動作するために、JWT_SECRET環境変数が適切に読み込まれるようにする。

### 期待される成果
- [ ] JWT_SECRET環境変数が正しく読み込まれる
- [ ] jwtService.tsでsecretが正しく設定される
- [ ] 環境変数設定ガイドが更新される（必要な場合）

## 3. 調査ステップ

### Phase 1: 現状確認
- [ ] jwtService.tsのコード確認
- [ ] backend/.envファイルの存在確認
- [ ] JWT_SECRETの設定状況確認

### Phase 2: 環境変数読み込み確認
- [ ] server.tsでのdotenv設定確認
- [ ] 環境変数読み込みタイミング確認
- [ ] TypeScriptビルド後の動作確認

### Phase 3: 問題特定
- [ ] 環境変数が読み込まれない原因の特定
- [ ] 他の環境変数の読み込み状況確認
- [ ] .envファイルのパス確認

### Phase 4: 解決策実装
- [ ] 問題の修正
- [ ] 動作確認
- [ ] ドキュメント更新（必要な場合）

## 4. 影響範囲

### 確認が必要なファイル
1. `backend/src/services/jwtService.ts` - JWT_SECRETの使用箇所
2. `backend/.env` - 環境変数定義ファイル
3. `backend/src/server.ts` - dotenv読み込み箇所
4. `backend/tsconfig.json` - TypeScript設定
5. `docs/20250106_0930_環境変数設定ガイド.md` - ドキュメント

### 影響を受ける機能
- JWT認証
- ログイン機能
- トークン生成・検証

## 5. 技術的詳細

### チェック項目
- dotenvパッケージのインストール状況
- .envファイルの配置場所
- 環境変数の命名規則
- TypeScriptのコンパイル設定

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| .envファイルが存在しない | 高 | 中 | .env.exampleから作成 |
| dotenvの読み込みタイミングが遅い | 高 | 中 | server.ts先頭で読み込み |
| TypeScriptビルド時に環境変数が展開される | 中 | 低 | ランタイムで読み込むよう修正 |

## 7. 承認記録

- **計画書提示日時**: 2026-01-07 10:17
- **承認日時**: （承認待ち）
- **承認者コメント**: （待機中）

## 8. 実施記録

### 実施日時
開始: 2026-01-07 10:17
完了: 2026-01-07 10:22

### 調査結果

**根本原因**: インポートのタイミング問題

1. ✅ `.env`ファイルには`JWT_SECRET`が正しく設定されている
2. ✅ `dotenv.config()`は`server.ts`で呼ばれている
3. ❌ **問題**: `authController.ts`がファイルトップレベルで`jwtService`をインスタンス化
4. ❌ **結果**: `dotenv.config()`が実行される**前に**`JwtService`のコンストラクタが実行される

**発生メカニズム**:
```
1. server.ts実行開始
2. import authRoutes → authRoutes.tsを実行
3. import authController → authController.tsを実行
4. authController.tsのトップレベルで new JwtService() が実行される
5. この時点でまだ dotenv.config() が呼ばれていない
6. process.env.JWT_SECRET が undefined
7. JwtServiceのコンストラクタでエラー
```

### 解決方法

#### 1. server.tsの修正（インポート順序の変更）
**変更内容**: `dotenv.config()`をすべてのインポートより前に実行

```typescript
// 修正前
import express, { Application } from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
dotenv.config();

// 修正後
import express, { Application } from 'express';
import dotenv from 'dotenv';
dotenv.config(); // 先に実行
import authRoutes from './routes/authRoutes'; // 後でインポート
```

#### 2. jwtService.tsの改善
**変更内容**:
- デバッグ用の`console.log(this.secret)`を削除
- エラーメッセージを改善（ドキュメントへの参照を追加）

```typescript
// 修正前
console.log(this.secret)
if (!this.secret) {
  throw new Error('JWT_SECRET environment variable is required'+this.secret);
}

// 修正後
if (!this.secret) {
  throw new Error(
    'JWT_SECRET environment variable is required. ' +
    'Please set JWT_SECRET in your .env file. ' +
    'See docs/20250106_0930_環境変数設定ガイド.md for details.'
  );
}
```

#### 3. .env.exampleファイルの作成
**目的**: 開発者が必要な環境変数を理解できるテンプレートを提供

**内容**:
- すべての必須環境変数とオプション環境変数
- JWT_SECRETの生成方法のコメント
- 各環境変数の説明

#### 4. ドキュメント更新
**対象**: `docs/20250106_0930_環境変数設定ガイド.md`

**追加内容**:
- バックエンド環境変数セクション
- JWT_SECRETの設定方法と生成コマンド
- .envファイルの作成手順
- トラブルシューティング情報

### 修正ファイル一覧
1. `backend/src/server.ts` - インポート順序変更
2. `backend/src/services/jwtService.ts` - エラーメッセージ改善
3. `backend/.env.example` - 新規作成
4. `docs/20250106_0930_環境変数設定ガイド.md` - バックエンド設定追加

### 動作確認方法

```bash
# 1. バックエンドの起動
cd backend
npm run dev

# 2. エラーが発生しないことを確認
# 正常に起動すれば以下が表示される:
# Server is running on port 3001
# Environment: development

# 3. ヘルスチェック
curl http://localhost:3001/api/health
```

### 今後の予防策

1. **環境変数を使用するサービスクラスは遅延初期化する**
   - コンストラクタではなく、初回使用時に初期化
   - または依存性注入パターンを採用

2. **起動時の環境変数チェック**
   - server.ts起動時に必須環境変数の存在を確認
   - 不足があれば明確なエラーメッセージで起動を中断

3. **CI/CDパイプラインでの検証**
   - .env.exampleと実際の.envの整合性チェック
   - 必須環境変数の存在確認
