# タスク計画書: ProjectManagement.tsx 多言語対応

## メタデータ
- **作成日時**: 2026-08-07 12:00
- **タスクID**: 20260807_1200
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
`frontend/src/components/project/ProjectManagement.tsx` に含まれるハードコードの日本語文字列を `t()` 関数による多言語対応に置き換える。

## ハードコード日本語の洗い出し

| 行番号 | 内容 | 対応方針 |
|--------|------|----------|
| 1874 | `` `${g.name}（非アクティブ）` `` | 新規翻訳キー `projectManagement.inactiveGroupSuffix` |
| 2111, 2120, 2129, 2138, 2180, 2201, 2216, 2224 | `t('projectManagement.editDisabledTitle') \|\| '編集権限がありません'` | `t()` のフォールバック日本語を削除（翻訳キーは既存） |

## 実装ステップ
- [ ] `ja.json` に `projectManagement.inactiveGroupSuffix` キー追加
- [ ] `en.json` に `projectManagement.inactiveGroupSuffix` キー追加
- [ ] `ProjectManagement.tsx` の行1874 を `t()` 化
- [ ] `ProjectManagement.tsx` の行2111/2120/2129/2138/2180/2201/2216/2224 のフォールバック日本語 `|| '編集権限がありません'` を削除

## 変更ファイル
1. `frontend/src/locales/ja.json` - `projectManagement.inactiveGroupSuffix` 追加
2. `frontend/src/locales/en.json` - `projectManagement.inactiveGroupSuffix` 追加
3. `frontend/src/components/project/ProjectManagement.tsx` - ハードコード日本語を `t()` に置換

## リスク
| リスク | 対策 |
|--------|------|
| `inactiveGroupSuffix` の翻訳キーが他コンポーネントで使われていない | 新規追加なので問題なし |
| フォールバック削除で `editDisabledTitle` キーが未定義の場合に空文字になる | 既存キーが ja/en 両方に定義済みであることを確認済み |

## 承認記録
- **承認日時**: 2026-08-07 12:00（ユーザー指示により即時実施）
