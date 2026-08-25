# タスク計画書: プロジェクト管理画面ボタン制御修正

## メタデータ
- **作成日時**: 2026-08-07 09:35
- **タスクID**: 20260807_0935
- **優先度**: 高
- **推定工数**: 2時間

---

## タスク概要

プロジェクト管理画面（`ProjectManagement.tsx`）のボタン活性制御に以下の不整合がある。

1. **ERROR ステータス（status=5）** のボタン制御が COMPLETED（status=4）と同等になっていない  
   → 公開操作のみ不可・それ以外の変更系操作も不可にする必要がある
2. **チェックアウト中（status=1, 2 / isProjectCheckedOut=true）** のツールバーボタンの変更系操作が制限されていない  
   → アップロード・削除・名前変更・暗号化・署名・CO/CIボタンに制限が未適用
3. **Excel 出力バッチ** のヘッダーボタン（新規作成・リロード・トランジション検索）はプロジェクトに無関係なため削除する

---

## 目的と期待される成果

- [x] ERROR ステータス時の変更系ボタンをすべて非活性にする（公開のみ不可という制御と揃える）
- [x] チェックアウト中のツールバー変更系ボタンを非活性にする
- [x] Excel 出力バッチから No.1〜3（ヘッダーボタン）を削除し、最新マトリクスを Excel に反映する

---

## 現状と修正後の対応表

### ツールバーボタン（ProjectManagement.tsx）

| No | ボタン | 現状 status=5 | 修正後 | 現状 CO中(1,2) | 修正後 |
|----|--------|--------------|--------|----------------|--------|
| 5  | アップロード | ○有効 | ✕ | ○有効 | ✕ |
| 6  | MAIMLエディタ | ○有効 | ✕ | ✕（対応済み） | ✕ |
| 7  | プロジェクト削除 | ○有効 | ✕ | ○有効 | ✕ |
| 8  | CO/CIボタン | ○有効 | ✕ | — | — |
| 13 | 名前変更 | ○有効 | ✕ | ○有効 | ✕ |
| 15 | 暗号化 | ○有効 | ✕ | ○有効 | ✕ |
| 16 | 署名 | ○有効 | ✕ | ○有効 | ✕ |

> ダウンロード（No.4）・問題確認（No.9）・バリデーション確認（No.14）は変更系ではないため引き続き有効。  
> 公開（No.10）・非公開（No.11）・完了処理（No.12）は既存ロジックで制御済み。

### タブ内ボタン（各タブコンポーネント）

タブへ渡す `isProjectCompleted` を `status === 4 || status === 5` に変更するだけで全タブの変更系ボタンが一括対応。

| props 変更箇所 | 現状 | 修正後 |
|----------------|------|--------|
| `isProjectCompleted={selectedProject?.status === 4}` × 5箇所 | status=5 で有効 | status=5 も含め非活性 |

### Excel 出力バッチ（generate-project-button-matrix.js）

- No.1「新規プロジェクト作成」・No.2「リロード」・No.3「トランジション検索」を `BUTTONS` 配列から削除
- ボタン番号の振り直し（旧 No.4〜 → 新 No.1〜）
- 全ボタンの `activeRule` を修正後の仕様に合わせて更新

---

## 修正後のステータス別マトリクス（変更系ボタン抜粋）

| No | ボタン | 0:PLANNING | 1:TASK_PENDING🔒 | 2:TASK_IN_PROGRESS🔒 | 3:REVIEW_WAITING | 4:COMPLETED | 5:ERROR |
|----|--------|:---------:|:-----------------:|:--------------------:|:---------------:|:-----------:|:-------:|
| 1  | アップロード | ○ | ✕ | ✕ | ○ | ✕ | ✕ |
| 2  | MAIMLエディタ | ○ | ✕ | ✕ | ○ | ✕ | ✕ |
| 3  | プロジェクト削除 | ○ | ✕ | ✕ | ○ | ✕ | ✕ |
| 4  | CO/CIボタン | ○ | ○ | ○ | ○ | ✕ | ✕ |
| 5  | 問題確認 | ○ | ○ | ○ | ○ | ○ | ○ |
| 6  | 公開 | ✕ | ✕ | ✕ | ○ | ○ | ✕ |
| 7  | 非公開 | ✕ | ✕ | ✕ | △ | △ | ✕ |
| 8  | 完了処理 | ✕ | ✕ | ✕ | △ | ✕ | ✕ |
| 9  | 名前変更 | ○ | ✕ | ✕ | ○ | ✕ | ✕ |
| 10 | バリデーション確認 | ○ | ○ | ○ | ○ | ○ | ○ |
| 11 | 暗号化 | ○ | ✕ | ✕ | ○ | ✕ | ✕ |
| 12 | 署名 | ○ | ✕ | ✕ | ○ | ✕ | ✕ |

> Excel の No は旧 No.1〜3 削除後の採番。ダウンロード（旧 No.4）は新 No.1 のまま番号のみ変わる（内容変更なし）。

---

## 実装ステップ

### Phase 1: ProjectManagement.tsx の修正

