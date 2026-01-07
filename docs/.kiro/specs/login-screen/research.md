# Research & Design Decisions

---
**Purpose**: ログイン画面機能の設計判断と技術調査の記録

**Usage**:
- 既存システムとの統合アプローチの記録
- 技術選定の根拠
- アーキテクチャ判断の追跡
---

## Summary
- **Feature**: `login-screen`
- **Discovery Scope**: Extension（既存システムへのフロントエンド追加）
- **Key Findings**:
  - 既存のLoginPageコンポーネントは基本UI構造のみで二段階認証機能なし
  - Ant Design v6のデザインシステムとtheme.useToken()パターンが確立済み
  - 認証バックエンドAPI仕様が完成済み（docs/design/api/api_auth.md）
  - TypeScript strict mode、型安全性の徹底が既存プロジェクトの標準

## Research Log

### 既存フロントエンド構造の分析
- **Context**: ログイン画面の既存実装状況と統合ポイントの確認
- **Sources Consulted**: 
  - `frontend/src/components/LoginPage.tsx`
  - `frontend/src/types/auth.ts`
  - `frontend/src/utils/apiClient.ts`
- **Findings**:
  - **LoginPageコンポーネント**: ユーザー名・パスワード入力のみ実装済み
  - **型定義**: `LoginCredentials`, `User`, `AuthState`の基本型が定義済み
  - **APIパターン**: モックAPIファサードパターン（`apiClient.ts`）が確立
  - **デザインシステム**: Ant Design v6 + `theme.useToken()`で一貫したスタイリング
  - **状態管理**: React Hooks（useState）ベース、Context APIは未使用
- **Implications**: 
  - 既存のLoginPageは基本構造として活用可能だが、二段階認証フローのために大幅な拡張が必要
  - 新規コンポーネント（PINコード入力、パスワードリセット）を追加する必要がある
  - 既存のAPIパターンに従い、認証API呼び出し関数を`apiClient.ts`または新規`authApi.ts`に実装

### 認証API仕様の確認
- **Context**: バックエンドAPIとのインターフェース契約の確認
- **Sources Consulted**: `docs/design/api/api_auth.md`
- **Findings**:
  - 6つの認証エンドポイントが定義済み（login, verify-pin, resend-pin, logout, reset-password-request, reset-password）
  - 統一されたレスポンス形式（`success`, `data`, `error`, `meta`）
  - HTTPステータスコード体系とエラーコード（AUTH_*, VALIDATION_*）が明確
  - セッション管理はHTTPOnly Cookie + JWT形式
- **Implications**: 
  - APIレスポンス型定義が必要（`types/api.ts`に追加）
  - エラーハンドリングはエラーコードベースで実装
  - Cookie管理はブラウザが自動処理（JavaScriptから直接アクセス不可）

### Ant Design v6の機能調査
- **Context**: UI実装で使用するAnt Designコンポーネントの確認
- **Sources Consulted**: 
  - 既存コンポーネント（LoginPage.tsx）
  - プロジェクト規約（.clinerules/references/ui_policy.md）
- **Findings**:
  - **使用済みコンポーネント**: Card, Input, Button, Typography, Alert, Space, Spin
  - **必要な追加コンポーネント**: Form, message, notification, Steps（オプション）
  - **デザイントークン**: `theme.useToken()`で一貫したスタイリング
  - **レスポンシブ対応**: Grid/Row/Colシステムが利用可能
- **Implications**: 
  - 既存パターンを踏襲し、Ant Designコンポーネントを最大限活用
  - インラインスタイルは`theme.useToken()`から取得した値のみ使用
  - フォームバリデーションはAnt Design Formコンポーネントで実装可能

### Next.js 15のルーティングとページ構造
- **Context**: ログイン画面とPINコード画面の画面遷移実装方法
- **Sources Consulted**: 
  - `frontend/src/app/page.tsx`
  - `frontend/src/app/layout.tsx`
- **Findings**:
  - App Router（Next.js 13+）を使用
  - クライアントコンポーネント（'use client'）パターン
  - 既存のpage.tsxでLoginPageコンポーネントをレンダリング
- **Implications**: 
  - ログイン画面とPINコード画面は同一ページ内での状態遷移として実装
  - 条件分岐でコンポーネントを切り替える（ステートマシンパターン）
  - パスワードリセットは別ルート（/reset-password）として実装可能

## Architecture Pattern Evaluation

### 認証フロー状態管理パターン

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| State Machine（ステートマシン） | 認証フローを明示的な状態として管理（LOGIN, PIN_INPUT, RESET_REQUEST等） | 状態遷移が明確、デバッグしやすい、バグを防ぎやすい | 状態数が多いと複雑化 | ✅ 選択：既存パターンと一致、二段階認証に適している |
| URL-based Routing | 各画面を別ルート（/login, /pin, /reset）として実装 | ブラウザ履歴・ブックマーク対応、独立性高い | セッショントークンの受け渡しが複雑 | 二段階認証では一時トークンの管理が難しい |
| Context API | グローバルな認証状態を Context で管理 | コンポーネント間の状態共有が容易 | この機能単独では過剰設計 | 将来的な拡張では検討価値あり |

**選択理由**: State Machine（ステートマシン）パターンを採用。既存のLoginPageが単一ページ内で状態管理している点と一貫性があり、二段階認証フローの複雑さに対応できる。

