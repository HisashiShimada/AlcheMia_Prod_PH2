# タスク計画書: PetrinetEditorInner - メソッドのIDとname編集対応

## メタデータ

- **作成日時**: 2026-08-14 14:21
- **タスクID**: 20260814_1421
- **優先度**: 中
- **推定工数**: 2〜3時間

---

## タスク概要

現在 `PetriNetEditorInner` のメソッドタブパネルでは、メソッドを選択してペンアイコンをクリックした際に **IDのみ** 編集できる。
これを **ID と name の両方** が編集できる形式に拡張し、編集した name が MAIML ファイルにも正しく書き出されるようにする。

---

## 目的と期待される成果

- [ ] メソッド編集ダイアログで ID と name の両方を入力・変更できる
- [ ] 変更した name が `MethodData` に保持される
- [ ] MAIML 保存時に `<method>` タグ直下に `<name>` タグが出力される（複数method・単一methodの両モード対応）
- [ ] 既存 MAIML ファイルに含まれる `<name>` 値がロード時に正しく `MethodData.name` に反映される
- [ ] `<name>` タグが存在しない既存 MAIML ファイルも問題なくロードできる（後方互換性維持）
- [ ] i18n（ja/en）翻訳が適切に追加される

---

## 現状分析

### 型定義の状況（変更不要）

| 型 | ファイル | nameフィールド |
|----|----------|--------------|
| `MethodData` | `types/editor.ts` L135 | `name: string` ✅ 定義済み |
| `Method` | `types/maiml-unified.ts` L908 | `name?: string` ✅ 定義済み |

### 問題箇所

| # | 問題 | ファイル・行 |
|---|------|-----------|
| 1 | 編集ダイアログに **ID入力欄のみ**、nameの入力欄なし | `MethodTabPanel.tsx` L260〜289 |
| 2 | `handleEditMethodId` が ID しか変更しない | `PetriNetEditorInner.tsx` L2554 |
| 3 | MAIMLロード時に `method.name` を未使用、ハードコード | `PetriNetEditorInner.tsx` L910 |
| 4 | `buildMethodXML` で method 要素の `<name>` タグが出力されていない | `multiMethodConverter.ts` L376〜 |
| 5 | 単一 method モードでも method の `<name>` 出力なし | `reactFlowToMaiml.ts` L1059〜 |
| 6 | i18n 翻訳にname関連のキーが不足 | `locales/ja.json`, `locales/en.json` |

---

## 実装ステップ

### Step 1: i18n翻訳ファイルの修正

`editor.method` セクションに以下のキーを追加・更新する。

追加・変更するキー（ja.json）:
```json
"editTitle": "Method編集",
"nameLabel": "Method名",
"namePlaceholder": "メソッド名を入力",
"nameHint": "MAIML上で表示されるメソッド名です"
```

追加・変更するキー（en.json）:
```json
"editTitle": "Edit Method",
"nameLabel": "Method Name",
"namePlaceholder": "Enter method name",
"nameHint": "The display name for this method in MAIML"
```

---

### Step 2: `MethodTabPanel.tsx` の修正

#### 2-1. Props 型の変更
```ts
// 変更前
onEditMethodId?: (index: number, newMethodId: string) => void;
// 変更後
onEditMethodId?: (index: number, newMethodId: string, newName: string) => void;
```

#### 2-2. ローカル state の追加
```ts
const [newMethodName, setNewMethodName] = useState('');
```

#### 2-3. `handleOpenEditDialog` の修正
```ts
setNewMethodId(methods[index].methodId);
setNewMethodName(methods[index].name || ''); // 追加
```

#### 2-4. `handleCloseEditDialog` の修正
```ts
setNewMethodName(''); // 追加
```

#### 2-5. `handleSaveMethodId` の修正
```ts
onEditMethodId(editingMethodIndex, newMethodId, newMethodName); // newMethodName を追加
```

#### 2-6. Modal にname入力欄を追加
ID入力欄の下に name 入力欄（Input）を追加する。

---

### Step 3: `PetriNetEditorInner.tsx` の修正

#### 3-1. `handleEditMethodId` の引数に `newName` を追加（L2554）
```ts
// 変更前
const handleEditMethodId = useCallback((index: number, newMethodId: string) => {
// 変更後
const handleEditMethodId = useCallback((index: number, newMethodId: string, newName: string) => {
```
`setMethods` 内の `updated[index]` に `name: newName` を追加。

#### 3-2. MAIMLロード時の name 反映（L910）
```ts
// 変更前
name: `Method ${index + 1}`,
// 変更後
name: method.name || `Method ${index + 1}`,
```

#### 3-3. `EditorActions` 型定義の更新（L3367 付近）
```ts
// 変更前
handleEditMethodId: (index: number, newMethodId: string) => void;
// 変更後
handleEditMethodId: (index: number, newMethodId: string, newName: string) => void;
```

---

### Step 4: `multiMethodConverter.ts` の修正