- [x] **1-1.** `isProjectCompleted` 計算を `status === 4 || status === 5` に変更（5 箇所）
- [x] **1-2.** アップロードボタン disabled に `isProjectCheckedOut` と `status === 5` を追加
- [x] **1-3.** MAIMLエディタボタン disabled に `status === 5` を追加（CO中は対応済み）
- [x] **1-4.** プロジェクト削除ボタン disabled に `isProjectCheckedOut` と `status === 5` を追加
- [x] **1-5.** CO/CIボタン disabled に `ProjectStatus.ERROR` を追加
- [x] **1-6.** 名前変更ボタン disabled に `isProjectCheckedOut` と `status === 4` と `status === 5` を追加
- [x] **1-7.** 暗号化ボタン disabled に `isProjectCheckedOut` と `status === 4` と `status === 5` を追加
- [x] **1-8.** 署名ボタン disabled に `isProjectCheckedOut` と `status === 4` と `status === 5` を追加

### Phase 2: generate-project-button-matrix.js の修正

- [x] **2-1.** `BUTTONS` 配列から No.1〜3（ヘッダー3ボタン）を削除
- [x] **2-2.** 残ボタンの `activeRule` を修正後マトリクスに合わせて更新
  - アップロード: status=1,2,5 → ✕
  - MAIMLエディタ: status=5 → ✕
  - プロジェクト削除: status=1,2,5 → ✕
  - CO/CI: status=5 → ✕
  - 名前変更: status=1,2,4,5 → ✕
  - 暗号化: status=1,2,4,5 → ✕
  - 署名: status=1,2,4,5 → ✕
  - タブ内変更系ボタン全般: status=5 → ✕
- [x] **2-3.** 関連コード欄・disabled 条件テキストを修正後コードに合わせて更新
- [x] **2-4.** Excel 再生成（`node scripts/generate-project-button-matrix.js`）
- [x] **2-5.** 生成ファイルを確認

---

## 影響範囲

| ファイル | 変更箇所 |
|----------|---------|
| `frontend/src/components/project/ProjectManagement.tsx` | ツールバーボタン disabled 条件（7箇所）、isProjectCompleted 渡し（5箇所） |
| `scripts/generate-project-button-matrix.js` | BUTTONS 配列・activeRule・disabled 条件テキスト |
| `scripts/result/プロジェクト管理画面_ボタン権限一覧.xlsx` | 自動生成（バッチ実行で更新） |

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| ERROR 時に操作不可にすることで回復手段がなくなる | 低 | 問題確認・ダウンロード・バリデーション確認は引き続き有効のため運用上問題なし |
| チェックアウト中に名前変更等を禁止することで既存ワークフローに影響 | 低 | CO中は編集ロック中であり変更系を禁止するのが正しい仕様 |
| isProjectCompleted 変更がタブ内の想定外ボタンに波及する | 中 | 各タブの disabled 条件は `isProjectCompleted` を利用しているため、status=5 も一括で非活性化される（意図通り） |

---

## テスト計画

- [x] status=5（ERROR）でツールバー変更系ボタンがすべて非活性になることを確認
- [x] status=5 でダウンロード・問題確認・バリデーション確認が有効なことを確認
- [x] status=1,2（チェックアウト中）でアップロード・削除・名前変更・暗号化・署名が非活性になることを確認
- [x] status=1,2 でダウンロード・問題確認・CO/CI・バリデーション確認が有効なことを確認
- [x] Excel の No.1〜3 が削除されていることを確認
- [x] TypeScript コンパイルエラーがないことを確認（`cd frontend && npx tsc --noEmit`）

---

## 承認記録
- **計画書提示日時**: 2026-08-07 09:35
- **承認日時**: 2026-08-07 09:35
- **承認者コメント**: 承認します。

## 実施記録

### 実施日時
開始: 2026-08-07 09:40
完了: 2026-08-07 11:02

### 最終的な成果物
- [x] Phase 1-1: `isProjectCompleted` を `status===4 || status===5` に変更（5箇所）
- [x] Phase 1-2: アップロードボタン disabled に `isProjectCheckedOut` と `status===5` を追加
- [x] Phase 1-3: MAIMLエディタボタン disabled に `status===5` を追加
- [x] Phase 1-4: プロジェクト削除ボタン disabled に `isProjectCheckedOut` と `status===5` を追加
- [x] Phase 1-5: CO/CIボタン disabled に `ProjectStatus.ERROR` を追加
- [x] Phase 1-6: 名前変更ボタン disabled に `isProjectCheckedOut` と `status===4`, `status===5` を追加
- [x] Phase 1-7: 暗号化ボタン disabled に `isProjectCheckedOut` と `status===4`, `status===5` を追加
- [x] Phase 1-8: 署名ボタン disabled に `isProjectCheckedOut` と `status===4`, `status===5` を追加
- [x] Phase 2-1: `BUTTONS` 配列から No.1〜3（ヘッダーボタン）を削除
- [x] Phase 2-2: 全ボタンの `activeRule`・note を修正後マトリクスに更新（29ボタン体制に整理）
- [x] Phase 2-3: disabled 条件テキスト・関連コード欄を新番号体系に更新
- [x] Phase 2-4: Excel 再生成完了（`scripts/result/プロジェクト管理画面_ボタン権限一覧.xlsx`）
- [x] TypeScript コンパイルエラーなし（既存の別ファイル起因のエラーのみ）
