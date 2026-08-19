# タスク計画書: NamespaceMain グローバルノード表示修正・MAIML 名前空間注入修正

## メタデータ

- **作成日時**: 2026-08-13 14:00
- **タスクID**: 20260813_1400
- **優先度**: 高
- **推定工数**: 半日
- **関連タスク**: 20260813_1000_グローバル名前空間ファイルサーバ管理化

---

## 1. タスク概要

前タスク（20260813_1000）でグローバル名前空間管理をファイルサーバに移行した結果、
以下 2 点の齟齬が発生していることを確認した。本タスクでその修正を行う。

### 背景

**問題1: NamespaceMain でグローバルノード選択時の右ペインが空になる**

実験管理者メニューの「名前空間管理」画面（NamespaceMain）で左ペインの
Global ノード（`global` / `ns-maiml` / `ns-xsi`）を選択すると、右ペインの
Prefix 一覧・用語一覧が空になる。

原因：グローバル名前空間は DB 管理をやめてファイルサーバに移行したが、
NamespaceMain は依然 DB から取得した `maiml`/`xsi` prefix に一致する用語を
フィルタして表示しようとしているため。

**問題2: MAIML 新規作成時（フロントエンド）にグローバル名前空間が注入されない**

`XMLViewerWrapper.tsx`（XML プレビュー）と `maimlApiService.ts` の `saveMaiml`（保存時）が
`getOrganizationNamespaces()` を使ってフロント側で名前空間注入しているが、
この関数はファイルサーバのグローバル宣言を取得していない。

---

## 2. 目的と期待される成果

- [ ] NamespaceMain でグローバルノードを選択したとき、右ペインに
  ProviderMenu と同等のグローバル名前空間一覧（`GlobalNamespaceView`）が表示される
- [ ] グローバルノード選択時の一覧はインポート/エクスポートボタンが無効（`viewOnly`）
- [ ] MAIML 新規作成の XML プレビューにグローバル名前空間宣言が含まれる
- [ ] MAIML 保存前の注入にもグローバル名前空間宣言が含まれる
- [ ] ハードコードされた `xmlns="http://www.maiml.org/schemas"` と衝突しない

---

## 3. 技術的詳細

### ハードコード xmlns との衝突関係

`reactFlowToMaiml.ts` / `multiMethodConverter.ts` は `<maiml>` タグを以下のように生成する：

```xml
<maiml version="1.0"
  xmlns="http://www.maiml.org/schemas"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.maiml.org/schemas maiml.xsd">
```

`namespaceInjector.ts` の動作：
- `PROTECTED_PREFIXES = ['xsi', 'xenc', 'xs', 'xsd', 'xlink']` → 保護されて除去されない
- `xmlns=""` (prefix なし) → **除去される**（DB の内容で上書き）
- その他のカスタム prefix → 除去されて注入内容で置き換わる

### 衝突回避ルール（`getOrganizationNamespaces` 内で適用）

ファイルサーバのグローバル宣言を `injectNamespacesToMaiml` に渡す前に
以下のフィルタ/変換を適用する：

| 条件 | 処理 |
|------|------|
| prefix が `xsi` / `xenc` / `xs` / `xsd` / `xlink` | **除外**（PROTECTED_PREFIXES と重複するため） |
| prefix が `maiml` かつ uri が `http://www.maiml.org/schemas` | prefix を `''`（空文字）に変換 → `xmlns="http://www.maiml.org/schemas"` として出力 |
| それ以外 | そのまま使用 |

こうすることで `injectNamespacesToMaiml` が：
1. ハードコードの `xmlns=""` を除去
2. ファイルサーバ由来の `xmlns="http://www.maiml.org/schemas"` を再注入
3. ファイルサーバ由来のカスタム prefix を追加注入
4. `xmlns:xsi` はハードコードのまま保護されて残る

---

## 4. 実装ステップ（詳細チェックリスト）

### 修正1: GlobalNamespaceView に viewOnly prop を追加

**`frontend/src/types/namespace.ts`**

- [ ] `GlobalNamespaceViewProps` に `viewOnly?: boolean` を追加

**`frontend/src/components/namespace/GlobalNamespaceView.tsx`**

- [ ] Props に `viewOnly?: boolean` を追加（デフォルト `false`）
- [ ] `viewOnly` が `true` のとき「📥 インポート」ボタンを `disabled`
- [ ] `viewOnly` が `true` のとき「📤 エクスポート」ボタンを `disabled`
- [ ] `viewOnly` が `true` のときファイル input もクリック不可（`disabled` 相当の制御）

### 修正2: NamespaceMain でグローバルノード選択時に GlobalNamespaceView を表示

