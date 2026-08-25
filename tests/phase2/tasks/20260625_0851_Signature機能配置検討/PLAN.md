# 検討ドキュメント：Signature機能（改ざん防止）の配置設計

## メタデータ
- **作成日時**: 2026-06-25 08:51
- **タスクID**: Signature機能配置検討
- **ステータス**: 検討中（次の議論に向けて整理）

---

## 1. 背景・目的

MAIMLファイルのDocumentタグに`ds:Signature`要素を書き込む改ざん防止機能を実装する。  
この機能をシステムのどこに配置すべきかを検討した。

### 関連仕様
- `docs/design/maiml/encrypted_data_xml_samples.md` - サンプル7: document要素の電子署名
- `docs/design/maiml/encrypted_data_summary.md` - XMLDSig仕様概要
- W3C XMLDSig仕様（`ds:Signature`、RSA-SHA256）

---

## 2. Signature要素の仕様

### MAIMLにおけるSignatureの位置
```xml
<document id="doc-001"
          xmlns="http://www.maiml.org/schemas"
          xmlns:ds="http://www.w3.org/2000/09/xmldsig#">

  <!-- ds:Signature: document直下に0または1つ配置 -->
  <ds:Signature Id="sig-001">
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <ds:Reference URI="#doc-001">
        <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <ds:DigestValue>digestValueBase64EncodedHere==</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>signatureValueBase64EncodedHere==</ds:SignatureValue>
    <ds:KeyInfo>
      <ds:X509Data>
        <ds:X509Certificate>MIICaj...</ds:X509Certificate>
      </ds:X509Data>
    </ds:KeyInfo>
  </ds:Signature>

  <!-- 以降: globalObjectContentGroup -->
  <uuid>...</uuid>
  <name>...</name>
  ...
</document>
```

### 重要な制約
- **暗号化との関係**: 暗号化を実施するとXML内容が変わるため、既存のSignatureが無効化される
- **再署名の必要性**: 暗号化後は必ず再署名が必要
- **アーカイブ仕様**: MAIMLファイルを保存するたびにアーカイブ（`archive/{name}_v{n}.maiml`）が作成される（変更不可の仕様）

---

## 3. 検討結果：UI配置（2箇所配置）

### 結論
署名機能は以下の**2箇所**に配置する。

---

### 配置1: Document編集ダイアログ（計画段階の署名）

**ファイル**: `frontend/src/components/editorv2/components/DocumentEditDialog.tsx`  
**仕様書**: `docs/design/ui/experiment_admin/04_maiml_editor/document/ui_document_edit_dialog.md`

**目的**:
- MAIMLファイル作成・編集時に**同時に**署名を行う
- Document保存と署名が1回の保存処理で完了するため、アーカイブも1回のみ作成される

**UI設計**:
```
┌─────────────────────────────────────────────────────────────┐
│ Document編集                                          [×]   │
├─────────────────────────────────────────────────────────────┤
│ ▼ 基本プロパティ / MaiML ID属性 / Creator/Vendor/Owner...  │
│                                                             │
│ ▼ XML署名（改ざん防止）← 現状維持                           │
│   □ 改ざん防止のためのXML署名を行う                         │
│   ※ 保存時に自動的に署名が追加されます                     │
│                                                             │
│ [キャンセル]  [💾 Document保存]                             │
└─────────────────────────────────────────────────────────────┘
```

**処理フロー**:
```
1. Document編集内容を確定
2. signatureEnabled=true の場合 →
   a. Document要素のXMLを正規化
   b. maimlSignatureService.generateSignatureElement() を呼び出し
   c. Signature要素をDocument直下に挿入
3. MAIMLファイルを保存（アーカイブ作成 1回）
```

---

### 配置2: セキュリティ設定モーダル（完了時点の署名・再署名）

**ファイル（拡張予定）**: `frontend/src/components/encryption/EncryptionManagementModal.tsx`  
**新名称（案）**: セキュリティ設定モーダル（EncryptionManagement → SecurityManagement）

**目的**:
- 暗号化後の**再署名**
- 既存MAIMLファイルへの**後付け署名**
- 署名状態の確認・削除

**UI設計**:
```
┌──────────────────────────────────────────────────────┐
│ セキュリティ設定                              [×]    │
├──────────────────────────────────────────────────────┤
│ ◆ 電子署名（改ざん防止）                             │
│   現在の状態: ✅ 署名済み / ⚠️ 署名なし / ⚠️ 無効     │
│                                                      │
│   [📝 署名を実行]  [🗑️ 署名を削除]                  │
│   ※ 署名を実行するとアーカイブファイルが作成されます │
│                                                      │
│ ◆ 暗号化設定（既存機能）                             │
│   - MAIMLタグ構造ツリー                              │
│   - 暗号化対象選択 / アルゴリズム選択                │
│   [🔒 暗号化を実行]                                  │
│                                                      │
│ ⚠️ 注意事項                                          │
│ • 暗号化を実行すると、既存の署名は無効化されます     │
│ • 暗号化後に再度署名を実行してください               │
└──────────────────────────────────────────────────────┘
```

**処理フロー（「署名を実行」クリック時）**:
```
1. 現在のMAIMLファイルをダウンロード
2. 既存のSignature要素があれば削除
3. maimlSignatureService.generateSignatureElement() を呼び出し
4. 新しいSignature要素をDocument直下に挿入
5. MAIMLファイルを保存（アーカイブ作成 1回）← 仕様なので仕方ない
```

**暗号化→再署名の連続操作**:
```
1. 暗号化実行 → アーカイブ作成 (v_n)
2. 再署名実行 → アーカイブ作成 (v_n+1)
合計2回アーカイブ作成 ← 仕様として許容
```

---

## 4. バックエンド実装構成

