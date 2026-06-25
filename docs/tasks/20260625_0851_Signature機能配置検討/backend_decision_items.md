# バックエンド構築のための検討・確定事項

**作成日**: 2026-06-25  
**目的**: Signature機能（XMLDSig）と秘匿化機能（XML Encryption）のバックエンド実装に向けて、確定済み事項・確定が必要な事項を整理する  
**参照元**:
- [PLAN.md](./PLAN.md) - UI配置設計
- [signature_implementation_spec.md](./signature_implementation_spec.md) - Signature実装仕様
- [encrypted_data_summary.md](../../design/maiml/encrypted_data_summary.md) - MAIMLスキーマ暗号化仕様

---

## 📊 一覧サマリー

| # | カテゴリ | 項目 | 状態 | 仕様確認要否 |
|---|---------|------|------|------------|
| 1 | 操作順序 | 暗号化→署名の制約とUI制御 | ⚠️ 要確定 | 不要（技術的制約） |
| 2 | データベース | 署名履歴テーブルの要否 | ⚠️ 要確定 | 不要（方針決定） |
| 3 | 鍵管理 | 署名用鍵・証明書の調達方法 | ⚠️ 要確定 | 不要（技術的設計） |
| 4 | API設計 | Document保存APIへの統合 vs 独立API | ⚠️ 要確定 | **要確認** |
| 5 | XML署名 | `xml-crypto`の動作検証 | ⚠️ 要確定 | 不要（実装検証） |
| 6 | 暗号化実装 | XML Encryptionのライブラリ選定 | ⚠️ 要確定 | 不要（実装検証） |
| 7 | ストレージ | 暗号化鍵ファイルのS3パス設計 | ✅ 確定済み | — |
| 8 | 権限制御 | 署名・暗号化操作のロール権限 | ⚠️ 要確定 | **要確認** |
| 9 | アーカイブ | 連続操作時のアーカイブ数 | ✅ 確定済み | — |
| 10 | Parser連携 | `<Signature>`要素のパース除外 | ✅ 確定済み | — |

---

## ✅ 確定済み事項

### ✅ 1. アーカイブポリシー

**確定内容**: MAIMLファイル保存時は**常にアーカイブを作成**する（PLAN.md セクション6より）

- 暗号化→再署名の連続操作で2回アーカイブが作成されることは仕様として許容
- `skipArchive`オプションは追加しない

---

### ✅ 2. MAIMLパーサーでの`<Signature>`要素の扱い

**確定内容**: `maimlService.ts`の`MaimlParserTyped`では`<Signature>`要素を**無視・読み飛ばす**（signature_implementation_spec.md セクション5.3より）

- Petri Net描画・タスク生成・バリデーション等に影響させない
- 署名要素はMAIMLの業務ロジックとは無関係なメタデータとして扱う

---

### ✅ 3. 署名アルゴリズムとXML構造

**確定内容**:
- 署名アルゴリズム: **RSA-SHA256**
- 正規化: **Canonical XML 1.0 (C14N)**
- ダイジェスト: **SHA-256**
- 形式: **W3C XMLDSig**
- 配置: `<Document>`要素の**最後の子要素**として挿入
- 名前空間: `xmlns="http://www.w3.org/2000/09/xmldsig#"`

---

### ✅ 4. ストレージ設計（既存に準拠）

**確定内容**: 既存の`encryption_keys`テーブル・S3パス設計に準拠

```sql
-- 既存テーブル（backend/migrations/20260623_create_encryption_keys_table.sql）
encryption_keys (
  key_id, organization_id, key_name, key_identifier,
  algorithm, key_source, file_path, file_name, ...
)
```

```
S3/Swift: {organization_id}/keys/{key_id}.key  ← 暗号化鍵ファイル
S3/Swift: {organization_id}/certificates/{organization_id}.p12  ← 署名用証明書
```

---

### ✅ 5. 実装ファイル配置

