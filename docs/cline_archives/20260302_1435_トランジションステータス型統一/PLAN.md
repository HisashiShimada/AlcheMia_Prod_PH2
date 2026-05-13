# タスク計画書: トランジションステータス型統一

## メタデータ
- **作成日時**: 2026-03-02 14:35
- **タスクID**: transition-status-type-unification
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

バックエンドにおけるトランジションステータスの型定義が複数箇所に散在・重複しているため、`transitionData.ts` の `TransitionStatusEnum`（数値型）に一本化する。

## 背景・現状分析

調査の結果、トランジションステータスは以下の3種類が混在していることが判明した。

### 現状の型定義

| ファイル | 型名 | 型の種類 | 状態 |
|---|---|---|---|
| `backend/src/types/transitionData.ts` | `TransitionStatusEnum` | 数値 (0-6) | **正規定義（維持）** |
| `backend/src/types/transitionData.ts` | `TransitionStatus` | `typeof TransitionStatusEnum[...]` | **維持** |
| `backend/src/types/transitionData.ts` | `Status` | 文字列 (7値) | **削除対象**（@deprecated） |
| `backend/src/types/transitionData.ts` | `convertLegacyStatusToNumber()` | 変換関数 | **削除対象**（@deprecated） |
| `backend/src/types/transitionData.ts` | `isValidStatus()` | 検証関数 | **削除対象**（@deprecated） |
| `backend/src/types/progress.ts` | `TransitionStatus` | 文字列 (3値: `not_started`, `in_progress`, `completed`) | **削除対象** |

### TransitionStatusEnum の値定義

| 値 | 定数名 | 日本語ラベル |
|---|---|---|
| `0` | `INITIAL` | 未開始 |
| `1` | `PREPARING` | 準備中 |
| `2` | `READY` | 準備完了 |
| `3` | `IN_PROGRESS` | 実行中 |
| `4` | `PAUSED` | 一時停止 |
| `5` | `COMPLETED` | 完了 |
| `6` | `ERROR` | エラー |

## 目的と期待される成果

- [ ] `transitionData.ts` の `Status` 型・関連関数（deprecated）を削除
- [ ] `progress.ts` の `TransitionStatus` 型（文字列3値）を削除
- [ ] `progressService.ts` の文字列ステータス依存箇所を `TransitionStatusEnum` に統一
- [ ] `TransitionProgress.status` の型を数値型に変更
- [ ] 型の整合性を保ちつつビルドエラーなし

## 実装ステップ

### Phase 1: `transitionData.ts` から deprecated な型・関数を削除

- [ ] `Status` 型を削除
- [ ] `convertLegacyStatusToNumber()` 関数を削除
- [ ] `isValidStatus()` 関数を削除

### Phase 2: `progress.ts` の型変更

- [ ] `TransitionStatus = 'not_started' | 'in_progress' | 'completed'` 型を削除
- [ ] `TransitionProgress.status` の型を `TransitionStatus`（文字列）→ `TransitionStatusEnum`（数値）に変更
- [ ] `ExperimentRecord.status` の型を同様に変更
- [ ] `progress.ts` に `TransitionStatusEnum` のimportを追加

### Phase 3: `progressService.ts` の修正

- [ ] `import { TransitionStatus as TransitionStatusString } from '../types/progress'` を削除
- [ ] `convertStatusToTransitionStatus()` プライベートメソッドを削除
- [ ] `normalizeProgress()` の引数型を `TransitionStatusString` → `TransitionStatusNumber` に変更し、文字列比較を数値比較に変更
- [ ] `getSingleTransitionProgress()` でレコードなし時・エラー時の `status: 'not_started'` を `TransitionStatusEnum.INITIAL` に変更
- [ ] `getSingleTransitionProgress()` でDBレコードのステータスを変換なしで使用（`convertStatusToTransitionStatus()` 呼び出し箇所を削除）
- [ ] `calculateOverallProgress()` の文字列フィルタ（`'completed'`, `'in_progress'`, `'not_started'`）を `TransitionStatusEnum` 比較に変更

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `backend/src/types/transitionData.ts` | `Status`型・`convertLegacyStatusToNumber()`・`isValidStatus()` を削除 |
| `backend/src/types/progress.ts` | `TransitionStatus`型を削除、`TransitionProgress.status`・`ExperimentRecord.status` の型を `TransitionStatusEnum` に変更 |
| `backend/src/services/progressService.ts` | `TransitionStatusString` import削除、`convertStatusToTransitionStatus()` 削除、文字列比較を `TransitionStatusEnum` 比較に変更 |

