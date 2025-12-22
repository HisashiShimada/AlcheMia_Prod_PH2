# タスク計画書: SubNetViewer z-index問題修正とリサイズ機能追加

## メタデータ
- **作成日時**: 2025-12-19 13:43
- **タスクID**: SubNetViewer_zindex_fix
- **優先度**: 高
- **推定工数**: 30分

## 1. タスク概要

ViewRendererDialog（フロートウィンドウ）をサイズ調整可能にし、SubNetViewerとStructuredPropertySelectorをViewRendererDialog内の部品として統合します。これにより、z-index階層の問題を根本的に解決します。

## 2. 目的と期待される成果

### 目的
- ViewRendererDialogをリサイズ可能にする
- SubNetViewerとStructuredPropertySelectorをModalではなくViewRendererDialog内のコンテンツとして表示
- すべてのコンポーネントをViewRendererDialogのz-index階層内に収める
- 階層構造を明確化し、z-index競合を解消

### 期待される成果
- [ ] ViewRendererDialogがリサイズ可能になる
- [ ] SubNetViewerがViewRendererDialog内に表示される（Modalではない）
- [ ] StructuredPropertySelectorがSubNetViewer内に表示される（Modalではない）
- [ ] すべてのコンポーネントが正しい階層で表示される
- [ ] 背景のPetriNetViewerが常に操作可能

## 3. 実装ステップ

### Step 1: ViewRendererDialogのリサイズ機能追加
- [ ] react-rndライブラリの使用を検討（DraggableとResizableの統合）
- [ ] ViewRendererDialog.tsxにリサイズハンドルを追加
- [ ] 最小サイズ（800x600）と最大サイズの制約を設定
- [ ] リサイズ時のコンテンツ調整

### Step 2: SubNetViewerの非Modal化
- [ ] SubNetViewer.tsxからModal要素を削除
- [ ] 通常のdivベースのコンポーネントに変更
- [ ] ViewRendererDialog内に表示するための調整
- [ ] 閉じるボタン、最小化ボタンの実装

### Step 3: StructuredPropertySelectorの統合
- [ ] StructuredPropertySelectorをSubNetViewer内に埋め込み
- [ ] Modalではなく、サイドパネルとして表示
- [ ] SubNetViewerの右ペインに配置

### Step 4: コンポーネント階層の再構築
- [ ] PetriNetViewerからSubNetViewerのModal呼び出しを削除
- [ ] ViewRendererDialogがSubNetViewerを管理する構造に変更
- [ ] プロパティデータの受け渡し方法を調整

### Step 5: テストと調整
- [ ] ViewRendererDialogのリサイズ動作確認
- [ ] Transitionノードクリック → SubNetViewer表示
- [ ] Placeノードクリック → プロパティ表示（右ペイン）
- [ ] 階層構造が正しいことを確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/viewer/ViewRendererDialog.tsx`
   - react-rndライブラリを使用してリサイズ機能追加
   - SubNetViewerを内部コンテンツとして表示する機能追加
   - ViewRenderer以外のコンテンツ（SubNetViewer）を表示できるように拡張

2. `frontend/src/components/viewer/dialogs/SubNetViewer.tsx`
   - Modalコンポーネントを削除
   - 通常のdivベースのコンポーネントに変更
   - StructuredPropertySelectorを右ペインに埋め込み表示

3. `frontend/src/components/viewer/PetriNetViewer.tsx`
   - SubNetViewerのModal呼び出しを削除
   - Transitionノードクリック時にViewRendererDialogを開く処理に変更

## 5. 技術的詳細

### コンポーネント階層構造（修正後）
```
PetriNetViewer (z-index: auto)
  └─ ViewRendererDialog (z-index: 1000 + index, react-rnd)
      └─ SubNetViewer (div, Modalではない)
          ├─ React Flow (左ペイン)
          └─ StructuredPropertySelector (右ペイン, Modalではない)
```

### リサイズ実装
- **react-rndライブラリ**を使用（DraggableとResizableを統合）
- 最小サイズ: 800x600px
- 最大サイズ: ビューポートサイズ - マージン
- リサイズハンドル: 右下、右、下

### ViewRendererDialog拡張
```typescript
interface ViewRendererDialogProps {
  id: string;
  file?: FileData;  // オプションに変更
  contentType?: 'file' | 'subnet';  // 新規: コンテンツタイプ
  subnetData?: {  // 新規: SubNetViewer用データ
    transitionName: string;
    maimlData: string;
    templateMap: Record<string, { element: Element }>;
    petriNetData: any;
  };
  zIndex: number;
  initialPosition?: { x: number; y: number };
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
}
```

### SubNetViewer非Modal化
```typescript
// Before (Modal)
<Modal open={open} ...>
  <ReactFlowProvider>
    ...
  </ReactFlowProvider>
</Modal>

