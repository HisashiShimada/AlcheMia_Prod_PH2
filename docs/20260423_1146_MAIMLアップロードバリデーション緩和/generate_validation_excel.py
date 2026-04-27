"""
MAIMLアップロードバリデーション 説明資料 Excel生成スクリプト
（canBeIgnoredOnUpload方式対応版）
"""
import openpyxl
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side, GradientFill
)
from openpyxl.utils import get_column_letter

OUTPUT_PATH = "/home/mi_ito/mmdpf/docs/20260423_1146_MAIMLアップロードバリデーション緩和/MAIMLバリデーション仕様.xlsx"

# ===== カラー定義 =====
COLOR_ERROR_BG      = "FFCCCC"  # 赤系（致命的エラー）
COLOR_IGNORABLE_BG  = "FCE4D6"  # オレンジ系（編集可能エラー）
COLOR_WARNING_BG    = "FFF2CC"  # 黄系（警告）
COLOR_OK_BG         = "D9EAD3"  # 緑系（OK）
COLOR_HEADER_BG     = "4472C4"  # 青（ヘッダー）
COLOR_SECTION_BG    = "D9E1F2"  # 薄青（セクションヘッダー）
COLOR_STRICT_BG     = "FCE4D6"  # 薄オレンジ（strictモード列）
COLOR_LENIENT_BG    = "E2EFDA"  # 薄緑（lenientモード列）
COLOR_WHITE         = "FFFFFF"
COLOR_DARK_BLUE     = "1F3864"

def make_border(thin=True):
    style = "thin" if thin else "medium"
    s = Side(style=style, color="000000")
    return Border(left=s, right=s, top=s, bottom=s)

def make_fill(hex_color):
    return PatternFill(start_color=hex_color, end_color=hex_color, fill_type="solid")

def set_header_cell(ws, row, col, value, bg=COLOR_HEADER_BG, font_color=COLOR_WHITE,
                    bold=True, size=10, wrap=True, align_h="center"):
    cell = ws.cell(row=row, column=col, value=value)
    cell.fill = make_fill(bg)
    cell.font = Font(bold=bold, color=font_color, size=size, name="Meiryo UI")
    cell.alignment = Alignment(horizontal=align_h, vertical="center", wrap_text=wrap)
    cell.border = make_border()
    return cell

def set_data_cell(ws, row, col, value, bg=COLOR_WHITE, bold=False, size=9,
                  align_h="left", wrap=True, font_color="000000"):
    cell = ws.cell(row=row, column=col, value=value)
    cell.fill = make_fill(bg)
    cell.font = Font(bold=bold, color=font_color, size=size, name="Meiryo UI")
    cell.alignment = Alignment(horizontal=align_h, vertical="center", wrap_text=wrap)
    cell.border = make_border()
    return cell

