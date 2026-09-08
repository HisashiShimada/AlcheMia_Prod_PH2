# タスク計画書: TemplateEditorDialog key プロパティ属性不具合修正

## メタデータ

- **作成日時**: 2026-09-08 14:37
- **タスクID**: 20260908_1437_TemplateEditorDialog_keyプロパティ属性不具合修正
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## 1. タスク概要

`TemplateEditorDialog` でプロパティを追加した後、属性ボタンから `key` 属性を選択した際に 2 つの不具合が発生している。

### 不具合1: key 属性選択時に手入力形式になる

「属性」ボタン → 属性追加モーダル → 属性名として `key` を選択すると、入力欄が `<Input>` による手入力形式になっている。
本来は、プロパティ追加ダイアログと同様に**用語マップから選択する形式**（Select プルダウン）にすべきである。

### 不具合2: 手入力で別の key を設定するとヘッダー名ではなく key の列が表示される

上記の手入力欄に既存 propertyKey とは異なる文字列を入力して確定すると、ヘッダー部のプロパティ名（辞書キー）ではなく、属性セクションに **`key: <入力値>`** という行が新しく追加されて表示される。

**根本原因:** `handleUpdateNestedAttribute` は `attributes['key']` を更新するだけで、`properties` オブジェクトの辞書キー（プロパティ名）は変更されない。`key` は辞書キーと同一であるべき識別子であり、`attributes` 内で二重管理するべきでない。

---

## 2. 目的と期待される成果

- [ ] 属性追加モーダルで `key` を選択した場合、用語マップ（`termDisplayMap` の qname 一覧）から選べる **Select プルダウン**に変更する
- [ ] `key` 属性を設定すると、辞書キーのリネーム（rename）として処理され、ヘッダーのプロパティ名が変わる
- [ ] `key` は `attributes` 内に残らない（`attributes['key']` として二重保持しない）
- [ ] 属性セクション（インライン表示）で `key` 属性行を表示しない

---

## 3. 影響範囲の分析

### 変更対象ファイル

| ファイル | 変更種別 | 変更概要 |
|----------|----------|----------|
| `frontend/src/components/editorv2/NestedPropertyEditor.tsx` | 修正 | Props 追加・`key` 選択時の入力をSelect化・属性セクションから `key` を除外 |
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | 修正 | `handleRenameProperty` ハンドラー追加・NestedPropertyEditor への props 渡し |

### 影響を受けるコンポーネント

- `TemplateEditorDialog.tsx` 内の Properties 編集セクション（`NestedPropertyEditor` をレンダリングしている部分）
- `TemplateEditorDialog.tsx` 内の Contents 編集セクション（同上）
- `NestedPropertyEditor.tsx` の属性追加モーダル

### 影響を受けない範囲

- バックエンド（フロントエンドのみの修正）
- プロパティ追加モーダル（`showAddModal`）
- 要素追加モーダル・子要素追加モーダル・コピーモーダル
- XML タブ

---

## 4. 実装ステップ

### Step 1: NestedPropertyEditor.tsx の Props 拡張

- [ ] `NestedPropertyEditorProps` インターフェースに以下を追加する
  ```ts
  /** key 属性選択時に呼び出されるリネームコールバック（省略時は通常の手入力フォールバック） */
  onRenameProperty?: (oldKey: string, newKey: string) => void;
  /** 用語マップ（qname → displayName）で選択肢に利用する */
  termKeyOptions?: Array<{ value: string; label: string }>;
  ```
- [ ] コンポーネント本体の Props 分割代入にも追加する

### Step 2: NestedPropertyEditor.tsx の属性セクション修正

- [ ] 属性セクションのインライン表示（`Object.entries(propertyData.attributes).map(...)` 部分）で `attrName === 'key'` のエントリを除外して表示しないようにする
  - 理由: `key` は辞書キー（`propertyKey`）と一致するものであり、`attributes` に保持すべきでない

### Step 3: NestedPropertyEditor.tsx の属性追加モーダル修正

- [ ] `key` 属性を選択した際の入力欄（734〜740行付近）を `<Input>` から `<Select>` に変更する
  - 選択肢: `termKeyOptions` props の一覧から選択
  - `termKeyOptions` が空または未指定の場合: 従来通り `<Input>` フォールバック（後方互換性確保）
  - 選択肢には `value={qname}` / `label={displayName（あれば）+ qname}` を表示する
- [ ] `onOk` ハンドラーで `finalAttributeName === 'key'` の場合に `onRenameProperty` を呼び出す（`onUpdateNestedAttribute` ではなく）
  - `onRenameProperty` が未提供の場合は通常の `onUpdateNestedAttribute` にフォールバック

### Step 4: TemplateEditorDialog.tsx の handleRenameProperty 追加

- [ ] `handleRenameProperty(oldKey: string, newKey: string)` を実装する
  - バリデーション: `newKey.trim()` が空の場合はエラーメッセージ表示
  - バリデーション: `properties[newKey]` が既存の場合は重複エラー
  - 処理: `properties` 辞書の `oldKey` のデータを深コピーし、以下を更新して `newKey` で新規追加する
    1. `PropertyData.key` を `newKey` に更新
    2. `termTypeUnitMap` に `newKey` のエントリが存在する場合、`attributes['xsi:type']` と `attributes['units']` を用語マップの定義値で**上書き**する（存在しない場合は既存値を保持）
    3. `termDisplayMap` に `newKey` のエントリが存在する場合、`elements['description']` を用語マップの `description` で**上書き**する（存在しない場合は既存値を保持）
  - 処理: `properties` 辞書の `oldKey` エントリを削除する
  - 処理後: `forceRenderKey` を更新して再レンダリング、`setHasChanges(true)`