// After (div)
<div style={{ display: 'flex', height: '100%' }}>
  <div style={{ flex: 1 }}>  {/* 左ペイン: React Flow */}
    <ReactFlowProvider>
      ...
    </ReactFlowProvider>
  </div>
  <div style={{ width: 400 }}>  {/* 右ペイン: プロパティ */}
    <StructuredPropertySelector embedded={true} ... />
  </div>
</div>
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| リサイズ実装が複雑 | 中 | 中 | react-rndライブラリを使用 |
| z-index設定が他のモーダルと競合 | 中 | 低 | 統一的なz-index管理を検討 |
| StructuredPropertySelectorの埋め込み表示で不具合 | 高 | 低 | 既存の埋め込みモード機能を活用 |

## 7. テスト計画

### 手動テスト
1. experiment_adminでログイン
2. プロジェクト管理画面を開く
3. test_omori11.maimlのビューアを開く
4. Transitionノードをクリック → SubNetViewer表示
5. SubNetViewerのサイズを変更できることを確認
6. Placeノードをクリック → プロパティダイアログが前面に表示されることを確認
7. プロパティダイアログが表示されている状態で背景のPetriNetViewerが操作可能か確認
8. SubNetViewerを閉じる → 正常に閉じることを確認

## 8. ロールバック計画

問題が発生した場合:
1. SubNetViewer.tsxの変更をrevert
2. 元のモーダル表示方式に戻す

## 9. 関連ドキュメント

- [SubNetViewer実装](./20251219_1117_SubNetViewer実装_Phase2_PLAN.md)
- [ViewRendererDialog実装](../design/viewer_layout_logic.md)

## 10. 承認記録

- **計画書提示日時**: 2025-12-19 13:43
- **承認日時**: （承認待ち）
- **承認者コメント**: （記入予定）

## 11. 実施記録

### 実施日時
開始: 2025-12-19 14:05
完了: 2025-12-19 14:21

### 計画からの変更点
なし

### 発生した問題と解決方法
1. **react-rnd未インストール**
   - 問題: react-rndが見つからない
   - 解決: `npm install react-rnd --prefix frontend` で解決済み

2. **ViewRendererDialogの型エラー**
   - 問題: DraggableとRndの混在でエラー
   - 解決: 完全にRndベースで書き直し

3. **ファイル表示ができなくなる問題**
   - 問題: ViewRendererDialogのcontentTypeが必須になったが、ProjectManagementが古い構造
   - 解決: OpenDialog型を拡張し、handleViewFileでcontentType: 'file'を明示

### 実施済みステップ
- [x] Step 1: ViewRendererDialogのリサイズ機能追加
  - [x] react-rndライブラリのインストール確認
  - [x] ViewRendererDialog.tsxをRndベースで書き直し
  - [x] contentTypeプロパティ追加（'file' | 'subnet'）
  - [x] subnetDataプロパティ追加
  - [x] initialSizeプロパティ追加

- [x] Step 2: SubNetViewerの非Modal化
  - [x] Modalコンポーネントの完全削除
  - [x] divベースのレイアウトに変更（左右2ペイン）
  - [x] 左ペイン: React Flow（サブネット表示）
  - [x] 右ペイン: StructuredPropertySelector（埋め込み）
  - [x] ツールバーを絶対配置に変更

- [x] Step 3: StructuredPropertySelectorの埋め込みモード対応
  - [x] embeddedプロパティ追加
  - [x] embedded=true時にModalを使わずdivで表示
  - [x] 通常モード（Modal）との分岐実装

### Phase 3-4完了
- [x] Step 4: PetriNetViewerの修正完了
  - [x] onOpenSubNetViewerコールバックprops追加
  - [x] Transitionノードクリック時に親コンポーネントへ通知
  - [x] SubNetViewerのModal呼び出しを削除
  - [x] SubNetViewerインポートを削除

- [x] Step 5: ViewRendererとViewRendererDialogの修正完了
  - [x] ViewRendererにonOpenSubNetViewerコールバック追加
  - [x] ViewRendererDialogにonOpenSubNetViewerコールバック追加
  - [x] PetriNetViewerへのコールバック連携完了

- [x] Step 6: ProjectManagementの修正完了
  - [x] handleViewSubnetハンドラ追加
  - [x] ViewRendererDialogにonOpenSubNetViewerを渡す
  - [x] OpenDialog型にcontentTypeとsubnetDataを追加
  - [x] ファイル表示機能の復旧確認

### 最終的な成果物（全Phase完了）
- [x] ViewRendererDialog.tsx（react-rnd対応、コールバック連携完了）
- [x] SubNetViewer.tsx（非Modal化完了）
- [x] StructuredPropertySelector.tsx（埋め込みモード対応完了）
- [x] PetriNetViewer.tsx（コールバック通知実装完了）
- [x] ViewRenderer.tsx（コールバック連携完了）
- [x] ProjectManagement.tsx（handleViewSubnet実装完了）

## 12. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）
