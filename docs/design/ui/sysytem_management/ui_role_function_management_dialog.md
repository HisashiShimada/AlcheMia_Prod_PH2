# 機能権限ダイアログUI設計書

## メタデータ
---
title: 機能権限ダイアログUI設計書
category: UI設計
version: 2.0.0
last_updated: 2026-08-21
author: Development Team
tags: [system-admin, role-management, dialog, function-permission]
---

## 関連ドキュメント
- [ロール管理画面](ui_role_main.md)
- [ロール追加ダイアログ](ui_role_add_dialog.md)
- [ロール編集ダイアログ](ui_role_edit_dialog.md)
- [ロール管理API仕様](../api/api_system_management.md)
- [UIポリシー](../../.clinerules/references/ui_policy.md)

---

## 1. 概要

### 1.1. 目的

システム管理者がロールに対して機能（メニュー）とその権限（書込可・読取専用）を設定するためのモーダルダイアログです。機能の割り当てと権限設定を行います。

### 1.2. 表示条件

**呼び出し元:**
1. ロール管理画面のテーブル内「機能名」カラムをクリック（directモード）
2. ロール追加ダイアログの「機能名」フィールドをクリック（temporaryモード）
3. ロール編集ダイアログの「機能名」フィールドをクリック（directモード）

**必要な権限:**
- System Admin権限

### 1.3. 動作モード

| モード | 説明 | 呼び出し元 | DB反映タイミング |
|--------|------|-----------|-----------------|
| **direct** | DB直接更新モード | ロール管理画面、ロール編集ダイアログ | 「機能を更新」ボタンクリック時 |
| **temporary** | メモリ一時保存モード | ロール追加ダイアログ | 親ダイアログの「保存」ボタンクリック時 |

---

## 2. ダイアログ構成

### 2.1. レイアウト

```
┌────────────────────────────────────────────┐
│         機能管理                      [×]   │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  [☑ プロバイダーメニュー      ]      │  │
│  ├──────────────────────────────────────┤  │
│  │  [☑ システム管理者メニュー    ]      │  │
│  ├──────────────────────────────────────┤  │
│  │  [☐ データ管理者メニュー      ] [☐ 読取専用] │
│  ├──────────────────────────────────────┤  │
│  │  [☐ 実験管理者メニュー        ]      │  │
│  ├──────────────────────────────────────┤  │
│  │  [☐ 実験作業者メニュー        ]      │  │
│  └──────────────────────────────────────┘  │
│                                            │
├────────────────────────────────────────────┤
│             [キャンセル]  [機能を更新]      │
└────────────────────────────────────────────┘
```

### 2.2. モーダル仕様

**コンポーネント**: `<Modal>`

| 項目 | 値 |
|------|-----|
| タイトル | `functionPermissionDialog.title`（中央揃え）|
| 幅 | 500px |
| zIndex | 1100 |
| 最大高さ（コンテンツ） | 600px（`overflowY: 'auto'`）|
| マスククリック | 閉じない（`onCancel` のみ）|

---

## 3. 機能一覧

### 3.1. 機能リスト

機能は**フロントエンドのハードコード**で定義（APIから取得しない）。

| key | label（i18nキー） | dbValue（DB/API送信値）| 読取専用選択 |
|-----|-----------------|---------------------|------------|
| `010000` | `functionPermissionDialog.functions.010000` | `プロバイダーメニュー` | ❌ 不可（常に書込可）|
| `020000` | `functionPermissionDialog.functions.020000` | `システム管理者メニュー` | ❌ 不可（常に書込可）|
| `030000` | `functionPermissionDialog.functions.030000` | `データ管理者メニュー` | ✅ 可能 |
| `040000` | `functionPermissionDialog.functions.040000` | `実験管理者メニュー` | ❌ 不可（常に書込可）|
| `050000` | `functionPermissionDialog.functions.050000` | `実験作業者メニュー` | ❌ 不可（常に書込可）|

> ⚠️ **廃止済み機能**: 旧設計書に記載されていた「部署管理（020200）」「ロール管理（020100）」等の子機能は廃止。現在の実装には存在しない。

### 3.2. 各行のレイアウト

各機能行は `<div>` ベースのカスタムレイアウト（`<Table>` コンポーネントは不使用）。

```
┌──────────────────────────────────────────────────────────┐
│ [flex: 1] │ [幅300px: Checkbox + 機能名テキスト] │ [flex: 1] │ [幅100px: 読取専用Checkbox] │ [flex: 1] │
└──────────────────────────────────────────────────────────┘
```

| 要素 | 幅 | 説明 |
|------|-----|------|
| スペーサー | flex: 1 | 左余白 |
| 機能チェックボックス | 300px | 機能選択（`Checkbox` + `Typography.Text strong`）|
| スペーサー | flex: 1 | 中余白 |
| 読取専用チェックボックス | 100px | `030000` のみ表示（それ以外は非表示）|
| スペーサー | flex: 1 | 右余白 |

行下部には `borderBottom: 1px solid colorBorder`。

---

## 4. 機能チェックボックス（左側）

### 4.1. 仕様

- **コンポーネント**: `<Checkbox>`
- チェック時: `Typography.Text strong` が `colorError`（赤）で表示
- 未チェック時: `colorText`（通常色）

### 4.2. チェック変更ロジック

