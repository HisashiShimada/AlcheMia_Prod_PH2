#!/usr/bin/env bash
# =============================================================================
# check-migration-status.sh — DBマイグレーション適用状況確認コマンド生成スクリプト
#
# 使い方:
#   bash docs/deploy-guide/saas-production/check-migration-status.sh \
#     --release-tag release_YYYYMMDD_vXX.XX.XX
#
# 処理内容:
#   1. 今回リリースに含まれる migrations/*.sql を差分から自動検出
#   2. 各SQLファイルを解析して変更種別・テーブル名・カラム名を自動抽出
#   3. 踏み台サーバで実行する適用状況確認コマンドを標準出力に表示
#
# コミット情報の取得元:
#   docs/deliverables/<リリースタグ>/release_info.md
#   （init-release-dir.sh で作成されたファイル）
#
# 実行環境: WSL（ローカル開発PC）
# =============================================================================
set -euo pipefail

export LANG=ja_JP.UTF-8
export LC_ALL=ja_JP.UTF-8

# ---------------------------------------------------------------------------
# スクリプトのルートディレクトリ特定
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# ---------------------------------------------------------------------------
# 色定義
# ---------------------------------------------------------------------------
COLOR_RESET="\033[0m"
COLOR_CYAN="\033[0;36m"
COLOR_GREEN="\033[0;32m"
COLOR_YELLOW="\033[0;33m"
COLOR_BOLD="\033[1m"

print_info() { echo -e "${COLOR_CYAN}$1${COLOR_RESET}"; }
print_ok()   { echo -e "${COLOR_GREEN}$1${COLOR_RESET}"; }
print_warn() { echo -e "${COLOR_YELLOW}$1${COLOR_RESET}"; }
print_err()  { echo -e "\033[0;31m$1\033[0m" >&2; }
print_bold() { echo -e "${COLOR_BOLD}$1${COLOR_RESET}"; }

# ---------------------------------------------------------------------------
# 使用方法
# ---------------------------------------------------------------------------
usage() {
  cat <<EOF
使用方法:
  $0 --release-tag <タグ名>

オプション:
  --release-tag <TAG>   リリースタグ名（必須）
                        docs/deliverables/<TAG>/release_info.md から
                        コミット情報を取得します
  -h, --help            このヘルプを表示

例:
  $0 --release-tag release_20260910_v00.01.02
EOF
  exit 0
}

# ---------------------------------------------------------------------------
# 引数パース
# ---------------------------------------------------------------------------
RELEASE_TAG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release-tag) RELEASE_TAG="$2"; shift 2 ;;
    -h|--help)     usage ;;
    *) print_err "[エラー] 不明なオプション: $1"; echo ""; usage ;;
  esac
done

if [[ -z "$RELEASE_TAG" ]]; then
  print_err "[エラー] --release-tag は必須です。"
  echo ""
  usage
fi

# ---------------------------------------------------------------------------
# release_info.md からコミットハッシュを取得
# ---------------------------------------------------------------------------
RELEASE_INFO_FILE="${REPO_ROOT}/docs/deliverables/${RELEASE_TAG}/release_info.md"

if [[ ! -f "$RELEASE_INFO_FILE" ]]; then
  print_err "[エラー] release_info.md が見つかりません: ${RELEASE_INFO_FILE}"
  print_err "         先に init-release-dir.sh を実行してリリースディレクトリを作成してください。"
  exit 1
fi

TO_COMMIT="$(grep '今回リリースコミット' "$RELEASE_INFO_FILE" | grep -oE '[0-9a-f]{7,40}' || true)"
FROM_COMMIT="$(grep '前回リリースコミット' "$RELEASE_INFO_FILE" | grep -oE '[0-9a-f]{7,40}' || true)"

if [[ -z "$TO_COMMIT" ]]; then
  print_err "[エラー] release_info.md から今回リリースコミットを取得できませんでした。"
  print_err "         ファイルを確認してください: ${RELEASE_INFO_FILE}"
  exit 1
fi

if [[ -z "$FROM_COMMIT" ]]; then
  print_err "[エラー] release_info.md から前回リリースコミットを取得できませんでした。"
  print_err "         ファイルを確認してください: ${RELEASE_INFO_FILE}"
  exit 1
fi

