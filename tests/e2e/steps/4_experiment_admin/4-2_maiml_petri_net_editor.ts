/**
 * ステップ定義: [4-2] MAIML編集（PetriNetEditor）
 *
 * 対応 feature: tests/e2e/features/4_experiment_admin/4-2_maiml_petri_net_editor.feature
 *
 * テスト実行情報:
 *   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
 *   ユーザID  : exp.admin@example.com
 *   パスワード: expAdmin123
 *
 * ⚠️ 注意: 全シナリオに @manual タグが付与されています。
 *          GUI操作が複雑かつ専門的なため、Playwrightによる自動化対象外です。
 *          各シナリオは feature ファイルに記載の手動テスト手順に従って実施してください。
 *
 * 手動テストシナリオ一覧:
 *   4-2-1:  PetriNetEditorでワークフローを開いて表示できること
 *   4-2-2:  PetriNetEditorでノード・トランジションを編集して保存できること
 *   4-2-3:  編集内容がS3に反映されMAIMLファイルが更新されること
 *   4-2-4:  ペトリネット編集画面が表示されること（ノード・エッジの描画確認）
 *   4-2-5:  ビューモードを「テンプレート」に切り替えるとテンプレート一覧が表示されること
 *   4-2-6:  メソッドタブからメソッドを追加でき、タブが増えること
 *   4-2-7:  ツールバーの「Material」ボタンでMaterialノードがキャンバスに追加されること
 *   4-2-8:  ツールバーの「Condition」ボタンでConditionノードがキャンバスに追加されること
 *   4-2-9:  ツールバーの「Result」ボタンでResultノードがキャンバスに追加されること
 *   4-2-10: ツールバーの「Transition」ボタンでTransitionノードがキャンバスに追加されること
 *   4-2-11: ワークフロー取込モードを有効にしてMAIMLファイルを選択するとサブネットが追加されること
 *   4-2-12: Documentボタンからドキュメント情報を編集して保存できること
 *   4-2-13: バリデーションボタンをクリックするとバリデーション結果パネルが表示されること
 *   4-2-14: バリデーションエラーがある場合にエラー箇所が強調表示されること
 *   4-2-15: 保存ダイアログからS3への保存ができること
 *   4-2-16: Draftボタンから下書き管理ダイアログが開き、現在の編集内容を下書き保存できること
 *   4-2-17: 自動保存をONにすると一定時間ごとに下書きが自動保存されること
 *   4-2-18: ValidationPanelでエラー一覧の各行にチェックボックスが表示されること
 *   4-2-19: ValidationPanelでエラーを1件以上選択すると「自動補正」ボタンが活性化されること
 *   4-2-20: エラー未選択の状態で「自動補正」ボタンをクリックすると警告メッセージが表示されること
 *   4-2-21: version属性が欠落したMAIMLに対して自動補正を実行するとversion="1.0"が追加されること
 *   4-2-22: 名前空間が欠落したMAIMLに対して自動補正を実行すると正しいxmlnsが追加されること
 *   4-2-23: 未定義の参照（reference_error）を含むMAIMLに対して自動補正を実行すると無効なref属性が削除されること
 *   4-2-24: 保存ダイアログの「自動補正して保存」ボタンをクリックすると補正処理が実行された後に保存されること
 *   4-2-25: 重複IDエラー・シンタックスエラーは自動補正の対象外であり、補正後もエラーが残ること
 *   4-2-26: 自動補正適用後に再バリデーションが自動実行され、ValidationPanelの結果が更新されること
 *   4-2-27: ビューモードを「XMLビュー」に切り替えるとXMLビューパネルが表示されること
 *   4-2-28: XMLビューにMAIML XMLがシンタックスハイライト付きで表示されること
 *   4-2-29: ペトリネットにノード/エッジを追加後にXMLビューへ切り替えると追加内容がXMLに反映されること
 *   4-2-30: 複数メソッドモードで各メソッドのXMLが正しく出力されること
 *   4-2-31: XMLビューの「コピー」ボタンをクリックするとXML文字列がクリップボードにコピーされること
 *   4-2-32: XMLビューの「ダウンロード」ボタンをクリックすると.xmlファイルがダウンロードされること
 *   4-2-33: XMLビューからペトリネットビューに戻るとビューポート（位置・ズーム）が保持されること
 *   4-2-34: ペトリネット/テンプレート/XMLビューの3モード間で相互に切り替えられること
 *   4-2-35: 単一Methodのノードをドラッグで移動して保存すると<position>タグが出力されること
 *   4-2-36: 複数Methodのノードをドラッグで移動して保存すると<position>タグが出力されること
 *   4-2-37: <position>タグを含むMAIMLを読み込むとノードが保存時の座標に配置されること
 *   4-2-38: <position>タグを含まない旧形式のMAIMLを読み込むと自動レイアウトが適用されること
 *   4-2-39: ノード移動→保存→ダウンロード→再読み込みでノード位置が一致すること（往復整合性）
 *
 * 前提条件（テストデータ）:
 *   - organization_user テーブルに実験管理者ユーザーが存在すること
 *   - テスト用プロジェクトがDB・S3に存在すること
 *   - プロジェクトにMAIMLファイルが登録済みであること
 *   - プロジェクトがチェックアウト済みであること（編集ロックを取得済み）
 *   - プロジェクト管理タブでプロジェクトを選択後、「編集」ボタンから
 *     実験フロー編集画面（PetriNetEditor）を開いていること
 *
 * 参照設計書:
 *   - Petri Netエディタ画面設計: docs/design/ui/experiment_admin/04_maiml_editor/petri_net/PetriNetEditorScreen.md
 *   - Petri Netエディタコア設計: docs/design/ui/experiment_admin/04_maiml_editor/petri_net/PetriNetEditor.md
 *   - エディタツールバー設計:    docs/design/ui/experiment_admin/04_maiml_editor/petri_net/EditorToolbar.md
 *   - バリデーションパネル設計:  docs/design/ui/experiment_admin/04_maiml_editor/petri_net/ValidationPanel.md
 *   - 下書き管理設計:           docs/design/ui/experiment_admin/04_maiml_editor/document/DraftManager.md
 *   - ドキュメント編集ダイアログ設計: docs/design/ui/experiment_admin/04_maiml_editor/document/DocumentEditDialog.md
 *
 * TODO: ユーザーID・パスワードは仮値。実際の値に要更新。
 * TODO: 組織IDは playwright.config.ts の baseURL と合わせること。
 */

