# CSS → SCSS 変換手順書

## 概要

Next.jsプロジェクトで使用している`globals.css`をSCSSに変換する手順を記載します。

## 前提条件

- Next.js 15以上
- npm または yarn がインストール済み
- Windows環境（PowerShell）

## 変換の目的

- **SCSSの機能を活用**: 変数、ネスト、ミックスインなどを使用可能に
- **コードの保守性向上**: 階層構造が明確で読みやすいコード
- **スタイルの再利用性向上**: 変数やミックスインで共通化が容易

## 起こりうる問題と対策

### 1. Sassパッケージ未インストール
**問題**: SCSSを使用するには`sass`パッケージが必要
**対策**: `npm install sass --save-dev` でインストール

### 2. Tailwind CSS v4の構文互換性
**問題**: `@import "tailwindcss"` がSassで非推奨警告を出す
**影響**: 警告は出るが機能には影響なし（Dart Sass 3.0.0まで使用可能）
**対策**: 現時点では対応不要。将来的に`@use`構文への移行が推奨される

### 3. TypeScript型エラー
**問題**: `'./globals.scss' の副作用インポートに対するモジュールまたは型宣言が見つかりません`
**影響**: 開発時にエディタでエラー表示されるが、ビルド・実行には影響なし
**対策**: Next.jsが自動的にSCSSをサポートするため対応不要

### 4. インポートパス更新漏れ
**問題**: `layout.tsx`のインポートを更新し忘れるとビルドエラー
**対策**: 必ず`import "./globals.css"`を`import "./globals.scss"`に更新

## 変換手順

### Step 1: sassパッケージのインストール

```bash
cd frontend
npm install sass --save-dev
```

**確認方法**:
```bash
# package.jsonにsassが追加されていることを確認
cat package.json | grep sass
# または
type package.json | findstr sass  # Windows
```

### Step 2: バックアップの作成（推奨）

```bash
# frontend/src/app/ ディレクトリで実行
cp globals.css globals.css.backup
# または
copy globals.css globals.css.backup  # Windows
```

### Step 3: globals.scssファイルの作成

`frontend/src/app/globals.scss`を新規作成し、以下の内容を記述：

```scss
@import "tailwindcss";

// SCSS変数の定義
$color-white: #ffffff;
$color-gray-dark: #0a0a0a;
$color-gray-light: #fafafa;
$color-gray-lighter: #f5f5f5;
$color-gray-medium: #d9d9d9;
$color-gray-hover: #bfbfbf;
$color-text-primary: #212121;

// CSS変数（ランタイムで必要）
:root {
  --background: #{$color-white};
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #{$color-gray-dark};
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

// タスク一覧テーブルのストライプ行スタイル（ネスト化）
.task-list-table {
  .table-row-light {
    background-color: $color-white !important;

    &:hover {
      background-color: $color-gray-lighter !important;
    }
  }

  .table-row-dark {
    background-color: $color-gray-light !important;

    &:hover {
      background-color: $color-gray-lighter !important;
    }
  }

  // テーブルヘッダーのスタイル調整
  .ant-table-thead > tr > th {
    background-color: $color-gray-light !important;
    font-weight: 600;
    color: $color-text-primary;
  }

  // チェックボックスのカラムスタイル
  .ant-table-selection-column {
    padding-left: 16px !important;
    padding-right: 16px !important;
  }

  // ページネーションのスタイル調整
  .ant-pagination {
    margin-top: 16px;

    &-total-text {
      margin-right: 16px;
    }
  }
}

// タブコンテンツのスクロール制御（ネスト化）
.ant-tabs {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;

  &-content-holder {
    flex: 1 !important;
    overflow: hidden !important;
  }

  &-content {
    height: 100% !important;
    overflow: hidden !important;

    // スクロールバーのカスタマイズ（Webkit系ブラウザ）
    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: $color-gray-lighter;
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: $color-gray-medium;
      border-radius: 4px;

      &:hover {
        background: $color-gray-hover;
      }
    }
  }

  &-tabpane {
    height: 100% !important;
    padding: 0 !important;
  }
}
```

**変換のポイント**:
1. **変数化**: 繰り返し使用される色を`$color-*`変数で定義
2. **ネスト化**: `.task-list-table` や `.ant-tabs` 配下をネスト構造に
3. **&記号の活用**: `&:hover`, `&-total-text`で親セレクタを参照
4. **補間構文**: CSS変数内でSCSS変数を使う場合は`#{$variable}`

### Step 4: layout.tsxのインポート更新

`frontend/src/app/layout.tsx`を編集：

```typescript
// 変更前
import "./globals.css";

// 変更後
import "./globals.scss";
```

**完全なファイル例**:
```typescript
import type { Metadata } from "next";
import "./globals.scss";  // ← ここを変更
import ThemeProviderWrapper from "@/components/ThemeProviderWrapper";

export const metadata: Metadata = {
  title: "MMDPF - マルチモーダルデータプラットフォーム",
  description: "材料科学分野における実験データ管理・可視化プラットフォーム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0 }}>
        <ThemeProviderWrapper>
          {children}
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
```

