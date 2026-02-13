# タスク計画書: Nginxクライアント証明書認証の実装（クエリパラメータ方式）

## メタデータ
- **作成日時**: 2026-02-10 15:00
- **タスクID**: nginx-client-cert-auth-query-param
- **優先度**: 高
- **推定工数**: 4時間

## 1. タスク概要

ログイン画面を開いたときにnginxでクライアント証明書認証を行い、証明書に含まれる組織情報（organization_id）を**URLのクエリパラメータ**（`?org=...`）として自動的にセットする仕組みを実装します。

## 2. 目的と期待される成果

### 目的
- SSL/TLSクライアント証明書認証によるセキュアなアクセス制御
- 証明書のCN（Common Name）から組織IDを自動抽出
- URLクエリパラメータとして組織IDを渡す（`http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385`）
- フロントエンドで組織IDを簡単に取得可能にする

### 期待される成果
- [ ] Nginxサーバー設定ファイルの作成
- [ ] URLリライトによるクエリパラメータ追加機能
- [ ] Docker Compose設定へのNginxコンテナ追加
- [ ] フロントエンドでのクエリパラメータ取得処理
- [ ] バックエンドでのクエリパラメータ検証処理
- [ ] クライアント証明書のブラウザインストール手順書

## 3. 実装ステップ

### Phase 1: Nginx設定ファイルの作成
- [ ] `config/nginx/sites-available/mmdpf-ssl.conf` を作成
  - HTTPSリスナー（443ポート）の設定
  - クライアント証明書認証の有効化（`ssl_verify_client on`）
  - CA証明書の指定（`ssl_client_certificate`）
  - CNからorganization_idを抽出するロジック
  - **URLリライトでクエリパラメータを追加**（`rewrite ^(.*)$ $1?orgId=$tenant_id break;`）
  - フロントエンドへのプロキシ設定
  
- [ ] シンボリックリンクの作成（sites-enabled）
  - `config/nginx/sites-enabled/mmdpf-ssl.conf` → `sites-available/mmdpf-ssl.conf`

### Phase 2: Docker Compose設定の更新
- [ ] `docker-compose.yml` にnginxサービスを追加
  - nginx:1.25-alpine イメージを使用
  - ポートマッピング（80:80, 443:443）
  - 証明書ボリュームマウント（`./certs:/etc/nginx/certs:ro`）
  - 設定ファイルボリュームマウント（`./config/nginx:/etc/nginx`）
  - frontendコンテナへの依存関係

### Phase 3: フロントエンド対応（✅ 実装済み）
- [x] URLクエリパラメータから組織IDを取得
  - `useSearchParams().get('orgId')`で既に実装済み（`frontend/src/app/page.tsx`）
  - `orgIdFromUrl`変数として各認証APIに渡している
  
- [ ] 証明書認証失敗時のUI改善（オプション）
  - 証明書認証失敗時のエラーメッセージ表示
  - 証明書が見つからない場合の案内

### Phase 4: バックエンド対応（✅ 実装済み）
- [x] APIリクエストでのクエリパラメータ対応確認
  - `authController.ts`で既に`req.query.orgId`を取得している
  - `login`, `verifyPin`, `resendPin`, `resetPasswordRequest`で実装済み
  - データベースでorganization_idの検証も実装済み
  
- [x] クエリパラメータからorganization_id取得
  - すべての認証APIで`const organizationId = req.query.orgId`実装済み
  - ヘッダー認証は使用していない（証明書ベース認証のため不要）

### Phase 5: ドキュメント作成
- [ ] クライアント証明書のインストール手順書
  - Windowsでの.p12ファイルインポート手順
  - ブラウザ（Chrome/Edge/Firefox）での証明書確認方法
  - 証明書選択ダイアログの操作方法
  
- [ ] 開発環境セットアップガイドの更新
  - Nginx + クライアント証明書認証の起動手順
  - トラブルシューティング

## 4. 影響範囲