import { createBdd } from 'playwright-bdd';
import { closeDb } from '../../db';

const { Given, AfterAll } = createBdd();

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** テスト対象の組織ID（playwright.config.ts の baseURL と合わせる） */
const ORG_ID = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

/**
 * テスト用ユーザー（実験管理者）
 * TODO: 実際の実験管理者ユーザーIDとパスワードに更新すること
 */
const ADMIN_EMAIL = 'exp.admin@example.com';
const ADMIN_PASSWORD = 'expAdmin123';

/** テスト用プロジェクト情報 */
const TEST_PROJECT_NAME = 'E2Eテスト用プロジェクト_4-2';

// ---------------------------------------------------------------------------
// AfterAll フック: DB 接続クローズ
// ---------------------------------------------------------------------------

AfterAll(async () => {
  await closeDb();
});

// ---------------------------------------------------------------------------
// Given: 前提条件ステップ（背景）
// ---------------------------------------------------------------------------

/**
 * 実験管理者のユーザIDがDBに存在する（背景ステップ）
 * → organization_user テーブルに事前登録済みのため no-op
 */
Given(
  '実験管理者のユーザID {string} がDB（organization_userテーブル）に存在する',
  async ({}, _email: string) => {
    console.log(`[4-2 Given] 実験管理者ユーザー前提: no-op (email=${_email})`);
  }
);