def create_sheet1(wb):
    """
    シート1: バリデーション一覧表（アップロード vs 保存）
    """
    ws = wb.create_sheet("バリデーション一覧", 0)
    ws.sheet_view.showGridLines = False

    # ===== タイトル =====
    ws.merge_cells("A1:H1")
    title_cell = ws["A1"]
    title_cell.value = "MAIMLバリデーション仕様一覧　（アップロード時 vs 編集画面保存時）"
    title_cell.fill = make_fill(COLOR_DARK_BLUE)
    title_cell.font = Font(bold=True, color=COLOR_WHITE, size=13, name="Meiryo UI")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    # ===== 凡例 =====
    ws.merge_cells("A2:H2")
    legend_cell = ws["A2"]
    legend_cell.value = (
        "🔴 致命的エラー：アップロード/保存が拒否される　　"
        "🟠 編集可能エラー：アップロードは許可、編集画面で要補正　　"
        "🟡 警告：処理続行・メッセージ表示のみ　　"
        "✅ OK：問題なし"
    )
    legend_cell.fill = make_fill("F2F2F2")
    legend_cell.font = Font(size=9, name="Meiryo UI")
    legend_cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[2].height = 18

    # ===== ヘッダー行 =====
    headers = [
        ("A", "カテゴリ",       15),
        ("B", "バリデーション項目",  32),
        ("C", "対象XML要素",     28),
        ("D", "説明",           38),
        ("E", "アップロード時\n（lenientモード）", 16),
        ("F", "編集画面保存時\n（strictモード）",  14),
        ("G", "編集画面で\n修正可能？",           10),
        ("H", "備考",           30),
    ]
    for i, (col_letter, label, width) in enumerate(headers, start=1):
        ws.column_dimensions[col_letter].width = width
        set_header_cell(ws, 3, i, label)
    ws.row_dimensions[3].height = 32

    # ===== データ定義 =====
    # (カテゴリ, 項目名, 対象要素, 説明, アップロード, 保存, 編集可能, 備考)
    data = [
        # ---- 構造的エラー（両モードともエラー）----
        ("_SEC_", "🔴 致命的エラー（アップロード時・保存時 どちらもエラーで拒否）", "", "", "", "", "", ""),

        ("XML解析",
         "XML構文エラー",
         "—",
         "XMLとして解析できない（タグの不整合、文字エンコードエラー等）",
         "🔴 致命的エラー", "🔴 エラー", "✗", "XMLを修正してから再アップロード"),

        ("基本構造",
         "ルート要素（maiml）欠落",
         "<maiml>",
         "MAIMLファイルのルート要素が存在しない",
         "🔴 致命的エラー", "🔴 エラー", "✗", ""),

        ("基本構造",
         "version属性欠落",
         '<maiml version="1.0">',
         "maiml要素にversion属性が設定されていない",
         "🔴 致命的エラー", "🔴 エラー", "✗", ""),

        ("document",
         "document要素欠落",
         "<document>",
         "MAIML必須構造のdocument要素が存在しない",
         "🔴 致命的エラー", "🔴 エラー", "✗", ""),

        ("document",
         "document uuid欠落",
         "<document><uuid>",
         "document要素内のuuid要素が存在しない",
         "🔴 致命的エラー", "🔴 エラー", "✗",
         "アップロード後にproject_uuidフィールドへ格納されるため変更不可"),

        ("document",
         "document UUID形式不正",
         "<document><uuid>",
         "document要素内のuuid値が正しいUUID形式でない",
         "🔴 致命的エラー", "🔴 エラー", "✗", "アップロード後に変更不可のため厳格チェック"),

        ("protocol",
         "protocol要素欠落",
         "<protocol>",
         "MAIML必須構造のprotocol要素が存在しない",
         "🔴 致命的エラー", "🔴 エラー", "✗", ""),

        ("protocol",
         "protocol id属性欠落",
         '<protocol id="...">',
         "protocol要素にid属性が設定されていない",
         "🔴 致命的エラー", "🔴 エラー", "✗", ""),

        ("protocol",
         "protocol uuid欠落",
         "<protocol><uuid>",
         "protocol要素内のuuid要素が存在しない",
         "🔴 致命的エラー", "🔴 エラー", "✗", ""),

        ("method",
         "method要素欠落",
         "<method>",
         "protocol内のmethod要素が存在しない",
         "🔴 致命的エラー", "🔴 エラー", "✗", ""),

        ("method",
         "method uuid欠落",
         "<method><uuid>",
         "method要素内のuuid要素が存在しない",
         "🔴 致命的エラー", "🔴 エラー", "✗", ""),

        ("method",
         "pnml要素欠落",
         "<pnml>",
         "method内のpnml要素が存在しない",
         "🔴 致命的エラー", "🔴 エラー", "✗", ""),

        ("method",
         "program要素欠落",
         "<program>",
         "method内のprogram要素が存在しない",
         "🔴 致命的エラー", "🔴 エラー", "✗", ""),

        ("参照整合性",
         "参照エラー（存在しないIDを参照）",
         "arc/placeRef等",
         "MAIML内に存在しないIDをarcやplaceRefが参照している",
         "🔴 致命的エラー", "🔴 エラー", "✗", "構造的整合性エラー"),

        ("重複ID",
         "重複ID（全要素）",
         "document / method\npnml / program\nplaceRef\nplace / transition / arc\nmaterialTemplate等",
         "MAIML内で同一IDが複数の要素で使用されている",
         "🔴 致命的エラー", "🔴 エラー", "✗",
         "IDの重複はplaceRef等の参照関係を破壊するため\nモードに関わらず常にエラー"),

        # ---- 編集可能エラー（lenientモードでアップロード許可）----
        ("_SEC_IGNORABLE_",
         "🟠 編集可能エラー（アップロードは許可・保存時はエラー）　canBeIgnoredOnUpload=true",
         "", "", "", "", "", ""),

        ("document",
         "document id属性欠落",
         '<document id="...">',
         "document要素にid属性が設定されていない",
         "🟠 編集可能エラー", "🔴 エラー", "✓", "編集画面でid属性を追加可能"),

        ("document",
         "必須子要素欠落（creator）",
         "<document><creator>",
         "document内のcreator要素が存在しない",
         "🟠 編集可能エラー", "🔴 エラー", "✓", "編集画面で追加可能"),

        ("document",
         "必須子要素欠落（vendor）",
         "<document><vendor>",
         "document内のvendor要素が存在しない",
         "🟠 編集可能エラー", "🔴 エラー", "✓", "編集画面で追加可能"),

        ("document",
         "必須子要素欠落（owner）",
         "<document><owner>",
         "document内のowner要素が存在しない",
         "🟠 編集可能エラー", "🔴 エラー", "✓", "編集画面で追加可能"),

        ("document",
         "必須子要素欠落（date）",
         "<document><date>",
         "document内のdate要素が存在しない",
         "🟠 編集可能エラー", "🔴 エラー", "✓", "編集画面で追加可能"),

        ("method",
         "method id属性欠落",
         '<method id="...">',
         "method要素にid属性が設定されていない",
         "🟠 編集可能エラー", "🔴 エラー", "✓", "編集画面でid属性を追加可能"),

        # ---- 警告（両モードとも警告）----
        ("_SEC_", "🟡 警告（アップロード時・保存時 どちらも警告のみ）", "", "", "", "", "", ""),

        ("document",
         "日付フォーマット不正",
         "<document><date>",
         "date要素の値がISO 8601形式でない",
         "🟡 警告", "🟡 警告", "✓", "現状も警告扱い（両モード共通）"),
    ]

    # ===== 行書き込み =====
    row = 4
    for record in data:
        category, item, element, desc, upload, save, editable, note = record

        if category == "_SEC_":
            # 通常セクションヘッダー行
            ws.merge_cells(f"A{row}:H{row}")
            cell = ws.cell(row=row, column=1, value=item)
            is_error_sec = "🔴" in item
            bg = "FFCCCC" if is_error_sec else "FFF2CC"
            cell.fill = make_fill(bg)
            cell.font = Font(bold=True, size=10, name="Meiryo UI", color="000000")
            cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=False)
            cell.border = make_border()
            ws.row_dimensions[row].height = 20
            row += 1
            continue

        if category == "_SEC_IGNORABLE_":
            # 編集可能エラーセクションヘッダー行
            ws.merge_cells(f"A{row}:H{row}")
            cell = ws.cell(row=row, column=1, value=item)
            cell.fill = make_fill(COLOR_IGNORABLE_BG)
            cell.font = Font(bold=True, size=10, name="Meiryo UI", color="000000")
            cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=False)
            cell.border = make_border()
            ws.row_dimensions[row].height = 20
            row += 1
            continue

        # アップロード列の背景色
        if "🔴" in upload:
            upload_bg = COLOR_ERROR_BG
        elif "🟠" in upload:
            upload_bg = COLOR_IGNORABLE_BG
        elif "🟡" in upload:
            upload_bg = COLOR_WARNING_BG
        else:
            upload_bg = COLOR_OK_BG

        save_bg   = COLOR_ERROR_BG if "🔴" in save   else (COLOR_WARNING_BG if "🟡" in save   else COLOR_OK_BG)
        edit_bg   = COLOR_OK_BG if editable == "✓" else COLOR_ERROR_BG

        row_bg = COLOR_WHITE if (row % 2 == 0) else "F8F9FA"

        set_data_cell(ws, row, 1, category, bg=row_bg, align_h="center")
        set_data_cell(ws, row, 2, item, bg=row_bg, bold=True)
        set_data_cell(ws, row, 3, element, bg=row_bg, align_h="center")
        set_data_cell(ws, row, 4, desc, bg=row_bg)
        set_data_cell(ws, row, 5, upload, bg=upload_bg, align_h="center", bold=True)
        set_data_cell(ws, row, 6, save,   bg=save_bg,   align_h="center", bold=True)
        set_data_cell(ws, row, 7, editable, bg=edit_bg, align_h="center", bold=True)
        set_data_cell(ws, row, 8, note, bg=row_bg)

        ws.row_dimensions[row].height = 32
        row += 1

    # 列幅固定（行番号列含む）
    ws.freeze_panes = "A4"

    return ws


