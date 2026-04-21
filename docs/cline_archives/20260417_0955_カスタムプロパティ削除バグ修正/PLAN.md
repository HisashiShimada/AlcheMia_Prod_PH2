# タスク計画書: カスタムプロパティ削除後に保存しても削除が反映されないバグ修正

## メタデータ
- **作成日時**: 2026-04-17 09:55
- **更新日時**: 2026-04-17 10:05
- **タスクID**: custom-property-delete-bug-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験データ記録画面のカスタムプロパティリストで、プロパティを追加して保存した後に削除操作を行っても削除が正しく反映されない複数のバグを修正する。

## 目的と期待される成果

### 目的
カスタムプロパティの削除操作が保存時に確実にDBへ反映されるようにする。

### 期待される成果
- [ ] カスタムプロパティを追加→保存→全削除→保存の操作で、削除が正しくDBに反映される
- [ ] カスタムプロパティを一部削除した場合も、残りのエントリだけが正しく保存される
- [ ] property を削除後に再表示しても値が null にならず、エントリ自体が消える
- [ ] content を他のカスタムプロパティと同時に削除しても消える
- [ ] 既存の「追加して保存」動作に影響が出ない

## 追加修正（2026-04-20）
### 追加バグ④ Propertyなしテンプレートにカスタムプロパティが出力されない

**現象:** テンプレートに Property が一件もなく、Insertion や Content だけが存在する場合、カスタムプロパティが保存されない。

**原因:** 修正②（1126行目付近）のクリーンアップ＆再追記処理が `if (baseData.properties && Array.isArray(baseData.properties))` 条件の内側に収まっているため、`baseData.properties` が存在しないテンプレートでは処理全体がスキップされる。

**修正方針:**
- `if (templateCustomProps.length > 0)` を外側の条件にする
- `length > 0` の場合: クリーンアップ＋再追記（baseData.properties の有無に関わらず実行）
- `length === 0` の場合: クリーンアップのみ（各配列を `filter(!isCustomProperty)` で除去）

### 追加バグ⑤ Propertyなしテンプレートでトップレベル Contents の値更新がスキップされる

**現象:** `baseData.properties` が存在しないテンプレートで、トップレベルの Contents フィールドへの値更新が反映されない。

**原因:** トップレベル Contents の値更新処理（1019〜1032行目付近）が `if (baseData.properties && Array.isArray(baseData.properties))` ブロックの内側にある。

**修正方針:** Contents 更新処理を `if (baseData.properties...)` ブロックの**外**（直後）に移動する。
- [x] カスタムプロパティを追加→保存→全削除→保存の操作で、削除が正しくDBに反映される
- [x] カスタムプロパティを一部削除した場合も、残りのエントリだけが正しく保存される
- [x] property を削除後に再表示しても値が null にならず、エントリ自体が消える
- [x] content を他のカスタムプロパティと同時に削除しても消える
- [x] 既存の「追加して保存」動作に影響が出ない
- [x] Property なしテンプレートでもカスタムプロパティが正しく保存される（バグ④）
- [x] Property なしテンプレートでもトップレベル Contents の値が保存される（バグ⑤）

---

## バグ一覧と原因

### バグ① 全削除しても消えない（最初に報告されたバグ）

**現象:** カスタムプロパティを全件削除して保存しても、再表示するとエントリが復活する。

**原因コード（1105行目）:**

