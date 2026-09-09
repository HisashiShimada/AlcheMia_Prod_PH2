"""
WorkRecordPanel ボタン活性/非活性マトリクス Excel生成スクリプト
Usage: python3 generate_button_matrix.py
Output: WorkRecordPanel_button_matrix.xlsx (同ディレクトリに出力)
"""
import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import os

COLOR_ACTIVE     = "C6EFCE"
COLOR_INACTIVE   = "F4CCCC"
COLOR_COND       = "FCE5CD"
COLOR_UNDEF      = "EAD1DC"
COLOR_HEADER_BG  = "4472C4"
COLOR_HEADER_GRP = "2F75B6"
COLOR_STATUS_BG  = "D9E1F2"
COLOR_WHITE      = "FFFFFF"
COLOR_GRAY       = "F2F2F2"
COLOR_WARN       = "FFF2CC"

FW = Font(name="Meiryo UI", bold=True,  color=COLOR_WHITE, size=10)
FB = Font(name="Meiryo UI", bold=True,  color="000000",    size=10)
FN = Font(name="Meiryo UI", bold=False, color="000000",    size=9)
FS = Font(name="Meiryo UI", bold=False, color="000000",    size=8)
FR = Font(name="Meiryo UI", bold=True,  color="CC0000",    size=9)
TS = Side(style="thin", color="BFBFBF")
TB = Border(left=TS, right=TS, top=TS, bottom=TS)


def fill(c):
    return PatternFill(fill_type="solid", fgColor=c)


def cs(ws, r, c, v, bg=COLOR_WHITE, font=None, ah="center", w=False):
    cell = ws.cell(row=r, column=c, value=v)
    cell.fill = fill(bg)
    cell.font = font or FN
    cell.alignment = Alignment(horizontal=ah, vertical="center", wrap_text=w)
    cell.border = TB
    return cell


# ─── ステータス一覧 ───
STATUSES = [
    ("not_started",  "未着手\n(not_started)"),
    ("preparing",    "準備中\n(preparing)"),
    ("ready",        "準備完了\n(ready)"),
    ("in_progress",  "動作状態\n(in_progress)"),
    ("on_hold",      "休止状態\n(on_hold)"),
    ("completed",    "終状態\n(completed)"),
    ("issue",        "異常終了\n(issue)"),
]