### APIクライアント実装パターン

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存apiClient.ts拡張 | apiClient.tsに認証関数を追加 | 一貫性、既存パターン踏襲 | ファイルサイズ増大 | 既存ファイルは実験機能用で分離が望ましい |
| 新規authApi.ts作成 | 認証専用のAPIモジュールを作成 | 関心の分離、保守性向上 | ファイル数増加 | ✅ 選択：認証ロジックの独立性を確保 |
| Axios/Fetch ラッパー | 汎用的なHTTPクライアントを実装 | 再利用性高い | この機能単独では過剰設計 | 将来的な拡張では検討価値あり |

**選択理由**: 新規`authApi.ts`を作成。認証ロジックは他機能と独立しており、専用モジュールとして管理することで保守性を向上。

## Design Decisions

### Decision: 二段階認証フローの画面遷移方式

- **Context**: パスワード認証成功後にPINコード入力画面に遷移する必要がある
- **Alternatives Considered**:
  1. **ステートマシンパターン（単一ページ内での状態遷移）**
     - 状態: `'login' | 'pin-input' | 'reset-request' | 'reset-execute'`
     - 条件分岐でコンポーネントを切り替え
  2. **URL-basedルーティング**
     - `/login`, `/login/pin`, `/reset-password`など別ルートで管理
     - Next.js App Routerのルーティング機能を活用
- **Selected Approach**: ステートマシンパターン（Option 1）
- **Rationale**: 
  - 二段階認証では仮セッショントークンの受け渡しが必要で、URL遷移では管理が複雑化
  - 既存のLoginPageコンポーネントが単一ページ内で状態管理している点と一貫性がある
  - ブラウザの戻るボタンで認証フローが中断されるリスクを回避
- **Trade-offs**: 
  - ✅ 利点: 状態管理がシンプル、セキュリティ（トークン漏洩リスク低減）
  - ❌ 欠点: ブラウザ履歴・ブックマーク非対応、状態数増加による複雑化
- **Follow-up**: パスワードリセットは別ルート（/reset-password）として実装し、ブックマーク可能にする

### Decision: API通信エラーハンドリング戦略

- **Context**: 認証APIのエラーを適切にユーザーに伝える必要がある
- **Alternatives Considered**:
  1. **エラーコードベース**
     - APIのerror.codeを基にメッセージをマッピング
  2. **エラーメッセージそのまま表示**
     - APIのerror.messageを直接表示
  3. **HTTPステータスコードベース**
     - 401→認証エラー、429→レート制限など
- **Selected Approach**: エラーコードベース（Option 1）+ フォールバック
- **Rationale**: 
  - API仕様（api_auth.md）で明確なエラーコード体系が定義済み
  - エラーコード→ユーザーメッセージのマッピングでi18n対応が容易
  - HTTPステータスコードのみでは詳細なエラー理由が不明
- **Trade-offs**: 
  - ✅ 利点: i18n対応、エラーメッセージの一貫性、詳細なエラー理由
  - ❌ 欠点: マッピングテーブルの維持が必要
- **Follow-up**: エラーマッピングを`utils/errorMapper.ts`として実装

### Decision: 型定義の拡張方針

- **Context**: 既存のauth.tsに二段階認証用の型を追加する必要がある
- **Alternatives Considered**:
  1. **既存auth.ts拡張**
     - 既存ファイルに型を追加
  2. **新規auth-api.ts作成**
     - APIレスポンス専用の型ファイルを作成
- **Selected Approach**: 既存auth.ts拡張（Option 1）
- **Rationale**: 
  - 認証関連の型は論理的に1箇所にまとまっている方が管理しやすい
  - ファイルサイズはまだ小さく、分割の必要性は低い
- **Trade-offs**: 
  - ✅ 利点: 型定義の一元管理、インポートパスの単純化
  - ❌ 欠点: 将来的にファイルサイズ増大の可能性
- **Follow-up**: 100行を超えた時点で分割を検討

## Risks & Mitigations

- **Risk 1**: セッショントークンの管理ミス（XSS脆弱性）
  - **Mitigation**: HTTPOnly Cookieのため、JavaScriptからアクセス不可。ブラウザが自動管理
  
- **Risk 2**: PINコードの試行回数制限の未実装
  - **Mitigation**: APIが試行回数を管理。フロントエンドはエラーレスポンスに基づいて適切にUIをブロック
  
- **Risk 3**: レート制限エラー時のUX（ユーザーが再試行タイミングがわからない）
  - **Mitigation**: エラーメッセージに残り時間を表示（「15分後に再試行可能」）
  
- **Risk 4**: ネットワークエラー時の無限ローディング
  - **Mitigation**: APIリクエストに30秒のタイムアウトを設定、タイムアウト時は明確なエラーメッセージ

- **Risk 5**: 既存の認証なし画面（実験管理者メニュー等）との整合性
  - **Mitigation**: 既存画面は段階的に認証必須化。当面は並行運用

## References

**公式ドキュメント:**
- [Ant Design v6 - Form Component](https://ant.design/components/form) - フォームバリデーション
- [Ant Design v6 - Message & Notification](https://ant.design/components/message) - ユーザーフィードバック
- [Next.js 15 - App Router](https://nextjs.org/docs/app) - ルーティングとページ構造

**プロジェクト内部資料:**
- [認証API仕様書](../../design/api/api_auth.md) - バックエンドAPI契約
- [認証DB設計書](../../design/db/db_auth.md) - データモデル
- [UIポリシー](../../.clinerules/references/ui_policy.md) - デザインシステム
- [フロントエンド規約](../../.clinerules/development/frontend.md) - コーディング規約
- [セキュリティ規約](../../.clinerules/development/security.md) - セキュリティベストプラクティス
