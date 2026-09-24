# 調査レポート: BulkUploadDialog 本番環境 HTTP 403 エラー

## メタデータ

- **作成日時**: 2026-09-18 15:00
- **タスクID**: 20260918_1500
- **種別**: 障害調査
- **対象コンポーネント**: `frontend/src/components/project/BulkUploadDialog.tsx`

---

## 1. 事象

### 報告内容

`BulkUploadDialog.tsx` の `handleUpload` 処理にて、本番環境で HTTP ステータス **403（アクセス拒否）** が返される。

### 観測された挙動

| 処理 | 結果 |
|------|------|
| `initBatch`（`POST /api/v1/files/batches/init`） | ✅ 正常完了 |
| `uploadFiles`（`POST /api/v1/files/upload`） | ❌ 403 エラー |

- `uploadFiles` 呼び出し以降の `console.log` がサーバーログに**一切出力されない**
- バックエンドの `fileAccessController.ts` 冒頭の `console.log` も出力されない
- **20KB 程度の小さなファイルでも同様に 403 が返る**（ファイルサイズは無関係）

---

## 2. 調査対象ファイル

| ファイル | 内容 |
|----------|------|
| `frontend/src/components/project/BulkUploadDialog.tsx` | アップロードUI・handleUpload処理 |
| `frontend/src/services/fileAccessService.ts` | uploadFiles / initBatch サービス関数 |
| `frontend/src/utils/authUtils.ts` | createApiClient（Axios インスタンス生成） |
| `backend/src/controllers/fileAccessController.ts` | uploadFiles Controller |
| `backend/src/routes/fileAccessRoutes.ts` | ルーティング定義・multer 設定 |
| `backend/src/middleware/authMiddleware.ts` | JWT 認証ミドルウェア |
| `config/nginx/nginx.prod.conf` | 本番 Nginx 設定 |

---

## 3. 原因分析

### 3-1. Controller 未到達の確認

バックエンドの `fileAccessController.ts` の `uploadFiles` 関数は以下の順序でミドルウェアを経由する。

```
[Nginx / ALB] → authMiddleware → multer → バリデーション → uploadFiles Controller
```

`initBatch` は正常に到達しているため **authMiddleware（JWT 認証）は通過している**。
`uploadFiles` の Controller 冒頭ログが出ていないことから、**Nginx または ALB の段階でリクエストが遮断されている**と判断できる。

### 3-2. initBatch と uploadFiles のリクエスト差異

| 項目 | initBatch | uploadFiles |
|------|-----------|-------------|
| メソッド | POST | POST |
| Content-Type | `application/json` | **`multipart/form-data`** |
| ボディ内容 | JSON（数十バイト） | **ファイル本体を含む multipart** |
| 認証 | Bearer トークン | Bearer トークン |

**唯一の差異は `Content-Type` とボディにファイル本体が含まれること。**

### 3-3. Nginx 設定の確認結果

`nginx.prod.conf` には以下の **2 つのサーバーブロック**が存在する。

```nginx
http {
    client_max_body_size 500M;   # ← http{} ブロック直下（44行目）
    client_body_timeout 300s;

    # HTTPS:443 サーバーブロック
    server { listen 443 ssl http2; ... }

    # HTTP:80 サーバーブロック（ALB + HTTP:80 構成用）
    server {
        listen 80;
        # ← 修正前: client_max_body_size の記述なし
    }
}
```

`http {}` ブロックに書かれた `client_max_body_size 500M` は理論上 `server {}` に継承されるが、
**ALB が前段に存在する場合、Nginx より手前で拒否が発生するため Nginx の設定は無関係**になりうる。

### 3-4. 根本原因（最有力）

**20KB のファイルでも 403 が返ることから、ファイルサイズは原因ではない。**
`multipart/form-data` のリクエストボディ（ファイルコンテンツ）が **AWS WAF のマネージドルール**に引っかかっていると判断する。

ALB 前段の WAF が `multipart/form-data` ボディを**スキャン対象**とするのに対し、
`application/json` の `initBatch` はスキャン対象外または引っかからないため通過する。

---

## 4. AWS WAF で 403 を返す可能性が高いルール

可能性の高い順に列挙する。

### 第 1 位: `CrossSiteScripting_BODY`（最有力）

| 項目 | 内容 |
|------|------|
| ルールセット | `AWSManagedRulesCommonRuleSet` |
| 検出パターン | ボディ内の `<tag>` 形式の文字列を XSS と判定 |
| **該当理由** | **MAIMLファイルは XML 形式のため `<tag>` が大量に含まれ、誤検知される可能性が極めて高い** |

MAIML ファイルのアップロード時に特に発生しやすいが、
`multipart` ボディ内のファイル名やパス文字列のスキャン次第で、
XML 以外のファイルでも発生する可能性がある。

