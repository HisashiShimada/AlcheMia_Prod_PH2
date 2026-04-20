# タスク計画書: MAIML編集画面から戻った際のMaimlProvider未更新修正

## メタデータ
- **作成日時**: 2026-04-16 11:39
- **タスクID**: MaimlProvider戻り時リロード修正
- **優先度**: 高
- **推定工数**: 1時間

---

## 1. タスク概要

`ProjectFolderTree`（プロジェクト管理画面）からMAIML編集画面に遷移し、ファイルを保存してプロジェクト管理画面に戻った際に、`ProjectMaimlProvider`が保持しているMAIML情報が古いまま更新されない。その結果、ビューアボタン押下時に渡される `maimlContent` が古い（またはnull）状態となり、「読み込む対象がない」エラーが発生する。

---

## 2. 問題の根本原因分析

### 現在のデータフロー

```
1. プロジェクト管理画面でプロジェクト選択
   → handleProjectSelect() で loadMaiml(projectId) が呼ばれる
   → ProjectMaimlContext に maimlContent がキャッシュされる

2. 編集ボタン押下 → MAIML編集画面へ遷移（onEdit コールバック）
   → ProjectManagementInner はアンマウント or 非表示になる
   → ProjectMaimlProvider は親コンポーネント側にあるため state は保持される

3. 編集画面でファイル保存（S3上のMAIMLファイルが更新される）

4. プロジェクト管理画面に戻る
   → ProjectManagementInner が再マウント / 再表示
   → selectedProjectId は sessionStorage から復元される
   → projects データが API から再取得される
   → selectedProject が揃うと useEffect でファイル一覧は再取得される
   ★ しかし ProjectMaimlContext の loadMaiml() は呼ばれない ★
   → maimlContent は編集前の古い内容のまま残留する

5. ビューアボタン押下
   → handleViewFile() で maimlContent を passedFileContent として渡す
   → ViewRendererDialog に古い / null の maimlContent が渡される
   → 「読み込む対象がない」エラー発生
```

### 現状の処理経路の整理

現状、各トリガーで何が呼ばれるかを整理すると以下の通り：

| トリガー | プロジェクト一覧再取得 | MAIML再取得 | ファイル一覧再取得 |
|---|---|---|---|
| プロジェクトクリック（`handleProjectSelect`） | ❌ | ✅ | ✅（useEffect経由） |
| リロードボタン（`handleRefresh`） | ✅ | ❌ **欠けている** | ❌ |
| 編集画面から戻る（再マウント） | ✅（useApiが再実行） | ❌ **欠けている** | ✅（useEffect経由） |

**「リロード処理」と「プロジェクト選択処理」が別々に実装されており、
編集画面から戻った際にMAIML取得だけが実行されない**ことが根本原因。

---

## 3. 修正方針: リロード処理とプロジェクト選択処理の共通化

**正しい共通化の方向性**:

```
① handleRefresh（リロード処理）を強化
   プロジェクト一覧の更新（refetchProjects）
   ＋ プロジェクトが選択されていたら loadMaiml も実行
   （= プロジェクト一覧 + MAIML を最新化）

② 編集画面から戻った場合の処理
   sessionStorage からプロジェクト選択状態を復元
   ＋ 強化した handleRefresh を実行
```

これにより、**リロードボタンを押した場合も、編集画面から戻った場合も、
同一の「完全リフレッシュ」ロジックを経由する**構造になる。

修正後の処理経路：

| トリガー | プロジェクト一覧再取得 | MAIML再取得 | ファイル一覧再取得 |
|---|---|---|---|
| プロジェクトクリック（`handleProjectSelect`） | ❌ | ✅ | ✅（useEffect経由） |
| リロードボタン（`handleRefresh`） | ✅ | ✅ **追加** | ✅（useEffect経由） |
| 編集画面から戻る（初回マウントuseEffect → handleRefresh） | ✅ | ✅ **追加** | ✅（useEffect経由） |

---

## 4. 実装ステップ

### Phase 1: `handleRefresh` の強化

**変更ファイル**: `frontend/src/components/project/ProjectManagement.tsx`

**修正前**:
```tsx
const handleRefresh = useCallback(() => {
  console.log('Refreshing project list...');
  refetchProjects();
}, [refetchProjects]);
```

