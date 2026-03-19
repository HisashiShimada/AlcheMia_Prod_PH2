"""
MaiML OpenData Pipeline DB 設計 Excel 生成スクリプト
=====================================================
出力ファイル: maiml2Excel_DB設計.xlsx

シート構成:
  1. テーブル一覧          - 全テーブルの役割・層・概要
  2. ER図（テキスト）       - テーブル間のリレーション概要
  3. maiml_asset           - DDL + カラム詳細
  4. maiml_instance        - DDL + カラム詳細（results_id追加済み）
  5. maiml_element         - DDL + カラム詳細
  6. maiml_element_value   - DDL + カラム詳細
  7. maiml_insertion       - DDL + カラム詳細
  8. maiml_template        - DDL + カラム詳細
  9. maiml_template_element
 10. maiml_template_element_value
 11. maiml_template_insertion
 12. maiml_event           - DDL + カラム詳細（eventLog層 新規）
 13. maiml_event_element   - DDL + カラム詳細（eventLog層 新規）
 14. maiml_event_element_value - DDL + カラム詳細（eventLog層 新規）
 15. マッピング表           - MaiML要素 ↔ DBカラム

更新日: 2026-03-17
"""

import openpyxl
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side, numbers
)
from openpyxl.utils import get_column_letter
import os

# ============================================================
# スタイル定義
# ============================================================

def make_fill(hex_color):
    return PatternFill(start_color=hex_color, end_color=hex_color, fill_type="solid")

# 色パレット
C_HEADER_COMMON   = "1F4E79"   # 共通層ヘッダー（紺）
C_HEADER_DATA     = "375623"   # data層ヘッダー（緑）
C_HEADER_PROTOCOL = "7B3F00"   # protocol層ヘッダー（茶）
C_HEADER_EVENTLOG = "4B0082"   # eventLog層ヘッダー（紫）
C_HEADER_NEW      = "C00000"   # 新規追加カラム（赤）
C_SUB_HEADER      = "D9E1F2"   # サブヘッダー背景（薄青）
C_ROW_EVEN        = "F2F2F2"   # 偶数行（薄グレー）
C_ROW_ODD         = "FFFFFF"   # 奇数行（白）
C_PK              = "FFF2CC"   # 主キー行（薄黄）
C_FK              = "E2EFDA"   # 外部キー行（薄緑）
C_NEW_COL         = "FFF0F0"   # 新規追加カラム行（薄赤）

FONT_WHITE_BOLD = Font(name="Meiryo UI", bold=True, color="FFFFFF", size=10)
FONT_BOLD       = Font(name="Meiryo UI", bold=True, size=10)
FONT_NORMAL     = Font(name="Meiryo UI", size=10)
FONT_CODE       = Font(name="Consolas",  size=9)
FONT_SMALL      = Font(name="Meiryo UI", size=9)

ALIGN_CENTER = Alignment(horizontal="center", vertical="center", wrap_text=False)
ALIGN_LEFT   = Alignment(horizontal="left",   vertical="top",    wrap_text=True)
ALIGN_LEFT_NW = Alignment(horizontal="left",  vertical="center", wrap_text=False)

THIN = Side(style="thin", color="AAAAAA")
BORDER_THIN = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

def apply_header(ws, row, col, value, layer="common", span=1):
    """層に応じた色でヘッダーを書く"""
    color_map = {
        "common":   C_HEADER_COMMON,
        "data":     C_HEADER_DATA,
        "protocol": C_HEADER_PROTOCOL,
        "eventlog": C_HEADER_EVENTLOG,
    }
    cell = ws.cell(row=row, column=col, value=value)
    cell.fill   = make_fill(color_map.get(layer, C_HEADER_COMMON))
    cell.font   = FONT_WHITE_BOLD
    cell.alignment = ALIGN_CENTER
    cell.border = BORDER_THIN
    if span > 1:
        ws.merge_cells(start_row=row, start_column=col,
                       end_row=row, end_column=col + span - 1)

def apply_sub_header(ws, row, cols, values):
    for col, val in zip(cols, values):
        cell = ws.cell(row=row, column=col, value=val)
        cell.fill      = make_fill(C_SUB_HEADER)
        cell.font      = FONT_BOLD
        cell.alignment = ALIGN_CENTER
        cell.border    = BORDER_THIN

def write_row(ws, row, col_values, row_type="normal"):
    """col_values: list of (col, value)"""
    fill_map = {
        "pk":     make_fill(C_PK),
        "fk":     make_fill(C_FK),
        "new":    make_fill(C_NEW_COL),
        "even":   make_fill(C_ROW_EVEN),
        "normal": make_fill(C_ROW_ODD),
    }
    fill = fill_map.get(row_type, make_fill(C_ROW_ODD))
    for col, val in col_values:
        cell = ws.cell(row=row, column=col, value=val)
        cell.fill      = fill
        cell.font      = FONT_CODE if col <= 2 else FONT_NORMAL
        cell.alignment = ALIGN_LEFT
        cell.border    = BORDER_THIN

def set_col_widths(ws, widths):
    """widths: list of (col_letter_or_idx, width)"""
    for col, w in widths:
        if isinstance(col, int):
            col = get_column_letter(col)
        ws.column_dimensions[col].width = w

def freeze(ws, cell="B2"):
    ws.freeze_panes = cell


# ============================================================
# シート1: テーブル一覧
# ============================================================

def build_table_list(ws):
    ws.title = "テーブル一覧"
    ws.sheet_view.showGridLines = False

    # タイトル
    ws.merge_cells("A1:G1")
    cell = ws.cell(row=1, column=1, value="MaiML OpenData Pipeline DB テーブル一覧  （最終更新: 2026-03-17）")
    cell.fill = make_fill(C_HEADER_COMMON)
    cell.font = FONT_WHITE_BOLD
    cell.alignment = ALIGN_CENTER

    # サブヘッダー
    headers = ["層", "テーブル名", "役割", "取込単位", "対応MaiML要素", "備考", "更新"]
    apply_sub_header(ws, 2, range(1, 8), headers)

    rows = [
        # 共通
        ("common",   "共通",     "maiml_asset",                  "MaiML ファイル 1 件の代表メタ",                     "1 ファイル = 1 レコード",         "/maiml/document",               "",          ""),
        # data層
        ("data",     "data",     "maiml_instance",               "result/material/condition インスタンス",            "instances.xlsx 1 シート = 1 レコード", "/maiml/data/results/*",       "results_id カラム追加", "★2026-03-17"),
        ("data",     "data",     "maiml_element",                "汎用データ行（property/content/uncertainty 等）",   "instances.xlsx 1 行 = 1 レコード", "/maiml/data/results/*/*",       "", ""),
        ("data",     "data",     "maiml_element_value",          "<value> 子要素の展開（複数value対応）",              "1 value = 1 レコード",            "property/content/uncertainty/value", "value_array 追加済み", ""),
        ("data",     "data",     "maiml_insertion",              "外部ファイル参照の正規化",                           "insertion 1 件 = 1 レコード",     "/maiml/data/results/*/insertion", "", ""),
        # protocol層
        ("protocol", "protocol", "maiml_template",               "テンプレート定義",                                  "templates.xlsx 1 シート = 1 レコード", "/maiml/protocol/*/results/*", "", ""),
        ("protocol", "protocol", "maiml_template_element",       "テンプレートの汎用データ行",                        "templates.xlsx 1 行 = 1 レコード", "/maiml/protocol/*/results/*/*", "", ""),
        ("protocol", "protocol", "maiml_template_element_value", "テンプレートの <value> 展開",                       "1 value = 1 レコード",            "template property/content/value", "", ""),
        ("protocol", "protocol", "maiml_template_insertion",     "テンプレートの外部ファイル参照",                    "insertion 1 件 = 1 レコード",     "template insertion",            "", ""),
        # eventLog層（新規）
        ("eventlog", "eventLog", "maiml_event",                  "event 要素（eventLog/log/trace はテーブルなし）",   "1 event = 1 レコード",            "/maiml/eventLog/log/trace/event", "★新規追加", "★2026-03-17"),
        ("eventlog", "eventLog", "maiml_event_element",          "event 配下の property 行",                          "1 property = 1 レコード",         "event/property",               "★新規追加", "★2026-03-17"),
        ("eventlog", "eventLog", "maiml_event_element_value",    "property の <value> 展開",                          "1 value = 1 レコード",            "event/property/value",         "★新規追加", "★2026-03-17"),
    ]

    layer_color = {
        "common":   C_HEADER_COMMON,
        "data":     C_HEADER_DATA,
        "protocol": C_HEADER_PROTOCOL,
        "eventlog": C_HEADER_EVENTLOG,
    }

    r = 3
    for layer, layer_name, table, role, unit, maiml_el, note, updated in rows:
        is_new = "★新規" in note
        fill = make_fill(C_NEW_COL) if is_new else make_fill(C_ROW_ODD if r % 2 == 1 else C_ROW_EVEN)
        for c, val in [(1, layer_name), (2, table), (3, role), (4, unit), (5, maiml_el), (6, note), (7, updated)]:
            cell = ws.cell(row=r, column=c, value=val)
            cell.fill      = fill
            cell.alignment = ALIGN_LEFT
            cell.border    = BORDER_THIN
            if c == 1:
                cell.fill = make_fill(layer_color[layer])
                cell.font = FONT_WHITE_BOLD
                cell.alignment = ALIGN_CENTER
            elif c == 2:
                cell.font = FONT_CODE
            elif c == 7 and updated:
                cell.font = Font(name="Meiryo UI", size=10, color="C00000", bold=True)
            else:
                cell.font = FONT_NORMAL
        r += 1

    set_col_widths(ws, [
        (1, 12), (2, 34), (3, 44), (4, 36), (5, 40), (6, 28), (7, 14)
    ])
    freeze(ws, "B3")


