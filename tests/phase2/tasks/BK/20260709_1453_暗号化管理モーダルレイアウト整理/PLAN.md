# タスク計画書: 暗号化管理モーダルレイアウト整理

## メタデータ
- **作成日時**: 2026-07-09 14:53
- **タスクID**: encryption-modal-layout-refactor
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要

`EncryptionManagement.tsx` の暗号化管理モーダルにおいて、鍵選択とアルゴリズム設定の配置を整理する。
現状は要素ごとに鍵設定UIが表示される形式だが、1MAIMLファイルに対して鍵は1つという運用に合わせて、
モーダル大枠タブで「暗号化対象選択」と「鍵設定」を分離し、UIを整理する。

## 目的と期待される成果

- [ ] モーダルの大枠タブとして「暗号化対象選択」「鍵設定」の2タブを新設
- [ ] 鍵設定タブ内に「暗号化用の鍵」「復号化用の鍵」を分離したセクションを配置
- [ ] EncryptionConfigPanel から鍵関連UIを撤去（秘匿レベル・UPA・オプションのみに整理）
- [ ] DecryptionPanel から鍵選択UIを撤去（渡されたkeyId/passwordを使うのみに整理）
- [ ] アルゴリズム選択は「新しい共通鍵を生成」選択時のみ表示するよう制御

## 実装ステップ

### Phase 1: 新規コンポーネント作成
- [ ] `EncryptionKeyPanel.tsx` 作成（暗号化用の鍵セクション）
  - 鍵ソース選択（新規生成／既存ファイル読込／受信者公開鍵）
  - 新規生成時のみアルゴリズムSelect表示
  - 鍵生成・アップロードボタン
  - 現在の鍵識別子表示・消去ボタン
- [ ] `DecryptionKeyPanel.tsx` 作成（復号化用の鍵セクション）
  - 既存鍵一覧Selectコンポーネント
  - パスワード入力（PBKDF2時のみ）
  - 状態を親(EncryptionManagement)に持ち上げてexpose
- [ ] `KeySettingsTab.tsx` 作成（鍵設定タブコンテナ）
  - 上記2パネルを並べて表示

### Phase 2: 既存コンポーネント修正
- [ ] `EncryptionConfigPanel.tsx` から鍵設定・アルゴリズムUIを削除
  - `Form.Item label="暗号化アルゴリズム"` を削除
  - `Form.Item label="鍵設定"` を削除（鍵ソース選択・鍵操作UI）
  - `keys`・`onConfigChange`(鍵関連部分)のprops整理
- [ ] `DecryptionPanel.tsx` から鍵選択UIを削除
  - `selectedKeyId` / `password` ローカル状態を削除
  - 親から `keyId`・`password` をpropsとして受け取る形に変更
  - デバウンス自動プレビュー更新のトリガーをprops変更に変更
  - 鍵選択Selectとパスワード入力フォームを削除

### Phase 3: EncryptionManagement.tsx 修正
- [ ] モーダル大枠タブ（`mainTab: 'encrypt-target' | 'key-settings'`）を追加
- [ ] 復号化用の `decryptKeyId`・`decryptPassword` 状態を引き上げ
- [ ] `KeySettingsTab` コンポーネントを大枠タブのkey-settings側に配置
- [ ] 鍵未設定時に「暗号化対象選択」タブの実行ボタンを押したらkey-settingsタブへ誘導
- [ ] `config.loadedKey` を `EncryptionKeyPanel` で管理し親に通知
- [ ] `DecryptionPanel` への props を修正（keyId/passwordを渡す）

## 変更ファイル

### 新規作成
1. `frontend/src/components/encryption/EncryptionKeyPanel.tsx` - 暗号化用の鍵設定セクション
2. `frontend/src/components/encryption/DecryptionKeyPanel.tsx` - 復号化用の鍵設定セクション
3. `frontend/src/components/encryption/KeySettingsTab.tsx` - 鍵設定タブコンテナ

### 修正
1. `frontend/src/components/encryption/EncryptionManagement.tsx` - 大枠タブ追加・状態管理見直し
2. `frontend/src/components/encryption/EncryptionConfigPanel.tsx` - 鍵・アルゴリズムUI削除
3. `frontend/src/components/encryption/DecryptionPanel.tsx` - 鍵選択UI削除・props化

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `config.loadedKey` / `decryptKeyId` 状態の引き上げ漏れ | 高 | EncryptionManagement.tsx の状態一覧を実装前に整理 |
| DecryptionPanel の自動プレビュー更新が壊れる | 中 | useEffect の依存配列を親からのprops変更に切り替え |

## 承認記録
- **計画書提示日時**: 2026-07-09 14:53
- **承認日時**: 2026-07-09 14:53

## 実施記録

### 実施日時
開始: 2026-07-09 14:53
完了: 2026-07-09 15:00

### 最終的な成果物

#### 新規作成ファイル
- [x] `frontend/src/components/encryption/EncryptionKeyPanel.tsx` — 暗号化用の鍵設定パネル
  - 鍵ソース選択（新規生成 / 既存ファイル読込 / 受信者公開鍵）
  - 新規生成時のみアルゴリズムSelect表示
  - 鍵生成・アップロードボタン / 現在の鍵識別子表示・消去ボタン
- [x] `frontend/src/components/encryption/DecryptionKeyPanel.tsx` — 復号化用の鍵設定パネル
  - 既存鍵一覧Select / PBKDF2時のみパスワード入力表示
  - `DecryptionKeyState` 型をexportして親と状態共有
- [x] `frontend/src/components/encryption/KeySettingsTab.tsx` — 鍵設定タブコンテナ
  - 上記2パネルを縦に並べて表示

#### 修正ファイル
- [x] `frontend/src/components/encryption/EncryptionConfigPanel.tsx` — 鍵・アルゴリズムUI削除
  - 秘匿レベル・UPA制約チェック・insertion警告・オプションのみに整理
- [x] `frontend/src/components/encryption/DecryptionPanel.tsx` — 鍵選択UI削除・props化
  - `keyId` / `password` を親からpropsで受け取る形に変更
  - useEffect依存配列をprops変更ベースに変更
- [x] `frontend/src/components/encryption/EncryptionManagement.tsx` — 大枠タブ追加
  - `mainTab: 'encrypt-target' | 'key-settings'` 状態追加
  - `decryptKeyState` を親で管理し DecryptionPanel にpropsで渡す
  - `handleEncryptWithConfirm` に鍵未設定時の鍵設定タブ誘導を追加
  - `KeySettingsTab` を key-settings タブとして統合
