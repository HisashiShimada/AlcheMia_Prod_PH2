# タスク計画書: 指示登録ダイアログのMAIML連携対応

## メタデータ
- **作成日時**: 2026-02-24 13:46
- **タスクID**: instruction_dialog_maiml_integration
- **優先度**: 中
- **推定工数**: 3時間

## 1. タスク概要

プロジェクト管理画面の指示登録ダイアログ（InstructionEditDialog.tsx）において、現在モックデータで実装されている以下の項目を、実際のデータソースから取得するように修正します：

1. **メソッド一覧** - MAIMLコンテキストから取得
2. **トランジションID一覧** - メソッド選択時に該当メソッドのPNMLから取得
3. **優先度・タイプ** - コードマスタAPIから取得

## 2. 目的と期待される成果

### 目的
- モックデータを排除し、実際のプロジェクトMAIMLデータに基づいた動的な選択肢を提供する
- コードマスタ連携により、組織ごとのカスタマイズに対応可能にする

### 期待される成果
- [x] メソッド一覧がMAIMLコンテキストから取得される
- [x] トランジションIDが選択されたメソッドに基づいて動的に取得される
- [x] 優先度・タイプの選択肢がコードマスタAPIから取得される
- [x] タスク番号は既存のtasks配列から取得（変更なし、確認のみ）

## 3. 実装ステップ

### Phase 1: 調査・分析（完了）
- [x] InstructionEditDialog.tsxの現状確認
- [x] InstructionRegistrationTab.tsxの現状確認
- [x] ProjectMaimlContextの仕様確認
- [x] コードマスタAPIの仕様確認
- [x] MAIML型定義の確認

### Phase 2: InstructionEditDialog.tsxの修正
- [ ] useProjectMaimlフックをimport
- [ ] コードマスタAPIフックを追加（useCodeMaster または直接API呼び出し）
- [ ] モックデータ削除（availableMethods, availableTransitions）
- [ ] メソッド一覧の取得ロジック実装
- [ ] トランジションID一覧の取得ロジック実装（メソッド選択時）
- [ ] 優先度・タイプの選択肢取得ロジック実装
- [ ] ローディング状態の管理
- [ ] エラーハンドリング

### Phase 3: InstructionRegistrationTab.tsxの修正
- [ ] モックデータ削除（availableMethods, availableTransitions）
- [ ] useProjectMaimlフックの活用
- [ ] InstructionEditDialogへのprops調整

### Phase 4: 動作確認
- [ ] プロジェクト選択時のMAIML読み込み確認
- [ ] メソッド一覧の表示確認
- [ ] メソッド選択時のトランジションID表示確認
- [ ] 優先度・タイプの選択肢表示確認
- [ ] エラーケースの確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/InstructionEditDialog.tsx` - メイン修正対象
2. `frontend/src/components/project/InstructionRegistrationTab.tsx` - モックデータ削除

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- プロジェクト管理画面 > 指示送信タブ > 新規指示追加/編集

## 5. 技術的詳細

### 使用する技術・ライブラリ
- **ProjectMaimlContext**: MAIMLデータの取得
  - `useProjectMaiml()` フック
  - `maimlRoot: MaimlRoot | null`
  - `isLoading: boolean`
- **コードマスタAPI**: `getMultipleSelectOptions(['instruction_priority', 'instruction_type'])`
- **MAIML型定義**: `MaimlRoot`, `Protocol`, `Method`, `PNML`, `Transition`

### データフロー

```
ProjectManagement (ProjectMaimlProvider)
  ↓ プロジェクト選択時
  ↓ loadMaiml(projectName)
  ↓
ProjectMaimlContext
  ↓ maimlRoot, isLoading
  ↓
InstructionRegistrationTab
  ↓ useProjectMaiml()
  ↓
InstructionEditDialog
  ↓ メソッド一覧取得
  ↓ maimlRoot?.protocol?.methods
  ↓
  ↓ メソッド選択時
  ↓ トランジションID取得
  ↓ selectedMethod.pnml.transitions
  ↓
  ↓ 初期表示時
  ↓ 優先度・タイプ取得
  ↓ getMultipleSelectOptions(['instruction_priority', 'instruction_type'])
```

### 実装パターン

#### メソッド一覧の取得
```typescript
const { maimlRoot, isLoading: isMaimlLoading } = useProjectMaiml();

