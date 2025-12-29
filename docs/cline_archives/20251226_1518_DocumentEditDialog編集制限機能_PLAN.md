# タスク計画書: DocumentEditDialog編集制限機能実装

## メタデータ
- **作成日時**: 2025-12-26 15:18
- **タスクID**: document_edit_dialog_format_restriction
- **優先度**: 中
- **推定工数**: 2-3時間

## 1. タスク概要

フォーマット管理からMaiml編集画面に遷移した場合、DocumentEditDialogに編集制限を追加します。
フォーマット管理で作成するMaimlファイルはプロジェクト用のひな形ファイルであるため、プロジェクト固有の情報（基本情報、MaimlID属性、XML署名）は空として編集不可にする必要があります。

## 2. 目的と期待される成果

### 目的
- フォーマット管理のMaimlファイルをひな形として正しく扱う
- プロジェクト固有情報の混入を防ぐ
- ユーザーに編集制限を明確に伝える

### 期待される成果
- [ ] フォーマット管理からの遷移を判定できる
- [ ] 該当する3セクションが編集不可になる
- [ ] 該当セクションが常に空として扱われる
- [ ] バリデーションから除外される
- [ ] ユーザーに制限理由が表示される

## 3. 実装ステップ

### Phase 1: 現状分析

#### Step 1.1: DocumentEditDialog確認
- [ ] DocumentEditDialogコンポーネントの現在の実装を確認
- [ ] propsにsourceContextが渡されているか確認
- [ ] 既存のバリデーションロジックを確認

#### Step 1.2: 呼び出し元確認
- [ ] FormatManagementからの呼び出し方法を確認
- [ ] PetriNetEditorからDocumentEditDialogへの遷移を確認
- [ ] sourceContextの伝播を確認

### Phase 2: 編集制限機能実装

#### Step 2.1: sourceContext判定ロジック追加
- [ ] DocumentEditDialogでsourceContextを判定
- [ ] `sourceContext === 'format'`の場合に制限モードを有効化
- [ ] 制限モードを示すstate変数を追加

#### Step 2.2: UI制限実装
- [ ] 基本情報セクションを編集不可にする
  - 入力フィールドをdisabled化
  - または非表示にして説明テキストを表示
- [ ] MaimlID属性セクションを編集不可にする
  - 入力フィールドをdisabled化
  - または非表示にして説明テキストを表示
- [ ] XML署名セクションを編集不可にする
  - 入力フィールドをdisabled化
  - または非表示にして説明テキストを表示

#### Step 2.3: データ制限実装
- [ ] フォーマット管理モードでは該当フィールドを常に空にする
- [ ] 保存時に該当フィールドを削除/空にする
- [ ] 初期値として空を設定

#### Step 2.4: バリデーション除外
- [ ] フォーマット管理モード時は該当フィールドをバリデーション対象外にする
- [ ] 必須チェックをスキップ
- [ ] エラーメッセージを表示しない

#### Step 2.5: ユーザー通知
- [ ] 制限理由を説明するAlertコンポーネント追加
- [ ] 「フォーマット管理で作成されたファイルのため、プロジェクト固有情報は編集できません」というメッセージ
- [ ] Infoタイプのアラート、モーダル上部に表示

### Phase 3: 多言語対応

#### Step 3.1: 日本語ラベル追加
- [ ] ja.jsonに制限メッセージ追加

#### Step 3.2: 英語ラベル追加
- [ ] en.jsonに制限メッセージ追加

### Phase 4: テスト

#### Step 4.1: 手動テスト
- [ ] フォーマット管理からMaiml編集画面を開く
- [ ] DocumentEditDialogを開く
- [ ] 3セクションが編集不可であることを確認
- [ ] 保存時に該当フィールドが空になることを確認
- [ ] バリデーションエラーが出ないことを確認

