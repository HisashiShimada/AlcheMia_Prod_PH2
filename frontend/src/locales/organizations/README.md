# 組織ごとのカスタム翻訳

## 概要

このディレクトリには、組織（テナント）ごとにカスタマイズされた翻訳ファイルを配置します。

ベース翻訳（`ja.json`, `en.json`）に対して、組織固有のラベルや表記を上書きできます。

## 使用方法

### 1. カスタム翻訳ファイルの作成

組織IDに基づいたJSONファイルを作成します。

**ファイル命名規則:**
- `org_{organization_id}.json`

**例:**
- `org_tenant_a.json` - Tenant A組織用
- `org_tenant_b.json` - Tenant B組織用
- `org_acme_corp.json` - ACME Corp組織用

### 2. カスタム翻訳の記述

ベース翻訳と同じ構造で、上書きしたい項目のみを記述します。

```json
{
  "common": {
    "appName": "カスタム組織名",
    "appSubtitle": "カスタムサブタイトル"
  },
  "menu": {
    "system_admin": {
      "title": "カスタムメニュータイトル",
      "tabs": {
        "userManagement": "カスタムユーザー管理"
      }
    }
  }
}
```

**重要な点:**
- 上書きしたい項目のみを記述すればOK
- 記述していない項目はベース翻訳にフォールバック
- ネストされたオブジェクトも部分的に上書き可能

### 3. アプリケーションでの使用

`LanguageProvider`に`organizationId`を渡すだけで自動的にカスタム翻訳がロードされます。

```tsx
import { LanguageProvider } from '@/contexts/LanguageContext';

function App() {
  const user = getCurrentUser(); // ユーザー情報取得

  return (
    <LanguageProvider
      organizationId={user.organizationId} // 例: "tenant_a"
    >
      {/* アプリケーション */}
    </LanguageProvider>
  );
}
```

## 動作の仕組み

### フォールバック機構

1. **カスタム翻訳あり**: カスタム翻訳の値を使用
2. **カスタム翻訳なし**: ベース翻訳（`ja.json`, `en.json`）の値を使用
3. **キーが見つからない**: キー自体を返す（例: `"menu.notfound"` → `"menu.notfound"`）

### マージの例

**ベース翻訳（`ja.json`）:**
```json
{
  "common": {
    "appName": "MMDPF",
    "appSubtitle": "マルチモーダルデータプラットフォーム",
    "login": "ログイン"
  }
}
```

**カスタム翻訳（`org_tenant_a.json`）:**
```json
{
  "common": {
    "appName": "Tenant A Custom Name"
  }
}
```

**マージ結果:**
```json
{
  "common": {
    "appName": "Tenant A Custom Name",          // カスタム翻訳
    "appSubtitle": "マルチモーダルデータプラットフォーム", // ベース翻訳
    "login": "ログイン"                          // ベース翻訳
  }
}
```

## サンプルファイル

このディレクトリには以下のサンプルファイルが含まれています：

### `org_tenant_a.json`
- アプリ名とサブタイトルをカスタマイズ
- システム管理者メニューのタイトルとユーザー管理タブをカスタマイズ

### `org_tenant_b.json`
- アプリ名とサブタイトルを研究所向けにカスタマイズ
- 実験管理者メニューをプロジェクト管理用にカスタマイズ

### `org_tenant_c.json`
- アプリ名とサブタイトルを英語にカスタマイズ
- データ管理者メニューをシステム名称でカスタマイズ

## 新しい組織の追加

1. **新しいJSONファイルを作成**
   ```bash
   frontend/src/locales/organizations/org_{new_organization_id}.json
   ```

2. **カスタム翻訳を記述**
   ```json
   {
     "common": {
       "appName": "新しい組織名"
     }
   }
   ```

3. **プログラム修正は不要**
   - ファイルを追加するだけで自動的に認識されます
   - 再ビルドやデプロイは必要

## トラブルシューティング

### カスタム翻訳が読み込まれない

**原因1: ファイル名が正しくない**
- `org_` プレフィックスが必要です
- 組織IDと一致していることを確認してください

**原因2: JSON形式が不正**
- JSONLint などで構文チェックしてください
- 最後のカンマに注意（JSONでは不要）

**原因3: 組織IDが渡されていない**
- `LanguageProvider`に`organizationId`が正しく渡されているか確認

### デバッグ

ブラウザのコンソールに以下のログが出力されます：

```
Loaded custom translations for: org_tenant_a
```

カスタム翻訳ファイルが見つからない場合：

```
No custom translations found for organization: tenant_a
```

## ベストプラクティス

### DO（推奨）
✅ 必要な項目のみを上書きする
✅ ベース翻訳と同じ構造を維持する
✅ わかりやすいコメントを残す（JSON5形式ではないので実際のコメントは不可）
✅ ファイル名は小文字とアンダースコアを使用

### DON'T（非推奨）
❌ ベース翻訳全体をコピーしない
❌ 不要な項目を含めない
❌ 組織間で翻訳ファイルを共有しない
❌ 機密情報を翻訳ファイルに含めない

## 参考情報

- ベース翻訳: `frontend/src/locales/ja.json`, `en.json`
- 実装: `frontend/src/contexts/LanguageContext.tsx`
- ユーティリティ: `frontend/src/utils/deepMerge.ts`
