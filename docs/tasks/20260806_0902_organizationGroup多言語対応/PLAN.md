# タスク計画書: organizationGroup 多言語対応

## メタデータ
- **作成日時**: 2026-08-06 09:02
- **タスクID**: organizationGroup-i18n
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`organizationGroupService.ts` および `organizationGroupController.ts` のエラーメッセージが英語ハードコードまたは日本語なしの状態になっており、他のサービス（corporationService、organizationService 等）で確立している `Accept-Language` → `getMessage(lang, key)` パターンに統一する。

また `formatController.ts` に日本語ハードコードされた1箇所も同様に対応する。

---

## 現状の問題箇所

### 1. organizationGroupService.ts（全メソッド）

エラーメッセージが英語ハードコードまたは日本語なし：

| 箇所 | 現在のメッセージ |
|------|----------------|
| `createOrganizationGroup` - 重複チェック | `'The specified group CD is already in use'`（英語固定） |
| `getOrganizationGroupById` - 未検出 | `'Organization group not found'`（英語固定） |
| `updateOrganizationGroup` - 未検出 | `'Organization group not found'`（英語固定） |
| `updateOrganizationGroup` - update失敗 | `'Organization group not found'`（英語固定） |
| `deleteOrganizationGroup` - 未検出 | `'Organization group not found'`（英語固定） |
| `getOrganizationGroupMembers` - 未検出 | `'Organization group not found'`（英語固定） |
| `setOrganizationGroupMembers` - 未検出 | `'Organization group not found'`（英語固定） |
| `updateOrganizationGroupChief` - 未検出 | `'Organization group not found'`（英語固定） |
| `updateOrganizationGroupChief` - update失敗 | `'Organization group not found'`（英語固定） |

### 2. organizationGroupController.ts

`lang` を取得する処理がなく、Service に渡していない。

### 3. formatController.ts

```typescript
throw new AppError(E5015, '指定された組織グループへのアクセス権限がありません');
// → 日本語ハードコード（英語対応なし）
```

---

## 目的と期待される成果

- [ ] organizationGroup 系のエラーメッセージが `Accept-Language` ヘッダーに応じて日本語/英語で返る
- [ ] 他のサービスと同一パターン（`getMessage(lang, key)`）に統一される
- [ ] `messages.ts` に `organizationGroup` セクションが追加される
- [ ] `formatController.ts` のハードコードが解消される

---

## 実装ステップ

### Phase 1: messages.ts に organizationGroup メッセージを追加

- [ ] `backend/src/utils/messages.ts` の `Messages` 型に `organizationGroup` セクションを追加
- [ ] `ja` オブジェクトに日本語メッセージを追加
- [ ] `en` オブジェクトに英語メッセージを追加

追加するキー：
```
organizationGroup.notFound       → グループが見つかりません / Organization group not found
organizationGroup.duplicateCd    → 入力されたグループCDは既に存在しています / The specified group CD is already in use
organizationGroup.accessDenied   → 指定された組織グループへのアクセス権限がありません / You do not have permission to access the specified organization group
```

### Phase 2: organizationGroupService.ts を修正

- [ ] 各 export 関数に `lang: string = 'ja'` パラメータを追加
- [ ] ハードコードされた英語メッセージを `getMessage(lang, 'organizationGroup.xxx')` に置換

### Phase 3: organizationGroupController.ts を修正

- [ ] 全ハンドラーに `const lang = (req.headers['accept-language'] || 'ja').split(',')[0].split('-')[0];` を追加
- [ ] Service 呼び出しに `lang` を渡す

### Phase 4: formatController.ts を修正

- [ ] `messages.ts` の `organizationGroup.accessDenied` キーを使用するよう変更
- [ ] `lang` を取得して `getMessage(lang, ...)` を呼び出す

---

## 変更ファイル

1. `backend/src/utils/messages.ts` - organizationGroup セクションを追加（日英）
2. `backend/src/services/organizationGroupService.ts` - lang パラメータ追加、getMessage 使用
3. `backend/src/controllers/organizationGroupController.ts` - lang 取得・Service に渡す
4. `backend/src/controllers/formatController.ts` - accessDenied の日本語ハードコード修正

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Service のシグネチャ変更によるコンパイルエラー | 低 | 低 | 引数はデフォルト値 `'ja'` を設定するので既存呼び出しはそのまま動作 |
| messages.ts のキー typo | 低 | 低 | 実装後にコンパイル確認 |

---

## 承認記録
- **計画書提示日時**: 2026-08-06 09:02
- **承認日時**: 2026-08-06 09:03
- **承認者コメント**: 承認します。実装を進めてください

## 実施記録

### 実施日時
開始: 2026-08-06 09:03
完了: 2026-08-06 09:06

### 変更ファイル
1. `backend/src/utils/messages.ts` — `Messages` 型・`ja`・`en` の `organizationGroup` セクションに `notFound`・`accessDenied` キーを追加。`duplicateCd` のメッセージ文言を修正（日: "入力されたグループCDは既に存在しています" / 英: "The entered group CD is already in use"）
2. `backend/src/services/organizationGroupService.ts` — `getMessage` をインポート。`getOrganizationGroupById`・`createOrganizationGroup`・`updateOrganizationGroup`・`deleteOrganizationGroup`・`getOrganizationGroupMembers`・`setOrganizationGroupMembers`・`updateOrganizationGroupChief` 各関数に `lang: string = 'ja'` パラメータを追加し、全エラーメッセージを `getMessage(lang, 'organizationGroup.xxx')` に置換
3. `backend/src/controllers/organizationGroupController.ts` — 全ハンドラーに `Accept-Language` ヘッダーから `lang` を取得するコードを追加し、Service 呼び出しに渡す
4. `backend/src/controllers/formatController.ts` — `getMessage` をインポート。`assertBelongsToOrganizationGroup` 内の日本語ハードコードを `getMessage(lang, 'organizationGroup.accessDenied')` に修正

### 最終コンパイル確認
`npx tsc --noEmit` → exit:0（エラーなし）

### 最終的な成果物
- [x] organizationGroup 系エラーメッセージが `Accept-Language` ヘッダーに応じて日本語/英語で返る
- [x] 他のサービスと同一パターン（`getMessage(lang, key)`）に統一
- [x] `messages.ts` に `organizationGroup` セクション（3キー）が追加済み
- [x] `formatController.ts` のハードコード解消
