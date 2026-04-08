# language: ja
#
# テスト実行情報
#   URL      : http://localhost:3000/?orgId=a0718dc5-21f3-44e6-87e9-cc2ae83f3385
#   ユーザID  : exp.admin@example.com
#   パスワード: admin123
#
# テスト方法: 手動テスト
#   SubNetViewerはPetriNetViewer上のTransitionノードクリックで起動するダイアログであり、
#   ReactFlow/DOM操作の目視確認が必要なため、Playwrightによる自動化対象外。
#
# 前提条件:
#   - 実験管理者ロールでログイン済み
#   - テスト用プロジェクトがDB・S3に存在し、MAIMLファイルが登録済みであること
#   - 以下の構造を持つテスト用MAIMLファイルを用意すること：
#     - Material/Condition/Result の各Placeノードが少なくとも1件ずつ存在すること
#     - Transitionノードが少なくとも1件存在し、
#       入力Place（Material/Condition）・出力Place（Result）が接続されていること
#     - 各PlaceノードにMAIMLテンプレート（materialTemplate / conditionTemplate /
#       resultTemplate）が定義されており、placeRef ref="..." で接続されていること
#     - テンプレートに <property> 要素が少なくとも1件以上定義されていること
#     - <data><results> セクションに実験結果値が記録されていること
#   - PetriNetViewer で対象プロジェクトのMAIMLを閲覧できる状態であること
#
# 参照資料:
#   - タスク計画書  : docs/改善仕様調査/No.28/result.md
#   - テストシナリオ: tests/e2e/test-scenarios/4_experiment_admin.md §4-17
#
# 実装ファイル:
#   - frontend/src/components/viewer/PetriNetViewer.tsx（Fix1, Fix6, Fix8c）
#   - frontend/src/components/viewer/dialogs/SubNetViewer.tsx（Fix2, Fix3, Fix8b）
#   - frontend/src/reference/components/SubNetViewer/index.js（Fix2: reference版）
#   - frontend/src/components/viewer/dialogs/PropertyViewer.tsx（Fix4）
#   - frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx（Fix5, Fix7）
#   - frontend/src/utils/maimlDataExtractor.ts（Fix8a: 新規作成）
#
# No.28修正前の問題点（修正後に解消されていることを確認すること）:
#   - SubNetViewerのPropertyViewerで「テンプレート詳細情報が取得できませんでした」が表示される
#   - テンプレートタブに「表示するプロパティがありません」と表示される
#   - Object型のプロパティが [object Object] として表示される
#   - placeRef 要素がテンプレートタブに表示される
#
# templateMap の仕組み:
#   - buildTemplateMap() のキーは placeId（placeRef.ref の値）
#   - placeId と templateId が異なる場合に templateId でフォールバック
#   - <data><results>.*ref は templateID を参照する（placeID ではない）

