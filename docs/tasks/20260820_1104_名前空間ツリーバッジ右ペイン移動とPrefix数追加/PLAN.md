# タスク計画書: 名前空間ツリーバッジ右ペイン移動とPrefix数追加

## メタデータ
- **作成日時**: 2026-08-20 11:04
- **タスクID**: 名前空間ツリーバッジ右ペイン移動とPrefix数追加
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

名前空間管理画面の左ペイン（階層ツリー）に表示している用語数バッジを右ペインに移動し、
あわせて Prefix数も表示されるよう変更する。

## 2. 目的と期待される成果

### 目的
- 左ペインのノードラベルがバッジで見づらくなっているため、右ペインに移動して視認性を改善する
- Prefix数も把握できるよう、用語数・Prefix数を右ペインに並べて表示する

### 期待される成果
- [ ] 左ペインの各ツリーノードから用語数バッジ（青いTag）が削除される
- [ ] 右ペインの上部に「用語数: N」「Prefix数: N」のバッジが表示される
- [ ] ツリーのノードを切り替えると右ペインのバッジも連動して更新される
- [ ] 日英両言語に対応している

## 3. 実装ステップ

### Phase 1: タスク計画書の作成
- [x] タスク計画書を作成

### Phase 2: NamespaceMain.tsx 修正
- [ ] `renderTreeTitle` から `termCount` 引数と `<Tag>` バッジを削除
- [ ] `toAntTree` から termCount 計算ロジック（`allTerms` / `prefixToScopeKeyMap` 依存部分）を削除
  - ただし `allTerms` / `fetchAllTerms` は他でも参照される可能性があるため削除前に影響確認
- [ ] 右ペインの上部（ツールバーエリア）に用語数・Prefix数バッジを追加

### Phase 3: i18n キー追加
- [ ] `frontend/src/locales/ja.json` に `termCountBadge` / `prefixCountBadge` キーを追加
- [ ] `frontend/src/locales/en.json` に同キーを追加

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/namespace/NamespaceMain.tsx` - バッジ位置の変更
2. `frontend/src/locales/ja.json` - i18nキー追加
3. `frontend/src/locales/en.json` - i18nキー追加

### 新規作成するファイル
なし

### 影響を受ける機能
- 名前空間管理画面の左ペインのツリー表示（バッジ削除）
- 名前空間管理画面の右ペイン上部（バッジ追加）

## 5. 技術的詳細

### 現状（変更前）

`renderTreeTitle` 関数（NamespaceMain.tsx L1213〜1250）でツリーノードタイトルに `<Tag>` を表示：

```tsx
return (
  <span ...>
    <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{displayLabel}</span>
    <Tag color="blue" style={{ ... }}>
      {termCount}
    </Tag>
  </span>
);
```

### 変更後

#### 左ペイン（ツリー）: バッジ削除

```tsx
return (
  <span ...>
    <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{displayLabel}</span>
  </span>
);
```

#### 右ペイン: バッジ追加

右ペインの検索バー・ツールバー行の左端に統計バッジを追加する。
表示場所は検索 Input の左側（ツールバー行の先頭）。

```tsx
{/* 右ペイン上部のアクションバー内 */}
<div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 2 }}>
  {/* 統計バッジ（新規追加） */}
  {!isGlobalNodeSelected && (
    <div style={{ display: 'flex', gap: 4, marginRight: 8, flexShrink: 0 }}>
      <Tag color="blue">{t('namespaceMain.termCountBadge', { count: String(filteredTerms.length) })}</Tag>
      <Tag color="green">{t('namespaceMain.prefixCountBadge', { count: String(dbPrefixes.length) })}</Tag>
    </div>
  )}
  <Input ... />  {/* 既存の検索欄 */}
  ...
</div>
```

#### i18n キー

**ja.json に追加:**
```json
"termCountBadge": "用語数: {{count}}",
"prefixCountBadge": "Prefix数: {{count}}"
```

**en.json に追加:**
```json
"termCountBadge": "Terms: {{count}}",
"prefixCountBadge": "Prefixes: {{count}}"
```

### `termCount` / `allTerms` / `treeData` の依存関係整理

| 変数 | 現状の用途 | 変更後 |
|---|---|---|
| `termCount` | ツリーノードのバッジ表示 | 不要（削除） |
| `allTerms` / `fetchAllTerms` | termCount 計算のためのフルフェッチ | 不要になる（削除候補） |
| `prefixToScopeKeyMap` | termCount 計算 | 不要になる（削除候補） |
| `dbPrefixes` | Prefix プルダウン・ボタン活性判定 | バッジ表示にも流用 |
| `filteredTerms` | テーブル表示 | バッジ表示にも流用 |

> **注意**: `allTerms` / `fetchAllTerms` / `prefixToScopeKeyMap` は `treeData` の依存配列にのみ使われているため、`renderTreeTitle` からバッジを削除すれば安全に削除できる。ただし実装時にコードを精査して削除の可否を最終確認する。

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `allTerms` の削除により別の箇所で参照エラー | 高 | 低 | 実装前に `allTerms` の全参照箇所をコード検索で確認 |
| バッジ数値が選択ノードと連動しない | 中 | 低 | `filteredTerms.length`（既に選択ノードで絞り込み済み）と `dbPrefixes.length`（selectedNsKey変化時にfetchPrefixes済み）を使うため問題なし |

## 7. テスト計画

### 手動テスト
- [ ] 左ペインのツリーノードに数字バッジが表示されなくなっていること
- [ ] 右ペインの上部に「用語数: N」「Prefix数: N」が表示されること
- [ ] ツリーで別のノードを選択したとき、バッジの数値が変化すること
- [ ] グローバルノード選択時はバッジが表示されないこと（`GlobalNamespaceView` 表示時）
- [ ] 英語表示に切り替えたとき「Terms: N」「Prefixes: N」と表示されること

## 8. 承認記録

- **計画書提示日時**: 2026-08-20 11:04
- **承認日時**: 
- **承認者コメント**: 

## 9. 実施記録

### 実施日時
開始: 
完了: 

### 最終的な成果物
- [ ] NamespaceMain.tsx 修正完了
- [ ] ja.json / en.json 修正完了
