# タスク計画書: Prefix管理 CSVエクスポートボタン制御修正

## メタデータ
- **作成日時**: 2026-09-29 18:00
- **タスクID**: 20260929_1800
- **優先度**: 中
- **推定工数**: 15分

---

## 1. タスク概要

実験管理者メニュー > 名前空間管理タブ > Prefix管理 において、  
**Prefix が1件も登録されていないスコープを選択した状態で「CSVエクスポート」ボタンが活性になっている**問題を修正する。

Prefix が0件のスコープでは、チェックボックスで選択できる行が存在しないため、  
エクスポートボタンを活性にしても実際には `selectedRowKeys.length === 0` によりエラーメッセージが出るだけでありUX上不適切。

---

## 2. 調査結果と根本原因

### 2.1 現状のコード（PrefixManagement.tsx 977行目）

```tsx
<Button onClick={handleCsvDownload}>{t('prefixManagement.btnExport')}</Button>
```

`disabled` 条件が**一切存在しない** → Prefix が0件でも常に活性。

### 2.2 handleCsvDownload の実装

```tsx
const handleCsvDownload = () => {
  if (selectedRowKeys.length === 0) {
    message.error(t('prefixManagement.exportSelectAtLeastOne'));
    return;
  }
  // ... CSVダウンロード処理 ...
};
```

クリックしても `selectedRowKeys.length === 0` でエラーメッセージを出して終了するだけ。  
→ Prefix が0件の場合はボタンを非活性にする（クリック自体を防ぐ）ことが適切。

### 2.3 原因の図解

```
【現状（バグあり）】

Prefix 0件のスコープを選択
  │
  ├── CSVエクスポートボタン
  │     disabled 条件なし → 常に活性  ← 問題
  │     ↓ クリックすると...
  │     selectedRowKeys.length === 0 → エラーメッセージ表示
  │     （エクスポートすべきデータがないのに活性 → UX不良）
  │
  └── prefix追加ボタン
        disabled={viewOnly}（今回は対象外）


【修正後】

Prefix 0件のスコープを選択
  │
  ├── CSVエクスポートボタン
  │     disabled={rows.length === 0} → 非活性 ✓
  │     （エクスポートすべきデータがないため非活性が正しい）
  │
  └── prefix追加ボタン
        disabled={viewOnly}（変更なし）
```

---

## 3. 修正ファイル一覧

| # | ファイル | 種別 | 修正内容 |
|---|---------|------|---------| 
| 1 | `frontend/src/components/namespace/PrefixManagement.tsx` | 修正 | CSVエクスポートボタンに `disabled={rows.length === 0}` を追加 |

---

## 4. 修正前/修正後 機能フロー

### 修正前フロー

```
スコープ選択（Prefix 0件）
  ↓
rows = []
  ↓
CSVエクスポートボタン: disabled なし → 活性（クリック可能）
  ↓ クリック
selectedRowKeys.length === 0 → エラーメッセージ「1件以上チェックしてください」表示
（ユーザーにとって活性なのにエラーになる不自然な体験が発生）
```

### 修正後フロー

```
スコープ選択（Prefix 0件）
  ↓
rows = []
  ↓
CSVエクスポートボタン: disabled={rows.length === 0} → 非活性（クリック不可）
（Prefix がないスコープではエクスポートできないことが一目でわかる）

スコープ選択（Prefix 1件以上）
  ↓
rows.length > 0
  ↓
CSVエクスポートボタン: disabled={false} → 活性（クリック可能・従来通り）
  ↓ チェックなしでクリック
selectedRowKeys.length === 0 → エラーメッセージ表示（従来通り）
```

---

## 5. 実装ステップ

- [ ] Step 1: `PrefixManagement.tsx` の CSVエクスポートボタンに `disabled={rows.length === 0}` を追加
- [ ] Step 2: フロントエンド TypeScript ビルドエラーなし確認

---

## 6. リスク

| リスク | 対策 |
|--------|------|
| `rows` が空でも `newRows` に未保存行がある場合の考慮 | `newRows` はCSVエクスポートの対象外（既存の `handleCsvDownload` は `rows` のみ対象）なので影響なし |

---

## 7. テスト計画

- [ ] Prefix が1件以上あるスコープ選択 → CSVエクスポートボタンが活性
- [ ] Prefix が0件のスコープ選択 → CSVエクスポートボタンが非活性
- [ ] Prefix が1件以上あるスコープで行をチェックせずCSVエクスポートをクリック → エラーメッセージ表示（従来動作を維持）
- [ ] フロントエンド TypeScript ビルドエラーなし

---

## 8. 承認記録
- **計画書提示日時**: 2026-09-29 18:00
- **承認日時**: 2026-09-29 (Act モードへの切り替えにより承認済み)

---

## 9. 実施記録

### 実施日時
開始: 2026-09-29 18:35  
完了: 2026-09-29 18:40

### 変更内容

**`frontend/src/components/namespace/PrefixManagement.tsx`（977行目）**

修正前:
```tsx
<Button onClick={handleCsvDownload}>{t('prefixManagement.btnExport')}</Button>
```

修正後:
```tsx
<Button disabled={rows.length === 0} onClick={handleCsvDownload}>{t('prefixManagement.btnExport')}</Button>
```

### 確認結果
- [x] Step 1: PrefixManagement.tsx の CSVエクスポートボタンに `disabled={rows.length === 0}` を追加
- [x] Step 2: フロントエンド TypeScript ビルドエラーなし（exit code 0）
