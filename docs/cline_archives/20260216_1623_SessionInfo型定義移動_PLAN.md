# タスク計画書: SessionInfo型定義移動

## メタデータ
- **作成日時**: 2026-02-16 16:23
- **タスクID**: SessionInfo型定義移動
- **優先度**: 中
- **推定工数**: 0.5時間

## 1. タスク概要

`backend/src/services/sessionService.ts`で定義されている`interface SessionInfo`を`backend/src/types/auth.ts`に移動し、型定義の一元管理を実現します。

## 2. 目的と期待される成果

### 目的
- 型定義を`types/`フォルダに集約し、プロジェクトの規約に従う
- セッション関連の型を認証関連の型と同じファイルで管理
- 将来的に他のファイルから`SessionInfo`を使用する際のインポートを容易にする

### 期待される成果
- [x] `SessionInfo`が`backend/src/types/auth.ts`に定義される
- [x] `sessionService.ts`で適切にインポートされる
- [x] 既存の動作に影響がない

## 3. 実装ステップ

### Phase 1: 型定義の移動
- [x] `backend/src/types/auth.ts`に`SessionInfo`インターフェースを追加
- [x] JSDocコメントも含めて移動

### Phase 2: インポート文の更新
- [x] `backend/src/services/sessionService.ts`で`SessionInfo`をインポート
- [x] 元の`export interface SessionInfo`定義を削除

### Phase 3: 動作確認
- [x] TypeScriptのコンパイルが成功することを確認
- [x] 型エラーが発生していないことを確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/types/auth.ts` - SessionInfo定義を追加
2. `backend/src/services/sessionService.ts` - インポート文を追加、定義を削除

### 影響を受けるファイル（インポート更新不要）
- `backend/src/controllers/sessionController.ts` - SessionInfoを直接使用していないため影響なし
- `backend/src/routes/sessionRoutes.ts` - SessionInfoを直接使用していないため影響なし

### 新規作成するファイル
なし

### 削除するファイル
なし

## 5. 技術的詳細

### SessionInfo型の定義場所
**移動前**: `backend/src/services/sessionService.ts`
```typescript
export interface SessionInfo {
  tokenId: string;
  userId: string;
  userName: string;
  email: string;
  sessionDuration: string;
  durationMinutes: number;
  loginTime: string;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
  isCurrentUser: boolean;
}
```

**移動後**: `backend/src/types/auth.ts`
- 既存の`StoredRefreshToken`の近くに配置
- セッション関連の型として論理的にグループ化

### インポート文の追加
```typescript
import type { SessionInfo } from '../types/auth';
```

### アーキテクチャ上の考慮事項
- 型定義は`types/`フォルダに集約することでメンテナンス性が向上
- `auth.ts`はすでに`StoredRefreshToken`など認証・セッション関連の型を含んでいるため、適切な配置先
- サービス層での型定義は避け、再利用可能な型として管理

### セキュリティ考慮事項
- [x] 型定義の移動のみで、実装ロジックに変更なし
- [x] セキュリティに影響する変更なし

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 型エラーが発生する | 低 | 低 | TypeScriptコンパイラで事前確認 |
| 他のファイルで影響を見落とす | 低 | 低 | grepで使用箇所を確認済み |
| インポートパスのミス | 低 | 低 | 相対パスを正確に記述 |

## 7. テスト計画

### TypeScriptコンパイルテスト
- [x] `npm run build`でエラーが出ないことを確認
- [x] 型チェックが成功することを確認

### インポート確認
- [x] sessionService.tsでSessionInfoが正しくインポートされていることを確認
- [x] listActiveSessionsメソッドの戻り値型が正しいことを確認

### 既存機能への影響確認
- [x] controllerでのSessionService使用に問題がないことを確認
- [x] APIレスポンスの型に問題がないことを確認

## 8. ロールバック計画

問題が発生した場合は以下の手順でロールバック：
1. `backend/src/types/auth.ts`から`SessionInfo`定義を削除
2. `backend/src/services/sessionService.ts`で元の`export interface SessionInfo`を復元
3. インポート文を削除

## 9. 関連ドキュメント

- [コーディング規約](../.clinerules/development/config.md)
- [セキュリティ規約](../.clinerules/development/security.md)
- [セッション管理画面実装計画](./20260216_1035_セッション管理画面_実装_PLAN.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-16 16:23
- **承認日時**: 2026-02-16 16:25
- **承認者コメント**: 承認します。実装を開始してください

## 11. 実施記録

### 実施日時
開始: 2026-02-16 16:25
完了: 2026-02-16 16:26

### 計画からの変更点
なし。計画通りに実装完了。

### 発生した問題と解決方法
なし。問題なく実装完了。

### 最終的な成果物
- [x] SessionInfoが`backend/src/types/auth.ts`に定義される
- [x] sessionService.tsで適切にインポートされる
- [x] 既存の動作に影響がない

## 12. 振り返り

### うまくいった点
- 型定義の移動がスムーズに完了
- 影響範囲が事前調査通り2ファイルのみで限定的だった
- JSDocコメントも含めて適切に移動できた
- `StoredRefreshToken`の近くに配置し、認証・セッション関連の型を論理的にグループ化できた

### 改善が必要な点
特になし。

### 学んだこと
- 型定義は`types/`フォルダに集約することでメンテナンス性が向上
- サービス層での型定義は避け、再利用可能な型として管理する重要性
- 型定義の移動は影響範囲が限定的で、比較的安全に実施できる
