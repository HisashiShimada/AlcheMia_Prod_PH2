# 言語ファイル キー参照チェックレポート

- **作成日時**: 2026-05-15 14:55
- **対象ファイル**: `frontend/src/locales/ja.json` / `frontend/src/locales/en.json`
- **調査対象**: `.tsx` / `.ts` 全ファイル（`frontend/src` 配下）

---

## 1. 全トップレベルキー一覧と参照状況サマリー

| # | トップレベルキー | 参照件数 | 状態 |
|---|---|---|---|
| 1 | `page` | （未個別調査・汎用系） | ✅ 想定使用 |
| 2 | `common` | 多数 | ✅ 使用中 |
| 3 | `languages` | — | ✅ i18n設定用 |
| 4 | `roles` | — | ✅ 使用中 |
| 5 | `menu` | — | ✅ 使用中 |
| 6 | `content` | — | ✅ 使用中 |
| 7 | `experimentRecord` | — | ✅ 使用中 |
| 8 | `experimentWork` | 多数（詳細後述） | ✅ 使用中（一部未使用キーあり） |
| 9 | `formatManagement` | — | ✅ 使用中 |
| 10 | `projectManagement` | — | ✅ 使用中 |
| 11 | `progress` | 77件 | ✅ 使用中 |
| 12 | `issueManagement` | — | ✅ 使用中 |
| 13 | `taskRegistration` | — | ✅ 使用中 |
| 14 | `corporationManagement` | — | ✅ 使用中 |
| 15 | `organizationManagement` | — | ✅ 使用中 |
| 16 | `informationDownload` | — | ✅ 使用中 |
| 17 | `systemOverview` | — | ✅ 使用中 |
| 18 | `userManagement` | — | ✅ 使用中 |
| 19 | `departmentManagement` | — | ✅ 使用中 |
| 20 | `roleManagement` | — | ✅ 使用中 |
| 21 | `sessionManagement` | — | ✅ 使用中 |
| 22 | `masterManagement` | — | ✅ 使用中 |
| 23 | `functionPermissionDialog` | — | ✅ 使用中 |
| 24 | `organizationStatistics` | — | ✅ 使用中 |
| 25 | `instructionRegistration` | 30件 | ✅ 使用中 |
| 26 | `transitionSearch` | — | ✅ 使用中 |
| 27 | `instructionConfirmation` | 55件 | ✅ 使用中 |
| 28 | `workProgressDetail` | 2件 | ✅ 使用中 |
| 29 | `instructionType` | **0件** | ⚠️ **未使用** |
| 30 | `roleFunctionPermission` | — | ✅ 使用中 |
| 31 | `formatFolderTree` | — | ✅ 使用中 |
| 32 | `draftManager` | — | ✅ 使用中 |
| 33 | `instructionEditDialog` | — | ✅ 使用中 |
| 34 | `saveConfirmDialog` | — | ✅ 使用中 |
| 35 | `auth` | — | ✅ 使用中 |
| 36 | `editor` | — | ✅ 使用中 |
| 37 | `errors` | — | ✅ 使用中 |
| 38 | `progressStatus` | 7件 | ✅ 使用中（DataRecordDialog） |
| 39 | `formatters` | — | ✅ 使用中 |
| 40 | `apiClient` | — | ✅ 使用中 |
| 41 | `formatApi` | — | ✅ 使用中 |
| 42 | `project` | — | ✅ 使用中 |
| 43 | `worker` | 23件（詳細後述） | ✅ 使用中（一部未使用キーあり） |
| 44 | `task` | 6件 | ✅ 使用中（TaskSelectionDialog） |
| 45 | `upload` | — | ✅ 使用中 |
| 46 | `file` | — | ✅ 使用中 |
| 47 | `xmlViewer` | — | ✅ 使用中 |
| 48 | `document` | — | ✅ 使用中 |
| 49 | `instruction` | 10件 | ✅ 使用中（InstructionEditDialog） |
| 50 | `nestedPropertyEditor` | — | ✅ 使用中 |
| 51 | `template` | — | ✅ 使用中 |
| 52 | `formatSearch` | — | ✅ 使用中 |
| 53 | `formatTree` | — | ✅ 使用中 |
| 54 | `formatEditor` | — | ✅ 使用中 |
| 55 | `viewer` | — | ✅ 使用中 |
| 56 | `property` | — | ✅ 使用中 |
| 57 | `maimlPublish` | — | ✅ 使用中 |
| 58 | `maimlUnpublish` | — | ✅ 使用中 |
| 59 | `createFormatModal` | — | ✅ 使用中 |
| 60 | `format` | — | ✅ 使用中 |

---

## 2. 問題キーの詳細

### 2-1. `instructionType` セクション ⚠️ 未使用（削除候補）

```
"instructionType": { ... }  // ja.json L1583
```

- **参照件数**: 0件（`t('instructionType.')` の参照なし）
- **内容**: type名のラベル群（general/setup/measurement/safety/cleanup）
- **重複**: `instruction.type.*` および `instructionRegistration.type.*` と内容が重複
- **判定**: **削除候補**（ただし動的キー生成での参照がないか確認要）

---

### 2-2. `experimentWork.status` サブキー ⚠️ 未使用

```json
"experimentWork": {
  "status": {
    "notStarted": "未着手",
    "started": "着手",
    "inProgress": "進行中",
    "completed": "完了",
    "forcedTerminated": "強制終了",
    "suspended": "中断"
  }
}
```

