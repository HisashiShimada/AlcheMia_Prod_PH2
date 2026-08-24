# タスク計画書: PrefixManagement URI自動生成

## メタデータ
- **作成日時**: 2026-08-20 08:44
- **タスクID**: PrefixManagement_URI自動生成
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

名前空間管理のPrefix管理タブにおいて、「Prefix追加」ボタン押下時にURIを自動生成し、
インライン行が表示された段階で既にURIが入力済みの状態にする。
またURIテキストボックスはグレーアウト（disabled）にして編集不可とする。

## 目的と期待される成果

### 目的
- ユーザーがURIを手入力する手間をなくし、ミス入力を防ぐ
- 「Prefix追加」押下と同時にURI自動生成 → インライン行に表示
- URIは編集不可（disabled）にして意図しない変更を防ぐ

### 期待される成果
- [ ] 「Prefix追加」ボタンを押した直後にAPI `/namespaces/suggested-uri` を呼び出す
- [ ] 取得したURIをインライン新規行の `uri` フィールドに設定する
- [ ] URI Inputをdisabledにしてグレーアウトで表示する
- [ ] 「URI生成」ボタン（前回実装）を削除する

## 実装ステップ

### Phase 1: フロントエンド PrefixManagement.tsx 修正
- [ ] `handleAddRow()` 内で `fetchSuggestedUri(scopeKey)` を呼び出す
- [ ] APIの戻り値（URI）を新規行の `uri` フィールドに設定する
- [ ] API呼び出し中は「Prefix追加」ボタンをローディング状態にする（任意）
- [ ] URI の `<Input>` に `disabled` / `readOnly` プロパティを付与する
- [ ] 「URI生成」ボタンの JSX を削除する

### Phase 2: i18nキーのクリーンアップ（任意）
- [ ] `ja.json` から `btnGenerateUri` / `generateUriError` キーを削除する
- [ ] `en.json` から `btnGenerateUri` / `generateUriError` キーを削除する

## 変更ファイル

### 修正
1. `frontend/src/components/namespace/PrefixManagement.tsx`
   - `handleAddRow()` に URI 自動取得ロジックを追加
   - URI Input を disabled に変更
   - URI生成ボタン削除

### 任意修正
2. `frontend/src/locales/ja.json` - 不要になった i18nキー削除
3. `frontend/src/locales/en.json` - 不要になった i18nキー削除

## 技術詳細

### URI自動生成フロー（フロントエンド）

```
handleAddRow() 呼び出し
  ↓
fetchSuggestedUri(scopeKey) を呼び出し（非同期）
  ↓
バックエンド GET /api/v1/namespaces/suggested-uri?scopeKey=xxx
  ↓
{ uri: "https://ORG001.Alchemia.co.jp/DEP001/..." } を返却
  ↓
新規行 { prefix: '', uri: <取得したURI>, description: '' } で addingRows に追加
  ↓
URI Inputはdisabledでグレーアウト表示
```

### URIフィールドのdisabled対応

```tsx
<Input
  value={row.uri}
  disabled  // グレーアウト・編集不可
  placeholder={t('prefixManagement.placeholderUri')}
/>
```

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| API呼び出し失敗時にインライン行が開けない | 高 | 低 | エラー時は uri='' で行を追加しフォールバック |
| scopeKeyが未設定の場合 | 中 | 低 | 個人スコープとして処理（バックエンド対応済み）|

## テスト計画

- [ ] 「Prefix追加」ボタン押下 → インライン行のURIに値が入っていること
- [ ] URIフィールドがグレーアウトで編集できないこと
- [ ] 異なるスコープ（チーム・個人）でURIが正しく変わること
- [ ] API失敗時にフォールバックで行が表示されること

## 承認記録

- **計画書提示日時**: 2026-08-20 08:44
- **承認日時**: （承認待ち）
