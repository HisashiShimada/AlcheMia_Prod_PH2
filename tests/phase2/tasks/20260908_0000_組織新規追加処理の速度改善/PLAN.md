# タスク計画書: 組織新規追加処理の速度改善

## メタデータ
- **作成日時**: 2026-09-08 00:00
- **タスクID**: 組織新規追加処理の速度改善
- **優先度**: 中
- **推定工数**: 1時間

---

## 1. タスク概要

`organizationManagement` 画面から組織を新規追加する際の処理時間が遅く、またばらつきがある問題を調査した結果、以下の3点を修正する。

1. **S3/Swift フォルダ作成の直列処理** — `createFolders` が6回の HTTP リクエストを直列で発行しているため、`Promise.all` で並列化する
2. **namespace URI の二重登録** — タスク `20260730_1528_組織作成時namespace同時作成` でトランザクション内（step 8）への移動が完了したにもかかわらず、トランザクション外の旧コードが削除されずに残っている。これを削除する
3. **RSA 2048bit 鍵生成の同期ブロック** — `node-forge` の `generateKeyPair(2048)` がメインスレッドを同期ブロックしており、コールバック形式に変更することで libuv スレッドプールで実行されるようにする

---

## 2. 目的と期待される成果

- [x] S3/Swift フォルダ作成が並列化され、ネットワーク往復回数が論理的に6→1往復相当に短縮される
- [x] namespace URI の不正な2件目登録（`URI+"1"` 形式）が発生しなくなる
- [x] RSA 鍵生成中に Node.js のイベントループがブロックされなくなる

---

## 3. 実装ステップ

- [ ] **Step 1**: `storageService.ts` の `createFolders` を `Promise.all` で並列化
- [ ] **Step 2**: `organizationService.ts` のトランザクション外にある namespace URI 登録ブロック（④）を削除
- [ ] **Step 3**: `organizationService.ts` で不要になった `namespaceService` の import を削除
- [ ] **Step 4**: `certificateService.ts` の `generateKeyPair(2048)` をコールバック形式の Promise ラップに変更
- [ ] **Step 5**: TypeScript コンパイルエラーがないことを確認

---

## 4. 変更ファイル

1. `backend/src/services/storageService.ts` — `createFolders` を `Promise.all` に変更
2. `backend/src/services/organizationService.ts` — namespace URI 二重登録ブロック削除、不要 import 削除
3. `backend/src/services/certificateService.ts` — `generateKeyPair` をコールバック形式で非同期化

---

## 5. 影響範囲

| ファイル | 影響 |
|---|---|
| `storageService.ts` の `createFolders` | `organizationService`（組織作成）・`organizationGroupService`（チーム作成）・`backfill` スクリプトの3箇所から呼ばれている。各フォルダ作成は独立した PUT リクエストのため並列化に依存関係なし |
| `organizationService.ts` の ④ ブロック削除 | namespace URI 登録は tx 内 step 8 で既に完結しているため、削除しても機能に変化なし。`namespaceService` import の削除も他での利用がないことを確認済み |
| `certificateService.ts` の非同期化 | `generateAndSaveCertificate` → `generateClientCertificate` の呼び出しチェーンは既に `async/await` で実装されているため、Promise ラップの追加で呼び出し側の変更は不要 |

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| `createFolders` 並列化により S3/Swift への同時接続数が増加する | 低 | 低 | 6件程度の並列数は通常の S3 SDK のデフォルト接続プール内に収まる。問題が出れば元に戻す |
| `namespaceService` import に他の利用箇所が残っていた場合コンパイルエラー | 低 | 低 | コンパイルエラーで即検出できるため実害なし |
| `generateKeyPair` のコールバック形式で型エラーが出る | 低 | 低 | `forge.pki.rsa.KeyPair` 型で明示的に型付けする |

---

## 7. テスト計画

- [ ] TypeScript コンパイルエラーなし（`npx tsc --noEmit`）
- [ ] 手動: 組織を新規作成して正常に完了することを確認
- [ ] 手動: 作成された組織の namespace が1件のみ登録されていることを確認（二重登録の解消）

---

## 8. 承認記録

- **計画書提示日時**: 2026-09-08 00:00
- **承認日時**: 2026-09-08（「一応計画書を起こして実装を進めてほしい」にて承認）
- **承認者コメント**: 計画を立てて実装を進めるよう指示

---

## 9. 実施記録

### 実施日時
開始: 2026-09-08  
完了: 2026-09-08

### 最終的な成果物
- [x] `backend/src/services/storageService.ts` — `createFolders` 並列化
- [x] `backend/src/services/organizationService.ts` — 二重登録ブロック削除・import 削除
- [x] `backend/src/services/certificateService.ts` — `generateKeyPair` 非同期化
- [x] TypeScript コンパイルエラーなし確認済み（`npx tsc --noEmit` exit 0）
