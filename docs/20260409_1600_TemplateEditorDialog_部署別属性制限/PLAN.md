# タスク計画書: TemplateEditorDialog attribute 部署別フィルタリング対応

## メタデータ
- **作成日時**: 2026-04-09 16:00
- **更新日時**: 2026-04-09 16:11
- **タスクID**: 20260409_1600_TemplateEditorDialog_部署別属性制限
- **優先度**: 高
- **推定工数**: 2時間

---

## 1. タスク概要

`TemplateEditorDialog.tsx` 内で `NestedPropertyEditor` に渡す `attributeRecords` は、前回タスク（`xsi:type` 制限対応）においてマスタ属性グループのフィルタリングを意図的に除外した。  
しかし、**ログインユーザーの部署と一致するデータ、または部署指定のないデータのみを選択できるようにする制限**が未実装のまま残っていた。

現状では全組織のアクティブな Attribute マスタが無条件で選択肢に表示されてしまう。

---

## 2. 要件

| 画面 | 部署フィルタ | 理由 |
|-----|-----------|------|
| マスタ管理画面（MasterManagement） | **なし** | 全マスタデータを管理・編集するため全件必要 |
| MAIML編集画面（TemplateEditorDialog等） | **あり** | 実験記録時の選択肢をユーザーの部署に絞り込む |

### フィルタ条件（MAIML編集画面）
```
表示する = (record.department_cd = ログインユーザーの department_cd)
            OR
           (record.department_cd IS NULL OR record.department_cd = '')
```

---

## 3. 前提調査結果

### バックエンドセッション情報
- `req.user` には `departmentCd` が含まれている（`backend/src/types/express.d.ts` に定義済み）
- JWT ペイロード（`JwtPayload`）には `departmentCd` が **含まれていない** ため、`req.user.departmentCd` を利用するには JwtPayload への追加 or 別途 DB から取得が必要
- 実際には `backend/src/types/express.d.ts` の Request 拡張型に `departmentCd` が定義されており、authMiddleware でセットされる前提

### Attribute マスタ API 現状
- `GET /api/v1/master/attribute` は `search`, `is_active` クエリパラメータのみ対応
- 部署コードフィルタは未実装
- マスタ管理画面と MAIML 編集画面は同一エンドポイントを使用

---

## 4. 実装方針

### アーキテクチャ方針

**バックエンドの API クエリパラメータでフィルタ有無を制御する**

- 新規クエリパラメータ `apply_department_filter=true` を追加
- `true` の場合: サーバー側で `req.user.departmentCd` を使って自動フィルタリング
- 未指定/`false`: 全件取得（従来動作を維持 → マスタ管理画面に影響なし）
- フロントエンドはフィルタの判定ロジックを持たず、パラメータを渡すだけでよい

### メリット
1. **セキュリティ**: フロントエンドでのフィルタ回避不可
2. **シンプル**: SessionUserInfo の拡張が不要
3. **後方互換性**: パラメータなしで呼び出せばマスタ管理画面はそのまま動作

---

## 5. 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/src/controllers/masterController.ts` | `getAttributes()` で `apply_department_filter` パラメータを受け取り、`req.user.departmentCd` をフィルタに追加 |
| 2 | `backend/src/services/masterService.ts` | `getAttributeMastersWithFilters()` に `departmentCd` フィルタパラメータを追加 |
| 3 | `backend/src/repositories/attributeRepository.ts` | SQL WHERE句に部署フィルタを条件付きで追加 |
| 4 | `frontend/src/services/masterApiService.ts` | `fetchMasters()` で `applyDepartmentFilter` パラメータをクエリ文字列に変換するよう対応 |
| 5 | `frontend/src/hooks/useAttributeMasters.ts` | `fetchAttributeMasters()` 呼び出し時に `applyDepartmentFilter: true` を追加 |

---

## 6. 実装ステップ

### Phase 1: バックエンド — attributeRepository に部署フィルタを追加

**ファイル:** `backend/src/repositories/attributeRepository.ts`

`getAttributeMastersWithFilters()` の SQL に部署フィルタ条件を追加。

```typescript
// filters.departmentCd が指定された場合のみ条件追加
if (filters.departmentCd) {
  conditions.push(`(am.department_cd = $${paramIndex} OR am.department_cd IS NULL OR am.department_cd = '')`);
  params.push(filters.departmentCd);
  paramIndex++;
}
```

### Phase 2: バックエンド — masterService に departmentCd を追加

**ファイル:** `backend/src/services/masterService.ts`

`getAttributeMastersWithFilters()` の `filters` 型に `departmentCd?: string` を追加し、リポジトリに渡す。

