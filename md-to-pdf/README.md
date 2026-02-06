# Markdown to PDF 変換ツール

mmdpfプロジェクトの設計ドキュメント（Markdownファイル）をPDF化するためのツールです。

## 📋 概要

`docs/design/` 配下のMarkdownファイルを高品質なPDFに一括変換します。顧客への納品ドキュメント作成やドキュメント管理に使用できます。

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
cd md-to-pdf
npm install
```

初回実行時にChromium（約300MB）が自動的にダウンロードされます。

## 📖 使用方法

### デフォルト実行（docs/design/ を一括変換）

```bash
npm run convert
```

**出力先**: `md-to-pdf/output/`

### 単一ファイルの変換

```bash
node convert.js <入力ファイル.md>
```

**例**:
```bash
node convert.js ../docs/design/viewer_layout_logic.md
```

出力ファイル名は自動的に `.pdf` に変更されます。

### 入力・出力パスを指定

```bash
node convert.js <入力パス> <出力パス>
```

**例（単一ファイル）**:
```bash
node convert.js ../docs/design/viewer_layout_logic.md ./output/viewer_layout.pdf
```

**例（ディレクトリ一括変換）**:
```bash
node convert.js ../docs/design ./output
```

### テスト実行

```bash
npm test
```

`docs/design/viewer_layout_logic.md` を `output/test.pdf` に変換します。

## 🎨 PDF出力設定

### ページ設定
- **用紙サイズ**: A4
- **余白**: 上下 20mm、左右 15mm
- **ヘッダー**: 「mmdpf 設計ドキュメント」
- **フッター**: ページ番号（例: 1 / 10）

### スタイル設定
- **フォント**: Segoe UI、游ゴシック、メイリオ（日本語対応）
- **フォントサイズ**: 11pt（本文）
- **コードブロック**: シンタックスハイライト付き
- **表**: 罫線付き、ヘッダー背景色あり

## 📁 ディレクトリ構造

```
md-to-pdf/
├── convert.js          # 変換スクリプト（メイン）
├── package.json        # npm設定
├── README.md           # このファイル
└── output/             # PDF出力先（自動生成）
    ├── api/            # docs/design/api/ のPDF
    ├── db/             # docs/design/db/ のPDF
    ├── ui/             # docs/design/ui/ のPDF
    └── viewer_layout_logic.pdf
```

## 🔧 カスタマイズ

### PDF設定の変更

`convert.js` の `config` オブジェクトを編集してください。

**ヘッダー・フッターの変更**:
```javascript
headerTemplate: '<div>カスタムヘッダー</div>',
footerTemplate: '<div>カスタムフッター</div>',
```

**余白の変更**:
```javascript
margin: { 
  top: '30mm',    // 上余白
  bottom: '30mm', // 下余白
  left: '20mm',   // 左余白
  right: '20mm'   // 右余白
},
```

**用紙サイズの変更**:
```javascript
format: 'A3',  // A3, A4, A5, Letter など
```

### スタイルの変更

`convert.js` の `css` セクションを編集してください。

**フォントの変更**:
```javascript
body {
  font-family: 'Arial', 'Helvetica', sans-serif;
  font-size: 12pt;
}
```

**見出しの色変更**:
```javascript
h1 {
  color: #0066cc;  // 青色
  border-bottom: 2px solid #0066cc;
}
```

## 📊 実行例

### 例1: docs/design/ を一括変換

```bash
$ cd md-to-pdf
$ npm run convert

🚀 Markdown to PDF 変換スクリプト
=====================================

📂 入力ディレクトリ: C:\work\...\mmdpf\docs\design
📂 出力ディレクトリ: C:\work\...\mmdpf\md-to-pdf\output

📄 変換中: C:\work\...\mmdpf\docs\design\viewer_layout_logic.md
✓ 変換完了: C:\work\...\mmdpf\md-to-pdf\output\viewer_layout_logic.pdf

📁 ディレクトリ処理: api/
📄 変換中: C:\work\...\mmdpf\docs\design\api\api_design.md
✓ 変換完了: C:\work\...\mmdpf\md-to-pdf\output\api\api_design.pdf

=====================================
📊 変換結果:
  ✓ 成功: 15 ファイル
  ✗ 失敗: 0 ファイル
  ⏱  所要時間: 23.45秒
=====================================
```

### 例2: 単一ファイルを変換

```bash
$ node convert.js ../docs/design/viewer_layout_logic.md

🚀 Markdown to PDF 変換スクリプト
=====================================

📂 入力ファイル: C:\work\...\mmdpf\docs\design\viewer_layout_logic.md
📂 出力ファイル: C:\work\...\mmdpf\docs\design\viewer_layout_logic.pdf

📄 変換中: C:\work\...\mmdpf\docs\design\viewer_layout_logic.md
✓ 変換完了: C:\work\...\mmdpf\docs\design\viewer_layout_logic.pdf

✓ 変換が完了しました！
```

## ⚠️ トラブルシューティング

### Chromiumのダウンロードが失敗する

**原因**: ネットワーク接続やプロキシ設定の問題

**解決策**:
1. インターネット接続を確認
2. プロキシ設定を確認（企業ネットワーク内など）
3. 手動でChromiumをインストール

### 日本語が正しく表示されない

**原因**: システムに日本語フォントがインストールされていない

**解決策**:
- Windows: 游ゴシック、メイリオがデフォルトでインストール済み
- Mac: ヒラギノ角ゴシックがデフォルトでインストール済み
- Linux: `fonts-noto-cjk` パッケージをインストール

### 変換が非常に遅い

**原因**: 大量のファイルやヘッドレスブラウザの起動時間

**解決策**:
- ファイルを分割して変換
- 必要なファイルのみを変換
- より高速なマシンを使用

### PDFが生成されない

**原因**: Markdownの構文エラーや特殊文字

**解決策**:
1. Markdownファイルの構文を確認
2. エラーメッセージを確認
3. 最小限のMarkdownで動作テスト

## 📝 よくある質問

### Q1. 複数のPDFを1つに結合できますか？

現在のバージョンでは未対応です。Adobe Acrobatや外部ツール（PDFtk、PyPDF2など）を使用して結合してください。

### Q2. 目次を自動生成できますか？

現在のバージョンでは未対応です。Markdownファイル内に目次を手動で追加してください。

### Q3. 画像はPDFに含まれますか？

はい。Markdownで参照されている画像は自動的に埋め込まれます。相対パスまたは絶対パスで指定してください。

### Q4. リンクはクリック可能ですか？

はい。外部リンクはクリック可能です。内部リンク（`#見出し`）も機能します。

### Q5. 変換速度はどのくらいですか？

ファイルサイズや内容によりますが、1ファイルあたり1〜3秒程度です。大量のファイルを変換する場合は並列化を検討してください。

## 🔗 関連リンク

- [md-to-pdf公式ドキュメント](https://www.npmjs.com/package/md-to-pdf)
- [Puppeteer PDFオプション](https://pptr.dev/api/puppeteer.pdfoptions)
- [Markdown記法ガイド](https://www.markdownguide.org/)

## 📄 ライセンス

ISC

## 👥 作成者

mmdpf team

---

**最終更新**: 2026-01-22
