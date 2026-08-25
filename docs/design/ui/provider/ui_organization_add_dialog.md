# 組織追加ダイアログUI設計書

## メタデータ
---
title: 組織追加ダイアログUI設計書
category: UI設計
version: 2.0.0
last_updated: 2026-08-21
author: Development Team
tags: [provider, organization, dialog, create]
---

## 関連ドキュメント
- [組織管理メイン画面](ui_organization_main.md)
- [組織編集ダイアログ](ui_organization_edit_dialog.md)
- [組織管理API仕様](../api/api_organization_management.md)
- [organizationテーブルDDL](../db/ddl/organization.sql)
- [UIポリシー](../../.clinerules/references/ui_policy.md)

---

## 1. 画面レイアウト

### 1.1. 画面イメージ

![[組織追加ダイアログ画面イメージ]](images/ui_provider_organization_add_dialog.jpg)

---

## 2. 概要

### 2.1. 目的

プロバイダーが新しい組織を登録するためのダイアログを定義します。組織情報・契約情報・代表者情報・名前空間情報を入力して組織マスタに追加します。

### 2.2. 利用権限

- **Provider（プロバイダー）**: 使用可能

---

## 3. ダイアログ構成

### 3.1. ダイアログ概要

**表示トリガー**: 組織管理画面の「追加」ボタンクリック

**モーダルタイプ**: Modal（`forceRender` 有効）

**サイズ**: 600px

### 3.2. レイアウト

フォームは3つのセクション（Divider区切り）で構成されます。

```
┌────────────────────────────────────────────────────────┐
│ 組織追加                                          × │
├────────────────────────────────────────────────────────┤
│  ────────────── 組織情報 ──────────────                │
│                                                        │
│  組織CD *                                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  組織表示名 *                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  組織e-mail *                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  会社名                                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [▼選択してください]                             │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  契約容量 *                                            │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  契約ユーザー数 *                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  契約プロジェクト数 *                                  │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  二段階認証判定 *                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [▼選択してください]                             │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  みなし進捗使用 *                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [▼選択してください]                             │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  状態 *                                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [▼アクティブ]                                   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  データ保持日数 *                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│  （システム設定のデフォルト値が初期入力される）         │
│                                                        │
│  ────────────── 代表者情報 ──────────────              │
│                                                        │
│  代表システム管理者名 *                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  代表者メールアドレス *                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ────────────── 名前空間情報 ──────────────            │
│                                                        │
│  名前空間URI（自動生成）                               │
│  （組織CDの入力に連動して自動生成されたURIを表示）     │
│                                                        │
├────────────────────────────────────────────────────────┤
│                            [キャンセル] [保存]        │
└────────────────────────────────────────────────────────┘
```

---

## 4. 入力項目

### 4.1. 組織情報セクション（Divider: 「組織情報」）

#### 4.1.1. 組織CD（必須）

**コンポーネント**: `<Form.Item>` + `<Input>`

**仕様**:
| 項目 | 値 |
|------|-----|
| ラベル | `organizationManagement.form.organizationCd` |
| 型 | text |
| 必須 | ○ |

**バリデーション**:
```typescript
{ required: true, message: t('organizationManagement.form.organizationCdRequired') }
```

**409エラー処理**:
- APIから `DUPLICATE_ORGANIZATION_CD` エラーが返った場合、フォームフィールドにエラーを表示

#### 4.1.2. 組織表示名（必須）

**コンポーネント**: `<Form.Item>` + `<Input>`

**仕様**:
| 項目 | 値 |
|------|-----|
| ラベル | `organizationManagement.form.organizationDisplayName` |
| 型 | text |
| 必須 | ○ |

**バリデーション**:
```typescript
{ required: true, message: t('organizationManagement.form.organizationDisplayNameRequired') }
```

#### 4.1.3. 組織e-mail（必須）

**コンポーネント**: `<Form.Item>` + `<Input>`

**仕様**:
| 項目 | 値 |
|------|-----|
| ラベル | `organizationManagement.form.organizationEmail` |
| 型 | text |
| 必須 | ○ |

**バリデーション**:
```typescript
{ required: true, message: t('organizationManagement.form.organizationEmailRequired') }
```

#### 4.1.4. 会社名（任意）

**コンポーネント**: `<Form.Item>` + `<Select>`

**仕様**:
| 項目 | 値 |
|------|-----|
| name | `corporationId` |
| ラベル | `organizationManagement.form.corporationName` |
| 必須 | ❌ |
| 検索 | `showSearch` 有効 |
| プレースホルダー | `organizationManagement.form.corporationNamePlaceholder` |

#### 4.1.5. 契約容量（必須）

**コンポーネント**: `<Form.Item>` + `<InputNumber>`

**仕様**:
| 項目 | 値 |
|------|-----|
| name | `contractCapacity` |
| ラベル | `organizationManagement.form.contractCapacity` |
| 必須 | ○ |
| min | 0 |
| precision | 0（整数のみ）|

**バリデーション**:
```typescript
{ required: true, message: t('organizationManagement.form.contractCapacityRequired') }
```

#### 4.1.6. 契約ユーザー数（必須）

**コンポーネント**: `<Form.Item>` + `<InputNumber>`

**仕様**:
| 項目 | 値 |
|------|-----|
| name | `contractedUsers` |
| ラベル | `organizationManagement.form.contractedUsers` |
| 必須 | ○ |
| min | 0 |
| precision | 0（整数のみ）|

#### 4.1.7. 契約プロジェクト数（必須）

**コンポーネント**: `<Form.Item>` + `<InputNumber>`

**仕様**:
| 項目 | 値 |
|------|-----|
| name | `contractedProjects` |
| ラベル | `organizationManagement.form.contractedProjects` |
| 必須 | ○ |
| min | 0 |
| precision | 0（整数のみ）|

