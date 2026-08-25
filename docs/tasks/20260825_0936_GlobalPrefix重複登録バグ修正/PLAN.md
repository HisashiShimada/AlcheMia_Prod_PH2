# タスク計画書: GlobalPrefix重複登録バグ修正

## メタデータ
- **作成日時**: 2026-08-25 09:39
- **タスクID**: GlobalPrefix重複登録バグ修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験管理者画面の名前空間管理（PrefixManagement）において、Globalに登録されているPrefixと同じ名前のPrefixが登録できてしまい、エラーメッセージも表示されないバグを修正する。

## 目的と期待される成果

### 目的
Globalスコープのファイルサーバ管理Prefixと同名のPrefixが誤って登録されることを防ぐ。

### 期待される成果
- [ ] 新規Prefix登録時にグローバル宣言との重複チェックが行われる
- [ ] グローバルと同名Prefixは登録不可（エラーメッセージで完全ブロック）
- [ ] エラーメッセージが日本語・英語で正しく表示される

## 原因分析

### 問題箇所
`frontend/src/components/namespace/PrefixManagement.tsx` の `handleSave()` 関数

### 現状の重複チェックの問題
```typescript
// 現状: rows（現在の表示スコープのPrefix一覧）のみと比較
const firstDuplicate = newRows
  .map((newRow) => {
    const existing = rows.find(
      (r) => r.prefix.toLowerCase() === newRow.prefix.toLowerCase()
    );
    ...
  })
```

- `rows` にはツリーで選択中のノードに紐づくPrefixのみが含まれる
- **Globalのファイルサーバ管理Prefixは `rows` に含まれない**
- DBレベルでもGlobalはファイルサーバ管理のためUNIQUE制約の対象外

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] PLAN.md 作成

### Phase 2: i18nキー追加
- [ ] `frontend/src/locales/ja.json` にエラーメッセージキー追加
- [ ] `frontend/src/locales/en.json` にエラーメッセージキー追加

### Phase 3: PrefixManagement.tsx 修正
- [ ] `handleSave()` にグローバル宣言取得・重複チェックを追加

## 変更ファイル

1. `frontend/src/locales/ja.json` - エラーメッセージキー追加
2. `frontend/src/locales/en.json` - エラーメッセージキー追加
3. `frontend/src/components/namespace/PrefixManagement.tsx` - `handleSave()` にグローバル重複チェック追加

## 修正内容詳細

### i18nキー追加

**ja.json**:
```json
"prefixManagement.errorGlobalDuplicate": "Prefix「{prefix}」はグローバルに既に登録されています。グローバルと同じPrefixは登録できません。"
```

**en.json**:
```json
"prefixManagement.errorGlobalDuplicate": "Prefix \"{prefix}\" is already registered globally. You cannot register a Prefix with the same name as a global one."
```

### handleSave() 修正ロジック

```
1. グローバル宣言一覧を取得（getGlobalDeclarations()）
2. 新規登録Prefixがグローバル宣言に存在するか確認
3. 存在する場合 → message.error() でエラーを表示し return（登録ブロック）
4. 存在しない場合 → 既存の同スコープ内重複チェックへ進む
```

## 修正後の動作

| 状況 | 修正前 | 修正後 |
|------|--------|--------|
| GlobalにあるPrefixと同名を登録 | エラーなしで登録できてしまう | エラーメッセージを表示しブロック |
| 同スコープ内に同名Prefixがある | 確認ダイアログ表示 | 確認ダイアログ表示（変更なし） |
| 重複なし | 正常登録 | 正常登録（変更なし） |

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| グローバル宣言取得API失敗 | 中 | 低 | API失敗時はエラートースト表示し登録を中断しない（警告のみ）よりも、安全側に倒してAPIエラーをユーザーに通知 |

## テスト計画

- [ ] Globalに登録済みのPrefixと同名で登録試行 → エラーメッセージ表示・登録ブロック確認
- [ ] Globalに存在しないPrefixで登録 → 正常登録確認
- [ ] 同スコープ内の重複Prefixで登録 → 確認ダイアログ表示確認（既存動作変更なし確認）

## 承認記録

- **計画書提示日時**: 2026-08-25 09:39
- **承認日時**:
- **承認者コメント**:
