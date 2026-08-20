# 名前空間管理（グローバル）タブ UI設計書

## メタデータ
- **画面名**: 名前空間管理（グローバル）タブ
- **物理名**: ProviderMenu.tsx（タブ3） / PrefixManagement.tsx / TermManagement.tsx
- **ファイルパス**:
  - `frontend/src/components/menus/ProviderMenu.tsx`
  - `frontend/src/components/namespace/PrefixManagement.tsx`
  - `frontend/src/components/namespace/TermManagement.tsx`
- **利用権限**: プロバイダー（provider / sys_admin）
- **作成日**: 2026-08-19
- **最終更新日**: 2026-08-19
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

プロバイダーメニュー（`ProviderMenu.tsx`）のタブ3として追加された画面です。  
全組織・全ユーザーが参照できる**グローバルスコープ**の名前空間（Prefix / 用語）を管理するためのタブです。

`globalOnly={true}` プロパティを渡すことで、`PrefixManagement` および `TermManagement` の表示・操作をグローバル名前空間のみに限定しています。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `sys_admin` / `provider` | ✅ 閲覧・編集可 |
| それ以外 | ❌ プロバイダーメニュー自体にアクセス不可 |

### 1.3. 主要機能

1. **グローバル Prefix の管理** — グローバルスコープの Prefix 一覧表示・追加・編集・削除・CSV インポート/エクスポート
2. **グローバル用語の管理** — グローバルスコープの用語一覧表示・追加・編集・有効/無効切替・CSV インポート/エクスポート

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

```
┌──────────────────────────────────────────────────────────────────────┐
│ 名前空間管理（グローバル）タブ                                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────┬────────────────────────────────────────────────┐   │
│  │ Prefix       │ 用語                                            │   │
│  ├──────────────┴────────────────────────────────────────────────┤   │
│  │                                                                 │   │
│  │  ── Prefix タブコンテンツ（PrefixManagement globalOnly） ──     │   │
│  │  [ツールバー: 検索 | インポート | エクスポート | +Prefix | 保存]  │   │
│  │  ┌────────┬───────────────────────────┬────────┬─────┬──────┐ │   │
│  │  │ Prefix │ URI                        │ 説明   │スコープ│ 操作 │ │   │
│  │  ├────────┼───────────────────────────┼────────┼─────┼──────┤ │   │
│  │  │ maiml  │ http://www.maiml.org/...   │ MaiML標│  —  │[編集][削除]│ │   │
│  │  │ xsi    │ http://www.w3.org/...      │ XMLスキ│  —  │[編集][削除]│ │   │
│  │  └────────┴───────────────────────────┴────────┴─────┴──────┘ │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
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
| `'3'` | `menu.provider.tabs.namespaceManagement` | `GlobalOutlined` | ネストした Tabs（後述）|
| `'4'` | `menu.provider.tabs.informationDownload` | `DatabaseOutlined` | `InformationDownload` |

### 3.2. タブ3 のネスト Tabs

```typescript
<Tabs
  defaultActiveKey="prefix"
  items={[
    {
      key: 'prefix',
      label: t('namespace.tabs.prefix'),
      children: <PrefixManagement globalOnly={true} />,
    },
    {
      key: 'terms',
      label: t('namespace.tabs.terms'),
      children: <TermManagement globalOnly={true} />,
    },
  ]}
