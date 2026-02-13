# PetriNetEditorInner Phase9.9 型エラー修正計画書

**日時**: 2026-01-30 15:35  
**作業者**: Cline  
**推定時間**: 20分

## 📋 目標

PetriNetEditorInner.tsxの型エラーを**24件から21件に削減**します。

## 🎯 作業内容

### Phase9.9: 暗黙のany型エラー3件の修正

暗黙のany型エラー3件を確実に修正します。

#### エラー詳細

1. **line 1083**: `Parameter 'm' implicitly has an 'any' type`
   - methodsData.map内のパラメータ
   - 型: `MethodData`

2. **line 1239**: `Parameter 'edge' implicitly has an 'any' type`
   - edges.filter内のパラメータ
   - 型: `Edge<EdgeData>`

3. **line 1325**: `Parameter 'e' implicitly has an 'any' type`
   - edges.filter内のパラメータ
   - 型: `Edge<EdgeData>`

## 📝 実装手順

### Step1: line 1083の修正
```typescript
// 修正前
methods: methodsData.map((m) => ({

// 修正後
methods: methodsData.map((m: MethodData) => ({
```

### Step2: line 1239の修正
```typescript
// 修正前
const affectedEdges = edges.filter((edge) =>

// 修正後
const affectedEdges = edges.filter((edge: Edge<EdgeData>) =>
```

### Step3: line 1325の修正
```typescript
// 修正前
setEdges((eds) => eds.filter((e) =>

// 修正後
setEdges((eds: Edge<EdgeData>[]) => eds.filter((e: Edge<EdgeData>) =>
```

## ✅ 検証

各修正後に以下のコマンドで検証：
```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "src/components/editorv2/PetriNetEditorInner.tsx" | wc -l
```

- 期待結果: 21件（24件から3件削減）

## 📊 成功基準

- [ ] line 1083のエラーが解消
- [ ] line 1239のエラーが解消
- [ ] line 1325のエラーが解消
- [ ] 型エラー総数が21件になる

## 🔧 技術的な注意点

### 確実な修正のために
1. replace_in_fileツールで該当箇所を正確に特定
2. 各修正後に型チェックで確認
3. エラー数が減っているか確認

### 修正箇所の特定
- line番号は参考値（前後する可能性あり）
- エラーメッセージの内容で正確に特定

## 📌 次のステップ（Phase9.10）

Phase9.9完了後、残りの21件のエラーに対応します：

### 優先度2: 簡単な型不一致の修正
1. line 865: Type 'string' is not assignable to type 'null'
2. line 941: Type 'string | undefined' is not assignable to type 'string | null'
3. line 3212: Type 'Date | null' is not assignable to type 'number | null'

---

**重要**: 各ステップで必ず型チェックを実行して、エラー数の推移を確認します。