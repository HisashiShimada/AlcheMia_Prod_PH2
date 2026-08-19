# グローバル名前空間宣言 — テンプレート仕様

## 概要

ファイルサーバ上のグローバル名前空間宣言ファイル（`system/namespaces/global-declarations.csv`）の
初期化に使用するテンプレート。

ProviderMenu の「名前空間管理」タブにある **「インポート」ボタン** から
このファイルをアップロードすることでファイルサーバを初期化する。

---

## テンプレートファイル

[global-declarations-template.csv](./global-declarations-template.csv)

```csv
prefix,uri
maiml,http://www.maiml.org/schemas
xsi,http://www.w3.org/2001/XMLSchema-instance
Alchemia,https://Alchemia.co.jp
```

---

## 登録内容と根拠

| prefix | URI | 説明 |
|--------|-----|------|
| `maiml` | `http://www.maiml.org/schemas` | MAIMLスキーマのデフォルト名前空間。注入時に `xmlns="http://www.maiml.org/schemas"` として出力される |
| `xsi` | `http://www.w3.org/2001/XMLSchema-instance` | XML Schema Instance 名前空間。`xsi:type` 属性等で使用 |
| `Alchemia` | `https://Alchemia.co.jp` | AlcheMia システム共通の組織 prefix |

### CSV に含めない属性

| 属性 | 理由 |
|------|------|
| `xsi:schemaLocation="http://www.maiml.org/schemas maiml.xsd"` | 名前空間 URI ではなくスキーマファイルパスを示す属性のため CSV 管理対象外。ハードコードのまま維持 |

---

## CSV フォーマット仕様

```
prefix,uri
{XML prefix},{名前空間 URI}
```

- 1行目はヘッダー行（`prefix,uri` 固定）
- prefix は XML の NCName 規則に準拠（英数字・ハイフン・アンダースコア、先頭は英字）
- `maiml` prefix は注入処理内で `prefix=''` に変換され `xmlns="uri"` 形式で出力される
- URI はスキーム付きの完全な URI（例: `https://...`）
- 空行は無視される
- BOM（UTF-8 BOM）は自動除去される

---

## 注意事項

- インポートは**上書き**のため、既存の宣言はすべて置き換えられる
- インポート前に現在のファイルを**エクスポートでバックアップ**することを推奨
- ファイルサーバに `global-declarations.csv` が存在しない場合（初回・削除後）は
  xmlns 宣言が一切注入されないため、必ず初期化を先に行うこと
