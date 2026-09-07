# タスク計画書: 共有機能 下位層引き上げ対応

## メタデータ
- **作成日時**: 2026-09-04 13:00
- **タスクID**: 共有機能下位層引き上げ対応
- **優先度**: 高
- **推定工数**: 3時間

## 1. タスク概要

名前空間管理（Prefix管理・用語管理）の「共有」機能の動作を、現在の誤った方向（下位ノードへのプッシュ）から、正しい方向（下位層データを現在ノードへ引き上げ）に修正する。

## 2. 現状の問題

### 現状の動作（誤り）
- 「材料合成部-1」を選択してチェック済みPrefixの「共有」ボタンを押す
- ダイアログで「祖先ノード（材料合成部）」への共有先を選ぶ
- 下から上へプッシュするUIになっている

### 正しい動作（修正後）
- 「材料合成部-1」を選択するとテーブルに子・孫グループ（下位層）のPrefixも表示される
- 下位層由来のPrefixをチェックして「共有」ボタンを押す
- 確認ダイアログ（ツリー選択UIではない）が表示される：
  - 「以下の N件 を「材料合成部-1」にコピーします。よろしいですか？」
  - コピー先は現在選択ノード固定
  - ※ 既に存在するものはスキップします
- [共有する] → 現在ノードのscopeKeyへコピー実行

## 3. 影響範囲と修正方針

### 3-1. チェックボックスの選択制御（PrefixManagement.tsx）

| 行の種類 | 現状 | 修正後 |
|---|---|---|
| 上位層（祖先）由来の行 | チェック不可 | チェック不可（変更なし） |
| 現在ノード由来の行 | チェック可 | **チェック不可**（既に現在ノードにあるため引き上げ不要） |
| 下位層（子孫）由来の行 | チェック可 | チェック可（変更なし） |

**修正箇所**: `PrefixManagement.tsx` の `getCheckboxProps` 内
- 現在: `isAncestorRow` が true の行のみ disabled
- 修正後: `isAncestorRow` が true OR `現在ノード由来行` の場合に disabled

現在ノード由来行の判定:
```typescript
// currentScopeKey と r.scopeKey が一致する行 = 現在ノード由来
const isCurrentNodeRow = currentScopeKey != null && r.scopeKey === currentScopeKey;
const isDisabled = isAncestorRow || isCurrentNodeRow;
```

### 3-2. 共有ハンドラの変更（NamespaceMain.tsx）

**削除**:
- `shareScopeNodes` useMemo（祖先ツリー構築ロジック）
- `ShareScopeModal` の使用（インポートも不要なら削除）
- `shareScopeOpen` / `setShareScopeOpen` state
- `sharePrefixKeys` / `setSharePrefixKeys` state
- `shareTermIds` / `setShareTermIds` state

**追加・変更**:
- Prefix共有ハンドラ: チェック済みキーと現在ノードのscopeKeyで `Modal.confirm` を表示
- 用語共有ハンドラ: 同様に `Modal.confirm` を表示
- コピー先は `effectiveNsKey`（現在選択ノード）のscopeKeyを使用

確認ダイアログの表示内容（例）:
```
以下の 2件 を「材料合成部-1」にコピーします。よろしいですか？
・a2
・test_prx
※ 既に存在するものはスキップします
```

### 3-3. 文言追加（ja.json / en.json）

追加キー（例）:
```json
"prefixManagement.shareConfirmTitle": "{{count}}件を「{{scopeName}}」にコピーします",
"prefixManagement.shareConfirmContent": "※ 既に存在するものはスキップします",
"prefixManagement.shareSuccess": "{{copied}}件をコピーしました（{{skipped}}件スキップ）",
"namespaceMain.shareConfirmTitle": "{{count}}件を「{{scopeName}}」にコピーします",
"namespaceMain.shareConfirmContent": "※ 既に存在するものはスキップします",
"namespaceMain.shareSuccess": "{{copied}}件をコピーしました（{{skipped}}件スキップ）"
```

### 3-4. ShareScopeModal.tsx

**使用箇所から切り離す**（ファイルは保持）。
将来的な再利用可能性のためファイルは削除しない。

### 3-5. バックエンド

**変更なし**。
`POST /api/v1/namespaces/prefixes/share` は `targetScopeKey` を受け取るだけであり、フロントが現在ノードのscopeKeyを渡すことで対応可能。

## 4. 変更ファイル一覧

### 修正
1. `frontend/src/components/namespace/PrefixManagement.tsx`
   - `getCheckboxProps` に `isCurrentNodeRow` 判定を追加
2. `frontend/src/components/namespace/NamespaceMain.tsx`
   - `shareScopeNodes` useMemo 削除
   - `ShareScopeModal` 使用箇所削除
   - Prefix / 用語 共有ハンドラを `Modal.confirm` 方式に変更
3. `frontend/src/locales/ja.json`
   - 確認ダイアログ用文言追加
4. `frontend/src/locales/en.json`
   - 確認ダイアログ用文言追加

### 変更なし
- `backend/` 全般
- `ShareScopeModal.tsx`（ファイル保持、使用箇所のみ外す）
- `namespaceApiService.ts`（`sharePrefixes` 関数は再利用）

## 5. テスト計画

### 手動テスト（Prefix管理）
- [ ] 「材料合成部-1」選択時、子グループ由来Prefixにチェックが入る
- [ ] 「材料合成部-1」選択時、現在ノード由来PrefixはチェックOFF・disabled
- [ ] 「材料合成部-1」選択時、上位層由来PrefixはチェックOFF・disabled
- [ ] 共有ボタン押下で確認ダイアログが表示される（ツリー選択UIは出ない）
- [ ] ダイアログに選択済みPrefix名と「材料合成部-1」のスコープ名が表示される
- [ ] [共有する] 押下でコピーが実行される
- [ ] 既存のPrefixが存在する場合はスキップされ成功メッセージが表示される

### 手動テスト（用語管理）
- [ ] 同様の動作確認（Prefixと同等）

### 手動テスト（エッジケース）
- [ ] companyノード選択時は共有ボタンが表示されないことを確認
- [ ] personal-{userId} ノード選択時の動作確認
- [ ] Global ノード選択時は共有ボタンが表示されないことを確認

## 6. リスクと対策

| リスク | 影響度 | 対策 |
|---|---|---|
| 現在ノード由来行の `scopeKey` が null になるケース | 中 | null の場合は isCurrentNodeRow=false にフォールバック |
| `effectiveNsKey` が `personal-{userId}` 形式の場合、scopeKey への変換が必要 | 中 | `replace(/^personal-/, '')` で除去（既存処理と同様） |
| 用語共有は現状 `createTerm` を繰り返す実装のため、専用API未対応 | 低 | 既存実装（createTerm繰り返し）を流用しつつ確認ダイアログのみ変更 |

## 7. 承認記録

- **計画書提示日時**: 2026-09-04 13:00
- **承認日時**: 
- **承認者コメント**: 
