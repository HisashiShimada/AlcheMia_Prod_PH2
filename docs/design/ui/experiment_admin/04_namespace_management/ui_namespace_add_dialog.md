# MaiML 名前空間管理ツール 名前空間追加ダイアログ UI設計書

## メタデータ
---
title: MaiML 名前空間管理ツール 名前空間追加ダイアログ UI設計書
category: UI設計
version: 1.2.0
last_updated: 2026-07-07
author: Development Team
tags: [namespace, maiml, dialog, add, prefix, uri, orcid, department-node]
---

## 関連ドキュメント
- [メイン画面](ui_namespace_main.md)
- [MaiMLファイルエディター](ui_namespace_maiml_editor.md)

---

## 1. 概要

### 1.1. 目的

名前空間ツリーの [+] ボタン押下時に表示されるモーダルダイアログ。グローバル / 組織 / 個人の3レベルに対応した入力フォームを提供し、新しい名前空間を登録する。

### 1.2. 利用権限

- **実験管理者 (Experiment Admin)**: 使用可能
- **データ管理者 (Data Admin)**: 使用可能

### 1.3. 表示トリガー

名前空間ツリーペイン右上の `[+]` ボタンクリック

### 1.4. 実装ステータス

| ファイル | ステータス |
|---------|-----------|
| `frontend/src/components/namespace/NamespaceAddDialog.tsx` | ✅ 実装済み |
| `frontend/src/components/namespace/NamespaceMain.tsx` への接続 | ✅ 実装済み（`[+]` ボタン → ダイアログ開閉）|

---

## 2. 画面レイアウト

### 2.1. ダイアログ全体

```
┌──────────────────────────────────────────────────────────────┐
│  MaiML 名前空間管理ツール ― 名前空間追加ダイアログ             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  * レベル選択                                                │
│    ○ グローバル（Global）                                    │
│    ◉ 組織 (Organization)  ← 選択中                          │
│    ○ 個人 (Personal)                                         │
│    ℹ 組織レベル選択時: DNSベースのURIガイダンスを表示します   │
│                                                              │
│  * 接頭辞 (Prefix)                                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 例: CorpA                                            │   │
│  └──────────────────────────────────────────────────────┘   │
│    ℹ xs:NCName規則: 英字または_で始まる英数字・アンダー        │
│       スコア・ハイフン・ピリオドのみ                           │
│                                                              │
│  * URI                                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 例: https://www.corpa.co.jp/                         │   │
│  └──────────────────────────────────────────────────────┘   │
│    ℹ https:// または urn: で始まる有効なURIを入力してください  │
│                                                              │
│  表示名                                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 例: CorpA 社内用語                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│    ℹ ツール内での表示用ラベル（任意）                          │
│                                                              │
│  説明                                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 名前空間の用途・背景を入力...                         │   │
│  │                                                      │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  親名前空間  ※ 組織レベル選択時のみ表示                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ （親名前空間を選択）                            ▼    │   │
│  └──────────────────────────────────────────────────────┘   │
│    ℹ ※ 組織レベル選択時のみ表示                               │
│                                                              │
│  🔗 ORCID から URI を自動入力  ※ 個人レベル選択時のみ表示     │
│                                                              │
│              [✔ 登録する]       [✕ キャンセル]               │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. コンポーネント仕様

### 3.1. ダイアログ本体

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Modal>` (Ant Design) |
| タイトル | 「名前空間追加」 |
| 幅 | 560px |
| maskClosable | false（背景クリックで閉じない） |
| keyboard | true（Escキーで閉じる） |
| footer | なし（カスタムフッターを使用） |

### 3.2. レベル選択

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Radio.Group>` |
| 必須 | ✅ 必須 |
| デフォルト | `organization`（組織） |

**選択肢**:

| value | ラベル | 補足情報（ℹ表示） |
|-------|-------|----------------|
| `global` | グローバル（Global） | — |
| `organization` | 組織 (Organization) | DNSベースのURIガイダンスを表示（`https://www.{domain}/` 形式推奨） |
| `personal` | 個人 (Personal) | ORCIDからURI自動入力ボタンを表示 |

**レベル別の条件表示**:

