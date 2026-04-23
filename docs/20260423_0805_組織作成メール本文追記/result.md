# 対応結果: 組織作成メール本文へのクライアント証明書送付案内追記

## 対応日時
2026-04-23 08:07〜08:10

## 変更ファイル

| ファイル | 変更種別 |
|---|---|
| `backend/src/services/emailService.ts` | 修正 |

## 変更内容

### 変更箇所
`EmailService` クラス内の組織登録完了メール本文生成メソッド2つを修正。

---

### ① テキスト版: `createOrganizationCreatedTextContent()`

**変更前:**
```
初回ログイン後、必ず新しいパスワードに変更してください。

このメールに心当たりがない場合は、管理者にお問い合わせください。
```

**変更後:**
```
初回ログイン後、必ず新しいパスワードに変更してください。

【重要】クライアント証明書について
MMDPFへのログインには、クライアント証明書（.p12ファイル）が必要です。
クライアント証明書は別途ご担当者よりお送りします。
証明書が届き次第、ブラウザにインストールしてからログインしてください。

このメールに心当たりがない場合は、管理者にお問い合わせください。
```

---

### ② HTML版: `createOrganizationCreatedHtmlContent()`

**追加CSS（`<style>` 内）:**
```css
.cert-notice { background-color: #e8f4f8; border-left: 4px solid #0093CF; padding: 15px; margin: 20px 0; }
```

**追加HTML（「ログインページへ」ボタンの直後）:**
```html
<div class="cert-notice">
  <p><strong>🔐 クライアント証明書について（重要）</strong></p>
  <ul style="margin: 10px 0; padding-left: 20px;">
    <li>MMDPFへのログインには、クライアント証明書（.p12ファイル）が必要です。</li>
    <li>クライアント証明書は<strong>別途ご担当者よりお送りします</strong>。</li>
    <li>証明書が届き次第、ブラウザにインストールしてからログインしてください。</li>
  </ul>
</div>
```

---

## 影響範囲

- **対象**: 組織新規作成時に送信される登録完了メール
  - フォームからの個別作成（`POST /api/v1/systemManagement/organization`）
  - CSVアップロードによる一括作成（`POST /api/v1/provider/organization/upload-csv`）
- **対象外**: ユーザーアカウント作成メール、PIN認証メール、一時パスワードメール、組織編集・ステータス変更時のメール