# ---------------------------------------------------------------------------
# 今回リリースに含まれる migrations/*.sql を差分から抽出
# ---------------------------------------------------------------------------
MIGRATION_FILES=()

while IFS=$'\t' read -r status old_path new_path; do
  [[ -z "$status" ]] && continue
  case "${status:0:1}" in
    A|M)
      if [[ "$old_path" == backend/migrations/*.sql ]]; then
        MIGRATION_FILES+=("$old_path")
      fi
      ;;
    R)
      if [[ "${new_path:-}" == backend/migrations/*.sql ]]; then
        MIGRATION_FILES+=("$new_path")
      fi
      ;;
  esac
done < <(git -C "$REPO_ROOT" -c core.quotepath=false diff --name-status "$FROM_COMMIT" "$TO_COMMIT" 2>&1)

# ---------------------------------------------------------------------------
# ヘッダー表示
# ---------------------------------------------------------------------------
echo ""
print_bold "============================================================"
print_bold " DBマイグレーション適用状況確認コマンド生成"
print_bold "============================================================"
print_info "  リリースタグ          : ${RELEASE_TAG}"
print_info "  FROM_COMMIT (前回)    : ${FROM_COMMIT}"
print_info "  TO_COMMIT   (今回)    : ${TO_COMMIT}"
print_bold "============================================================"
echo ""

if [[ ${#MIGRATION_FILES[@]} -eq 0 ]]; then
  print_ok "✅ 今回リリースにマイグレーションファイルはありません。STEP 6はスキップしてください。"
  echo ""
  exit 0
fi

print_info "今回リリースに含まれるマイグレーションファイル: ${#MIGRATION_FILES[@]} 件"
echo ""

# ---------------------------------------------------------------------------
# SQLファイル解析関数
# コメント除去 + 改行を空白に変換して1行化することで複数行にまたがるSQLに対応
# ---------------------------------------------------------------------------

# コメント行を除去して1行化するヘルパー
normalize_sql() {
  local sql_content="$1"
  echo "$sql_content" \
    | grep -iv '^[[:space:]]*--' \
    | tr '\n' ' ' \
    | sed 's/[[:space:]]\+/ /g'
}

# テーブル名・カラム名のクリーンアップ（ダブルクォート・public.プレフィックス・記号除去）
clean_name() {
  echo "$1" | tr -d '"' | sed 's/^public\.//' | sed 's/[^a-zA-Z0-9_]//g'
}

# ALTER TABLE <tbl> ... ADD COLUMN [IF NOT EXISTS] <col> からテーブル名・カラム名を抽出
extract_add_columns() {
  local normalized
  normalized="$(normalize_sql "$1")"
  # 1行化されたSQLから ALTER TABLE <tbl> ... ADD COLUMN <col> を perl でパース
  # カンマ区切りの複数カラム追加・複数行にまたがるケースに対応
  echo "$normalized" | perl -nle '
    while (/ALTER\s+TABLE\s+(\S+)\s+((?:(?:ADD|DROP|ALTER|RENAME)\s+COLUMN[^;]+))/ig) {
      my ($tbl, $rest) = ($1, $2);
      $tbl =~ s/"//g; $tbl =~ s/^public\.//; $tbl =~ s/[^a-zA-Z0-9_]//g;
      while ($rest =~ /ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/ig) {
        print "$tbl\t$1";
      }
    }
  ' || true
}

# ALTER TABLE <tbl> RENAME COLUMN <old> TO <new> からテーブル名・新カラム名を抽出
extract_rename_columns() {
  local normalized
  normalized="$(normalize_sql "$1")"
  echo "$normalized" | grep -ioP 'ALTER\s+TABLE\s+\S+\s+RENAME\s+COLUMN\s+\S+\s+TO\s+\S+' | \
  while IFS= read -r stmt; do
    local tbl new_col
    tbl="$(echo "$stmt" | grep -ioP 'ALTER\s+TABLE\s+\K\S+' | head -1)"
    new_col="$(echo "$stmt" | grep -ioP 'RENAME\s+COLUMN\s+\S+\s+TO\s+\K\S+' | head -1)"
    tbl="$(clean_name "$tbl")"
    new_col="$(clean_name "$new_col")"
    [[ -n "$tbl" && -n "$new_col" ]] && printf '%s\t%s\n' "$tbl" "$new_col"
  done || true
}

# CREATE TABLE [IF NOT EXISTS] <tbl> からテーブル名を抽出
extract_create_tables() {
  local normalized
  normalized="$(normalize_sql "$1")"
  echo "$normalized" | grep -ioP 'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?\K\S+' | \
  while IFS= read -r tbl; do
    tbl="$(clean_name "$tbl")"
    [[ -n "$tbl" ]] && echo "$tbl"
  done || true
}

# ALTER TABLE <tbl> DROP COLUMN [IF EXISTS] <col> からテーブル名・カラム名を抽出
extract_drop_columns() {
  local normalized
  normalized="$(normalize_sql "$1")"
  echo "$normalized" | grep -ioP 'ALTER\s+TABLE\s+\S+\s+DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?\S+' | \
  while IFS= read -r stmt; do
    local tbl col
    tbl="$(echo "$stmt" | grep -ioP 'ALTER\s+TABLE\s+\K\S+' | head -1)"
    col="$(echo "$stmt" | grep -ioP 'DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?\K\S+' | head -1)"
    tbl="$(clean_name "$tbl")"
    col="$(clean_name "$col")"
    [[ -n "$tbl" && -n "$col" ]] && printf '%s\t%s\n' "$tbl" "$col"
  done || true
}

# DROP TABLE [IF EXISTS] <tbl> からテーブル名を抽出
extract_drop_tables() {
  local normalized
  normalized="$(normalize_sql "$1")"
  echo "$normalized" | grep -ioP 'DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?\K\S+' | \
  while IFS= read -r tbl; do
    tbl="$(clean_name "$tbl")"
    [[ -n "$tbl" ]] && echo "$tbl"
  done || true
}

# ---------------------------------------------------------------------------
# psql コマンドのテンプレート出力関数
# ---------------------------------------------------------------------------
print_psql_column_check() {
  local table="$1" column="$2"
  cat <<CMD
  PGPASSWORD=<DBパスワード> psql \\
    -h \$AURORA_ENDPOINT -U maiml_user -d maiml_db -p 5432 \\
    --set=sslmode=require \\
    -c "SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = '${table}'
            AND column_name = '${column}'
        ) AS already_applied;"
CMD
}

print_psql_table_check() {
  local table="$1"
  cat <<CMD
  PGPASSWORD=<DBパスワード> psql \\
    -h \$AURORA_ENDPOINT -U maiml_user -d maiml_db -p 5432 \\
    --set=sslmode=require \\
    -c "SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = '${table}'
        ) AS already_applied;"
CMD
}



# ---------------------------------------------------------------------------
# 各マイグレーションファイルを解析して確認コマンドを生成
# ---------------------------------------------------------------------------
FOUND_CHECKS=0

for rel_path in "${MIGRATION_FILES[@]}"; do
  sql_file="${REPO_ROOT}/${rel_path}"
  filename="$(basename "$rel_path")"

  if [[ ! -f "$sql_file" ]]; then
    print_warn "  ⚠️  ファイルが見つかりません（削除済み？）: ${rel_path}"
    continue
  fi

  sql_content="$(cat "$sql_file")"

  # 変更種別フラグ
  has_add_col=false
  has_rename_col=false
  has_create_tbl=false
  has_drop_col=false
  has_drop_tbl=false

  normalized_sql="$(normalize_sql "$sql_content")"
  echo "$normalized_sql" | grep -iqP 'ALTER\s+TABLE\s+\S+\s+ADD\s+COLUMN'    && has_add_col=true    || true
  echo "$normalized_sql" | grep -iqP 'ALTER\s+TABLE\s+\S+\s+RENAME\s+COLUMN'  && has_rename_col=true || true
  echo "$normalized_sql" | grep -iqP 'CREATE\s+TABLE'                              && has_create_tbl=true || true
  echo "$normalized_sql" | grep -iqP 'ALTER\s+TABLE\s+\S+\s+DROP\s+COLUMN'    && has_drop_col=true   || true
  echo "$normalized_sql" | grep -iqP 'DROP\s+TABLE'                                && has_drop_tbl=true   || true

  print_bold "------------------------------------------------------------"
  print_info " 📄 ${filename}"
  print_bold "------------------------------------------------------------"

  # --- ADD COLUMN ---
  if $has_add_col; then
    while IFS=$'\t' read -r tbl col; do
      [[ -z "$tbl" || -z "$col" ]] && continue
      echo ""
      print_info "  【カラム追加】${tbl}.${col}"
      print_warn "  ▼ 踏み台サーバで実行 ▼"
      echo ""
      print_psql_column_check "$tbl" "$col"
      print_ok "  → false: 未適用（実行が必要）  true: 適用済み（スキップ）"
      FOUND_CHECKS=$((FOUND_CHECKS + 1))
    done < <(extract_add_columns "$sql_content")
  fi

  # --- RENAME COLUMN ---
  if $has_rename_col; then
    while IFS=$'\t' read -r tbl new_col; do
      [[ -z "$tbl" || -z "$new_col" ]] && continue
      echo ""
      print_info "  【カラムリネーム】${tbl} → リネーム後カラム: ${new_col}"
      print_warn "  ▼ 踏み台サーバで実行 ▼"
      echo ""
      print_psql_column_check "$tbl" "$new_col"
      print_ok "  → false: 未適用（実行が必要）  true: 適用済み（スキップ）"
      FOUND_CHECKS=$((FOUND_CHECKS + 1))
    done < <(extract_rename_columns "$sql_content")
  fi

  # --- CREATE TABLE ---
  if $has_create_tbl; then
    while IFS= read -r tbl; do
      [[ -z "$tbl" ]] && continue
      echo ""
      print_info "  【テーブル作成】${tbl}"
      print_warn "  ▼ 踏み台サーバで実行 ▼"
      echo ""
      print_psql_table_check "$tbl"
      print_ok "  → false: 未適用（実行が必要）  true: 適用済み（スキップ）"
      FOUND_CHECKS=$((FOUND_CHECKS + 1))
    done < <(extract_create_tables "$sql_content")
  fi

  # --- DROP COLUMN ---
  if $has_drop_col; then
    while IFS=$'\t' read -r tbl col; do
      [[ -z "$tbl" || -z "$col" ]] && continue
      echo ""
      print_info "  【カラム削除】${tbl}.${col}"
      print_warn "  ▼ 踏み台サーバで実行 ▼"
      echo ""
      print_psql_column_check "$tbl" "$col"
      print_ok "  → false: 適用済み（スキップ）  true: 未適用（実行が必要）"
      FOUND_CHECKS=$((FOUND_CHECKS + 1))
    done < <(extract_drop_columns "$sql_content")
  fi

  # --- DROP TABLE ---
  if $has_drop_tbl; then
    while IFS= read -r tbl; do
      [[ -z "$tbl" ]] && continue
      echo ""
      print_info "  【テーブル削除】${tbl}"
      print_warn "  ▼ 踏み台サーバで実行 ▼"
      echo ""
      print_psql_table_check "$tbl"
      print_ok "  → false: 適用済み（スキップ）  true: 未適用（実行が必要）"
      FOUND_CHECKS=$((FOUND_CHECKS + 1))
    done < <(extract_drop_tables "$sql_content")
  fi

  # 解析できなかった場合（UPDATEのみ等）
  if ! $has_add_col && ! $has_rename_col && ! $has_create_tbl && ! $has_drop_col && ! $has_drop_tbl; then
    echo ""
    print_warn "  ⚠️  自動解析できません。ファイルを手動で確認してください:"
    print_warn "     cat ${REPO_ROOT}/${rel_path}"
  fi

  echo ""
done

# ---------------------------------------------------------------------------
# フッター
# ---------------------------------------------------------------------------
print_bold "============================================================"
if [[ $FOUND_CHECKS -gt 0 ]]; then
  print_info " 合計 ${FOUND_CHECKS} 件の確認コマンドを生成しました。"
  echo ""
  print_warn " ⚠️  手順:"
  print_warn "   1. 踏み台サーバにSSH接続して AURORA_ENDPOINT を取得（STEP 6-2）"
  print_warn "   2. 上記コマンドを実行して適用状況を確認"
  print_warn "   3. false（未適用）のファイルのみ実行（二重実行禁止）"
else
  print_warn " 確認コマンドを自動生成できませんでした。各ファイルを手動で確認してください。"
fi
print_bold "============================================================"
echo ""