| レベル | 親名前空間フィールド | ORCID自動入力ボタン |
|-------|---------------------|-------------------|
| global | ❌ 非表示 | ❌ 非表示 |
| organization | ✅ 表示 | ❌ 非表示 |
| personal | ❌ 非表示 | ✅ 表示 |

### 3.3. 接頭辞（Prefix）入力

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Input>` |
| ラベル | 「接頭辞 (Prefix)」 |
| 必須 | ✅ 必須 |
| プレースホルダー | 「例: CorpA」 |
| 最大文字数 | 64文字 |
| バリデーション | xs:NCName規則（後述） |

**xs:NCName バリデーション規則**:

```typescript
// xs:NCName: 英字または _ で始まり、英数字・_・-・. のみ使用可
const ncNamePattern = /^[a-zA-Z_][a-zA-Z0-9_\-\.]*$/;

const validatePrefix = (value: string): string | null => {
  if (!value) return '接頭辞は必須です';
  if (!ncNamePattern.test(value)) {
    return '英字または _ で始まり、英数字・アンダースコア・ハイフン・ピリオドのみ使用可能です';
  }
  if (value.length > 64) return '64文字以内で入力してください';
  return null;
};
```

**ガイダンスメッセージ**:
> ℹ xs:NCName規則: 英字または_で始まる英数字・アンダースコア・ハイフン・ピリオドのみ

### 3.4. URI 入力

> ⚠️ **実装との差異**: `organization` レベル選択時、URI は **自動生成（読み取り専用）** となる。  
> Prefix の入力に連動して `generateNamespaceUri` ユーティリティが URI を算出し、フィールドに表示する。  
> `global` / `personal` レベルでは手動入力のまま。

| 項目 | レベル: global / personal | レベル: organization |
|------|--------------------------|---------------------|
| コンポーネント | `<Input>` | `<Input disabled>` |
| ラベル | 「URI」 | 「URI（自動生成）」 |
| 必須 | ✅ 必須 | — （自動生成のため入力不要） |
| プレースホルダー | 「例: https://www.corpa.co.jp/」 | — |
| 最大文字数 | 512文字 | — |
| バリデーション | `https://`・`http://` または `urn:` で始まること | 自動生成のためバリデーション不要 |

**URI自動生成ルール（organization レベル）**:

`frontend/src/utils/namespaceUriGenerator.ts` の `generateNamespaceUri()` を使用して生成する。

| 引数 | 値 |
|------|-----|
| `organizationCd` | ログインユーザーの組織CD |
| `departmentCd` | ログインユーザーの部署CD（取得できた場合） |
| `unitName` | （TeamAddDialog 経由の場合のみ指定） |

**生成パターン**:

```
generateNamespaceUri('ORG001', 'RD')
// => 'https://ORG001/RD/'

generateNamespaceUri('ORG001')
// => 'https://ORG001/'
```

**`generateNamespaceUri` の仕様**（`frontend/src/utils/namespaceUriGenerator.ts`）:

```typescript
/**
 * URI生成ルール:
 *   https://{organization_cd}/{department_cd}/{unit_slug}/
 *   - チームなし: https://{org_cd}/{dept_cd}/
 *   - 部署なし:   https://{org_cd}/
 *   - 日本語スラッグは wanakana でローマ字化
 */
export function generateNamespaceUri(
  organizationCd: string,
  departmentCd?: string,
  unitName?: string,
): string
```

**ガイダンスメッセージ（レベル別）**:

| レベル | ガイダンス |
|-------|-----------|
| global | ℹ https:// または urn: で始まる有効なURIを入力してください |
| organization | ℹ URI は組織CD・部署CDをもとに自動生成されます（読み取り専用） |
| personal | ℹ https://orcid.org/XXXX-XXXX-XXXX-XXXX 形式のORCID URIを推奨します |

**URIバリデーション（global / personal レベル）**:

```typescript
const validateUri = (value: string): string | null => {
  if (!value) return 'URIは必須です';
  if (!value.startsWith('https://') && !value.startsWith('urn:')) {
    return 'https:// または urn: で始まる有効なURIを入力してください';
  }
  if (value.length > 512) return '512文字以内で入力してください';
  return null;
};
```

