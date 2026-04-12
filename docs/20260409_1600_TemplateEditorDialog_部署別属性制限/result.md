# 実装結果: TemplateEditorDialog 部署別属性制限対応

## 概要

`TemplateEditorDialog.tsx` で使用される attribute 選択肢を、**ログインユーザーの部署に紐づくデータ、または部署指定なしのデータのみ**に絞り込む対応を実施した。

---

## 対象の問題

`TemplateEditorDialog` → `NestedPropertyEditor` → `useAttributeMasters` フックを通じて取得される Attribute マスタデータが、全部署のデータを返していた。  
マスタ管理画面では全件表示が正しいが、エディタ画面ではログインユーザーの部署に関係するデータのみ表示すべきだった。

---

## 変更ファイル一覧

| No | ファイル | 変更種別 | 変更内容 |
|----|----------|----------|----------|
| 1 | `backend/src/repositories/attributeRepository.ts` | 修正 | `findAllWithFilters()` の `filters` 型に `departmentCd?: string` を追加。`departmentCd` が指定された場合、`department_cd = $N OR department_cd IS NULL OR department_cd = ''` の条件を WHERE 句に追加 |
| 2 | `backend/src/services/masterService.ts` | 修正 | `getAttributeMastersWithFilters()` の `filters` 引数型に `departmentCd?: string` を追加し、Repository に透過的に渡す |
| 3 | `backend/src/controllers/masterController.ts` | 修正 | `getAttributes()` で `apply_department_filter` クエリパラメータを受け取り、`true` の場合は `req.session.departmentCd` を取得して `filters.departmentCd` にセットする |
| 4 | `frontend/src/services/masterApiService.ts` | 修正 | `fetchAttributeMasters(applyDepartmentFilter?: boolean)` に引数を追加。`true` の場合はクエリパラメータに `apply_department_filter=true` を付与して API を呼び出す |
| 5 | `frontend/src/hooks/useAttributeMasters.ts` | 修正 | `fetchAttributeMasters(true)` を呼び出すよう変更（部署フィルタを常時適用） |

---

## 実装の詳細

### フィルタ適用ロジック（バックエンド）

```sql
-- departmentCd が指定された場合に追加される条件
AND (a.department_cd = $N OR a.department_cd IS NULL OR a.department_cd = '')
```

- `department_cd` がログインユーザーの部署コードと一致するレコード
- `department_cd` が NULL のレコード（部署指定なし）
- `department_cd` が空文字のレコード（部署指定なし）

### 部署コードの取得元

`req.session.departmentCd` を使用。セッションはログイン時に設定済み。

### マスタ管理画面への影響なし

`apply_department_filter` パラメータを送信しない場合（マスタ管理画面）はフィルタが適用されず、全件取得となる。既存動作は変わらない。

---

## 動作フロー

```
[TemplateEditorDialog]
  └─ [useAttributeMasters フック]
       └─ fetchAttributeMasters(true)
            └─ GET /api/v1/master/attribute?is_active=true&apply_department_filter=true
                 └─ [masterController.getAttributes]
                      └─ req.session.departmentCd を取得
                           └─ [masterService.getAttributeMastersWithFilters]
                                └─ [attributeRepository.findAllWithFilters]
                                     └─ WHERE department_cd = '{部署CD}'
                                            OR department_cd IS NULL
                                            OR department_cd = ''
```

---

## TypeScript 型チェック結果

| 対象 | 結果 |
|------|------|
| バックエンド (`npx tsc --noEmit`) | ✅ エラーなし |
| フロントエンド (`npx tsc --noEmit`) | ✅ 今回変更ファイルにエラーなし（他は実装前から存在する既存エラー） |

---

## 完了日時

2026-04-09 16:40
