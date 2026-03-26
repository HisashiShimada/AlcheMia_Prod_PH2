# 組織管理画面UI設計書

## メタデータ
---
title: 組織管理画面UI設計書
category: UI設計
version: 1.0.0
last_updated: 2026-02-19
author: Development Team
tags: [provider, organization, list, main]
---

## 関連ドキュメント
- [組織追加ダイアログ](ui_organization_add_dialog.md)
- [組織編集ダイアログ](ui_organization_edit_dialog.md)
- [組織管理API仕様](../api/api_organization_management.md)
- [organizationテーブルDDL](../db/ddl/organization.sql)
- [UIポリシー](../../.clinerules/references/ui_policy.md)

---

## 1. 画面レイアウト

### 1.1. 画面イメージ

![[組織管理メイン画面イメージ]](images/ui_provider_organization_tab.jpg)

---

## 2. 概要

### 2.1. 目的

プロバイダーが組織マスタを管理するためのメイン画面を定義します。組織の一覧表示、検索、フィルタリング、追加、編集、ステータス切替、CSV入出力機能を提供します。

### 2.2. 利用権限

- **Provider（プロバイダー）**: 使用可能

### 2.3. URL

`/provider/organization`

---

## 3. 画面構成

### 3.1. レイアウト

```
┌──────────────────────────────────────────────────────────────┐
│ プロバイダー > 組織管理                                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [🔍 検索] [▼ ステータス] [CSV⬇] [CSV⬆] [+ 追加]   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 組織CD↕│組織e-mail↕│代表者↕│会社名↕│二段階│状態↕│更新日時↕│操作│
│  ├──────────────────────────────────────────────────────┤  │
│  │maiml_lab_001│org@example.com│山田太郎│サンプル株式会社│有効│●有効│2026/02/19│[編][切]│
│  │maiml_lab_002│org2@example.com│佐藤花子│テスト会社│無効│●有効│2026/02/18│[編][切]│
│  │maiml_lab_003│org3@example.com│田中太郎│研究所A│有効│○無効│2026/02/17│[編][切]│
│  │ ...                                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  全 15 件                                    [< 1 2 3 >]    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. ツールバー

### 4.1. 配置

**左側**: 検索・フィルタUI
**右側**: CSV操作、追加ボタン（右から主要な順）

### 4.2. コンポーネント

#### 4.2.1. 検索入力

**コンポーネント**: `<Input>`

**仕様**:
| 項目 | 値 |
|------|-----|
| プレースホルダー | 「組織CD、組織e-mail、代表システム管理者、更新日時で検索」 |
| 前置アイコン | `<SearchOutlined />` |
| 幅 | 350px |
| クリアボタン | 有効（allowClear） |

**検索対象**:
- 組織CD（部分一致）
- 組織e-mail（部分一致）
- 代表システム管理者名（部分一致）
- 更新日時（部分一致）

#### 4.2.2. ステータスフィルター

**コンポーネント**: `<Select>`

**仕様**:
| 項目 | 値 |
|------|-----|
| プレースホルダー | 「ステータス」 |
| 幅 | 150px |
| クリアボタン | 有効（allowClear） |

**選択肢**:
- すべて（フィルタなし）
- アクティブ
- 非アクティブ

#### 4.2.3. CSVダウンロードボタン

**コンポーネント**: `<Button>`

**仕様**:
| 項目 | 値 |
|------|-----|
| ラベル | 「CSV」 |
| タイプ | `default` |
| アイコン | `<DownloadOutlined />` |
| サイズ | 省略（デフォルト） |

**動作**:
1. 現在のフィルタ・検索条件を適用
2. API呼び出し: `GET /api/v1/provider/organization/download-csv`
3. CSVファイルをダウンロード
4. ファイル名: `organizations_YYYYMMDD_HHmmss.csv`

#### 4.2.4. CSVアップロードボタン

**コンポーネント**: `<Upload>` + `<Button>`

**仕様**:
| 項目 | 値 |
|------|-----|
| ラベル | 「CSV一括登録」 |
| タイプ | `default` |
| アイコン | `<UploadOutlined />` |
| サイズ | 省略（デフォルト） |
| 許可形式 | .csv |

**動作**:
1. CSVファイル選択
2. アップロード前にプレビュー表示（オプション）
3. API呼び出し: `POST /api/v1/provider/organization/upload-csv`
4. 結果表示（成功件数、失敗件数、エラー詳細）

#### 4.2.5. 追加ボタン

**コンポーネント**: `<Button>`

**仕様**:
| 項目 | 値 |
|------|-----|
| ラベル | 「追加」 |
| タイプ | `primary` |
| アイコン | `<PlusOutlined />` |
| サイズ | 省略（デフォルト） |

**動作**:
1. 組織追加ダイアログを開く
2. ダイアログで組織情報を入力
3. 保存後、一覧を再取得

## 5. データテーブル

### 5.1. テーブル仕様

**コンポーネント**: `<Table>`

**主要設定**:
| 項目 | 値 |
|------|-----|
| rowKey | `organizationId` |
| pagination | 有効 |
| pageSize | 20（デフォルト） |
| pageSizeOptions | [10, 20, 50, 100] |
| scroll | `{ x: 1400 }` |

### 5.2. カラム定義

#### 5.2.1. 組織CD

**プロパティ**:
| 項目 | 値 |
|------|-----|
| title | 「組織CD」 |
| dataIndex | `organizationCd` |
| key | `organizationCd` |
| width | 150px |
| align | `left` |
| sorter | 有効 |

#### 5.2.2. 組織e-mail

**プロパティ**:
| 項目 | 値 |
|------|-----|
| title | 「組織e-mail」 |
| dataIndex | `organizationEmail` |
| key | `organizationEmail` |
| width | 200px |
| align | `left` |
| sorter | 有効 |

#### 5.2.3. 代表システム管理者

**プロパティ**:
| 項目 | 値 |
|------|-----|
| title | 「代表システム管理者」 |
| dataIndex | `chiefUserName` |
| key | `chiefUserName` |
| width | 150px |
| align | `left` |
| sorter | 有効 |

#### 5.2.4. 会社名

**プロパティ**:
| 項目 | 値 |
|------|-----|
| title | 「会社名」 |
| dataIndex | `corporationName` |
| key | `corporationName` |
| width | 180px |
| align | `left` |
| sorter | 有効 |

#### 5.2.5. 二段階認証判定

**プロパティ**:
| 項目 | 値 |
|------|-----|
| title | 「二段階認証」 |
| dataIndex | `isEntry` |
| key | `isEntry` |
| width | 100px |
| align | `center` |
| sorter | 有効 |

**レンダリング**:
```typescript
render: (isEntry: number) => (
  <Badge 
    status={isEntry === 1 ? 'success' : 'default'} 
    text={isEntry === 1 ? '有効' : '無効'} 
  />
)
```

#### 5.2.6. 状態

**プロパティ**:
| 項目 | 値 |
|------|-----|
| title | 「状態」 |
| dataIndex | `isActive` |
| key | `isActive` |
| width | 100px |
| align | `center` |
| sorter | 有効 |

**レンダリング**:
```typescript
render: (isActive: boolean) => (
  <Badge 
    status={isActive ? 'success' : 'default'} 
    text={isActive ? 'アクティブ' : '非アクティブ'} 
  />
)
```

#### 5.2.7. 更新日時

**プロパティ**:
| 項目 | 値 |
|------|-----|
| title | 「更新日時」 |
| dataIndex | `updatedAt` |
| key | `updatedAt` |
| width | 180px |
| align | `right` |
| sorter | 有効 |
| defaultSortOrder | `descend` |

**レンダリング**:
```typescript
render: (date: string) => {
  return date ? new Date(date).toLocaleString('ja-JP') : '-';
}
```

#### 5.2.8. 操作

**プロパティ**:
| 項目 | 値 |
|------|-----|
| title | 「操作」 |
| key | `action` |
| width | 200px |
| align | `center` |
| fixed | `right` |

**レンダリング**:
```typescript
render: (_, record) => (
  <Space size="small">
    <Button 
      type="default" 
      size="small" 
      icon={<EditOutlined />}
      onClick={() => handleEdit(record.organizationId)}
    >
      編集
    </Button>
    <Button
      type="default"
      size="small"
      style={record.isActive ? {
        color: token.colorError,
        borderColor: token.colorError
      } : {
        color: token.colorSuccess,
        borderColor: token.colorSuccess
      }}
      onClick={() => handleStatusToggle(record.organizationId, !record.isActive)}
    >
      {record.isActive ? '非アクティブ化' : 'アクティブ化'}
    </Button>
  </Space>
)
```

---

## 6. ページネーション

### 6.1. 仕様

**コンポーネント**: `<Table>` の pagination プロパティ

**設定**:
```typescript
pagination={{
  pageSize: 20,
  showSizeChanger: true,
  showTotal: (total) => `全 ${total} 件`,
  pageSizeOptions: ['10', '20', '50', '100']
}}
```

---

## 7. APIリクエスト仕様

### 7.1. 一覧取得

**エンドポイント**: `GET /api/v1/provider/organization`

**クエリパラメータ**:
| パラメータ | 型 | 説明 |
|----------|-----|------|
| search | string | 検索テキスト（組織CD、組織e-mail、代表システム管理者、更新日時） |
| is_active | boolean | アクティブフィルタ |
| sort_by | string | ソートフィールド（organization_cd, update_at） |
| sort_order | string | ソート順（asc, desc） |

**リクエスト例**:
```http
GET /api/v1/provider/organization?search=研究所&is_active=true&sort_by=update_at&sort_order=desc
Authorization: Bearer {jwt_token}
```

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "organizationId": "550e8400-e29b-41d4-a716-446655440000",
      "organizationCd": "maiml_lab_001",
      "organizationDisplayName": "MAIML研究所",
      "organizationEmail": "org@example.com",
      "chiefUserId": "admin@example.com",
      "chiefUserName": "山田太郎",
      "corporationName": "サンプル株式会社",
      "isEntry": 1,
      "isActive": true,
      "updatedAt": "20260219131500"
    }
  ],
  "meta": {
    "timestamp": "2026-02-19T13:15:00Z",
    "requestId": "req_abc123"
  }
}
```