- [ ] Contents 用の `handleRenameContent(oldKey: string, newKey: string)` も同様に実装する
  - `contents` 辞書に対して同じ処理を行う（用語マップ上書きも含む）
  - `forceContentRenderKey` を更新する

### Step 5: TemplateEditorDialog.tsx の NestedPropertyEditor への props 渡し

- [ ] `termKeyOptions` を `useMemo` で生成する
  - `termDisplayMap` の entries から `{ value: qname, label: displayName ? \`${displayName}（${qname}）\` : qname }` の配列を作成する
- [ ] Properties セクションの `NestedPropertyEditor` に以下 props を追加する
  ```tsx
  onRenameProperty={handleRenameProperty}
  termKeyOptions={termKeyOptions}
  ```
- [ ] Contents セクションの `NestedPropertyEditor` に以下 props を追加する
  ```tsx
  onRenameProperty={handleRenameContent}
  termKeyOptions={termKeyOptions}
  ```

### Step 6: 動作確認・ビルドチェック

- [ ] TypeScript のコンパイルエラーがないことを確認
- [ ] 手動テスト（次章参照）

---

## 5. 変更ファイルリスト

```
frontend/src/components/editorv2/NestedPropertyEditor.tsx   （Props追加・Select化・key属性除外）
frontend/src/components/editorv2/TemplateEditorDialog.tsx    （handleRenameProperty/Content追加・props渡し・termKeyOptions生成）
```

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `key` のリネームにより既存データ参照が壊れる | 中 | 低 | リネーム後は `PropertyData.key` も同時に更新し整合性を保つ |
| `termKeyOptions` が空（用語マップ未ロード時）に選択できない | 低 | 中 | `termKeyOptions` が空の場合は `<Input>` にフォールバックして後方互換性を確保 |
| Contents セクションにも同じ問題がある | 低 | 高 | Contents 用の `handleRenameContent` を別途実装して対応 |
| 属性セクションから `key` を除外することで既存の `key` 属性データが消える | 高 | 低 | 除外は「表示のみ」であり、データ削除はしない。ただし属性として保持していた `attributes['key']` は将来的にリネーム処理に置き換える |

---

## 7. テスト計画

### 手動テスト

**前提:** TemplateEditorDialog を開き、プロパティを1件追加しておく。

#### 不具合1 修正確認（Select化）

- [ ] 追加したプロパティの「属性」ボタンをクリック → 属性追加モーダルが開く
- [ ] 属性名 Select から `key` を選択する
- [ ] 値入力欄が **Select プルダウン**になっていることを確認（Input 手入力ではない）
- [ ] プルダウンに用語マップの qname 一覧が表示されることを確認
- [ ] 用語を選択して OK → 正常に処理されることを確認

#### 不具合2 修正確認（リネーム処理）

- [ ] `key` 属性の Select から現在とは**異なる qname** を選択して OK をクリック
- [ ] ヘッダー部のプロパティ名（`property: <qname>`）が**選択した qname** に変わることを確認
- [ ] 属性セクションに `key: xxx` の行が**追加されていない**ことを確認
- [ ] 変更後も「保存」が機能することを確認

#### 属性セクション表示確認

- [ ] `attributes` に `key` が含まれるプロパティがある場合、属性セクションに `key` 行が表示されないことを確認

#### リグレッション確認

- [ ] `key` 以外の属性（`xsi:type`, `units` など）は従来通り動作することを確認
- [ ] プロパティ追加モーダルの動作に変化がないことを確認
- [ ] XML タブへの切り替えが正常に機能することを確認

---

## 8. ロールバック計画

- 変更ファイルは 2 ファイルのみで、Git で `git checkout` すれば即時ロールバック可能
- バックエンドへの影響なし

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-08 14:37
- **承認日時**: 2026-09-08 14:XX
- **承認者コメント**: key リネーム時に新しいキーの用語マップ定義で属性・要素を上書きする仕様を確認・承認

## 10. 実施記録

### 実施日時
開始: 2026-09-08 14:37
完了: 2026-09-08 14:XX

### 変更ファイル一覧

| ファイル | 変更概要 |
|----------|----------|
| `frontend/src/components/editorv2/NestedPropertyEditor.tsx` | Props 追加・key 選択時 Select 化・属性セクション key 除外・onOk 分岐追加 |
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | handleRenameProperty/Content 追加・termKeyOptions 生成・props 渡し |
| `frontend/src/locales/ja.json` | 翻訳キー `placeholderKeySelect` 追加 |
| `frontend/src/locales/en.json` | 翻訳キー `placeholderKeySelect` 追加 |

### 実装内容サマリー

#### NestedPropertyEditor.tsx
- `NestedPropertyEditorProps` に `termKeyOptions` / `onRenameProperty` を追加
- 属性セクションインライン表示で `attrName === 'key'` のエントリを除外
- 属性追加モーダルの onOk で `key` 選択時は `onRenameProperty` を呼び出す（フォールバックあり）
- `key` 選択時の値入力欄を `termKeyOptions` がある場合は `<Select showSearch>` に変更

#### TemplateEditorDialog.tsx
- `termKeyOptions` を `useMemo` で生成（termMap の qname + displayName から選択肢配列）
- `handleRenameProperty`：Properties 辞書キーのリネーム + 用語マップで型/単位/説明を上書き
- `handleRenameContent`：Contents 辞書キーのリネーム + 用語マップで型/単位/説明を上書き
- Properties・Contents の `NestedPropertyEditor` に `termKeyOptions` / `onRenameProperty` を渡す

### TypeScript コンパイル結果
- `npx tsc --noEmit` → エラー 0 件（正常終了）
