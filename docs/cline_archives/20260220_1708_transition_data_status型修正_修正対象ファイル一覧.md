# 修正対象ファイル一覧

## 作成日時
2026-02-20 17:14

## Phase 2: 問題箇所の特定結果

---

## 📝 修正が必要なファイル

### 1. 型定義ファイル（最優先）

#### `backend/src/types/transitionData.ts`
**現状**: Status型が文字列型として定義されている
```typescript
export type Status = 'initial' | 'preparing' | 'ready' | 'running' | 'paused' | 'completed' | 'error';
```

**修正内容**:
- ❌ 削除: 既存のStatus型（文字列型）
- ✅ 追加: TransitionStatusEnum（数値型のEnum）
- ✅ 追加: ヘルパー関数（getTransitionStatusLabel, isValidTransitionStatus）
- ✅ 更新: TransitionData, NewTransitionData, TransitionDataUpdate インターフェースのstatus型を数値型に変更

**影響度**: 🔴 **高** - すべての関連ファイルに影響

---

### 2. Repository層

#### `backend/src/repositories/transitionDataRepository.ts`
**現状**: Status型（文字列型）をimportして使用
```typescript
import { Status } from '../types/transitionData';

export interface TransitionDataRow {
  status: Status;  // 文字列型
}
```

**修正内容**:
- ❌ 削除: `import { Status } from '../types/transitionData';`
- ✅ 変更: `TransitionDataRow.status`の型を`number`に変更
- ✅ 変更: `TransitionDataUpdate.status`の型を`number`に変更

**影響度**: 🔴 **高** - Service層とController層に影響

---

### 3. Service層

#### `backend/src/services/progressService.ts`
**現状**: Status型（文字列型）を広範に使用
```typescript
import { Status, TransitionData, TransitionDataUpdate } from '../types/transitionData';

export const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  initial: ['preparing', 'completed', 'error'],
  // ...
};

private convertStatusToTransitionStatus(status: Status): TransitionStatus {
  switch (status) {
    case 'completed': return 'completed';
    case 'initial': return 'not_started';
    // ...
  }
}
```

**修正内容**:
- ❌ 削除: `Status`型のimport
- ✅ 追加: `TransitionStatusEnum`のimport
- ✅ 変更: `ALLOWED_TRANSITIONS`を数値型のEnumベースに変更
- ✅ 変更: `convertStatusToTransitionStatus()`メソッドを数値型対応に変更
- ✅ 変更: `validateStatusTransition()`メソッドを数値型対応に変更
- ✅ 変更: `InvalidStatusTransitionError`を数値型対応に変更
- ✅ 変更: `updateTransitionStatus()`メソッドの引数・戻り値を数値型対応に変更

**影響度**: 🔴 **高** - Controller層とAPI レスポンスに影響

---

### 4. Controller層

#### `backend/src/controllers/progressController.ts`
**現状**: TransitionDataUpdate型をimportして使用
```typescript
import { TransitionDataUpdate } from '../types/transitionData';

const updateData: TransitionDataUpdate = {
  status,  // リクエストボディから取得（文字列型？数値型？）
  updated_by: updatedBy,
  ...(progressRate !== undefined && { progress_rate: progressRate }),
};
```

**修正内容**:
- ✅ 確認: リクエストボディの`status`が数値型であることを確認
- ✅ 追加: 必要に応じてバリデーション処理を追加
- ✅ 確認: TransitionDataUpdate型の使用箇所が正しく動作するか確認

**影響度**: 🟡 **中** - APIリクエスト/レスポンスの仕様に影響

---

### 5. SQLファイル

#### `backend/src/sql/transition_data/*.sql`
**現状**: 未確認（SQLファイル内でstatusを文字列として扱っている可能性）

**修正内容**:
- ✅ 確認: SQLファイル内のstatus比較が数値型で正しく動作するか確認
- ✅ 必要に応じて修正

**影響度**: 🟡 **中** - データベースクエリの動作に影響

---

### 6. フロントエンド（該当ファイルなし）

**現状**: transition_dataを直接扱うコンポーネントは見つからなかった

**修正内容**:
- ✅ 確認: 今後、transition_data関連のAPIを呼び出す際は数値型を使用
- ✅ 表示用の文字列ラベルは、バックエンドのヘルパー関数を使用

**影響度**: 🟢 **低** - 現時点では影響なし

---

## 📊 修正の優先順位

### 第1優先（Phase 3-1）
1. `backend/src/types/transitionData.ts` - 型定義の修正

### 第2優先（Phase 3-2）
2. `backend/src/repositories/transitionDataRepository.ts` - Repository層の修正

### 第3優先（Phase 3-3）
3. `backend/src/services/progressService.ts` - Service層の修正

### 第4優先（Phase 3-4）
4. `backend/src/controllers/progressController.ts` - Controller層の確認・修正

### 第5優先（Phase 3-5）
5. `backend/src/sql/transition_data/*.sql` - SQLファイルの確認・修正

---

## 🔄 修正の流れ

```
Phase 3-1: 型定義修正
  ↓
Phase 3-2: Repository層修正
  ↓
Phase 3-3: Service層修正
  ↓
Phase 3-4: Controller層確認
  ↓
Phase 3-5: SQLファイル確認
  ↓
Phase 4: フロントエンド確認（必要に応じて）
  ↓
Phase 5: テストデータ・マイグレーション確認
  ↓
Phase 6: ビルド確認・動作確認
```

---

## ⚠️ 注意事項

### 1. 後方互換性
- 既存のAPIリクエスト/レスポンスの仕様を変更する場合は、API仕様書も更新する
- 既存のクライアントコードが影響を受ける可能性がある

### 2. データベースの既存データ
- データベースには既に数値型でデータが格納されているため、データマイグレーションは不要
- ただし、データの整合性を確認する

### 3. テストの実施
- 修正後、必ずユニットテストと統合テストを実施する
- 特にステータス遷移のロジックが正しく動作するか確認

### 4. ログ出力
- ステータス値をログに出力する際は、数値と文字列ラベルの両方を出力する
- デバッグしやすくするため

---

## 📝 次のステップ

Phase 3の修正作業を開始します。

**開始順序**:
1. Phase 3-1: `backend/src/types/transitionData.ts` の修正
2. Phase 3-2: `backend/src/repositories/transitionDataRepository.ts` の修正
3. Phase 3-3: `backend/src/services/progressService.ts` の修正
4. Phase 3-4: `backend/src/controllers/progressController.ts` の確認
5. Phase 3-5: SQLファイルの確認

---

**作成日時**: 2026-02-20 17:14
