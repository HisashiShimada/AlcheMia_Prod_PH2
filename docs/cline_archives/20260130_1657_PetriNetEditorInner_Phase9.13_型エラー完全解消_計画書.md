# Phase9.13: 型エラー完全解消 - タスク計画書

## メタデータ
- **作成日時**: 2026-01-30 15:57
- **タスクID**: Phase9.13
- **優先度**: 高
- **推定工数**: 1.5時間

## 1. タスク概要

Phase9.11完了後に残っている型エラー（24件）を完全に解消します。

## 2. 現在のエラー状況

### ESLintエラー（14件）
- any型の使用禁止違反: 12件
- リテラル型アサーション警告: 2件

### TypeScriptエラー（10件）
1. **Line 436**: pushState関数の型不一致（EditorState vs string）
2. **Line 866**: string型をnull型に割り当て不可
3. **Line 907-908, 994-996**: MethodData型にplaces/transitions/arcsプロパティなし
4. **Line 942**: undefined型をstring|null型に割り当て不可
5. **Line 1668**: ノード配列の型不一致（NodeType問題）
6. **Line 1734**: undefined可能性のあるオブジェクトの呼び出し
7. **Line 2302**: DraftData型が見つからない
8. **Line 2317**: edge引数が暗黙的any型
9. **Line 3214**: Date|null型をnumber|null型に割り当て不可
10. **Line 3489-3772**: 各種Props型の不一致

## 3. 修正ステップ

### Step 1: 重要型定義の追加・修正
**対象ファイル**: `frontend/src/components/editorv2/types/index.ts`

**修正内容**:
- [ ] DraftData型をDraftDataSimpleから正式エクスポート
- [ ] MethodDataRaw型にplaces/transitions/arcs追加
- [ ] FileInfo型の正式エクスポート追加

### Step 2: pushState関数の型修正
**対象行**: Line 436

**修正内容**:
- [ ] useHistory.tsのpushState型定義を確認
- [ ] EditorState型の正しい構造を適用

### Step 3: string|null型の統一
**対象行**: Line 866, 942

**修正内容**:
- [ ] error, saveError変数の型定義を統一
- [ ] null vs undefinedの使い分けを明確化

### Step 4: MethodData型の拡張
**対象行**: Line 907-908, 994-996

**修正内容**:
- [ ] MethodDataRaw型にplaces/transitions/arcsプロパティ追加
- [ ] 既存のMethod型との整合性確保

### Step 5: NodeType型キャストの修正
**対象行**: Line 1668

**修正内容**:
- [ ] placeType/nodeTypeを適切にキャスト
- [ ] NodeType型の明示的指定

### Step 6: any型の排除
**対象行**: Line 1718, 2001, 2006, 3277, 3284, 3290, 3347, 3375, 3381, 3386-3388

**修正内容**:
- [ ] changes引数: NodesChange<NodeData>[] | EdgesChange<EdgeData>[]型に変更
- [ ] params引数: SelectionParams型に変更
- [ ] connection引数: Connection型に変更
- [ ] draft引数: DraftData型に変更
- [ ] metadata引数: SaveMetadata型に変更
- [ ] その他any型を具体的な型に置換

### Step 7: リテラル型アサーションの修正
**対象行**: Line 3603, 3620

**修正内容**:
- [ ] `as 'partial'` → `as const`
- [ ] `as 'dots'` → `as const`

### Step 8: Props型の不一致修正
**対象行**: Line 3489, 3656, 3669, 3690, 3710-3712, 3732, 3734, 3752

**修正内容**:
- [ ] addTemplate関数の型定義修正
- [ ] handleTemplateSelect関数の型修正
- [ ] handleUpdateNodeProperty関数の型修正
- [ ] その他Props型の整合性確保

### Step 9: Date|null → number|null変換
**対象行**: Line 3214

**修正内容**:
- [ ] lastAutoSaveTimeをDate型からnumber型（タイムスタンプ）に変更
- [ ] useDraftManager.tsの戻り値型を確認・修正

### Step 10: undefined安全性チェック追加
**対象行**: Line 1734

**修正内容**:
- [ ] オプショナルチェーンまたは条件分岐で安全性確保

## 4. 検証方法

### ビルド検証
```bash
cd frontend
npm run build
```

### Lint検証
```bash
npm run lint
```

### 型チェック検証
```bash
npx tsc --noEmit
```

## 5. 期待される成果

- [ ] TypeScriptエラー0件
- [ ] ESLintエラー0件
- [ ] ビルド成功
- [ ] 既存機能が正常動作

## 6. リスク管理

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 型修正による実行時エラー | 中 | 各修正後に動作確認 |
| 循環参照の発生 | 低 | types/index.tsの構造を維持 |

## 7. 実施記録

### 実施日時
開始: 2026-01-30 15:57

### 進捗状況
- [ ] Step 1: 型定義追加・修正
- [ ] Step 2: pushState型修正
- [ ] Step 3: string|null統一
- [ ] Step 4: MethodData拡張
- [ ] Step 5: NodeTypeキャスト修正
- [ ] Step 6: any型排除
- [ ] Step 7: リテラル型修正
- [ ] Step 8: Props型修正
- [ ] Step 9: Date→number変換
- [ ] Step 10: undefined安全性

## 8. 次セッション引き継ぎ事項

（作業完了後に記載）

---

**承認待ち**: ユーザーの承認後、作業を開始します。