### 第 2 位: `GenericRFI_BODY`

| 項目 | 内容 |
|------|------|
| ルールセット | `AWSManagedRulesCommonRuleSet` |
| 検出パターン | ボディ内の URL 形式・ファイルパス形式の文字列を Remote File Inclusion と判定 |
| 該当理由 | `targetPath`（`projects/xxx/rawdata` 等）やファイルパスが含まれる |

### 第 3 位: `Log4JRCE`

| 項目 | 内容 |
|------|------|
| ルールセット | `AWSManagedRulesKnownBadInputsRuleSet` |
| 検出パターン | ボディ内の `${` パターンを Log4Shell として検出 |
| 該当理由 | JSON メタデータ（`batchId` 等）や MAIML 内に `${` が含まれる場合 |

### 第 4 位: `RestrictedExtensions_BODY`

| 項目 | 内容 |
|------|------|
| ルールセット | `AWSManagedRulesCommonRuleSet` |
| 検出パターン | ボディ内の非標準拡張子ファイル名をブロック |
| 該当理由 | `.maiml` 拡張子が非標準として検出される可能性がある |

### 第 5 位: ALB リスナーカスタムルール

WAF を使用していない場合でも、ALB のリスナールールに
`HTTP ヘッダー・パス・クエリ条件` で 403 固定返却するルールが設定されている可能性がある。

---

## 5. 切り分け手順

### Step 1: WAF サンプルリクエスト確認（最短・最重要）

```
AWS コンソール
→ WAF & Shield
→ Web ACLs
→ 対象の ACL を選択
→「Traffic overview」または「Sampled requests」タブ
→ ブロックされたリクエストの「Rule」列を確認
```

**ここで表示されるルール名が直接的な原因。**

### Step 2: ALB アクセスログ確認

ALB アクセスログが S3 に出力されている場合、以下フィールドを確認する。

| フィールド | 確認内容 |
|------------|----------|
| `actions_executed` | `waf` → WAF が拒否、`fixed-response` → リスナールールが拒否 |
| `redirect_url` | リダイレクト先 |
| `target_status_code` | バックエンドへ到達した場合のステータス |

`target_status_code` が空（`-`）であれば、バックエンドには届いておらず ALB/WAF 段階での拒否と確定する。

### Step 3: WAF なしの確認

WAF を使用していない場合は、`nginx.prod.conf` の設定が有効かどうかを確認する。

---

## 6. 暫定対処（実施済み）

`nginx.prod.conf` の HTTP:80 サーバーブロックに `client_max_body_size` を明示追加した。
（`http {}` ブロックからの継承に依存しない形に修正）

### 変更ファイル

**`config/nginx/nginx.prod.conf`**

```diff
  server {
      listen 80;
      listen [::]:80;
      server_name localhost;

+     # Phase1-2: ファイルサイズ上限（http{} ブロック継承の保険として明示）
+     client_max_body_size 500M;
+     client_body_timeout 300s;
+
      # ECS ヘルスチェック用エンドポイント
```

> ⚠️ この修正は「保険的な対処」である。
> **20KB のファイルでも 403 が返る事象に対しては効果がない。**
> 本事象の根本原因は WAF ルールにある可能性が高く、上記の切り分け手順で特定する必要がある。

---

## 7. 恒久対処（WAF が原因と確定した場合）

### 方針 A: アップロードパスを WAF 対象外にする（推奨）

WAF の Web ACL に **除外ルール（Rule Exclusion）** を追加し、
`/api/v1/files/upload` へのリクエストを問題のルールのスキャン対象外にする。

```
AWS コンソール
→ WAF & Shield
→ Web ACLs → 対象 ACL
→ Rules タブ → 該当ルールグループ → Edit
→「Add rule exclusion」→ URI パスに /api/v1/files/upload を指定
```

### 方針 B: 問題のルールを COUNT モードに変更

ルールを `Block` → `Count` に変更することで、403 は返さなくなる。
ただし、**セキュリティ強度が下がる**ため、方針 A を優先する。

### 方針 C: ALB リスナールールにカスタム条件を追加

WAF を使わずに ALB リスナーで制御している場合は、
`/api/v1/files/upload` に対するルールを見直す。

---

## 8. 関連ファイル

| ファイル | 役割 |
|----------|------|
| `frontend/src/components/project/BulkUploadDialog.tsx` | アップロード UI |
| `frontend/src/services/fileAccessService.ts` | uploadFiles / initBatch |
| `backend/src/controllers/fileAccessController.ts` | バックエンド Controller |
| `backend/src/routes/fileAccessRoutes.ts` | ルーティング・multer 設定（上限 500MB） |
| `config/nginx/nginx.prod.conf` | 本番 Nginx 設定（今回修正済み） |