**確定内容**（PLAN.md セクション4、signature_implementation_spec.md セクション10より）:

```
backend/src/
├── services/
│   └── maimlSignatureService.ts     ← 新規作成（署名生成・検証）
├── utils/
│   └── maimlSignatureWriter.ts      ← 新規作成（XML挿入・削除）
├── controllers/
│   └── signatureController.ts       ← 新規作成（APIハンドラ）
└── routes/
    └── projectRoutes.ts             ← /signature/* エンドポイント追記

frontend（モック実装済み）:
frontend/src/
├── types/signature.ts               ← 作成済み
├── services/signatureService.ts     ← スタブ作成済み
└── components/signature/
    ├── SignatureManagement.tsx       ← 作成済み
    └── SignatureManagementModal.tsx  ← 作成済み
```

---

## ⚠️ 要確定事項（仕様確認不要・方針決定のみ）

### ⚠️ A. 署名用鍵・証明書の調達方法

**背景**: 署名にはRSA秘密鍵と対応するX.509証明書が必要。現在の候補は3案。

**候補**:

| 案 | 方法 | メリット | デメリット |
|----|------|---------|-----------|
| **案A（推奨）** | 既存の`backend/certs/ca/ca.key`と`ca.crt`をそのまま流用 | 新規鍵不要、既存`certificateService.ts`が使える | CA鍵は本来クライアント証明書発行用（用途混在） |
| 案B | 署名専用鍵を`backend/certs/signature/`に別途生成 | 用途分離、セキュリティ向上 | 新規鍵の生成・デプロイが必要 |
| 案C | 組織ごとに署名用鍵を生成・S3保存（マルチテナント対応） | 組織ごとに独立した署名 | 実装複雑、Phase1には過剰 |

**推奨**: **案A**でPhase1実装し、将来的に案Cへ移行

**確定項目**:
- [ ] 案A / B / C のどれを採用するか

---

### ⚠️ B. 署名履歴テーブルの要否

**背景**: 署名情報をDBで管理するかどうか。

**案A: DBテーブル不要**（MAIMLファイル内の`<Signature>`要素のみで管理）
- メリット: シンプル、MAIMLファイルが自己完結
- デメリット: 署名者・署名日時をDBから一覧表示できない

**案B: `maiml_signatures`テーブルを新規作成**
```sql
CREATE TABLE maiml_signatures (
  signature_id     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID         NOT NULL,
  project_id       UUID         NOT NULL,
  signed_by        UUID,                        -- ユーザーID（NULL=システム署名）
  signed_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  signature_algorithm VARCHAR(50) NOT NULL,     -- 'rsa-sha256'
  certificate_subject TEXT,                    -- X.509証明書のSubject（組織ID等）
  is_valid         BOOLEAN      DEFAULT TRUE,  -- 最後に検証した結果
  last_verified_at TIMESTAMP,
  removed_at       TIMESTAMP,                  -- 署名削除日時（NULL=現役）
  FOREIGN KEY (organization_id) REFERENCES organization(organization_id),
  FOREIGN KEY (signed_by) REFERENCES users(user_id) ON DELETE SET NULL
);
```
- メリット: 誰が・いつ署名したか追跡可能、監査証跡
- デメリット: MAIMLファイルとDBの同期管理が必要

**確定項目**:
- [ ] DBテーブルを作成するか（案A / 案B）
- [ ] 案Bの場合、マイグレーションSQLの作成タイミング

---

### ✅ C. `xml-crypto`パッケージの動作検証（調査完了）

**調査日**: 2026-06-26  
**確認バージョン**: xml-crypto v6.1.2（最新）