### 3.5. 表示名 入力

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Input>` |
| ラベル | 「表示名」 |
| 必須 | ❌ 任意 |
| プレースホルダー | 「例: CorpA 社内用語」 |
| 最大文字数 | 128文字 |

**ガイダンスメッセージ**:
> ℹ ツール内での表示用ラベル（任意）

### 3.6. 説明 入力

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Input.TextArea>` |
| ラベル | 「説明」 |
| 必須 | ❌ 任意 |
| プレースホルダー | 「名前空間の用途・背景を入力...」 |
| 行数 | 3行（autoSize: { minRows: 3, maxRows: 6 }） |
| 最大文字数 | 1000文字 |

### 3.7. 親名前空間 選択（組織レベル時のみ表示）

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Select>` |
| ラベル | 「親名前空間」 |
| 必須 | ❌ 任意 |
| プレースホルダー | 「（親名前空間を選択）」 |
| allowClear | true |
| showSearch | true |
| 表示条件 | `level === 'organization'` の場合のみ表示 |

**選択肢（モックデータ）**:

```typescript
const parentNamespaceOptions = [
  { value: 'ns-corpa', label: 'CorpA  (https://www.corpa.co.jp/)' },
  { value: 'ns-laba',  label: 'LabA   (https://corpa.co.jp/lab/)' },
];
```

**ガイダンスメッセージ**:
> ℹ ※ 組織レベル選択時のみ表示。階層構造を持たせる場合に親を選択。

### 3.8. ORCID自動入力ボタン（個人レベル時のみ表示）

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Button>` |
| ラベル | 「🔗 ORCID から URI を自動入力」 |
| タイプ | `default` |
| 表示条件 | `level === 'personal'` の場合のみ表示 |

**動作フロー**:
1. ORCIDログイン画面をポップアップ（OAuth2）
2. 認証成功後、ORCID ID を取得（例: `0000-0002-2494-9603`）
3. URI フィールドに `https://orcid.org/{orcid-id}` を自動入力

### 3.9. フッターボタン

| ボタン | タイプ | アイコン | 動作 |
|--------|--------|---------|------|
| ✔ 登録する | `primary` | `<CheckOutlined />` | バリデーション → API POST → ダイアログを閉じてツリーを更新 |
| ✕ キャンセル | `default` | `<CloseOutlined />` | 入力内容を破棄してダイアログを閉じる |

---

## 4. バリデーション仕様

### 4.1. フィールド別バリデーション

| フィールド | 必須 | バリデーションルール | エラーメッセージ |
|-----------|------|-------------------|----------------|
| レベル | ✅ | いずれか1つ選択 | 「レベルを選択してください」 |
| 接頭辞 | ✅ | xs:NCName規則 | 「英字または_で始まる英数字・アンダースコア・ハイフン・ピリオドのみ使用可能です」 |
| 接頭辞 | ✅ | 重複チェック | 「この接頭辞は既に使用されています」 |
| URI | ✅ | https:// または urn: で始まる | 「https:// または urn: で始まる有効なURIを入力してください」 |
| URI | ✅ | 重複チェック | 「このURIは既に登録されています」 |
| 表示名 | ❌ | 最大128文字 | 「128文字以内で入力してください」 |
| 説明 | ❌ | 最大1000文字 | 「1000文字以内で入力してください」 |

### 4.2. 送信前バリデーション順序

1. レベル選択確認
2. 接頭辞：必須・形式・重複チェック
3. URI：必須・形式・重複チェック
4. 表示名：文字数チェック（任意項目）
5. 説明：文字数チェック（任意項目）

---

## 5. モックデータ

### 5.1. フォーム初期値

```typescript
interface NamespaceAddFormData {
  level: 'global' | 'organization' | 'personal';
  prefix: string;
  uri: string;
  displayName: string;
  description: string;
  parentNamespaceId: string | null;
}

const namespaceAddFormInitial: NamespaceAddFormData = {
  level: 'organization',
  prefix: '',
  uri: '',
  displayName: '',
  description: '',
  parentNamespaceId: null,
};
```

### 5.2. 入力例（組織レベル）

