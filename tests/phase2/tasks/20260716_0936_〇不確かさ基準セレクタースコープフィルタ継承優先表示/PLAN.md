# タスク計画書: 不確かさ基準セレクター スコープフィルタ・継承優先表示実装

## メタデータ
- **作成日時**: 2026-07-16 09:36
- **タスクID**: 不確かさ基準セレクタースコープフィルタ継承優先表示
- **優先度**: 高
- **推定工数**: 6時間

---

## 1. タスク概要

不確かさ基準選択ダイアログ（`UncertaintyCriteriaSelectorModal` / `UncertaintyCriteriaSelectorPanel`）において、以下の2点を実装する。

1. **スコープフィルタ**: ログインユーザーの階層（所属グループ ＋ 組織）に属する名前空間の不確かさ基準のみ表示する
2. **継承優先表示（重複排除）**: 表示対象の中で `inheritance_uncertainty_key` に指定されているレコード（継承元）は非表示にし、より下の階層（継承先）を優先表示する

---

## 2. 目的と期待される成果

### 背景・問題

現状は `organization_id` のみでフィルタしているため、組織内の全ユーザー・全グループが作成した不確かさ基準が全件表示されてしまう。

また、A組織の「A:重量」をBチームが継承して「B:重量」を作成した場合、両方が表示されてユーザーが迷う。

### 解決方針

- **スコープフィルタ**: `namespace` テーブルの `user_id`（個人所有）と `department_cd`（グループ所有）を利用し、ログインユーザーが属する名前空間のみを絞り込む
  - ユーザー自身が所有する namespace（`namespace.user_id = ログインユーザID`）
  - ユーザーが所属するグループが所有する namespace（`namespace.department_cd = ユーザーの department_cd`）
  - 組織共通の namespace（`namespace.department_cd IS NULL AND namespace.user_id` が組織代表など ※要確認）
- **継承優先表示**: スコープフィルタ後の一覧の中で、他レコードの `inheritance_uncertainty_key` として参照されているレコードを非表示にする

### 期待される成果

- [ ] Cさん（A組織-Bチーム所属）は `C:重量` / `C:水分量` のみ表示される
- [ ] Dさん（A組織-Bチーム非所属）は `A:重量` / `D:水分量` のみ表示される
- [ ] 継承元レコードが除外され、最下位階層の基準のみ表示される

---

## 3. 認識確認済みの具体例

### 登場人物・階層
```
A組織
├── Bチーム（department_cd = B）
│   └── Cさん（department_cd = B）
└── Dさん（department_cd = D ※Bチーム非所属）
```

### 各不確かさ基準レコード（namespace テーブルの user_id / department_cd で判定）

| uncertainty_key | name_space_id（namespace.prefix）| namespace所有者 | inheritance_uncertainty_key |
|---|---|---|---|
| A:重量 | A | A組織（組織共通） | null |
| B:重量 | B | Bチーム（department_cd=B） | A:重量 |
| C:重量 | C | Cさん（user_id=C） | B:重量 |
| C:水分量 | C | Cさん（user_id=C） | null |
| D:水分量 | D | Dさん（user_id=D） | null |

### 期待される表示結果

| ユーザー | アクセス可能スコープ | フィルタ後（スコープ絞り込み） | 継承元除外後 | 最終表示 |
|---|---|---|---|---|
| Cさん | A（組織共通） + B（department_cd=B） + C（user_id=C） | A:重量, B:重量, C:重量, C:水分量 | A:重量（B:重量に継承）❌, B:重量（C:重量に継承）❌ | **C:重量 / C:水分量** |
| Dさん | A（組織共通） + D（user_id=D） | A:重量, D:水分量 | 継承元なし | **A:重量 / D:水分量** |

---

## 4. 実装ステップ

### Phase 1: 既存コードの調査

- [ ] `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql` の現状確認
- [ ] `backend/src/repositories/uncertaintyCriteriaRepository.ts` の `findForSelector()` 引数・呼び出し方の確認
- [ ] `backend/src/controllers/uncertaintyCriteriaController.ts` でのユーザー情報（`user_id`、`department_cd`）の取得方法確認
- [ ] `namespace` テーブルの組織共通スコープの判定条件確認（`department_cd IS NULL` の場合の扱い）

### Phase 2: バックエンド — `findForSelector.sql` の修正

- [ ] **スコープフィルタ追加**: `namespace` テーブルをJOINし、以下の条件に合致する `name_space_id` のみ対象にする
  ```sql
  -- ユーザーがアクセス可能な namespace に絞り込む
  JOIN namespace ns
    ON ns.organization_id = uc.organization_id
   AND ns.prefix = uc.name_space_id
  WHERE uc.organization_id = $1
    AND uc.is_Invalid = FALSE
    AND (
      ns.user_id = $2              -- 自身が所有する namespace
      OR ns.department_cd = $3     -- 所属グループが所有する namespace
      OR (ns.department_cd IS NULL AND ns.user_id = $4)  -- 組織共通 ※要調整
    )
  ```
  ※組織共通の条件は実際のDBデータを確認して調整する

