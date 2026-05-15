# タスク計画書: 言語ファイル整理

## メタデータ
- **作成日時**: 2026-05-15 13:59
- **タスクID**: i18n-cleanup
- **優先度**: 中
- **推定工数**: 3〜4時間

---

## 1. タスク概要

`frontend/src/locales/ja.json` / `en.json` の翻訳キーを整理する。  
主な問題は以下の3点：

1. **分類箇所の誤り** — ワーカー用メッセージが `progress`（管理者用）セクションに置かれている
2. **同一ステータスが複数箇所で定義され内容が不一致** — タスクステータス・進捗ステータス等
3. **キーの重複・命名揺れ** — 数値キーとラベルキーの二重定義、`cleanup` vs `cleaning` など

---

## 2. 問題箇所の詳細分析

### 問題 A: en.json の progressStatus 重複 ✅ 修正済み
`en.json` L1597〜L1604 に snake_case の古い `progressStatus` ブロックが残存（**削除済み**）。

---

### 問題 B: タスクステータスが3箇所に分散・内容不一致

| セクション | キー命名 | 値（ja） | 備考 |
|---|---|---|---|
| `experimentWork.status` | camelCase | notStarted/started/inProgress/completed/forcedTerminated/suspended | ワーカー画面向け |
| `taskStatus` | snake_case | not_started/started/in_progress/suspended/forced_terminated/completed | トップレベル独立 |
| `task.status` | camelCase | notStarted/started/inProgress/completed/suspended/forceTerminated | `task` セクション内 |

**問題点：**
- `forcedTerminated`（experimentWork）vs `forceTerminated`（task.status）— キー名不一致
- `taskStatus` が snake_case で他と不統一
- 3箇所で同じ内容を管理しており、変更時に全箇所修正が必要

**方針：** `task.status` に一本化（camelCase）。`taskStatus` と `experimentWork.status` を削除し、参照コンポーネントのキーを `task.status.*` に統一。

---

### 問題 C: 指示の priority / type が重複・不整合

**priority（ja.json）：**

| セクション | キー | ja値 |
|---|---|---|
| `instructionRegistration.priority` | "0"〜"3" + high/medium/normal/low | 混在（重複） |
| `instructionRegistration.priorityLabels` | "0"〜"3" | 数値キーのみ（重複） |
| `instruction.priority` | high/medium/normal/low | 文字列キーのみ |

→ `instructionRegistration.priority` に数値キーと文字列キーが両方ある（重複）  
→ `priorityLabels` は `priority` の数値部分と完全重複

**type（ja.json）：**