# ============================================================
# テーブルシート共通ヘルパー
# ============================================================

def write_section_title(ws, row, col, title, layer, ncols=7):
    ws.merge_cells(start_row=row, start_column=col,
                   end_row=row, end_column=col + ncols - 1)
    cell = ws.cell(row=row, column=col, value=title)
    color_map = {"common": C_HEADER_COMMON, "data": C_HEADER_DATA,
                 "protocol": C_HEADER_PROTOCOL, "eventlog": C_HEADER_EVENTLOG}
    cell.fill = make_fill(color_map.get(layer, C_HEADER_COMMON))
    cell.font = FONT_WHITE_BOLD
    cell.alignment = ALIGN_CENTER
    cell.border = BORDER_THIN

def write_col_table(ws, start_row, col_defs, layer, ncols=7):
    """
    col_defs: list of dict {
        name, type, nullable, pk, fk, new, description, source
    }
    columns: カラム名 | 型 | NULL | PK | FK | 説明 | 取得元
    """
    r = start_row
    sub_hdrs = ["カラム名", "型", "NULL可", "PK", "FK", "説明", "取得元（MaiML要素）"]
    apply_sub_header(ws, r, range(1, 8), sub_hdrs)
    r += 1

    for d in col_defs:
        pk = "◎" if d.get("pk") else ""
        fk = "◎" if d.get("fk") else ""
        null = "○" if d.get("nullable", True) else "✕"
        if d.get("pk"):
            rt = "pk"
        elif d.get("fk"):
            rt = "fk"
        elif d.get("new"):
            rt = "new"
        else:
            rt = "normal" if r % 2 == 1 else "even"

        write_row(ws, r, [
            (1, d["name"]),
            (2, d["type"]),
            (3, null),
            (4, pk),
            (5, fk),
            (6, d.get("description", "")),
            (7, d.get("source", "")),
        ], row_type=rt)

        # 新規カラムは赤太字
        if d.get("new"):
            ws.cell(row=r, column=1).font = Font(name="Consolas", size=9, color="C00000", bold=True)
            ws.cell(row=r, column=6).font = Font(name="Meiryo UI", size=10, color="C00000", bold=True)

        r += 1
    return r

def write_index_table(ws, start_row, indexes):
    """indexes: list of (index_name, columns, note)"""
    r = start_row
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7)
    cell = ws.cell(row=r, column=1, value="インデックス")
    cell.fill = make_fill(C_SUB_HEADER)
    cell.font = FONT_BOLD
    cell.alignment = ALIGN_CENTER
    cell.border = BORDER_THIN
    r += 1

    apply_sub_header(ws, r, range(1, 4), ["インデックス名", "対象カラム", "備考"])
    r += 1
    for idx_name, cols, note in indexes:
        write_row(ws, r, [(1, idx_name), (2, cols), (3, note)])
        r += 1
    return r

def write_join_note(ws, start_row, notes):
    """notes: list of str"""
    r = start_row
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7)
    cell = ws.cell(row=r, column=1, value="結合・参照ノート")
    cell.fill = make_fill(C_SUB_HEADER)
    cell.font = FONT_BOLD
    cell.alignment = ALIGN_CENTER
    cell.border = BORDER_THIN
    r += 1
    for note in notes:
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=7)
        cell = ws.cell(row=r, column=1, value=note)
        cell.font = FONT_NORMAL
        cell.alignment = ALIGN_LEFT
        cell.border = BORDER_THIN
        r += 1
    return r

def setup_table_sheet(ws, name):
    ws.title = name
    ws.sheet_view.showGridLines = False
    set_col_widths(ws, [(1, 30), (2, 20), (3, 8), (4, 6), (5, 6), (6, 50), (7, 40)])
    freeze(ws, "A3")


# ============================================================
# 各テーブルシート
# ============================================================

def build_asset_sheet(ws):
    setup_table_sheet(ws, "maiml_asset")
    layer = "common"
    r = 1
    write_section_title(ws, r, 1, "maiml_asset  ―  MaiML ファイル代表メタ（共通層）", layer)
    r += 1

    col_defs = [
        {"name": "asset_id",        "type": "BIGSERIAL",   "nullable": False, "pk": True,  "description": "主キー（自動採番）", "source": "—"},
        {"name": "file_uri",        "type": "TEXT NOT NULL","nullable": False,              "description": "ファイルの URI / パス", "source": "公開時パラメータ"},
        {"name": "doc_name",        "type": "TEXT",        "nullable": True,               "description": "ドキュメント名",      "source": "/maiml/document/name テキスト"},
        {"name": "retention_until", "type": "TIMESTAMPTZ NOT NULL","nullable": False,       "description": "公開期限（期限到来でスケジュール非公開対象）", "source": "organization.default_retention_days または RETENTION_DAYS_DEFAULT"},
        {"name": "created_at",      "type": "TIMESTAMPTZ NOT NULL","nullable": False,       "description": "レコード作成日時",    "source": "now()"},
        {"name": "updated_at",      "type": "TIMESTAMPTZ NOT NULL","nullable": False,       "description": "レコード更新日時",    "source": "now()"},
    ]
    r = write_col_table(ws, r, col_defs, layer)
    r += 1

    indexes = [
        ("ix_maiml_asset_uri",             "file_uri",       "URI検索用"),
        ("ix_maiml_asset_retention_until", "retention_until","期限スキャン用"),
    ]
    r = write_index_table(ws, r, indexes)
    r += 1

    notes = [
        "全インスタンス（result/material/condition）・全要素を取り込む方針。フィルタリングはクエリ側で実施。",
        "retention_until: organization.default_retention_days（優先）または環境変数 RETENTION_DAYS_DEFAULT（デフォルト365日）で算出。",
    ]
    write_join_note(ws, r, notes)