# ─── ボタン定義 ───
# mark: "○"=活性 / "×"=非活性 / "△"=条件次第 / "?"=仕様未定義
BUTTONS = [
    {
        "group": "InstructionCollapse",
        "name":  "指示確認",
        "loc":   "InstructionCollapse\n（折りたたみ右端）",
        "expr":  "currentStatus\n!== 'preparing'",
        "s": {
            "not_started": ("×", "非活性"),
            "preparing":   ("○", "活性"),
            "ready":       ("×", "非活性"),
            "in_progress": ("×", "非活性"),
            "on_hold":     ("×", "非活性"),
            "completed":   ("×", "非活性"),
            "issue":       ("×", "非活性"),
        },
        "note": "preparing のみ活性。\nnot_started でも非活性。\n⚠ not_started 時の仕様が設計書に\n記載なし → 要確認。",
        "p": True,
    },
    {
        "group": "WorkHeader",
        "name":  "開始",
        "loc":   "WorkHeader\n（右端ボタン群）",
        "expr":  "!(status ∈\n['preparing',\n'ready','on_hold'])",
        "s": {
            "not_started": ("×", "非活性"),
            "preparing":   ("○", "活性"),
            "ready":       ("○", "活性"),
            "in_progress": ("×", "非活性"),
            "on_hold":     ("○", "活性"),
            "completed":   ("×", "非活性"),
            "issue":       ("×", "非活性"),
        },
        "note": "設計書と一致。\non_hold（休止）からも再開可能。",
        "p": False,
    },
    {
        "group": "WorkHeader",
        "name":  "終了",
        "loc":   "WorkHeader\n（右端ボタン群）",
        "expr":  "currentStatus\n!== 'in_progress'",
        "s": {
            "not_started": ("×", "非活性"),
            "preparing":   ("×", "非活性"),
            "ready":       ("×", "非活性"),
            "in_progress": ("○", "活性"),
            "on_hold":     ("×", "非活性"),
            "completed":   ("×", "非活性"),
            "issue":       ("×", "非活性"),
        },
        "note": "設計書と一致。\nin_progress のみ活性。",
        "p": False,
    },
    {
        "group": "WorkHeader",
        "name":  "異常終了",
        "loc":   "WorkHeader\n（右端ボタン群）",
        "expr":  "currentStatus\n!== 'in_progress'",
        "s": {
            "not_started": ("×", "非活性"),
            "preparing":   ("×", "非活性"),
            "ready":       ("×", "非活性"),
            "in_progress": ("○", "活性"),
            "on_hold":     ("×", "非活性"),
            "completed":   ("×", "非活性"),
            "issue":       ("×", "非活性"),
        },
        "note": "設計書と一致。\nin_progress のみ活性。",
        "p": False,
    },
    {
        "group": "WorkHeader",
        "name":  "状態記録",
        "loc":   "WorkHeader\n（右端ボタン群）",
        "expr":  "disabled prop なし\n→ 常時活性",
        "s": {
            "not_started": ("?", "仕様未定義"),
            "preparing":   ("?", "仕様未定義"),
            "ready":       ("?", "仕様未定義"),
            "in_progress": ("?", "仕様未定義"),
            "on_hold":     ("?", "仕様未定義"),
            "completed":   ("?", "仕様未定義"),
            "issue":       ("?", "仕様未定義"),
        },
        "note": "disabled prop が未実装。\n設計書にも非活性条件の記載なし。\n⚠ completed/issue でも常時押せる。\n→ 仕様確認が必要。",
        "p": True,
    },
    {
        "group": "Content\n（保存グループ）",
        "name":  "保存",
        "loc":   "Contentエリア\nボタン群（2行目）",
        "expr":  "isReadOnly=true\nのとき非表示\n(disabled ではなく\n非表示制御)",
        "s": {
            "not_started": ("△", "isReadOnly次第"),
            "preparing":   ("△", "isReadOnly次第"),
            "ready":       ("△", "isReadOnly次第"),
            "in_progress": ("△", "isReadOnly次第"),
            "on_hold":     ("△", "isReadOnly次第"),
            "completed":   ("△", "⚠viewingKey=null\nなら表示バグ"),
            "issue":       ("△", "⚠viewingKey=null\nなら表示バグ"),
        },
        "note": "isReadOnly=true のとき非表示。\n⚠ viewingKey=null（通常作業中）では\ncompleted/issue でも表示バグあり。\n→ isReadOnly シート参照。",
        "p": True,
    },
    {
        "group": "Content\n（保存グループ）",
        "name":  "次へ\n(保存して次へ)",
        "loc":   "Contentエリア\nボタン群（2行目）",
        "expr":  "isReadOnly=true\nのとき非表示",
        "s": {
            "not_started": ("△", "isReadOnly次第"),
            "preparing":   ("△", "isReadOnly次第"),
            "ready":       ("△", "isReadOnly次第"),
            "in_progress": ("△", "isReadOnly次第"),
            "on_hold":     ("△", "isReadOnly次第"),
            "completed":   ("△", "⚠viewingKey=null\nなら表示バグ"),
            "issue":       ("△", "⚠viewingKey=null\nなら表示バグ"),
        },
        "note": "「保存」と同じ制御。\n⚠ 同様のバグあり。",
        "p": True,
    },
    {
        "group": "Content\n（コメント/スキップ）",
        "name":  "コメント",
        "loc":   "Contentエリア\nボタン群（2行目）",
        "expr":  "isReadOnly=true\nのとき非表示",
        "s": {
            "not_started": ("△", "isReadOnly次第"),
            "preparing":   ("△", "isReadOnly次第"),
            "ready":       ("△", "isReadOnly次第"),
            "in_progress": ("△", "isReadOnly次第"),
            "on_hold":     ("△", "isReadOnly次第"),
            "completed":   ("△", "⚠viewingKey=null\nなら表示バグ"),
            "issue":       ("△", "⚠viewingKey=null\nなら表示バグ"),
        },
        "note": "「保存」と同じ制御。\n⚠ 同様のバグあり。",
        "p": True,
    },
    {
        "group": "Content\n（コメント/スキップ）",
        "name":  "スキップ",
        "loc":   "Contentエリア\nボタン群（2行目）",
        "expr":  "canSkipFlag =\nhasNextTransition\n&& !isInProgress",
        "s": {
            "not_started": ("△", "次遷移あり→活性"),
            "preparing":   ("△", "次遷移あり→活性"),
            "ready":       ("△", "次遷移あり→活性"),
            "in_progress": ("×", "非活性(固定)"),
            "on_hold":     ("△", "次遷移あり→活性"),
            "completed":   ("△", "対象外(非表示)"),
            "issue":       ("△", "対象外(非表示)"),
        },
        "note": "in_progress は無条件で非活性。\nそれ以外は次トランジション有無で判定。\n設計書と一致。",
        "p": False,
    },
]



