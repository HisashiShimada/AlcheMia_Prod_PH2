# タスク計画書: CSVエクスポート チェックボックス対応

## メタデータ
- **作成日時**: 2026-09-17 10:00
- **タスクID**: 20260917_1000
- **優先度**: 中
- **推定工数**: 1時間（C:\Git\test での実装内容をポーティング）

---

## タスク概要

`C:\Git\test` リポジトリで実施した「CSVエクスポート チェックボックス対応」を本リポジトリ（`C:\git\mmdpf`）に適用する。

### 対象画面
- マスタ管理（Creator / Vendor / Instrument / Attribute）
- 組織管理
- 会社管理
- ユーザー管理
- ロール管理

---

## 修正内容（改修前 → 改修後）

**改修前**: 全体の一覧からフィルタで絞り込んだ一覧をAPIでバックエンドに渡して CSV 出力  
**改修後**: チェックボックスにチェックを入れた行のみ API でバックエンドに渡し CSV 出力

0件選択時は「少なくとも1件選択してください」エラートーストを表示（用語管理画面と同様のスタイル）。

---

## 機能フロー図

```
===== 修正前 =====
[CSVボタンクリック]（0件選択でも実行される）
  → handleDownload()
  → GET /xxx/download-csv?search=...  ← フィルター条件のみ
  → バックエンドでDB全件検索 → 全フィルタ一致データをCSV出力

===== 修正後 =====
[チェックボックスでN行選択] → [CSVボタンクリック]
  → handleDownload()
  ├─ 0件 → message.error("少なくとも1件選択してください") → 終了
  └─ 1件以上
    → GET /xxx/download-csv?ids=id1,id2,id3  ← IDリストを渡す
    → バックエンド: 既存service呼び出し → 全件取得 → ids でメモリフィルタリング
    → 選択行のみCSV出力

※ OrganizationManagement のみバックエンド変更なし（フロントエンド完結）:
   selectedRowKeys で filteredOrganizations を絞り込み → フロントエンドでCSV生成
```

---

## 変更ファイル一覧

### フロントエンド（9ファイル）

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/locales/ja.json` | 5画面に `csvDownloadSelectRequired: "少なくとも1件選択してください"` 追加 |
| 2 | `frontend/src/locales/en.json` | 5画面に `csvDownloadSelectRequired: "Please select at least one item."` 追加 |
| 3 | `frontend/src/services/userApiService.ts` | `downloadCsv` の引数に `ids?: string[]` を追加 |
| 4 | `frontend/src/services/roleApiService.ts` | 同上 |
| 5 | `frontend/src/components/DataManagement/MasterManagement.tsx` | `handleDownload` に0件チェック追加、`ids` パラメータ送信 |
| 6 | `frontend/src/components/Provider/CorporationManagement.tsx` | 同上 |
| 7 | `frontend/src/components/Provider/OrganizationManagement.tsx` | 0件チェック追加、`selectedRowKeys` でフィルタしてCSV生成 |
| 8 | `frontend/src/components/SystemManagement/UserManagement.tsx` | 0件チェック追加、`ids` 送信 |
| 9 | `frontend/src/components/SystemManagement/RoleManagement.tsx` | 同上 |

### バックエンド（4ファイル）

| # | ファイル | 変更内容 |
|---|---------|---------|
| 10 | `backend/src/controllers/masterController.ts` | Creator/Instrument/Vendor/Attribute CSV DL関数に `ids` クエリパラメータ＋メモリフィルタリング追加 |
| 11 | `backend/src/controllers/corporationController.ts` | `downloadCorporationCsv` に同上 |
| 12 | `backend/src/controllers/userController.ts` | `downloadUsersCsv` に同上 |
| 13 | `backend/src/controllers/roleController.ts` | `downloadRoleCsv` に同上 |

---

## 実装ステップ

- [x] PLAN.md 作成
- [x] locales/ja.json: 5画面に csvDownloadSelectRequired 追加
- [x] locales/en.json: 5画面に csvDownloadSelectRequired 追加
- [x] userApiService.ts: downloadCsv に ids 追加
- [x] roleApiService.ts: downloadCsv に ids 追加
- [x] MasterManagement.tsx: handleDownload 修正
- [x] CorporationManagement.tsx: handleDownload 修正
- [x] OrganizationManagement.tsx: handleDownload 修正
- [x] UserManagement.tsx: handleDownload 修正
- [x] RoleManagement.tsx: handleDownload 修正
- [x] masterController.ts: 4関数に ids 対応
- [x] corporationController.ts: ids 対応
- [x] userController.ts: ids 対応
- [x] roleController.ts: ids 対応
- [x] フロントエンド TSC チェック（exit code 0）
- [x] バックエンド TSC チェック（exit code 0）

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| ids 未指定時の後方互換性破損 | 中 | バックエンドで ids 未指定時は全件返却 |
| Attribute の複合PK（name__value形式） | 中 | `name__value` 形式でフィルタリング |
| 型エラー（TS） | 低 | 実装後 tsc --noEmit でビルドチェック |

---

## テスト計画
- [ ] 各画面で0件選択時にエラーメッセージが表示されること
- [ ] 各画面で複数行選択後、選択行のみCSVに含まれること
- [ ] フロントエンド tsc --noEmit エラーなし
- [ ] バックエンド tsc --noEmit エラーなし

---

## 承認記録
- **計画書提示日時**: 2026-09-17 10:00
- **承認日時**: 2026-09-17（C:\Git\test 実装承認済みのポーティング）
- **承認者コメント**: C:\Git\test での承認済み実装を mmdpf に適用
