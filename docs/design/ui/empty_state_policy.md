# 空状態表示ポリシー

## 標準4パターン

### パターン1: シンプル空状態
**用途**: テーブル・リストでデータがない場合
- アイコン: FileOutlined（48px）
- メッセージ: 「データがありません」
- 説明文: なし
- アクション: なし
- アイコン色: `token.colorTextDisabled` (#bdbdbd)
- メッセージ色: `token.colorTextSecondary` (#757575)
- フォントサイズ: `token.fontSize` (14px)
- 垂直パディング: 32px

```tsx
<Empty 
  image={<FileOutlined style={{ fontSize: 48 }} />}
  description="データがありません"
/>
```

---

### パターン2: 説明付き空状態
**用途**: 検索結果なし、フィルタリング結果なし
- アイコン: SearchOutlined / FilterOutlined（48px）
- メッセージ: 「検索結果がありません」「該当するデータがありません」
- 説明文: 「検索条件を変更してください」「フィルタ条件を変更してください」
- アクション: なし
- アイコン色: `token.colorTextDisabled` (#bdbdbd)
- メッセージ色: `token.colorTextSecondary` (#757575)
- 説明文色: `token.colorTextTertiary` (#9e9e9e)
- メッセージフォントサイズ: `token.fontSize` (14px)
- 説明文フォントサイズ: `token.fontSizeSM` (12px)
- 垂直パディング: 32px

```tsx
<Empty 
  image={<SearchOutlined style={{ fontSize: 48 }} />}
  description={
    <Space direction="vertical" size={4}>
      <Text style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>
        検索結果がありません
      </Text>
      <Text style={{ color: token.colorTextTertiary, fontSize: token.fontSizeSM }}>
        検索条件を変更してください
      </Text>
    </Space>
  }
/>
```

---

### パターン3: アクション付き空状態
**用途**: 初期状態、ユーザーアクションが必要な場合
- アイコン: PlusCircleOutlined / FolderAddOutlined（48px）
- メッセージ: 「まだデータがありません」
- 説明文: 「新しいデータを追加してください」
- アクション: ボタン（プライマリまたはデフォルト）
- アイコン色: `token.colorPrimary` (#CF0027)
- メッセージ色: `token.colorTextSecondary` (#757575)
- 説明文色: `token.colorTextTertiary` (#9e9e9e)
- メッセージフォントサイズ: `token.fontSize` (14px)
- 説明文フォントサイズ: `token.fontSizeSM` (12px)
- ボタンサイズ: middle（高さ32px）
- 垂直パディング: 48px

```tsx
<Empty 
  image={<PlusCircleOutlined style={{ fontSize: 48, color: token.colorPrimary }} />}
  description={
    <Space direction="vertical" size={4}>
      <Text style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}>
        まだデータがありません
      </Text>
      <Text style={{ color: token.colorTextTertiary, fontSize: token.fontSizeSM }}>
        新しいデータを追加してください
      </Text>
    </Space>
  }
>
  <Button type="primary" icon={<PlusOutlined />}>
    データを追加
  </Button>
</Empty>
```

---

### パターン4: カスタム画像空状態
**用途**: エラー状態、特殊な状況の説明
- アイコン: Ant Design標準画像またはカスタムSVG（100px×100px）
- メッセージ: 状況に応じたメッセージ
- 説明文: 詳細な説明または解決方法
- アクション: 必要に応じてボタン
- アイコン色: グレースケールまたはカスタム
- メッセージ色: `token.colorTextSecondary` (#757575)
- 説明文色: `token.colorTextTertiary` (#9e9e9e)
- メッセージフォントサイズ: `token.fontSizeLG` (16px)
- 説明文フォントサイズ: `token.fontSize` (14px)
- 垂直パディング: 48px

```tsx
<Empty 
  image={Empty.PRESENTED_IMAGE_SIMPLE}
  imageStyle={{ height: 100 }}
  description={
    <Space direction="vertical" size={8}>
      <Text style={{ color: token.colorTextSecondary, fontSize: token.fontSizeLG, fontWeight: 500 }}>
        接続エラーが発生しました
      </Text>
      <Text style={{ color: token.colorTextTertiary, fontSize: token.fontSize }}>
        ネットワーク接続を確認して、再度お試しください
      </Text>
    </Space>
  }
>
  <Button type="default" icon={<ReloadOutlined />}>
    再読み込み
  </Button>
</Empty>
```

---

## 共通仕様（全パターン）

### 色定義

**アイコン色**
- シンプル（パターン1-2）: `token.colorTextDisabled` (#bdbdbd)
- アクション強調（パターン3）: `token.colorPrimary` (#CF0027)
- カスタム（パターン4）: グレースケールまたは指定色

**テキスト色**
- メインメッセージ: `token.colorTextSecondary` (#757575)
- 説明文: `token.colorTextTertiary` (#9e9e9e)

**背景色**
- 透明（親要素の背景色を継承）
- カード内: `token.colorBgContainer` (#ffffff)
- テーブル内: 継承

### サイズ定義

**アイコンサイズ**
- 標準: 48px（パターン1-3）
- カスタム画像: 100px×100px（パターン4）

**フォントサイズ**
- メインメッセージ: `token.fontSize` (14px) ～ `token.fontSizeLG` (16px)
- 説明文: `token.fontSizeSM` (12px) ～ `token.fontSize` (14px)

**スペーシング**
- アイコンとメッセージの間隔: 16px（Ant Design標準）
- メッセージと説明文の間隔: 4px
- 説明文とボタンの間隔: 16px
- 垂直パディング: 32px～48px

---

## パターン選択ガイドライン

### シーン別推奨パターン

| シーン | 推奨パターン | アイコン | 理由 |
|--------|------------|---------|------|
| テーブル・リストのデータなし | パターン1 | FileOutlined | シンプルで邪魔にならない |
| 検索結果なし | パターン2 | SearchOutlined | 検索条件変更を促す |
| フィルタ結果なし | パターン2 | FilterOutlined | フィルタ条件変更を促す |
| 初期状態（データ未追加） | パターン3 | PlusCircleOutlined | ユーザーアクションを促す |
| プロジェクト/フォルダなし | パターン3 | FolderAddOutlined | データ追加を促す |
| エラー状態 | パターン4 | カスタム画像 | 状況を明確に説明 |
| 権限不足 | パターン4 | カスタム画像 | アクセス不可を説明 |

---

## アイコン一覧

### 標準アイコン（@ant-design/icons）

| アイコン | 用途 | パターン |
|---------|------|---------|
| `FileOutlined` | 一般的なデータなし | パターン1 |
| `SearchOutlined` | 検索結果なし | パターン2 |
| `FilterOutlined` | フィルタ結果なし | パターン2 |
| `PlusCircleOutlined` | データ追加が必要 | パターン3 |
| `FolderAddOutlined` | フォルダ/プロジェクト追加 | パターン3 |
| `InboxOutlined` | 受信データなし | パターン1-2 |
| `DatabaseOutlined` | DBデータなし | パターン1-2 |

### Ant Design標準画像

| 画像 | 用途 | パターン |
|------|------|---------|
| `Empty.PRESENTED_IMAGE_DEFAULT` | デフォルト画像 | パターン4 |
| `Empty.PRESENTED_IMAGE_SIMPLE` | シンプル画像 | パターン4 |

---

## 配置とレイアウト

### テーブル内
```tsx
<Table
  dataSource={[]}
  locale={{
    emptyText: <Empty description="データがありません" />
  }}
/>
```

### カード内
```tsx
<Card>
  <Empty
    image={<PlusCircleOutlined style={{ fontSize: 48 }} />}
    description="まだデータがありません"
  >
    <Button type="primary">データを追加</Button>
  </Empty>
</Card>
```

### ページ全体（中央配置）
```tsx
<div style={{ 
  minHeight: 400, 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center' 
}}>
  <Empty
    image={<SearchOutlined style={{ fontSize: 48 }} />}
    description="検索結果がありません"
  />
</div>
```

---

## アクセシビリティ

### 推奨事項
- アイコンに `aria-hidden="true"` を設定（装飾的要素）
- メッセージは意味のあるテキストを使用
- ボタンには明確なラベルを付ける
- キーボード操作可能なボタン配置

### 例
```tsx
<Empty 
  image={
    <FileOutlined 
      style={{ fontSize: 48 }} 
      aria-hidden="true"
    />
  }
  description={
    <span role="status" aria-live="polite">
      データがありません
    </span>
  }
>
  <Button 
    type="primary" 
    aria-label="新しいデータを追加する"
  >
    データを追加
  </Button>
</Empty>
```

---

## 多言語対応

### メッセージ定義（locales/ja.json）
```json
{
  "empty": {
    "noData": "データがありません",
    "noSearchResults": "検索結果がありません",
    "changeSearchCondition": "検索条件を変更してください",
    "noFilterResults": "該当するデータがありません",
    "changeFilterCondition": "フィルタ条件を変更してください",
    "noDataYet": "まだデータがありません",
    "addNewData": "新しいデータを追加してください",
    "connectionError": "接続エラーが発生しました",
    "checkNetwork": "ネットワーク接続を確認して、再度お試しください"
  }
}
```

### 使用例
```tsx
import { useLanguage } from '@/contexts/LanguageContext';

const { t } = useLanguage();

<Empty description={t('empty.noData')} />
```

---

## 除外されたパターンと標準パターンの対応

### 小サイズ空状態（Empty.PRESENTED_IMAGE_SIMPLE）
- **対応する標準パターン**: パターン1の小型版
- **除外理由**: 標準サイズで十分対応可能
- **用途**: 狭いスペースでの表示が必要な場合のみ
- **差異**: アイコンサイズ32px、垂直パディング16px

### リスト項目の空状態
- **対応する標準パターン**: パターン1またはパターン2
- **除外理由**: Listコンポーネントのlocale設定で対応可能
- **使用方法**: `<List locale={{ emptyText: <Empty /> }} />`

### スケルトンからの遷移
- **対応する標準パターン**: ローディング完了後にパターン1-4
- **除外理由**: スケルトンポリシーと組み合わせて使用
- **推奨フロー**: Skeleton → Empty（データなし） / Data（データあり）

---

## ベストプラクティス

### DO（推奨）
✅ ユーザーに次のアクションを明確に示す
✅ 状況に応じた適切なアイコンを使用する
✅ メッセージは簡潔かつ具体的にする
✅ アクションボタンは1つに絞る
✅ テーブル・リストでは控えめなデザインにする
✅ 初期状態では積極的にアクションを促す

### DON'T（非推奨）
❌ 複数のアクションボタンを配置しない
❌ 長すぎる説明文を表示しない
❌ 不必要に大きなアイコンを使用しない
❌ 「エラー」という単語を安易に使用しない
❌ ユーザーの行動を責めるようなメッセージを避ける
❌ 技術的な詳細を一般ユーザーに表示しない
