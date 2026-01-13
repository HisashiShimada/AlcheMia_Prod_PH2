# タスク計画書: SubNetViewer実装（Phase 2）

## メタデータ
- **作成日時**: 2025-12-19 11:17
- **タスクID**: SubNetViewer_Phase2
- **優先度**: 高
- **推定工数**: 3-4時間

## 1. タスク概要

Transitionノードをクリックした際に表示するSubNetViewerコンポーネントを実装します。reference版の実装をAnt Design v6 + TypeScriptに変換し、トランジションに接続されたPlace（入力/出力）をReact Flow形式で可視化します。

## 2. 目的と期待される成果

### 目的
- Transitionノードのクリック時にサブネットを表示できるようにする
- トランジションに接続されたPlaceノードとその関係を視覚的に表示
- 各Placeノードのプロパティを確認できる機能を提供

### 期待される成果
- [x] SubNetViewerコンポーネントが正常に動作する
- [x] Transitionノードクリック時にモーダルが開く
- [x] 入力Place（左側）と出力Place（右側）が表示される
- [x] Placeノードクリックでプロパティが表示される
- [x] モーダルのドラッグ移動が可能
- [x] フルスクリーン切り替えが動作する

## 3. 実装ステップ

### Phase 2-1: Reference版の詳細分析
- [x] `reference/frontend/src/components/SubNetViewer/index.js` を読み込んで分析
- [x] `reference/frontend/src/components/SubNetViewer/utils/subnetReactFlowConverter.js` を読み込んで分析
- [x] データフローとstate管理を理解
- [x] 必要な型定義を洗い出し

### Phase 2-2: subnetReactFlowConverter実装
- [x] `frontend/src/components/viewer/utils/subnetReactFlowConverter.ts` を作成
- [x] サブネットデータの型定義を作成
- [x] convertSubnetToReactFlow関数をTypeScript化
- [x] 入力Place/出力Placeの配置ロジック実装
- [x] エッジ（アーク）の接続ロジック実装

### Phase 2-3: SubNetViewerコンポーネント作成
- [x] `frontend/src/components/viewer/dialogs/SubNetViewer.tsx` を作成
- [x] Material-UI → Ant Design v6への変換
  - [x] Dialog → Modal
  - [x] AppBar → カスタムヘッダー
  - [x] Toolbar → Space + Flex
  - [x] IconButton → Button type="text"
- [x] ドラッグ可能なモーダル実装（react-draggable使用）
- [x] フルスクリーン切り替え機能実装
- [x] 2ペインレイアウト（左: React Flow、右: プロパティ表示）
- [x] ノードクリックハンドラ実装

### Phase 2-4: PetriNetViewerへの統合
- [x] Transitionノードクリックハンドラを更新
- [x] SubNetViewerをインポート
- [x] サブネットデータの生成ロジック実装
- [x] SubNetViewer表示処理を追加

### Phase 2-5: テストと調整
- [x] Transitionノードクリックの動作確認
- [x] サブネット表示の確認
- [x] Placeノードクリックとプロパティ表示の確認
- [x] ドラッグとフルスクリーンの動作確認
- [x] エッジケースの対応

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/viewer/PetriNetViewer.tsx`
   - Transitionノードクリックハンドラの実装
   - SubNetViewer用のstate追加
   - SubNetViewerコンポーネントの呼び出し

### 新規作成するファイル
1. `frontend/src/components/viewer/dialogs/SubNetViewer.tsx`
   - メインコンポーネント（約400-500行）
   - Material-UI → Ant Design v6変換
   - ドラッグ可能なモーダル実装
   - React Flow統合

2. `frontend/src/components/viewer/utils/subnetReactFlowConverter.ts`
   - サブネット変換ロジック（約200-300行）
   - 型定義
   - React Flow形式への変換関数

### 影響を受ける機能
- PetriNetViewer: Transitionノードクリック時の動作が変更される
- 既存のPlaceノードクリック動作は変更なし

## 5. 技術的詳細

### 使用する技術・ライブラリ
- React Flow 11.11.4: サブネット可視化
- Ant Design v6: Modal, Button, Alert, Space, Flex
- react-draggable: ドラッグ可能なモーダル
- TypeScript: 型安全な実装

### Material-UI → Ant Design v6 変換マッピング
| Material-UI | Ant Design v6 |
|------------|---------------|
| Dialog | Modal |
| AppBar | カスタムヘッダー（div + style） |
| Toolbar | Space + Flex |
| IconButton | Button type="text" |
| CircularProgress | Spin |
| Alert | Alert |
| Box | div + Flexコンポーネント |

### データ構造

#### サブネットデータ
```typescript
interface SubnetData {
  transitionId: string;
  transitionName: string;
  inputPlaces: PlaceInfo[];
  outputPlaces: PlaceInfo[];
  arcs: ArcInfo[];
}