### 新規作成するファイル
1. `config/nginx/sites-available/mmdpf-ssl.conf` - Nginxサーバー設定
2. `config/nginx/sites-enabled/mmdpf-ssl.conf` - シンボリックリンク
3. `docs/CLIENT_CERTIFICATE_SETUP.md` - 証明書セットアップガイド

### 変更するファイル
1. `docker-compose.yml` - Nginxコンテナの追加
2. `frontend/src/app/page.tsx` - ✅ 既に実装済み（URLパラメータ取得）
3. `backend/src/controllers/authController.ts` - ✅ 既に実装済み（クエリパラメータ対応）
4. `config/nginx/nginx.conf` - sites-enabledのinclude確認

### 影響を受ける機能
- ログインフロー: URLパラメータで組織が自動決定
- 組織選択: 証明書のCNから自動決定される場合はスキップ
- セッション管理: organizationIdの取得元が変更
- API呼び出し: クエリパラメータでorganization_id送信

## 5. 技術的詳細

### 開発環境構成（WSL2）

**✅ Windows + WSL2 + Docker構成で問題ありません！**

- **ホストOS**: Windows 11
- **仮想環境**: WSL2 + Ubuntu
- **Docker実行環境**: WSL2内（Docker Desktop for Windows または Docker CE）
- **IDE**: Windows上のVS Code + Remote-WSL拡張機能
- **ファイルアクセス**: `\\wsl$\Ubuntu\home\...` 経由でアクセス可能

**動作メカニズム:**
1. Windows上のVS CodeからWSL2内のプロジェクトフォルダを開く
2. Docker ComposeはWSL2内のLinux環境で実行
3. Nginxコンテナも正常に動作
4. ポートフォワーディング（443:443）は自動的にWindows側に転送される
5. Windows上のブラウザから`https://localhost`でアクセス可能

### 使用する技術・ライブラリ
- Nginx 1.25以上（rewrite機能）
- OpenSSL（証明書検証）
- Docker / Docker Compose（WSL2内で実行）
- Next.js（useSearchParams）
- VS Code Remote-WSL拡張機能

### 証明書について（開発環境）

**✅ 開発環境では自己署名証明書（オレオレ証明書）で問題ありません！**

**既存の証明書生成スクリプトを使用:**
- `certs/generate-certificates.sh` が既に存在
- CA証明書と2つの組織用クライアント証明書を自動生成
- PKCS#12形式（.p12）でブラウザインポート用ファイルも生成

**証明書の構成:**
```
certs/
├── ca/
│   ├── ca.crt          # 自己署名CA証明書（Nginxで使用）
│   └── ca.key          # CA秘密鍵
├── clients/
│   ├── c9621ed65def49708e7ffbe97c98e3ed.p12  # 組織1用（パスワード: mmdpf123）
│   └── a0718dc521f344e687e9cc2ae83f3385.p12  # 組織2用（パスワード: mmdpf123）
└── server/
    ├── server.crt      # サーバー証明書
    └── server.key      # サーバー秘密鍵
```

**⚠️ 重要: 証明書CNの形式**
- 証明書生成スクリプトでは`CN={uuid}`形式（波括弧付き）を使用
- 例: `CN={a0718dc5-21f3-44e6-87e9-cc2ae83f3385}`
- Nginx設定ではこの波括弧を考慮した正規表現が必要

**開発環境での注意点:**
- ブラウザで「安全でない」警告が表示される → **無視して進める**
- Windows証明書ストアにCA証明書をインストールすれば警告を回避可能
- クライアント証明書のCNには組織UUID（ハイフン付き）を設定済み

**本番環境での対応:**
- Let's Encryptまたは正式なCA証明書を使用
- 組織ごとに正式な証明書を発行・配布

### クライアント証明書の情報抽出とURLリライト