```typescript
const namespaceAddFormExampleOrg: NamespaceAddFormData = {
  level: 'organization',
  prefix: 'CorpB',
  uri: 'https://www.corpb.co.jp/',
  displayName: 'CorpB 社内用語',
  description: 'CorpB社が定義する実験用語の名前空間。材料分析部門で使用。',
  parentNamespaceId: null,
};
```

### 5.3. 入力例（個人レベル）

```typescript
const namespaceAddFormExamplePersonal: NamespaceAddFormData = {
  level: 'personal',
  prefix: 'JaneDoe',
  uri: 'https://orcid.org/0000-0001-2345-6789',
  displayName: 'Jane Doe 個人用語',
  description: 'Jane Doe 研究員が定義する個人用実験用語。',
  parentNamespaceId: null,
};
```

### 5.4. APIリクエスト例

```typescript
// POST /api/v1/namespaces
const requestBody = {
  level: 'organization',
  prefix: 'CorpB',
  uri: 'https://www.corpb.co.jp/',
  displayName: 'CorpB 社内用語',
  description: 'CorpB社が定義する実験用語の名前空間。',
  parentNamespaceId: null,
};
```

### 5.5. APIレスポンス例（成功）

```typescript
const successResponse = {
  success: true,
  data: {
    id: 'ns-corpb',
    level: 'organization',
    prefix: 'CorpB',
    uri: 'https://www.corpb.co.jp/',
    displayName: 'CorpB 社内用語',
    description: 'CorpB社が定義する実験用語の名前空間。',
    parentNamespaceId: null,
    termCount: 0,
    createdAt: '2026-06-05T08:30:00.000Z',
    updatedAt: '2026-06-05T08:30:00.000Z',
  },
  meta: {
    timestamp: '2026-06-05T08:30:00.000Z',
    requestId: 'req-abc123',
  },
};
```

### 5.6. APIレスポンス例（バリデーションエラー）

```typescript
const validationErrorResponse = {
  success: false,
  error: {
    code: 'E1003',
    message: 'バリデーションエラーが発生しました',
    details: [
      {
        field: 'prefix',
        message: 'この接頭辞は既に使用されています',
        code: 'DUPLICATE',
      },
    ],
  },
  meta: {
    timestamp: '2026-06-05T08:30:00.000Z',
    requestId: 'req-def456',
  },
};
```

---

## 6. イベントハンドリング

| イベント | 処理 |
|---------|------|
| レベル変更 | 条件付きフィールドの表示切り替え（親名前空間 / ORCID自動入力ボタン）、URIガイダンスメッセージの更新 |
| 接頭辞入力 | リアルタイムバリデーション（xs:NCName規則） |
| URI入力 | リアルタイムバリデーション（プロトコルチェック） |
| ORCID自動入力クリック | ORCIDポップアップ起動 → URI自動設定 |
| [✔ 登録する] クリック | 全フィールドバリデーション → API POST → 成功時: ダイアログ閉じる + ツリー更新 + `message.success` 表示 / 失敗時: エラーメッセージ表示 |
| [✕ キャンセル] クリック | ダイアログを閉じる（入力値は破棄） |
| Escキー | キャンセルと同じ動作 |

---

---

## 8. NamespaceMain.tsx との連携仕様

### 8.1. [+] ボタンの配置

ツリーパネルのタイトル行右端に `PlusOutlined` アイコン付き `[+]` ボタンを配置。

```
┌──────────────────────────────────┐
│ 名前空間ツリー              [+]  │  ← クリックでダイアログ表示
├──────────────────────────────────┤
│ 🌐 global                        │
│   maiml  (https://...)           │
│ 🏦 organization                  │
│   CorpA  (https://...)      ✏   │
```

### 8.2. 状態管理

```typescript
const [addDialogOpen, setAddDialogOpen] = useState(false);
```

### 8.3. ボタンのクリックハンドラ

```typescript
<Button
  size="small"
  icon={<PlusOutlined />}
  onClick={() => setAddDialogOpen(true)}
>
  名前空間を追加
</Button>
```

### 8.4. `onRegistered` コールバック

登録完了時、`nsNodes` （フラットリスト）に新規名前空間を追加する。