機能: [4-17] SubNetViewer トランジション用テンプレート表示
  実験管理者がPetriNetViewerでTransitionノードをクリックした際に起動するSubNetViewerダイアログにおいて、
  入出力PlaceノードのテンプレートType（Material/Condition/Result）と
  PropertyViewerの各タブ（基本情報・テンプレート・データ）が正しく表示される機能。
  4-17-1 : PetriNetViewer でTransitionノードをクリックするとSubNetViewerダイアログが開くこと
  4-17-2 : SubNetViewer内の入力Placeノードのテンプレート種別が正しく表示されること
  4-17-3 : SubNetViewer内の出力Placeノードのテンプレート種別が正しく表示されること
  4-17-4 : SubNetViewer内でPlaceノードをクリックするとPropertyViewerが開くこと
  4-17-5 : SubNetViewerのPropertyViewer「テンプレートタブ」にプロパティが表示されること
  4-17-6 : SubNetViewerのPropertyViewer「基本情報タブ」に id/名前/説明/種別が表示されること
  4-17-7 : SubNetViewerのPropertyViewer「基本情報タブ」に placeRef が表示されないこと
  4-17-8 : SubNetViewerのPropertyViewer「データタブ」に実験結果値が個別フィールドに展開されて表示されること
  4-17-9 : placeId と templateId が異なるケースでも templateIdキーでフォールバックしてテンプレート情報が取得されること
  4-17-10: PetriNetViewer でPlaceノードをクリックするとPropertyViewerが開き、テンプレートタブにプロパティが表示されること
  4-17-11: PetriNetViewer のPlaceノードのPropertyViewer「データタブ」に実験結果値が表示されること
  4-17-12: PropertyViewer のテンプレートタブで property_ プレフィックスが除去されたキー名が表示されること
  4-17-13: PropertyViewerWithSelection で Object型の値がキー・値ペアに展開されて表示されること
  4-17-14: 複数種別が混在するMAIMLファイルで SubNetViewer を開いた際、各Placeノードの種別が正しく識別されること
  4-17-15: SubNetViewer（reference版 JavaScript）でも placeIdキーでtemplateMaplにヒットし、テンプレート種別が正しく表示されること
  4-17-16: SubNetViewer で templateMap にヒットしないPlaceノードが存在した場合でも、他のPlaceノードは正常に表示されること

  背景:
    前提 実験管理者のユーザID "exp.admin@example.com" がDB（organization_userテーブル）に存在する

  # ===========================================================================
  # [4-17-1] PetriNetViewer でTransitionノードをクリックするとSubNetViewerダイアログが開くこと
  # ===========================================================================

  @4-17-1 @manual
  シナリオ: [4-17-1] PetriNetViewer でTransitionノードをクリックするとSubNetViewerダイアログが開くこと
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §動作確認ポイント4
    #       SubNetViewer起動の前提確認
    #
    # 手動テスト手順:
    #   1. 実験管理者としてログインし、テスト用プロジェクトをビューアモード（PetriNetViewer）で開く
    #   2. MAIMLのペトリネットが描画されていることを確認する
    #   3. Transitionノードをクリックする
    #
    # 確認ポイント:
    #   - SubNetViewer ダイアログが画面に表示されること
    #   - ダイアログ内に入力Placeと出力Placeのサブネットが描画されていること

  # ===========================================================================
  # [4-17-2] SubNetViewer内の入力Placeノードのテンプレート種別が正しく表示されること
  # ===========================================================================

  @4-17-2 @manual
  シナリオ: [4-17-2] SubNetViewer内の入力Placeノードのテンプレート種別（Material/Condition/Result）が正しく表示されること
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §Fix2「templateMapキー不一致修正」
    #       placeIdキーでtemplateMaplにヒットすること
    #
    # 手動テスト手順:
    #   1. Transitionノードをクリックして SubNetViewer ダイアログを開く
    #   2. SubNetViewer 内の入力Placeノード（Material/Condition）のテンプレート種別ラベルを目視確認する
    #
    # 確認ポイント:
    #   - Material Placeノードには「Material」または対応するテンプレート種別が表示されること
    #   - Condition Placeノードには「Condition」または対応するテンプレート種別が表示されること
    #   - 変更前のような「テンプレート詳細情報が取得できませんでした」が表示されないこと

  # ===========================================================================
  # [4-17-3] SubNetViewer内の出力Placeノードのテンプレート種別が正しく表示されること
  # ===========================================================================

  @4-17-3 @manual
  シナリオ: [4-17-3] SubNetViewer内の出力Placeノードのテンプレート種別（Material/Condition/Result）が正しく表示されること
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §Fix2「templateMapキー不一致修正」
    #       placeIdキーでtemplateMaplにヒットすること
    #
    # 手動テスト手順:
    #   1. Transitionノードをクリックして SubNetViewer ダイアログを開く
    #   2. SubNetViewer 内の出力Placeノード（Result）のテンプレート種別ラベルを目視確認する
    #
    # 確認ポイント:
    #   - Result Placeノードには「Result」または対応するテンプレート種別が表示されること
    #   - 変更前のような「テンプレート詳細情報が取得できませんでした」が表示されないこと

  # ===========================================================================
  # [4-17-4] SubNetViewer内でPlaceノードをクリックするとPropertyViewerが開くこと
  # ===========================================================================

  @4-17-4 @manual
  シナリオ: [4-17-4] SubNetViewer内でPlaceノードをクリックするとPropertyViewerが開くこと
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §動作確認ポイント1
    #       ノードクリック時のDrawer起動確認
    #
    # 手動テスト手順:
    #   1. Transitionノードをクリックして SubNetViewer ダイアログを開く
    #   2. SubNetViewer 内の任意のPlaceノードをクリックする
    #
    # 確認ポイント:
    #   - PropertyViewer（Drawer）が開くこと
    #   - 基本情報・テンプレート・データの3タブが表示されること

  # ===========================================================================
  # [4-17-5] SubNetViewerのPropertyViewer「テンプレートタブ」にプロパティが表示されること
  # ===========================================================================

  @4-17-5 @manual
  シナリオ: [4-17-5] SubNetViewerのPropertyViewer「テンプレートタブ」に property 要素がキー/xsi:type/値/説明・単位の列で表示されること
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §Fix3「extractTemplateInfo新実装」
    #       §Fix4「テンプレートタブ専用カラム」
    #       変更前は「表示するプロパティがありません」と表示されていた
    #
    # 手動テスト手順:
    #   1. SubNetViewer ダイアログを開く
    #   2. Placeノード（例: Material）をクリックして PropertyViewer を開く
    #   3. 「テンプレート」タブをクリックする
    #
    # 確認ポイント:
    #   - テンプレートタブにプロパティ一覧テーブルが表示されること
    #   - テーブルに「キー」「xsi:type」「値」「説明・単位」の列が存在すること
    #   - プロパティ行にデータが表示されること（「表示するプロパティがありません」と表示されないこと）

  # ===========================================================================
  # [4-17-6] SubNetViewerのPropertyViewer「基本情報タブ」に id/名前/説明/種別が表示されること
  # ===========================================================================

  @4-17-6 @manual
  シナリオ: [4-17-6] SubNetViewerのPropertyViewer「基本情報タブ」に id / 名前 / 説明 / 種別 が表示されること
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §Fix3「uuid/description追加」
    #       placeRef が表示されないこと（内部参照のため非表示）
    #
    # 手動テスト手順:
    #   1. SubNetViewer ダイアログを開き、Placeノードをクリックして PropertyViewer を開く
    #   2. 「基本情報」タブを確認する
    #
    # 確認ポイント:
    #   - id（UUID）が表示されること
    #   - 名前が表示されること
    #   - 説明が表示されること（設定がある場合）
    #   - 種別（material / condition / result）が表示されること

  # ===========================================================================
  # [4-17-7] SubNetViewerのPropertyViewer「基本情報タブ」に placeRef が表示されないこと
  # ===========================================================================

  @4-17-7 @manual
  シナリオ: [4-17-7] SubNetViewerのPropertyViewer「基本情報タブ」に placeRef が表示されないこと
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §Fix3「placeRef除外」
    #       変更前はplaceRef要素がテンプレートタブに表示されていた
    #
    # 手動テスト手順:
    #   1. SubNetViewer ダイアログを開き、Placeノードをクリックして PropertyViewer を開く
    #   2. 「基本情報」タブ・「テンプレート」タブのプロパティ一覧を確認する
    #
    # 確認ポイント:
    #   - 基本情報タブに「placeRef」という項目が表示されないこと
    #   - テンプレートタブに「placeRef」という行が表示されないこと
    #   - 内部参照情報（placeRef）がユーザに露出しないこと

  # ===========================================================================
  # [4-17-8] SubNetViewerのPropertyViewer「データタブ」に実験結果値が個別フィールドに展開されて表示されること
  # ===========================================================================

  @4-17-8 @manual
  シナリオ: [4-17-8] SubNetViewerのPropertyViewer「データタブ」に <data><results> の実験結果値が個別フィールドに展開されて表示されること
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §Fix8b「SubNetViewerのデータタブ設定」
    #       §Fix8d「property_*の個別展開表示」
    #       例: temperature (value) / temperature (type) / temperature (units) 等が個別行に展開されること
    #
    # 前提条件:
    #   - テスト用MAIMLに <data><results> セクションに実験結果値が記録されていること
    #
    # 手動テスト手順:
    #   1. SubNetViewer ダイアログを開き、実験結果が紐づくPlaceノードをクリックして PropertyViewer を開く
    #   2. 「データ」タブをクリックする
    #
    # 確認ポイント:
    #   - データタブに実験結果値の一覧が表示されること
    #   - 各プロパティが個別行に展開されて表示されること
    #     （例: temperature (value) / temperature (type) / temperature (units)）
    #   - [object Object] のような未展開の表示になっていないこと

  # ===========================================================================
  # [4-17-9] placeId と templateId が異なるケースでも templateIdキーでフォールバックしてテンプレート情報が取得されること
  # ===========================================================================

  @4-17-9 @manual
  シナリオ: [4-17-9] placeId と templateId が異なるケース（placeIdキーでヒットしない場合）でも、templateIdキーでフォールバックしてテンプレート情報が取得されること
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §Fix2「フォールバック: templateIdキー」
    #       フォールバックケースでも「テンプレート詳細情報が取得できませんでした」と表示されないこと
    #
    # 前提条件:
    #   - placeRef.ref が設定されておらず、テンプレートIDでフォールバックするケースのMAIMLデータを用意すること
    #
    # 手動テスト手順:
    #   1. placeId ≠ templateId のMAIMLファイルでビューアを開く
    #   2. 対象Transitionノードをクリックして SubNetViewer を開く
    #   3. 対象Placeノードをクリックして PropertyViewer を開く
    #
    # 確認ポイント:
    #   - テンプレートタブにプロパティが表示されること
    #   - 「テンプレート詳細情報が取得できませんでした」が表示されないこと
    #   - templateIdキーによるフォールバックが動作していること

  # ===========================================================================
  # [4-17-10] PetriNetViewer でPlaceノードをクリックするとPropertyViewerが開き、テンプレートタブにプロパティが表示されること
  # ===========================================================================

  @4-17-10 @manual
  シナリオ: [4-17-10] PetriNetViewer でPlaceノードをクリックすると PropertyViewer（Drawer）が開き、テンプレートタブにプロパティが表示されること
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §Fix6「extractTemplateInfoForNode新実装」
    #       SubNetViewer経由ではなく、PetriNetViewer直接クリック時の表示確認
    #
    # 手動テスト手順:
    #   1. PetriNetViewer（メインキャンバス）でPlaceノードをクリックする（SubNetViewerは経由しない）
    #   2. 開いた PropertyViewer の「テンプレート」タブを確認する
    #
    # 確認ポイント:
    #   - PropertyViewer（Drawer）が開くこと
    #   - テンプレートタブにプロパティが表示されること
    #   - 「表示するプロパティがありません」と表示されないこと

  # ===========================================================================
  # [4-17-11] PetriNetViewer のPlaceノードのPropertyViewer「データタブ」に実験結果値が表示されること
  # ===========================================================================

  @4-17-11 @manual
  シナリオ: [4-17-11] PetriNetViewer のPlaceノードのPropertyViewer「データタブ」に実験結果値が表示されること
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §Fix8c「PetriNetViewerのデータタブ設定」
    #       templateMap[node.id].element.getAttribute('id') でテンプレートIDを取得してマッチ
    #
    # 前提条件:
    #   - テスト用MAIMLに <data><results> セクションに実験結果値が記録されていること
    #
    # 手動テスト手順:
    #   1. PetriNetViewer で実験結果が紐づくPlaceノードをクリックして PropertyViewer を開く
    #   2. 「データ」タブをクリックする
    #
    # 確認ポイント:
    #   - データタブに実験結果値が表示されること
    #   - 各プロパティが個別行に展開されて表示されること

  # ===========================================================================
  # [4-17-12] PropertyViewer のテンプレートタブで property_ プレフィックスが除去されたキー名が表示されること
  # ===========================================================================

  @4-17-12 @manual
  シナリオ: [4-17-12] PropertyViewer のテンプレートタブで property_ プレフィックスが除去されたキー名が表示されること
    # 種別: 表示確認
    # 根拠: docs/改善仕様調査/No.28/result.md §Fix4「property_プレフィックス除去」
    #       property_temperature ではなく temperature と表示されること
    #
    # 手動テスト手順:
    #   1. SubNetViewer または PetriNetViewer で Placeノードをクリックして PropertyViewer を開く
    #   2. 「テンプレート」タブのキー列を確認する
    #
    # 確認ポイント:
    #   - キー名が「property_temperature」ではなく「temperature」と表示されること
    #   - 「property_」プレフィックスが除去されたキー名が表示されること

  # ===========================================================================
  # [4-17-13] PropertyViewerWithSelection で Object型の値がキー・値ペアに展開されて表示されること
  # ===========================================================================

  @4-17-13 @manual
  シナリオ: [4-17-13] PropertyViewerWithSelection で Object型の値がキー・値ペアに展開されて表示されること（[object Object] が表示されないこと）
    # 種別: 表示確認
    # 根拠: docs/改善仕様調査/No.28/result.md §Fix5「Object型値のフラット展開表示」
    #       変更前は [object Object] として表示されていた
    #
    # 手動テスト手順:
    #   1. PropertyViewerWithSelection コンポーネントが使用される画面を開く
    #   2. Object型の値を含むプロパティを持つノードを選択する
    #   3. プロパティ一覧を確認する
    #
    # 確認ポイント:
    #   - Object型の値が「[object Object]」と表示されないこと
    #   - キー・値ペアに展開されて個別行として表示されること

  # ===========================================================================
  # [4-17-14] 複数種別が混在するMAIMLファイルで SubNetViewer を開いた際、各Placeノードの種別が正しく識別されること
  # ===========================================================================

  @4-17-14 @manual
  シナリオ: [4-17-14] 複数種別（material / condition / result）が混在するMAIMLファイルで SubNetViewer を開いた際、各Placeノードの種別が正しく識別されること
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §動作確認ポイント1
    #       同一SubNetViewer内に3種類のPlaceが混在するケースで確認
    #
    # 前提条件:
    #   - テスト用MAIMLに Material/Condition/Result の各Placeノードが1件ずつ以上存在し、
    #     同一のTransitionに接続されていること
    #
    # 手動テスト手順:
    #   1. Material/Condition/Resultの各Placeが接続されたTransitionノードをクリックして
    #      SubNetViewer を開く
    #   2. SubNetViewer 内の各Placeノードの種別表示を確認する
    #
    # 確認ポイント:
    #   - Material Place → 「Material」種別が表示されること
    #   - Condition Place → 「Condition」種別が表示されること
    #   - Result Place → 「Result」種別が表示されること
    #   - 各Placeが正しい種別（色・ラベル等）で区別されて表示されること

  # ===========================================================================
  # [4-17-15] SubNetViewer（reference版 JavaScript）でも placeIdキーでtemplateMaplにヒットし、テンプレート種別が正しく表示されること
  # ===========================================================================

  @4-17-15 @manual
  シナリオ: [4-17-15] SubNetViewer（reference版 JavaScript）でも placeIdキーでtemplateMaplにヒットし、テンプレート種別が正しく表示されること
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §Fix2「reference版（index.js）」
    #       TypeScript版と同様の修正がreference版にも適用されていること
    #
    # 前提条件:
    #   - reference版 SubNetViewer を使用する画面（WorkerDashboard等）が存在する場合、
    #     そちらでも確認すること
    #
    # 手動テスト手順:
    #   1. reference版 SubNetViewer（index.js）が使用される画面を開く
    #   2. Transitionノードをクリックして SubNetViewer を開く
    #   3. 入力・出力Placeノードのテンプレート種別を確認する
    #
    # 確認ポイント:
    #   - reference版でも Placeノードのテンプレート種別が正しく表示されること
    #   - TypeScript版と同様の動作になっていること
    #   - 「テンプレート詳細情報が取得できませんでした」が表示されないこと

  # ===========================================================================
  # [4-17-16] SubNetViewer で templateMap にヒットしないPlaceノードが存在した場合でも、他のPlaceノードは正常に表示されること
  # ===========================================================================

  @4-17-16 @manual
  シナリオ: [4-17-16] SubNetViewer で templateMap にヒットしないPlaceノードが存在した場合でも、他のPlaceノードは正常に表示されること（部分的な失敗が全体に波及しないこと）
    # 種別: 正常系
    # 根拠: docs/改善仕様調査/No.28/result.md §Fix2「ログ警告」
    #       1件のPlaceがtemplateMaplにヒットしなくても他Placeは表示されること
    #
    # 前提条件:
    #   - templateMap にヒットしないPlaceノード（テンプレート未定義のPlace）を含む
    #     Transitionノードが存在すること（または意図的にテンプレート参照を破損させたMAIML）
    #
    # 手動テスト手順:
    #   1. templateMap にヒットしないPlaceを含む Transitionノードをクリックして
    #      SubNetViewer を開く
    #   2. SubNetViewer 内の全Placeノードの表示状態を確認する
    #
    # 確認ポイント:
    #   - templateMap にヒットしないPlaceノードはデフォルト表示またはエラー表示されること
    #   - 他の正常なPlaceノードは引き続き正しいテンプレート種別が表示されること
    #   - SubNetViewer 全体がクラッシュしないこと（部分的失敗が全体に波及しないこと）
    #   - ブラウザコンソールにログ警告（warning）が出力されること