def create_sheet2(wb):
    """
    シート2: モード別動作フロー説明
    """
    ws = wb.create_sheet("モード説明", 1)
    ws.sheet_view.showGridLines = False

    # タイトル
    ws.merge_cells("A1:F1")
    c = ws["A1"]
    c.value = "バリデーションモード別 動作フロー"
    c.fill = make_fill(COLOR_DARK_BLUE)
    c.font = Font(bold=True, color=COLOR_WHITE, size=13, name="Meiryo UI")
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    # カラム幅
    col_widths = {"A": 22, "B": 35, "C": 38, "D": 5, "E": 22, "F": 35}
    for col, width in col_widths.items():
        ws.column_dimensions[col].width = width

    # --- Section 1: lenientモード（アップロード時）---
    ws.merge_cells("A3:C3")
    c = ws["A3"]
    c.value = "📤 アップロード時（lenient モード）"
    c.fill = make_fill(COLOR_LENIENT_BG)
    c.font = Font(bold=True, size=11, name="Meiryo UI")
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[3].height = 22

    # フロー表
    lenient_flow = [
        ("ステップ", "処理内容", "結果"),
        ("1. ファイル受信", "MAIMLファイルを受信", "→"),
        ("2. XML解析", "XMLとして解析可能か確認\n（構文エラーチェック）",
         "解析失敗 → 🔴 致命的エラーで拒否"),
        ("3. 構造チェック\n（lenient）",
         "必須構造の存在確認\n・maiml/document/protocol/method\n・uuid/pnml/program等\n・document uuid欠落/不正",
         "構造的エラー → 🔴 致命的エラーで拒否"),
        ("4. 編集可能項目チェック\n（lenient）",
         "document子要素欠落（creator/vendor/owner/date）\ndocument id属性欠落\nmethod id属性欠落",
         "🟠 編集可能エラーとして記録\n（canBeIgnoredOnUpload=true）\n→ アップロードは続行"),
        ("5. アップロード完了",
         "ストレージに保存\n編集可能エラーはレスポンスに含めて通知",
         "✅ 成功（編集可能エラーあり/なし）"),
    ]

    for i, (step, content, result) in enumerate(lenient_flow):
        r = 4 + i
        if i == 0:
            set_header_cell(ws, r, 1, step,    bg="4472C4")
            set_header_cell(ws, r, 2, content, bg="4472C4")
            set_header_cell(ws, r, 3, result,  bg="4472C4")
        else:
            row_bg = COLOR_WHITE if i % 2 == 0 else "F8F9FA"
            set_data_cell(ws, r, 1, step,    bg=row_bg, bold=True, align_h="center")
            set_data_cell(ws, r, 2, content, bg=row_bg)
            # 結果セルの色分け
            if "🔴" in result:
                res_bg = COLOR_ERROR_BG
            elif "🟠" in result:
                res_bg = COLOR_IGNORABLE_BG
            elif "🟡" in result:
                res_bg = COLOR_WARNING_BG
            else:
                res_bg = COLOR_OK_BG
            set_data_cell(ws, r, 3, result, bg=res_bg,
                          bold=("🔴" in result or "✅" in result or "🟠" in result))
        ws.row_dimensions[r].height = 48

    # スペーサー
    ws.merge_cells("D3:D9")
    ws["D3"].alignment = Alignment(horizontal="center", vertical="center")

    # --- Section 2: strictモード（保存時）---
    ws.merge_cells("E3:F3")
    c = ws["E3"]
    c.value = "💾 編集画面保存時（strict モード）"
    c.fill = make_fill(COLOR_STRICT_BG)
    c.font = Font(bold=True, size=11, name="Meiryo UI")
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[3].height = 22

    strict_flow = [
        ("ステップ", "処理内容", "結果"),
        ("1. 保存リクエスト", "MAIMLデータを受信", "→"),
        ("2. XML解析", "XMLとして解析可能か確認", "解析失敗 → 🔴 エラーで拒否"),
        ("3. 構造チェック\n（strict）",
         "必須構造の存在確認\n（lenientと同じ構造チェック）",
         "構造的エラー → 🔴 エラーで拒否"),
        ("4. 詳細チェック\n（strict）",
         "document子要素欠落、\nid属性欠落、重複ID等\n※lenientで編集可能エラーの\n　項目も含めてエラー",
         "すべての項目 → 🔴 エラーで拒否"),
        ("5. 保存完了",
         "ストレージに保存",
         "✅ 成功"),
    ]

    for i, (step, content, result) in enumerate(strict_flow):
        r = 4 + i
        if i == 0:
            set_header_cell(ws, r, 5, step,    bg="4472C4")
            set_header_cell(ws, r, 6, result,  bg="4472C4")
        else:
            row_bg = COLOR_WHITE if i % 2 == 0 else "F8F9FA"
            set_data_cell(ws, r, 5, f"{step}\n{content}", bg=row_bg, bold=False)
            res_bg = COLOR_ERROR_BG if "🔴" in result else (COLOR_WARNING_BG if "🟡" in result else COLOR_OK_BG)
            set_data_cell(ws, r, 6, result, bg=res_bg, bold=("🔴" in result or "✅" in result))
        ws.row_dimensions[r].height = 48

    # --- 違いの説明 ---
    ws.merge_cells("A11:F11")
    c = ws["A11"]
    c.value = "📌 lenientモードとstrictモードの違い"
    c.fill = make_fill(COLOR_SECTION_BG)
    c.font = Font(bold=True, size=11, name="Meiryo UI")
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[11].height = 22

    diff_data = [
        ("観点", "lenient（アップロード時）", "strict（保存時）"),
        ("目的", "不完全なファイルでも取り込みを許可し、\n後から編集で補完できるようにする",
         "完全なMAIMLファイルのみを保存する\n（データ品質を保証）"),
        ("致命的エラー\n（構造不備等）", "🔴 致命的エラー（拒否）", "🔴 エラー（拒否）"),
        ("編集可能な項目の\n欠落・不正",
         "🟠 編集可能エラー（続行可）\ncanBeIgnoredOnUpload=true\nエラー情報はDBに記録",
         "🔴 エラー（拒否）"),
        ("想定シナリオ", "雛形ファイルや途中段階のファイルを\nアップロードして後から編集",
         "編集画面でチェックを満たした\n完成形ファイルを保存"),
        ("エラー情報の保持",
         "errorsに記録（canBeIgnoredOnUpload\nフラグで種別識別）",
         "errorsに記録（アップロードブロック）"),
    ]

    for i, row_data in enumerate(diff_data):
        r = 12 + i
        if i == 0:
            set_header_cell(ws, r, 1, row_data[0], bg=COLOR_HEADER_BG)
            set_header_cell(ws, r, 2, row_data[1], bg=COLOR_LENIENT_BG, font_color="000000")
            ws.merge_cells(f"C{r}:D{r}")
            set_header_cell(ws, r, 3, row_data[2], bg=COLOR_STRICT_BG, font_color="000000")
        else:
            row_bg = COLOR_WHITE if i % 2 == 0 else "F8F9FA"
            set_data_cell(ws, r, 1, row_data[0], bg=row_bg, bold=True, align_h="center")
            # lenient列
            if "🔴" in row_data[1]:
                lbg = COLOR_ERROR_BG
            elif "🟠" in row_data[1]:
                lbg = COLOR_IGNORABLE_BG
            elif "🟡" in row_data[1]:
                lbg = COLOR_WARNING_BG
            else:
                lbg = row_bg
            set_data_cell(ws, r, 2, row_data[1], bg=lbg)
            # strict列
            ws.merge_cells(f"C{r}:D{r}")
            sbg = COLOR_ERROR_BG if "🔴" in row_data[2] else (COLOR_WARNING_BG if "🟡" in row_data[2] else row_bg)
            set_data_cell(ws, r, 3, row_data[2], bg=sbg)
        ws.row_dimensions[r].height = 40

    ws.freeze_panes = "A4"
    return ws