def build_instance_sheet(ws):
    setup_table_sheet(ws, "maiml_instance")
    layer = "data"
    r = 1
    write_section_title(ws, r, 1, "maiml_instance  ―  result/material/condition インスタンス（data層）", layer)
    r += 1

    col_defs = [
        {"name": "instance_id",      "type": "BIGSERIAL",    "nullable": False, "pk": True, "description": "主キー（自動採番）", "source": "—"},
        {"name": "asset_id",         "type": "BIGINT NOT NULL","nullable": False, "fk": True, "description": "maiml_asset 参照", "source": "—"},
        {"name": "instance_type",    "type": "TEXT NOT NULL", "nullable": False, "description": "インスタンス種別  CHECK: 'result'/'material'/'condition'", "source": "XML パス（data/results/result 等）"},
        {"name": "instance_key",     "type": "TEXT NOT NULL", "nullable": False, "description": "インスタンス識別子（@id 属性）", "source": "data/results/result/@id 等"},
        {"name": "results_id",       "type": "TEXT",          "nullable": True,  "new": True, "description": "【★新規】results/@id 属性。maiml_event.results_ref との結合キー", "source": "data/results/@id"},
        {"name": "template_ref",     "type": "TEXT",          "nullable": True,  "description": "参照先テンプレート ID（@ref 属性）", "source": "instance/@ref"},
        {"name": "instance_uuid",    "type": "TEXT",          "nullable": True,  "description": "インスタンスの UUID", "source": "instance/uuid テキスト"},
        {"name": "instance_name",    "type": "TEXT",          "nullable": True,  "description": "インスタンス名", "source": "instance/name テキスト"},
        {"name": "instance_line_no", "type": "INT",           "nullable": True,  "description": "XML 元行番号", "source": "element.sourceline"},
    ]
    r = write_col_table(ws, r, col_defs, layer)
    r += 1

    indexes = [
        ("ix_maiml_instance_asset",      "asset_id",            "アセット検索"),
        ("ix_maiml_instance_type",       "instance_type",       "種別フィルタ"),
        ("ix_maiml_instance_key",        "instance_key",        "ID検索"),
        ("ix_maiml_instance_results_id", "(asset_id, results_id)", "★eventLog層との結合用（新規）"),
        ("ix_maiml_instance_template",   "template_ref",        "テンプレート参照解決"),
    ]
    r = write_index_table(ws, r, indexes)
    r += 1

    notes = [
        "★ results_id: data/results/@id を格納。maiml_event.results_ref との論理JOINキー。",
        "JOIN例: SELECT * FROM maiml_instance mi JOIN maiml_event ev ON ev.results_ref = mi.results_id AND ev.asset_id = mi.asset_id",
        "FK: asset_id → maiml_asset(asset_id) ON DELETE CASCADE",
    ]
    write_join_note(ws, r, notes)


def build_element_sheet(ws):
    setup_table_sheet(ws, "maiml_element")
    layer = "data"
    r = 1
    write_section_title(ws, r, 1, "maiml_element  ―  汎用データ行（data層）", layer)
    r += 1

    col_defs = [
        {"name": "element_id",        "type": "BIGSERIAL",     "nullable": False, "pk": True,  "description": "主キー", "source": "—"},
        {"name": "instance_id",       "type": "BIGINT NOT NULL","nullable": False, "fk": True,  "description": "maiml_instance 参照", "source": "—"},
        {"name": "parent_element_id", "type": "BIGINT",         "nullable": True,  "fk": True,  "description": "親要素（自己参照）。NULL=トップレベル", "source": "—"},
        {"name": "hierarchy",         "type": "TEXT NOT NULL",  "nullable": False, "description": "階層番号  例: '1', '1-2', '1-2-3'", "source": "B列: hierarchy"},
        {"name": "element_type",      "type": "TEXT NOT NULL",  "nullable": False, "description": "要素種別  property/content/uncertainty/insertion/uri/hash/uuid/format/childUri/childHash/childUuid/EncryptedData", "source": "C列: element"},
        {"name": "description",       "type": "TEXT",           "nullable": True,  "description": "説明文", "source": "D列: description"},
        {"name": "element_data",      "type": "TEXT",           "nullable": True,  "description": "要素データ値（insertion系・暗号化データ）", "source": "E列: element data"},
        {"name": "hash_method",       "type": "TEXT",           "nullable": True,  "description": "ハッシュアルゴリズム  例: SHA-256", "source": "<hash method='...'> 属性"},
        {"name": "xsi_type",          "type": "TEXT",           "nullable": True,  "description": "データ型  intType/stringType/doubleType 等", "source": "F列: @xsi:type"},
        {"name": "key",               "type": "TEXT",           "nullable": True,  "description": "キー名（NS プレフィックス付き）  例: tiff:ImageWidth", "source": "G列: @key"},
        {"name": "format_string",     "type": "TEXT",           "nullable": True,  "description": "フォーマット文字列", "source": "H列: @formatString"},
        {"name": "units",             "type": "TEXT",           "nullable": True,  "description": "単位  例: mm, seconds", "source": "I列: @units"},
        {"name": "scale_factor",      "type": "DOUBLE PRECISION","nullable": True, "description": "スケール係数", "source": "J列: @scaleFactor"},
        {"name": "axis",              "type": "TEXT",           "nullable": True,  "description": "軸情報  例: x, y, z", "source": "K列: @axis"},
        {"name": "size_value",        "type": "INT",            "nullable": True,  "description": "サイズ", "source": "L列: @size"},
        {"name": "element_id_attr",   "type": "TEXT",           "nullable": True,  "description": "要素自身の @id 属性", "source": "M列: @id"},
        {"name": "element_ref",       "type": "TEXT",           "nullable": True,  "description": "@ref 属性（参照先ID）", "source": "N列: @ref"},
        {"name": "maiml_line_no",     "type": "INT",            "nullable": True,  "description": "XML 元行番号", "source": "A列: MaiML file lineNo"},
    ]
    r = write_col_table(ws, r, col_defs, layer)
    r += 1

    indexes = [
        ("ix_maiml_element_instance",  "instance_id",            "インスタンス紐付け"),
        ("ix_maiml_element_parent",    "parent_element_id",      "親子関係JOINに使用"),
        ("ix_maiml_element_type",      "element_type",           "種別フィルタ"),
        ("ix_maiml_element_key",       "key",                    "キー検索"),
        ("ix_maiml_element_hierarchy", "(instance_id, hierarchy)","階層順取得"),
    ]
    write_index_table(ws, r, indexes)


def build_element_value_sheet(ws):
    setup_table_sheet(ws, "maiml_element_value")
    layer = "data"
    r = 1
    write_section_title(ws, r, 1, "maiml_element_value  ―  <value> 展開（data層）", layer)
    r += 1

    col_defs = [
        {"name": "value_id",    "type": "BIGSERIAL",     "nullable": False, "pk": True, "description": "主キー", "source": "—"},
        {"name": "element_id",  "type": "BIGINT NOT NULL","nullable": False, "fk": True, "description": "maiml_element 参照", "source": "—"},
        {"name": "value_idx",   "type": "INT NOT NULL",  "nullable": False, "description": "複数 value の順序（0-origin）。単一の場合も 0", "source": "O列 value 展開連番"},
        {"name": "value",       "type": "TEXT",          "nullable": True,  "description": "単一値テキスト。スペース区切り2要素以上なら NULL → value_array 使用", "source": "O列: value（単一）"},
        {"name": "value_array", "type": "TEXT[]",        "nullable": True,  "description": "スペース区切り複数値を配列展開。単一値なら NULL", "source": "O列: value（スペース区切り複数）"},
    ]
    r = write_col_table(ws, r, col_defs, layer)
    r += 1

    indexes = [
        ("ix_maiml_element_value_element", "element_id",            "親要素検索"),
        ("ux_maiml_element_value",         "(element_id, value_idx)","UNIQUE制約"),
    ]
    r = write_index_table(ws, r, indexes)
    r += 1

    notes = [
        "登録方針: <value>テキストをスペース区切りで分割。2要素以上 → value_array（value=NULL）。1要素 → value（value_array=NULL）。",
        "取得: COALESCE(value_array[1], value) で統一的にアクセス可能。",
        "例: tiff:StripByteCounts の256個の値 → value_idx 0〜255 の256行として格納。",
    ]
    write_join_note(ws, r, notes)