- **参照件数**: 0件（`t('experimentWork.status.')` の参照なし）
- **重複**: `task.status.*` と同内容（`forceTerminated` vs `forcedTerminated` の微差あり）
- **`task.status.*`の参照**: `TaskSelectionDialog.tsx` で6件参照（`task.status.forceTerminated`）
- **判定**: **削除候補**（`task.status.*` に統一済み）

---

### 2-3. `worker` セクション内の重複キー ⚠️

| 未使用キー | 重複している有効キー | 参照件数 |
|---|---|---|
| `worker.selectProjectFirst` | `worker.selectProjectPlease` | 0件 |
| `worker.selectMethodFirst` | `worker.selectMethodPlease` | 0件 |
| `worker.noTasksInMethod` | `worker.noTasksForMethod` | 0件 |

- 同一内容のキーが2種類存在（`First`系 vs `Please`系 / `InMethod`系 vs `ForMethod`系）
- `Please`系・`ForMethod`系が実際に使用されており、`First`系・`InMethod`系は未参照
- **判定**: `selectProjectFirst` / `selectMethodFirst` / `noTasksInMethod` は**削除候補**

---

### 2-4. `experimentWork.messages` 内のキー ✅ 正常

| キー | 参照件数 | 状態 |
|---|---|---|
| `selectProjectAndMethod` | 1件 | ✅ |
| `noTasksFound` | 1件 | ✅ |
| `taskListFetched` | 1件 | ✅ |
| `taskNotFound` | 3件 | ✅ |
| `taskUpdatedAtMissing` | 2件 | ✅ |
| `taskStarted` | 1件 | ✅ |
| `taskStartFailed` | 1件 | ✅ |
| `taskStartForbidden` | 1件 | ✅ |
| `taskConflict` | 2件 | ✅ |
| `refreshFailed` | 2件 | ✅ |
| `taskStartError` | 1件 | ✅ |
| `goToInstructionTab` | 2件 | ✅ |
| `goToRecordTab` | 2件 | ✅ |
| `taskForceTerminated` | 1件 | ✅ |
| `taskForceTerminateFailed` | 1件 | ✅ |
| `taskForceTerminateForbidden` | 1件 | ✅ |
| `taskForceTerminateError` | 1件 | ✅ |
| `unknownAction` | 1件 | ✅ |
| `taskUpdateFailed` | 1件 | ✅ |

全19キー正常参照確認済み。

---

### 2-5. `instruction.type.cleanup` ✅ 正常

- `InstructionEditDialog.tsx` で `t('instruction.type.cleanup')` を1件参照 ✅
- `instruction.priority.*`（high/medium/normal/low）も同ファイルで4件参照 ✅

---

### 2-6. `instructionRegistration.priority` / `.type` ✅ 正常（数値・文字列混在は意図的）

```json
"priority": {
  "0": "低", "1": "通常", "2": "中", "3": "高",
  "high": "高", "medium": "中", "normal": "通常", "low": "低"
},
"type": {
  "0": "一般", "1": "セットアップ", "2": "測定", "3": "安全", "4": "清掃",
  "general": "一般", "setup": "セットアップ", ...
}
```

- `instructionRegistration` 参照コンポーネント（`InstructionRegistrationTab.tsx`）はカラムタイトル等を使用
- 数値キー（`"0"〜"3"`）はバックエンドから数値で返る場合のラベル用
- 文字列キー（`high`等）はEnum値で参照する場合用
- **判定**: 意図的な二重定義のため現状維持

---

### 2-7. `task.status.*` ✅ 正常（`forceTerminated` に注意）

`TaskSelectionDialog.tsx` での参照キー:

| 参照キー | 対応バックエンド値 | ja.json キー |
|---|---|---|
| `task.status.notStarted` | — | `notStarted` ✅ |
| `task.status.started` | — | `started` ✅ |
| `task.status.inProgress` | `in_progress` | `inProgress` ✅ |
| `task.status.completed` | — | `completed` ✅ |
| `task.status.suspended` | — | `suspended` ✅ |
| `task.status.forceTerminated` | `forced_terminated` | `forceTerminated` ✅ |

全6キー正常。（※`experimentWork.status.forcedTerminated` は `forceTerminated` と表記が違うが、`experimentWork.status` 自体が未使用なので影響なし）

---

## 3. 今後対応が必要な項目（残課題）

| 優先度 | キー | 対応内容 |
|---|---|---|
| 中 | `instructionType` セクション（L1583〜L1594） | 動的参照がないことを最終確認の上、**削除推奨** |
| 中 | `experimentWork.status` サブキー（L250〜L257） | 未使用のため**削除推奨** |
| 低 | `worker.selectProjectFirst` / `selectMethodFirst` / `noTasksInMethod` | 重複未使用キーのため**削除推奨** |

> ⚠️ 削除前に動的キー生成（テンプレートリテラルでのキー参照）がないか追加確認を推奨

---

## 4. 今回タスクで対応済みの項目

| 項目 | 内容 |
|---|---|
| Phase 1 | en.json の snake_case 旧 `progressStatus` ブロック削除 |
| Phase 2 | `instructionRegistration.priorityLabels` / `typeLabels` 削除（ja/en両方） |
| Phase 3 | `progress` セクションのワーカー用メッセージを `experimentWork.messages` に移動、コンポーネント参照更新 |
| Phase 4 | トップレベル `taskStatus` セクション削除（参照なし確認済み） |
| Phase 5 | `progress.status` / `progress.progressStatus` は使用中のため現状維持 |
| Phase 6 | ビルド確認（Compiled successfully） |
