# タスク計画書: crypto.randomUUID → uuid パッケージ置換

## メタデータ
- **作成日時**: 2026-04-14 18:07
- **タスクID**: crypto_randomUUID_uuid置換
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`crypto.randomUUID()` はブラウザのWeb Crypto APIの機能であり、**セキュアコンテキスト（HTTPS）でのみ動作する**制約がある。  
HTTP環境でデプロイした際に `crypto.randomUUID is not a function` エラーが発生する問題を解消するため、既にインストール済みの `uuid` パッケージ（v13.0.0）の `v4` 関数に全面置換する。

## 目的と期待される成果

- [ ] HTTP環境でも UUID 生成が正常に動作する
- [ ] SSR（サーバーサイドレンダリング）環境でも安全に動作する
- [ ] `crypto.randomUUID` の呼び出しが本番コード（src/reference 除く）から完全に排除される

## 置換対象ファイル一覧

`src/reference/` は参照用コードのため対象外とする。

| # | ファイル | 使用箇所数 | 概要 |
|---|---------|-----------|------|
| 1 | `frontend/src/utils/documentInitializer.ts` | 2箇所 | ドキュメント初期化時のUUID生成 |
| 2 | `frontend/src/utils/documentParser.ts` | 6箇所 | ドキュメントパース時の各ID生成 |
| 3 | `frontend/src/components/Provider/OrganizationManagement.tsx` | 1箇所 | 組織ID生成 |
| 4 | `frontend/src/components/editorv2/components/PropertyPanel.tsx` | 1箇所 | テンプレートUUID生成 |
| 5 | `frontend/src/components/editorv2/components/FormatEditorDialog.tsx` | 1箇所 | UUID生成ボタン |
| 6 | `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` | 1箇所 | UUID生成ボタン |
| 7 | `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | 4箇所 | テンプレートUUID生成 |

**合計: 7ファイル・16箇所**

## 実装ステップ

### Phase 1: utils ファイルの置換
- [ ] `frontend/src/utils/documentInitializer.ts` を修正
- [ ] `frontend/src/utils/documentParser.ts` を修正

### Phase 2: components ファイルの置換
- [ ] `frontend/src/components/Provider/OrganizationManagement.tsx` を修正
- [ ] `frontend/src/components/editorv2/components/PropertyPanel.tsx` を修正
- [ ] `frontend/src/components/editorv2/components/FormatEditorDialog.tsx` を修正
- [ ] `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx` を修正
- [ ] `frontend/src/components/editorv2/PetriNetEditorInner.tsx` を修正

### Phase 3: 動作確認
- [ ] TypeScript ビルドエラーがないことを確認
- [ ] `crypto.randomUUID` の残存がないことを確認（reference 除く）

## 変更方針

各ファイルに以下のインポートを追加し、`crypto.randomUUID()` を `uuidv4()` に置換する。

```typescript
// 追加するインポート
import { v4 as uuidv4 } from 'uuid';

// 置換例
// Before:
const newUuid = crypto.randomUUID();

// After:
const newUuid = uuidv4();
```

`.substring(0, 8)` などの後続処理がある箇所はそのまま維持する。

## リスク

| リスク | 対策 |
|--------|------|
| uuid v13 の import 方法が v9 以前と異なる可能性 | package.json 確認済み（v13.0.0）。ESM import 方式で問題なし |
| 既に uuid をインポートしているファイルへの重複 import | 各ファイルの既存 import を確認してから追加 |

## 承認記録
- **計画書提示日時**: 2026-04-14 18:08
- **承認日時**: （承認時に記入）