#### 4.1.8. 二段階認証判定（必須）

**コンポーネント**: `<Form.Item>` + `<Select>`

**仕様**:
| 項目 | 値 |
|------|-----|
| name | `isEntry` |
| ラベル | `organizationManagement.form.isEntry` |
| 必須 | ○ |
| 選択肢 | `{ value: 0, label: '無効' }` / `{ value: 1, label: '有効' }` |

#### 4.1.9. みなし進捗使用（必須）

**コンポーネント**: `<Form.Item>` + `<Select>`

**仕様**:
| 項目 | 値 |
|------|-----|
| name | `useDeemedProgress` |
| ラベル | `organizationManagement.form.useDeemedProgress` |
| 必須 | ○ |
| 選択肢 | `{ value: true, label: '有効' }` / `{ value: false, label: '無効' }` |

#### 4.1.10. 状態（必須）

**コンポーネント**: `<Form.Item>` + `<Select>`

**仕様**:
| 項目 | 値 |
|------|-----|
| name | `isActive` |
| ラベル | `organizationManagement.form.status` |
| 必須 | ○ |
| 選択肢 | `{ value: true, label: 'アクティブ' }` / `{ value: false, label: '非アクティブ' }` |

#### 4.1.11. データ保持日数（必須）

**コンポーネント**: `<Form.Item>` + `<InputNumber>`

**仕様**:
| 項目 | 値 |
|------|-----|
| name | `defaultRetentionDays` |
| ラベル | `organizationManagement.form.defaultRetentionDays` |
| 必須 | ○ |
| min | 1 |
| precision | 0（整数のみ）|
| 初期値 | システム設定（`defaultRetentionDays`）から取得。取得失敗時は 30 |
| extra | `organizationManagement.form.defaultRetentionDaysHelp` |

**バリデーション**:
```typescript
{ required: true, message: t('organizationManagement.form.defaultRetentionDaysRequired') },
{ type: 'integer', min: 1, message: t('organizationManagement.form.defaultRetentionDaysInvalid') }
```

---

### 4.2. 代表者情報セクション（Divider: 「代表者情報」）

#### 4.2.1. 代表システム管理者名（必須）

**コンポーネント**: `<Form.Item>` + `<Input>`

**仕様**:
| 項目 | 値 |
|------|-----|
| name | `chiefUserName` |
| ラベル | `organizationManagement.form.chiefUserName` |
| 必須 | ○ |
| autocomplete | off |

**バリデーション**:
```typescript
{ required: true, message: t('organizationManagement.form.chiefUserNameRequired') }
```

#### 4.2.2. 代表者メールアドレス（必須）

**コンポーネント**: `<Form.Item>` + `<Input>`

**仕様**:
| 項目 | 値 |
|------|-----|
| name | `chiefUserEmail` |
| ラベル | `organizationManagement.form.chiefUserEmail` |
| 必須 | ○ |
| autocomplete | off |

**バリデーション**:
```typescript
{ required: true, message: t('organizationManagement.form.chiefUserEmailRequired') }
```

---

### 4.3. 名前空間情報セクション（Divider: 「名前空間情報」）

#### 4.3.1. 名前空間URI（自動生成・表示のみ）

**コンポーネント**: `AddFormNamespaceFields`（内部コンポーネント）

**仕様**:
- 組織CD（`organizationCd`）の入力に連動して `generateNamespaceUri(organizationCd, undefined)` でURIを自動生成し表示
- 入力フィールドではなく `Typography.Text` で表示のみ
- 組織CDが未入力の場合: `organizationManagement.form.namespaceUriAutoGenPlaceholder` をグレーで表示
- ラベル: `organizationManagement.form.namespaceUriAutoGenLabel`
- 保存時に自動生成されたURIがバックエンドへ送信される

---

## 5. フォーム送信処理

### 5.1. 保存処理

```typescript
const organizationId = uuidv4();
await client.post('/provider/organization', { organizationId, ...values });
```

- `organizationId` は `uuidv4()` で生成して付与
- フォームの全フィールド値（+ `organizationId`）を `POST /provider/organization` へ送信

### 5.2. バリデーションエラー

- `form.validateFields()` によるクライアントサイドバリデーションは自動的にフォームに表示

### 5.3. APIエラー

| HTTPステータス | エラーコード | 対処 |
|-------------|------------|------|
| 409 | `DUPLICATE_ORGANIZATION_CD` | `organizationCd` フィールドにエラー表示 + `message.error` |
| その他 | — | `extractErrorMessage` で統一メッセージ表示 |

---

## 6. 使用コンポーネント

| コンポーネント | 用途 |
|-------------|------|
| `Modal` | ダイアログコンテナ（`forceRender`有効、width=600）|
| `Form` | フォームコンテナ（`layout="vertical"`）|
| `Form.Item` | 各入力フィールドのラッパー |
| `Input` | テキスト入力（組織CD・表示名・メール・代表者名等）|
| `InputNumber` | 数値入力（契約容量・ユーザー数・プロジェクト数・保持日数）|
| `Select` | 選択（会社名・二段階認証・みなし進捗・状態）|
| `Divider` | セクション区切り |
| `Typography.Text` | 名前空間URI表示 |
| `AddFormNamespaceFields` | 名前空間URI自動生成表示（内部コンポーネント）|

---

## 7. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|----------|--------|
| 2026-02-19 | 1.0.0 | 初版作成 | Development Team |
| 2026-08-21 | 2.0.0 | ソース実装に合わせて全面更新。モーダル幅・フィールド構成・新規フィールド（契約情報・みなし進捗・データ保持日数・名前空間URI自動生成）を追加 | Cline |