**Nginx設定例:**
```nginx
# 証明書のSubject DNから組織IDを抽出
set $client_dn $ssl_client_s_dn;

# CN抽出（証明書生成スクリプトの形式: CN={uuid}）
# 波括弧付きUUIDを抽出（例: CN={a0718dc5-21f3-44e6-87e9-cc2ae83f3385}）
if ($client_dn ~ "CN=\{([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\}") {
    set $tenant_id $1;
}

# URLにクエリパラメータを追加
# 既存のクエリパラメータがある場合は&で追加、ない場合は?で追加
set $args_separator "?";
if ($args != "") {
    set $args_separator "&";
}
rewrite ^(.*)$ $1${args_separator}orgId=$tenant_id break;

location / {
    proxy_pass http://frontend:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**結果のURL:**
```
http://localhost:3000/ → http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
http://localhost:3000/login → http://localhost:3000/login?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
http://localhost:3000/?page=1 → http://localhost:3000/?page=1&orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
```

### フロントエンドでの取得

**Next.js App Router:**
```typescript
'use client';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const organizationId = searchParams.get('orgId');
  
  // organizationIdを使用してログイン処理（UUID形式: a0718dc5-21f3-44e6-87e9-cc2ae83f3385）
}
```

### セキュリティ考慮事項
- [ ] CA証明書による署名検証
- [ ] 証明書の有効期限チェック
- [ ] 証明書のCNとDBの組織IDの一致検証
- [ ] URLパラメータの改ざん防止（証明書と一致するか検証）
- [ ] クエリパラメータのサニタイゼーション

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 証明書がブラウザにインストールされていない | 高 | 高 | 詳細なセットアップガイドの作成、エラーメッセージの改善 |
| Nginxの証明書検証が失敗する | 高 | 中 | CA証明書のパス確認、ログでのデバッグ情報出力 |
| CNのフォーマットが想定と異なる | 中 | 低 | 正規表現での柔軟な抽出、フォールバック処理 |
| URLパラメータの改ざん | 高 | 中 | バックエンドで証明書検証、改ざん検知 |
| 既存のクエリパラメータとの競合 | 低 | 低 | `&`での追加、パラメータ名の衝突回避 |

## 7. テスト計画

### 統合テスト
- [ ] Nginx + フロントエンド連携テスト
  - 証明書ありでアクセス → URLに`?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385`が追加される
  - 証明書なしでアクセス → アクセス拒否
  - 無効な証明書でアクセス → アクセス拒否
  
- [ ] フロントエンドでのパラメータ取得テスト
  - URLから組織IDを正しく取得できる
  - 組織IDが自動的にログインフォームにセットされる

### 手動テスト
- [ ] ブラウザでの証明書選択ダイアログ確認
- [ ] URLに組織IDが追加されることを確認
- [ ] 正常な組織でのログイン確認
- [ ] 異なる組織の証明書での切り替え確認
- [ ] 証明書エラー時の挙動確認

## 8. ロールバック計画

1. `docker-compose.yml` からnginxサービスをコメントアウト
2. 直接フロントエンド（3000ポート）にアクセス
3. 従来のヘッダーベース認証に戻す

## 9. 関連ドキュメント

- [既存の証明書生成スクリプト](../certs/generate-certificates.sh)
- [Nginxサンプル設定](../nginx_sample/ssl-server.conf)
- [セキュリティ規約](../.clinerules/development/security.md)
- [バックエンド規約](../.clinerules/development/backend.md)
- [フロントエンド規約](../.clinerules/development/frontend.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-10 15:00
- **承認日時**: （承認待ち）
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 計画からの変更点
（実施後に記録）

### 発生した問題と解決方法
（実施後に記録）

### 最終的な成果物
- [ ] Nginx設定ファイル
- [ ] Docker Compose設定
- [ ] フロントエンド修正（URLパラメータ取得）
- [ ] バックエンド修正（パラメータ検証）
- [ ] セットアップガイド

## 12. 振り返り

### うまくいった点
（実施後に記録）

### 改善が必要な点
（実施後に記録）

### 学んだこと
（実施後に記録）
