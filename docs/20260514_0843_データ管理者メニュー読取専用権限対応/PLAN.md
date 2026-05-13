# タスク計画書: データ管理者メニュー読取専用権限対応

## メタデータ
- **作成日時**: 2026-05-14 08:43
- **タスクID**: data_admin_readonly_permission
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

ロール管理画面の機能管理ダイアログにおいて、データ管理者メニュー（機能ID: `030000`）のみ「読取専用」権限を選択できるように制限する。その他のメニュー（プロバイダーメニュー、システム管理者メニュー、実験管理者メニュー、実験作業者メニュー）は常に「書込可（Ⓦ）」に固定し、読取専用への変更を不可とする。

## 目的と期待される成果

### 目的
- データ管理者メニューのみ「読取専用」権限（permission=0）を設定可能にする
- 他のメニューは書込可（permission=1）固定とし、誤った権限設定を防ぐ

### 期待される成果
- [ ] ロール管理画面の機能管理ダイアログで、データ管理者メニューのみ「書込可」チェックを外すことができる
- [ ] 他の4メニュー（プロバイダー/システム管理者/実験管理者/実験作業者）の「書込可」チェックボックスがdisabled（操作不可）となる
- [ ] 読取専用（permission=0）が設定されたデータ管理者メニューにアクセスした場合、`MasterManagement.tsx` の isReadOnly 制御により Create/Update/Delete 操作が不可になる（既存実装）

## 実装ステップ

### Phase 1: FunctionPermissionDialog.tsx の修正
- [ ] 読取専用選択可能な機能のホワイトリスト定数 `READ_ONLY_SELECTABLE_KEYS` を定義（`['030000']`）
- [ ] 「書込可」チェックボックスの `disabled` 条件を変更：`!func.checked || !READ_ONLY_SELECTABLE_KEYS.includes(func.key)`
- [ ] 読取専用非対応の機能がチェックされた際、`writable: true` を強制する処理を `handleFunctionCheck` に追加
- [ ] 既存の状態（`initialWritableFunctionIds`）から読み込む際、読取専用非対応の機能は `writable: true` に強制する処理を `initialFunctions` の useMemo に追加

## 変更ファイル

### 修正
1. `frontend/src/components/SystemManagement/FunctionPermissionDialog.tsx` - 読取専用選択制限の追加

### 変更なし（確認済み）
- `frontend/src/components/DataManagement/MasterManagement.tsx` - `isReadOnly` チェックが既に実装済み
- バックエンド - 権限 0/1 の仕組みは既に動作中

## 影響範囲

### 影響を受ける機能
- ロール管理画面 > 機能管理ダイアログ：データ管理者メニュー以外の書込可チェックが操作不可になる
- データ管理者メニュー：読取専用設定時、Create/Update/Delete 操作が不可（既存の `isReadOnly` 制御）

### 影響を受けない機能
- 既にデータが保存されているロールの動作（DBの権限値は変更なし）
- 他のロール管理操作（追加・編集・アクティブ/非アクティブ）

## 技術的詳細

### 現状の問題
`FunctionPermissionDialog.tsx` の各機能行の「書込可」チェックボックスは、対応する機能がチェックされていれば全て変更可能になっている。

```typescript
// 現状：チェックされていれば全機能で書込可チェックを変更できる
<Checkbox
  checked={func.writable}
  onChange={() => handleWritableCheck(func.key)}
  disabled={!func.checked}  // ← 機能選択済みなら全て変更可能
>
```

### 修正後の動作
```typescript
// 読取専用が選択できる機能（データ管理者メニューのみ）
const READ_ONLY_SELECTABLE_KEYS = ['030000'];

// 書込可チェックボックス：読取専用非対応の機能はdisabled
<Checkbox
  checked={func.writable}
  onChange={() => handleWritableCheck(func.key)}
  disabled={!func.checked || !READ_ONLY_SELECTABLE_KEYS.includes(func.key)}
>
```

### チェック時の強制writable処理
```typescript
const handleFunctionCheck = (key: string, parentKey?: string) => {
  setFunctions(prevFunctions => {
    return prevFunctions.map(func => {
      if (func.key === key) {
        const newChecked = !func.checked;
        return {
          ...func,
          checked: newChecked,
          // 読取専用非対応の機能はチェック時に writable: true を強制
          writable: newChecked && !READ_ONLY_SELECTABLE_KEYS.includes(func.key)
            ? true
            : (newChecked ? func.writable : false),
        };
      }
      return func;
    });
  });
};
```

### 初期値ロード時の強制処理
```typescript
const initialFunctions = useMemo(() => {
  return baseFunctions.map(func => {
    const isChecked = initialFunctionIds.includes(func.key);
    // 読取専用非対応の機能は常に writable: true
    const hasWritePermission = READ_ONLY_SELECTABLE_KEYS.includes(func.key)
      ? initialWritableFunctionIds.includes(func.key)
      : isChecked; // チェックされていれば常に書込可
    ...
  });
}, [...]);
```

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のDB設定で他メニューが読取専用になっているケースがある | 中 | 低 | 初期値ロード時に強制writable化で対応 |

## テスト計画

### 手動テスト
- [ ] ロール管理画面を開き、任意のロールの機能名をクリック
- [ ] 機能管理ダイアログでデータ管理者メニューの「書込可」チェックを外せることを確認
- [ ] プロバイダーメニューなど他のメニューの「書込可」チェックがdisabledであることを確認（グレーアウト）
- [ ] データ管理者メニューを読取専用（書込可OFF）で保存後、data_adminでログインし編集ボタンが無効化されることを確認

## 承認記録

- **計画書提示日時**: 2026-05-14 08:43
- **承認日時**: 2026-05-14 08:48
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-05-14 08:48
完了: 2026-05-14 08:49

### 最終的な成果物
- [x] `frontend/src/components/SystemManagement/FunctionPermissionDialog.tsx` 修正完了

### 変更内容詳細
1. `READ_ONLY_SELECTABLE_KEYS = ['030000']` 定数を追加
2. `initialFunctions` useMemo：読取専用非対応機能の `writable: true` 強制処理を追加
3. `handleFunctionCheck`：チェック時に読取専用非対応機能を `writable: true` に強制
4. 親機能「書込可」Checkboxの `disabled` 条件を `!func.checked || !READ_ONLY_SELECTABLE_KEYS.includes(func.key)` に変更