`buildMethodXML` 関数内で method 要素直下に `<name>` タグを出力する。

```ts
// 変更前（L376〜380）
let methodXml = `    <method id="${methodId}">\n`;
methodXml += `      <uuid>${methodUuid}</uuid>\n`;
methodXml += `      <pnml id="${pnmlId}">\n`;

// 変更後
let methodXml = `    <method id="${methodId}">\n`;
methodXml += `      <uuid>${methodUuid}</uuid>\n`;
if (method.name) {
  methodXml += `      <name>${escapeXml(method.name)}</name>\n`;
}
methodXml += `      <pnml id="${pnmlId}">\n`;
```

---

### Step 5: `reactFlowToMaiml.ts` の修正（単一 method モード）

単一 method モードの出力において、`allMethods[0]?.name` を参照して `<name>` タグを出力する。

```ts
// L1059〜1062 付近
maiml += `    <method id="${escapeXml(methodId)}">\n`;
maiml += `      <uuid>${escapeXml(methodUuid)}</uuid>\n`;
// method nameがあれば<name>タグを出力（追加）
const singleMethodName = allMethods?.[0]?.name;
if (singleMethodName) {
  maiml += `      <name>${escapeXml(singleMethodName)}</name>\n`;
}
maiml += `      <pnml id="${escapeXml(pnmlId)}">\n`;
```

---

## 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|----------|---------|
| 1 | `frontend/src/locales/ja.json` | `editor.method` にnameキー追加、`editTitle` 更新 |
| 2 | `frontend/src/locales/en.json` | `editor.method` にnameキー追加、`editTitle` 更新 |
| 3 | `frontend/src/components/editorv2/MethodTabPanel.tsx` | Props変更、state追加、Modal更新 |
| 4 | `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | ハンドラ引数追加、ロード時name反映、型定義更新 |
| 5 | `frontend/src/utils/multiMethodConverter.ts` | buildMethodXMLにmethod name出力追加 |
| 6 | `frontend/src/utils/reactFlowToMaiml.ts` | convertReactFlowToMaiMLにmethod name出力追加 |

変更なし:
- `frontend/src/types/editor.ts`（`MethodData.name` 定義済み）
- `frontend/src/types/maiml-unified.ts`（`Method.name` 定義済み）

---

## 影響範囲の分析

- **UI変更**: メソッド編集ダイアログのみ（他画面への影響なし）
- **MAIML出力変更**: `<name>` タグが追加されるが、既存 MAIML の解析には影響なし
- **既存 MAIML との互換性**: `name` が空の場合は `<name>` タグを出力しないため後方互換性を維持
- **認証・認可への影響**: なし
- **マルチテナント分離への影響**: なし

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `onEditMethodId` のシグネチャ変更による他呼び出し箇所の破損 | 高 | 低 | 呼び出し箇所は PetriNetEditorInner.tsx の1箇所のみであることを事前確認済み |
| MAIML に `<name>` タグが含まれることで既存バリデーションが失敗 | 中 | 低 | XSD仕様上 `Method.name` はオプショナルとして定義されており問題なし |
| 既存 MAIML ロード時に name が undefined になる | 低 | 高 | `method.name \|\| 'Method ${index + 1}'` フォールバックで対応 |

---

## テスト計画

- [ ] メソッドタブのペンアイコンをクリックすると ID・name の両入力欄が表示される
- [ ] ID・name を変更して保存するとタブラベルが更新される
- [ ] MAIML 保存後、XMLに `<method>` 直下の `<name>` タグが出力される（複数methodモード）
- [ ] MAIML 保存後、XMLに `<method>` 直下の `<name>` タグが出力される（単一methodモード）
- [ ] `<name>` タグを持つ既存 MAIML ファイルをロードすると、編集ダイアログに name 値が表示される
- [ ] `<name>` タグを持たない既存 MAIML ファイルも問題なくロードできる
- [ ] name を空にして保存しても `<name>` タグが出力されない（省略される）

---

## 承認記録

- **計画書提示日時**: 2026-08-14 14:21
- **承認日時**: 2026-08-14 14:21
- **承認者コメント**: 承認します。

## 実施記録

### 実施日時
開始: 2026-08-14 14:21
完了: 2026-08-14 14:30

### 計画からの変更点
なし

### 最終的な成果物
- [x] `locales/ja.json` - `editor.method` に `editTitle`/`nameLabel`/`namePlaceholder`/`nameHint` 追加
- [x] `locales/en.json` - 同上（英語版）
- [x] `components/editorv2/MethodTabPanel.tsx` - Props型変更・state追加・Modal内にname入力欄追加
- [x] `components/editorv2/PetriNetEditorInner.tsx` - ハンドラ引数追加・ロード時name反映・型定義更新
- [x] `utils/multiMethodConverter.ts` - `buildMethodXML` にmethod `<name>` 出力追加
- [x] `utils/reactFlowToMaiml.ts` - 単一methodモードにmethod `<name>` 出力追加
