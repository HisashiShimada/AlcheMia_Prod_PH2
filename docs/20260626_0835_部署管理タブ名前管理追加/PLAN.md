# タスク計画書: 部署管理タブへの名前管理サブタブ追加

## メタデータ
- **作成日時**: 2026-06-26 08:38
- **タスクID**: dept-name-management-tab
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

システム管理者メニューの「部署管理」タブ（タブ4）に、名前管理（用語Prefix管理・用語管理）のサブタブを追加する。

## 目的と期待される成果

### 目的
部署スコープの名前管理（用語Prefix・用語）を、部署管理タブから直接操作できるようにする。  
ProviderMenu の「名前管理（グローバル）」タブと同じ構成を、部署スコープ版として提供する。

### 期待される成果
- [ ] システム管理者がタブ4（部署管理）から名前管理にアクセスできる
- [ ] 「部署一覧」サブタブで従来の部署管理が継続して使える
- [ ] 「名前管理」サブタブで用語Prefix管理・用語管理が使える

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] タスク計画書を作成する（このファイル）

### Phase 2: SystemAdminMenu.tsx の修正
- [ ] `Tabs` コンポーネントを antd インポートに追加
- [ ] `GlobalOutlined` アイコンをインポートに追加
- [ ] `PrefixManagement` を dynamic import で追加
- [ ] `NamespaceMain` を dynamic import で追加
- [ ] タブ4のコンテンツをサブタブ構成に変更

## 変更ファイル

### 修正
1. `frontend/src/components/menus/SystemAdminMenu.tsx` - タブ4をサブタブ構成に変更

### 新規作成
なし

## 技術的詳細

### タブ4（部署管理）の新構成

```
タブ4: 部署管理
├── サブタブ「部署一覧」  → <DepartmentManagement />（既存）
└── サブタブ「名前管理」  → さらに内部タブ
    ├── 「用語Prefix管理」→ <PrefixManagement />
    └── 「用語管理」      → <NamespaceMain />
```

### ProviderMenu との違い（スコープ設計）

| メニュー | props | 表示スコープ |
|---------|-------|------------|
| ProviderMenu タブ3 | `globalOnly={true}` | グローバル用語のみ |
| SystemAdminMenu タブ4（新規） | props なし（デフォルト） | ログインユーザーの部署+祖先+グローバル |

### 実装イメージ（主要変更箇所）

```tsx
// 追加インポート
import { ..., Tabs, GlobalOutlined } from 'antd';
const PrefixManagement = dynamic(() => import('../namespace/PrefixManagement'), { ssr: false });
const NamespaceMain    = dynamic(() => import('../namespace/NamespaceMain'),    { ssr: false });

// タブ4のコンテンツ変更
{currentTab === '4' && (
  <div style={{ padding: token.paddingContentVertical }}>
    <Tabs
      defaultActiveKey="departments"
      items={[
        {
          key: 'departments',
          label: '部署一覧',
          icon: <ShopOutlined />,
          children: <DepartmentManagement />,
        },
        {
          key: 'names',
          label: '名前管理',
          icon: <GlobalOutlined />,
          children: (
            <Tabs
              items={[
                { key: 'prefix', label: '用語Prefix管理', children: <PrefixManagement /> },
                { key: 'terms',  label: '用語管理',       children: <NamespaceMain /> },
              ]}
            />
          ),
        },
      ]}
    />
  </div>
)}
```

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| サブタブのネストが深くなりUIが分かりにくくなる | 低 | 実装後に画面確認 |
| NamespaceMain の初期表示が遅い | 低 | dynamic import で遅延ロード済み |

## テスト計画

- [ ] タブ4をクリックしてサブタブ「部署一覧」が表示されること
- [ ] サブタブ「名前管理」をクリックして用語Prefix管理・用語管理が表示されること
- [ ] 既存の部署管理機能（追加・編集・有効/無効切替）が引き続き正常動作すること

## 承認記録
- **計画書提示日時**: 2026-06-26 08:38
- **承認日時**: -
- **承認者コメント**: -

## 実施記録

### 実施日時
開始: -  
完了: -

### 計画からの変更点
なし

### 最終的な成果物
- [ ] `frontend/src/components/menus/SystemAdminMenu.tsx` 修正完了