/>
```

---

## 4. PrefixManagement（グローバルモード）

### 4.1. コンポーネント Props

```typescript
interface PrefixManagementProps {
  viewOnly?: boolean;      // false（編集可）
  globalOnly?: boolean;    // true（グローバルPrefixのみ）
  selectedNsKey?: string;  // 未指定
  scopeKey?: string;       // 未指定
}
```

### 4.2. 画面構成

#### ツールバー

| 要素 | 配置 | 説明 |
|------|------|------|
| 検索欄 | 左 | Prefix / URI / 説明でフリーワード検索（`SearchOutlined` prefix付き、allowClear）|
| インポートボタン | 右 | CSVファイルを選択してDBへ一括登録 |
| エクスポートボタン | 右 | 表示中データをCSVとしてダウンロード（`prefixes.csv`）|
| +Prefix ボタン | 右 | `type="primary"` / `PlusOutlined`。押下でテーブル先頭に入力行を追加 |
| 保存ボタン | 右 | `type="primary"` / `SaveOutlined`。未保存行（newRows）があるとき有効。押下でDB保存 |
| キャンセルボタン | 右 | 未保存行（newRows）があるとき有効。押下で入力行を全破棄 |

#### テーブル（グローバルPrefixのみ表示）

| カラム | データキー | 幅 | ソート | 説明 |
|--------|-----------|-----|--------|------|
| Prefix | `prefix` | 160px | ✅ | 入力行：テキスト入力。既存行：`Text strong` で表示。編集時：テキスト入力 |
| URI | `uri` | — | — | 入力行：テキスト入力（`https://...` 形式）。既存行：青文字で Tooltip 付き表示 |
| 説明 | `description` | 200px | — | 入力行：テキスト入力。既存行：テキスト表示 |
| スコープ | `scopePath` | 160px | ✅ | 既存行：小さなラベル（`#f5f5f5` 背景）で表示。入力行：`—` |
| 操作 | — | 180px | — | 通常時：[編集][削除] / 編集時：[保存][キャンセル] |

> **グローバルモード時の挙動**: `isGlobal: true` で `createNamespace` を呼び出すことで、グローバルスコープの Prefix として登録される。

#### ページネーション

| 設定 | 値 |
|------|-----|
| デフォルトページサイズ | 20件 |
| 切替オプション | 20 / 50 / 100 件 |
| 合計件数表示 | `N 件` |

### 4.3. 操作仕様

#### Prefix 追加
1. `+Prefix` ボタン押下 → テーブル先頭に黄色背景（`#fffbe6`）の新規入力行を追加
2. Prefix（必須）・URI（必須）・説明を入力
3. `保存` ボタン押下
   - 重複Prefixチェック: 既存の同名 Prefix が存在する場合は確認ダイアログ（`Modal.confirm`）
   - 確認後: `POST /api/v1/namespaces` で登録（`isGlobal: true`）

#### Prefix 編集
1. `編集` ボタン押下 → 行がインライン編集モードに切り替わる
2. URI を変更
3. `保存` ボタン押下 → `PATCH /api/v1/namespaces/:prefix` で更新

#### Prefix 削除
1. `削除` ボタン押下 → 確認ダイアログ（`Modal.confirm`）
2. 確認後 → `DELETE /api/v1/namespaces/:prefix` で削除

#### CSV インポート
- フォーマット: `prefix,uri,description`（1行目はヘッダー）
- 各行を順次 `POST /api/v1/namespaces` で登録
- `isGlobal: true` で送信

#### CSV エクスポート
- 現在表示中のデータを `prefixes.csv` でダウンロード
- フォーマット: `prefix,uri,description`（BOM付きUTF-8）

### 4.4. エラーハンドリング

| エラー | 表示方法 | メッセージ（i18n キー）|
|--------|---------|---------------------|
| Prefix 未入力で保存 | `message.error` | `prefixManagement.prefixRequired` |
| URI 未入力で保存 | `message.error` | `prefixManagement.uriRequired` |
| 取得失敗 | `message.error` | `prefixManagement.fetchError` |
| 更新失敗 | `message.error` | `prefixManagement.updateError` |
| 削除失敗 | `message.error` | `prefixManagement.deleteError` |
| CSV 行数不足 | `message.error` | `prefixManagement.csvEmpty` |
| CSV データなし | `message.error` | `prefixManagement.csvNoData` |
| 重複Prefix確認 | `Modal.confirm` | `prefixManagement.warnAlreadyRegistered` |

---

## 5. TermManagement（グローバルモード）

### 5.1. コンポーネント Props

```typescript
interface TermManagementProps {
  viewOnly?: boolean;      // false（編集可）
  globalOnly?: boolean;    // true（グローバル用語のみ）
  selectedNsKey?: string;  // 未指定
}
```

### 5.2. 画面構成

#### ツールバー