### Step 5: 動作確認

#### 5.1 開発サーバーの起動

```bash
cd frontend
npm run dev
```

#### 5.2 確認項目

- [ ] ビルドが成功すること
- [ ] `http://localhost:3000` にアクセスできること
- [ ] スタイルが正しく適用されていること
- [ ] ダークモードが動作すること（ブラウザのDevToolsで確認）
- [ ] Ant Designコンポーネントのスタイルが崩れていないこと
- [ ] タスク一覧テーブルのストライプが表示されること
- [ ] タブのスクロールが正常に動作すること
- [ ] ホバー効果が正常に動作すること

#### 5.3 予想される警告

以下の警告が表示されますが、**機能には影響ありません**：

```
⚠ SassWarning: Deprecation Warning on line 0, column 8:
Sass @import rules are deprecated and will be removed in Dart Sass 3.0.0.
```

**理由**: Tailwind CSS v4の`@import "tailwindcss"`がSassの新構文（@use）ではなく、従来の@importを使用しているため。

**対応**: Dart Sass 3.0.0リリース前にTailwind CSS側で対応される予定のため、現時点では対応不要。

### Step 6: 本番ビルドの確認

```bash
cd frontend
npm run build
```

- [ ] ビルドが成功すること
- [ ] エラーが発生しないこと
- [ ] 警告のみ（@import deprecation）であること

### Step 7: 旧ファイルの削除（オプション）

動作確認後、不要になった`globals.css`を削除：

```bash
# frontend/src/app/ ディレクトリで実行
rm globals.css
# または
del globals.css  # Windows
```

**注意**: バックアップは残しておくことを推奨

## ロールバック手順

問題が発生した場合の切り戻し手順：

### 手順1: バックアップからの復元

```bash
cd frontend/src/app
cp globals.css.backup globals.css
# または
copy globals.css.backup globals.css  # Windows
```

### 手順2: layout.tsxを元に戻す

```typescript
// globals.scss → globals.css に戻す
import "./globals.css";
```

### 手順3: globals.scssの削除

```bash
rm globals.scss
# または
del globals.scss  # Windows
```

### 手順4: 動作確認

```bash
cd frontend
npm run dev
```

## トラブルシューティング

### Q1: 「Module not found: Can't resolve 'sass'」エラーが出る

**原因**: sassパッケージがインストールされていない

**解決方法**:
```bash
cd frontend
npm install sass --save-dev
```

### Q2: スタイルが適用されない

**原因**: ビルドキャッシュが残っている可能性

**解決方法**:
```bash
cd frontend
# .next ディレクトリを削除
rm -rf .next
# または
rmdir /s .next  # Windows

# 再ビルド
npm run dev
```

### Q3: TypeScriptエラーが消えない

**原因**: エディタのTypeScriptサーバーがキャッシュしている

**解決方法**:
1. VSCodeの場合: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. または、VSCodeを再起動

### Q4: ダークモードが動作しない

**原因**: CSS変数の補間が正しくない可能性

**確認方法**:
```scss
// 正しい書き方
:root {
  --background: #{$color-white};  // #{} で補間
}

// 間違った書き方
:root {
  --background: $color-white;  // #{} なし
}
```

## 追加の最適化（オプション）

### ファイル分割

大規模プロジェクトの場合、SCSSファイルを分割することを推奨：

```
frontend/src/styles/
├── _variables.scss    # 変数定義
├── _mixins.scss       # ミックスイン
├── _tables.scss       # テーブル関連
├── _tabs.scss         # タブ関連
└── globals.scss       # メインファイル
```

`globals.scss`から各ファイルをインポート：
```scss
@import "tailwindcss";
@import "./variables";
@import "./mixins";
@import "./tables";
@import "./tabs";
```

### ミックスインの活用

繰り返し使用するスタイルをミックスインで定義：

```scss
// ホバー効果のミックスイン
@mixin hover-effect($bg-color) {
  &:hover {
    background-color: $bg-color !important;
    transition: background-color 0.2s ease;
  }
}

// 使用例
.table-row-light {
  background-color: $color-white !important;
  @include hover-effect($color-gray-lighter);
}
```

## まとめ

- ✅ sassパッケージのインストール
- ✅ globals.scssファイルの作成
- ✅ layout.tsxのインポート更新
- ✅ 動作確認（開発・本番ビルド）
- ✅ 旧ファイルの削除（オプション）

**変更対象ファイル数**: 3ファイル
1. `package.json` （自動）
2. `frontend/src/app/globals.scss` （新規作成）
3. `frontend/src/app/layout.tsx` （1行変更）

**所要時間**: 約5-10分

**リスク**: 低（簡単にロールバック可能）

## 参考資料

- [Next.js - Built-In CSS Support](https://nextjs.org/docs/app/building-your-application/styling/sass)
- [Sass Documentation](https://sass-lang.com/documentation/)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Dart Sass @import Deprecation](https://sass-lang.com/documentation/at-rules/import/)

## 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|----------|--------|
| 2025-12-22 | 1.0.0 | 初版作成 | Cline |