#### Step 4.2: プロジェクト管理からの動作確認
- [ ] プロジェクト管理からMaiml編集画面を開く
- [ ] DocumentEditDialogを開く
- [ ] すべてのセクションが編集可能であることを確認
- [ ] バリデーションが正常に動作することを確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editor/DocumentEditDialog.tsx`
   - sourceContext判定ロジック追加
   - 制限モードのstate管理
   - UIの条件分岐
   - バリデーションロジックの条件分岐
2. `frontend/src/locales/ja.json`
   - 制限メッセージの日本語追加
3. `frontend/src/locales/en.json`
   - 制限メッセージの英語追加

### 新規作成するファイル
なし（既存ファイルの修正のみ）

### 影響を受ける機能
- DocumentEditDialog（条件付きで動作変更）
- フォーマット管理のMaiml編集（制限が追加される）
- プロジェクト管理のMaiml編集（変更なし、従来通り）

## 5. 技術的詳細

### 5.1. 制限対象のセクション

1. **基本情報セクション**
   - プロジェクト名
   - 作成者
   - 作成日
   - その他プロジェクト固有の基本情報

2. **MaimlID属性セクション**
   - DocumentのUUID
   - その他一意識別子

3. **XML署名セクション**
   - デジタル署名情報
   - 署名者情報

### 5.2. 実装イメージ

```tsx
// DocumentEditDialog.tsx

interface DocumentEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: DocumentData) => void;
  initialData?: DocumentData;
  sourceContext?: 'format' | 'project'; // ← 既存
}

