# Prefix管理 UI設計書

## メタデータ
- **画面名**: Prefix管理
- **物理名**: PrefixManagement.tsx
- **ファイルパス**: `frontend/src/components/namespace/PrefixManagement.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-08-14
- **最終更新日**: 2026-08-25
- **担当者**: Development Team
- **バージョン**: 1.2.0

---

## 1. 画面概要

### 1.1. 目的

名前空間管理画面内の**Prefix（接頭辞）管理セクション**です。
左ペインの名前空間ツリーで選択したスコープに属する Prefix の一覧表示・追加・編集・非アクティブ化を行います。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 閲覧・編集可 |
| `system_admin` | ✅ 閲覧・編集可 |
| `experiment_worker` | ✅ 閲覧のみ（`viewOnly=true`） |

### 1.3. 主要機能

1. Prefix 一覧の表示（名前空間ツリーの選択スコープに連動して自動絞り込み）
2. 新規 Prefix のインライン追加（行追加 → 保存）
3. 既存 Prefix のインライン編集（prefix・説明の変更）
4. 既存 Prefix の非アクティブ化（確認ダイアログあり）
5. CSV インポート・エクスポート
6. Prefix / URI / 説明 によるフリーテキスト検索

---

## 2. 画面レイアウト

```
┌──────────────────────────────────────────────────────────────────────┐
│ Prefix管理                                                           │
│                                                                      │
│ [🔍 prefix/URIで検索    ]  [インポート][エクスポート][+prefix追加]   │
│                                        [保存][キャンセル]            │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ ☐ │ Prefix    │ URI                      │ 説明 │ スコープ │操作│
│ │───┼───────────┼──────────────────────────┼──────┼──────────┼────│
│ │ ☐ │ MyCompany │ https://myco.jp/         │      │ 開発部   │編集 非アクティブ│
│ │ ☐ │ LabTeam   │ https://lab.jp/          │      │ TeamA    │編集 非アクティブ│
│ └──────────────────────────────────────────────────────────────┘   │
│                                          全N件  20件/ページ ▼       │
└──────────────────────────────────────────────────────────────────────┘
```

### 新規行追加時（インライン入力）

```
│ 🟡│ [chem     ] │ https://ROOT_GRP.Alchemia.co.jp/... (自動生成・編集不可) │ [説明...] │  —  │（なし）│
```
新規行は黄色背景（`#fffbe6`）で表示。

### 既存行編集時（インライン編集）

```
│ ☐ │ [MyCompany-new ] │ https://myco.jp/（表示のみ） │ [説明]    │ 開発部  │[保存][キャンセル]│
```

---

## 3. テーブルカラム定義

| カラム | キー | 説明 | 備考 |
|--------|------|------|------|
| （チェックボックス） | — | 行選択 | 新規行は選択不可 |
| Prefix | `prefix` | 接頭辞（xs:NCName 規則準拠）| ソート可 |
| URI | `uri` | 名前空間 URI | 長い場合はツールチップ表示、青色テキスト |
| 説明 | `description` | 任意の説明文 | 省略表示あり |
| スコープ | `scopePath` | DB 由来のスコープ名（organization_group_name または user_name）| ソート可、カスタム `<span>`（背景 `#f5f5f5`、テキスト `#555`）形式表示 |
| 操作 | `actions` | 通常: [編集][非アクティブ]。編集中: [保存][キャンセル]。システム名前空間行: `<Tag>` バッジ表示 | `viewOnly=true` 時は編集・非アクティブボタン非活性。 |

---

## 4. ツールバー

| 要素 | 説明 | 備考 |
|------|------|------|
| 検索欄 | prefix / URI / 説明 でリアルタイムフィルタ | ページを1にリセット |
| インポート | CSV ファイル読み込みで一括登録 | `viewOnly` 時は非活性 |
| エクスポート | 現在の一覧を CSV でダウンロード（`prefixes.csv`）| |
| + prefix 追加 | 末尾に新規入力行を追加。押下時に `GET /api/v1/namespaces/suggested-uri` を呼び出し、取得した URI を新規行にセット（disabled 表示）| `viewOnly` 時は非活性。 |
| 保存 | 新規入力行を一括保存（API 登録） | 新規行がない場合は非活性 |
| キャンセル | 新規入力行を全て破棄 | 新規行がない場合は非活性 |

