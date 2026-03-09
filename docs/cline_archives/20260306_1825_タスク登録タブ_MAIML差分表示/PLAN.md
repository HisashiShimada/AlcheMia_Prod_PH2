# タスク計画書: タスク登録タブ - MAIML差分表示機能

## メタデータ
- **作成日時**: 2026-03-06 18:25
- **タスクID**: 20260306_1825_タスク登録タブ_MAIML差分表示
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

タスク登録タブを開いた際に、以下のロジックでメソッド一覧を表示する機能を実装：
1. DBからworker_linked_flg=falseのメソッドを取得
2. MAIMLファイルから全メソッドを取得
3. MAIMLにあるが、DBのworker_linked_flg=falseメソッドに存在しないメソッドを追加表示

## 2. 目的と期待される成果

### 目的
- MAIMLファイルに追加された新しいメソッドを自動的にタスク登録画面に表示する
- worker_linked_flg=trueのメソッド（チェックアウト済み）は除外する

### 期待される成果
- [ ] タブ表示時にMAIMLとDBの差分を自動検出
- [ ] 新規メソッドが自動的に一覧に追加される
- [ ] worker_linked_flg=trueのメソッドは編集不可状態で表示

## 3. 実装ステップ

### Phase 1: バックエンド修正
- [ ] taskRegistrationService.tsのgetTaskRegistration関数を修正
  - worker_linked_flg=falseのメソッドのみを取得
  - MAIMLファイルをパース
  - MAIML全メソッドとDBメソッドを比較
  - 差分メソッドを初期データとして追加

### Phase 2: フロントエンド確認
- [ ] TaskRegistrationTab.tsxの動作確認
  - 現状のロジックで対応できるか確認
  - 必要に応じて修正

### Phase 3: テスト
- [ ] 新規メソッド追加時の動作確認
- [ ] worker_linked_flg制御の動作確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/services/taskRegistrationService.ts` - getTaskRegistration関数のロジック修正

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- タスク登録タブのメソッド一覧表示

## 5. 技術的詳細

### 処理フロー
```
1. getTaskRegistration API呼び出し
   ↓
2. DBから project_task取得（全レコード）
   ↓
3. worker_linked_flg=falseのメソッドのみをフィルタ
   ↓
4. MAIMLファイルをパース（全メソッド取得）
   ↓
5. MAIML全メソッド - DBのfalseメソッド = 差分メソッド
   ↓
6. 差分メソッドを初期データとして配列に追加
   ↓