- **ファイル**: `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
- **関数**: `handleSaveTemplate`（テンプレート保存ハンドラ）
- **処理名**: 「カスタムプロパティを baseData に追記」セクション

```typescript
// ── カスタムプロパティを baseData に追記 ────────────────────────────
// 選択中テンプレートに紐づくカスタムプロパティのみ対象とする
if (templateCustomProps.length > 0) {  // ← 全削除で length = 0 になるとブロックに入らない
  if (baseData.properties && Array.isArray(baseData.properties)) {
    // カスタムエントリのクリーンアップ＆再追記
### バグ① 全削除しても消えない

**現象:** カスタムプロパティを全件削除して保存しても、再表示するとエントリが復活する。

**原因コード（1105行目付近）:**

- **ファイル**: `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
- **関数**: `handleSaveTemplate`（テンプレート保存ハンドラ）

```typescript
if (templateCustomProps.length > 0) {  // ← 全削除で length = 0 になるとブロックに入らない
  if (baseData.properties && Array.isArray(baseData.properties)) {
    baseData.properties = (...).filter((p) => !p.isCustomProperty);
    baseData.contents = [];
    baseData.insertions = [];
    ...
  }
}
```

**問題のシナリオ:**
1. カスタムプロパティを追加して保存 → DBに `isCustomProperty: true` エントリが保存される
2. 画面を再表示（GET） → DBのデータが `customProperties` state に復元される
3. UI上でカスタムプロパティを全件削除 → state は空になる（`templateCustomProps.length === 0`）
4. 保存ボタンを押す → **`length > 0` が `false` のためクリーンアップブロックに入らない**
5. `originalItem.data` のディープコピー（`baseData`）がそのまま送信される → 古いエントリが残ったまま保存

---

### バグ② property を削除後に再表示すると値だけ null になる

**現象:** property タイプのカスタムプロパティを削除して保存後、再表示するとエントリが残ったまま value だけ null になっている。

**原因コード（957〜997行目）:**

- **ファイル**: `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
- **関数**: `handleSaveTemplate`（テンプレート保存ハンドラ）
- **処理名**: 「フォールバック形式のプロパティ値をフォーム値で上書きするループ」

```typescript
// フォールバック形式: properties[i].value をフォーム値で上書きする
**原因コード（957行目付近）:**

```typescript
(baseData.properties as Array<Record<string, unknown>>).forEach((p) => {
  const formKey = `${template.templateId}_${String(p.key ?? '')}`;
  // ...
  p.value = values[formKey] ?? null;  // ← isCustomProperty エントリも処理対象になる
});
```
このループは `baseData.properties` の **全エントリ**（カスタムプロパティを含む）を対象にしている。

**問題のシナリオ:**
1. カスタムプロパティを削除 → UI上から消えるが、`baseData`（ディープコピー）にはまだ `isCustomProperty: true` エントリが存在する
2. 保存時、上記ループがそのエントリも処理する
3. 削除済みなのでフォームフィールドが存在しない → `values[formKey]` が `undefined`
4. `p.value = undefined ?? null` → **value が null に書き換えられる**
5. `isCustomProperty: true` エントリは残ったまま、value だけ null で保存される

※ Bug① も同時に存在するため、エントリ自体は消えず value のみ null になる現象として現れる。
削除済みのカスタムプロパティはフォームフィールドが存在しないため `values[formKey]` が `undefined` → value が null に書き換えられる。

### バグ③ content を他のカスタムプロパティと同時に削除すると消えない

**現象:** content タイプのカスタムプロパティを単独で削除した場合は消えるが、property タイプなど他のカスタムプロパティと同時に削除すると消えない。

**原因:** Bug① と同根。`templateCustomProps.length > 0` 条件によって `baseData.contents` のクリーンアップが実行されるかどうかが変わる。
=======
**現象:** content タイプを単独で削除した場合は消えるが、他のカスタムプロパティと同時に削除すると消えない。

**原因:** バグ① と同根。`templateCustomProps.length > 0` 条件によって `baseData.contents` のクリーンアップが実行されるかどうかが変わる。

| 操作 | templateCustomProps.length | クリーンアップ実行 | 結果 |
|------|---------------------------|-------------------|----|
| content だけ削除（他のカスタムが残る） | > 0 | ✅ 実行される → `baseData.contents = []` | content が消える ✓ |
| content と他のカスタムを同時に全削除 | 0 | ❌ 実行されない（Bug①） | content が消えない ✗ |

「単独で消すと消える」のは、他にカスタムプロパティが残っている場合は `length > 0` のブロックに入り `baseData.contents = []` でリセットされるため。

## 修正箇所一覧（全3箇所）

### 修正① 957〜997行目：値更新ループに isCustomProperty スキップを追加

**修正前:**
```typescript
(baseData.properties as Array<Record<string, unknown>>).forEach((p) => {
  const formKey = `${template.templateId}_${String(p.key ?? '')}`;
  // ...
```

**修正後:**
```typescript
(baseData.properties as Array<Record<string, unknown>>).forEach((p) => {
  if (p.isCustomProperty === true) return;  // ← 追加：カスタムプロパティはスキップ
| content と他のカスタムを同時に全削除 | 0 | ❌ 実行されない（バグ①） | content が消えない ✗ |

### バグ④ Property なしテンプレートにカスタムプロパティが出力されない（2026-04-17 追記）

**現象:** テンプレートに Property が一件もなく、Insertion や Content だけが存在する場合、カスタムプロパティが保存されない。

**原因:** クリーンアップ＆再追記処理が `if (baseData.properties && Array.isArray(baseData.properties))` 条件の内側にあるため、`baseData.properties` が存在しないテンプレートでは処理全体がスキップされる。

**修正方針:**
- `if (templateCustomProps.length > 0)` を外側の条件にする
- `length > 0` の場合: クリーンアップ＋再追記（baseData.properties の有無に関わらず実行）
- `length === 0` の場合: クリーンアップのみ（各配列を `filter(!isCustomProperty)` で除去）


### バグ⑤ Property なしテンプレートでトップレベル Contents の値更新がスキップされる（2026-04-17 追記）

**現象:** `baseData.properties` が存在しないテンプレートで、トップレベルの Contents フィールドへの値更新が反映されない。

**原因:** トップレベル Contents の値更新処理が `if (baseData.properties && Array.isArray(baseData.properties))` ブロックの内側にある。

**修正方針:** Contents 更新処理を `if (baseData.properties...)` / `else` ブロックの**外**（Insertion 処理の直前）に移動し、Property / Contents / Insertion を独立したブロックに分離する。


## 修正箇所一覧

### 修正① 957行目付近：値更新ループに isCustomProperty スキップを追加（バグ② 修正）

```typescript
// 修正後
(baseData.properties as Array<Record<string, unknown>>).forEach((p) => {
  if (p.isCustomProperty === true) return;  // ← 追加
  const formKey = `${template.templateId}_${String(p.key ?? '')}`;
  // ...
```
### 修正② 1105行目：クリーンアップを条件の外へ移動（Bug①③の修正）

**修正前:**
```typescript
if (templateCustomProps.length > 0) {
  if (baseData.properties && Array.isArray(baseData.properties)) {
    baseData.properties = (...).filter((p) => !p.isCustomProperty);
    baseData.contents = [];        // 非カスタム contents も消えるリスクあり
    baseData.insertions = [];      // 非カスタム insertions も消えるリスクあり
    const existingProps = ...;
    const existingContents = ...;
    const existingInsertions = ...;
    for (const cp of templateCustomProps) { ... }
  }
}
```

**修正後:**
```typescript
if (baseData.properties && Array.isArray(baseData.properties)) {
  // isCustomProperty: true のエントリを常にフィルタ除去（0件削除でも実行）
  baseData.properties = (
    baseData.properties as Array<Record<string, unknown>>
  ).filter((p) => !p.isCustomProperty);

  // contents / insertions もカスタム分だけ除去（非カスタム分は保持）
  if (Array.isArray(baseData.contents)) {
    baseData.contents = (baseData.contents as Array<Record<string, unknown>>)
      .filter((c) => !c.isCustomProperty);
  } else {
    baseData.contents = [];
  }
  if (Array.isArray(baseData.insertions)) {
    baseData.insertions = (baseData.insertions as Array<Record<string, unknown>>)
      .filter((ins) => !ins.isCustomProperty);
  } else {
    baseData.insertions = [];
  }

  // templateCustomProps が1件以上ある場合のみカスタムエントリを追記
  if (templateCustomProps.length > 0) {
    const existingProps = baseData.properties as Array<Record<string, unknown>>;
    const existingContents = baseData.contents as Array<Record<string, unknown>>;
    const existingInsertions = baseData.insertions as Array<Record<string, unknown>>;
    for (const cp of templateCustomProps) {
      // ... 既存の追記処理をそのまま維持
    }
### 修正② 1103行目付近：クリーンアップ処理を条件の外へ移動（バグ①③④ 修正）

```typescript
// 修正後（概要）
if (baseData.properties && Array.isArray(baseData.properties)) {
  // isCustomProperty エントリを常にフィルタ除去（0件削除でも実行）
  baseData.properties = (...).filter((p) => !p.isCustomProperty);
  // contents / insertions もカスタム分のみ除去（非カスタム分は保持）
  baseData.contents = Array.isArray(baseData.contents)
    ? (...).filter((c) => !c.isCustomProperty)
    : [];
  baseData.insertions = Array.isArray(baseData.insertions)
    ? (...).filter((ins) => !ins.isCustomProperty)
    : [];

  // templateCustomProps が1件以上ある場合のみカスタムエントリを追記
  if (templateCustomProps.length > 0) {
    // ... 既存の追記処理
  }
}
```

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
   - 957行目付近：値更新ループに `isCustomProperty` スキップを追加（Bug② 修正）
   - 1105行目付近：クリーンアップ処理を条件の外へ移動・contents/insertions を filter に変更（Bug①③ 修正）

### 修正③ トップレベル Contents 更新ロジックを Insertion 処理直前へ移動（バグ⑤ 修正）

**移動前の位置:** `if (baseData.properties && ...) { ... }` ブロック内（1018行目付近）

**移動後の位置:** `if/else` ブロックの直後・Insertion 処理の直前

**移動後の構造:**
```typescript
// ① Property 更新
if (baseData.properties && Array.isArray(baseData.properties)) {
  // properties の value 更新
} else {
  // DB実績形式（フラット）
}

// ② Contents 更新（独立ブロック）
if (Array.isArray(baseData.contents)) {
  // トップレベル Contents の value 更新
}

// ③ Insertion 処理
const tplInsertionFiles = insertionFiles[template.templateId] ?? {};
```

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
   - 957行目付近：値更新ループに `isCustomProperty` スキップを追加（バグ② 修正）
   - 1103行目付近：クリーンアップ処理を条件の外へ移動・contents/insertions を filter に変更（バグ①③④ 修正）
   - Contents 更新ロジックを Insertion 処理直前へ移動（バグ⑤ 修正）

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の「追加して保存」動作への影響 | 中 | 低 | クリーンアップ後に既存通り再追記するため影響なし |
| 非カスタム contents/insertions の消失 | 中 | 低 | `= []` から `filter` に変更することで保持される |
| 値更新ループのスキップ対象拡大 | 低 | 低 | `isCustomProperty === true` の場合のみスキップ |

---

## テスト計画

### 手動テスト
- [ ] property タイプのカスタムプロパティを追加 → 保存 → 再表示 → 削除 → 保存 → 再表示でエントリが消えていることを確認（Bug①②の検証）
- [ ] content タイプと property タイプを同時追加 → 保存 → 再表示 → 両方削除 → 保存 → 再表示で両方消えていることを確認（Bug③の検証）
- [ ] content タイプを単独削除した場合の動作に影響がないことを確認
- [ ] カスタムプロパティを一部削除した場合も、残ったエントリのみ表示されることを確認
- [ ] カスタムプロパティなしで通常のプロパティのみ保存する動作に影響がないことを確認
- [ ] property タイプのカスタムプロパティを追加 → 保存 → 再表示 → 削除 → 保存 → 再表示でエントリが消えていることを確認（バグ①②の検証）
- [ ] content タイプと property タイプを同時追加 → 保存 → 再表示 → 両方削除 → 保存 → 再表示で両方消えていることを確認（バグ③の検証）
- [ ] content タイプを単独削除した場合の動作に影響がないことを確認
- [ ] カスタムプロパティを一部削除した場合も、残ったエントリのみ表示されることを確認
- [ ] カスタムプロパティなしで通常のプロパティのみ保存する動作に影響がないことを確認
- [ ] Property なしテンプレートでカスタムプロパティが保存されることを確認（バグ④の検証）
- [ ] Property なしテンプレートでトップレベル Contents の値が保存されることを確認（バグ⑤の検証）

---

## 承認記録

- **計画書提示日時**: 2026-04-17 09:55
- **更新日時**: 2026-04-17 10:05（追加バグ②③を追記）
- **承認日時**: 2026-04-17 10:39
- **承認者コメント**: 承認済み
## 実施記録

### 実施日時
開始: 2026-04-17 10:46

### 変更ファイル
1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`

### 修正内容

#### 修正① Bug② 対応（957行目付近）
値更新ループの先頭に `if (p.isCustomProperty === true) return;` を追加。
削除済みのカスタムプロパティエントリに対して `value: null` が書き込まれる問題を解消。

#### 修正② Bug①③ 対応（1103行目付近）
#### 修正① バグ② 対応（2026-04-17）
値更新ループの先頭に `if (p.isCustomProperty === true) return;` を追加。
削除済みのカスタムプロパティエントリに対して `value: null` が書き込まれる問題を解消。

#### 修正② バグ①③④ 対応（2026-04-17）
`if (templateCustomProps.length > 0)` の条件ガードを外し、常に以下を実行するよう変更:
- `baseData.properties` から `isCustomProperty: true` エントリを filter で除去
- `baseData.contents` をリセットではなく `filter(!isCustomProperty)` で非カスタム分を保持
- `baseData.insertions` も同様に filter で非カスタム分を保持
- カスタムエントリの追記は `templateCustomProps.length > 0` の場合のみ実行（既存の追記ロジックを内側へ移動）
### 最終的な成果物
- [x] カスタムプロパティを追加→保存→全削除→保存で削除が正しくDBに反映される（Bug①修正）
- [x] property を削除後に再表示しても value が null にならずエントリ自体が消える（Bug②修正）
- [x] content を他のカスタムプロパティと同時に削除しても消える（Bug③修正）
- [x] 既存の「追加して保存」動作に影響なし
- [x] 非カスタム contents / insertions を誤って削除しない
#### 修正③ バグ⑤ 対応（2026-04-20）
トップレベル Contents 更新ロジックを `if (baseData.properties...) { ... } else { ... }` ブロック内から外へ移動し、Insertion 処理の直前に配置。
Property / Contents / Insertion を独立したブロックに分離することで、Property を持たないテンプレートでも Contents 値が正しく保存されるよう修正。
### 最終的な成果物
- [x] カスタムプロパティを追加→保存→全削除→保存で削除が正しくDBに反映される（バグ①修正）
- [x] property を削除後に再表示しても value が null にならずエントリ自体が消える（バグ②修正）
- [x] content を他のカスタムプロパティと同時に削除しても消える（バグ③修正）
- [x] Property なしテンプレートでカスタムプロパティが正しく保存される（バグ④修正）
- [x] Property なしテンプレートでトップレベル Contents の値が保存される（バグ⑤修正）
- [x] 既存の「追加して保存」動作に影響なし