### 7.2. ステータス更新

**エンドポイント**: `PATCH /api/v1/provider/organization/:organizationId/status`

**リクエストボディ**:
```json
{
  "isActive": false
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "organizationId": "550e8400-e29b-41d4-a716-446655440000",
    "organizationCd": "maiml_lab_001",
    "organizationDisplayName": "MAIML研究所",
    "organizationEmail": "org@example.com",
    "chiefUserId": "admin@example.com",
    "chiefUserName": "山田太郎",
    "corporationName": "サンプル株式会社",
    "isEntry": 1,
    "isActive": false,
    "updatedAt": "20260219132000"
  },
  "meta": {
    "timestamp": "2026-02-19T13:20:00Z",
    "requestId": "req_def456"
  }
}
```

### 7.3. CSVダウンロード

**エンドポイント**: `GET /api/v1/provider/organization/download-csv`

**クエリパラメータ**: 一覧取得と同じ（search, is_active）

**レスポンス**: CSVファイル（UTF-8 BOM付き）

**CSV形式**:
```csv
organization_cd,organization_display_name,organization_email,chief_user_name,chief_user_email,corporation_name,is_entry,update_at,is_active
maiml_lab_001,MAIML研究所,org@example.com,山田太郎,admin@example.com,サンプル株式会社,1,20260219131500,true
```