| セクション | キー | ja値 |
|---|---|---|
| `instructionRegistration.type` | "0"〜"4" + general/setup/measurement/safety/cleanup | 混在（重複） |
| `instructionRegistration.typeLabels` | "0"〜"4" | 数値キーのみ（重複） |
| `instruction.type` | general/setup/measurement/safety/**cleaning** | 文字列キーのみ |

→ `cleanup` と `cleaning` で **日本語値は同じ「清掃」だがキー名が違う**（参照箇所の不統一）  
→ `typeLabels` は `type` の数値部分と完全重複

**en.json でも同様：**
- `instructionRegistration.type.cleanup` = "Cleanup"
- `instruction.type.cleaning` = "Cleaning" (en値も違う！)

**方針：**
- `priorityLabels` は `priority` の数値部分と同一 → 削除して `priority["0"]` で代用
- `typeLabels` も同様に削除
- `cleanup` に統一（`instruction.type.cleaning` → `cleanup` に変更）
- 数値キーと文字列キーの両方を残す（バックエンドから数値で来る場合と文字列で来る場合が混在するため）

---

### 問題 D: progress セクションのメッセージ誤配置

`progress` セクション（進捗モニタリング = 管理者向け）の末尾 L706〜L736（ja）に以下の**ワーカー操作メッセージ**が誤配置：

```
taskListFetched / taskNotFound / taskUpdatedAtMissing /
taskStarted / taskStartFailed / taskStartForbidden / taskConflict /
refreshFailed / taskStartError / goToInstructionTab / goToRecordTab /
taskForceTerminated / taskForceTerminateFailed / taskForceTerminateForbidden /
taskForceTerminateError / unknownAction / taskUpdateFailed /
maimlNotFound / fileInfoFetchFailed
```

**参照コンポーネント:**
- `ExperimentWorker/ProgressCheckTab.tsx` — 主な参照元（ワーカー）
- `ExperimentWorker/ProgressCheckTable.tsx` — `maimlNotFound`, `fileInfoFetchFailed`
- `progress/ProgressMonitoring.tsx` — `maimlNotFound`, `fileInfoFetchFailed` のみ

**方針：**
- `maimlNotFound` / `fileInfoFetchFailed` は管理者・ワーカー両方が参照 → `progress` セクション内に残す（共通キーとして）
- その他の task 操作系メッセージを `experimentWork.messages` に移動
- コンポーネント参照キーを `progress.xxx` → `experimentWork.messages.xxx` に変更

---

### 問題 E: progress.status と progress.progressStatus の二重定義

`progress` セクション内に：
- `progress.progressStatus` — camelCase: completed/inProgress/notStarted（3値のみ）
- `progress.status` — snake_case: completed/in_progress/preparing/suspended/abnormal/not_started（6値）

**対象コンポーネントの参照確認が必要（要調査）**

---

### 問題 F: instruction.type.cleanup の en 値不一致

`instructionRegistration.type.cleanup` = "Cleanup"（en）  
`instruction.type.cleaning` = "Cleaning"（en）  
→ 同じ「清掃」を表すが英語表記が違う。`cleanup` / "Cleanup" に統一。

---

## 3. 実装ステップ

### Phase 1: progressStatus 重複キー解消 ✅ 完了
- [x] en.json の snake_case 旧 progressStatus ブロック（L1597〜L1604）を削除

### Phase 2: priorityLabels / typeLabels 削除（重複除去） ✅ 完了
- [x] `instructionRegistration.priorityLabels` を ja.json・en.json から削除
- [x] `instructionRegistration.typeLabels` を ja.json・en.json から削除
- [x] `instruction.type.cleaning` → すでに存在しない（完了済み）
- [x] 参照コンポーネントに `priorityLabels` / `typeLabels` の参照なし（変更不要）

### Phase 3: progress セクションのメッセージ整理 ✅ 完了（前回セッションで実施済み）
- [x] task操作系メッセージ（17件）は `experimentWork.messages` 配下に配置済み
- [x] `maimlNotFound` / `fileInfoFetchFailed` は `progress` セクションに残存（共通キー）
- [x] `ExperimentWorker/ProgressCheckTab.tsx` → `experimentWork.messages.*` を参照済み
- [x] `ExperimentWorker/ProgressCheckTable.tsx` → `progress.maimlNotFound` / `progress.fileInfoFetchFailed` のみ参照（正しい）

### Phase 4: taskStatus 統合 ✅ 完了
- [x] `task.status` に camelCase で一本化する方針を確認
- [x] `taskStatus`（トップレベル）の参照コンポーネントを調査（参照なし）
- [x] `experimentWork.status` の参照コンポーネントを調査（参照なし）
- [x] 不要になった `taskStatus` セクションを ja.json / en.json から削除

### Phase 5: progress.status / progress.progressStatus 整理 ✅ 調査完了・現状維持
- [x] 各セクションの参照コンポーネントを調査
  - `progressStatus.*` → `DataRecordDialog.tsx` でトランジションステータス7値を参照中（削除不可）
  - `progress.status.*` / `progress.progressStatus.*` → 進捗管理画面で使用中（削除不可）
- 結論: 両セクションとも現役のため整理対象外

### Phase 6: ビルド確認 ✅ 完了
- [x] `npm run build` でビルドエラーなし（Compiled successfully in 18.8s）

---

## 4. 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `frontend/src/locales/ja.json` | Phase 2〜5 に対応するキー整理 |
| `frontend/src/locales/en.json` | Phase 2〜5 に対応するキー整理 |
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | Phase 3: t('progress.xxx') → t('experimentWork.messages.xxx') |
| `frontend/src/components/ExperimentWorker/ProgressCheckTable.tsx` | Phase 3: 共通キー以外を変更（共通キーはそのまま） |
| その他 `instructionRegistration` 参照コンポーネント | Phase 2: priorityLabels/typeLabels → priority/type |

---

## 5. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| 参照キー変更漏れ | 翻訳が空になる | search_files で全参照を洗い出す |
| `taskStatus` 削除でバグ | 画面が壊れる | 削除前に全参照を確認 |
| en/ja の対称性崩れ | 片方だけ修正してもう片方が残る | 両ファイルを同時に修正 |

---

## 6. 承認記録

- **計画書提示日時**: 2026-05-15 13:59
- **承認日時**: —（承認待ち）