```typescript
const handleNamespaceRegistered = (values: NamespaceFormValues) => {
  const newNode: FlatNsNode = {
    key: `ns-${Date.now()}`,
    prefix:    values.prefix,
    uri:       values.uri,
    level:     values.level,
    termCount: 0,
    displayName: values.displayName || undefined,
    description: values.description || undefined,
  };
  setNsNodes((prev) => [...prev, newNode]);
  setAddDialogOpen(false);
};
```

### 8.5. レンダリング

```tsx
<NamespaceAddDialog
  open={addDialogOpen}
  onClose={() => setAddDialogOpen(false)}
  onRegistered={handleNamespaceRegistered}
/>
```

---

---

## 9. DepartmentNodeAddDialog（部署ノード追加ダイアログ）

### 9.1. 概要

`DepartmentTreeManagement`（部署ノード管理テーブル）の「追加」ボタン押下時に表示されるモーダルダイアログ。  
名前空間ツリーに新しい部署ノード（department / group ノード）を追加する。

**コンポーネントファイル**: `frontend/src/components/namespace/DepartmentNodeAddDialog.tsx`

### 9.2. 画面レイアウト

```
┌──────────────────────────────────────────────────────────────┐
│  部署ノードを追加                                              │
├──────────────────────────────────────────────────────────────┤
│  追加した部署ノードは名前空間ツリーに表示されます。           │
│                                                              │
│  * 親ノード                                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 追加先のノードを選択...                          ▼   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  * 表示名                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 例: 分析技術部                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  * 名前空間Prefix                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 例: analysis                                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  名前空間URI （自動生成）                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ https://ORG/dept-cd/表示名スラッグ/               [読取専用]│
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  説明                                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ この部署ノードの説明（任意）                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│                    [キャンセル]  [追加]                       │
└──────────────────────────────────────────────────────────────┘
```

### 9.3. ダイアログ本体仕様

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Modal>` (Ant Design) |
| タイトル | 「部署ノードを追加」 |
| 幅 | 480px |
| maskClosable | false（背景クリックで閉じない） |

### 9.4. フォームフィールド仕様

| フィールド | コンポーネント | 必須 | バリデーション |
|-----------|--------------|------|--------------|
| 親ノード | `<Select>` | ✅ | 選択必須 |
| 表示名 | `<Input>` | ✅ | 入力必須 |
| 名前空間Prefix | `<Input>` | ✅ | 英数字・アンダースコアのみ |
| 名前空間URI | 読み取り専用表示（`div`） | — | 自動生成のため入力不可 |
| 説明 | `<Input.TextArea rows={2}>` | ❌ | 任意 |

#### 親ノード（`parentKey`）

| 項目 | 仕様 |
|------|------|
| コンポーネント | `<Select showSearch>` |
| プレースホルダー | 「追加先のノードを選択...」 |
| 選択肢 | `parentOptions` プロパティとして外部から注入（`DeptTreeNode` の flat リスト） |
| フィルタ | 入力文字でラベルをインクリメンタルサーチ |
| エラー | 「親ノードを選択してください」 |

#### 表示名（`label`）

| 項目 | 仕様 |
|------|------|
| コンポーネント | `<Input>` |
| プレースホルダー | 「例: 分析技術部」 |
| エラー | 「表示名を入力してください」 |

#### 名前空間Prefix（`prefix`）

| 項目 | 仕様 |
|------|------|
| コンポーネント | `<Input>` |
| プレースホルダー | 「例: analysis」 |
| バリデーションパターン | `/^[a-zA-Z0-9_]+$/`（英数字・アンダースコアのみ） |
| エラー（必須） | 「Prefixを入力してください」 |
| エラー（形式） | 「Prefixは英数字・アンダースコアのみ使用可能です」 |

> ⚠️ **注意**: `NamespaceAddDialog` の Prefix バリデーション（xs:NCName規則）と異なり、このダイアログでは `英数字・アンダースコアのみ` の簡易バリデーションを使用する。

#### 名前空間URI（自動生成・読み取り専用）

| 項目 | 仕様 |
|------|------|
| 表示形式 | 読み取り専用 `div`（グレー背景 `#f5f5f5`、モノスペースフォント） |
| 生成タイミング | 親ノード・表示名の入力変化のたびにリアルタイム更新 |
| 未入力時 | 「（親ノードと表示名を入力すると自動生成されます）」 |
| 生成関数 | `generateNamespaceUri(organizationCd, deptCd, label)` |