# ─── isReadOnly 制御詳細データ ───
# 現在の実装式（WorkRecordPanel.tsx L3315）:
#   isReadOnly = displayKeyRow?.isRecorded === true
#                && (isErrorStatus || !isCorrectionMode)
#
# displayKey の優先順位:
#   viewingKey ?? pendingEndKey ?? activeEntry
#
# 列構成: (条件/状況, isRecorded, isErrorStatus, isCorrectionMode, isReadOnly結果, 保存/次へ/コメント, 備考, is_problem)
ISREADONLY_ROWS = [
    # ─── 通常作業中（viewingKey=null, pendingEndKey=null）───
    ("通常作業中\nstatus: not_started / preparing\n/ ready / in_progress / on_hold",
     "false（未記録）", "false", "false",
     "false\n→ 編集可",
     "表示（編集可）",
     "正常動作。未記録なら編集できる。", False),

    ("通常作業中\nstatus: in_progress\nisRecorded=true（保存済み）",
     "true（記録済み）", "false", "false",
     "true\n→ 読み取り専用",
     "非表示",
     "正常動作。保存済みなら読み取り専用になる。", False),

    ("通常作業中\nstatus: completed\nisRecorded=true（保存済み）",
     "true（記録済み）", "false", "false",
     "true\n→ 読み取り専用",
     "非表示",
     "正常動作。完了済み保存済みは読み取り専用。", False),

    ("通常作業中\nstatus: completed\nisRecorded=false（未保存）",
     "false（未記録）", "false", "false",
     "false\n→ 編集可",
     "表示（編集可）",
     "⚠ 問題あり。\n"
     "記録とステータス遷移は独立しているため\n"
     "「終了だけして保存していない」状態は実際に発生しうる。\n\n"
     "ただし activeEntry の選択ロジックが\n"
     "in_progress/ready/preparing のみを選ぶため、\n"
     "completed なトランジションは通常作業中には\n"
     "displayKey として表示されない（activeEntry=null になる）。\n\n"
     "→ 発生するのは「全トランジションが completed だが\n"
     "  一部 isRecorded=false」の状況のみ。\n"
     "  その場合は「全完了 Alert」が表示されて\n"
     "  保存ボタンは出ない（問題なし）。\n\n"
     "→ ただし pendingEndKey や viewingKey 経由で\n"
     "  completed+isRecorded=false のトランジションが\n"
     "  displayKey になるケースは保存可能になる。\n"
     "  （訂正・再保存として許容するか要確認）",
     True),

    # ─── 終了/異常終了ボタン押下直後（pendingEndKey がセット）───
    ("終了ボタン押下直後\npendingEndKey セット済み\nstatus: completed, isRecorded=true",
     "true（記録済み）", "false", "false",
     "true\n→ 読み取り専用",
     "非表示",
     "正常動作。終了後は読み取り専用で表示。\n「次へ」で pendingEndKey をクリアして遷移。", False),

    # ─── 異常終了ステータス ───
    ("status: issue（異常終了）\nisRecorded=true\nisCorrectionMode=true",
     "true（記録済み）", "true（isErrorStatus）", "true",
     "true\n→ 読み取り専用（強制）",
     "非表示",
     "正常動作。異常終了は訂正モード中でも\n読み取り専用（isErrorStatus=true が優先）。", False),

    # ─── viewingKey あり（別タブから遷移）───
    ("別タブから「詳細確認」で遷移\nviewingKey セット済み\nisRecorded=true",
     "true（記録済み）", "false", "false",
     "true\n→ 読み取り専用",
     "非表示 + 訂正ボタン表示",
     "正常動作。閲覧専用で表示。\n「訂正」ボタンで isCorrectionMode=true に切り替え可。", False),

    ("別タブから遷移\nviewingKey セット済み\nisCorrectionMode=true",
     "true（記録済み）", "false", "true",
     "false\n→ 編集可",
     "表示（編集可）",
     "正常動作。訂正モード中は編集可。\n「訂正保存」→ isCorrectionMode=false に戻る。", False),

    # ─── 整理が必要なケース ───
    ("pendingEndKey / viewingKey 経由で\ncompleted+isRecorded=false が\ndisplayKey になるケース\n【問題あり・要対応】",
     "false（未記録）", "false", "false",
     "false\n→ 編集可",
     "⚠ 表示される",
     "問題あり（確定）。\n"
     "記録とステータス遷移は独立しているため\n"
     "「終了済み（completed）だが未保存（isRecorded=false）」は\n"
     "実運用で発生する。\n\n"
     "通常の activeEntry 経由では completed は選ばれないが、\n"
     "・pendingEndKey（終了ボタン直後のロック）\n"
     "・viewingKey（別タブからの詳細確認）\n"
     "経由で displayKey になった場合は保存ボタンが表示される。\n\n"
     "→ この状態での「保存」を訂正・再保存として許容するか、\n"
     "  または completed 時は isRecorded に関わらず\n"
     "  isReadOnly=true にすべきか、仕様の判断が必要。\n"
     "  現状は保存可能になっている。",
     True),
]

