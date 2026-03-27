# タスク計画書: Positionタグ書き込み対応

## メタデータ
- **作成日時**: 2026-03-25 13:31
- **タスクID**: position-tag-write
- **優先度**: 高
- **推定工数**: 3〜4時間
- **参照調査レポート**: `docs/改善仕様調査/No.6/README.md`

---

## 1. タスク概要

MAIML編集画面（editorv2）でノードの座標情報（position）を保存・読み込みできるようにする。

現状、MAIMLファイルを保存するとノード座標が失われ、再読み込み時に毎回 `calculateSimpleLayout()` で自動レイアウトがリセットされてしまう。

デプロイ済みWebアプリ（reference）の出力形式に合わせて、place/transition 直下に `<position x="..." y="..." />` を書き込む形式を実装する。

---

## 2. 目的と期待される成果

### 目的
- ユーザーが手動で調整したノードの配置を、MAIMLファイルに保存して永続化する
- 保存・再読み込みサイクルでレイアウトがリセットされる問題を解消する

### 期待される成果
- [ ] MAIMLファイル保存時に `<position x="..." y="..." />` が place/transition 直下に出力される（単一Method・複数Method両対応）
- [ ] MAIMLファイル読み込み時に `<position>` が存在すればその座標を使用する
- [ ] `<position>` がない旧形式のファイルは従来どおり自動レイアウトにフォールバックする

---

## 3. 実装ステップ

### Phase 1: 型定義の追加

- [ ] `frontend/src/types/maiml-unified.ts` の `Place` インターフェースに `position?: { x: number; y: number }` フィールドを追加
- [ ] `frontend/src/types/maiml-unified.ts` の `Transition` インターフェースに `position?: { x: number; y: number }` フィールドを追加

### Phase 2: 読み込み側の修正（maimlParserTyped.ts）

- [ ] `frontend/src/utils/maimlParserTyped.ts` の `getPlaces()` メソッドで `<position>` 要素を読み込む
  - `placeEl.querySelector('position')` で要素を取得
  - `getAttribute('x')` / `getAttribute('y')` で座標値を取得し `Number()` で変換
  - `Place` オブジェクトに `position` フィールドを追加して返却
- [ ] `frontend/src/utils/maimlParserTyped.ts` の `getTransitions()` メソッドで同様に `<position>` を読み込む

### Phase 3: レイアウト計算の修正（reactFlowConverter.ts）

- [ ] `frontend/src/utils/reactFlowConverter.ts` の `convertToReactFlowFormat()` 内で、place/transition の `position` フィールドを優先使用するよう修正
  - Place: `place.position` があればそれを使用、なければ `nodePositions.get(place.id) || { x: 0, y: 0 }` にフォールバック
  - Transition: `transition.position` があればそれを使用、なければ `nodePositions.get(transition.id) || { x: 0, y: 0 }` にフォールバック

### Phase 4: 書き出し側の修正（単一Method: reactFlowToMaiml.ts）

- [ ] `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` の `convertReactFlowToMaiML()` 内の Place 出力部分に `<position>` を追加
  - `place.position` が存在する場合、`<name>` より前に出力する
  - 形式: `<position x="${Math.round(place.position.x)}" y="${Math.round(place.position.y)}" />`
- [ ] 同ファイルの Transition 出力部分に `<position>` を追加
  - `transition.position` が存在する場合、`<name>` より前に出力する

### Phase 5: 書き出し側の修正（複数Method: multiMethodConverter.ts）

- [ ] `frontend/src/components/editorv2/utils/converters/multiMethodConverter.ts` の `buildMethodXML()` 内の Place 出力部分に `<position>` を追加
  - `place.position` が存在する場合に出力
- [ ] 同関数の Transition 出力部分に `<position>` を追加
  - `transition.position` が存在する場合に出力

---

## 4. 影響範囲

### 変更するファイル

| # | ファイル | 修正内容 |
|---|---------|---------|
| 1 | `frontend/src/types/maiml-unified.ts` | `Place` / `Transition` に `position?` フィールドを追加 |
| 2 | `frontend/src/utils/maimlParserTyped.ts` | `getPlaces()` / `getTransitions()` で `<position>` を読み込む |
| 3 | `frontend/src/utils/reactFlowConverter.ts` | Placeノード・Transitionノードの座標に `position` フィールドを優先使用 |
| 4 | `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` | Place / Transition XML出力に `<position>` を追加（単一Method） |
| 5 | `frontend/src/components/editorv2/utils/converters/multiMethodConverter.ts` | Place / Transition XML出力に `<position>` を追加（複数Method） |

### 新規作成するファイル
なし

### 影響を受ける機能
- MAIML編集画面（editorv2）のノード配置保存・復元
- MAIML保存・ダウンロード機能（単一Method / 複数Method）
- MAIML読み込み時のレイアウト計算

---

## 5. 技術的詳細

### 出力形式

デプロイ済みWebアプリに合わせた形式（`<graphics>` ラッパーなし）：