interface PlaceInfo {
  id: string;
  name: string;
  label: string;
  templateData: any;
}

interface ArcInfo {
  source: string;
  target: string;
  label?: string;
}
```

#### React Flowノード配置
- 入力Place: 左側に縦配置（x: 50）
- Transition: 中央（x: 400）
- 出力Place: 右側に縦配置（x: 750）
- 各ノード間のY座標は自動計算

### セキュリティ考慮事項
- [x] XSS対策: テンプレートデータの適切なエスケープ
- [x] データ検証: 存在しないTransitionIDのハンドリング
- [x] エラーハンドリング: 不正なMAIMLデータの処理

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| reference版のロジックが複雑で移植が困難 | 高 | 中 | 段階的に実装、小さな単位でテスト |
| Material-UI → Ant Design変換で見た目が異なる | 中 | 中 | ViewRendererDialogを参考に実装 |
| React Flowの配置がずれる | 中 | 低 | fitViewで自動調整、手動調整機能も実装 |
| Placeノードのプロパティ表示が動作しない | 高 | 低 | StructuredPropertySelectorを再利用 |
| ドラッグ機能が正常に動作しない | 中 | 低 | ViewRendererDialogと同じライブラリを使用 |

## 7. テスト計画

### ユニットテスト
- [ ] subnetReactFlowConverter.tsの変換ロジック
- [ ] サブネットデータ生成ロジック

### 統合テスト
- [x] Transitionノードクリック → SubNetViewer表示
- [x] 入力/出力Placeの表示確認
- [x] Placeノードクリック → プロパティ表示
- [x] モーダルのドラッグ移動
- [x] フルスクリーン切り替え
- [x] ビューポートリセット機能

### 手動テスト
1. experiment_adminでログイン
2. プロジェクト管理画面を開く
3. test_omori11.maiml のビューアを開く
4. 矩形のTransitionノードをクリック
5. SubNetViewerモーダルが表示されることを確認
6. 入力Place（左側）と出力Place（右側）が表示されることを確認
7. Transitionノード（中央）が表示されることを確認
8. Placeノードをクリックしてプロパティが右ペインに表示されることを確認
9. モーダルをドラッグして移動できることを確認
10. フルスクリーンボタンをクリックして拡大/縮小を確認
11. ビューリセットボタンで全体表示に戻ることを確認
12. 閉じるボタンでモーダルが閉じることを確認

## 8. ロールバック計画

問題が発生した場合:
1. 新規作成したファイルを削除
2. PetriNetViewer.tsxの変更をrevert
3. Transitionノードクリック時は仮メッセージ表示に戻す

## 9. 関連ドキュメント

- [ViewRendererDialog実装](../viewer_layout_logic.md) - ドラッグ可能なモーダルの実装例
- [StructuredPropertySelector実装](../../components/viewer/dialogs/StructuredPropertySelector.tsx) - プロパティ表示の実装例
- [PetriNetViewer](../../components/viewer/PetriNetViewer.tsx) - 統合先
- Reference版: `reference/frontend/src/components/SubNetViewer/index.js`
- Reference変換ロジック: `reference/frontend/src/components/SubNetViewer/utils/subnetReactFlowConverter.js`

## 10. 承認記録

- **計画書提示日時**: 2025-12-19 11:17
- **承認日時**: 2025-12-19 11:18
- **承認者コメント**: 承認

## 11. 実施記録

### 実施日時
開始: 2025-12-19 11:19
完了: 2025-12-19 11:24

### 計画からの変更点
- StructuredPropertySelectorの呼び出し方法を調整
  - Reference版ではembeddedモードで呼び出していたが、現行版の実装に合わせてopen, onClose, structuredPropertiesを使用する方式に変更
- useEffect内のsetLoadingの初期値を変更
  - ESLintエラー回避のため、初期値をfalseに変更し、useEffect内での不要なsetLoadingを削除

### 発生した問題と解決方法
1. **型エラー（TemplateInfo.properties）**
   - 問題: `any[]`型がESLintエラーを引き起こした
   - 解決: `Record<string, unknown>[]`に変更

2. **StructuredPropertySelectorのprops不一致**
   - 問題: Reference版とは異なる実装になっていたためpropsが合わなかった
   - 解決: PetriNetViewerと同じ方法でstructuredPropertiesを構築して渡すように変更

3. **parseMaimlToPetriNetの戻り値型**
   - 問題: SubNetViewer用の形式と異なっていた
   - 解決: 変換処理を追加してSubNetViewer用の形式に変換

### 最終的な成果物
- [x] SubNetViewer.tsx - Ant Design v6版SubNetViewerコンポーネント（約570行）
- [x] subnetReactFlowConverter.ts - サブネット変換ロジック（約270行、TypeScript型定義含む）
- [x] PetriNetViewer.tsx（更新）- SubNetViewer統合（Transitionノードクリック対応）

## 12. 振り返り

### うまくいった点
1. **段階的な実装アプローチ**
   - Reference版の分析 → 変換ロジック → コンポーネント → 統合と段階的に進めたことで、問題の早期発見と対応ができた
   
2. **既存コンポーネントの再利用**
   - StructuredPropertySelectorを再利用することで、プロパティ表示機能を効率的に実装できた
   - カスタムノード（MaterialTemplateNode等）も再利用できた
   
3. **型安全な実装**
   - TypeScriptの型定義を最初に作成したことで、実装中の型エラーを早期に発見・修正できた
   
4. **ViewRendererDialogの実装パターン流用**
   - ドラッグ可能なモーダルの実装パターンを流用できた

### 改善が必要な点
1. **テストコードの不足**
   - ユニットテストが未実装。今後、変換ロジックのテストを追加すべき
   
2. **エラーハンドリングの強化**
   - アークが存在しないTransitionノードのハンドリングは実装したが、他のエッジケースも考慮すべき
   
3. **パフォーマンス最適化**
   - 大量のPlace/Arcを持つTransitionの場合のパフォーマンス検証が必要

### 学んだこと
1. **Material-UI → Ant Design v6の変換パターン**
   - Dialog → Modal（modalRender でドラッグ対応）
   - AppBar → カスタムヘッダー（Flex + Space）
   - Toolbar → Space + Flex
   - IconButton → Button type="text"
   
2. **React FlowのProvider構造**
   - ReactFlowProviderでラップすることで、内部でReact Flow APIを使用できる
   
3. **ペトリネット構造の変換**
   - parseMaimlToPetriNetの結果をSubNetViewer用に変換する必要があった
   - templateMapをXML要素を含む形式に変換する必要があった
   
4. **useEffectでのstate更新タイミング**
   - 早期リターン前のsetStateはESLintエラーになる
   - 初期値で対応するか、条件内でのみsetStateを呼ぶ必要がある