def create_sheet3(wb):
    """
    シート3: XML構造サンプル（OK/NG例）
    """
    ws = wb.create_sheet("XML構造サンプル", 2)
    ws.sheet_view.showGridLines = False

    ws.column_dimensions["A"].width = 20
    ws.column_dimensions["B"].width = 60
    ws.column_dimensions["C"].width = 62

    # タイトル
    ws.merge_cells("A1:C1")
    c = ws["A1"]
    c.value = "MAIMLファイル構造サンプル（アップロード可否の例）"
    c.fill = make_fill(COLOR_DARK_BLUE)
    c.font = Font(bold=True, color=COLOR_WHITE, size=13, name="Meiryo UI")
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    # ヘッダー
    set_header_cell(ws, 2, 1, "パターン",       bg=COLOR_HEADER_BG)
    set_header_cell(ws, 2, 2, "XMLサンプル",    bg=COLOR_HEADER_BG)
    set_header_cell(ws, 2, 3, "アップロード結果", bg=COLOR_HEADER_BG)
    ws.row_dimensions[2].height = 20

    samples = [
        (
            "✅ 完全なファイル\n（エラーなし）",
            (
                '<maiml version="1.0">\n'
                '  <document id="doc-001">\n'
                '    <uuid>550e8400-e29b-41d4-a716-446655440000</uuid>\n'
                '    <creator>太郎</creator>\n'
                '    <vendor>ABC Corp</vendor>\n'
                '    <owner>山田</owner>\n'
                '    <date>2024-01-15T10:30:00Z</date>\n'
                '  </document>\n'
                '  <protocol id="proto-001">\n'
                '    <uuid>6ba7b810-9dad-11d1-80b4-00c04fd430c8</uuid>\n'
                '    <method id="method-001">\n'
                '      <uuid>...</uuid>\n'
                '      <pnml>...</pnml>\n'
                '      <program>...</program>\n'
                '    </method>\n'
                '  </protocol>\n'
                '</maiml>'
            ),
            "✅ アップロード成功\n（エラー・警告なし）",
            COLOR_OK_BG
        ),
        (
            "🟠 document子要素欠落\n（編集可能エラーあり）",
            (
                '<maiml version="1.0">\n'
                '  <document id="doc-001">\n'
                '    <uuid>550e8400-e29b-41d4-a716-446655440000</uuid>\n'
                '    <!-- creator/vendor/owner/date が欠落 -->\n'
                '  </document>\n'
                '  <protocol id="proto-001">\n'
                '    <uuid>...</uuid>\n'
                '    <method id="method-001">\n'
                '      <uuid>...</uuid>\n'
                '      <pnml>...</pnml>\n'
                '      <program>...</program>\n'
                '    </method>\n'
                '  </protocol>\n'
                '</maiml>'
            ),
            "🟠 アップロード成功\n（編集可能エラー：creator等欠落）\ncanBeIgnoredOnUpload=true\n→ 編集画面で追記可能",
            COLOR_IGNORABLE_BG
        ),
        (
            "🟠 method id属性欠落\n（編集可能エラーあり）",
            (
                '<maiml version="1.0">\n'
                '  <document id="doc-001">\n'
                '    <uuid>550e8400-e29b-41d4-a716-446655440000</uuid>\n'
                '    ...\n'
                '  </document>\n'
                '  <protocol id="proto-001">\n'
                '    <uuid>...</uuid>\n'
                '    <method>\n'
                '      <!-- id属性が欠落 -->\n'
                '      <uuid>...</uuid>\n'
                '      <pnml>...</pnml>\n'
                '      <program>...</program>\n'
                '    </method>\n'
                '  </protocol>\n'
                '</maiml>'
            ),
            "🟠 アップロード成功\n（編集可能エラー：method id欠落）\ncanBeIgnoredOnUpload=true\n→ 編集画面でid追加可能",
            COLOR_IGNORABLE_BG
        ),
        (
            "🔴 document uuid欠落\n（致命的エラー）",
            (
                '<maiml version="1.0">\n'
                '  <document id="doc-001">\n'
                '    <!-- uuid要素が欠落 -->\n'
                '    <creator>太郎</creator>\n'
                '    ...\n'
                '  </document>\n'
                '  <protocol id="proto-001">\n'
                '    ...\n'
                '  </protocol>\n'
                '</maiml>'
            ),
            "🔴 アップロード失敗\n（致命的エラー：document uuid欠落）\n※アップロード後に変更不可のため\n→ ファイルを修正して再アップロード",
            COLOR_ERROR_BG
        ),
        (
            "🔴 protocol要素欠落\n（致命的エラー）",
            (
                '<maiml version="1.0">\n'
                '  <document id="doc-001">\n'
                '    <uuid>...</uuid>\n'
                '    ...\n'
                '  </document>\n'
                '  <!-- protocol要素が欠落 -->\n'
                '</maiml>'
            ),
            "🔴 アップロード失敗\n（致命的エラー：protocol欠落）\n→ ファイルを修正して再アップロード",
            COLOR_ERROR_BG
        ),
        (
            "🔴 document UUID不正\n（致命的エラー）",
            (
                '<maiml version="1.0">\n'
                '  <document id="doc-001">\n'
                '    <uuid>INVALID-UUID-FORMAT</uuid>\n'
                '    ...\n'
                '  </document>\n'
                '  <protocol id="proto-001">\n'
                '    ...\n'
                '  </protocol>\n'
                '</maiml>'
            ),
            "🔴 アップロード失敗\n（致命的エラー：document UUID不正）\n※アップロード後に変更不可のため\n→ ファイルを修正して再アップロード",
            COLOR_ERROR_BG
        ),
        (
            "🔴 XML構文エラー\n（致命的エラー）",
            (
                '<maiml version="1.0">\n'
                '  <document id="doc-001">\n'
                '    <uuid>未閉じタグ\n'
                '  </document>\n'
                '  <!-- タグが正しく閉じられていない -->\n'
                '</maiml>'
            ),
            "🔴 アップロード失敗\n（致命的エラー：XML構文エラー）\n→ XMLを修正して再アップロード",
            COLOR_ERROR_BG
        ),
    ]

    for i, (pattern, xml, result, res_bg) in enumerate(samples):
        r = 3 + i
        if "✅" in pattern:
            pat_bg = COLOR_OK_BG
        elif "🟠" in pattern:
            pat_bg = COLOR_IGNORABLE_BG
        elif "🟡" in pattern:
            pat_bg = COLOR_WARNING_BG
        else:
            pat_bg = COLOR_ERROR_BG
        set_data_cell(ws, r, 1, pattern, bg=pat_bg, bold=True, align_h="center")
        set_data_cell(ws, r, 2, xml,    bg="F8F8F8", size=8)
        set_data_cell(ws, r, 3, result, bg=res_bg, bold=True)
        ws.row_dimensions[r].height = 90

    ws.freeze_panes = "A3"
    return ws