**URI 自動生成ロジック**:

```typescript
const handleValuesChange = () => {
  const values = form.getFieldsValue();
  const parentKey: string | undefined = values.parentKey;
  const label: string = values.label ?? '';

  // 親ノードの departmentCd を取得
  const parentOption = parentOptions.find((o) => o.value === parentKey);
  const deptCd = parentOption?.departmentCd ?? parentKey ?? undefined;

  const uri = generateNamespaceUri(organizationCd, deptCd, label || undefined);
  setPreviewUri(uri);
};
```

#### 説明（`description`）

| 項目 | 仕様 |
|------|------|
| コンポーネント | `<Input.TextArea rows={2}>` |
| プレースホルダー | 「この部署ノードの説明（任意）」 |

### 9.5. フッターボタン

| ボタン | タイプ | 動作 |
|--------|--------|------|
| キャンセル | `default` | フォームリセット → ダイアログを閉じる |
| 追加 | `primary` | バリデーション → API POST → 成功時: onCreated コールバック + フォームリセット + 閉じる |

### 9.6. Props 型定義

```typescript
interface DepartmentNodeAddDialogProps {
  /** ダイアログ表示状態 */
  open: boolean;
  /** 親ノード候補リスト（DepartmentTreeManagement から注入） */
  parentOptions: { value: string; label: string; departmentCd?: string }[];
  /** ログインユーザーの組織CD（URI 自動生成に使用） */
  organizationCd?: string;
  /** キャンセル / Escキー押下時のコールバック */
  onClose: () => void;
  /** 追加完了時のコールバック（作成されたノードを返す） */
  onCreated: (node: DeptTreeNode) => void;
}
```

### 9.7. 作成ノードの型定義

```typescript
/** 部署ツリーの1ノード（DepartmentTreeManagement / DepartmentNodeAddDialog で使用） */
interface DeptTreeNode {
  key:         string;    // 一意キー（API レスポンス ID または `dept-${Date.now()}`）
  label:       string;    // 表示名
  prefix:      string;    // 名前空間 Prefix
  uri:         string;    // 名前空間 URI（自動生成）
  description: string;    // 説明（任意）
  parentKey?:  string;    // 親ノードのキー
}
```

### 9.8. API連携

| ステップ | メソッド | エンドポイント | リクエストボディ |
|---------|---------|--------------|----------------|
| 部署ノード作成 | POST | `/api/v1/department-nodes` | `{ label, prefix, uri, description, parentKey }` |

> **注意**: API が未実装の場合はモックフォールバック（`DeptTreeNode` オブジェクトをローカル生成）を使用する。

**APIリクエスト例**:

```typescript
const requestBody = {
  label:       '分析技術部',
  prefix:      'analysis',
  uri:         'https://ORG/dept-cd/分析技術部/',
  description: '分析技術部の名前空間',
  parentKey:   'dept-labA',
};
```

### 9.9. DepartmentTreeManagement との連携

`DepartmentTreeManagement` コンポーネントから以下のように使用される:

```tsx
<DepartmentNodeAddDialog
  open={addDialogOpen}
  parentOptions={treeNodes.map((n) => ({
    value: n.key,
    label: n.label,
    departmentCd: n.key,
  }))}
  organizationCd={organizationCd}
  onClose={() => setAddDialogOpen(false)}
  onCreated={(node) => {
    setTreeNodes((prev) => [...prev, node]);
    setAddDialogOpen(false);
  }}
/>
```

---

## 7. 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-07-07 | v1.2.0: §3.4 URI バリデーションを `http://` 許容に修正。§9 DepartmentNodeAddDialog を新規追記 | Cline |
| 2026-06-30 | v1.1.0: §3.4 URI 入力を更新：organization レベル時は URI が自動生成（読み取り専用）になる仕様を追記。`generateNamespaceUri` ユーティリティの仕様・生成パターンを追記 | Cline |
| 2026-06-08 | v1.0.1: §1.4 実装ステータス・§8 NamespaceMain.tsx 連携仕様を追記 | Cline |
| 2026-06-05 | v1.0.0: 初版作成 | Cline |
