# タスク計画書: Prefix管理「共有する」ボタンを用語管理と同様のUIに統一

## メタデータ
- **作成日時**: 2026-08-25 10:32
- **タスクID**: PrefixManagement共有ボタン追加
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

Prefix管理タブの「共有する」ボタンが用語管理タブと異なるUI・位置になっているため、
用語管理タブに合わせて統一する。

### 用語管理（`NamespaceMain.tsx`）の共有ボタン（基準となるUI）

- **位置**: テーブル上部・右端に独立したアクションバーとして表示
- **表示/非表示**: 1件以上選択したときのみアクションバーごと**表示**
- **色**: 緑色（`style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}`）
- **アイコン**: `<BankOutlined />` あり
- **ラベル**: 件数付き（`t('namespaceMain.shareBtnLabel', { count: N })`）
- **隣接ボタン**: 「N件 一括非アクティブ」ボタンが右隣

```tsx
{selectedTermIds.length > 0 && (
  <div style={{
    display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
    gap: 8, marginBottom: 8, padding: '6px 0',
  }}>
    <Button
      icon={<BankOutlined />}
      onClick={() => setShareScopeOpen(true)}
      style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
    >
      {t('namespaceMain.shareBtnLabel', { count: String(selectedTermIds.length) })}
    </Button>
    <Button danger icon={<DeleteOutlined />} ...>一括非アクティブ</Button>
  </div>
)}
```

### Prefix管理（`PrefixManagement.tsx`）の現状の共有ボタン

- **位置**: ツールバー右端のボタン群（インポート・エクスポート・追加・保存・キャンセルと並列）
- **表示/非表示**: `showShareButton=true` の場合に**常時表示**（非選択時は `disabled`）
- **色**: 青色（`type="primary"`）
- **アイコン**: なし
- **ラベル**: 件数なし（`t('prefixManagement.btnShare')`）

## 差異一覧

| 項目 | 用語管理（基準） | Prefix管理（現状）| 要修正 |
|------|-----------------|------------------|--------|
| **位置** | テーブル上部・独立アクションバー | ツールバーのボタン群の中 | ✅ |
| **表示切替** | 選択時のみ**表示** | 常時表示（非選択時disabled） | ✅ |
| **色** | 緑色（`#52c41a`） | 青色（`type="primary"`） | ✅ |
| **アイコン** | `<BankOutlined />` あり | なし | ✅ |
| **ラベル** | 件数付き「N件 共有する」 | 件数なし「共有する」 | ✅ |

## 目的と期待される成果

- [ ] Prefix管理タブでチェックボックスを選択すると、テーブル上部に独立アクションバーが出現する
- [ ] アクションバーの共有ボタンが用語管理と同様の緑色・BankOutlinedアイコン・件数付きラベルになる
- [ ] 0件選択時はアクションバーが非表示になる
- [ ] 日本語・英語の翻訳キーが件数付き形式に更新される

## 実装ステップ

### Phase 1: `PrefixManagement.tsx` の修正

- [ ] `BankOutlined` を antd icons からインポートに追加
- [ ] ツールバー内の `{showShareButton && <Button ...>}` を**削除**
- [ ] テーブルエリア（`<div style={{ flex: 1, overflow: 'auto', ... }}>` の直下）に
  `selectedRowKeys.length > 0` の場合のみ表示する独立アクションバーを追加
  - 緑色スタイル（`background: '#52c41a'`）
  - `<BankOutlined />` アイコン
  - 件数付きラベル（`t('prefixManagement.btnShare', { count: String(selectedRowKeys.length) })`）

```tsx
{/* 独立アクションバー（1件以上選択時のみ表示） */}
{showShareButton && selectedRowKeys.length > 0 && (
  <div style={{
    display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
    gap: 8, marginBottom: 8, padding: '6px 0',
  }}>
    <Button
      icon={<BankOutlined />}
      onClick={() => onShareSelected?.(selectedRowKeys)}
      style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
    >
      {t('prefixManagement.btnShare', { count: String(selectedRowKeys.length) })}
    </Button>
  </div>
)}
```

### Phase 2: i18n キー更新

- [ ] `frontend/src/locales/ja.json` の `prefixManagement.btnShare` を件数付き形式に更新
  - 例: `"btnShare": "{{count}}件 共有する"`
- [ ] `frontend/src/locales/en.json` の `prefixManagement.btnShare` を件数付き形式に更新
  - 例: `"btnShare": "Share ({{count}})"`

## 変更ファイル

1. `frontend/src/components/namespace/PrefixManagement.tsx` - 共有ボタンをツールバーから独立アクションバーに移動・スタイル統一
2. `frontend/src/locales/ja.json` - `prefixManagement.btnShare` を件数付き形式に更新
3. `frontend/src/locales/en.json` - `prefixManagement.btnShare` を件数付き形式に更新

## リスク

| リスク | 対策 |
|--------|------|
| `prefixManagement.btnShare` の翻訳キーが件数付き形式に変わることで既存参照箇所が影響を受ける | `search_files` で現状の利用箇所を確認してから変更する |

## 承認記録
- **計画書提示日時**: 2026-08-25 14:52
- **承認日時**: 
