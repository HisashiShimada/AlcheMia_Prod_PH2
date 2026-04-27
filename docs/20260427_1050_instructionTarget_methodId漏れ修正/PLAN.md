# タスク計画書: instructionTarget=1（メソッド指示）考慮漏れ修正

## メタデータ
- **作成日時**: 2026-04-27 11:23
- **タスクID**: instructionTarget_methodId_fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

instruction_target の定義が以下の新定義に変更されたにも関わらず、バックエンド処理で旧定義のまま残っている箇所があるバグを修正する。

### instruction_target 新定義
| 値 | 意味 |
|----|------|
| 0 | ファイル全体 |
| 1 | メソッド指示 |
| 2 | トランジション |
| 3 | タスク |

## 目的と期待される成果

- [ ] メソッド指示（instructionTarget=1）がイベントログに正しく記録される
- [ ] NULL時のデフォルト値が正しい値（0=ファイル全体）になる
- [ ] programId 取得条件にメソッド指示（target=1）が含まれる

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] docs/20260427_1050_instructionTarget_methodId漏れ修正/PLAN.md 作成

### Phase 2: バックエンド修正

- [ ] `backend/src/repositories/eventLogRepository.ts`
  - `buildEventLogJson` に instructionTarget=1 分岐追加
  - `buildInstructionSentLogJson` に instructionTarget=1 分岐追加
  - コメントを新定義（0=ファイル全体, 1=メソッド, 2=トランジション, 3=タスク）に更新

- [ ] `backend/src/services/projectInstructionService.ts`
  - `sendInstructions` の `instruction.instruction_target ?? 1` → `?? 0` に修正

- [ ] `backend/src/services/projectService.ts`
  - 指示確認処理の `instruction.instruction_target ?? 1` → `?? 0` に修正
  - programId 取得条件: `(instructionTarget === 2 || instructionTarget === 3)` → `(instructionTarget === 1 || instructionTarget === 2 || instructionTarget === 3)` に修正

## 変更ファイル
1. `backend/src/repositories/eventLogRepository.ts` - buildEventLogJson/buildInstructionSentLogJson 修正
2. `backend/src/services/projectInstructionService.ts` - デフォルト値修正
3. `backend/src/services/projectService.ts` - デフォルト値・programId条件修正

## リスク
| リスク | 対策 |
|--------|------|
| 既存のイベントログレコードに影響 | 新規INSERT処理のみ変更のため既存データへの影響なし |
| instructionTarget=1 のログ構造の仕様不明確 | 2/3 と同様に log/@ref=methodId を設定する仕様で実装 |

## 承認記録
- **承認日時**: 2026-04-27 11:23
