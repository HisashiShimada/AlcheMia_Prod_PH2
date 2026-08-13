# タスク計画書: 多言語対応_残存ハードコード修正

## メタデータ
- **作成日時**: 2026-07-30 08:49
- **タスクID**: 多言語対応_残存ハードコード修正
- **優先度**: 高
- **推定工数**: 30分

## タスク概要
指定10ファイルを調査した結果、以下2ファイルに対応が必要な日本語ハードコードを確認。
残り8ファイルは対応済み（日本語なし or 全て t() 使用済み）。

## 変更ファイル

### 新規追加なし / 修正のみ
1. `frontend/src/locales/ja.json` — projectManagement.create 配下に不足キー10件追加
2. `frontend/src/locales/en.json` — 同上（英語翻訳）
3. `frontend/src/components/project/CreateProjectModal.tsx` — `t('...') || '日本語'` のフォールバックを削除
4. `frontend/src/components/namespace/NamespaceMain.tsx` — モジュールレベル静的定数内 description を空文字に変更

## 実装ステップ
- [x] タスク計画書作成
- [ ] ja.json / en.json に projectManagement.create 不足キー追加
- [ ] CreateProjectModal.tsx の || '日本語' フォールバック削除
- [ ] NamespaceMain.tsx の静的定数内 description を空文字に変更