7. 統合されたメソッド一覧をフロントエンドに返却
```

### データ構造
```typescript
// 返却データ
{
  tasks: [
    // DBに存在するworker_linked_flg=falseメソッド
    { methodId: 'method1', experimentCondition: 0, trialCount: 1, ... },
    
    // MAIMLに存在するがDBにないメソッド（初期データ）
    { methodId: 'method2', experimentCondition: 0, trialCount: 1, ... },
  ],
  isCheckoutLocked: false,
  isMaimlRegistered: true
}
```

## 6. リスク<br対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| MAIMLパースエラー | 高 | 低 | try-catchでエラーハンドリング |
| worker_linked_flg判定誤り | 高 | 低 | 十分なテストケース |
| パフォーマンス劣化 | 中 | 低 | MAIMLパースは既存処理と同様 |

## 7. テスト計画

### ユニットテスト
- [ ] getTaskRegistration関数のロジック検証

### 手動テスト
- [ ] ケース1: DBに全メソッド存在、全てworker_linked_flg=false
- [ ] ケース2: DBに一部メソッドのみ存在
- [ ] ケース3: MAIMLに新規メソッド追加
- [ ] ケース4: 一部メソッドがworker_linked_flg=true

## 8. ロールバック計画

既存の処理ロジックを保持し、問題発生時は元の実装に戻す。

## 9. 関連ドキュメント

- `.clinerules/development/typescript.md` - TypeScript型定義規約
- `backend/src/services/taskRegistrationService.ts` - 現在の実装

## 10. 承認記録

- **計画書提示日時**: 2026-03-06 18:25
- **承認日時**: 2026-03-06 18:40
- **承認者コメント**: 承認 - この計画で実装を開始してください

## 11. 実施記録

### 実施日時
開始: 2026-03-06 18:41
完了: 2026-03-06 20:12

### 計画からの変更点

**ユーザーフィードバックによる仕様変更（6回修正）:**

1. **初回実装（18:41）**: DBのworker_linked_flg=falseメソッドのみ表示
2. **第2回修正（18:49）**: DB内の全メソッド（worker_linked_flg=true/false両方）を表示 + MAIML差分を追加
3. **第3回修正（20:05）**: 差分検出ロジックをDBのFALSEメソッドのみで比較
4. **第4回修正（20:12）**: チェックアウト状態ではMAIML差分を追加しない（条件式: `!isCheckoutLocked`）
5. **第5回修正（20:17）**: 条件式を逆に変更（条件式: `isCheckoutLocked`）
6. **第6回修正（20:20）**: **条件式を元に戻す（条件式: `!isCheckoutLocked`）** ← 最終仕様

### 発生した問題と解決方法

**問題1:** 初回実装でworker_linked_flg=falseのメソッドのみを表示していた
**解決1:** ユーザーフィードバックを受け、DB内の全メソッドを表示するように修正

**問題2:** 差分検出がDB全メソッドと比較していた
**解決2:** チェックアウト時にTRUEになったメソッドが再チェックイン時に差分として検出されるよう、**DBのFALSEメソッドのみと比較**するように修正

**問題3:** チェックアウト状態でもMAIML差分が追加されていた
**解決3:** チェックアウト状態では差分検出をスキップし、**DBメソッドのみを表示**するように修正

### 最終的な成果物

- [x] `backend/src/services/taskRegistrationService.ts` の修正完了（3回修正）

#### 実装内容（最終版）

**getTaskRegistration関数の修正:**

1. **DBから全タスクを取得**（worker_linked_flg=true/false両方）
2. **DB内の全メソッドをUI用形式に変換**
3. **MAIMLファイルをパース** して全メソッドを取得
4. **DBのFALSEメソッドIDセットを作成**
5. **差分メソッドを検出**: MAIML全メソッド - **DBのFALSEメソッド** ← 重要な変更点
6. **差分メソッドを初期データとして追加**（experimentCondition=0, trialCount=1, workerLinkedFlg=false）
7. **統合されたメソッド一覧を返却**

**動作（確定版）:**
- タスク登録タブを開くと、**DBに保存されている全メソッド**（worker_linked_flg=true/falseを問わず）を表示
- MAIMLメソッドから**DBのFALSEメソッドを除いた差分**を自動的に一覧に追加表示
  - チェックアウト時にTRUEになったメソッドは、再チェックイン時に差分として検出される
- worker_linked_flg=trueのメソッドは既存の制御により編集不可状態で表示
- MAIMLパースエラーが発生しても処理は継続される（警告ログのみ）

**具体例:**
```
①チェックイン状態（初回）
  DB全メソッド(0件) + [MAIML(3件) - DBFalse(0件)] = 表示3件

②タスク保存（チェックイン状態）
  DB全メソッド(3件:FALSE) + [MAIML(3件) - DBFalse(3件)] = 表示3件

③チェックアウト状態（3件がTRUEに変更）
  DB全メソッド(3件:TRUE) = 表示3件

④再チェックイン状態
  DB全メソッド(3件:TRUE) + [MAIML(3件) - DBFalse(0件)] = 表示6件
  ※TRUEメソッドと重複するMAIMLメソッドが差分として追加される

⑤再度タスク保存（チェックイン状態）
  DB全メソッド(6件:3FALSE+3TRUE) + [MAIML(3件) - DBFalse(3件)] = 表示6件

⑥再度チェックアウト状態（6件がTRUEに変更）
  DB全メソッド(6件:TRUE) = 表示6件
```

**フロントエンド:**
- 既存のTaskRegistrationTab.tsxはAPIから返却されたデータをそのまま表示するため、修正不要
- worker_linked_flg=trueのメソッドは既存の実装により編集不可状態で表示される