---

## 5. システム名前空間の特別処理

`SYSTEM_NAMESPACE_PREFIX`（定数）に一致する Prefix の行は操作ボタンを表示せず、代わりに **`<Tag>` バッジ**を表示する。

| 状態 | 表示 |
|------|------|
| 通常行 | [編集][非アクティブ] ボタン |
| システム名前空間行 | `<Tag color="default">` バッジ + ツールチップ（操作不可の説明） |

---

## 6. 重複チェック（保存時）

保存時に既存 Prefix と同名の行が含まれる場合、確認ダイアログ（`Modal.confirm`）を表示する。

- タイトル：警告（WarningOutlined アイコン）
- 内容：「prefix xxx は すでに {スコープ名} に登録されています。…」
- OK で強行登録（`executeSave()` 実行）、キャンセルで中止

---

## 7. CSV フォーマット

| 列 | 内容 |
|----|------|
| prefix | 接頭辞（必須）|
| uri | 名前空間 URI（必須）|
| description | 説明（任意）|

- エクスポート: ヘッダー行あり、BOM 付き UTF-8。対象は **`rows`（全件）**（選択行のみに絞り込む機能はない）
- インポート: 1行目をヘッダーとしてスキップ、prefix/uri が空の行はスキップ

---

## 8. 子コンポーネント・関連コンポーネント

| コンポーネント | 用途 |
|--------------|------|
| `NamespaceAddDialog` | 名前空間追加ダイアログ（`NamespaceMain` 側で管理） |
| `DuplicateSuggestModal` | 重複時の提案モーダル（`NamespaceMain` 側で管理） |
| `ShareScopeModal` | スコープ共有設定モーダル（`NamespaceMain` 側で管理） |

> **注意**: `DetailModal`（名前空間詳細モーダル）は `PrefixManagement.tsx` から呼び出されていません。

---

## 9. API 連携

| API | 用途 |
|-----|------|
| `GET /api/v1/namespaces` | Prefix 一覧取得（`scopeKeys` でフィルタ可能）|
| `GET /api/v1/namespaces/suggested-uri` | URI 自動生成（`+ prefix 追加` 押下時に呼び出し） |
| `POST /api/v1/namespaces` | Prefix 新規登録 |
| `PUT /api/v1/namespaces/:prefix` | Prefix 更新。編集モード時は `prefix`・`description` を `<Input>` で編集可能。**保存時は `prefix` と `description` のみ送信**（URI は送信しない） |
| `PATCH /api/v1/namespaces/:prefix/active` | Prefix 非アクティブ化（`is_active=false` に更新） |

---

## 10. Props 定義

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `viewOnly` | `boolean` | ❌ | `true` のとき全編集操作を非活性化（デフォルト: `false`）|
| `globalOnly` | `boolean` | ❌ | `true` のときグローバル Prefix のみ対象（デフォルト: `false`）|
| `selectedNsKey` | `string \| null` | ❌ | 左ペインで選択中の名前空間キー（変更時に一覧を再取得）|
| `scopeKey` | `string \| null` | ❌ | 新規 Prefix 登録時に使用するスコープキー |
| `orgGroupCds` | `string[]` | ❌ | 組織ノード選択時に表示対象を絞り込むグループCD配列。未指定時は全件取得 |
| `scopeKeys` | `string[]` | ❌ | フィルタ済みグループCDを渡す汎用配列（`company` ノード選択時にツリー表示対象のみを渡す）|

---

## 11. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|----------|--------|
| 2026-08-25 | 1.2.0 | §1.1/1.3: 「削除」→「非アクティブ化」に変更。§2 レイアウト・§3 操作列・§5: ボタン文言「削除」→「非アクティブ」に変更。§4: `+ prefix 追加` 時の URI 自動生成仕様を追記。§9: PUT 送信フィールドを「URI のみ」→「prefix・description のみ（URI 送信なし）」に修正。DELETE → PATCH に変更。§10: `orgGroupCds` / `scopeKeys` Props を追加。 | Cline |
| 2026-08-17 | 1.1.0 | 初版更新 | Development Team |
| 2026-08-14 | 1.0.0 | 初版作成 | Development Team |
