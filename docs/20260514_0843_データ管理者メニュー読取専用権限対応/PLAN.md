# タスク計画書: データ管理者メニュー読取専用権限対応

## メタデータ
- **作成日時**: 2026-05-14 08:43
- **タスクID**: data_admin_readonly_permission
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

ロール管理画面の機能管理ダイアログにおいて、データ管理者メニュー（機能ID: `030000`）のみ「読取専用」権限を選択できるように制限する。その他のメニュー（プロバイダーメニュー、システム管理者メニュー、実験管理者メニュー、実験作業者メニュー）は常に「書込可（Ⓦ）」に固定し、読取専用への変更を不可とする。

また、読取専用権限（permission=0）が設定されたデータ管理者メニューにアクセスした際、データの追加・更新・削除を伴うすべてのコントロールを非活性にする。

## 目的と期待される成果

### 目的
- データ管理者メニューのみ「読取専用」権限（permission=0）を設定可能にする
- 他のメニューは書込可（permission=1）固定とし、誤った権限設定を防ぐ
- 読取専用権限でアクセスした場合、データ変更操作を UI レベルで防止する

### 期待される成果
- [x] ロール管理画面の機能管理ダイアログで、データ管理者メニューのみ「書込可」チェックを外すことができる
- [x] 他の4メニュー（プロバイダー/システム管理者/実験管理者/実験作業者）の「書込可」チェックボックスがdisabled（操作不可）となる
- [x] 読取専用（permission=0）が設定されたデータ管理者メニューにアクセスした場合、`MasterManagement.tsx` の isReadOnly 制御により Create/Update/Delete 操作が不可になる（※ `isReadOnly` フラグと各ボタンへの `disabled={isReadOnly}` は実装済みだったが、`columns` useMemoの依存配列に `isReadOnly` が含まれておらずテーブル行インラインボタンが正しく制御されないバグがあったため、依存配列への追加を本タスクで実施）
- [x] 権限変更後にメニュー切替ボタンを押すだけで最新権限が即時反映される（再ログイン不要）

## 実装ステップ

### Step 1: FunctionPermissionDialog.tsx の修正
- [x] 読取専用選択可能な機能のホワイトリスト定数 `READ_ONLY_SELECTABLE_KEYS` を定義（`['030000']`）
- [x] 「書込可」チェックボックスの `disabled` 条件を変更：`!func.checked || !READ_ONLY_SELECTABLE_KEYS.includes(func.key)`
- [x] 読取専用非対応の機能がチェックされた際、`writable: true` を強制する処理を `handleFunctionCheck` に追加
- [x] 既存の状態（`initialWritableFunctionIds`）から読み込む際、読取専用非対応の機能は `writable: true` に強制する処理を `initialFunctions` の useMemo に追加

### Step 2: MasterManagement.tsx のボタン非活性バグ修正
- [x] `columns` useMemoの依存配列に `isReadOnly` を追加（テーブル行インラインボタンの `disabled` が正しく更新されないバグの修正）

### Step 3: page.tsx — 権限変更の即時反映対応（追加実装）
- [x] `handleMenuChange` を `async` 関数に変更
- [x] メニュー切替前に `authService.refreshToken()` を呼び出し、最新の権限情報を取得
- [x] 取得成功時: `localStorage.setItem('userInfo', ...)` で権限情報を最新化 + `setCurrentUser(user)` で React 状態も更新
- [x] 取得失敗時: `console.warn` のみ出力してメニュー切替は続行（フォールバック動作）

## 変更ファイル

### 修正済み
1. `frontend/src/components/SystemManagement/FunctionPermissionDialog.tsx` - 読取専用選択制限の追加
2. `frontend/src/components/DataManagement/MasterManagement.tsx` - `columns` useMemo依存配列への `isReadOnly` 追加
3. `frontend/src/app/page.tsx` - `handleMenuChange` 非同期化・メニュー切替前トークンリフレッシュ追加（権限即時反映）

### 変更なし（確認済み）
- バックエンド - 権限 0/1 の仕組みは既に動作中

## 影響範囲

### 影響を受ける機能
- ロール管理画面 > 機能管理ダイアログ：データ管理者メニュー以外の書込可チェックが操作不可になる
- データ管理者メニュー：読取専用設定時、Create/Update/Delete 操作が不可

### 影響を受けない機能
- 既にデータが保存されているロールの動作（DBの権限値は変更なし）
- 他のロール管理操作（追加・編集・アクティブ/非アクティブ）

## 技術的詳細

### Step 1: FunctionPermissionDialog.tsx

#### 修正前
```typescript
// チェックされていれば全機能で書込可チェックを変更できる
<Checkbox
  checked={func.writable}
  onChange={() => handleWritableCheck(func.key)}
  disabled={!func.checked}
>
```