# ─── 問題サマリデータ ───
PROBLEMS = [
    ("①\n（問題なし）",
     "指示確認ボタン\nnot_started での非活性\n→ 仕様上問題なし",
     "実装: currentStatus !== 'preparing' で disabled。\n"
     "not_started では preparing でないため非活性になる。\n\n"
     "→ 作業者画面では not_started は作業不可なため、\n"
     "  非活性であることは正しい動作。問題なし。",
     "指示確認"),
    ("②\n（検討中）",
     "状態記録ボタン\ndisabled 制御なし\n→ 後から訂正可能な想定のため\n  基本は問題ない可能性あり",
     "WorkHeader の「状態記録」ボタンに disabled prop が実装されていない。\n"
     "設計書にも非活性条件の記載なし。\n\n"
     "後から訂正も可能な想定であれば completed/issue でも押せる状態は許容範囲か。\n"
     "→ 非活性にするかどうかは要仕様確認。",
     "状態記録"),
    ("③\n（問題あり・要仕様判断）",
     "isReadOnly 判定ロジック\n→ completed+isRecorded=false で\n  保存ボタンが表示される",
     "現在の実装（L3315）:\n"
     "  isReadOnly = displayKeyRow?.isRecorded === true\n"
     "               && (isErrorStatus || !isCorrectionMode)\n\n"
     "記録とステータス遷移は独立しているため、\n"
     "「completed（終了済み）かつ isRecorded=false（未保存）」は\n"
     "実運用で発生しうる（確定）。\n\n"
     "通常の activeEntry 経由では completed は displayKey に選ばれないが、\n"
     "  ・pendingEndKey（終了ボタン直後のロック）\n"
     "  ・viewingKey（別タブからの詳細確認）\n"
     "経由で displayKey になった場合、isReadOnly=false → 保存ボタンが表示される。\n\n"
     "【仕様判断が必要】\n"
     "A) completed 時でも保存・再保存を許容する（現状維持）\n"
     "B) completed 時は isRecorded に関わらず isReadOnly=true にする\n"
     "   → isReadOnly に status=completed の条件を追加",
     "保存\n次へ（保存して次へ）\nコメント"),
    ("④\n（要修正）",
     "状態プルダウン（WorkHeader）\nPlanB と未接続\n→ デッドUI",
     "WorkHeader に onStatusChange Props が存在するが\n"
     "PlanB から WorkHeader へ onStatusChange が渡されていない。\n"
     "プルダウン操作しても何も起きない（デッドUI）。\n\n"
     "→ 削除 or 正式接続のどちらかの対応が必要。\n"
     "  CONTROL_ANALYSIS.md §4 参照。",
     "状態プルダウン\n（WorkHeader内 Select）"),
]



