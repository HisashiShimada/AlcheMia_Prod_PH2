# 質問事項: 秘匿化・改竄防止機能 本実装に向けた確認事項

## 関連ドキュメント
- [タスク計画書 (PLAN.md)](./PLAN.md)

## 概要

Phase 2 実装で次フェーズに持ち越した以下5項目について、本実装に着手するために  
確定が必要な事項を整理する。

| # | 対象メソッド | 確定待ちの分類 |
|---|---|---|
| Q1 | `validateEncryptionScope` | MAIMLスキーマ仕様 |
| Q2 | `embedTimestampToken` / `extractTimestampToken` | MAIMLスキーマ仕様 |
| Q3 | `verifyTimestampToken` | 外部サービス選定 |
| Q4 | `validateSignerCertificate` / `validateTsaCertificate` の失効確認 | 運用・PKI方式 |
| Q5 | `integrity_audit_log` テーブル設計 | 運用要件 |

---

## Q1. validateEncryptionScope（UPA制約チェック）

**対象ファイル**: `backend/src/services/maimlEncryptionService.ts`  
**現在の状態**: スタブ（常に `isValid: true` を返す）

### 確定が必要な事項

暗号化を許可する XML 要素・XPath パターンのホワイトリスト仕様。

現在は以下の2パターンが候補として挙げられているが、これ以外に許可すべきパターンがあるかどうかが不明。
- グローバル要素全体（`uuid` 要素を除く）
- 汎用データコンテナのコンテンツ全体

また、許可するパターンを **XPath** で表現するか、**要素名のホワイトリスト**（文字列一致）で表現するかも要確認。

### 回答後にできること

暗号化許可パスの判定ロジックを実装し、不正なスコープ指定で暗号化しようとした場合に `isValid: false` を返せるようにする。

---

## Q2. embedTimestampToken / extractTimestampToken（XML DOM 書き込み化）

**対象ファイル**: `backend/src/services/maimlIntegrityService.ts`  
**現在の状態**: インメモリ `Map<string, TimestampToken>` で代用中（ファイル永続化なし）

### 確定が必要な事項

MAIML XML スキーマ（XSD）上で `<SignatureProperty Target="#{signatureId}">` を  
**どの親要素の子として、どの階層に配置するか**。

具体的には以下を確認したい。

1. `<SignatureProperties>` は `<Signature>` 直下に置くか、それとも別の要素（例: `<maiml:security>` 等）を新設するか
2. MAIML XSD に `<SignatureProperties>` の定義を追加するか、anyType で受け入れるか
3. タイムスタンプトークンの値は Base64 文字列のまま格納するか、それとも専用サブ要素を設けるか

### 回答後にできること

インメモリ Map を廃止し、実際の MAIML XML ファイルへの `<SignatureProperty>` 書き込み・読み出しを DOM 操作で実装できる。

---

## Q3. verifyTimestampToken（タイムスタンプ検証ロジック）

**対象ファイル**: `backend/src/services/maimlIntegrityService.ts`  
**現在の状態**: `local-mock-tsa` トークンは常に有効として返すスタブ

### 確定が必要な事項

利用する**外部 TSA（タイムスタンプ局）サービスの選定・契約・エンドポイント情報**。

RFC 3161 準拠の TSA が前提となるが、具体的なサービスが決まらないと  
応答フォーマット（DER エンコード TimeStampToken）の解析実装や  
TSA 証明書チェーンの検証ロジックが書けない。

候補として想定されるもの（要選定）:
- セコムトラストシステムズ パスポート for Time
- GMO グローバルサイン タイムスタンプ
- Amazon Trust Services（RFC 3161 対応有無を要確認）
- 自組織内タイムスタンプサーバー構築

### 回答後にできること

外部 TSA との HTTP 通信・DER 応答解析・トークン署名の検証ロジックを  
`requestTimestamp` / `verifyTimestampToken` の本実装として記述できる。

---

## Q4. CRL / OCSP による証明書失効確認

**対象ファイル**: `backend/src/services/maimlIntegrityService.ts`  
（`validateSignerCertificate` / `validateTsaCertificate`）  
**現在の状態**: 有効期限・発行者のチェックのみ実装済み（失効確認は未実装、TODO コメントあり）

### 確定が必要な事項

**証明書運用方式**（以下どちらか）と、それに応じた失効確認の仕組み。

| 方式 | 内容 | CRL/OCSP の扱い |
|---|---|---|
| A. 自己 CA 継続 | `backend/scripts/generate-ca-certificate.ts` の CA を引き続き使用 | CRL ファイルを自前で生成・公開する仕組みが必要 |
| B. 外部パブリック CA 移行 | Let's Encrypt / DigiCert 等のパブリック CA を使用 | CA 側の OCSP レスポンダを使用できる |

また、失効確認を**同期**（リクエスト時にリアルタイムで確認）で行うか、  
**キャッシュ付き非同期**（一定時間ごとにCRLを取得してキャッシュ）で行うかも要確認。

### 回答後にできること

`validatePemCertificate` 内に CRL ダウンロード + 照合、または OCSP リクエスト + 検証のロジックを追加できる。

---

## Q5. integrity_audit_log テーブル設計の見直し

**対象ファイル**: `backend/migrations/20260716_create_integrity_audit_log_table.sql`  
**現在の状態**: 最小限のカラム構成（仮DDL）

### 確定が必要な事項

本番運用要件として以下を確認したい。

1. **監査ログの保持期間**  
   法規制・社内規定上の要件はあるか（例: 7年保持など）

2. **検索軸・追跡単位**  
   「どのプロジェクト・タスクに対して実行したか」を追跡する要件があるか  
   → あれば `project_id` / `task_id` 外部キーを追加する必要がある

3. **監査ログ自体の完全性保証**  
   監査ログレコードが改竄されていないことを証明する仕組み（ハッシュチェーン等）が必要か

4. **削除・更新の制御**  
   監査ログは Append-only（INSERT のみ許可・UPDATE/DELETE 禁止）にする運用ルールが必要か

### 回答後にできること

保持期間・外部キー・ハッシュチェーン等を盛り込んだ最終 DDL を確定し、  
migration ファイルを本番対応版に更新できる。

---

## 回答記入欄

| # | 質問の要点 | 回答 | 回答日 | 回答者 |
|---|---|---|---|---|
| Q1 | 暗号化許可XPathパターンのホワイトリスト仕様 | | | |
| Q2 | MAIMLスキーマ上のSignatureProperty格納位置 | | | |
| Q3 | 利用する外部TSAサービスの選定 | | | |
| Q4 | 証明書運用方式（自己CA継続 or 外部CA移行）とCRL/OCSP方針 | | | |
| Q5 | 監査ログの保持期間・検索軸・完全性保証要否 | | | |