#### 修正後
```typescript
// 読取専用が選択できる機能（データ管理者メニューのみ）
const READ_ONLY_SELECTABLE_KEYS = ['030000'];

// 書込可チェックボックス：読取専用非対応の機能はdisabled
<Checkbox
  checked={func.writable}
  onChange={() => handleWritableCheck(func.key)}
  disabled={!func.checked || !READ_ONLY_SELECTABLE_KEYS.includes(func.key)}
>
```

### Step 2: MasterManagement.tsx

#### 修正前
```typescript
const columns: ColumnsType<MasterRecord> = useMemo(() => {
  // ...テーブル列定義（インラインボタンの disabled={isReadOnly} は記述済みだった）
}, [selectedMasterInfo, token]); // isReadOnly が依存配列に含まれていなかった
```

#### 修正後
```typescript
const columns: ColumnsType<MasterRecord> = useMemo(() => {
  // ...テーブル列定義（インラインボタンの disabled={isReadOnly} は記述済み）
// isReadOnly をdepsに追加: 読取専用状態が変化した際にインラインボタンの disabled を正しく更新するため
}, [selectedMasterInfo, token, isReadOnly]);
```

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のDB設定で他メニューが読取専用になっているケースがある | 中 | 低 | 初期値ロード時に強制writable化で対応 |

## テスト計画

### 手動テスト
- [ ] ロール管理画面を開き、任意のロールの機能名をクリック
- [ ] 機能管理ダイアログでデータ管理者メニューの「書込可」チェックを外せることを確認
- [ ] プロバイダーメニューなど他のメニューの「書込可」チェックがdisabledであることを確認（グレーアウト）
- [ ] データ管理者メニューを読取専用（書込可OFF）で保存後、data_adminでログインし追加・編集・CSVアップロード・有効化・無効化ボタンが非活性であることを確認
- [ ] 書込可（書込可ON）のロールで data_admin にログインし、すべてのボタンが活性状態であることを確認

## 承認記録

- **計画書提示日時**: 2026-05-14 08:43
- **承認日時**: 2026-05-14 08:48
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-05-14 08:48
完了: 2026-05-14 11:57

### 最終的な成果物
- [x] `frontend/src/components/SystemManagement/FunctionPermissionDialog.tsx` 修正完了
- [x] `frontend/src/components/DataManagement/MasterManagement.tsx` 修正完了（useMemo依存配列バグ修正）
- [x] `frontend/src/app/page.tsx` 修正完了（handleMenuChange 非同期化・権限即時反映）

### 変更内容詳細

#### FunctionPermissionDialog.tsx
1. `READ_ONLY_SELECTABLE_KEYS = ['030000']` 定数を追加
2. `initialFunctions` useMemo：読取専用非対応機能の `writable: true` 強制処理を追加
3. `handleFunctionCheck`：チェック時に読取専用非対応機能を `writable: true` に強制
4. 親機能「書込可」Checkboxの `disabled` 条件を `!func.checked || !READ_ONLY_SELECTABLE_KEYS.includes(func.key)` に変更

#### MasterManagement.tsx
1. `isReadOnly` を `const` 定義から `useState` + `useEffect` に変更
   - 変更前: `const isReadOnly = getMenuPermission('data_admin') === 0;`
   - 変更後: `const [isReadOnly, setIsReadOnly] = useState(false);` + `useEffect(() => { setIsReadOnly(getMenuPermission('data_admin') === 0); }, []);`
   - 理由: Next.js SSR 時は `localStorage` が存在せず `getMenuPermission` が `undefined` を返すため、`undefined === 0 → false` となりボタンが常に活性化されていた。`useEffect` でブラウザマウント後に評価するよう変更
2. `columns` useMemoの依存配列に `isReadOnly` を追加（`[selectedMasterInfo, token]` → `[selectedMasterInfo, token, isReadOnly]`）
   - 理由: `isReadOnly` が変化した際にテーブル行インラインボタンの `disabled` が正しく更新されるよう依存配列に追加

#### page.tsx
1. `handleMenuChange` を同期関数から `async` 関数に変更
2. メニュー切替処理の冒頭で `authService.refreshToken()` を呼び出し
3. 成功時: `localStorage.setItem('userInfo', JSON.stringify(user))` で権限情報を最新化 + `setCurrentUser(user)` で React 状態も更新
4. 失敗時: `console.warn('[handleMenuChange] Token refresh failed, using cached permissions')` のみ出力し、メニュー切替は続行
   - 理由: 権限変更後に再ログインせずメニュー切替だけで最新権限が `localStorage` に反映されるようにするため。`MasterManagement.tsx` の `useEffect` が `localStorage` を参照するため、切替前に最新化が必要だった