# ─────────────────────────────────────────────────────────
def build_matrix_sheet(wb):
    ws = wb.create_sheet(title="ボタン活性マトリクス")
    ws.sheet_view.showGridLines = False

    # タイトル
    last_col = 4 + len(STATUSES) + 1  # グループ+名前+場所+式+ステータス×7+備考+問題
    last_letter = get_column_letter(last_col)
    ws.merge_cells(f"A1:{last_letter}1")
    c = ws["A1"]
    c.value = "WorkRecordPanel ボタン活性 / 非活性 マトリクス"
    c.fill = fill(COLOR_HEADER_BG)
    c.font = Font(name="Meiryo UI", bold=True, color=COLOR_WHITE, size=14)
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    # 凡例
    ws.merge_cells(f"A2:{last_letter}2")
    c = ws["A2"]
    c.value = ("  凡例:  ○ = 活性（押せる）   × = 非活性（押せない）"
               "   △ = 条件次第   ? = 仕様未定義（実装なし）")
    c.fill = fill(COLOR_GRAY)
    c.font = FS
    c.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[2].height = 18

    # 列幅設定
    ws.column_dimensions["A"].width = 18
    ws.column_dimensions["B"].width = 14
    ws.column_dimensions["C"].width = 22
    ws.column_dimensions["D"].width = 28
    for i, _ in enumerate(STATUSES):
        ws.column_dimensions[get_column_letter(5 + i)].width = 14
    note_col  = 5 + len(STATUSES)
    prob_col  = note_col + 1
    ws.column_dimensions[get_column_letter(note_col)].width = 44
    ws.column_dimensions[get_column_letter(prob_col)].width = 10

    # ヘッダー行 (row=3)
    ws.row_dimensions[3].height = 44
    for col, label in [(1,"グループ"),(2,"ボタン名"),(3,"表示場所"),(4,"disabled 判定式")]:
        cs(ws, 3, col, label, bg=COLOR_HEADER_BG, font=FW, w=True)
    for i, (_, label) in enumerate(STATUSES):
        cs(ws, 3, 5+i, label, bg=COLOR_HEADER_BG, font=FW, w=True)
    cs(ws, 3, note_col, "備考 / 問題点",       bg=COLOR_HEADER_BG, font=FW)
    cs(ws, 3, prob_col, "問題\nあり",           bg=COLOR_HEADER_BG, font=FW, w=True)

    # データ行
    for idx, btn in enumerate(BUTTONS):
        r = 4 + idx
        ws.row_dimensions[r].height = 56
        row_bg = COLOR_WHITE if idx % 2 == 0 else COLOR_GRAY

        cs(ws, r, 1, btn["group"],  bg=COLOR_STATUS_BG, font=FB, w=True)
        cs(ws, r, 2, btn["name"],   bg=row_bg, font=FB, w=True)
        cs(ws, r, 3, btn["loc"],    bg=row_bg, font=FS, w=True)
        cs(ws, r, 4, btn["expr"],
           bg=row_bg,
           font=Font(name="Courier New", bold=False, color="1F3864", size=8),
           ah="left", w=True)

        for i, (sk, _) in enumerate(STATUSES):
            mark, label = btn["s"][sk]
            if mark == "○":
                bg2 = COLOR_ACTIVE
                fnt = Font(name="Meiryo UI", bold=True, color="006100", size=11)
            elif mark == "×":
                bg2 = COLOR_INACTIVE
                fnt = Font(name="Meiryo UI", bold=True, color="9C0006", size=11)
            elif mark == "△":
                bg2 = COLOR_COND
                fnt = Font(name="Meiryo UI", bold=True, color="7F4F24", size=9)
            else:
                bg2 = COLOR_UNDEF
                fnt = Font(name="Meiryo UI", bold=True, color="660066", size=10)
            c2 = ws.cell(row=r, column=5+i, value=f"{mark}\n{label}")
            c2.fill = fill(bg2)
            c2.font = fnt
            c2.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            c2.border = TB

        note_bg = COLOR_WARN if btn["p"] else row_bg
        note_fn = FR if btn["p"] else FS
        cs(ws, r, note_col, btn["note"], bg=note_bg, font=note_fn, ah="left", w=True)

        pv  = "⚠ あり" if btn["p"] else "—"
        pbg = "F4CCCC" if btn["p"] else row_bg
        pfn = Font(name="Meiryo UI", bold=True, color="9C0006", size=9) if btn["p"] else FN
        cs(ws, r, prob_col, pv, bg=pbg, font=pfn)

    ws.freeze_panes = "E4"