**`frontend/src/components/namespace/NamespaceMain.tsx`**

- [ ] `GlobalNamespaceView` を dynamic import で追加
- [ ] `isGlobalNodeSelected` を `useMemo` で導出
  - `effectiveNsKey`（`externalSelectedNsKey` または `selectedNsKey`）が
    `'global'`, `'ns-maiml'`, `'ns-xsi'` のいずれかのとき `true`
- [ ] 右ペイン（Prefix 一覧・用語テーブルが表示されるエリア）の条件分岐を追加
  - `isGlobalNodeSelected === true` のとき → `<GlobalNamespaceView viewOnly={true} />`
  - それ以外 → 既存の Prefix 一覧・用語テーブルをそのまま表示

### 修正3: getOrganizationNamespaces にグローバル宣言をマージ

**`frontend/src/services/namespaceApiService.ts`**

- [ ] `getOrganizationNamespaces()` 内で `getGlobalDeclarations()` を並列呼び出し
- [ ] 衝突回避ルールを適用してグローバル宣言をフィルタ/変換：
  - `['xsi', 'xenc', 'xs', 'xsd', 'xlink']` に該当する prefix は除外
  - `prefix === 'maiml' && uri === 'http://www.maiml.org/schemas'` → `prefix = ''` に変換
- [ ] 変換後のグローバル宣言を組織 URI と合わせて返す
  - 順序: グローバル宣言 → 組織 URI（後勝ちで組織固有が優先されるよう）

---

## 5. 変更ファイル一覧

| # | ファイル | 種別 | 変更内容 |
|---|---------|------|---------|
| 1 | `frontend/src/types/namespace.ts` | 修正 | `GlobalNamespaceViewProps` に `viewOnly?: boolean` 追加 |
| 2 | `frontend/src/components/namespace/GlobalNamespaceView.tsx` | 修正 | `viewOnly` prop 追加・インポート/エクスポートボタンの disabled 制御 |
| 3 | `frontend/src/components/namespace/NamespaceMain.tsx` | 修正 | グローバルノード選択時に右ペインを `GlobalNamespaceView viewOnly` に切り替え |
| 4 | `frontend/src/services/namespaceApiService.ts` | 修正 | `getOrganizationNamespaces()` にグローバル宣言のマージと衝突回避ロジックを追加 |

---

## 6. 影響範囲の分析

### NamespaceMain への影響
- グローバルノード以外の選択時（company / personal / チームノード）は変更なし
- グローバルノード選択時のみ右ペインが切り替わる

### XMLViewerWrapper / maimlApiService への影響
- `getOrganizationNamespaces()` の戻り値が変わるため、
  XML プレビュー・保存前注入の両方にグローバル宣言が自動的に含まれるようになる
- 呼び出し側コード（XMLViewerWrapper.tsx / maimlApiService.ts）は変更不要

### バックエンドへの影響
- なし（フロントエンドのみの修正）

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ファイルサーバにグローバル宣言未登録時に注入内容が変わる | 低 | 中 | `readGlobalDeclarations()` がファイル不在時に空配列を返すため既存動作と同じ |
| `maiml` prefix の変換ロジックが他の URI と混同する | 中 | 低 | URI を `http://www.maiml.org/schemas` と完全一致で判定する |
| PROTECTED_PREFIXES 以外に衝突する prefix が将来追加される | 低 | 低 | ファイルサーバへのインポート時に運用ルールで対処 |
| NamespaceMain の右ペイン切り替えで既存 state が残留する | 低 | 低 | グローバルノード選択時はフェッチをトリガーしないため副作用なし |

---

## 8. テスト計画

### 手動テスト

- [ ] NamespaceMain でグローバルノード（`Global`）を選択 → 右ペインに prefix + URI 一覧が表示される
- [ ] NamespaceMain でグローバルノード選択時 → インポート・エクスポートボタンが disabled
- [ ] NamespaceMain でグローバルノード以外（チームノード等）を選択 → 右ペインは従来どおり
- [ ] MAIML プレビュー（XMLViewerWrapper）でグローバル名前空間が `<maiml>` タグに含まれる
- [ ] MAIML 保存時にグローバル名前空間が `<maiml>` タグに含まれる
- [ ] `xmlns="http://www.maiml.org/schemas"` が正しく出力される（`xmlns:maiml` ではない）
- [ ] `xmlns:xsi` が二重にならず 1 件のみ出力される

---

## 9. 承認記録

- **計画書提示日時**: 2026-08-13 14:00
- **承認日時**: 2026-08-13 14:00
- **承認者コメント**: 実装は新しいタスクで実行する