- チェックON時: 
  - `READ_ONLY_SELECTABLE_KEYS` に含まれない機能は `writable: true` を強制
- チェックOFF時:
  - `writable: false` にリセット

---

## 5. 読取専用チェックボックス（右側）

### 5.1. 対象機能

`READ_ONLY_SELECTABLE_KEYS = ['030000']`（データ管理者メニューのみ）

それ以外の機能には読取専用チェックボックスは表示しない（`null`）。

### 5.2. 仕様

| 状態 | 表示 |
|------|------|
| 機能チェックOFF | disabled（`colorTextDisabled`）|
| 機能チェックON + 読取専用チェックON | `colorInfo`（青）|
| 機能チェックON + 読取専用チェックOFF | `colorSuccess`（緑）|

- **ラベル**: `functionPermissionDialog.labels.readOnly`
- チェックを入れると「読取専用」、外すと「書込可」

---

## 6. アクションボタン

### 6.1. フッター配置

**位置**: モーダルフッター（`<Space size="large">` で中央揃え）

### 6.2. キャンセルボタン

| 項目 | 値 |
|------|-----|
| ラベル | `functionPermissionDialog.buttons.cancel` |
| タイプ | `default` |
| 動作 | `onCancel` を呼び出してモーダルを閉じる |

### 6.3. 機能を更新ボタン

| 項目 | 値 |
|------|-----|
| ラベル | `functionPermissionDialog.buttons.update` |
| タイプ | `primary`（ただし `backgroundColor: colorError`（赤）|
| 動作 | `handleOk` を呼び出す |

---

## 7. 機能名・権限の生成ロジック（handleOk）

### 7.1. 出力値

`onOk(functionName, functionWritePermissions, apiFunctionNames, mode)` の形式で親コンポーネントへ返す。

| 引数 | 内容 |
|------|------|
| `functionName` | 表示用（権限アイコン付き）: `Ⓦ{label} / Ⓡ{label}` / 未選択時は `'－'` |
| `functionWritePermissions` | 書込可機能のdbValue を `/` 区切り |
| `apiFunctionNames` | 全選択機能のdbValue を `/` 区切り（API送信用）|
| `mode` | `'direct'` または `'temporary'` |

### 7.2. 生成フロー

1. `functions` を走査
2. 子機能がある場合は子のみ処理（親は含めない）
3. チェック済みの機能について:
   - 表示用: `writable ? 'Ⓦ' : 'Ⓡ'` + `label`（翻訳済み）を追加
   - API用: `dbValue`（日本語固定値）を追加
   - 書込可なら `writePermissionNames` にも追加

### 7.3. フォーマット例

```
入力:
  - プロバイダーメニュー（writable: true）
  - データ管理者メニュー（writable: false）

functionName（表示用）: "Ⓦプロバイダーメニュー/Ⓡデータ管理者メニュー"
functionWritePermissions: "プロバイダーメニュー"
apiFunctionNames: "プロバイダーメニュー/データ管理者メニュー"
```

---

## 8. Props定義

```typescript
interface FunctionPermissionDialogProps {
  open: boolean;
  onOk: (functionName: string, functionWritePermissions: string, apiFunctionNames: string, mode: 'direct' | 'temporary') => void;
  onCancel: () => void;
  mode?: 'direct' | 'temporary';           // デフォルト: 'temporary'
  initialFunctionName?: string;
  initialWritePermissions?: string;
  initialFunctionIds?: string[];            // チェック済み機能IDのリスト
  initialWritableFunctionIds?: string[];    // 書込可能な機能IDのリスト
}
```

---

## 9. 状態管理

| state | 型 | 初期値 | 説明 |
|-------|---|--------|------|
| `functions` | `FunctionItem[]` | `baseFunctions` | 機能一覧（チェック・権限状態を含む）|

モーダルが開かれた（`open: true`）時に `initialFunctions`（useMemoで計算）でリセット。  
モーダルが閉じた（`open: false`）時に `baseFunctions`（全未選択）でリセット。

---

## 10. ユーザーフロー

### 10.1. 正常フロー（directモード）

```
[ロール管理画面] または [ロール編集ダイアログ]
    ↓ 機能名フィールドクリック
[機能権限ダイアログ] 表示（directモード）
    現在の機能選択状態を表示
    ↓ 機能を選択/解除、権限チェックを変更
    ↓ 「機能を更新」ボタンクリック
onOk コールバック呼び出し（mode='direct'）
    ↓ 親コンポーネントがAPI呼び出し
親画面に戻る（機能名フィールド更新）
```

### 10.2. 正常フロー（temporaryモード）

```
[ロール追加ダイアログ]
    ↓ 機能名フィールドクリック
[機能権限ダイアログ] 表示（temporaryモード）
    ↓ 機能を選択、権限を設定
    ↓ 「機能を更新」ボタンクリック
onOk コールバック呼び出し（mode='temporary'）
    メモリに一時保存（DBには未保存）
[ロール追加ダイアログ] に戻る（機能名フィールド更新）
```

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-02-02 | 初版作成 | Development Team |
| 2.0.0 | 2026-08-21 | ソース実装に合わせて全面更新。モーダル幅（800→500px）・レイアウト（Table→カスタムdiv）・権限UI（Radio→Checkbox）・機能リスト（部署管理廃止・子機能廃止）を反映 | Cline |