### 7.4. CSVアップロード

**エンドポイント**: `POST /api/v1/provider/organization/upload-csv`

**リクエストヘッダー**:
```http
Content-Type: multipart/form-data
Authorization: Bearer {jwt_token}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "successCount": 10,
    "failureCount": 2,
    "errors": [
      {
        "row": 5,
        "field": "organization_cd",
        "message": "5行目: 組織CDは必須です"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-02-19T13:20:00Z",
    "requestId": "req_ghi789"
  }
}
```

## 8. イベントハンドリング

### 8.1. 検索

**トリガー**: 検索入力の変更（デバウンス500ms）

**処理**:
1. 検索テキストを状態に保存
2. 500msのデバウンス
3. API呼び出し

### 8.2. ステータスフィルター

**トリガー**: ステータス選択の変更

**処理**:
1. 選択値を状態に保存
2. API呼び出し

### 8.3. ソート

**トリガー**: カラムヘッダークリック

**処理**:
1. ソートフィールドとソート順を状態に保存
2. API呼び出し（ページ維持）

### 8.4. 編集ボタンクリック

**処理**:
1. 組織IDを保存
2. 編集ダイアログを開く
3. 保存後、一覧を再取得

### 8.5. ステータス切替ボタンクリック

**処理**:
1. 確認ダイアログ表示（非アクティブ化の場合）
2. API呼び出し: `PATCH /api/v1/provider/organization/:organizationId/status`
3. 成功時、一覧を再取得
4. 失敗時、エラーメッセージ表示

---

## 9. テスト要件

### 9.1. 単体テスト

#### テストケース
- データ取得機能のテスト
- 検索機能のテスト（デバウンス動作含む）
- フィルタリング機能のテスト
- ソート機能のテスト
- ステータス切替機能のテスト
- CSV入出力機能のテスト

### 9.2. 統合テスト

#### テストシナリオ
1. 画面初期表示（一覧取得）
2. 検索実行と結果表示
3. ステータスフィルタと結果表示
4. ソート実行と結果表示
5. 組織追加（ダイアログ連携）
6. 組織編集（ダイアログ連携）
7. ステータス切替（確認ダイアログ含む）
8. CSVダウンロード
9. CSVアップロード（成功・失敗含む）

---

## 10. アクセシビリティ

### 10.1. キーボード操作

- Tab: 次の要素へフォーカス移動
- Shift + Tab: 前の要素へフォーカス移動
- Enter: ボタン実行、行選択
- Space: チェックボックス切り替え
- 矢印キー: テーブル内ナビゲーション

### 10.2. スクリーンリーダー対応

- テーブルに適切な`aria-label`を設定
- ボタンに明確なラベルを設定
- ローディング状態を`aria-live`で通知
- エラーメッセージを`role="alert"`で通知

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-02-19 | 初版作成 | Development Team |
