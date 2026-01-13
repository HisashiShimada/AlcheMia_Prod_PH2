# ページネーション形状ポリシー

## 標準3パターン

### パターン1: 基本ページネーション
**用途**: テーブル下部の標準的なページ送り

- 高さ: `token.controlHeight` (32px)
- フォントサイズ: `token.fontSize` (14px)
- ページボタンサイズ: 32px × 32px
- 角丸: `token.borderRadius` (8px)
- 最大表示ページ数: 5ページ
- 配置: 右寄せ（align="end"）
- 表示項目:
  - 前へボタン
  - ページ番号ボタン（最大5個）
  - 次へボタン
  - ジャンプ機能（showQuickJumper: true）

**コード例**:
```tsx
<Pagination
  current={current}
  total={total}
  pageSize={pageSize}
  onChange={onChange}
  showQuickJumper
  align="end"
/>
```

---

### パターン2: フル機能ページネーション
**用途**: データテーブル、検索結果など多機能が必要な場面

- 高さ: `token.controlHeight` (32px)
- フォントサイズ: `token.fontSize` (14px)
- ページボタンサイズ: 32px × 32px
- 角丸: `token.borderRadius` (8px)
- 最大表示ページ数: 7ページ
- 配置: 右寄せ（align="end"）
- 表示項目:
  - 総件数表示（showTotal）
  - ページサイズ変更（showSizeChanger: true）
  - 前へボタン
  - ページ番号ボタン（最大7個）
  - 次へボタン
  - ジャンプ機能（showQuickJumper: true）
- ページサイズオプション: [10, 20, 50, 100]

**コード例**:
```tsx
<Pagination
  current={current}
  total={total}
  pageSize={pageSize}
  onChange={onChange}
  showSizeChanger
  showQuickJumper
  showTotal={(total) => `全 ${total} 件`}
  pageSizeOptions={[10, 20, 50, 100]}
  align="end"
/>
```

---

### パターン3: ミニページネーション
**用途**: モーダル内やサイドパネル内の省スペース表示

- サイズ: small
- 高さ: `token.controlHeightSM` (24px)
- フォントサイズ: `token.fontSizeSM` (12px)
- ページボタンサイズ: 24px × 24px
- 角丸: `token.borderRadiusSM` (4px)
- 最大表示ページ数: 5ページ
- 配置: 右寄せ（align="end"）
- 表示項目:
  - 前へボタン
  - ページ番号ボタン（最大5個）
  - 次へボタン
- ページサイズ変更: なし
- ジャンプ機能: なし

**コード例**:
```tsx
<Pagination
  current={current}
  total={total}
  pageSize={pageSize}
  onChange={onChange}
  size="small"
  simple={false}
  align="end"
/>
```

---

## 共通仕様（全パターン）

### 色定義

