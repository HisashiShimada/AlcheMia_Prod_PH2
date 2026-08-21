# タスク計画書: 名前空間URI自動採番実装

## メタデータ
- **作成日時**: 2026-06-29 17:52
- **タスクID**: namespace-uri-auto-gen-impl
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`docs/20260629_1537_名前空間URI自動採番/PLAN.md` の設計に基づき、
`namespaceUriGenerator.ts` を実装し、wanakana パッケージを追加する。

`DepartmentNodeAddDialog.tsx` と `NamespaceAddDialog.tsx` はすでに
`generateNamespaceUri` をインポート済みのため、ファイル作成のみで動作する。

## 実装ステップ

- [x] タスク計画書作成
- [ ] wanakana パッケージを frontend に追加
- [ ] `frontend/src/utils/namespaceUriGenerator.ts` 新規作成

## 変更ファイル

1. `frontend/package.json` - wanakana パッケージ追加
2. `frontend/src/utils/namespaceUriGenerator.ts` - 新規作成

## URI生成ルール

```
https://{organization_cd}/{department_cd}/{unit_slug}/
```

- チームなし: `https://{org_cd}/{dept_cd}/`
- 組織のみ: `https://{org_cd}/`
- 日本語ユニット名は wanakana でローマ字スラッグ化

## 承認記録
- **承認日時**: 2026-06-29 17:52