```xml
<place id="material-1774222191859">
  <position x="408" y="158" />
  <name>サンプル材料</name>
</place>

<transition id="transition-001">
  <position x="600" y="200" />
  <name>測定</name>
</transition>
```

※ `position` は `name` / `description` の前に配置する（調査レポートの形式に準拠）

### maimlParserTyped.ts の修正箇所

`getPlaces()` メソッド内で各 `<place>` 要素をパースする際に：

```typescript
const positionEl = placeEl.querySelector('position');
const position = positionEl ? {
  x: Number(positionEl.getAttribute('x') || 0),
  y: Number(positionEl.getAttribute('y') || 0)
} : undefined;

return {
  id: placeEl.getAttribute('id') || '',
  name: ...,
  description: ...,
  position,  // 追加
};
```

`getTransitions()` も同様。

### reactFlowConverter.ts の修正箇所

```typescript
// Place のノード化
const position = place.position
  ? { x: place.position.x, y: place.position.y }
  : nodePositions.get(place.id) || { x: 0, y: 0 };

// Transition のノード化
const position = transition.position
  ? { x: transition.position.x, y: transition.position.y }
  : nodePositions.get(transition.id) || { x: 0, y: 0 };
```

### reactFlowToMaiml.ts の修正箇所（単一Method）

Place 出力ブロック（現行の `place.id` 出力の直後、`name` 出力の前）：

```typescript
maiml += `        <place id="${escapeXml(place.id)}">\n`;
// ↓ 追加
if (place.position) {
  maiml += `          <position x="${Math.round(place.position.x)}" y="${Math.round(place.position.y)}" />\n`;
}
// ↑ 追加
if (hasValidName) {
  maiml += `          <name>...</name>\n`;
}
```

Transition も同様。

### multiMethodConverter.ts の修正箇所（複数Method）

`buildMethodXML()` 内の Place 出力ブロック：

```typescript
// description あり・なしの両パターンに position を追加する
methodXml += `        <place id="${place.id}">\n`;
// ↓ 追加
if (place.position) {
  methodXml += `          <position x="${Math.round(place.position.x)}" y="${Math.round(place.position.y)}" />\n`;
}
// ↑ 追加
if (hasDescription) {
  methodXml += `          <description>...</description>\n`;
}
methodXml += `        </place>\n`;
```

Transition も同様。

---

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `maimlParserTyped.ts` の `getPlaces()` でDOM構造が想定と異なる | 中 | 低 | 実ファイルで動作確認、`querySelector` 失敗時は `position: undefined` にフォールバック |
| 既存テストが `Place` / `Transition` 型に依存している場合のコンパイルエラー | 低 | 低 | 型追加はオプショナル（`?`）なので既存コードへの影響はなし |
| 複数Methodのplace出力で `place.position` が undefined になるケース | 中 | 中 | `if (place.position)` ガードで安全に無視する |

---

## 7. テスト計画

### 手動テスト（優先）

- [ ] editorv2 でノードを手動配置 → 保存 → ダウンロードしたMAIMLファイルに `<position x y />` が含まれることを確認
- [ ] 上記ファイルを再読み込みしたとき、ノードが保存した位置に表示されることを確認
- [ ] `<position>` タグのない旧MAIMLファイルを読み込んだとき、自動レイアウトが動作することを確認
- [ ] 複数Method（マルチメソッド）ファイルでも同様の動作をすることを確認

### 既存テストの確認

- [ ] `maimlParserTyped.ts` に関するテストファイルがある場合、`position` フィールドが追加されても通ることを確認
- [ ] `reactFlowConverter.ts` に関するテストファイルがある場合、フォールバック動作が変わらないことを確認

---

## 8. 実装時の注意点

1. **`<position>` の配置順序**: MAIML仕様では place/transition の子要素は `name` → `description` の順だが、`test.maiml` では `<position>` が先頭に来ている。調査レポートの `buildPlaceXML` 実装に合わせて `name` の前に出力する。

2. **`Math.round()`**: 座標値は整数に丸める（reference の `buildPlaceXML` に合わせる）。

3. **オプション**: 座標がない場合（`position` が `undefined`）は `<position>` タグを出力しない。無条件で出力すると `x="NaN"` などが発生する可能性があるため。

4. **`maiml-unified.ts` の `Place` / `Transition` 型への追加は `optional`（`?`）とする**: 既存コード全体への影響を最小化する。

---

## 9. 関連ドキュメント

- [調査レポート](./README.md) - Positionタグ調査レポート（本タスクのベース）
- `frontend/src/types/maiml-unified.ts` - Place / Transition 型定義
- `frontend/src/utils/maimlParserTyped.ts` - MAIMLパーサー
- `frontend/src/utils/reactFlowConverter.ts` - React Flow形式変換
- `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` - 単一Method書き出し
- `frontend/src/components/editorv2/utils/converters/multiMethodConverter.ts` - 複数Method書き出し

---

## 10. 承認記録

- **計画書提示日時**: 2026-03-25 13:31
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）
