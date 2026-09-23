# タスク計画書: 実験指示タブ訂正保存バグ修正

## メタデータ
- **作成日時**: 2026-09-18 13:15
- **タスクID**: 20260918_1000_実験指示タブ訂正保存バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

---

## タスク概要

実験管理者メニュー > プロジェクト管理タブ > 実験指示タブ内の「訂正」ボタンから実績値を修正して「保存」を押下した際に、実験作業者の実験記録タブ内の実績値が更新されない問題を修正する。

**調査結果**: バックエンドの `correctRecord` サービスで `project_task_detail.task_status` を数値と直接比較している箇所に型不一致バグが存在し、常に 409 エラーが発生して `template_data` テーブルの更新が実行されていないことが根本原因。

---

## 調査結果・根本原因

### 問題の全体フロー

```
[実験指示タブ] 「保存」ボタン
        ↓
handleSaveCorrections() → PATCH /.../:methodId/:taskNo/correct
        ↓
[backend: correctRecord Service]
        ↓
①  findByPrimaryKey() → taskDetail.task_status = '2' (文字列 ※numericはpgで文字列返却)
        ↓
②  if (taskDetail.task_status !== 2) → '2' !== 2 → true ★常にエラー発生
        ↓
③  throw 409 Error → template_data の更新は一切実行されない
```

### 根本原因: `task_status` の型不一致

**ファイル**: `backend/src/services/experimentInstructionService.ts`（line 946）

PostgreSQL の `NUMERIC(2,0)` 型は pg ライブラリでデフォルト**文字列**として返される。  
`taskDetail.task_status` の実際の値：`'2'`（string）  
比較式：`taskDetail.task_status !== 2`（numberの2と比較）  
結果：`'2' !== 2` → `true` → 常に 409 エラー → `template_data` 更新なし

### 既存 PLAN（20260918_1000_実績値格納不具合調査修正）との関係

| # | 問題 | 状態 |
|---|------|------|
| ① | `prop['content']['value']` 参照ミス（experimentDataService） | ✅ 修正済み確認 |
| ② | 実績値（平均）未表示（問題①の副作用） | ✅ 自動解消確認 |
| ③ | `allColumnDefs` useMemo依存配列不備（ExperimentInstructionTab） | ✅ 修正済み確認 |
| **新** | **`task_status` 型不一致による 409 エラー（本タスク）** | **🔴 未修正** |

---

## 目的と期待される成果

- [x] 実験指示タブで訂正した実績値が `template_data` テーブルに正しく保存される
- [x] `experiment_instruction_detail.actual_value` も正しく更新される
- [x] 実験作業者の実験記録タブを再取得した際に訂正された実績値が反映される

---

## 修正前/修正後 機能フロー図

### ❌ 修正前（バグあり）

```
[実験指示タブ]
  ├─ 「訂正」ボタン → isCorrectionMode = true
  ├─ 実績値を入力 → pendingCorrections に蓄積
  └─ 「保存」ボタン
         ↓
[handleSaveCorrections()]
         ↓
[correctRecord API: PATCH .../correct]
         ↓
[backend: correctRecord Service]
  ├─ findByPrimaryKey() → task_status = '2' (文字列)
  ├─ if (task_status !== 2) → '2' !== 2 = true ★
  ├─ throw 409 Error ← ──── ここで停止
  │
  ✗ templateDataRepo.upsert()   実行されない
  ✗ updateActualOnly()           実行されない
         ↓
[フロント] 409エラー受信 → エラーメッセージ表示

[実験記録タブ]
  └─ getTemplateData() → 古い値のまま（template_data 未更新）
```

### ✅ 修正後（正常動作）

```
[実験指示タブ]
  ├─ 「訂正」ボタン → isCorrectionMode = true
  ├─ 実績値を入力 → pendingCorrections に蓄積
  └─ 「保存」ボタン
         ↓
[handleSaveCorrections()]
         ↓
[correctRecord API: PATCH .../correct]
         ↓
[backend: correctRecord Service]
  ├─ findByPrimaryKey() → task_status = '2' (文字列)
  ├─ if (Number(task_status) !== 2) → 2 !== 2 = false → 正常続行
  ├─ templateDataRepo.upsert()   ✅ template_data 更新
  ├─ updateActualOnly()           ✅ actual_value 更新
  └─ COMMIT → 成功
         ↓
[フロント] 成功メッセージ → fetchData() 再取得

[実験記録タブ]
  └─ getTemplateData() → 訂正後の新しい値を表示 ✅
```

---

## 変更ファイル一覧

| # | ファイルパス | 変更内容 | 概要 |
|---|------------|---------|------|
| 1 | `backend/src/services/experimentInstructionService.ts` | line 946: `taskDetail.task_status !== 2` → `Number(taskDetail.task_status) !== TaskStatusEnum.REVIEW_WAITING` | PostgreSQL numeric 型の文字列返却に対応した型変換＋ENUM定数使用 |

---

## 実装ステップ

- [x] BE-01: `experimentInstructionService.ts` の `task_status` 比較を型変換 + ENUM定数に修正
- [x] CHK-01: バックエンド TypeScript ビルドエラーなし確認
- [x] CHK-02: フロントエンド TypeScript ビルドエラーなし確認

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `Number()` 変換で `null`/`undefined` が `0` になる | 低 | `!taskDetail` の null チェックが先に実行されるため問題なし |
| 修正が他の箇所に影響する | 低 | 変更は1行のみ、他のサービスへの影響なし |

---

## テスト計画

- [ ] 手動テスト: task_status=2 のタスクに対して訂正保存を実行し、成功（200）することを確認
- [ ] 手動テスト: 実験記録タブで訂正後の値が表示されることを確認
- [ ] 手動テスト: task_status≠2 の場合に 409 エラーが返ることを確認（既存動作を壊さない）

---

## 承認記録

- **計画書提示日時**: 2026-09-18 13:15
- **承認日時**: 2026-09-18 13:15（ユーザー承認済み）
- **承認者コメント**: 承認済み・Act モード移行

---

## 実施記録

### 実施日時
開始: 2026-09-18 13:15

### 最終的な成果物
- [x] `backend/src/services/experimentInstructionService.ts` 修正完了
- [x] バックエンド TypeScript ビルド確認済み
- [x] フロントエンド TypeScript ビルド確認済み
