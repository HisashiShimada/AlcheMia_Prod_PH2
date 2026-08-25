# グローバル名前空間宣言一覧 UI設計書

## メタデータ
---
title: グローバル名前空間宣言一覧 UI設計書
category: UI設計
version: 1.0.0
last_updated: 2026-08-20
author: Development Team
tags: [namespace, global, csv, import, export]
---

## 関連ドキュメント
- [名前空間管理メイン画面](ui_namespace_main.md)

---

## 1. 概要

### 1.1. 目的

ファイルサーバ（`system/namespaces/global-declarations.csv`）に保存された**グローバル名前空間宣言**（prefix + URI）の一覧表示・CSVインポート・CSVエクスポートを提供するコンポーネント。

### 1.2. 利用権限

- **実験管理者 (Experiment Admin)**: 閲覧・インポート・エクスポート可能
- **閲覧専用モード** (`viewOnly=true`): 閲覧・リロードのみ（インポート・エクスポートは無効）

### 1.3. 実装ステータス

| ファイル | ステータス |
|---------|-----------|
| `frontend/src/components/namespace/GlobalNamespaceView.tsx` | ✅ 実装済み |

---

## 2. 画面レイアウト

```
┌──────────────────────────────────────────────────────────────┐
│ グローバル名前空間宣言                                         │
│ system/namespaces/global-declarations.csv に保存された...     │
│                          [🔄 再読み込み] [⬇ エクスポート] [⬆ インポート] │
├──────────────────────────────────────────────────────────────┤
│ 全 N 件                                                       │
├──────────────────────────────────────────────────────────────┤
│ Prefix ▲           │ URI                                     │
├────────────────────┼────────────────────────────────────────┤
│ maiml              │ https://schema.maiml.org/  [コピー]     │
│ xsd                │ http://www.w3.org/2001/...  [コピー]    │
│ ...                │ ...                                     │
├──────────────────────────────────────────────────────────────┤
│ < 1 2 3 >   20件/ページ ▼                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. コンポーネント仕様

### 3.1. ヘッダー部

| 項目 | 内容 |
|------|------|
| タイトル | `t('globalNamespace.title')` |
| サブテキスト | `t('globalNamespace.description')` （グレー小文字） |

### 3.2. ボタン群（ヘッダー右側）

| ボタン | アイコン | タイプ | 動作 | 無効条件 |
|--------|---------|--------|------|---------|
| 再読み込み | `<ReloadOutlined />` | `default` | 一覧を再取得 | ローディング中 |
| エクスポート | `<DownloadOutlined />` | `default` | CSVダウンロード | `viewOnly=true` またはエクスポート処理中 |
| インポート | `<UploadOutlined />` | `primary` | ファイル選択ダイアログを開く | `viewOnly=true` またはインポート処理中 |

> **注意**: インポートボタンは `<input type="file" accept=".csv">` の hidden input と連携している。

### 3.3. 件数表示

テーブル上部に `t('globalNamespace.count', { count: N })` を小文字グレーで表示。

### 3.4. テーブル

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Table>` (Ant Design) |
| `rowKey` | `"prefix"` |
| サイズ | `small` |
| ページネーション | pageSize: 50、showSizeChanger: true、pageSizeOptions: ['20', '50', '100'] |
| 空文字表示 | `t('globalNamespace.empty')` |

**カラム定義**:

| カラム | dataIndex | 幅 | ソート | レンダリング |
|--------|-----------|-----|--------|-------------|
| Prefix | `prefix` | 200px | ✅ 昇順デフォルト | `<Text code>` 太字 |
| URI | `uri` | 自動 | ✅ | `<Tooltip>` + `<Text copyable>` （最大幅600px、overflow ellipsis） |

---

## 4. Props 定義

| Prop名 | 型 | 必須 | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| `viewOnly` | `boolean` | ❌ | `false` | `true` の場合インポート・エクスポートボタンを無効化 |

---

## 5. 状態管理

| state | 型 | 説明 |
|-------|-----|------|
| `declarations` | `GlobalNamespaceEntry[]` | 取得済みのグローバル名前空間宣言一覧 |
| `loading` | `boolean` | 一覧取得中フラグ（テーブルにSpinを表示） |
| `importing` | `boolean` | インポート処理中フラグ |
| `exporting` | `boolean` | エクスポート処理中フラグ |

**`GlobalNamespaceEntry` 型**（`@/types/namespace` より）:

```typescript
interface GlobalNamespaceEntry {
  prefix: string;
  uri:    string;
}
```

---

## 6. API連携

| 操作 | 関数 | エンドポイント（想定） |
|------|------|----------------------|
| 一覧取得 | `getGlobalDeclarations()` | `GET /api/v1/namespaces/global-declarations` |
| インポート | `importGlobalDeclarations(file)` | `POST /api/v1/namespaces/global-declarations/import` |
| エクスポート | `exportGlobalDeclarations()` | `GET /api/v1/namespaces/global-declarations/export` |

---

## 7. イベントハンドリング

### 7.1. 一覧取得

- マウント時（`useEffect`）に `fetchDeclarations()` を呼び出す。
- 失敗時: `message.error(t('globalNamespace.fetchError'))` を表示。

### 7.2. インポート処理

1. インポートボタンクリック → hidden `<input type="file">` を `.click()`
2. ファイル選択後、`Modal.confirm` で確認ダイアログを表示：
   - タイトル: `t('globalNamespace.importConfirmTitle')`
   - 内容: `t('globalNamespace.importConfirmContent')`
   - 確認ボタン: `t('globalNamespace.importConfirmOk')`（danger スタイル）
   - キャンセルボタン: `t('common.cancel')`
3. 確認後: `importGlobalDeclarations(file)` を呼び出す
4. 成功時: `message.success(t('globalNamespace.importSuccess'))` → 一覧を再取得
5. 失敗時: `message.error(t('globalNamespace.importError'))`
6. hidden input は処理後にリセット（同じファイルを再選択できるよう）

### 7.3. エクスポート処理

1. エクスポートボタンクリック → `exportGlobalDeclarations()` を呼び出す
2. 成功時: `message.success(t('globalNamespace.exportSuccess'))`
3. 失敗時: `message.error(t('globalNamespace.exportError'))`

---

## 8. 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-08-20 | v1.0.0: 初版作成 | Cline |
