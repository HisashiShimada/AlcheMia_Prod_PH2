# タスク計画書: 名前空間ハードコード日本語修正完了

## メタデータ
- **作成日時**: 2026-08-12 15:35
- **タスクID**: namespace-hardcode-i18n-fix
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
名前空間関連コンポーネントに残存するハードコード日本語文字列をt()関数によるi18n化に置き換える。

## 変更ファイル
1. `frontend/src/locales/ja.json` — `namespaceMain` セクションに2キー追加
2. `frontend/src/locales/en.json` — `namespaceMain` セクションに2キー追加
3. `frontend/src/components/namespace/NamespaceMain.tsx` — 3箇所をt()化
4. `frontend/src/components/namespace/PrefixManagement.tsx` — 1箇所をt()化

## 実装ステップ
- [x] 調査・計画
- [ ] ja.json / en.json にキー追加
- [ ] NamespaceMain.tsx 3箇所修正
- [ ] PrefixManagement.tsx 1箇所修正
- [ ] 検証（check-i18n-keys.js 実行）

## 修正詳細

### ja.json（namespaceMain セクション末尾に追加）
```json
"teamAddParentLabelDefault": "研究開発部",
"noPrefixTooltip": "Prefixが未登録のため用語を追加できません。先にPrefixを登録してください。"
```

### en.json（namespaceMain セクション末尾に追加）
```json
"teamAddParentLabelDefault": "R&D Department",
"noPrefixTooltip": "No Prefix registered. Please register a Prefix before adding terms."
```

### NamespaceMain.tsx
- 1026行: `'研究開発部'` → `t('namespaceMain.teamAddParentLabelDefault')`
- 1825行: `'研究開発部'` → `t('namespaceMain.teamAddParentLabelDefault')`
- 1908行: Tooltip文字列 → `t('namespaceMain.noPrefixTooltip')`

### PrefixManagement.tsx
- 447行: `title: 'スコープ'` → `title: t('prefixManagement.colScope')`（localeファイル変更不要、キー既存）

## 承認記録
- **承認日時**: 2026-08-12 15:35