def create_sheet4(wb):
    """
    シート4: ValidationPanel表示仕様（フロントエンド）
    """
    ws = wb.create_sheet("ValidationPanel表示仕様", 3)
    ws.sheet_view.showGridLines = False

    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["B"].width = 20
    ws.column_dimensions["C"].width = 20
    ws.column_dimensions["D"].width = 40
    ws.column_dimensions["E"].width = 30

    # タイトル
    ws.merge_cells("A1:E1")
    c = ws["A1"]
    c.value = "ValidationPanel（編集画面バリデーション結果表示）仕様"
    c.fill = make_fill(COLOR_DARK_BLUE)
    c.font = Font(bold=True, color=COLOR_WHITE, size=13, name="Meiryo UI")
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    # 説明
    ws.merge_cells("A2:E2")
    c = ws["A2"]
    c.value = "アップロード後・編集中にバリデーション結果を3分類で表示する"
    c.fill = make_fill("F2F2F2")
    c.font = Font(size=9, name="Meiryo UI")
    c.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[2].height = 18

    # ヘッダー
    headers = ["分類", "タグ色", "条件", "説明", "対応方法"]
    for i, h in enumerate(headers, 1):
        set_header_cell(ws, 3, i, h)
    ws.row_dimensions[3].height = 24

    panel_data = [
        (
            "致命的エラー",
            "赤タグ\n🔴",
            "severity='error' かつ\ncanBeIgnoredOnUpload\n= false または未設定",
            "アップロード/保存をブロックする\n深刻なエラー\n（構造不備・UUID欠落・参照エラー等）",
            "ファイルを修正して\n再アップロードが必要",
            COLOR_ERROR_BG
        ),
        (
            "編集可能エラー",
            "オレンジタグ\n🟠",
            "severity='error' かつ\ncanBeIgnoredOnUpload\n= true",
            "アップロードは許可されるが\n編集画面での補正が必要なエラー\n（id属性・creator/vendor等の欠落）",
            "編集画面の各フォームで\n補正・追記が可能",
            COLOR_IGNORABLE_BG
        ),
        (
            "警告",
            "黄タグ\n🟡",
            "severity='warning'",
            "処理は続行されるが\n確認を推奨する項目\n（日付フォーマット等）",
            "必要に応じて修正",
            COLOR_WARNING_BG
        ),
    ]

    for i, row_data in enumerate(panel_data):
        r = 4 + i
        label, tag, cond, desc, action, bg = row_data
        set_data_cell(ws, r, 1, label, bg=bg, bold=True, align_h="center")
        set_data_cell(ws, r, 2, tag,   bg=bg, bold=True, align_h="center")
        set_data_cell(ws, r, 3, cond,  bg=COLOR_WHITE)
        set_data_cell(ws, r, 4, desc,  bg=COLOR_WHITE)
        set_data_cell(ws, r, 5, action, bg=COLOR_WHITE)
        ws.row_dimensions[r].height = 52

    # サマリー表示の説明
    ws.merge_cells("A8:E8")
    c = ws["A8"]
    c.value = "📊 サマリー表示（ValidationPanel上部）"
    c.fill = make_fill(COLOR_SECTION_BG)
    c.font = Font(bold=True, size=11, name="Meiryo UI")
    c.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws.row_dimensions[8].height = 22

    ws.merge_cells("A9:E9")
    c = ws["A9"]
    c.value = (
        "致命的エラー: N件　｜　編集可能エラー: N件　｜　警告: N件\n"
        "（致命的エラーが0件の場合のみアップロード・保存ボタンが有効）"
    )
    c.fill = make_fill(COLOR_WHITE)
    c.font = Font(size=10, name="Meiryo UI")
    c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    c.border = make_border()
    ws.row_dimensions[9].height = 36

    return ws


def main():
    wb = openpyxl.Workbook()

    # デフォルトシートを削除
    if "Sheet" in wb.sheetnames:
        del wb["Sheet"]

    create_sheet1(wb)
    create_sheet2(wb)
    create_sheet3(wb)
    create_sheet4(wb)

    wb.save(OUTPUT_PATH)
    print(f"✅ Excelファイルを作成しました: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