def build_isreadonly_sheet(wb):
    ws = wb.create_sheet(title="isReadOnly制御詳細")
    ws.sheet_view.showGridLines = False

    ws.merge_cells("A1:H1")
    c = ws["A1"]
    c.value = "isReadOnly 制御ロジック詳細（保存 / 次へ / コメント ボタンの表示制御）"
    c.fill = fill(COLOR_HEADER_BG)
    c.font = Font(name="Meiryo UI", bold=True, color=COLOR_WHITE, size=13)
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 26

    ws.merge_cells("A2:H2")
    c = ws["A2"]
    c.value = (
        "  実装式（WorkRecordPanel.tsx L3315）: "
        "isReadOnly = displayKeyRow?.isRecorded === true && (isErrorStatus || !isCorrectionMode)"
        "   ※ 保存/次へ/コメント は disabled ではなく isReadOnly=true のとき「非表示」"
    )
    c.fill = fill(COLOR_WARN)
    c.font = FS
    c.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[2].height = 18

    hdrs = [
        ("条件 / 状況",            32),
        ("isRecorded",             16),
        ("isErrorStatus",          14),
        ("isCorrectionMode",       16),
        ("isReadOnly の値",        16),
        ("保存/次へ/コメント",      18),
        ("備考 / 確認事項",        46),
        ("状態",                   12),
    ]
    ws.row_dimensions[3].height = 30
    for i, (label, width) in enumerate(hdrs):
        col = i + 1
        ws.column_dimensions[get_column_letter(col)].width = width
        cs(ws, 3, col, label, bg=COLOR_HEADER_GRP, font=FW, w=True)

    for i, (cond, isrec, iserr, iscorr, ro_val, display, note, is_prob) in enumerate(ISREADONLY_ROWS):
        r = 4 + i
        ws.row_dimensions[r].height = 54
        bg = COLOR_GRAY if i % 2 else COLOR_WHITE
        nb = COLOR_WARN if is_prob else bg
        nf = FR if is_prob else FS

        vals = [cond, isrec, iserr, iscorr, ro_val, display, note]
        for col, (val, vbg, vfont) in enumerate([
            (cond,    bg,  FS), (isrec,   bg,  FS), (iserr,  bg,  FS), (iscorr, bg,  FS),
            (ro_val,  bg,  FS), (display, bg,  FS), (note,   nb,  nf),
        ], 1):
            cs(ws, r, col, val, bg=vbg, font=vfont, ah="left", w=True)

        sv  = "⚠ 要確認" if is_prob else "✓ 正常"
        sbg = COLOR_INACTIVE if is_prob else COLOR_ACTIVE
        sfn = Font(name="Meiryo UI", bold=True,
                   color="9C0006" if is_prob else "006100", size=9)
        cs(ws, r, 8, sv, bg=sbg, font=sfn)



