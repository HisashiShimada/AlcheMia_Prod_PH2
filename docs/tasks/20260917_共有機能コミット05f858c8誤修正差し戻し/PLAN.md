# タスク計画書: 共有機能 コミット05f858c8 誤修正差し戻し

## メタデータ
- **作成日時**: 2026-09-17
- **タスクID**: 共有機能コミット05f858c8誤修正差し戻し
- **優先度**: 高
- **推定工数**: 2時間

---

## 1. タスク概要

コミット `05f858c8`（名前空間課題対応_No.320）において、共有機能の動作が本来の仕様とは異なる修正に差し替えられてしまった。本タスクではその差異を特定し、正しい動作に戻す。

---

## 2. 本来の仕様

### 共有フロー
1. 左ツリーで**共有したい用語/Prefixが登録されているグループ**を選択
2. テーブルには選択中ノード自身＋**上位グループ**の用語/Prefixが表示される（現在の仕様のまま）
3. 共有したい用語/Prefixをチェックして「共有」ボタンを押下
4. **ツリー選択UIのダイアログ**が開き、共有先として**選択中グループの上位グループ**を選ぶ
5. 共有を実行 → 選んだ上位グループの scopeKey へコピー

### チェックボックスの制御（Prefix・用語共通）
| 行の種類 | チェック可否 |
|---|---|
| 上位層（祖先）由来の行 | **不可**（上位層データは操作対象外） |
| 現在ノード由来の行 | **可**（これが共有したいデータ） |
| 下位層（子孫）由来の行 | 表示されない（現在の仕様どおり） |

---

## 3. コミット 05f858c8 で混入した誤り

コミット前は正しく動作していた。コミット 05f858c8 で以下の4点が誤った方向に変更された。

### 誤り1: ShareScopeModal.tsx のUIが差し替えられた

| | コミット前（正しい） | コミット後（誤り） |
|---|---|---|
| UI | **ツリー選択UI**（上位グループを選んで共有先を決める） | 確認ダイアログ（共有先を選べない）|
| onShare の引数 | `(target: ShareTarget)` — 選んだ上位グループ情報 | `(selectedItemIds: string[])` — アイテムID一覧 |
| props | `scopeNodes: ScopeNode[]`（上位グループのツリー） | `shareItems: ShareItem[]`（共有するアイテム一覧） |

### 誤り2: NamespaceMain.tsx の `shareScopeNodes` useMemo が別物に差し替えられた

| | コミット前（正しい） | コミット後（誤り） |
|---|---|---|
| 内容 | **選択中ノードの祖先（上位グループ）のみ**を ScopeNode[] に変換してツリー表示 | 全ツリーを ScopeNode[] に変換（どこにも使われていないデッドコード） |

### 誤り3: NamespaceMain.tsx の `handleShareToTarget` が `handleShareTermsOnShare` に差し替えられた

| | コミット前（正しい） | コミット後（誤り） |
|---|---|---|
| 共有先 | **ダイアログで選んだ上位グループ**の `target.prefix`/`target.key` | 現在選択中ノード固定（`effectiveNsKey`） |
| 共有先の scopeKey | `target.prefix`（選んだ上位グループのprefix） | `effectiveNsKey.replace(/^personal-/,'')` |

### 誤り4: PrefixManagement.tsx の `getCheckboxProps` に誤った制御が追加された

コミット 05f858c8 で `isCurrentNodeRow`（現在ノード由来の行もdisabled）が追加されたが、  
現在ノード由来の行こそが「共有したいデータ」のため、チェック可能のままにすべきだった。

| | コミット前（正しい） | コミット後（誤り） |
|---|---|---|
| disabled 条件 | `isAncestorRow`（上位層のみdisabled） | `isAncestorRow \|\| isCurrentNodeRow`（現在ノードもdisabled） |

---

## 4. 修正内容

### 4-1. `frontend/src/components/namespace/ShareScopeModal.tsx`

コミット前の実装（ツリー選択UI）に戻す。

- `shareItems`/`targetScopeName` props を削除し、`scopeNodes: ScopeNode[]` に戻す
- `Modal` 内のコンテンツを `<List>` から `<Tree>` に戻す
- `onShare` の型を `(selectedItemIds: string[]) => void` から `(target: ShareTarget) => void` に戻す
- `selectedKey` state / `handleOk` / `handleClose` をコミット前の実装に戻す

### 4-2. `frontend/src/types/namespace.ts`

`ShareScopeModalProps` 型定義をコミット前に戻す。  
（`ShareItem` / `targetScopeName` を削除し、`scopeNodes: ScopeNode[]` / `sourceRole: ShareSourceRole` に戻す）

- `ShareItem` インターフェースを削除
- `ShareScopeModalProps` を元の型に戻す：
  ```typescript
  export interface ShareScopeModalProps {
    open: boolean;
    termCount?: number;
    sourceRole: ShareSourceRole;
    scopeNodes: ScopeNode[];
    onClose: () => void;
    onShare: (target: ShareTarget) => void;
  }
  ```
- `PrefixManagementProps` から `targetScopeName?: string` を削除

### 4-3. `frontend/src/components/namespace/NamespaceMain.tsx`

コミット前の実装に戻す。

**削除するもの（コミット後に追加された誤り）:**
- `shareScopeModalOpen` state → `shareScopeOpen` state に戻す
- `handleShareTermsToCurrentNode` / `handleShareTermsOnShare` / `shareItemsForModal` / 誤った `shareScopeNodes` useMemo → 削除
- 共有ボタンの `onClick` を `() => setShareScopeOpen(true)` に戻す
- JSX 内の `<ShareScopeModal>` を元の props 形式に戻す