| 要素 | 配置 | 説明 |
|------|------|------|
| 検索欄 | 左 | Prefix / ローカル名 / 表示名 / 説明でフリーワード検索 |
| Prefix フィルター | 左 | Prefix でフィルタリング（`Select allowClear`）|
| タイプ フィルター | 左 | xsi:type でフィルタリング（`Select allowClear`）|
| インポートボタン | 右 | CSVファイルを選択してDBへ一括登録 |
| エクスポートボタン | 右 | 表示中データをCSVとしてダウンロード（`terms.csv`）|
| +用語ボタン | 右 | `type="primary"` / `PlusOutlined`。押下でテーブル先頭に入力行を追加 |
| 保存ボタン | 右 | `type="primary"` / `SaveOutlined`。未保存行があるとき有効 |
| キャンセルボタン | 右 | 未保存行があるとき有効。入力行を全破棄 |

#### テーブル

| カラム | データキー | 幅 | 説明 |
|--------|-----------|-----|------|
| Prefix | `prefix` | 140px | 入力行：Prefix セレクト（DB取得済み Prefix から選択）。既存行：`Text strong` |
| ローカル名 | `localName` | 180px | 入力行：テキスト入力。既存行：`Text code` |
| 表示名 | `displayName` | 160px | 入力行：テキスト入力。既存行：テキスト表示（編集時は入力に切替）|
| 説明 | `description` | — | 入力行：テキスト入力（ellipsis）。既存行：テキスト表示（編集時は入力に切替）|
| タイプ | `type` | 130px | 入力行：Select（6種類から選択）。既存行：色付き Tag（編集時は Select）|
| 単位 | `unitHint` | 100px | 入力行：テキスト入力。既存行：テキスト表示（編集時は入力）|
| スコープ | — | 140px | 既存行：`prefix → 組織名` マップから取得した名前を `geekblue` Tag で表示 |
| 操作 | — | 200px | 通常時：[編集][有効化/無効化] / 編集時：[保存][キャンセル] |

#### タイプ一覧

| 値 | Tag色 |
|----|-------|
| `stringType` | blue |
| `integerType` | green |
| `floatType` | cyan |
| `booleanType` | orange |
| `dateTimeType` | purple |
| `uriType` | magenta |

### 5.3. 操作仕様

#### 用語追加
1. `+用語` ボタン押下 → テーブル先頭に新規入力行を追加
2. Prefix（必須・セレクト）・ローカル名（必須）・表示名・説明・タイプ・単位を入力
3. `保存` ボタン押下 → 重複チェック後 `POST /api/v1/namespaces/terms` で登録

**重複チェックロジック（クライアントサイド）：**
1. 完全一致（同 `prefix:localName`）→ `Modal.error` でエラー表示（登録不可）
2. `prefix` 違い・同 `localName` → `Modal.confirm` で確認（登録続行可）

#### 用語編集
1. `編集` ボタン押下 → 行がインライン編集モードに切り替わる（表示名・説明・タイプ・単位を編集可）
2. `保存` ボタン押下 → `PATCH /api/v1/namespaces/:prefix/terms/:localName` で更新

#### 有効/無効切替
- `無効化` ボタン → `Modal.confirm` → `PATCH` でステータスを `inactive` に変更
- `有効化` ボタン → `Modal.confirm` → `PATCH` でステータスを `active` に変更
- `isActive === false` の行は `無効化` ボタンが `有効化` ボタンに切替

#### CSV インポート
- フォーマット: `prefix,localName,displayName,description,typeHint,unitHint`（1行目はヘッダー）
- 各行を順次 `POST /api/v1/namespaces/terms` で登録

#### CSV エクスポート
- 現在フィルター適用済みのデータを `terms.csv` でダウンロード
- フォーマット: `prefix,localName,displayName,description,type,unitHint`（BOM付きUTF-8）

### 5.4. エラーハンドリング

