# タスク計画書: 実験指示一覧見切れ修正 & Prefix追加時警告スコープ名修正

## メタデータ
- **作成日時**: 2026-09-14 11:00
- **タスクID**: 20260914_1100
- **優先度**: 高
- **推定工数**: 2時間

---

## 1. タスク概要

### 問題①: [実験管理者 - 実験指示] 一覧の下部が見切れる

`ExperimentInstructionTab.tsx` のテーブル縦スクロール高さ指定が  
`scroll={{ y: 'calc(100vh - 360px)' }}` となっているが、実際のUI構造の占有高さに対して  
差し引き値（360px）が小さすぎるため、最下行が画面下部で見切れる。

比較：`EvaluationRegistrationTab.tsx` では `calc(100vh - 420px)` を使用。  
実験指示タブは「ツールバー行」「フィルタバー行」が多いため、さらに大きい値が必要。

**修正方針**: `calc(100vh - 360px)` → `calc(100vh - 450px)` に変更する。  
（根拠: ナビゲーション64px + サブヘッダー56px + プロジェクトリスト上部56px + タブバー44px  
　+ ツールバー行40px + フィルタバー行46px + テーブルヘッダー等 = 約450px）

---

### 問題②: [用語管理] 上位層のprefix:用語を追加しようとした際のエラーメッセージ内容がおかしい

#### 事象
- ユーザー004（個人スコープ）でprefix「Uncertainty」の用語を追加しようとすると  
  エラーメッセージに「グループ001」ではなく誤ったスコープ名が表示される場合がある。
- 「ただしくは『結合テスト グループ001で既に登録されています』」と期待されているが、  
  「ユーザ004で既に登録されています」などと表示される（スコープが逆転している）。

#### 根本原因 (フロントエンド側)
`PrefixManagement.tsx` の `handleSave`（351-415行）における上位層重複の警告チェックロジック：

```typescript
const firstDuplicate = newRows
  .map((newRow) => {
    const existing = rows.find(
      (r) => r.prefix.toLowerCase() === newRow.prefix.toLowerCase()
    );
    return existing ? { prefix: newRow.prefix, scopeName: existing.scopePath ?? existing.prefix } : null;
  })
  .find((d) => d !== null);
```

`rows` には `withAncestors=true` で取得した**上位層を含む全prefix**が入っている。  
`rows.find()` が **prefix 文字列のみ**で一致を検索しているため、  
**現在のスコープ（登録先）と同じ scopeKey を持つ行**もヒットしてしまう。

現在のスコープに同名prefixが既に存在する場合は、`executeSave()` でバックエンドが  
`E6005` を返すため警告ダイアログを出す必要はない。  
警告ダイアログが必要なのは「**現在のスコープ以外（上位層）**に同名prefixが存在する場合」のみ。

#### 根本原因 (バックエンド側) ← 既存タスク 20260914_0900 で実装済み
`findPrefixNamespaceId.sql` のJOINを `prefix.scope_key` → `namespace.scope_key` に修正済み。

#### 修正方針（フロントエンド）
`handleSave` 内の重複検索で**現在の登録先スコープキーと異なる行のみ**を警告対象とする。

現在の登録先スコープキー（`currentScopeKey`）を取得し、  
`rows.find()` に `r.scopeKey !== currentScopeKey` を追加する。

```typescript
// 修正後イメージ
const rawScopeKey = scopeKey ?? selectedNsKey ?? undefined;
const currentScopeKey = rawScopeKey?.replace(/^personal-/, '') ?? null;

const firstDuplicate = newRows
  .map((newRow) => {
    const existing = rows.find(
      (r) =>
        r.prefix.toLowerCase() === newRow.prefix.toLowerCase() &&
        r.scopeKey !== currentScopeKey  // ← 現スコープは除外
    );
    return existing
      ? { prefix: newRow.prefix, scopeName: existing.scopePath ?? existing.prefix }
      : null;
  })
  .find((d) => d !== null);
```

---

## 2. 変更ファイル一覧

| # | ファイル | 変更種別 | 内容 |
|---|---------|---------|------|
| 1 | `frontend/src/components/project/ExperimentInstructionTab.tsx` | **修正** | `scroll={{ y: 'calc(100vh - 360px)' }}` → `'calc(100vh - 450px)'` に変更 |
| 2 | `frontend/src/components/namespace/PrefixManagement.tsx` | **修正** | `handleSave` の重複チェックに `r.scopeKey !== currentScopeKey` 条件を追加 |
| 3 | `frontend/src/components/project/__tests__/ExperimentInstructionTab.unit.test.ts` | **修正** | scroll プロパティの期待値を更新 |
| 4 | `frontend/src/components/namespace/__tests__/PrefixManagement.unit.test.ts` | **修正・追加** | 重複チェックロジックのテストケースを追加 |

---

## 3. 実装ステップ

- [x] Step 1: `ExperimentInstructionTab.tsx` の scroll 値を修正（`-360px` → `-450px`）
- [x] Step 2: `PrefixManagement.tsx` の `handleSave` 重複チェックに `currentScopeKey` 除外条件を追加
- [x] Step 3: フロントエンドビルド確認（対象2ファイルにTSエラーなし確認済み）
- [x] Step 4: `ExperimentInstructionTab.unit.test.ts` 新規作成・実行確認（4件 PASS）
- [x] Step 5: `PrefixManagement.unit.test.ts` テストケース追加・実行確認（22件 PASS）

---

## 4. 影響範囲

| 項目 | 影響 |
|------|------|
| 実験管理者メニュー / プロジェクト管理 / 実験指示タブ | テーブルの縦スクロール高さが修正される（UI改善のみ、機能変更なし） |
| 名前空間管理 / Prefix追加ダイアログ | 上位層重複警告の表示条件が正しくなる（同スコープ重複時には警告ダイアログが出なくなる） |
| バックエンドAPI | 変更なし |
| 既存テスト | scroll 期待値・重複チェックテストケースの更新が必要 |

---

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `-450px` でもまだ見切れる / または余白が大きすぎる | 低 | 低 | 他タブ（EvaluationRegistrationTab: `-420px`）との整合性を確認。FilterBarの高さを精査して調整 |
| `currentScopeKey` が null の場合に意図しない警告が抑制される | 低 | 低 | `r.scopeKey !== null` の場合のみ除外条件を適用する（null scopeKey のグローバルprefixには影響なし） |

---

## 6. テスト計画

### 単体テスト
- [ ] `ExperimentInstructionTab.unit.test.ts`: scroll の y 値が `calc(100vh - 450px)` であることを確認
- [ ] `PrefixManagement.unit.test.ts`: 上位層のみに同名prefixがある場合→警告ダイアログ表示
- [ ] `PrefixManagement.unit.test.ts`: 現在のスコープに同名prefixがある場合→警告ダイアログを出さない（executeSaveを呼ぶ）

### 手動確認
- [ ] 実験指示タブで最下行まで正しくスクロールできることを確認
- [ ] Prefix追加時、上位層に同名prefixがある場合に「～上位層「○○」に既に登録されています」と正しいスコープ名で表示されることを確認

---

## 7. 承認記録
- **計画書提示日時**: 2026-09-14 11:00
- **承認日時**: （承認後に記入）
- **承認者コメント**: 