**復元するもの（コミット前に存在した正しい実装）:**
- `targetUserGroups` state および取得 useEffect
- `shareScopeOpen` state
- `handleShareToTarget` ハンドラ（選んだ上位グループの `target.prefix`/`target.key` へコピー）
- `shareScopeNodes` useMemo（祖先ノードのみを返す実装）
- `import type { ShareTarget, ShareSourceRole }` インポート
- JSX 内 `<ShareScopeModal>` に `scopeNodes={shareScopeNodes}` / `sourceRole` / `onShare={(target) => handleShareToTarget(target)}` を復元

### 4-4. `frontend/src/components/namespace/PrefixManagement.tsx`

`getCheckboxProps` から `isCurrentNodeRow` 判定を削除し、コミット前の状態に戻す。

```typescript
// 修正前（コミット後の誤り）
const isCurrentNodeRow = currentScopeKey != null && r.scopeKey === currentScopeKey;
return { disabled: isAncestorRow || isCurrentNodeRow };

// 修正後（コミット前の正しい実装）
return { disabled: isAncestorRow };
```

また、コミット 05f858c8 で追加された以下の不要なコードも削除する：
- `shareScopeModalOpen` / `shareItemsForModal` state
- `handleShareButtonClick` / `handlePrefixShare` 関数
- `ScopeNode` / `ShareItem` / `ShareTarget` / `OrganizationGroupRow` の import
- `getOrganizationGroups` / `sharePrefixes` の import（元から不要だったもの）
- JSX 内の `<ShareScopeModal>` マウント
- props の `targetScopeName` 受け取り

共有ボタンの `onClick` を元の `() => onShareSelected?.(selectedRowKeys)` に戻す。

---

## 5. 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `frontend/src/components/namespace/ShareScopeModal.tsx` | ツリー選択UIに戻す |
| 2 | `frontend/src/types/namespace.ts` | `ShareScopeModalProps` 型をコミット前に戻す、`ShareItem` / `targetScopeName` 削除 |
| 3 | `frontend/src/components/namespace/NamespaceMain.tsx` | `shareScopeNodes`（祖先ツリー）/ `handleShareToTarget` 等をコミット前に戻す |
| 4 | `frontend/src/components/namespace/PrefixManagement.tsx` | `isCurrentNodeRow` 削除、共有ロジックを親コンポーネント委譲に戻す |

**変更しないファイル:** バックエンド全般、`locales/ja.json` / `en.json`（既存キーは流用）

---

## 6. リスクと対策

| リスク | 影響度 | 対策 |
|---|---|---|
| `UncertaintyManagement.tsx` が `ShareScopeModal` の props を参照しているため型変更の影響を受ける | 高 | `ShareScopeModalProps` を元の型に戻した後、`UncertaintyManagement.tsx` の props も確認・修正する |
| `PrefixManagement` の `onShareSelected` コールバックを `UncertaintyManagement` から渡している箇所の動作確認 | 中 | `UncertaintyManagement.tsx` の `onShareSelected` / `shareScopeNodes` / `handleShareToTarget` も合わせて影響確認する |
| `ShareItem` 型を削除することで他の参照箇所がコンパイルエラーになる | 中 | 削除前に全参照箇所を検索して影響範囲を確認する |

---

## 7. テスト計画

### 手動テスト（用語管理タブ）

- [ ] グループノード（例: 「材料合成部-1」）を選択し、そのグループの用語をチェックできる
- [ ] 上位層由来の用語はチェック OFF・disabled
- [ ] 共有ボタン押下でツリー選択ダイアログが開く
- [ ] ダイアログに選択中グループの**上位グループ**のみがツリー表示される
- [ ] 上位グループを選択して[共有する]を押すとコピーが実行される
- [ ] 代表者でないグループはグレー表示（selectable=false）

### 手動テスト（Prefix 管理タブ - UncertaintyManagement 経由）

- [ ] グループノード選択時、そのグループの Prefix をチェックできる
- [ ] 上位層由来の Prefix はチェック OFF・disabled
- [ ] 共有ボタン押下でツリー選択ダイアログが開く（`onShareSelected` → `UncertaintyManagement` → `ShareScopeModal`）

### 手動テスト（エッジケース）

- [ ] `global` / `company` ノード選択時は共有ボタンが表示されないことを確認
- [ ] `personal-{userId}` ノード選択時はそのユーザーの所属グループが共有先に表示される

---

## 8. 承認記録

- **計画書提示日時**: 2026-09-17
- **承認日時**: 2026-09-17（口頭承認）
- **承認者コメント**: 修正方針が正しいと確認。実装を進める。

---

## 9. 実施記録

### 実施日時
開始: 2026-09-17  完了: 2026-09-17

### 変更ファイル一覧（実施済み）
1. `frontend/src/components/namespace/ShareScopeModal.tsx` - ツリー選択UIに復元
2. `frontend/src/types/namespace.ts` - `ShareScopeModalProps` を元の型に戻す、`ShareItem` / `targetScopeName` 削除
3. `frontend/src/components/namespace/NamespaceMain.tsx` - `targetUserGroups` / `shareScopeOpen` / `handleShareToTarget` / `shareScopeNodes`（祖先ツリー）を復元、誤った実装を削除
4. `frontend/src/components/namespace/PrefixManagement.tsx` - `isCurrentNodeRow` 削除、共有ロジックを `onShareSelected` 親委譲に戻す
5. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - `ShareScopeModal` props を `scopeNodes` / `onShare(target: ShareTarget)` 形式に戻す

### TypeScript コンパイル確認
`npx tsc --noEmit` → エラー 0件