| 確認項目 | 結果 | 詳細 |
|---------|------|------|
| Node.js 24.x対応 | ✅ | `engines: { node: '>=16' }` |
| TypeScript型定義 | ✅ | パッケージ本体にバンドル済み（`lib/*.d.ts`） |
| `node-forge`との競合 | ✅ なし | 依存関係が独立（`@xmldom/xmldom`, `xpath`のみ） |
| `@xmldom/xmldom`競合 | ✅ なし | 既存と同じ`@xmldom/xmldom`を使用（共有可能） |
| `enveloped-signature`対応 | ✅ | `lib/enveloped-signature.d.ts`がバンドル済み |
| XML Encryption対応 | ✅ | descriptionに"xml encryption"と明記 |

**重要**: `@types/xml-crypto` v1.4.6はv3対応の古い型定義のため**不要**。本体バンドルの型定義を使用する。

**インストールコマンド（確定）**:
```bash
# xml-cryptoのみ。@types/xml-cryptoは不要
npm install xml-crypto
```

**確認済み項目**:
- [x] xml-crypto v6.1.2 がNode.js 24.x対応
- [x] TypeScript型定義がバンドル済み（`@types/xml-crypto`不要）
- [x] `node-forge`との競合なし
- [x] `enveloped-signature`変換対応確認
- [x] XML Encryption対応確認（項目Dも同時に解決）

---

### ✅ D. XML Encryption実装のライブラリ選定（調査完了）

**調査日**: 2026-06-26（項目Cと同時に確認）

**結果**: `xml-crypto v6.1.2`でXML Encryptionも対応可能。追加パッケージ不要。

| ライブラリ | W3C準拠 | 採用判断 |
|----------|--------|---------|
| Node.js `crypto`（標準） | △（XMLへの適用は手動実装が必要） | ❌ 非採用 |
| `xml-crypto` v6.1.2 | ✅（description: "Xml digital signature and **encryption** library"） | ✅ 採用 |

**確認済み項目**:
- [x] `xml-crypto`がXML Encryptionに対応していることを確認（パッケージ説明文より）
- [ ] MAIMLスキーマの`encryptionGroup`（`childUri` / `childHash` / `childUuid`要素）への対応可否は実装時に検証

---

## ⚠️ 要確定事項（仕様確認が必要なもの）

### ✅ E. Document保存APIへの署名統合 vs 独立API（調査完了）

**調査日**: 2026-06-26（既存ルートファイル調査による）

#### 調査結果

**既存のMAIML保存API**:
```
POST /api/v1/maiml/save
  body: { content: string, archive?: boolean }
```

**既存のプロジェクトAPI パラメータ形式**: `:projectId`（UUID）を使用

#### 確定事項

**署名は独立APIとして実装する**（パターン2を採用）

理由:
- 既存の`POST /api/v1/maiml/save`は汎用MAIML保存であり、署名処理を混在させることは責務の分離に反する
- 既存`projectRoutes.ts`のパターン（`/:projectId/...`）に合わせて実装する

**確定したエンドポイント**:
```
GET  /api/v1/projects/:projectId/signature/status
POST /api/v1/projects/:projectId/signature/apply
POST /api/v1/projects/:projectId/signature/remove
```

- `:projectId`はUUID形式（既存APIに統一）
- 仕様書の`:name`表記は`:projectId`に変更確定

**署名ステータス取得の実装方式**:
- Phase 1: S3から毎回ダウンロードして解析（シンプル）
- Phase 2: `maiml_evidence`テーブルが実装されたらDBキャッシュを使用

**確認済み項目**:
- [x] Document保存APIは`POST /api/v1/maiml/save`と確認
- [x] 署名APIは独立APIとして`/:projectId/signature/*`に追加確定
- [x] パラメータは`:projectId`（UUID）に確定

---

### ⚠️ F. 暗号化操作後の署名状態制御

**背景**: 暗号化すると既存署名が無効化される（技術的制約）。この場合のUX・バックエンド動作を確定する必要がある。

**3つの設計案**:

