# タスク計画書: 全体評価タブ レイアウト修正

## メタデータ
- **作成日時**: 2026-08-28 00:00
- **タスクID**: 20260828_0000_全体評価タブレイアウト修正
- **優先度**: 中
- **推定工数**: Phase 1（モック）: 1時間 / Phase 2以降: 3〜4時間

---

## タスク概要

全体評価タブ（`OverallEvaluationTab.tsx`）に以下の情報を追加するレイアウト変更を行う。

**追加する情報:**
- 定量評価（`experiment_uncertainty_judge`）の総件数
- 判定結果の良好件数・不良件数・それぞれのパーセンテージ

**進め方:**
- Phase 1 でモックUIを先に作成して視覚確認
- Phase 2 以降でバックエンド API 追加 → 本実装へ順次移行

---

## 全体フェーズ構成

### Phase 1: モックUI作成（現フェーズ）
- モックコンポーネント `OverallEvaluationTabMock.tsx` を作成
- Next.js ページ `/mock/overall-evaluation` で確認できるようにする
- ダミーデータ（ハードコード）で新レイアウトを視覚確認
- **ユーザーの確認・ラベル名確定後に Phase 2 へ**

### Phase 2: バックエンド API 追加
- `experiment_uncertainty_judge` のプロジェクト単位集計エンドポイントを追加
  - `GET /api/v1/experiment-uncertainty-judges/:projectId/summary`
  - レスポンス: `{ total, good, bad, goodRate, badRate }`
- 追加ファイル:
  - `backend/src/sql/queries/experiment_uncertainty_judge/findSummaryByProject.sql`
  - `backend/src/repositories/experimentUncertaintyJudgeRepository.ts`（メソッド追加）
  - `backend/src/services/uncertaintyJudgeService.ts`（または新規）
  - `backend/src/routes/experimentInstructionRoutes.ts`（エンドポイント追加）

### Phase 3: フロントエンド型・サービス追加
- 型定義追加: `JudgeSummaryResponse` 型
- サービス追加: `getJudgeSummaryByProject` 関数
  - `frontend/src/services/experimentInstructionApiService.ts`（または新規サービスファイル）

### Phase 4: 本実装（OverallEvaluationTab.tsx 更新）
- モックで確定したレイアウトを本体に適用
- ダミーデータ → API 接続に切り替え
- i18n キー追加（`ja.json` / `en.json`）
- **「全体評価を登録」ボタンの黒塗り不具合修正**
  - 現状: `style={{ backgroundColor: '#222', borderColor: '#222' }}` がハードコードされており常に黒表示
  - 修正: インラインカラーコードを削除し `type="primary"` のデフォルト配色に戻す
  - 根拠: UI設計ポリシー「具体的な色コードを直接記述禁止」違反にも該当

---

## Phase 1 実装ステップ（現フェーズ）

- [x] タスクフォルダ・PLAN.md 作成
- [x] `OverallEvaluationTabMock.tsx` 作成
  - ダミーデータ（総数 28件・良好 12件・不良 16件）でヘッダー統計パネルを描画
  - 既存の EvaluationSummaryBar / AttentionItemList / 評価決定フォームも含めた完全なレイアウト
  - `App` ラッパーなしで動作する静的モック
- [x] `/mock/overall-evaluation/page.tsx` 作成（Next.js 確認ページ）

---

## Phase 1 確認手順

```bash
# フロントエンドを起動（未起動の場合）
cd /home/mi_ito/mmdpf/frontend
npm run dev

# ブラウザで以下にアクセス
# http://localhost:3000/mock/overall-evaluation
```

---

## 変更ファイル一覧（Phase 1）

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `docs/tasks/20260828_0000_全体評価タブレイアウト修正/PLAN.md` | 新規 | 本計画書 |
| `frontend/src/components/project/OverallEvaluationTabMock.tsx` | 新規 | モックコンポーネント |
| `frontend/src/app/mock/overall-evaluation/page.tsx` | 新規 | 確認用 Next.js ページ |

---

## リスク

| リスク | 対策 |
|--------|------|
| ラベル名が確定していない | モック確認時にユーザーと決定する |
| `experiment_uncertainty_judge` が 2値（良好/不良）のみ | 集計パネルは良好・不良の 2 区分で設計する（要確認なし） |

---

## 承認記録
- **計画書提示日時**: 2026-08-28 00:00
- **承認日時**: 承認済み（Act モード移行により実行）
