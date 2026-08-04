# タスク計画書: LanguageContext ビルドエラー修正

## メタデータ
- **作成日時**: 2026-07-29 13:00
- **タスクID**: language-context-build-error-fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`frontend/src/contexts/LanguageContext.tsx` のビルドで発生している TypeScript エラー（TS2739）を修正する。

根本原因は `en.json` に `ja.json` と比較して不足しているトップレベルキーが存在するためであり、TypeScript が `typeof jaTranslations` を型として `en.json` を検査した際に型不整合が発生している。

また調査の副次的成果として、両言語ファイルにトップレベルキーの重複定義が多数存在することも確認した（JSON.parse により後方定義で上書きされる問題）。本タスクでは重複問題は調査・記録のみとし、別タスクで対応する。

---

## エラー詳細

```
src/contexts/LanguageContext.tsx(20,3): error TS2739: 
Type '{ ... }' is missing the following properties from type '{ ... }': 
"experimentEvaluationService", "projectManagementExtra"
```

### 原因
`LanguageContext.tsx` で以下のように型を定義している：

```typescript
type Translations = typeof jaTranslations;  // ja.json の型を基準に
const translations: Record<Locale, Translations> = {
  ja: jaTranslations,
  en: enTranslations,  // ← en.json が Translations 型を満たさない
};
```

`ja.json` にあって `en.json` に存在しないキーが原因で型エラーが発生。

---

## 目的と期待される成果

- [ ] TypeScript ビルドエラー（TS2739）を解消する
- [ ] `en.json` に不足している2つのトップレベルキーを英訳して追加する
- [ ] 重複トップレベルキーの調査結果をドキュメント化する（別タスク用）

---

## 実装ステップ

### Phase 1: ビルドエラー解消（本タスク）

#### Step 1: en.json に不足キーを追加
以下の2キーを英訳して `en.json` の適切な位置（末尾 `templateEditorHardcoded` の直前）に追加する。

**追加するキー 1: `experimentEvaluationService`**

ja.json の定義（参考）:
```json
"experimentEvaluationService": {
  "noEvaluationData": "評価データがないため書き込みをスキップしました",
  "projectNotFound": "プロジェクトが見つかりません",
  "maimlNotFound": "MAiMLファイルが見つかりません",
  "writtenCount": "{{count}}件の評価データを MAiML ファイルに書き込みました"
}
```

英訳後:
```json
"experimentEvaluationService": {
  "noEvaluationData": "No evaluation data found. Write skipped.",
  "projectNotFound": "Project not found",
  "maimlNotFound": "MAiML file not found",
  "writtenCount": "{{count}} evaluation record(s) written to MAiML file"
}
```

**追加するキー 2: `projectManagementExtra`**

ja.json の定義（参考）:
```json
"projectManagementExtra": {
  "completionButtonTooltip": "全タスクが「完了」になると押下できます",
  "completionButton": "プロジェクト完了処理",
  "encryptionButton": "暗号化管理",
  "signatureButton": "電子署名",
  "projectInstructionTab": "プロジェクト指示",
  "evaluationRegistrationTab": "評価登録確認"
}
```

英訳後:
```json
"projectManagementExtra": {
  "completionButtonTooltip": "Available when all tasks are marked as \"Completed\"",
  "completionButton": "Project Completion",
  "encryptionButton": "Encryption Management",
  "signatureButton": "Digital Signature",
  "projectInstructionTab": "Project Instructions",
  "evaluationRegistrationTab": "Evaluation Registration Confirmation"
}
```

#### Step 2: ビルドエラー確認

```bash
cd frontend && npx tsc --noEmit -p tsconfig.json
```

エラーが解消されていることを確認する。

---

### Phase 2: 重複トップレベルキー調査（記録のみ・別タスク）

調査済みの重複キー情報をドキュメント化して別タスクに引き継ぐ。

**ja.json 重複キー（1件）:**
| キー | 行 |
|------|-----|
| `uncertaintyCriteriaSelector` | 3608, 3951 |

**en.json 重複キー（12件・18箇所）:**
| キー | 行 |
|------|-----|
| `projectCompletion` | 3228, 4082 |
| `approvalWizard` | 3252, 4029, 4291 |
| `createProject` | 3264, 3465, 4050 |
| `templateEditor` | 3269, 4007, 4274 |
| `workRecord` | 3293, 3976, 4209, 4424 |
| `templateInputPanel` | 3308, 3521, 4020 |
| `uncertaintyManagement` | 3329, 3578, 4181 |
| `uncertaintyCreate` | 3344, 3736, 4091, 4323 |
| `uncertaintyDetail` | 3369, 3758, 4113, 4345 |
| `uncertaintyCriteriaSelector` | 3404, 3667, 4166, 4411 |
| `experimentInstruction` | 3421, 4194 |
| `uncertaintyListTable` | 3646, 3797, 4152, 4305 |

---

## 影響範囲

### 変更するファイル
1. `frontend/src/locales/en.json` — 不足している2トップレベルキーを追加

### 新規作成するファイル
1. `docs/tasks/20260729_1300_LanguageContext_ビルドエラー修正/PLAN.md` — 本ファイル
2. `scripts/check-duplicate-top-keys.js` — 重複キーチェックバッチ（既に作成済み）

### 影響を受ける機能
- フロントエンドビルド全体（現在エラーで失敗中）
- `experimentEvaluationService` を使用するコンポーネント（英語環境での表示）
- `projectManagementExtra` を使用するコンポーネント（英語環境での表示）

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 英訳の不正確さ | 低 | 中 | コンポーネントの使用箇所を参照して文脈を確認 |
| 重複キーによる別の隠れたビルドエラー | 中 | 低 | TS2739 は今回の2キーのみのため影響なし |

---

## テスト計画

- [ ] `npx tsc --noEmit` でビルドエラーが解消されることを確認
- [ ] `node scripts/check-i18n-keys.js` で JA_ONLY / EN_ONLY の件数変化を確認

---

## 承認記録
- **計画書提示日時**: 2026-07-29 13:00

