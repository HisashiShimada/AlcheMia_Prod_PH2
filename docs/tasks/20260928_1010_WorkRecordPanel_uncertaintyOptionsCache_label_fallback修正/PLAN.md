# タスク計画書: WorkRecordPanel uncertaintyOptionsCache label フォールバック修正

## メタデータ

- **作成日時**: 2026-09-28 10:10
- **タスクID**: 20260928_1010
- **優先度**: 高
- **推定工数**: 0.1時間

---

## 1. タスク概要

`WorkRecordPanel.tsx` の `uncertaintyOptionsCache` 構築時に、
`c.name` のみを `label` に設定しているため、
名称（name）が未設定の不確かさ基準をプルダウンで選択すると表示が空文字になる不具合を修正する。

661行目のプリセット行ラベル表示側では `qInfo?.uncertaintyName || av.uncertaintyKey` という
name → key フォールバックが実装されているが、
追加行の Select 選択肢 (`uncertaintyOptionsCache`) 側には同等のフォールバックがない。

---

## 2. 根本原因

**場所:** L2639〜2642

```tsx
// 現在（問題あり）
uncertaintyOptionsCache = result.map((c) => ({
  value: c.key,
  label: c.name,   // ← c.name が null/undefined/空文字の場合、label が空文字になる
}));
```

`c.name` が未設定の場合、Select の表示ラベルが空文字になる。  
661行目のプリセット行と同様に `c.name || c.key` のフォールバックが必要。

---

## 3. 修正方針

`label` を `c.name || c.key` に変更する。

```tsx
// 修正後
uncertaintyOptionsCache = result.map((c) => ({
  value: c.key,
  label: c.name || c.key,   // name 未設定時は key をフォールバック表示
}));
```

---

## 4. 実装ステップ

- [x] タスク専用フォルダ作成・PLAN.md 作成
- [x] L2641 の `label: c.name` を `label: c.name || c.key` に修正
- [x] 修正後のコードを確認・TypeScript ビルドエラーなし

---

## 5. 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | L2641: `label: c.name` → `label: c.name \|\| c.key` |

---

## 6. 影響範囲

- **修正スコープ**: フロントエンド 1 ファイル、1 行のみ
- **既存機能への影響**: name が設定されている不確かさ基準の表示は変わらない

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| name・key 両方未設定 | 低 | 低 | key は必須フィールドのため発生しない |

---

## 8. テスト計画

### 手動テスト
- [ ] 名称（name）が未設定の不確かさ基準をプルダウンで選択したとき、key が表示されることを確認
- [ ] 名称（name）が設定されている不確かさ基準は引き続き name が表示されることを確認

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-28 10:10
- **承認日時**: 2026-09-28 10:10（ユーザー指示により計画書作成後即実装）
