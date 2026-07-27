# タスク計画書: 暗号化管理画面レイアウト修正

## メタデータ
- **作成日時**: 2026-07-08 16:00
- **更新日時**: 2026-07-08 16:48（Phase 5〜8を追加）
- **タスクID**: 暗号化管理画面レイアウト修正
- **優先度**: 中
- **推定工数**: 6時間（追加分含む）

## タスク概要

`frontend/src/components/encryption/EncryptionManagement.tsx` およびその配下コンポーネントのレイアウト修正。

1. 要素ツリーの階層をMAIML正規スキーマ（protocol/method/pnml[構造]/program/materialTemplate等）に合わせる
2. 「秘匿化済み一覧」タブの削除
3. 右ペインを選択ノードの暗号化状態で自動切替（未暗号化→暗号化設定パネル、暗号化済み→復号化パネル）
4. **【追加】選択方式をチェックボックスから「階層クリック選択＋配下まとめ処理」方式に変更**
   - 親ノード（例: `material`）をクリック選択すると、配下の暗号化対象要素をまとめて一括暗号化/一括復号化できるようにする
   - 配下に未暗号化・暗号化済みが混在する場合はエラー表示し、先に個別要素を復号化してから揃えることを促す

## 目的と期待される成果

- [ ] ツリー表示がMAIML実仕様（protocol > method > pnml/materialTemplate等 / data > results > material等）に準拠する
- [ ] 「秘匿化済み一覧」タブが画面から削除され、UIがシンプルになる
- [ ] 右ペインが選択ノードの状態で自動的に暗号化設定／復号化パネルに切り替わる
- [ ] チェックボックスを廃止し、クリック選択のみで配下要素をまとめて処理できる
- [ ] 配下混在時はエラー表示され、誤操作が防止される


## 実装ステップ

### Phase 1: バックエンドスタブのツリー構造修正
- [ ] `backend/src/controllers/encryptionController.ts` の `STUB_MAIML_STRUCTURE` をMAIML仕様に合わせた階層に再構築
  - 旧: `document > pnml > method > place(Material/Condition/Result) > property/content`
  - 新: `maiml > header / protocol > method > (pnml[構造only] / program > instruction / materialTemplate / conditionTemplate / resultTemplate) / data > results > (material / condition / result) > property/content`

### Phase 2: EncryptionManagement.tsx の修正
- [ ] 「秘匿化済み一覧」タブ（`encrypted-list`）を削除
- [ ] `rightTab` の型から `'encrypted-list'` を除去
- [ ] タブを `'config' | 'preview' | 'decrypt'` の3種に絞る（ただし `config`/`decrypt` の表示をノード選択状態で自動切替するため、実際のタブは「XMLプレビュー」1本のみ、設定エリアはタブ外に変更）
- [ ] 右ペインの構造を以下に変更：
  - 上部エリア：選択ノードが未暗号化 → `EncryptionConfigPanel`、暗号化済み → `DecryptionPanel`（タブ不要の自動切替）
  - 下部エリア：`EncryptionPreviewPanel`（XMLプレビュー）を常時表示
  - フッター：ボタン行（状態に応じて有効なボタンのみ表示）
- [ ] `loadEncryptedChildren` / `handleSelectEncryptedElement` / `handleTabChange` の `encrypted-list` 分岐を削除
- [ ] `encryptedChildren` / `encryptedChildrenLoading` の状態を削除
- [ ] `handleSelectNode` でノードの `isEncrypted` に応じて自動的に表示パネルを切り替えるロジックを追加

### Phase 3: EncryptedElementsListTab.tsx の削除（または非使用化）
- [ ] `EncryptedElementsListTab` のimportを `EncryptionManagement.tsx` から削除

### Phase 4: 動作確認
- [ ] ツリーが正しい階層で表示されることを確認
- [ ] 未暗号化ノード選択時に暗号化設定パネルが表示されることを確認
- [ ] 暗号化済みノード選択時に復号化パネルが自動表示されることを確認
- [ ] XMLプレビューエリアが下部に常時表示されることを確認

### Phase 5: 選択方式の変更（チェックボックス廃止・階層クリック選択方式）
- [ ] `EncryptionTargetTree.tsx`: `checkable` / `checkedPaths` / `onCheck` props・実装をすべて削除
- [ ] `EncryptionTargetTree.tsx`: `disableCheckbox` 関連ロジックを削除（クリック選択のみに統一）
- [ ] `EncryptionTargetTree.tsx`: 暗号化済みバッジのツールチップ文言を「クリックして復号化」の案内に統一（済）

