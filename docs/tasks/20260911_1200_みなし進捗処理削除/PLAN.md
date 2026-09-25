# タスク計画書: みなし進捗処理削除

## メタデータ
- **作成日時**: 2026-09-11 12:00
- **タスクID**: 20260911_1200_みなし進捗処理削除
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## タスク概要

`saveBatchData`（保存ボタン押下時のメインAPI）の処理内で実行されている
`updateDeemedProgress` 関数を**完全削除**し、関連する不要コードをすべて整理する。

この処理は保存のたびに以下を逐次実行しており、レスポンス遅延の最大要因となっている。

1. DB クエリ（みなし進捗フラグ取得）
2. **S3/Swift からの MAIMLファイルダウンロード**（外部ネットワーク通信）
3. XML パース（MaimlParserTyped）
4. ペトリネット構造解析（全アークループ）
5. DB クエリ x 複数（件数カウント・ステータス取得・transition_data 更新・イベントログ INSERT）

また前提として、みなし進捗フラグが `false` の組織では手動での進捗率入力 UI が
既になくなっているため `progress_rate` は更新されない状態になっており、
`progress_rate` 自体を将来削除予定であることも踏まえ、今回の削除が適切と判断する。

---

## 目的と期待される成果

- [ ] 保存ボタン押下から成功メッセージ表示までの応答時間を短縮する
- [ ] `updateDeemedProgress` 関数本体および呼び出し箇所を削除する
- [ ] `TransitionDataRepository.updateStatusDeemed` メソッドを削除する（呼び出し元がなくなるため）
- [ ] みなし進捗のみで使用していた import を整理する
- [ ] TypeScript コンパイルエラーがないことを確認する

> **今回スコープ外**（将来の別タスク）
> - `use_deemed_progress` DB カラム・フロントエンドのフラグ参照の削除
> - `progress_rate` DB カラムおよびフロントエンドの進捗率表示（TransitionFlowNode.tsx 等）の削除
> - `getUseDeemedProgress` 関数の削除（organizationRepository.ts）

---

## フェーズ構成

### フェーズ 1（今回実施）: 呼び出しをコメントアウトして効果確認

`updateDeemedProgress(...)` の呼び出しブロックをコメントアウトし、
**保存レスポンスへの改善効果を目視で確認する**。
コードは残るため、問題があればコメントアウトを外すだけで即座に戻せる。

### フェーズ 2（効果確認後に実施）: 完全削除・クリーンアップ

フェーズ 1 で効果が確認できた後、関数本体・メソッド・不要 import を完全削除する。

---

## 実装ステップ

### フェーズ 1: 呼び出しコメントアウト

#### Step 1-1: experimentDataService.ts — 呼び出し箇所をコメントアウト

`backend/src/services/experimentDataService.ts`

- [x] 156〜167行目の `updateDeemedProgress(...)` 呼び出しブロックをコメントアウト

変更後イメージ:
```typescript
      // TODO: みなし進捗処理削除（フェーズ2で関数本体ごと削除予定）
      // 4. みなし進捗の更新（use_deemed_progress = true の組織のみ）
      // await updateDeemedProgress(
      //   organizationId,
      //   projectId,
      //   projectName,
      //   methodId,
      //   taskNo,
      //   savedRecords,
      //   recordedBy,
      //   pool,
      //   client
      // );
```

#### Step 1-2: 動作確認

- [ ] 開発環境で保存ボタンを押下し、成功メッセージが従来より早く表示されることを目視確認

---

### フェーズ 2: 完全削除・クリーンアップ

#### Step 2-1: experimentDataService.ts — 呼び出しブロックを完全削除

- [ ] フェーズ 1 でコメントアウトした `updateDeemedProgress(...)` 呼び出しブロック（コメントごと）を削除

#### Step 2-2: experimentDataService.ts — 関数本体を削除

- [ ] `updateDeemedProgress` 関数本体（883〜1190行目付近）を丸ごと削除

#### Step 2-3: experimentDataService.ts — import の整理

以下の import がみなし進捗処理のみで使用されているか確認し、他で使われていなければ削除する。