def build_insertion_sheet(ws):
    setup_table_sheet(ws, "maiml_insertion")
    layer = "data"
    r = 1
    write_section_title(ws, r, 1, "maiml_insertion  ―  外部ファイル参照正規化（data層）", layer)
    r += 1

    col_defs = [
        {"name": "insertion_id", "type": "BIGSERIAL",     "nullable": False, "pk": True, "description": "主キー", "source": "—"},
        {"name": "instance_id",  "type": "BIGINT NOT NULL","nullable": False, "fk": True, "description": "maiml_instance 参照", "source": "—"},
        {"name": "uri",          "type": "TEXT NOT NULL",  "nullable": False, "description": "ファイルパス / URI", "source": "insertion/uri テキスト"},
        {"name": "hash_value",   "type": "TEXT",           "nullable": True,  "description": "ハッシュ値", "source": "insertion/hash テキスト"},
        {"name": "hash_method",  "type": "TEXT",           "nullable": True,  "description": "ハッシュアルゴリズム  例: SHA-256", "source": "insertion/hash/@method 属性"},
        {"name": "file_uuid",    "type": "TEXT",           "nullable": True,  "description": "ファイル UUID", "source": "insertion/uuid テキスト"},
        {"name": "mime_format",  "type": "TEXT",           "nullable": True,  "description": "MIME タイプ  例: image/tiff", "source": "insertion/format テキスト"},
        {"name": "maiml_line_no","type": "INT",            "nullable": True,  "description": "<insertion> タグの XML 行番号", "source": "element.sourceline"},
    ]
    r = write_col_table(ws, r, col_defs, layer)
    r += 1

    indexes = [
        ("ix_maiml_insertion_instance", "instance_id", "インスタンス紐付け"),
        ("ix_maiml_insertion_uri",      "uri",         "URI検索"),
    ]
    r = write_index_table(ws, r, indexes)
    r += 1

    notes = [
        "maiml_element の uri/hash/uuid/format 行を 1 レコードに集約した正規化テーブル。",
        "ファイル参照の検索・管理を容易にするために maiml_element と二重管理する。",
    ]
    write_join_note(ws, r, notes)


def build_template_sheet(ws):
    setup_table_sheet(ws, "maiml_template")
    layer = "protocol"
    r = 1
    write_section_title(ws, r, 1, "maiml_template  ―  テンプレート定義（protocol層）", layer)
    r += 1

    col_defs = [
        {"name": "template_id",      "type": "BIGSERIAL",     "nullable": False, "pk": True, "description": "主キー", "source": "—"},
        {"name": "asset_id",         "type": "BIGINT NOT NULL","nullable": False, "fk": True, "description": "maiml_asset 参照", "source": "—"},
        {"name": "template_type",    "type": "TEXT NOT NULL",  "nullable": False, "description": "テンプレート種別  CHECK: 'result'/'material'/'condition'", "source": "XML パス"},
        {"name": "template_key",     "type": "TEXT NOT NULL",  "nullable": False, "description": "テンプレート識別子（@id 属性）", "source": "/maiml/protocol/*/results/*/@id"},
        {"name": "template_uuid",    "type": "TEXT",           "nullable": True,  "description": "テンプレート UUID", "source": "template/uuid テキスト"},
        {"name": "template_name",    "type": "TEXT",           "nullable": True,  "description": "テンプレート名", "source": "template/name テキスト"},
        {"name": "template_line_no", "type": "INT",            "nullable": True,  "description": "XML 元行番号", "source": "element.sourceline"},
    ]
    r = write_col_table(ws, r, col_defs, layer)
    r += 1

    indexes = [
        ("ix_maiml_template_asset", "asset_id",     "アセット検索"),
        ("ix_maiml_template_type",  "template_type","種別フィルタ"),
        ("ix_maiml_template_key",   "template_key", "ID検索・JOIN用"),
    ]
    r = write_index_table(ws, r, indexes)
    r += 1

    notes = [
        "maiml_instance.template_ref = maiml_template.template_key で参照解決（同一 asset_id 内）。",
    ]
    write_join_note(ws, r, notes)


def build_template_element_sheet(ws):
    setup_table_sheet(ws, "maiml_template_element")
    layer = "protocol"
    r = 1
    write_section_title(ws, r, 1, "maiml_template_element  ―  テンプレート行データ（protocol層）", layer)
    r += 1

    col_defs = [
        {"name": "element_id",        "type": "BIGSERIAL",     "nullable": False, "pk": True,  "description": "主キー", "source": "—"},
        {"name": "template_id",       "type": "BIGINT NOT NULL","nullable": False, "fk": True,  "description": "maiml_template 参照", "source": "—"},
        {"name": "parent_element_id", "type": "BIGINT",         "nullable": True,  "fk": True,  "description": "親要素（自己参照）。NULL=トップレベル", "source": "—"},
        {"name": "hierarchy",         "type": "TEXT NOT NULL",  "nullable": False, "description": "階層番号", "source": "B列: hierarchy"},
        {"name": "element_type",      "type": "TEXT NOT NULL",  "nullable": False, "description": "要素種別（maiml_element と同一）", "source": "C列: element"},
        {"name": "description",       "type": "TEXT",           "nullable": True,  "description": "説明文", "source": "D列: description"},
        {"name": "element_data",      "type": "TEXT",           "nullable": True,  "description": "要素データ値", "source": "E列: element data"},
        {"name": "hash_method",       "type": "TEXT",           "nullable": True,  "description": "ハッシュアルゴリズム", "source": "<hash method='...'> 属性"},
        {"name": "xsi_type",          "type": "TEXT",           "nullable": True,  "description": "データ型", "source": "F列: @xsi:type"},
        {"name": "key",               "type": "TEXT",           "nullable": True,  "description": "キー名", "source": "G列: @key"},
        {"name": "format_string",     "type": "TEXT",           "nullable": True,  "description": "フォーマット文字列", "source": "H列: @formatString"},
        {"name": "units",             "type": "TEXT",           "nullable": True,  "description": "単位", "source": "I列: @units"},
        {"name": "scale_factor",      "type": "DOUBLE PRECISION","nullable": True, "description": "スケール係数", "source": "J列: @scaleFactor"},
        {"name": "axis",              "type": "TEXT",           "nullable": True,  "description": "軸情報", "source": "K列: @axis"},
        {"name": "size_value",        "type": "INT",            "nullable": True,  "description": "サイズ", "source": "L列: @size"},
        {"name": "element_id_attr",   "type": "TEXT",           "nullable": True,  "description": "要素自身の @id 属性", "source": "M列: @id"},
        {"name": "element_ref",       "type": "TEXT",           "nullable": True,  "description": "@ref 属性", "source": "N列: @ref"},
        {"name": "maiml_line_no",     "type": "INT",            "nullable": True,  "description": "XML 元行番号", "source": "A列: MaiML file lineNo"},
    ]
    r = write_col_table(ws, r, col_defs, layer)
    r += 1

    indexes = [
        ("ix_maiml_tmpl_element_template",  "template_id",              "テンプレート紐付け"),
        ("ix_maiml_tmpl_element_parent",    "parent_element_id",        "親子関係JOIN"),
        ("ix_maiml_tmpl_element_type",      "element_type",             "種別フィルタ"),
        ("ix_maiml_tmpl_element_key",       "key",                      "キー検索"),
        ("ix_maiml_tmpl_element_hierarchy", "(template_id, hierarchy)", "階層順取得"),
    ]
    write_index_table(ws, r, indexes)


