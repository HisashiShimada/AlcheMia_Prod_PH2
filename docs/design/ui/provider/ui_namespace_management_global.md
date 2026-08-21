# 名前空間管理（グローバル）タブ UI設計書

## メタデータ
- **画面名**: 名前空間管理（グローバル）タブ
- **物理名**: GlobalNamespaceView.tsx
- **ファイルパス**:
  - `frontend/src/components/menus/ProviderMenu.tsx`（タブ3にて呼び出し）
  - `frontend/src/components/namespace/GlobalNamespaceView.tsx`
- **利用権限**: プロバイダー（provider / sys_admin）
- **作成日**: 2026-08-19
- **最終更新日**: 2026-08-21
- **担当者**: Development Team
- **バージョン**: 2.0.0

---

## 1. 画面概要

### 1.1. 目的

プロバイダーメニュー（`ProviderMenu.tsx`）のタブ3として表示される画面です。  
ファイルサーバ（`system/namespaces/global-declarations.csv`）に保存されたグローバル名前空間宣言（Prefix + URI）の一覧表示・インポート・エクスポートを提供します。

> ⚠️ **実装上の注意**: 旧設計書では `PrefixManagement` + `TermManagement` をネストしたTabsで表示する構成が記述されていましたが、実際の実装は `GlobalNamespaceView` コンポーネント単体です。サブタブ構成は存在しません。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `sys_admin` / `provider` | ✅ 閲覧・インポート・エクスポート可 |
| それ以外 | ❌ プロバイダーメニュー自体にアクセス不可 |

### 1.3. 主要機能

1. グローバル名前空間宣言（Prefix + URI）の一覧表示
2. CSVインポート（全置換）
3. CSVエクスポート
4. リロード

---

## 2. 画面レイアウト

### 2.1. 全体構成（プロバイダーメニュー内）

```
ProviderMenu（タブ形式）
├── タブ1: 組織管理
├── タブ2: 会社管理
├── タブ3: 名前空間管理（グローバル）← 今回の対象
└── タブ4: 情報ダウンロード
```

### 2.2. タブ3 内レイアウト

サブタブはなし。`GlobalNamespaceView` を直接表示。