- [ ] `getUseDeemedProgress`（../repositories/organizationRepository）
  - 使用箇所: `updateDeemedProgress` 内のみ → **削除**
- [ ] `TransitionStatusEnum`（../types/transitionData）
  - 使用箇所: `updateDeemedProgress` 内のみか確認 → 他で使用なければ **削除**
- [ ] `TransitionStatus` 型（../types/transitionData）
  - 使用箇所: `updateDeemedProgress` 内のみか確認 → 他で使用なければ **削除**
- [ ] `TransitionDataRepository`（../repositories/transitionDataRepository）
  - 使用箇所: `updateDeemedProgress` 内 + `saveBatchData` 内 Step5（updateIsRecorded）でも使用 → **残す**
- [ ] `EventLogRepository`（../repositories/eventLogRepository）
  - 使用箇所: `updateDeemedProgress` 内のみか確認 → 他で使用なければ **削除**
- [ ] `Pool`、`PoolClient` 型（pg）
  - `updateDeemedProgress` の引数で使用 → 削除後に他で使用なければ **削除**
- [ ] `MaimlParserTyped`（../utils/maimlParserTyped）
  - `getTemplateData` でも使用 → **残す**
- [ ] `resolveMaimlFilePath`（../utils/maimlPathResolver）
  - `getTemplateData` でも使用 → **残す**
- [ ] `getStorageService`（./storageService）
  - `getTemplateData` でも使用 → **残す**

#### Step 2-4: transitionDataRepository.ts — updateStatusDeemed メソッドの削除

`backend/src/repositories/transitionDataRepository.ts`

- [ ] `updateStatusDeemed` メソッド本体（315〜348行目）を削除
  - 呼び出し元が `experimentDataService.ts` のみであり、Step 2-1・2-2 で削除済みになるため

#### Step 2-5: TypeScript コンパイル確認

- [ ] `cd maiml_viewer/backend && npx tsc --noEmit` を実行してエラーがないことを確認

---

## 変更ファイル一覧

| No | ファイル | フェーズ1 | フェーズ2 |
|----|---------|---------|---------|
| 1 | `backend/src/services/experimentDataService.ts` | 呼び出しをコメントアウト | 呼び出し削除・関数本体削除・不要 import 削除 |
| 2 | `backend/src/repositories/transitionDataRepository.ts` | なし | `updateStatusDeemed` メソッド削除 |

---

## 影響範囲

- `saveBatchData` の処理フローからみなし進捗ブロックが除外される
- `updateStatusDeemed` は `experimentDataService.ts` からのみ呼ばれており、他への影響なし
- `insertTransitionProgressLog` は `progressService.ts`・`projectService.ts` でも引き続き使用されるため変更なし
- フロントエンドの変更なし
- DB スキーマの変更なし（`progress_rate` カラム・`use_deemed_progress` カラムは残る）

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| みなし進捗フラグが true の組織で `transition_data.progress_rate` が更新されなくなる | 低 | フラグが false の組織では既に更新されていないため実質的影響なし。フロントでの進捗率表示は将来削除予定 |
| `TransitionStatusEnum` 等の import 削除で他箇所に影響 | 低 | Step 2-3 で他使用箇所を確認してから削除する |
| `experimentDataService` 関連テストでみなし進捗をモックしているテストが壊れる | 低〜中 | フェーズ 2 実施時に tsc エラーおよびテストを確認し、該当テストがあれば合わせて修正 |
| フェーズ 1 コメントアウト後に想定外の問題が発生する | 低 | コメントアウトを外すだけで即座に戻せる |

---

## テスト計画

### フェーズ 1
- [ ] 開発環境で保存ボタンを押下し、成功メッセージが従来より早く表示されることを目視確認

### フェーズ 2
- [ ] `npx tsc --noEmit` でコンパイルエラーなし
- [ ] 開発環境で保存ボタンを押下し、正常動作することを確認

---

## 承認記録
- **計画書提示日時**: 2026-09-11 12:00
- **承認日時**: -
- **承認者コメント**: -
