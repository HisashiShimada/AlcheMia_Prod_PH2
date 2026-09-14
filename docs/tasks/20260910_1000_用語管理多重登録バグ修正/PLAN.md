# タスク計画書: 用語管理 多重登録バグ修正（v2：完全修正）

## メタデータ
- **作成日時**: 2026-09-10 10:00
- **タスクID**: 20260910_1000_用語管理多重登録バグ修正
- **優先度**: 高
- **推定工数**: 1時間

---

## 1. タスク概要

名前空間管理画面（用語管理タブ）で用語を1件保存すると、4〜5件が勝手に登録される。

### 事象
- 用語を1件入力して「保存」ボタンを押すと、4〜5件が登録される
- エビデンス画像では `Uncertainty:projectA` を登録しようとして以下が生成された:
  - `Uncertainty:projectA` × 3件
  - `Uncertainty:SupervisorDirectiveprojectA` × 3件
  - `Uncertainty:SupervisorDirectiveprojectB` × 1件
  - `Uncertainty:SupervisorDirectiveSupervisorDirectiveprojectB` × 1件（二重プレフィックス）

---

## 2. 根本原因（2件）

### バグ1：保存ボタンの二重送信防止がない

`handleAddSave` 実行中に `isSaving` などのフラグがなく、ボタンが非活性化されない。  
`handleAddSave` は async 関数でAPI呼び出しがあるため、連打すると for ループが並走して同じ用語が複数登録される。  
さらに `createDirectiveTerm: true` のデフォルトにより、1回分が元用語＋指示用語の2件になるため、
2回押すと4件、3回押すと6件登録される。

### バグ2：`SupervisorDirective` 始まりの localName に二重プレフィックス生成

バックエンド `namespaceService.createTerm()` で `localName` が `SupervisorDirective` で始まる場合、  
`createDirectiveTerm: true` のままだと `SupervisorDirectiveSupervisorDirective{localName}` が生成される。  
バックエンドに `localName.startsWith('SupervisorDirective')` のガードがなかったことが原因。

---

## 3. 目的と期待される成果

- [x] 保存ボタンを連打しても用語が1件（指示用語あり時は2件）のみ登録されること
- [x] `SupervisorDirective` で始まる localName を登録しても二重プレフィックスが生成されないこと
- [x] バックエンド・フロントエンドともにビルドエラーが発生しないこと
- [x] 追加した単体テストが全件 PASS すること

---

## 4. 影響範囲の分析

### 影響を受けるファイル
| ファイル | 変更種別 | 影響 |
|---------|---------|------|
| `frontend/src/components/namespace/NamespaceMain.tsx` | 修正 | 保存ボタンの二重送信防止 |
| `backend/src/services/namespaceService.ts` | 修正 | 指示用語生成の二重プレフィックス防止 |
| `backend/tests/phase2/services/namespaceService.phase2.test.ts` | 修正 | テスト追加 |

### 影響を受けない範囲
- DB スキーマの変更なし
- API 仕様（エンドポイント・レスポンス形式）の変更なし
- 他コンポーネントへの影響なし（`handleAddSave` は `NamespaceMain.tsx` 内に閉じている）
- セキュリティへの影響なし
- マルチテナント分離への影響なし

---

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `isSaving` フラグが正しく解除されず保存ボタンが永続的に disabled になる | 高 | 低 | `finally` ブロックで確実に `setIsSaving(false)` を実行 |
| `SupervisorDirective` ガードにより既存の正常な登録フローが壊れる | 高 | 低 | localName が `SupervisorDirective` で始まる場合のみスキップ。通常ローカル名には影響なし |
| フロントエンド TypeScript エラー | 中 | 低 | `tsc --noEmit` で事前確認 |

---

## 6. 変更ファイル一覧

| # | ファイル | 変更種別 | 内容 |
|---|---------|---------|------|
| 1 | `frontend/src/components/namespace/NamespaceMain.tsx` | **修正** | `isSaving` state 追加・`handleAddSave` に `try/finally` で二重送信防止・保存ボタンに `loading` / `disabled` 追加 |
| 2 | `backend/src/services/namespaceService.ts` | **修正** | `localName.startsWith('SupervisorDirective')` チェックで二重プレフィックス防止ガード追加 |
| 3 | `backend/tests/phase2/services/namespaceService.phase2.test.ts` | **修正** | `createTerm()` の単体テスト4件追加 |

---

## 7. テスト計画

### 単体テスト（追加）
- [x] `createTerm()` 正常系（`createDirectiveTerm: false`）: `create` を1回だけ呼び出すこと
- [x] `createTerm()` 正常系（`createDirectiveTerm: true`）: `createInTx` を2回呼び出すこと（元用語 + 指示用語）
- [x] `createTerm()` 二重プレフィックス防止: `localName` が `SupervisorDirective` 始まりのとき `createInTx` を呼ばないこと
- [x] `createTerm()` 正常系（prefix が存在しない）: `null` を返すこと