| エラー | 表示方法 | メッセージ（i18n キー）|
|--------|---------|---------------------|
| Prefix 未選択で保存 | `message.error` | `termManagement.prefixRequired` |
| ローカル名未入力で保存 | `message.error` | `termManagement.localNameRequired` |
| 取得失敗 | `message.error` | `termManagement.fetchError` |
| 更新失敗 | `message.error` | `termManagement.updateError` |
| 完全一致重複 | `Modal.error` | `termManagement.duplicateErrorTitle` + `termManagement.duplicateError` |
| prefix違い・名前同一 | `Modal.confirm` | `termManagement.duplicateWarningTitle` + `termManagement.duplicateWarningMessage` |
| 409 Conflict（サーバー） | `Modal.error` | `termManagement.duplicateErrorTitle` + `termManagement.duplicateErrorWithScope` |
| CSV データなし | `message.error` | `termManagement.csvEmpty` |

---

## 6. API 連携

### 6.1. PrefixManagement で使用するエンドポイント

| 操作 | メソッド | パス | 用途 |
|------|---------|------|------|
| 一覧取得 | GET | `/api/v1/namespaces` | Prefix 一覧取得 |
| 新規登録 | POST | `/api/v1/namespaces` | Prefix 登録（`isGlobal: true`）|
| 更新 | PATCH | `/api/v1/namespaces/:prefix` | URI を更新 |
| 削除 | DELETE | `/api/v1/namespaces/:prefix` | Prefix を削除 |

### 6.2. TermManagement で使用するエンドポイント

| 操作 | メソッド | パス | 用途 |
|------|---------|------|------|
| Prefix 一覧取得 | GET | `/api/v1/namespaces` | Prefix セレクト用 |
| 用語一覧取得 | GET | `/api/v1/namespaces/terms` | 用語一覧取得 |
| 祖先グループ取得 | GET | `/api/v1/organization-groups/ancestors` | 重複チェック用スコープ取得 |
| 用語登録 | POST | `/api/v1/namespaces/terms` | 用語登録 |
| 用語更新 | PATCH | `/api/v1/namespaces/:prefix/terms/:localName` | 用語更新 |
| 有効/無効切替 | PATCH | `/api/v1/namespaces/:prefix/terms/:localName/toggle-active` | アクティブ状態変更 |

---

## 7. 使用コンポーネント

### Ant Design コンポーネント

| コンポーネント | 用途 |
|-------------|------|
| `Layout` / `Content` | ProviderMenu の全体レイアウト |
| `Tabs` | プロバイダーメニュータブ / 名前空間管理サブタブ |
| `Table` | Prefix / 用語の一覧テーブル |
| `Input` | 検索欄・インライン入力フィールド |
| `Select` | フィルター・Prefix 選択・タイプ選択 |
| `Button` | ツールバーボタン群・操作列ボタン |
| `Modal.confirm` / `Modal.error` | 確認・エラーダイアログ |
| `Tooltip` | URI 省略表示・スコープ省略表示 |
| `Tag` | タイプ表示・スコープ表示 |
| `Spin` | テーブルローディング |
| `Typography.Text` | テーブルセル内テキスト |
| `message` | 成功・エラートースト |

### アイコン

| アイコン | 用途 |
|---------|------|
| `GlobalOutlined` | プロバイダーメニュー タブ3 アイコン |
| `PlusOutlined` | +Prefix / +用語 ボタン |
| `SaveOutlined` | 保存ボタン |
| `EditOutlined` | 編集ボタン |
| `DeleteOutlined` | 削除ボタン（PrefixManagement）|
| `CloseOutlined` | 入力行削除ボタン（TermManagement）|
| `SearchOutlined` | 検索欄 prefix アイコン |
| `WarningOutlined` | 重複確認ダイアログアイコン |

---

## 8. 備考・注意事項

1. **グローバル Prefix とは**: `is_global = TRUE` で登録された名前空間。`maiml`（`http://www.maiml.org/schemas`）や `xsi`（`http://www.w3.org/2001/XMLSchema-instance`）など、MaiML 標準の Prefix がデフォルトで含まれる。
2. **スコープ列の挙動**: `globalOnly=true` の場合でも PrefixManagement のスコープ列は非表示にならない（`TermManagement` のスコープ列は `globalOnly=true` でも表示される）。
3. **ページレイアウト**: コンテンツエリアの `marginTop` は Header（64px）+ SubHeader（76px）の合計 140px。
4. **動的インポート**: `PrefixManagement` と `TermManagement` は `dynamic()` を使用した SSR 無効インポートで読み込まれる。