### 4.1 maimlSignatureService.ts（新規作成）

**ファイルパス**: `backend/src/services/maimlSignatureService.ts`

**責務**:
- RSA-SHA256署名の生成
- XML正規化（C14N）
- SHA-256ダイジェスト計算
- `ds:Signature`要素のXML文字列生成
- 署名検証（将来実装予定）

**インターフェース設計（案）**:
```typescript
class MaimlSignatureService {
  /**
   * Document要素に対するds:Signature要素を生成
   *
   * @param documentId - document要素のid属性値
   * @param maimlContent - MAIML XML文字列（署名対象の特定に使用）
   * @param organizationId - 組織ID（証明書取得用）
   * @returns <ds:Signature>...</ds:Signature> のXML文字列
   */
  async generateSignatureElement(
    documentId: string,
    maimlContent: string,
    organizationId: string
  ): Promise<string>;

  /**
   * 署名の検証（将来実装）
   */
  async verifySignature(
    maimlContent: string,
    organizationId: string
  ): Promise<boolean>;
}
```

**依存関係**:
- `certificateService.ts`（X.509証明書取得）
- `crypto`（Node.js標準ライブラリ、署名生成）
- XML正規化ライブラリ（→ 5.2参照）

---

### 4.2 maimlSignatureWriter.ts（新規作成）

**ファイルパス**: `backend/src/utils/maimlSignatureWriter.ts`

**責務**:
- MAIML XML文字列の`<document>`直下への`<ds:Signature>`挿入
- 既存Signature要素の削除
- Signature要素の存在確認

**インターフェース設計（案）**:
```typescript
/**
 * MAIML XML文字列の<document>直下に<ds:Signature>を挿入
 * 既存のSignature要素があれば削除してから挿入
 */
export function insertSignatureIntoDocument(
  maimlContent: string,
  signatureXml: string
): string;

/**
 * MAIML XML文字列から<ds:Signature>を削除
 */
export function removeSignatureFromDocument(
  maimlContent: string
): string;

/**
 * MAIML XML文字列に<ds:Signature>が存在するか確認
 */
export function hasSignature(maimlContent: string): boolean;

/**
 * 既存の<ds:Signature>が現在のDocument内容と一致するか（有効か）確認
 * ※ 将来の検証機能で使用予定
 */
export function extractDocumentForSigning(
  maimlContent: string
): { documentId: string; documentContent: string } | null;
```

---

### 4.3 APIエンドポイントの追加（案）

#### Document保存APIの拡張

**エンドポイント**: 既存のDocument保存APIに`signatureEnabled`フラグを追加

```typescript
// リクエストボディに追加
interface SaveDocumentRequest {
  documentData: DocumentData;
  signatureEnabled: boolean;  // ← 新規追加
}

// バックエンド処理で署名を同時実行
if (request.signatureEnabled) {
  const signatureXml = await maimlSignatureService.generateSignatureElement(
    documentData.id,
    maimlContent,
    organizationId
  );
  updatedMaiml = insertSignatureIntoDocument(updatedMaiml, signatureXml);
}
```

#### セキュリティ設定モーダル用API（新規）

**エンドポイント**: `POST /api/v1/maiml/apply-signature`

```typescript
interface ApplySignatureRequest {
  projectId: string;
  action: 'sign' | 'remove';
}

interface ApplySignatureResponse {
  success: boolean;
  signatureStatus: 'signed' | 'removed' | 'invalid';
  message?: string;
}
```

---

## 5. 技術選定

### 5.1 署名・暗号化ライブラリ

| 用途 | ライブラリ | 備考 |
|------|-----------|------|
| RSA署名生成 | `crypto`（Node.js標準） | `crypto.createSign('SHA256')` |
| X.509証明書操作 | `node-forge` | 既に`certificateService.ts`で使用中 |

### 5.2 XML正規化（C14N）ライブラリ候補

| ライブラリ | メリット | デメリット |
|----------|---------|-----------|
| `xml-crypto` | Node.js特化、軽量、XMLDSig対応 | メンテナンス状況の確認が必要 |
| `xmldsigjs` | W3C XMLDSig完全対応 | 重い、ブラウザ向け設計 |
| `xml-c14n` | C14N専用、シンプル | 機能が限定的 |

**推奨**: `xml-crypto`で試し、問題があれば他を検討

---

## 6. アーカイブポリシー（確定事項）

- **方針**: MAIMLファイルの保存時は**常にアーカイブを作成**する
- **`skipArchive`オプションは追加しない**
- 暗号化→再署名の連続操作でアーカイブが2回作成されることは**仕様として許容**
- 理由: 「一度保存したファイルを編集した場合はバックアップをする必要がある」（プロジェクト要件）

---

## 7. 今後の検討事項

以下は次回の議論に持ち越す：

### 7.1 計画段階署名の詳細設計
- Document編集ダイアログの保存APIフローの詳細確認
- 現在の保存APIのエンドポイント・処理フローの調査

### 7.2 セキュリティ設定モーダルの改修範囲
- 暗号化管理モーダル（`EncryptionManagementModal.tsx`）をどこまで改修するか
- コンポーネント名を変更するか、そのままにするか

### 7.3 署名の有効性確認
- 署名後に暗号化した場合、UIで「署名が無効化されました」と警告するか
- 署名状態を保持するDB管理が必要か（file_metadataテーブルの拡張）

### 7.4 XML正規化の実装確認
- `xml-crypto`での実装可能性の検証
- 既存のMAIMLパーサーとの連携方法

### 7.5 暗号化機能との整合性
- 暗号化実行後の自動再署名オプション（UXの改善として）

---

## 8. 変更履歴

| 日時 | 内容 |
|------|------|
| 2026-06-25 | 初版作成（検討内容のまとめ） |
