# タスク計画書: is_entry=0 なのにユーザーごとで二段階認証が変わるバグ修正

## メタデータ
- **作成日時**: 2026-04-23 15:00
- **タスクID**: is_entry二段階認証バグ修正
- **優先度**: 高
- **推定工数**: 15分

## タスク概要

`organization.is_entry = 0` の組織なのに、ユーザーごとで二段階認証（PIN入力）が求められたり求められなかったりするバグを修正する。

## 根本原因

`backend/src/services/pinExemptionService.ts` の `isExemptionApplicable()` メソッドにおいて、`is_entry=false` の免除判定に `emailEnabled` 条件が誤って追加されている。

### 問題のコード（修正前）

```typescript
const emailEnabled =
  process.env.NODE_ENV === 'production' ||
  process.env.EMAIL_ENABLED === 'true';

// is_entry=false でも emailEnabled=true なら免除ブロックをスキップしてしまう
if (!isEntry && !emailEnabled) {
  return { success: true, data: { isExempt: true, ... } };
}
```

### バグの発生メカニズム

本番環境 or `EMAIL_ENABLED=true` の場合に `emailEnabled = true` となるため、
`is_entry=false` でも `!isEntry && !emailEnabled` が `false` になり、
免除ブロックをスルーして `TWO_FACTOR_AUTH_EXEMPTION_DAYS` による判定に落ちる。

| 状況 | 結果（修正前） |
|------|--------------|
| `is_entry=false` + 開発環境 | 免除（2FAなし） ✅ |
| `is_entry=false` + 本番/EMAIL_ENABLED=true + 免除期間内ユーザー | 免除 ✅（偶然正しい） |
| `is_entry=false` + 本番/EMAIL_ENABLED=true + 初回/期限切れユーザー | **2FA必要** ❌ バグ |

### 本来の設計意図

`is_entry` は組織単位の「二段階認証要否」フラグであり、`emailEnabled` の状態に関わらず組織設定を優先すべき。

## 目的と期待される成果

- [x] 根本原因の特定
- [ ] `is_entry=false` の組織では全ユーザーが常に2FAなしでログインできる
- [ ] 修正ファイル: `backend/src/services/pinExemptionService.ts` のみ

## 実装ステップ

- [x] Phase 1: 調査・根本原因の特定
- [x] Phase 2: タスク計画書作成
- [x] Phase 3: `pinExemptionService.ts` の修正（`!emailEnabled` 条件の除去）

## 変更ファイル

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `backend/src/services/pinExemptionService.ts` | 修正 | `is_entry=false` 判定から `emailEnabled` 条件を除去 |

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `is_entry=true` の組織への影響 | なし | `is_entry=false` ブロックのみ変更のため影響なし |
| `emailEnabled` 変数の削除による影響 | なし | 変数自体は免除期間判定では使用していない |

## 承認記録
- **計画書提示日時**: 2026-04-23 15:00
- **承認日時**: 2026-04-23 15:28
- **承認者コメント**: タスク計画書作成と実装を依頼

## 実施記録

### 実施日時
開始: 2026-04-23 15:28
完了: （作業完了後に記入）

### 最終的な成果物
- [ ] backend/src/services/pinExemptionService.ts 修正完了