def build_template_element_value_sheet(ws):
    setup_table_sheet(ws, "maiml_template_element_value")
    layer = "protocol"
    r = 1
    write_section_title(ws, r, 1, "maiml_template_element_value  ―  テンプレート <value> 展開（protocol層）", layer)
    r += 1

    col_defs = [
        {"name": "value_id",    "type": "BIGSERIAL",     "nullable": False, "pk": True, "description": "主キー", "source": "—"},
        {"name": "element_id",  "type": "BIGINT NOT NULL","nullable": False, "fk": True, "description": "maiml_template_element 参照", "source": "—"},
        {"name": "value_idx",   "type": "INT NOT NULL",  "nullable": False, "description": "複数 value の順序（0-origin）", "source": "O列 value 展開連番"},
        {"name": "value",       "type": "TEXT",          "nullable": True,  "description": "単一値テキスト。スペース区切り2要素以上なら NULL", "source": "O列: value（単一）"},
        {"name": "value_array", "type": "TEXT[]",        "nullable": True,  "description": "スペース区切り複数値を配列展開。単一値なら NULL", "source": "O列: value（複数）"},
    ]
    r = write_col_table(ws, r, col_defs, layer)
    r += 1

    indexes = [
        ("ix_maiml_tmpl_element_value_element", "element_id",            "親要素検索"),
        ("ux_maiml_tmpl_element_value",         "(element_id, value_idx)","UNIQUE制約"),
    ]
    write_index_table(ws, r, indexes)


def build_template_insertion_sheet(ws):
    setup_table_sheet(ws, "maiml_template_insertion")
    layer = "protocol"
    r = 1
    write_section_title(ws, r, 1, "maiml_template_insertion  ―  テンプレート外部ファイル参照（protocol層）", layer)
    r += 1

    col_defs = [
        {"name": "insertion_id", "type": "BIGSERIAL",     "nullable": False, "pk": True, "description": "主キー", "source": "—"},
        {"name": "template_id",  "type": "BIGINT NOT NULL","nullable": False, "fk": True, "description": "maiml_template 参照", "source": "—"},
        {"name": "uri",          "type": "TEXT NOT NULL",  "nullable": False, "description": "ファイルパス / URI", "source": "insertion/uri テキスト"},
        {"name": "hash_value",   "type": "TEXT",           "nullable": True,  "description": "ハッシュ値", "source": "insertion/hash テキスト"},
        {"name": "hash_method",  "type": "TEXT",           "nullable": True,  "description": "ハッシュアルゴリズム", "source": "insertion/hash/@method 属性"},
        {"name": "file_uuid",    "type": "TEXT",           "nullable": True,  "description": "ファイル UUID", "source": "insertion/uuid テキスト"},
        {"name": "mime_format",  "type": "TEXT",           "nullable": True,  "description": "MIME タイプ", "source": "insertion/format テキスト"},
        {"name": "maiml_line_no","type": "INT",            "nullable": True,  "description": "XML 元行番号", "source": "element.sourceline"},
    ]
    r = write_col_table(ws, r, col_defs, layer)
    r += 1

    indexes = [
        ("ix_maiml_tmpl_insertion_template", "template_id", "テンプレート紐付け"),
        ("ix_maiml_tmpl_insertion_uri",      "uri",         "URI検索"),
    ]
    write_index_table(ws, r, indexes)


# ============================================================
# eventLog層シート（新規）
# ============================================================

def build_event_sheet(ws):
    setup_table_sheet(ws, "maiml_event")
    layer = "eventlog"
    r = 1
    write_section_title(ws, r, 1, "maiml_event  ―  event 要素（eventLog層）  ★2026-03-17 新規追加", layer)
    r += 1

    col_defs = [
        {"name": "event_id",        "type": "BIGSERIAL",     "nullable": False, "pk": True,  "description": "主キー", "source": "—"},
        {"name": "asset_id",        "type": "BIGINT NOT NULL","nullable": False, "fk": True,  "description": "maiml_asset 参照", "source": "—"},
        {"name": "event_key",       "type": "TEXT",          "nullable": True,  "description": "event の @id 属性", "source": "event/@id"},
        {"name": "results_ref",     "type": "TEXT",          "nullable": True,  "new": True,  "description": "【結合キー】data層との結合に使用。maiml_instance.results_id と等値JOIN", "source": "event/resultsRef/@ref"},
        {"name": "instruction_ref", "type": "TEXT",          "nullable": True,  "description": "event の @ref 属性（instruction の @id を参照）", "source": "event/@ref"},
        {"name": "event_uuid",      "type": "TEXT",          "nullable": True,  "description": "event/uuid テキスト", "source": "event/uuid"},
        {"name": "event_name",      "type": "TEXT",          "nullable": True,  "description": "event/name テキスト", "source": "event/name"},
        {"name": "description",     "type": "TEXT",          "nullable": True,  "description": "説明文", "source": "event/description"},
        {"name": "annotation",      "type": "TEXT",          "nullable": True,  "description": "アノテーション", "source": "event/annotation"},
        {"name": "maiml_line_no",   "type": "INT",           "nullable": True,  "description": "XML 元行番号", "source": "element.sourceline"},
    ]
    r = write_col_table(ws, r, col_defs, layer)
    r += 1

    indexes = [
        ("ix_maiml_event_asset",       "asset_id",                "アセット検索"),
        ("ix_maiml_event_results_ref", "(asset_id, results_ref)", "★data層との結合用"),
        ("ix_maiml_event_instruction", "instruction_ref",         "instruction参照"),
    ]
    r = write_index_table(ws, r, indexes)
    r += 1

    notes = [
        "※ eventLog / log / trace タグはテーブルとして持たない。event タグ以降のみを格納。",
        "★data層との結合（論理JOIN）:",
        "  SELECT * FROM maiml_instance mi",
        "  JOIN maiml_event ev ON ev.results_ref = mi.results_id AND ev.asset_id = mi.asset_id",
        "MaiML上の対応: data/results/@id（→ maiml_instance.results_id）= event/resultsRef/@ref（→ maiml_event.results_ref）",
    ]
    write_join_note(ws, r, notes)


def build_event_element_sheet(ws):
    setup_table_sheet(ws, "maiml_event_element")
    layer = "eventlog"
    r = 1
    write_section_title(ws, r, 1, "maiml_event_element  ―  event 配下 property 行（eventLog層）  ★2026-03-17 新規追加", layer)
    r += 1

    col_defs = [
        {"name": "event_element_id", "type": "BIGSERIAL",     "nullable": False, "pk": True, "description": "主キー", "source": "—"},
        {"name": "event_id",         "type": "BIGINT NOT NULL","nullable": False, "fk": True, "description": "maiml_event 参照", "source": "—"},
        {"name": "element_type",     "type": "TEXT NOT NULL",  "nullable": False, "description": "現時点では 'property' 固定（DEFAULT 'property'）", "source": "タグ名"},
        {"name": "key",              "type": "TEXT",           "nullable": True,  "description": "property/@key 属性  例: lifecycle:transition / time:timestamp / concept:instance", "source": "event/property/@key"},
        {"name": "description",      "type": "TEXT",           "nullable": True,  "description": "property/description テキスト", "source": "event/property/description"},
        {"name": "maiml_line_no",    "type": "INT",            "nullable": True,  "description": "XML 元行番号", "source": "element.sourceline"},
    ]
    r = write_col_table(ws, r, col_defs, layer)
    r += 1

    indexes = [
        ("ix_maiml_event_element_event", "event_id", "event紐付け"),
        ("ix_maiml_event_element_key",   "key",      "キー検索  例: lifecycle:transition"),
    ]
    r = write_index_table(ws, r, indexes)
    r += 1

    notes = [
        "よく使われる key 値:",
        "  lifecycle:transition ... complete / start / assign 等のライフサイクル状態",
        "  time:timestamp       ... ISO8601 形式のタイムスタンプ",
        "  concept:instance     ... 対応する result インスタンスの UUID",
    ]
    write_join_note(ws, r, notes)