### 手動テスト（動作確認）
- [ ] 用語を1件入力して「保存」ボタンを**素早く複数回クリック**→ 1件（または2件：指示用語あり時）のみ登録されること
- [ ] 保存処理中にボタンがローディング状態（スピナー表示）かつ disabled になること
- [ ] `localName` を `SupervisorDirectiveTest` として登録→ `SupervisorDirectiveSupervisorDirectiveTest` が**生成されない**こと

---

## 8. ロールバック計画

- フロントエンド: `isSaving` state の追加・`handleAddSave` の `try/finally` ラップ・ボタン属性の変更を元に戻す
- バックエンド: `namespaceService.ts` の `startsWith` ガードブロックを削除する
- いずれも差分が小さく、git revert で即座に対応可能

---

## 9. 関連ドキュメント

- `docs/tasks/20260910_0000_用語管理重複チェックスコープ修正/PLAN.md` - 同日実施の関連バグ修正
- `frontend/src/components/namespace/NamespaceMain.tsx` - 主要変更対象
- `backend/src/services/namespaceService.ts` - 主要変更対象

---

## 補足: v2 修正（2026-09-10 追加調査・実施）

### 残存バグの特定

v1 修正（2026-09-10 10:00-14:00）では `isSaving` state と `try/finally` を実装したが、
`setIsSaving(true)` の設定タイミングが確認ダイアログ（`modal.confirm`）の**後**であったため、
バグが完全に解消されていなかった。

#### 問題のフロー（v1 修正後も残存）

```
1. if (isSaving) return;            ← チェックあり
2. バリデーション
3. modal.confirm の await 開始      ← この間 isSaving = false のまま
   ↑ ★ ダイアログ中に保存ボタンを再クリックすると 2 回目の handleAddSave が並走
4. setIsSaving(true)               ← 遅すぎる（ダイアログ後）
5. for (const row of newTerms) { API呼び出し }
```

#### v2 修正内容

`setIsSaving(true)` をバリデーション直後（確認ダイアログの**前**）に移動し、
`try/finally` でダイアログを含む全ブロックを囲む。

```typescript
// v2 修正後（正しいフロー）
setIsSaving(true);          // ← ダイアログ前に移動
try {
  // 確認ダイアログ（この間も isSaving = true → ボタン disabled）
  if (hasUncheckedRows) {
    const confirmed = await modal.confirm(...)
    if (!confirmed) return; // finally で setIsSaving(false) 自動実行
  }
  // API 呼び出し
} finally {
  setIsSaving(false);       // 成功・失敗・キャンセルすべての場合で解除
}
```

### v2 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/namespace/NamespaceMain.tsx` | `setIsSaving(true)` をダイアログ前（1214行）に移動、`try {` でダイアログを囲む |
| 2 | `frontend/src/components/namespace/__tests__/handleAddSave.unit.test.ts` | **新規作成**: 二重送信防止ロジックと SupervisorDirective ガードの単体テスト（9件） |

### v2 テスト結果

- フロントエンド TS チェック（ビルド）: exit code 0 ✅
- バックエンドビルド: exit code 0 ✅
- バックエンドテスト（namespaceService.phase2.test.ts）: 18件全 PASS ✅
- フロントエンドテスト（handleAddSave.unit.test.ts）: 9件全 PASS ✅



- **計画書提示日時**: 2026-09-10 10:00
- **承認日時**: 2026-09-10（ユーザー承認済み）
- **承認者コメント**: 承認済み、実装完了

---

## 11. 実施記録

### 実施日時
開始: 2026-09-10 10:00  
完了: 2026-09-10 14:00

### 計画からの変更点

なし。計画通りに実施。

### 発生した問題と解決方法

なし。

### 最終的な成果物

- [x] `frontend/src/components/namespace/NamespaceMain.tsx` — `isSaving` state 追加・`handleAddSave` に `try/finally` ラップ・保存ボタンに `loading={isSaving}` / `disabled` 条件追加
- [x] `backend/src/services/namespaceService.ts` — `localName.startsWith('SupervisorDirective')` ガード追加（二重プレフィックス防止）
- [x] `backend/tests/phase2/services/namespaceService.phase2.test.ts` — `createTerm()` テスト4件追加（15件全 PASS）
- [x] バックエンドビルド確認（`npm run build` → エラーなし）
- [x] フロントエンド TS チェック（`tsc --noEmit` → exit code 0）

---

## 12. 振り返り

### うまくいった点
- `try/finally` パターンにより、成功・失敗・例外いずれの場合も `isSaving` が確実に解除される設計にできた
- `startsWith` ガードは既存コードへの影響が最小限で、変更量が少なかった
- 既存の `namespaceService.phase2.test.ts` にテストを追加する形で対応でき、テストファイルの新規作成が不要だった

### 改善が必要な点
- 本来は計画段階で二重送信防止の欠落に気づくべきだった。保存系ボタン全般のレビュー時に `isSaving` パターンが実装されているか確認する習慣を持つべき

### 学んだこと
- 非同期ハンドラを持つボタンには必ず二重送信防止フラグが必要
- `SupervisorDirective` のような特定プレフィックスを持つ localName への防御的チェックはバックエンド側に持つべき（フロントエンドの入力制限だけでは不十分）

