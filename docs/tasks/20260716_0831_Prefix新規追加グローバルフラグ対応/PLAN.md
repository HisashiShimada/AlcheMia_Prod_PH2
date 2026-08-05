# タスク計画書: Prefix新規追加グローバルフラグ対応

## メタデータ
- **作成日時**: 2026-07-16 08:31
- **タスクID**: prefix-add-global-flag
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

プロバイダーメニューの「名前空間管理（グローバル）」タブ内「Prefix管理」において、
新規Prefixを追加する際に `global_flg = true` でDBに保存され、
一覧もグローバルPrefixのみ絞り込んで表示されるよう修正する。

## 目的と期待される成果

### 目的
- プロバイダーが登録したPrefixが「グローバル」として扱われ、全組織から参照できるようにする
- 現状は `globalOnly={true}` が渡されているが、コンポーネント内で無視されており、
  `global_flg = false` のまま保存されてしまっている

### 期待される成果
- [ ] プロバイダーメニューからPrefix追加時、DBの `namespace.global_flg = true` で保存される
- [ ] プロバイダーメニューのPrefix一覧は `global_flg = true` のPrefixのみ表示される
- [ ] 既存の実験管理者メニュー（`globalOnly` 未設定）の動作は変わらない

## 実装ステップ

### Phase 1: バックエンド修正

- [ ] `backend/src/repositories/namespaceTermRepository.ts`
  - `createNamespace()` の引数型に `globalFlg?: boolean` を追加
  - `namespace` テーブルの INSERT に `global_flg = $N` を追加
  - `findNamespacesByOrganization()` のSELECTに `global_flg` カラムを追加
  
- [ ] `backend/src/controllers/namespaceController.ts`
  - `createNamespace` ハンドラで `req.body.isGlobal` を受け取り、`globalFlg` として Repository に渡す
  - `getNamespaces` ハンドラで `global_flg` をレスポンスに含める

### Phase 2: フロントエンド APIサービス修正

- [ ] `frontend/src/services/namespaceApiService.ts`
  - `CreateNamespaceRequest` に `isGlobal?: boolean` を追加
  - `NamespaceEntry`（または `NamespaceListResponse`）に `globalFlg?: boolean` を追加

### Phase 3: フロントエンド コンポーネント修正

- [ ] `frontend/src/components/namespace/PrefixManagement.tsx`
  - `globalOnly` prop をコンポーネント本体で受け取るよう修正
  - `handleSave` / `handleCsvUpload` の `createNamespace` 呼び出しに `isGlobal: globalOnly` を追加
  - `fetchNamespaces` 取得後のデータを `globalOnly=true` の場合は `globalFlg=true` のみにフィルタリング

### Phase 4: 型定義の確認

- [ ] `frontend/src/utils/namespaceInjector.ts`（`NamespaceEntry` の定義元）に `globalFlg?: boolean` を追加する必要があるか確認

## 変更ファイル

1. `backend/src/repositories/namespaceTermRepository.ts` - globalFlg パラメータ追加・SELECTに global_flg 追加
2. `backend/src/controllers/namespaceController.ts` - isGlobal パラメータ受け取り
3. `frontend/src/services/namespaceApiService.ts` - 型定義に isGlobal / globalFlg 追加
4. `frontend/src/utils/namespaceInjector.ts` - NamespaceEntry 型に globalFlg 追加（要確認）
5. `frontend/src/components/namespace/PrefixManagement.tsx` - globalOnly prop 対応

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 既存PrefixのglobalFlgが全てfalse | 低 | 既存データは変わらず表示されるため問題なし |
| NamespaceEntry型の変更が他のコンポーネントに波及 | 低 | globalFlg はオプション型のため既存コードには影響なし |

## テスト計画

- [ ] プロバイダーメニューからPrefix追加 → DBの `global_flg = true` を確認
- [ ] プロバイダーメニューのPrefix一覧にグローバルPrefixのみ表示されることを確認
- [ ] 実験管理者メニューのPrefix一覧の表示が変わらないことを確認

## 承認記録
- **計画書提示日時**: 2026-07-16 08:31
- **承認日時**: 
- **承認者コメント**: 