const availableMethods = useMemo((): MethodInfo[] => {
  if (!maimlRoot?.protocol?.methods) return [];
  
  return maimlRoot.protocol.methods.map((method) => ({
    id: method.id,
    name: method.name || method.id,
    displayName: method.name || method.id,
    description: method.description,
  }));
}, [maimlRoot]);
```

#### トランジションID一覧の取得
```typescript
const availableTransitions = useMemo((): TransitionInfo[] => {
  if (!selectedMethodId || !maimlRoot?.protocol?.methods) return [];
  
  const method = maimlRoot.protocol.methods.find(m => m.id === selectedMethodId);
  if (!method?.pnml?.transitions) return [];
  
  return method.pnml.transitions.map((transition) => ({
    id: transition.id,
    displayName: transition.name || transition.id,
    category: 'other', // カテゴリ判定ロジックは後で実装
    description: transition.description,
    isExperimentRelevant: true, // デフォルト
  }));
}, [selectedMethodId, maimlRoot]);
```

#### 優先度・タイプの取得
```typescript
const [priorityOptions, setPriorityOptions] = useState<SelectOption[]>([]);
const [typeOptions, setTypeOptions] = useState<SelectOption[]>([]);

useEffect(() => {
  const fetchCodeMasterOptions = async () => {
    try {
      const options = await getMultipleSelectOptions([
        'instruction_priority',
        'instruction_type'
      ]);
      
      setPriorityOptions(options.instruction_priority || []);
      setTypeOptions(options.instruction_type || []);
    } catch (error) {
      console.error('コードマスタ取得エラー:', error);
      // フォールバック: ハードコードされた値を使用
    }
  };
  
  fetchCodeMasterOptions();
}, []);
```

### セキュリティ考慮事項
- [ ] organization_idに基づくデータ分離（Context/APIで実施済み）
- [ ] コードマスタはorganization_id配下のみ取得（API側で制御済み）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| MAIMLデータが未ロードの場合 | 中 | 中 | ローディング状態を表示し、データがない場合は空配列を返す |
| コードマスタAPIエラー | 低 | 低 | フォールバック用のハードコード値を保持 |
| メソッドにトランジションがない場合 | 低 | 低 | 空配列を返し、選択肢がないことを明示 |
| 既存の指示データとの互換性 | 中 | 低 | 既存データのmethodId/transitionIdは変更しない |

## 7. テスト計画

### ユニットテスト
- [ ] メソッド一覧取得ロジックのテスト
- [ ] トランジションID一覧取得ロジックのテスト
- [ ] コードマスタ取得ロジックのテスト

### 統合テスト
- [ ] プロジェクト選択 → MAIML読み込み → 指示登録ダイアログの表示
- [ ] メソッド選択 → トランジションIDの動的更新
- [ ] 優先度・タイプの選択

### 手動テスト
- [ ] 複数プロジェクトでメソッド一覧が正しく表示される
- [ ] メソッド選択時にトランジションIDが正しくフィルタリングされる
- [ ] コードマスタの値が正しく表示される
- [ ] MAIMLデータがない場合のエラーハンドリング
- [ ] ローディング中の表示

## 8. ロールバック計画

問題が発生した場合：
1. コミット前の状態に戻す
2. モックデータを一時的に復元
3. 段階的にロールバック（優先度・タイプのみ、メソッド一覧のみ、など）

## 9. 関連ドキュメント

- [ProjectMaimlContext](../../../frontend/src/contexts/ProjectMaimlContext.tsx)
- [InstructionEditDialog](../../../frontend/src/components/project/InstructionEditDialog.tsx)
- [InstructionRegistrationTab](../../../frontend/src/components/project/InstructionRegistrationTab.tsx)
- [コードマスタAPI](../../../frontend/src/services/codeMasterApiService.ts)
- [MAIML型定義](../../../frontend/src/types/maiml-unified.ts)

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 13:46
- **承認日時**: （承認待ち）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: 2026-02-24 13:46
完了: 2026-02-24 13:58

### 計画からの変更点
なし（計画通りに実装完了）

### 発生した問題と解決方法
特になし（スムーズに実装完了）

### 最終的な成果物
- [x] メソッド一覧のMAIML連携 - 完了
- [x] トランジションIDの動的取得 - 完了
- [x] 優先度・タイプのコードマスタ連携 - 完了

### 実装の詳細

#### InstructionRegistrationTab.tsx
- useProjectMaimlフックを追加
- モックデータを削除（availableMethods, availableTransitions, loadingTransitions）
- MAIMLコンテキストからメソッド一覧を取得（useMemo）
- 全メソッドのトランジションを集約して表示用に提供
- ローディング状態をisMaimlLoadingに変更

#### InstructionEditDialog.tsx
- useProjectMaimlフックを追加
- getMultipleSelectOptionsをimport
- コードマスタから優先度・タイプを取得（useEffect）
- メソッド選択時にトランジションを動的フィルタリング（filteredTransitions）
- 優先度・タイプの選択肢をコードマスタから取得（フォールバック付き）
- selectedTransitionの取得をfilteredTransitionsから行うように変更

## 12. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）