const DocumentEditDialog: React.FC<DocumentEditDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  sourceContext,
}) => {
  const { t } = useLanguage();
  
  // フォーマット管理モードの判定
  const isFormatMode = sourceContext === 'format';
  
  return (
    <Modal open={open} onClose={onClose}>
      {/* フォーマット管理モードの場合、制限メッセージを表示 */}
      {isFormatMode && (
        <Alert
          type="info"
          message={t('documentEdit.formatModeTitle') || 'フォーマット管理モード'}
          description={
            t('documentEdit.formatModeDescription') || 
            'このファイルはフォーマット管理で作成されたひな形ファイルです。' +
            '基本情報、MaimlID属性、XML署名はプロジェクト取り込み時に設定されるため、' +
            'ここでは編集できません。'
          }
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {/* 基本情報セクション */}
      <Collapse>
        <Panel header="基本情報" key="basic">
          {isFormatMode ? (
            // フォーマットモード: 編集不可メッセージ
            <Alert
              type="warning"
              message={t('documentEdit.sectionDisabled') || 'このセクションは編集できません'}
              description={
                t('documentEdit.basicInfoDisabledReason') || 
                'プロジェクト取り込み時に自動設定されます'
              }
              showIcon
            />
          ) : (
            // 通常モード: 編集可能
            <>
              <Form.Item label="プロジェクト名">
                <Input />
              </Form.Item>
              {/* ... その他のフィールド */}
            </>
          )}
        </Panel>
        
        {/* MaimlID属性セクション */}
        <Panel header="MaimlID属性" key="maimlId">
          {isFormatMode ? (
            <Alert
              type="warning"
              message={t('documentEdit.sectionDisabled')}
              description={
                t('documentEdit.maimlIdDisabledReason') || 
                'プロジェクト取り込み時に一意のIDが生成されます'
              }
              showIcon
            />
          ) : (
            <>
              <Form.Item label="Document UUID">
                <Input />
              </Form.Item>
              {/* ... その他のフィールド */}
            </>
          )}
        </Panel>
        
        {/* XML署名セクション */}
        <Panel header="XML署名" key="signature">
          {isFormatMode ? (
            <Alert
              type="warning"
              message={t('documentEdit.sectionDisabled')}
              description={
                t('documentEdit.signatureDisabledReason') || 
                'プロジェクト取り込み時に署名が生成されます'
              }
              showIcon
            />
          ) : (
            <>
              <Form.Item label="署名者">
                <Input />
              </Form.Item>
              {/* ... その他のフィールド */}
            </>
          )}
        </Panel>
        
        {/* その他の編集可能なセクション */}
        <Panel header="その他の情報" key="other">
          {/* 常に編集可能 */}
          <Form.Item label="説明">
            <Input.TextArea />
          </Form.Item>
        </Panel>
      </Collapse>
    </Modal>
  );
};
```

### 5.3. バリデーションの条件分岐

```tsx
const handleSave = () => {
  // フォーマットモードの場合、制限対象フィールドをバリデーションから除外
  const fieldsToValidate = isFormatMode
    ? ['description', 'other'] // 編集可能なフィールドのみ
    : ['basicInfo', 'maimlId', 'signature', 'description', 'other']; // 全フィールド
  
  // バリデーション実行
  const errors = validateFields(formData, fieldsToValidate);
  
  if (errors.length > 0) {
    // エラー表示
    return;
  }
  
  // 保存処理
  const dataToSave = isFormatMode
    ? {
        ...formData,
        basicInfo: {}, // 空にする
        maimlId: {}, // 空にする
        signature: {}, // 空にする
      }
    : formData;
  
  onSave(dataToSave);
};
```

### 5.4. 多言語対応

**ja.json:**
```json
{
  "documentEdit": {
    "formatModeTitle": "フォーマット管理モード",
    "formatModeDescription": "このファイルはフォーマット管理で作成されたひな形ファイルです。基本情報、MaimlID属性、XML署名はプロジェクト取り込み時に設定されるため、ここでは編集できません。",
    "sectionDisabled": "このセクションは編集できません",
    "basicInfoDisabledReason": "プロジェクト取り込み時に自動設定されます",
    "maimlIdDisabledReason": "プロジェクト取り込み時に一意のIDが生成されます",
    "signatureDisabledReason": "プロジェクト取り込み時に署名が生成されます"
  }
}
```

**en.json:**
```json
{
  "documentEdit": {
    "formatModeTitle": "Format Management Mode",
    "formatModeDescription": "This file is a template created in format management. Basic information, MaiML ID attributes, and XML signatures will be set when importing to a project, so they cannot be edited here.",
    "sectionDisabled": "This section cannot be edited",
    "basicInfoDisabledReason": "Will be automatically set when importing to a project",
    "maimlIdDisabledReason": "A unique ID will be generated when importing to a project",
    "signatureDisabledReason": "A signature will be generated when importing to a project"
  }
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| DocumentEditDialogの現在の実装が想定と異なる | 高 | 中 | 事前に実装を確認し、必要に応じて計画を調整 |
| sourceContextが正しく伝播されない | 高 | 低 | PetriNetEditor経由での伝播を確認 |
| バリデーションロジックの条件分岐漏れ | 中 | 中 | すべてのバリデーション箇所を網羅的に確認 |
| 既存のプロジェクト管理機能への影響 | 高 | 低 | sourceContext判定を正しく実装し、テストで確認 |

## 7. テスト計画

### 手動テスト

#### フォーマット管理モード
- [ ] FormatManagement → PetriNetEditor → DocumentEditDialog を開く
- [ ] 制限メッセージが表示されることを確認
- [ ] 基本情報セクションが編集不可であることを確認
- [ ] MaimlID属性セクションが編集不可であることを確認
- [ ] XML署名セクションが編集不可であることを確認
- [ ] その他のセクションは編集可能であることを確認
- [ ] 保存時にバリデーションエラーが出ないことを確認
- [ ] 保存後、該当フィールドが空であることを確認

#### プロジェクト管理モード
- [ ] ProjectManagement → PetriNetEditor → DocumentEditDialog を開く
- [ ] 制限メッセージが表示されないことを確認
- [ ] すべてのセクションが編集可能であることを確認
- [ ] バリデーションが正常に動作することを確認
- [ ] 保存時にすべてのフィールドが保存されることを確認

## 8. ロールバック計画

問題発生時の対応:
1. sourceContext判定を無効化（常に通常モードとして動作）
2. 変更をGitで巻き戻し

## 9. 関連ドキュメント

- [Maiml編集画面修正PLAN（2025-12-23）](./20251223_1438_Maiml編集画面修正_PLAN.md)
- [Phase6-7実装PLAN（2025-12-26）](./20251226_1354_Phase6-7実装_テンプレート種別選択とモックデータ修正_PLAN.md)

## 10. 承認記録

- **計画書提示日時**: 2025-12-26 15:18
- **承認日時**: （承認待ち）
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
開始: （実施開始時に記入）
完了: （実施完了時に記入）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）

### 最終的な成果物
- [ ] DocumentEditDialog修正完了
- [ ] 多言語ファイル更新完了
- [ ] テスト完了

## 12. 振り返り

### うまくいった点
（完了後に記録）

### 改善が必要な点
（完了後に記録）

### 学んだこと
（完了後に記録）