- [ ] **継承優先表示（重複排除）追加**: スコープフィルタ後の範囲内で、他の有効レコードの `inheritance_uncertainty_key` として参照されているものを除外
  ```sql
  AND NOT EXISTS (
    SELECT 1
    FROM uncertainty_criteria uc2
    JOIN namespace ns2
      ON ns2.organization_id = uc2.organization_id
     AND ns2.prefix = uc2.name_space_id
    WHERE uc2.organization_id  = uc.organization_id
      AND uc2.is_Invalid       = FALSE
      AND uc2.inheritance_uncertainty_key = uc.uncertainty_key
      AND (
        ns2.user_id = $2
        OR ns2.department_cd = $3
        OR (ns2.department_cd IS NULL AND ns2.user_id = $4)
      )
  )
  ```

### Phase 3: バックエンド — Repository の修正

- [ ] `uncertaintyCriteriaRepository.ts` の `findForSelector()` に以下の引数を追加
  - `userId: string` — ログインユーザーID
  - `departmentCd: string | null` — ユーザーの所属グループCD
- [ ] SQLに `$2`（userId）、`$3`（departmentCd）を渡す

### Phase 4: バックエンド — Controller の修正

- [ ] `uncertaintyCriteriaController.ts` の `getForSelector` ハンドラで、`req.user` または認証ミドルウェアから `userId` と `departmentCd` を取得
- [ ] `findForSelector()` に `userId`・`departmentCd` を渡す

### Phase 5: 動作確認

- [ ] ユーザーCでセレクターを開いて `C:重量` / `C:水分量` のみ表示されること
- [ ] ユーザーDでセレクターを開いて `A:重量` / `D:水分量` のみ表示されること
- [ ] 継承していない通常レコードが正常に表示されること

---

## 5. 変更ファイル一覧

### 修正するファイル
1. `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql` — スコープフィルタ + 継承優先排除サブクエリ追加
2. `backend/src/repositories/uncertaintyCriteriaRepository.ts` — `findForSelector()` に `userId`, `departmentCd` 引数追加
3. `backend/src/controllers/uncertaintyCriteriaController.ts` — `userId`, `departmentCd` を取得して渡す処理追加

### フロントエンド（変更なし予定）
- `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx`
- `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx`
- `frontend/src/services/uncertaintyCriteriaApiService.ts`

バックエンドのデータ変更のみで対応可能なため、フロントエンドの修正は不要。

---

## 6. 技術的詳細

### namespace テーブルのスコープ判定キー

```
namespace テーブル
  ├── organization_id  : 組織ID（マルチテナント分離）
  ├── prefix           : 名前空間プレフィックス（= uncertainty_criteria.name_space_id）
  ├── user_id          : 所有ユーザーID（個人所有の場合）
  └── department_cd    : 所有グループCD（グループ所有の場合）
```

**スコープ判定ロジック**:
- `ns.user_id = ログインユーザID` → ユーザー個人が所有する名前空間
- `ns.department_cd = ユーザーのdepartment_cd` → ユーザーが所属するグループが所有する名前空間
- 組織全体共通の名前空間条件 → 実装前にDBデータを確認して決定

### 継承優先排除の仕組み（多段継承にも対応）

```
A:重量（継承元）
  └ B:重量（A:重量を継承）
      └ C:重量（B:重量を継承）

Cさんのスコープ内: A:重量, B:重量, C:重量 が存在
→ A:重量 は B:重量 に継承されているため除外
→ B:重量 は C:重量 に継承されているため除外
→ C:重量 のみ表示 ✅
```

サブクエリの `AND (ns2.user_id = $2 OR ns2.department_cd = $3 ...)` により、**スコープ外の継承先は除外判定に含めない**。これによりDさんのスコープでは `A:重量` が正しく表示される。

---

## 7. リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 組織共通名前空間の判定条件が不明 | 高 | Phase 1 で実際のDBデータを確認してから条件を決定する |
| `req.user` に `department_cd` が含まれていない可能性 | 中 | Controller 確認時に `organization_user` テーブルからの取得方法を確認する |
| スコープフィルタにより意図しない名前空間が除外される | 中 | 手動テストで複数ユーザーのケースを検証する |
| 多段継承（A→B→C）の中間レコードもフィルタ対象 | 低 | サブクエリで自動対応されるため問題なし |

---

## 8. テスト計画

### 手動テスト

- [ ] CさんでログインしてセレクターDialogを開く → `C:重量` / `C:水分量` のみ表示されること
- [ ] DさんでログインしてセレクターDialogを開く → `A:重量` / `D:水分量` のみ表示されること
- [ ] 継承のない通常レコードが正常に表示されること
- [ ] 継承元レコード（`A:重量`）が Cさんのスコープで除外されること
- [ ] 多段継承の中間レコード（`B:重量`）が Cさんのスコープで除外されること
- [ ] 組織共通の名前空間（`A:重量`）が Dさんのスコープで正しく表示されること

---

## 9. 承認記録

- **計画書提示日時**: 2026-07-16 09:36
- **承認日時**: 2026-07-16 09:38
- **承認者コメント**: 承認済み

---

## 10. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] findForSelector.sql — スコープフィルタ + 継承優先排除実装
- [ ] uncertaintyCriteriaRepository.ts — 引数追加
- [ ] uncertaintyCriteriaController.ts — userId / departmentCd 取得処理追加