def build_summary_sheet(wb):
    ws = wb.create_sheet(title="問題サマリ")
    ws.sheet_view.showGridLines = False

    ws.merge_cells("A1:D1")
    c = ws["A1"]
    c.value = "WorkRecordPanel ボタン制御 問題サマリ"
    c.fill = fill(COLOR_HEADER_BG)
    c.font = Font(name="Meiryo UI", bold=True, color=COLOR_WHITE, size=14)
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    hdrs = [("No.",6),("問題内容",40),("詳細 / 原因",60),("影響ボタン",24)]
    ws.row_dimensions[2].height = 24
    for i, (label, width) in enumerate(hdrs):
        col = i + 1
        ws.column_dimensions[get_column_letter(col)].width = width
        cs(ws, 2, col, label, bg=COLOR_HEADER_GRP, font=FW)

    for i, (no, title, detail, btns) in enumerate(PROBLEMS):
        r = 3 + i
        ws.row_dimensions[r].height = 90
        bg = COLOR_GRAY if i % 2 else COLOR_WHITE
        # ①は問題なし（緑）、②は検討中（黄）、③は問題あり（赤）、④は要修正（赤）
        if "問題なし" in no:
            row_accent = COLOR_ACTIVE
            row_font   = Font(name="Meiryo UI", bold=True, color="006100", size=9)
        elif "要修正" in no or "問題あり" in no:
            row_accent = "F4CCCC"
            row_font   = FR
        else:
            row_accent = COLOR_WARN
            row_font   = Font(name="Meiryo UI", bold=True, color="7F4F24", size=9)
        cs(ws, r, 1, no,     bg=row_accent, font=Font(name="Meiryo UI", bold=True, color="000000", size=11))
        cs(ws, r, 2, title,  bg=row_accent, font=row_font, ah="left", w=True)
        cs(ws, r, 3, detail, bg=bg,         font=FS,       ah="left", w=True)
        cs(ws, r, 4, btns,   bg=row_accent, font=row_font, w=True)

    ref_r = 3 + len(PROBLEMS) + 1
    ws.merge_cells(f"A{ref_r}:D{ref_r}")
    c = ws.cell(row=ref_r, column=1,
                value=("【参照】 WorkRecordPanel.tsx  |  "
                       "docs/tasks/20260904_0956_WorkRecordPanel整理/CONTROL_ANALYSIS.md  |  "
                       "docs/tasks/20260828_1200_実験記録タブボタン活性制御/PLAN.md"))
    c.fill = fill(COLOR_GRAY)
    c.font = FS
    c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ws.row_dimensions[ref_r].height = 28


def main():
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    build_summary_sheet(wb)
    build_matrix_sheet(wb)
    build_isreadonly_sheet(wb)

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "WorkRecordPanel_button_matrix.xlsx")
    wb.save(out)
    print(f"✅ 出力完了: {out}")


if __name__ == "__main__":
    main()

