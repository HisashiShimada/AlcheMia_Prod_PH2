# タスク計画書: templateDataProperty スコープバグ修正

## メタデータ
- **作成日時**: 2026-08-24 15:14
- **タスクID**: templateDataProperty_scope_fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要
実験作業者メニューの実験記録タブ内のTemplateに紐づくpropertyが表示されない問題を修正する。
`template_data` テーブルにデータが存在する状態で `getTemplateData` API を呼び出すと、
`convertPropertyForFallback` が `buildFallbackTemplates` クロージャー外から参照できないため
ReferenceError が発生し、フロントエンドにプロパティが表示されない。

## 原因分析
`backend/src/services/experimentDataService.ts` において:

- `convertPropertyForFallback` 関数は `buildFallbackTemplates` 関数（429行目〜）の**内部**にのみ定義されている
- `getTemplateData` 関数（199行目〜）の332行目でも `convertPropertyForFallback` を呼び出しているが、
  JavaScriptのスコープ規則により `buildFallbackTemplates` の外からは参照不可
- `template_data` にDBレコードが存在する場合（`if (dbRecord)` ブランチ）に ReferenceError が発生
- バックエンドが500エラーを返し、フロントエンドの catch ブロックで空のテンプレートが設定される結果、プロパティカードが0件表示になる

## 修正内容

### 変更ファイル
1. `backend/src/services/experimentDataService.ts` - `convertPropertyForFallback` 関数をモジュールスコープに移動

### 修正ステップ
- [ ] `convertPropertyForFallback` 関数を `buildFallbackTemplates` の内部から外に移動（モジュールスコープ関数化）
- [ ] 関数シグネチャ・本体は変更なし
- [ ] `buildFallbackTemplates` 内の呼び出し箇所はそのまま維持

## 承認記録
- **計画書提示日時**: 2026-08-24 15:14
- **承認日時**: 2026-08-24 15:14