def build_event_element_value_sheet(ws):
    setup_table_sheet(ws, "maiml_event_element_value")
    layer = "eventlog"
    r = 1
    write_section_title(ws, r, 1, "maiml_event_element_value  ―  property <value> 展開（eventLog層）  ★2026-03-17 新規追加", layer)
    r += 1

    col_defs = [
        {"name": "value_id",         "type": "BIGSERIAL",     "nullable": False, "pk": True, "description": "主キー", "source": "—"},
        {"name": "event_element_id", "type": "BIGINT NOT NULL","nullable": False, "fk": True, "description": "maiml_event_element 参照", "source": "—"},
        {"name": "value_idx",        "type": "INT NOT NULL",  "nullable": False, "description": "複数 value の順序（0-origin）。単一の場合も 0", "source": "value 展開連番"},
        {"name": "value",            "type": "TEXT",          "nullable": True,  "description": "単一値テキスト。スペース区切り2要素以上なら NULL", "source": "event/property/value（単一）"},
        {"name": "value_array",      "type": "TEXT[]",        "nullable": True,  "description": "スペース区切り複数値を配列展開。単一値なら NULL", "source": "event/property/value（複数）"},
    ]
    r = write_col_table(ws, r, col_defs, layer)
    r += 1

    indexes = [
        ("ix_maiml_event_element_value_elem", "event_element_id",            "親要素検索"),
        ("ux_maiml_event_element_value",      "(event_element_id, value_idx)","UNIQUE制約"),
    ]
    r = write_index_table(ws, r, indexes)
    r += 1

    notes = [
        "登録方針は maiml_element_value と同一。",
        "lifecycle:transition の例: value = 'complete'",
        "time:timestamp の例: value = '2024-01-15T09:30:00Z'",
        "concept:instance の例: value = 'b2aa1099-xxxx-xxxx-xxxx-xxxxxxxxxxxx'（result UUID）",
    ]
    write_join_note(ws, r, notes)


# ============================================================
# シート: 展開例（XRF.maiml）
# ============================================================

