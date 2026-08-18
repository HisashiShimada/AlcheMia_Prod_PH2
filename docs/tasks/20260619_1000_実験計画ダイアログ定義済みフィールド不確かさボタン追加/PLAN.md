# タスク計画書: 実験計画ダイアログ定義済みフィールドへの不確かさ選択ボタン追加

## メタデータ
- **作成日時**: 2026-06-19 10:02
- **タスクID**: 実験計画ダイアログ不確かさボタン追加
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
実験計画詳細指示ダイアログ（ExperimentPlanDialog）内のテンプレート入力パネルにて、
MAIMLから定義された標準フィールド（温度・圧力・撹拌速度など）のラベル右端に
「不確かさ選択」ボタンを配置する。

## 目的と期待される成果
- [ ] 定義済みフィールド（TemplateDef.fields）の各行に「不確かさ選択」ボタンが表示される
- [ ] ボタン押下で UncertaintyCriteriaSelectorModal が開く
- [ ] カスタムプロパティの「不確かさ選択」ボタンは現状維持

## 実装ステップ
- [ ] ExperimentPlanDialog.tsx の TemplateInputPanel 内 Form.Item の label を改修
- [ ] ラベル行を Row で横並びにし、右端に「不確かさ選択」ボタンを配置
- [ ] ボタンクリック時に setCriteriaSelectorTarget / setCriteriaSelectorOpen を呼び出す

## 変更ファイル
1. `frontend/src/components/project/ExperimentPlanDialog.tsx` - Form.Item の label 部分を改修

## 承認記録
- **承認日時**: 2026-06-19 10:02