```
┌──────────────────────────────────────────────────────────────────────┐
│ 名前空間管理（グローバル）タブ                                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  グローバル名前空間宣言                [リロード] [エクスポート] [インポート]│
│  （説明テキスト）                                                       │
│                                                                        │
│  N 件                                                                  │
│                                                                        │
│  ┌────────────────────┬─────────────────────────────────────────────┐ │
│  │ Prefix             │ URI                                         │ │
│  ├────────────────────┼─────────────────────────────────────────────┤ │
│  │ `maiml`            │ http://www.maiml.org/...              [コピー]│ │
│  │ `xsi`              │ http://www.w3.org/...                 [コピー]│ │
│  └────────────────────┴─────────────────────────────────────────────┘ │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. ProviderMenu のタブ設定

### 3.1. タブ一覧

| key | ラベル（i18n キー） | アイコン | コンポーネント |
|-----|-------------------|---------|--------------|
| `'1'` | `menu.provider.tabs.organizationManagement` | `ShopOutlined` | `OrganizationManagement` |
| `'2'` | `menu.provider.tabs.corporationManagement` | `AuditOutlined` | `CorporationManagement` |
| `'3'` | `menu.provider.tabs.namespaceManagement` | `GlobalOutlined` | `GlobalNamespaceView` |
| `'4'` | `menu.provider.tabs.informationDownload` | `DatabaseOutlined` | `InformationDownload` |

### 3.2. タブ3 のレンダリング

```typescript
{currentTab === '3' && (
  <div style={{ padding: '0 16px', height: '100%' }}>
    <GlobalNamespaceView />
  </div>
)}
```

- サブタブなし
- `GlobalNamespaceView` はデフォルト Props（`viewOnly=false`）で呼び出し

---

## 4. GlobalNamespaceView コンポーネント

### 4.1. Props定義

```typescript
interface GlobalNamespaceViewProps {
  viewOnly?: boolean;  // デフォルト: false
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|---|------|------|
| `viewOnly` | `boolean` | ❌ | trueの場合インポート・エクスポートボタンを無効化（デフォルト: false）|

### 4.2. ヘッダーエリア

左側:
- **タイトル**: `globalNamespace.title`（Typography.Title level=5）
- **説明**: `globalNamespace.description`（Typography.Text type="secondary" fontSize=12）

右側（ボタン群）:
| ボタン | アイコン | loading | disabled条件 | コールバック |
|--------|---------|---------|------------|------------|
| リロード | `ReloadOutlined` | `loading` | — | `fetchDeclarations` |
| エクスポート | `DownloadOutlined` | `exporting` | `viewOnly=true` | `handleExport` |
| インポート | `UploadOutlined`（type="primary"）| `importing` | `viewOnly=true` | hiddenの`<input type="file">`をclick |

### 4.3. 件数表示

```
N 件
```
- `globalNamespace.count`（i18nキー、`{count}` を件数に置換）
- Typography.Text type="secondary" fontSize=12

### 4.4. テーブル

| カラム | dataIndex | 幅 | ソート | 表示 |
|--------|-----------|-----|--------|------|
| Prefix | `prefix` | 200px | ✅（デフォルト昇順）| `<Text code fontWeight=600>` |
| URI | `uri` | — | ✅ | Tooltip + copyable Text（省略表示 maxWidth=600px）|

**ページネーション:**
| 設定 | 値 |
|------|-----|
| デフォルトページサイズ | 50件 |
| 切替オプション | 20 / 50 / 100 件 |
| showSizeChanger | 有効 |

**空データ時:**
- `globalNamespace.empty`（i18nキー）

---

## 5. 操作仕様

### 5.1. リロード

- `fetchDeclarations` を実行
- `loading` フラグを true にしてテーブルを Spin 表示
- `GET /api/v1/namespaces/global-declarations`（`getGlobalDeclarations`）で一覧取得

### 5.2. CSVインポート

1. インポートボタン押下 → hidden の `<input type="file" accept=".csv">` をクリック
2. ファイル選択後 → 確認ダイアログ（`Modal.confirm`）を表示
   - title: `globalNamespace.importConfirmTitle`
   - content: `globalNamespace.importConfirmContent`
   - okText: `globalNamespace.importConfirmOk`（danger）
   - cancelText: `common.cancel`
3. OK押下 → `importGlobalDeclarations(file)` でCSVを送信（**全置換**）
4. 成功: `message.success(globalNamespace.importSuccess)` + リロード
5. 失敗: `message.error(globalNamespace.importError)`

> ⚠️ インポートはCSV全置換です。既存データはすべて上書きされます。

### 5.3. CSVエクスポート

1. エクスポートボタン押下 → `exportGlobalDeclarations()` を実行
2. 成功: `message.success(globalNamespace.exportSuccess)`（ファイルダウンロードが自動開始）
3. 失敗: `message.error(globalNamespace.exportError)`

---

## 6. データ仕様

### 6.1. GlobalNamespaceEntry 型

```typescript
interface GlobalNamespaceEntry {
  prefix: string;
  uri: string;
}
```

### 6.2. データソース

- **ファイルパス**: `system/namespaces/global-declarations.csv`（ファイルサーバ）
- **DBではなくCSVファイルで管理**

---

## 7. API 連携

| 操作 | 関数名 | 用途 |
|------|-------|------|
| 一覧取得 | `getGlobalDeclarations` | テーブル表示用データ取得 |
| インポート | `importGlobalDeclarations(file)` | CSVアップロード（全置換）|
| エクスポート | `exportGlobalDeclarations` | CSVダウンロード |

---

## 8. エラーハンドリング

| エラー | 表示方法 | i18nキー |
|--------|---------|---------|
| 一覧取得失敗 | `message.error` | `globalNamespace.fetchError` |
| インポート失敗 | `message.error` | `globalNamespace.importError` |
| エクスポート失敗 | `message.error` | `globalNamespace.exportError` |

---

## 9. 使用コンポーネント

### Ant Design コンポーネント

| コンポーネント | 用途 |
|-------------|------|
| `Table` | 名前空間宣言一覧テーブル |
| `Button` | リロード・エクスポート・インポートボタン |
| `Modal.confirm` | インポート確認ダイアログ |
| `Tooltip` | URI全文表示 |
| `Spin` | テーブルローディング |
| `Typography.Title` | タイトル |
| `Typography.Text` | 説明・件数・URI表示（copyable付き）|
| `message` | 成功・エラートースト |

### アイコン

| アイコン | 用途 |
|---------|------|
| `GlobalOutlined` | プロバイダーメニュー タブ3 アイコン |
| `ReloadOutlined` | リロードボタン |
| `DownloadOutlined` | エクスポートボタン |
| `UploadOutlined` | インポートボタン |

---

## 10. 備考・注意事項

1. **データソースはCSVファイル**: DBの `namespaces` テーブルとは別管理。`PrefixManagement` コンポーネントとは連携しない。
2. **インポートは全置換**: CSVインポート時は既存の全データが上書きされる。確認ダイアログ（danger）で警告する。
3. **ページレイアウト**: コンテンツエリアの `padding` は `0 16px`。
4. **SSR**: `GlobalNamespaceView` は `'use client'` ディレクティブを使用。

---

## 11. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|----------|--------|
| 2026-08-19 | 1.0.0 | 初版作成（PrefixManagement/TermManagement ネストTabs構成） | Development Team |
| 2026-08-21 | 2.0.0 | 実装に合わせて全面更新。GlobalNamespaceView ベースに変更。サブタブ廃止・CSVファイルベースの操作仕様に差し替え | Cline |
