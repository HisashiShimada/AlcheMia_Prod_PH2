# プロジェクト名変更モーダル UI設計書

## メタデータ
- **画面名**: プロジェクト名変更モーダル
- **物理名**: RenameProjectModal.tsx
- **ファイルパス**: `frontend/src/components/project/RenameProjectModal.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-08-14
- **最終更新日**: 2026-08-20
- **バージョン**: 1.1.0

---

## 1. 画面概要

### 1.1. 目的

実験管理者（Manager）が、既存プロジェクトの**プロジェクト名を変更**するためのモーダルダイアログです。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 操作可 |
| `system_admin` | ✅ 操作可 |
| `experiment_worker` | ❌ アクセス不可 |

### 1.3. 主要機能

1. 現在のプロジェクト名を初期値として表示
2. 新しいプロジェクト名の入力・バリデーション
3. 名前変更APIの呼び出し

---

## 2. 画面レイアウト

```
┌──────────────────────────────────────────────────┐
│ Modal                                            │
│ Title: t('projectManagement.rename.title')       │
├──────────────────────────────────────────────────┤
│ Body:                                            │
│ t('projectManagement.rename.label'):             │
│ ┌────────────────────────────────────────────┐  │
│ │ placeholder: currentProjectName             │  │
│ └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│ Footer: [キャンセル]  [保存（OKボタン）]          │
└──────────────────────────────────────────────────┘
```

### 2.1. モーダル設定

| 項目 | 値 |
|------|---|
| タイトル | `t('projectManagement.rename.title')` |
| `okText` | `t('projectManagement.rename.okText')` |
| `cancelText` | `t('common.cancel')` |
| `confirmLoading` | `loading`（API呼び出し中はOKボタンをローディング表示）|
| `destroyOnHidden` | `true` |

---

## 3. コンポーネント Props 定義

```typescript
interface RenameProjectModalProps {
  open: boolean;
  /** バックエンドAPIに渡すプロジェクトID（UUID） */
  projectId: string;
  /** 表示用（現在のプロジェクト名） */
  currentProjectName: string;
  onCancel: () => void;
  onSuccess: (newProjectName: string) => void;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `open` | `boolean` | ✅ | モーダル表示/非表示 |
| `projectId` | `string` | ✅ | プロジェクトID（UUID）。API呼び出しに使用 |
| `currentProjectName` | `string` | ✅ | 現在のプロジェクト名。初期値・変更なし判定に使用 |
| `onCancel` | `() => void` | ✅ | キャンセル時のコールバック（フォームリセット後に呼び出し）|
| `onSuccess` | `(newProjectName: string) => void` | ✅ | 保存成功時のコールバック。APIが返した新プロジェクト名を引数で渡す |

---

## 4. フォームバリデーション

`Form` + `Form.Item`（Ant Design）によるバリデーション。フィールド名: `newProjectName`

| ルール | 内容 | i18nキー |
|-------|------|---------|
| 必須 | 空白不可 | `projectManagement.rename.required` |
| パターン | `/^[a-zA-Z0-9_-]+$/`（英数字・`_`・`-`のみ）| `projectManagement.rename.patternError` |
| 最大文字数 | 255文字以内 | `projectManagement.rename.maxLengthError` |

---

## 5. 操作フロー

### 5.1. 保存処理（`handleOk`）

```
1. Form.validateFields() でバリデーション実行
   └─ バリデーションエラー → Form が自動表示して終了
2. newName = values.newProjectName.trim()
3. newName === currentProjectName の場合 → onCancel() を呼び出して閉じる（変更なし）
4. loading = true
5. renameProject(projectId, newName) API呼び出し
6. 成功 → message.success(t('projectManagement.rename.success').replace('{{name}}', result.newProjectName))
         → onSuccess(result.newProjectName)
7. 失敗 → エラーハンドリング（下記参照）
8. finally → loading = false
```

### 5.2. キャンセル処理（`handleCancel`）

```
form.resetFields() → onCancel()
```

### 5.3. モーダルを開いた際の初期化

```
useEffect([open, currentProjectName]) で
form.setFieldsValue({ newProjectName: currentProjectName }) を実行
```

---

## 6. エラーハンドリング

| エラーコード | 表示メッセージ | 発生条件 |
|-----------|-------------|---------|
| `E7001` | `t('projectManagement.rename.duplicateError')` | プロジェクト名の重複 |
| その他（`msg` あり）| APIのエラーメッセージをそのまま表示 | その他APIエラー |
| その他（`msg` なし）| `t('projectManagement.rename.failed')` | 不明なエラー |

エラーメッセージは `App.useApp()` から取得した `message.error()` で表示。

---

## 7. 使用コンポーネント・サービス

| 種別 | 内容 |
|------|------|
| Ant Design | `App`, `Modal`, `Form`, `Input` |
| サービス | `renameProject`（`@/services/projectApiService`）|
| Context | `useLanguage`（i18n）|
| フック | `App.useApp()`（message）|

---

## 8. 備考・注意事項

1. `project.project_name` はプロジェクトフォルダ名を兼ねる（`UNIQUE` 制約あり）。
2. 重複名エラーはAPIエラーコード `E7001` で検知し、i18nメッセージで表示する。
3. 変更なしの場合はエラーを出さずそのまま閉じる。
4. Input の `autoFocus` が設定されているため、開くとすぐに入力可能。

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.1.0 | 2026-08-20 | Prop名修正（currentName→currentProjectName, onSave→onSuccess）・タイトル/ボタンラベルi18n化・バリデーション追記（パターン/最大文字数）・destroyOnHidden追記・同名時挙動修正・成功メッセージ追記・エラーコード詳細追記 |
| 1.0.0 | 2026-08-14 | 初版作成 |
