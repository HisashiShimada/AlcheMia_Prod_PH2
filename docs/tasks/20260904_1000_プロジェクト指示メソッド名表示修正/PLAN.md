# タスク計画書: プロジェクト指示タブ・指示対象列にメソッド名が表示されない問題の修正

## メタデータ
- **作成日時**: 2026-09-04 10:11
- **タスクID**: 20260904_1000
- **優先度**: 高

## タスク概要
プロジェクト指示タブの「指示対象」列でメソッド名が表示されない問題を修正する。

## 根本原因
- フロントエンドはMAIMLコンテキストで `method_id` → `method.name` を変換しているが、
  MAIMLのメソッド一覧がロードされていない等の理由でフォールバックの生 `method_id` が表示される
- `getTargetBaseLabel` のフォールバックが長い `method_id` 文字列を表示してしまう

## 修正方針
バックエンドAPIが `methodName` をレスポンスに含めるよう変更し、フロントエンドはMAIMLコンテキストに
依存せず `methodName` を直接表示するように変更する。

## 変更ファイル
1. `backend/src/types/api.ts` - `InstructionData.methodName` 追加
2. `backend/src/services/projectInstructionService.ts` - `buildMethodNameMap` 関数追加 + `getInstructions` 修正
3. `frontend/src/types/instructionRegistration.ts` - `InstructionData.methodName` 追加
4. `frontend/src/components/project/InstructionRegistrationTab.tsx` - `getTargetBaseLabel` 改善

## 実施記録
### 実施日時
開始: 2026-09-04 10:11
完了: 2026-09-04 10:30

### 実装内容
1. **`backend/src/types/api.ts`**
   - `InstructionData` インターフェースに `methodName?: string` フィールドを追加

2. **`backend/src/services/projectInstructionService.ts`**
   - `buildMethodNameMap` 関数を新規追加（`buildProgramIdMap` と同様のMAIMLパースパターン）
   - `getInstructions` 関数を修正してメソッド名をレスポンスに付与

3. **`frontend/src/types/instructionRegistration.ts`**
   - `InstructionData` インターフェースに `methodName?: string` フィールドを追加

4. **`frontend/src/components/project/InstructionRegistrationTab.tsx`**
   - `getTargetBaseLabel` 関数を修正
   - 優先順位: `methodName`(API) > `displayName`(MAIML) > `methodId` > プロジェクト全体

### 最終的な成果物
- [x] バックエンドAPIがメソッド名をレスポンスに含めるよう修正完了
- [x] フロントエンドがメソッド名を直接表示できるよう修正完了
- [x] TypeScriptエラーなし（修正ファイルに関連するエラー0件）