| 案 | 動作 | バックエンドへの影響 |
|----|------|-------------------|
| **案A** | 暗号化実行後、MAIMLから`<Signature>`要素を**自動削除**。フロントに警告表示 | 暗号化APIが署名削除も行う |
| 案B | 暗号化実行後、署名は**残すが無効状態**として管理。検証時に`isValid: false`を返す | 状態管理DBが必要 |
| 案C | 署名済みの場合、暗号化操作を**禁止**（エラー返却） | シンプル、ただしUX低下 |

**確認が必要な仕様**:
- [ ] 案A / B / C のどれを採用するか（UIの要件定義に依存）
- [ ] 案Aの場合: 暗号化APIのレスポンスに`signatureRemoved: boolean`を含めるか

---

### ⚠️ G. 署名・暗号化操作の権限設計

**背景**: 仕様書（signature_implementation_spec.md セクション6.3）には以下の権限表があるが、暗号化操作の権限は未定義。

**現在の署名権限（確定済み）**:
| ロール | status取得 | apply | remove |
|--------|-----------|-------|--------|
| experiment_admin | ✅ | ✅ | ✅ |
| experiment_worker | ✅ | ❌ | ❌ |
| data_admin | ✅ | ✅ | ✅ |

**確認が必要な仕様（暗号化操作）**:
- [ ] 暗号化実行・復号化実行は誰が操作できるか？

| ロール | 暗号化実行 | 復号化実行 | 鍵管理（作成・削除） |
|--------|----------|----------|------------------|
| experiment_admin | ? | ? | ? |
| experiment_worker | ? | ?（閲覧のみ？） | ❌ |
| data_admin | ? | ? | ? |

- [ ] 権限チェックに使用する機能コード（`checkPermission('XXXXXX', 0)`）は何か？

---

## 📝 実装フェーズの提案

上記の確定状況を踏まえた実装順序の提案：

### Phase 1: 確定済み事項から先行実装

1. **`maimlSignatureWriter.ts`**（XML操作ユーティリティ）
   - `removeSignatureFromDocument()`
   - `hasSignature()`
   - `insertSignatureIntoDocument()`
   - ※ ライブラリ不要、純粋な文字列処理

2. **`maimlSignatureService.ts`** のスケルトン
   - `xml-crypto`動作検証後に本実装
   - 暫定的に`node-forge`でRSA署名生成を実装

3. **署名API 3本** (`/signature/status`, `/signature/apply`, `/signature/remove`)
   - `signatureController.ts`と`projectRoutes.ts`への追加

### Phase 2: 要確定事項の解決後に実装

4. Document保存APIへの`signatureEnabled`統合（**要確認: E**）
5. 暗号化後の署名自動削除ロジック（**要確認: F**）
6. 署名履歴DBテーブル（**要確認: B**）

### Phase 3: スタブ→本実装（暗号化機能）

7. `encryptionController.ts`のTODO部分を本実装に置き換え
   - MAIMLパース・XPath解析
   - W3C XML Encryptionによる暗号化・復号化
   - 鍵ファイルのS3保存

---

## 🔗 参考リンク

| ドキュメント | パス |
|-----------|------|
| MAIML暗号化仕様 | `docs/design/maiml/encrypted_data_summary.md` |
| MAIMLサンプルXML | `docs/design/maiml/encrypted_data_xml_samples.md` |
| 暗号化コントローラー（スタブ） | `backend/src/controllers/encryptionController.ts` |
| 暗号化鍵サービス（スタブ） | `backend/src/services/encryptionKeyService.ts` |
| 暗号化鍵テーブルDDL | `backend/migrations/20260623_create_encryption_keys_table.sql` |
| 証明書サービス | `backend/src/services/certificateService.ts` |
| MAIMLライタユーティリティ | `backend/src/utils/maimlDataWriter.ts` |
| W3C XMLDSig | https://www.w3.org/TR/xmldsig-core/ |
| W3C XML Encryption | https://www.w3.org/TR/xmlenc-core/ |

---

## 📅 変更履歴

| 日時 | 内容 |
|------|------|
| 2026-06-25 | 初版作成 |
