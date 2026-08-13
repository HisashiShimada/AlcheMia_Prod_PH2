# タスク計画書: 名前空間URI自動採番

## メタデータ
- **作成日時**: 2026-06-29 15:37
- **タスクID**: namespace-uri-auto-gen
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

名前空間URIを手入力から自動採番方式に変更する。
組織CD・部署CD・チームユニット名を連結してURIを自動生成し、手入力を廃止する。

## URI生成ルール

```
https://{organization_cd}/{department_cd}/{unit_slug}/
```

- チームなし: `https://{org_cd}/{dept_cd}/`
- 組織のみ: `https://{org_cd}/`
- 日本語ユニット名は wanakana でローマ字スラッグ化

## 実装ステップ

- [ ] タスク計画書作成
- [ ] wanakana パッケージを frontend に追加
- [ ] `frontend/src/utils/namespaceUriGenerator.ts` 新規作成
- [ ] `frontend/src/components/namespace/DepartmentNodeAddDialog.tsx` 修正
- [ ] `frontend/src/components/namespace/NamespaceAddDialog.tsx` 修正

## 変更ファイル

1. `frontend/package.json` - wanakana パッケージ追加
2. `frontend/src/utils/namespaceUriGenerator.ts` - 新規作成
3. `frontend/src/components/namespace/DepartmentNodeAddDialog.tsx` - URI手入力→自動生成UI
4. `frontend/src/components/namespace/NamespaceAddDialog.tsx` - URI手入力→自動生成UI

## 承認記録
- **承認日時**: 2026-06-29 15:37