### Phase 6: 対象収集ロジックの実装（EncryptionManagement.tsx）
- [ ] `collectTargets(node: MaimlTreeNode)` 関数を実装
  - ノード自身＋配下を再帰的に走査
  - `isEncryptable && !isEncrypted` な要素 → `encryptCandidates` に集約
  - `isEncrypted` な要素 → `decryptCandidates` に集約
  - 判定ロジック:
    - `encryptCandidates.length > 0 && decryptCandidates.length === 0` → `mode: 'encrypt'`
    - `decryptCandidates.length > 0 && encryptCandidates.length === 0` → `mode: 'decrypt'`
    - 両方 > 0 → `mode: 'mixed'`（エラー状態）
    - 両方 0 → `mode: 'none'`（対象なし）
- [ ] `selectedNode` 変更時に `collectTargets` を実行し、`targetMode` / `targets` の state を更新
- [ ] 右ペインの表示切替ロジックを `targetMode` ベースに変更
  - `none` → 空状態表示（「暗号化/復号化可能な要素がありません」）
  - `encrypt` → `EncryptionConfigPanel` 表示（対象リストN件）
  - `decrypt` → `DecryptionPanel` 表示（対象リストN件）
  - `mixed` → エラーAlert表示（「配下に暗号化済みと未暗号化の要素が混在しています。先に暗号化済み要素を個別選択して復号化してください」）＋混在要素の内訳リスト表示

### Phase 7: パネルコンポーネントの複数対象対応
- [ ] `EncryptionConfigPanel.tsx`: Props を `selectedNode: MaimlTreeNode | null` → `targets: MaimlTreeNode[]` に変更
- [ ] `EncryptionConfigPanel.tsx`: 対象リスト表示UI追加（各要素のパス・タグ名を一覧表示）
- [ ] 復号化パネル（`DecryptionPanel.tsx` 等、実ファイル名は要確認）: 同様に `targets: MaimlTreeNode[]` に変更し対象リストを表示
- [ ] 確認ダイアログの表示を「対象: 〇〇」の単一表示 →「対象: N件」のリスト表示に変更

### Phase 8: バックエンドAPIの複数対象対応
- [ ] `backend/src/controllers/encryptionController.ts`: 暗号化実行APIのリクエストボディを `targetPath: string` → `targetPaths: string[]` に変更（スタブのため配列ループで対応）
- [ ] `backend/src/controllers/encryptionController.ts`: 復号化実行APIも同様に `targetPaths: string[]` に変更
- [ ] `frontend/src/types/encryption.ts`（型定義ファイル）: リクエスト/レスポンス型を配列対応に修正
- [ ] `frontend/src/services/encryptionService.ts`（存在する場合）: API呼び出し関数の引数を配列対応に修正

## 変更ファイル

1. `backend/src/controllers/encryptionController.ts` - `STUB_MAIML_STRUCTURE` 再構築、暗号化/復号化APIの複数対象対応
2. `frontend/src/components/encryption/EncryptionManagement.tsx` - タブ削除・右ペイン自動切替対応・collectTargets実装
3. `frontend/src/components/encryption/EncryptionTargetTree.tsx` - チェックボックス廃止、クリック選択のみに変更
4. `frontend/src/components/encryption/EncryptionConfigPanel.tsx` - 複数対象リスト対応
5. 復号化パネルの実ファイル（要確認） - 複数対象リスト対応
6. `frontend/src/types/encryption.ts` - 型定義修正（複数対象対応）
7. `frontend/src/services/encryptionService.ts`（存在する場合） - API呼び出し関数の修正

## 削除対象
- `frontend/src/components/encryption/EncryptedElementsListTab.tsx` のimportを除去（ファイル自体は残存）
- チェックボックス関連の state・props・ロジック一式

## テスト計画
- [ ] 開発サーバーで画面を開きツリー階層を目視確認
- [ ] 未暗号化ノードをクリック → 暗号化設定パネルが表示
- [ ] 暗号化済みノード（スタブ上でisEncrypted:trueのもの）をクリック → 復号化パネルが表示
- [ ] XMLプレビューが下部に表示される
- [ ] 親ノード（配下すべて未暗号化）を選択 → 配下要素がまとめて対象リストに表示される
- [ ] 親ノード（配下すべて暗号化済み）を選択 → 配下要素がまとめて復号化対象リストに表示される
- [ ] 親ノード（配下が未暗号化・暗号化済み混在）を選択 → エラーAlertが表示され処理が実行できない
- [ ] チェックボックスがツリーに表示されないことを確認

## 承認記録
- **計画書提示日時**: 2026-07-08 16:00
- **方針変更後の再提示日時**: 2026-07-08 16:48
- **承認日時**: （承認後記入）

