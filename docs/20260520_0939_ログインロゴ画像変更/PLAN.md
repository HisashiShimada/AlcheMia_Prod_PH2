# タスク計画書: ロゴ・メニューバー画像変更

## メタデータ
- **作成日時**: 2026-05-20 09:39
- **タスクID**: ロゴ・メニューバー画像変更
- **優先度**: 低
- **推定工数**: 1時間

## タスク概要

1. ログイン画面のロゴ部分を、テキスト表示（appName の `<Title>`）から `logo_alchemia.png` 画像に変更する。
2. メニューバー上部の「Alchemia」テキスト表示を `icon_alchemia.png` と `logo_alchemia.png` の横並び画像に変更する。

## 目的と期待される成果

- [x] ログイン画面のロゴがテキストから画像（logo_alchemia.png）に変更されること
- [x] カードのレイアウトに収まるよう適切なサイズに調整されること
- [x] ロゴとサブタイトルの上下間隔が適切に調整されること
- [x] メニューバーの「Alchemia」テキストが2画像横並びに変更されること
- [x] ヘッダー高さ（64px）に収まるサイズで表示されること

## 実装ステップ

- [x] タスク計画書の作成
- [x] `frontend/src/components/LoginPage.tsx` のロゴ部分を Next.js `Image` コンポーネントを使って `logo_alchemia.png` に変更
- [x] ログイン画面サイズ調整（幅: 240px、高さ: 140px）
- [x] ログイン画面のサブタイトル `whiteSpace: 'nowrap'` 追加（1行表示）
- [x] ロゴとサブタイトルの上下間隔を縮小（`marginTop: 4`）
- [x] `frontend/src/components/common/Header.tsx` の「Alchemia」Title を2画像横並びに変更
- [x] メニューバー画像1: `icon_alchemia.png`（width:36, height:36）
- [x] メニューバー画像2: `logo_alchemia.png`（width:160, height:36、marginTop:4）
- [x] メニューバーのロゴブロック `marginRight: 8` に調整（サブタイトルとの間隔）

## 変更ファイル

1. `frontend/src/components/LoginPage.tsx` - ロゴ部分を画像に変更（Title → next/image）、サブタイトル1行化・間隔調整
2. `frontend/src/components/common/Header.tsx` - ロゴ部分を2画像横並びに変更（Title → next/image × 2）

## 技術的詳細

### ログイン画面（LoginPage.tsx）
- Next.js の `<Image>` コンポーネント（`next/image`）を使用
- 画像パス: `/icons/logo_alchemia.png`
- サイズ: `width={240}` / `height={140}`、`objectFit: 'contain'`
- サブタイトル: `whiteSpace: 'nowrap'`、`marginTop: 4`

### メニューバー（Header.tsx）
- Next.js の `<Image>` コンポーネント（`next/image`）を使用
- 画像1: `/icons/icon_alchemia.png`（width:36, height:36）
- 画像2: `/icons/logo_alchemia.png`（width:160, height:36、marginTop:4）
- `display: flex; align-items: center; gap: 0; marginRight: 8` で横並び配置

## 承認記録

- **計画書提示日時**: 2026-05-20 09:39
- **承認日時**: 2026-05-20 09:39
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-05-20 09:39
完了: 2026-05-20 10:32

### 最終的な成果物
- [x] ログイン画面ロゴ画像変更完了（`logo_alchemia.png`、width:240px、height:140px）
- [x] ログイン画面サブタイトル1行化完了（`whiteSpace: 'nowrap'`）
- [x] ログイン画面ロゴ・サブタイトル間隔調整完了（`marginTop: 4`）
- [x] メニューバーロゴ画像変更完了（`icon_alchemia.png` + `logo_alchemia.png` 横並び）
- [x] メニューバー画像サイズ・間隔調整完了