**通常**
- ボーダー色: `token.colorBorder` (rgba(0,0,0,0.12))
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorText` (#212121)

**ホバー**
- ボーダー色: `token.colorPrimary` (#CF0027)
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorPrimary` (#CF0027)

**アクティブ（現在ページ）**
- ボーダー色: `token.colorPrimary` (#CF0027)
- 背景色: `token.colorPrimary` (#CF0027)
- テキスト色: #ffffff

**無効（前へ/次へボタンが無効時）**
- ボーダー色: `token.colorBorderSecondary` (rgba(0,0,0,0.06))
- 背景色: `token.colorBgContainer` (#ffffff)
- テキスト色: `token.colorTextDisabled` (#bdbdbd)

### アイコン
- 前へボタン: LeftOutlined
- 次へボタン: RightOutlined
- ジャンプ入力: DoubleRightOutlined（アイコンは自動表示）

### レスポンシブ動作
- **デスクトップ（lg以上）**: 全機能表示
- **タブレット（md）**: ページサイズ変更を非表示推奨
- **モバイル（sm以下）**: パターン3（ミニページネーション）または simple={true} を推奨

---

## パターン選択ガイドライン

### パターン1（基本ページネーション）を使用する場合
- ✅ 一般的なテーブルの下部
- ✅ ページサイズ変更が不要な場合
- ✅ シンプルな表示が望ましい場合
- ✅ 総件数表示が不要な場合

### パターン2（フル機能ページネーション）を使用する場合
- ✅ データテーブルでページサイズ変更が必要
- ✅ 検索結果で総件数を表示したい
- ✅ 大量のデータを扱う場合
- ✅ ユーザーが表示件数を選択できる必要がある

### パターン3（ミニページネーション）を使用する場合
- ✅ モーダル内のテーブル
- ✅ ドロワー内のリスト
- ✅ サイドパネル内の表示
- ✅ 省スペースが求められる場面

---

## 配置パターン

### 右寄せ配置（標準）
```tsx
<Pagination align="end" />
```
- **用途**: 最も一般的な配置
- **推奨場面**: データテーブル、検索結果、一覧画面

### 中央寄せ配置
```tsx
<Pagination align="center" />
```
- **用途**: ブログ記事一覧、画像ギャラリーなど
- **推奨場面**: コンテンツ中心のページ

### 左寄せ配置
```tsx
<Pagination align="start" />
```
- **用途**: 管理画面の特殊なケース
- **使用頻度**: 低い

---

## 除外されたパターンと標準パターンの対応

### Simple Pagination（超簡易版）
- **対応する標準パターン**: パターン3（ミニページネーション）の簡易版
- **除外理由**: 使用頻度が低く、機能が極端に制限されるため
- **形状**: 「前へ」「ページ番号 / 総ページ数」「次へ」のみ
- **用途**: 非常に限定された空間で最小限のページング機能が必要な場合
- **コード例**:
```tsx
<Pagination simple current={current} total={total} />
```

### カスタムページネーション
- **対応する標準パターン**: パターン1または2のカスタマイズ版
- **除外理由**: 標準パターンでカバーできるため
- **例**: itemRender でカスタムレンダリング
- **用途**: 特殊なデザイン要件がある場合のみ

### 総件数を左寄せ表示
- **対応する標準パターン**: パターン2の拡張
- **除外理由**: 標準では総件数とページネーションは一体表示
- **実装方法**: Flexレイアウトで分離配置
```tsx
<Flex justify="space-between" align="center">
  <div>全 {total} 件</div>
  <Pagination current={current} total={total} />
</Flex>
```

---

## 実装上の注意事項

### 必須プロパティ
- `current`: 現在のページ番号（1から始まる）
- `total`: 総データ件数
- `onChange`: ページ変更時のコールバック

### オプションプロパティ（頻出）
- `pageSize`: 1ページあたりの件数（デフォルト: 10）
- `showSizeChanger`: ページサイズ変更の表示（パターン2で必須）
- `showQuickJumper`: ページジャンプ機能の表示
- `showTotal`: 総件数表示のカスタマイズ関数
- `pageSizeOptions`: ページサイズの選択肢配列
- `size`: サイズ（"default" | "small"）
- `align`: 配置（"start" | "center" | "end"）

### 状態管理の推奨パターン
```tsx
const [current, setCurrent] = useState(1);
const [pageSize, setPageSize] = useState(10);

const handleChange = (page: number, pageSize: number) => {
  setCurrent(page);
  setPageSize(pageSize);
  // データ取得処理
};

<Pagination
  current={current}
  pageSize={pageSize}
  total={total}
  onChange={handleChange}
/>
```

---

## アクセシビリティ

- キーボード操作: Tab/Shift+Tab でボタン間移動、Enter/Space で実行
- スクリーンリーダー: Ant Designが自動的にARIA属性を付与
- フォーカス表示: ホバー時と同じスタイル（ボーダー色が赤に変化）

---

## パフォーマンス考慮事項

- 大量データ（10,000件以上）の場合: パターン2を使用し、ページサイズ変更で表示件数を調整可能にする
- 無限スクロールとの使い分け: ページネーションは検索性が高く、特定ページへの直接アクセスが必要な場合に適する
- サーバーサイドページング: 必ずサーバー側でページング処理を行い、クライアント側では表示のみを担当する

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2025-12-26 | 初版作成 | Development Team |