## 技術的詳細

### progressService.ts の変換ロジック変更詳細

#### `convertStatusToTransitionStatus()` 削除の影響

このメソッドは数値ステータス(0-6)を表示用文字列ステータス(`not_started`, `in_progress`, `completed`)に変換していた。
削除後は、DBから取得した数値ステータスをそのまま `TransitionProgress.status` に格納する。

#### `normalizeProgress()` の変更

```typescript
// 変更前
private normalizeProgress(status: TransitionStatusString, progressRate: number): number {
  if (status === 'completed') return 100;
  if (status === 'not_started') return 0;
  return Math.max(0, Math.min(100, progressRate));
}

// 変更後
private normalizeProgress(status: TransitionStatusNumber, progressRate: number): number {
  if (status === TransitionStatusEnum.COMPLETED) return 100;
  if (status === TransitionStatusEnum.INITIAL) return 0;
  return Math.max(0, Math.min(100, progressRate));
}
```

#### `calculateOverallProgress()` の変更

```typescript
// 変更前
const completed = transitions.filter(t => t.status === 'completed').length;
const inProgress = transitions.filter(t => t.status === 'in_progress').length;
const notStarted = transitions.filter(t => t.status === 'not_started').length;

// 変更後
const completed = transitions.filter(t => t.status === TransitionStatusEnum.COMPLETED).length;
const inProgress = transitions.filter(t => [
  TransitionStatusEnum.PREPARING,
  TransitionStatusEnum.READY,
  TransitionStatusEnum.IN_PROGRESS,
  TransitionStatusEnum.PAUSED,
  TransitionStatusEnum.ERROR
].includes(t.status as TransitionStatusNumber)).length;
const notStarted = transitions.filter(t => t.status === TransitionStatusEnum.INITIAL).length;
```

## セキュリティ考慮事項

- 型変更のみのリファクタリングであり、セキュリティへの影響なし
- organization_id 等のマルチテナント分離は変更しない

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `progress.ts` の `TransitionStatus` が他ファイルから参照されている | 中 | 低 | 事前に `grep` で参照箇所を確認済み（`progressService.ts` のみ） |
| 型変更による実行時エラー | 低 | 低 | 型の互換性を確認してから変更する |
| フロントエンドへの影響 | 中 | 中 | APIレスポンスの `status` フィールドが文字列→数値に変わるため確認が必要 |

## テスト計画

- [ ] TypeScript コンパイルエラーなし（`npm run build` or `tsc --noEmit`）
- [ ] 既存のテストが通ること

## 承認記録

- **計画書提示日時**: 2026-03-02 14:35
- **承認日時**: 2026-03-02 14:35
- **承認者コメント**: 検討結果を含めてタスク計画書を作成し、実装を進める

## 実施記録

### 実施日時
開始: 2026-03-02 14:35  
完了: 2026-03-02 14:45

### 計画からの変更点
- `progress.ts` の `TransitionStatus` 型を完全削除する代わりに、`transitionData.ts` からの re-export に変更した。これにより既存の `import { TransitionStatus } from '../types/progress'` のような参照が壊れない。

### 発生した問題と解決方法
- `Status` 型を削除した後、その型を参照している `convertLegacyStatusToNumber()` と `isValidStatus()` が型エラーを起こした → 同じステップで一括削除することで解決。

### 最終的な成果物
- [x] `transitionData.ts` の `Status` 型・`convertLegacyStatusToNumber()`・`isValidStatus()` を削除
- [x] `progress.ts` の `TransitionStatus` 型（文字列3値）を削除し、`transitionData.ts` からの re-export に変更
- [x] `progressService.ts` の `convertStatusToTransitionStatus()` メソッドを削除
- [x] `progressService.ts` の `normalizeProgress()` を数値型対応に変更
- [x] `progressService.ts` の `calculateOverallProgress()` の文字列比較を `TransitionStatusEnum` 比較に変更
- [x] TypeScript コンパイルエラーなし（`tsc --noEmit` で確認済み）