**修正後**:
```tsx
const handleRefresh = useCallback(async () => {
  console.log('Refreshing project list...');
  await refetchProjects();

  // プロジェクトが選択されていたら MAIML も最新化
  if (selectedProjectId) {
    try {
      console.log('🔄 [ProjectManagement] リフレッシュ後 MAIML 更新開始:', selectedProjectId);
      await loadMaiml(selectedProjectId);
      console.log('✅ [ProjectManagement] リフレッシュ後 MAIML 更新完了');
    } catch (error) {
      // エラーは Context 側でハンドリング済み
    }
  }
}, [refetchProjects, selectedProjectId, loadMaiml]);
```

> **補足**: ファイル一覧の再取得はすでに `useEffect[selectedProjectId, selectedProject?.id]` が
> `selectedProject` の内容変化を検知して自動で行うため、`handleRefresh` 内での追加は不要。

### Phase 2: 編集画面から戻った際の処理を `handleRefresh` に統一

**現状**: 編集画面から戻ると `selectedProjectId` が sessionStorage から復元されるが、
`handleRefresh` は呼ばれないため MAIML が更新されない。

**修正内容**: コンポーネント初回マウント時に `selectedProjectId` が既に復元されている場合、
強化した `handleRefresh` を呼び出す `useEffect` を追加する。

**追加する `useEffect`**:
```tsx
// 編集画面から戻った際（マウント時に selectedProjectId が復元済みの場合）にリフレッシュ
const hasInitialRefreshRef = useRef(false);
useEffect(() => {
  if (hasInitialRefreshRef.current) return; // 初回マウントのみ実行（Strict Mode 二重発火防止）
  hasInitialRefreshRef.current = true;

  if (selectedProjectId) {
    console.log('🔄 [ProjectManagement] 初期マウント - selectedProjectId 復元検知、リフレッシュ実行');
    handleRefresh();
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

> **注意**: 依存配列を `[]` にすることで初回マウント時のみ実行。
> `handleRefresh` は初回マウント時点の参照を使うが、`selectedProjectId` も
> 初期値（sessionStorage 復元値）として確定しているため問題なし。

---

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/ProjectManagement.tsx`
   - `handleRefresh` を強化（async化 + `loadMaiml` 呼び出しを追加）
   - 初回マウント時に `selectedProjectId` が復元済みなら `handleRefresh` を呼ぶ `useEffect` を追加
   - `useRef`（`hasInitialRefreshRef`）の追加

### 変更しないファイル
- `frontend/src/contexts/ProjectMaimlContext.tsx`（修正不要）
- `frontend/src/components/project/ProjectFolderTree.tsx`（修正不要）

### 影響を受ける機能
- **リロードボタン押下時**: プロジェクト一覧再取得に加え、選択中プロジェクトの MAIML も最新化される（動作強化）
- **編集画面から戻った時**: `handleRefresh` 経由で MAIML が最新化され、ビューアボタンが正常動作する（バグ修正）
- **ビューアボタン押下**: `maimlContent` が常に最新のため「読み込む対象がない」エラーが解消される
- **タスク登録タブ / 指示登録タブ**: `maimlRoot` を参照する箇所も最新データを取得できる

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `loadMaiml` の参照不安定による無限ループ | 高 | 低 | `useCallback` 依存配列が `[]` で安定しているため問題なし |
| MAIML が存在しないプロジェクトでエラーが出る | 中 | 低 | `loadMaiml` 内で `FILE_NOT_FOUND` はエラーとして扱わず正常処理するため問題なし |
| Strict Mode の二重発火で `handleRefresh` が2回呼ばれる | 低 | 高（開発環境） | `hasInitialRefreshRef` フラグで2回目の実行をスキップ |

---

## 7. テスト計画

### 手動テスト
- [ ] プロジェクトを選択し、ビューアボタンを押して正常に表示されることを確認
- [ ] 編集ボタン押下 → MAIML編集画面で内容を変更・保存 → プロジェクト管理画面に戻る
- [ ] 戻った後にビューアボタンを押し、**保存後の最新内容**が表示されることを確認
- [ ] リロードボタンを押して、選択中プロジェクトのビューアが最新 MAIML を表示することを確認
- [ ] 複数プロジェクトで上記手順を繰り返し、他プロジェクトの MAIML が混入しないことを確認
- [ ] MAIML ファイルが存在しないプロジェクトで適切なメッセージが出ることを確認

---

## 8. 承認記録

- **計画書提示日時**: 2026-04-16 11:39
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）