def build_sample_sheet(ws):
    """
    XRF.maiml の eventLog 部分を実際のテーブルデータとして展開した例を示すシート。

    XRF.maiml 該当箇所（行番号）:
      2436: <results id="results_xrfSpectrumAnalysis">
      5317: <eventLog id="eventLog_xrfSpectrumAnalysis">
      5322:   <log ...>
      5327:     <trace ...>
      5332:       <event id="event_xrfSpectrumAnalysis" ref="instruction_xrfSpectrumAnalysis">
      5337:         <property key="lifecycle:transition" ...>  → value: complete
      5341:         <property key="time:timestamp" ...>         → value: 2024-04-25T16:24:55+09:00
      5345:         <property key="concept:instance" ...>       → value: ff9b1776-...（XRF Spectrum Data）
      5349:         <property key="concept:instance" ...>       → value: 6cbb3927-...（XRF Sample Image）

    ※ XRF.maiml には resultsRef 要素がないため results_ref = NULL
    """
    ws.title = "展開例（XRF.maiml）"
    ws.sheet_view.showGridLines = False

    def title_row(ws, r, text, color):
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=8)
        cell = ws.cell(row=r, column=1, value=text)
        cell.fill = make_fill(color)
        cell.font = FONT_WHITE_BOLD
        cell.alignment = ALIGN_CENTER
        cell.border = BORDER_THIN
        return r + 1

    def sub_row(ws, r, cols, values, fill_color=C_SUB_HEADER):
        for c, v in zip(cols, values):
            cell = ws.cell(row=r, column=c, value=v)
            cell.fill = make_fill(fill_color)
            cell.font = FONT_BOLD
            cell.alignment = ALIGN_CENTER
            cell.border = BORDER_THIN
        return r + 1

    def data_row(ws, r, col_values, highlight=False):
        fill = make_fill(C_NEW_COL) if highlight else make_fill(C_ROW_ODD if r % 2 == 1 else C_ROW_EVEN)
        for c, v in col_values:
            cell = ws.cell(row=r, column=c, value=v)
            cell.fill = fill
            cell.font = FONT_CODE if c == 1 else FONT_NORMAL
            cell.alignment = ALIGN_LEFT
            cell.border = BORDER_THIN
        return r + 1

    def blank_row(ws, r):
        return r + 1

    r = 1
    # ========== タイトル ==========
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=8)
    cell = ws.cell(row=r, column=1,
        value="XRF.maiml  eventLog 展開例  ―  各テーブルへの格納イメージ（2026-03-17）")
    cell.fill = make_fill(C_HEADER_COMMON)
    cell.font = FONT_WHITE_BOLD
    cell.alignment = ALIGN_CENTER
    r += 1

    # ========== XML抜粋メモ ==========
    r = title_row(ws, r, "【参照 XML 抜粋】  XRF.maiml 行 2436 / 5317〜5356", C_HEADER_DATA)
    xml_lines = [
        "data 層（行 2436）:",
        "  <results id=\"results_xrfSpectrumAnalysis\">",
        "    <uuid>b58cda27-138c-4012-8b2e-58dcfbedf7f0</uuid>",
        "    ...",
        "eventLog 層（行 5317〜5356）:",
        "  <eventLog id=\"eventLog_xrfSpectrumAnalysis\">  ← テーブルなし（格納しない）",
        "    <log id=\"log_xrfSpectrumAnalysis\" ...>       ← テーブルなし（格納しない）",
        "      <trace id=\"trace_xrfSpectrumAnalysis\" ...> ← テーブルなし（格納しない）",
        "        <event id=\"event_xrfSpectrumAnalysis\" ref=\"instruction_xrfSpectrumAnalysis\">  ← ★ここから格納",
        "          <uuid>f345a449-0ae9-42fb-9885-6eee27a6a304</uuid>",
        "          <property key=\"lifecycle:transition\">  <value>complete</value>  </property>",
        "          <property key=\"time:timestamp\">         <value>2024-04-25T16:24:55+09:00</value>  </property>",
        "          <property key=\"concept:instance\">       <value>ff9b1776-a2ea-49d5-8f44-c8f2010505b9</value>  </property>  （XRF Spectrum Data）",
        "          <property key=\"concept:instance\">       <value>6cbb3927-d415-4eda-8ffa-06fd4569e5bb</value>  </property>  （XRF Sample Image）",
        "        </event>",
        "      </trace>   </log>   </eventLog>",
        "",
        "※ resultsRef 要素なし → results_ref = NULL（data層との直接結合は concept:instance UUID で代替）",
    ]
    for line in xml_lines:
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=8)
        cell = ws.cell(row=r, column=1, value=line)
        cell.font = FONT_CODE
        cell.alignment = ALIGN_LEFT
        cell.fill = make_fill("F8F8F8")
        cell.border = BORDER_THIN
        r += 1

    r = blank_row(ws, r)

    # ========== maiml_asset ==========
    r = title_row(ws, r, "① maiml_asset  （1 ファイル = 1 レコード）", C_HEADER_COMMON)
    r = sub_row(ws, r, range(1, 7),
        ["asset_id", "file_uri", "doc_name", "retention_until", "created_at", "updated_at"])
    r = data_row(ws, r, [
        (1, "1（仮）"),
        (2, "projects/xrf_sample/XRF.maiml"),
        (3, "xrfSpectrumAnalysis"),
        (4, "2027-03-17T00:00:00+09:00"),
        (5, "2026-03-17T14:00:00+09:00"),
        (6, "2026-03-17T14:00:00+09:00"),
    ])
    r = blank_row(ws, r)

    # ========== maiml_instance ==========
    r = title_row(ws, r, "② maiml_instance  （results_id = data/results/@id ← ★新規カラム）", C_HEADER_DATA)
    r = sub_row(ws, r, range(1, 9),
        ["instance_id", "asset_id", "instance_type", "instance_key", "results_id ★", "template_ref", "instance_uuid", "instance_name"])
    # XRF には result インスタンスが複数想定されるが代表的な1行を示す
    r = data_row(ws, r, [
        (1, "101（仮）"),
        (2, "1"),
        (3, "result"),
        (4, "result_xrfSpectrum_instance"),
        (5, "results_xrfSpectrumAnalysis"),  # ← data/results/@id
        (6, "result_xrfSpectrum"),
        (7, "b58cda27-138c-4012-8b2e-58dcfbedf7f0"),
        (8, "xrfSpectrumAnalysisResults"),
    ], highlight=True)
    r = blank_row(ws, r)

    # ========== maiml_event ==========
    r = title_row(ws, r, "③ maiml_event  （event タグ = 1 レコード）", C_HEADER_EVENTLOG)
    r = sub_row(ws, r, range(1, 9),
        ["event_id", "asset_id", "event_key", "results_ref", "instruction_ref", "event_uuid", "event_name", "maiml_line_no"])
    r = data_row(ws, r, [
        (1, "1（仮）"),
        (2, "1"),
        (3, "event_xrfSpectrumAnalysis"),
        (4, "NULL  ← resultsRef要素なし"),   # results_ref
        (5, "instruction_xrfSpectrumAnalysis"),
        (6, "f345a449-0ae9-42fb-9885-6eee27a6a304"),
        (7, "xrfSpectrumAnalysisEvent"),
        (8, "5332"),
    ])
    r = blank_row(ws, r)

    # ========== maiml_event_element ==========
    r = title_row(ws, r, "④ maiml_event_element  （event 直下の property = 4 レコード）", C_HEADER_EVENTLOG)
    r = sub_row(ws, r, range(1, 7),
        ["event_element_id", "event_id", "element_type", "key", "description", "maiml_line_no"])
    event_elements = [
        ("1（仮）", "1", "property", "lifecycle:transition",  "XRF Spectrum Analysis",           "5337"),
        ("2（仮）", "1", "property", "time:timestamp",         "XRF Spectrum Analysis DateTime",  "5341"),
        ("3（仮）", "1", "property", "concept:instance",       "XRF Spectrum Data",               "5345"),
        ("4（仮）", "1", "property", "concept:instance",       "XRF Sample Image",                "5349"),
    ]
    for row_data in event_elements:
        r = data_row(ws, r, [(i+1, v) for i, v in enumerate(row_data)])
    r = blank_row(ws, r)

    # ========== maiml_event_element_value ==========
    r = title_row(ws, r, "⑤ maiml_event_element_value  （各 property の value = 4 レコード）", C_HEADER_EVENTLOG)
    r = sub_row(ws, r, range(1, 7),
        ["value_id", "event_element_id", "value_idx", "value", "value_array", "備考"])
    event_values = [
        ("1（仮）", "1（lifecycle）", "0", "complete",                                      "NULL", "lifecycle:transition"),
        ("2（仮）", "2（timestamp）", "0", "2024-04-25T16:24:55+09:00",                    "NULL", "time:timestamp"),
        ("3（仮）", "3（instance1）", "0", "ff9b1776-a2ea-49d5-8f44-c8f2010505b9",         "NULL", "concept:instance（XRF Spectrum Data UUID）"),
        ("4（仮）", "4（instance2）", "0", "6cbb3927-d415-4eda-8ffa-06fd4569e5bb",         "NULL", "concept:instance（XRF Sample Image UUID）"),
    ]
    for row_data in event_values:
        r = data_row(ws, r, [(i+1, v) for i, v in enumerate(row_data)])
    r = blank_row(ws, r)

    # ========== data層との結合クエリ例 ==========
    r = title_row(ws, r, "⑥ data層との結合クエリ例", C_HEADER_COMMON)
    query_lines = [
        "-- XRF.maiml の event と result インスタンスを結合する",
        "--",
        "-- ケース A: resultsRef がある場合（results_ref 経由の直接JOIN）",
        "SELECT mi.instance_key, mi.instance_uuid, ev.event_key, ev.event_uuid",
        "FROM maiml_instance mi",
        "JOIN maiml_event ev",
        "  ON ev.results_ref = mi.results_id",
        " AND ev.asset_id    = mi.asset_id",
        "WHERE mi.asset_id = 1;",
        "",
        "-- ケース B: resultsRef がない場合（XRF.maiml のケース）",
        "--   concept:instance の value が instance_uuid と一致する event を検索",
        "SELECT mi.instance_key, mi.instance_uuid,",
        "       ev.event_key, eev.key AS prop_key, eevv.value AS prop_value",
        "FROM maiml_instance mi",
        "JOIN maiml_event ev ON ev.asset_id = mi.asset_id",
        "JOIN maiml_event_element eev ON eev.event_id = ev.event_id",
        "                            AND eev.key = 'concept:instance'",
        "JOIN maiml_event_element_value eevv ON eevv.event_element_id = eev.event_element_id",
        "                                   AND eevv.value_idx = 0",
        "WHERE mi.asset_id = 1",
        "  AND eevv.value = mi.instance_uuid;",
        "",
        "-- 結果イメージ（XRF.maiml）:",
        "--  instance_key                  | instance_uuid                        | event_key",
        "--  result_xrfSpectrum_instance   | ff9b1776-a2ea-49d5-8f44-c8f2010505b9 | event_xrfSpectrumAnalysis",
    ]
    for line in query_lines:
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=8)
        cell = ws.cell(row=r, column=1, value=line)
        cell.font = FONT_CODE
        cell.alignment = ALIGN_LEFT
        cell.fill = make_fill("F0F4FF")
        cell.border = BORDER_THIN
        r += 1

    # 列幅
    set_col_widths(ws, [
        (1, 22), (2, 16), (3, 20), (4, 50), (5, 46), (6, 40), (7, 34), (8, 14)
    ])
    ws.freeze_panes = "A3"


# ============================================================
# シート: マッピング表
# ============================================================