### Phase 3: バックエンド — masterController で apply_department_filter を処理

**ファイル:** `backend/src/controllers/masterController.ts`

```typescript
export async function getAttributes(req: Request, res: Response, next: NextFunction) {
  const organizationId = req.user?.organizationId;
  const { search, is_active, apply_department_filter } = req.query;

  const filters: any = {};
  if (search) filters.search = String(search);
  if (is_active !== undefined) filters.isActive = is_active === 'true' || is_active === '1';

  // apply_department_filter=true の場合のみ部署フィルタを適用
  if (apply_department_filter === 'true') {
    filters.departmentCd = req.user?.departmentCd ?? undefined;
  }

  const attributes = await masterService.getAttributeMastersWithFilters(String(organizationId), filters);
  // ...
}
```

### Phase 4: フロントエンド — masterApiService で applyDepartmentFilter を対応

**ファイル:** `frontend/src/services/masterApiService.ts`

`fetchMasters()` のパラメータに `applyDepartmentFilter?: boolean` を追加し、`apply_department_filter=true` としてクエリ文字列に変換する。

```typescript
// 修正前
export async function fetchMasters(
  type: MasterType,
  params?: { isActive?: boolean; search?: string }
): Promise<BaseMasterRecord[]> {
  const query = new URLSearchParams();
  if (params?.isActive !== undefined) query.set('is_active', String(params.isActive));
  if (params?.search) query.set('search', params.search);
  // ...
}

// 修正後
export async function fetchMasters(
  type: MasterType,
  params?: { isActive?: boolean; search?: string; applyDepartmentFilter?: boolean }
): Promise<BaseMasterRecord[]> {
  const query = new URLSearchParams();
  if (params?.isActive !== undefined) query.set('is_active', String(params.isActive));
  if (params?.search) query.set('search', params.search);
  if (params?.applyDepartmentFilter) query.set('apply_department_filter', 'true');
  // ...
}
```

### Phase 5: フロントエンド — useAttributeMasters で applyDepartmentFilter を指定

**ファイル:** `frontend/src/hooks/useAttributeMasters.ts`

```typescript
// 修正前
export async function fetchAttributeMasters(): Promise<AttributeRecord[]> {
  const records = await fetchMasters('attribute', { isActive: true });
  return records as AttributeRecord[];
}

// 修正後
export async function fetchAttributeMasters(): Promise<AttributeRecord[]> {
  const records = await fetchMasters('attribute', { 
    isActive: true, 
    applyDepartmentFilter: true,  // MAIML編集画面用: 部署フィルタを適用
  });
  return records as AttributeRecord[];
}
```

### Phase 6: TypeScript 型チェック

```bash
npx tsc --noEmit --project backend/tsconfig.json 2>&1 | head -50
npx tsc --noEmit --project frontend/tsconfig.json 2>&1 | head -50
```

---

## 7. 技術詳細

### req.user.departmentCd の確認

`JwtPayload`（`backend/src/types/auth.ts`）には `departmentCd` が含まれていないが、`express.d.ts` の Request 拡張型に `departmentCd` が定義されている。  
authMiddleware が JWT デコード後に `req.user` にセットする際、`departmentCd` が正しく設定されているかを事前に確認すること。

**確認が必要な箇所**: `backend/src/services/authService.ts` の verifyPin / login 処理でユーザー情報を JWT に格納する際の `departmentCd` の扱い

### apply_department_filter パラメータを使わない場合の挙動

- `apply_department_filter` なし or `false` → 全件取得（マスタ管理画面のデフォルト動作）
- マスタ管理画面の既存コードは変更不要

---

## 8. リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `req.user.departmentCd` が null/undefined の場合 | 中 | `departmentCd` が未設定の場合は全件表示（フォールバック） |
| `JwtPayload` に `departmentCd` が含まれておらず `req.user` にセットされない場合 | 高 | authService.ts を調査し、`departmentCd` を JWT に含めるか、DB 参照で補完する |
| `attributeRepository.ts` の SQL 変更による既存クエリへの影響 | 低 | `filters.departmentCd` がある場合のみ条件追加のため既存に影響なし |

---

## 9. 関連タスク

- **前提タスク**: `docs/20260409_1124_MAIML編集属性制限対応/` — xsi:type別属性制限（実装済み）
- **本タスクで対応した漏れ**: マスタ属性グループの部署別フィルタリング

---

## 10. 承認記録

- **計画書提示日時（初版）**: 2026-04-09 16:00
- **計画書更新日時（バックエンド中心に修正）**: 2026-04-09 16:11
- **承認日時**: （承認後記入）