def build_mapping_sheet(ws):
    ws.title = "マッピング表"
    ws.sheet_view.showGridLines = False

    ws.merge_cells("A1:G1")
    cell = ws.cell(row=1, column=1, value="MaiML要素 ↔ DBカラム マッピング表（最終更新: 2026-03-17）")
    cell.fill = make_fill(C_HEADER_COMMON)
    cell.font = FONT_WHITE_BOLD
    cell.alignment = ALIGN_CENTER

    headers = ["層", "MaiML要素 / 取得元", "DBテーブル", "DBカラム", "型", "備考", "更新"]
    apply_sub_header(ws, 2, range(1, 8), headers)

    rows = [
        # 共通
        ("common",   "—",                               "/maiml/document/name",              "maiml_asset",                  "doc_name",                "TEXT",          "",               ""),
        ("common",   "—",                               "公開時パラメータ",                   "maiml_asset",                  "file_uri",                "TEXT",          "NOT NULL",       ""),
        ("common",   "—",                               "算出値（retention設定）",             "maiml_asset",                  "retention_until",         "TIMESTAMPTZ",   "NOT NULL",       ""),
        # data層 instance
        ("data",     "data",                            "XML パス",                           "maiml_instance",               "instance_type",           "TEXT",          "'result'/'material'/'condition'", ""),
        ("data",     "data",                            "instance/@id",                       "maiml_instance",               "instance_key",            "TEXT",          "NOT NULL",       ""),
        ("data",     "data ★新規",                     "data/results/@id",                   "maiml_instance",               "results_id",              "TEXT",          "eventLog層結合キー", "★2026-03-17"),
        ("data",     "data",                            "instance/@ref",                      "maiml_instance",               "template_ref",            "TEXT",          "",               ""),
        ("data",     "data",                            "instance/uuid",                      "maiml_instance",               "instance_uuid",           "TEXT",          "",               ""),
        ("data",     "data",                            "instance/name",                      "maiml_instance",               "instance_name",           "TEXT",          "",               ""),
        # data層 element
        ("data",     "data",                            "A列: MaiML file lineNo",             "maiml_element",                "maiml_line_no",           "INT",           "",               ""),
        ("data",     "data",                            "B列: hierarchy",                     "maiml_element",                "hierarchy",               "TEXT",          "1, 1-2, 1-2-3", ""),
        ("data",     "data",                            "C列: element",                       "maiml_element",                "element_type",            "TEXT",          "タグ種別",        ""),
        ("data",     "data",                            "D列: description",                   "maiml_element",                "description",             "TEXT",          "",               ""),
        ("data",     "data",                            "E列: element data",                  "maiml_element",                "element_data",            "TEXT",          "",               ""),
        ("data",     "data",                            "F列: @xsi:type",                     "maiml_element",                "xsi_type",                "TEXT",          "",               ""),
        ("data",     "data",                            "G列: @key",                          "maiml_element",                "key",                     "TEXT",          "",               ""),
        ("data",     "data",                            "H列: @formatString",                 "maiml_element",                "format_string",           "TEXT",          "",               ""),
        ("data",     "data",                            "I列: @units",                        "maiml_element",                "units",                   "TEXT",          "",               ""),
        ("data",     "data",                            "J列: @scaleFactor",                  "maiml_element",                "scale_factor",            "DOUBLE",        "",               ""),
        ("data",     "data",                            "K列: @axis",                         "maiml_element",                "axis",                    "TEXT",          "",               ""),
        ("data",     "data",                            "L列: @size",                         "maiml_element",                "size_value",              "INT",           "",               ""),
        ("data",     "data",                            "M列: @id",                           "maiml_element",                "element_id_attr",         "TEXT",          "",               ""),
        ("data",     "data",                            "N列: @ref",                          "maiml_element",                "element_ref",             "TEXT",          "",               ""),
        ("data",     "data",                            "O列: value（単一）",                 "maiml_element_value",          "value",                   "TEXT",          "value_idx=0",   ""),
        ("data",     "data",                            "O列: value（スペース区切り複数）",    "maiml_element_value",          "value_array",             "TEXT[]",        "",               ""),
        # eventLog層（新規）
        ("eventlog", "eventLog ★新規",                 "event/@id",                          "maiml_event",                  "event_key",               "TEXT",          "",               "★2026-03-17"),
        ("eventlog", "eventLog ★新規",                 "event/resultsRef/@ref",               "maiml_event",                  "results_ref",             "TEXT",          "★data層との結合キー", "★2026-03-17"),
        ("eventlog", "eventLog ★新規",                 "event/@ref",                         "maiml_event",                  "instruction_ref",         "TEXT",          "",               "★2026-03-17"),
        ("eventlog", "eventLog ★新規",                 "event/uuid",                         "maiml_event",                  "event_uuid",              "TEXT",          "",               "★2026-03-17"),
        ("eventlog", "eventLog ★新規",                 "event/name",                         "maiml_event",                  "event_name",              "TEXT",          "",               "★2026-03-17"),
        ("eventlog", "eventLog ★新規",                 "event/property/@key",                "maiml_event_element",          "key",                     "TEXT",          "lifecycle:transition / time:timestamp / concept:instance 等", "★2026-03-17"),
        ("eventlog", "eventLog ★新規",                 "event/property/description",         "maiml_event_element",          "description",             "TEXT",          "",               "★2026-03-17"),
        ("eventlog", "eventLog ★新規",                 "event/property/value（単一）",        "maiml_event_element_value",    "value",                   "TEXT",          "value_idx=0",   "★2026-03-17"),
        ("eventlog", "eventLog ★新規",                 "event/property/value（複数）",        "maiml_event_element_value",    "value_array",             "TEXT[]",        "",               "★2026-03-17"),
    ]

    layer_color = {
        "common":   C_HEADER_COMMON,
        "data":     C_HEADER_DATA,
        "protocol": C_HEADER_PROTOCOL,
        "eventlog": C_HEADER_EVENTLOG,
    }

    r = 3
    for layer, layer_name, source, table, column, dtype, note, updated in rows:
        is_new = "★新規" in updated or "★新規" in layer_name
        fill = make_fill(C_NEW_COL) if is_new else make_fill(C_ROW_ODD if r % 2 == 1 else C_ROW_EVEN)
        for c, val in [(1, layer_name), (2, source), (3, table), (4, column), (5, dtype), (6, note), (7, updated)]:
            cell = ws.cell(row=r, column=c, value=val)
            cell.fill      = fill
            cell.alignment = ALIGN_LEFT
            cell.border    = BORDER_THIN
            if c == 1:
                cell.fill = make_fill(layer_color[layer])
                cell.font = FONT_WHITE_BOLD
                cell.alignment = ALIGN_CENTER
            elif c in (3, 4):
                cell.font = FONT_CODE
            elif c == 7 and updated:
                cell.font = Font(name="Meiryo UI", size=10, color="C00000", bold=True)
            else:
                cell.font = FONT_NORMAL
        r += 1

    set_col_widths(ws, [
        (1, 14), (2, 36), (3, 30), (4, 28), (5, 16), (6, 48), (7, 14)
    ])
    freeze(ws, "B3")


# ============================================================
# メイン
# ============================================================

def main():
    output_path = os.path.join(
        os.path.dirname(__file__),
        "maiml2Excel_DB設計.xlsx"
    )

    wb = openpyxl.Workbook()

    # シート1: テーブル一覧
    ws1 = wb.active
    build_table_list(ws1)

    # data層
    build_asset_sheet(wb.create_sheet())
    build_instance_sheet(wb.create_sheet())
    build_element_sheet(wb.create_sheet())
    build_element_value_sheet(wb.create_sheet())
    build_insertion_sheet(wb.create_sheet())

    # protocol層
    build_template_sheet(wb.create_sheet())
    build_template_element_sheet(wb.create_sheet())
    build_template_element_value_sheet(wb.create_sheet())
    build_template_insertion_sheet(wb.create_sheet())

    # eventLog層（新規）
    build_event_sheet(wb.create_sheet())
    build_event_element_sheet(wb.create_sheet())
    build_event_element_value_sheet(wb.create_sheet())

    # 展開例（XRF.maiml）
    build_sample_sheet(wb.create_sheet())

    # マッピング表
    build_mapping_sheet(wb.create_sheet())

    wb.save(output_path)
    print(f"✓ Excel を出力しました: {output_path}")
    print(f"  シート数: {len(wb.sheetnames)}")
    for i, name in enumerate(wb.sheetnames, 1):
        print(f"    {i:2d}. {name}")


if __name__ == "__main__":
    main()
