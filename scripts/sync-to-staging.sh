#!/usr/bin/env bash
# sync-to-staging.sh
# 開発用リポジトリから検証環境用リポジトリへ差分ファイルを同期するスクリプト (Linux版)
#
# 使用例:
#   # ドライラン（差分確認のみ）
#   bash scripts/sync-to-staging.sh --from-commit abc1234 --to-commit def5678 --src-repo /home/user/mmdpf --dest-repo /home/user/staging/mmdpf --dry-run
#
#   # 実行
#   bash scripts/sync-to-staging.sh --from-commit abc1234 --to-commit def5678 --src-repo /home/user/mmdpf --dest-repo /home/user/staging/mmdpf

set -euo pipefail

# 日本語パスを正しく扱うためにUTF-8ロケールを設定
export LANG=ja_JP.UTF-8
export LC_ALL=ja_JP.UTF-8

# =============================
# 色定義
# =============================
COLOR_RESET="\033[0m"
COLOR_CYAN="\033[0;36m"
COLOR_GREEN="\033[0;32m"
COLOR_YELLOW="\033[0;33m"
COLOR_RED="\033[0;31m"

print_info() { echo -e "${COLOR_CYAN}$1${COLOR_RESET}"; }
print_ok()   { echo -e "${COLOR_GREEN}$1${COLOR_RESET}"; }
print_warn() { echo -e "${COLOR_YELLOW}$1${COLOR_RESET}"; }
print_err()  { echo -e "${COLOR_RED}$1${COLOR_RESET}" >&2; }

# =============================
# 使用方法
# =============================
usage() {
    cat <<EOF
使用方法:
  $0 --from-commit <コミット> --to-commit <コミット> --src-repo <パス> --dest-repo <パス> [--dry-run]

オプション:
  --from-commit <HASH>   前回デプロイ時のコミットハッシュ（必須）
  --to-commit   <HASH>   今回デプロイするコミットハッシュ（必須）
  --src-repo    <PATH>   開発用リポジトリのローカルフォルダパス（必須）
  --dest-repo   <PATH>   検証環境用リポジトリのローカルフォルダパス（必須）
  --dry-run              ファイル操作を行わず差分一覧のみ表示
  -h, --help             このヘルプを表示

例:
  # ドライラン
  $0 --from-commit abc1234 --to-commit def5678 \\
     --src-repo /home/user/mmdpf --dest-repo /home/user/staging/mmdpf --dry-run

  # 実行
  $0 --from-commit abc1234 --to-commit def5678 \\
     --src-repo /home/user/mmdpf --dest-repo /home/user/staging/mmdpf
EOF
    exit 0
}

# =============================
# 引数パース
# =============================
FROM_COMMIT=""
TO_COMMIT=""
SRC_REPO=""
DEST_REPO=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --from-commit)
            FROM_COMMIT="$2"
            shift 2
            ;;
        --to-commit)
            TO_COMMIT="$2"
            shift 2
            ;;
        --src-repo)
            SRC_REPO="$2"
            shift 2
            ;;
        --dest-repo)
            DEST_REPO="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            print_err "[エラー] 不明なオプション: $1"
            usage
            ;;
    esac
done

# =============================
# 必須パラメータチェック
# =============================
if [[ -z "$FROM_COMMIT" || -z "$TO_COMMIT" || -z "$SRC_REPO" || -z "$DEST_REPO" ]]; then
    print_err "[エラー] 必須パラメータが不足しています。"
    echo ""
    usage
fi

# =============================
# 前提チェック
# =============================
print_info "=== 検証環境同期スクリプト (Linux) ==="
if $DRY_RUN; then
    print_warn "[ドライランモード] ファイルの操作は行いません。"
fi
echo ""

# git コマンドの存在確認
if ! command -v git &>/dev/null; then
    print_err "[エラー] git コマンドが見つかりません。Git をインストールしてください。"
    exit 1
fi

# 開発用リポジトリの存在確認
if [[ ! -d "$SRC_REPO" ]]; then
    print_err "[エラー] 開発用リポジトリが見つかりません: $SRC_REPO"
    exit 1
fi

# 開発用リポジトリが git リポジトリかどうか確認
if ! git -C "$SRC_REPO" rev-parse --is-inside-work-tree &>/dev/null; then
    print_err "[エラー] 指定されたフォルダは git リポジトリではありません: $SRC_REPO"
    exit 1
fi

# コミットハッシュの存在確認
if ! git -C "$SRC_REPO" cat-file -e "${FROM_COMMIT}^{commit}" 2>/dev/null; then
    print_err "[エラー] FROM_COMMIT が存在しません: $FROM_COMMIT"
    exit 1
fi

if ! git -C "$SRC_REPO" cat-file -e "${TO_COMMIT}^{commit}" 2>/dev/null; then
    print_err "[エラー] TO_COMMIT が存在しません: $TO_COMMIT"
    exit 1
fi

# =============================
# 差分取得
# =============================
print_info "=== 差分ファイル一覧 ($FROM_COMMIT → $TO_COMMIT) ==="

# 差分ファイルをリストに格納
added=()
modified=()
deleted=()
rename_old=()
rename_new=()

while IFS=$'\t' read -r status old_path new_path; do
    [[ -z "$status" ]] && continue

    case "${status:0:1}" in
        A)
            added+=("$old_path")
            print_ok    "  [追加]    $old_path"
            ;;
        M)
            modified+=("$old_path")
            print_info  "  [更新]    $old_path"
            ;;
        D)
            deleted+=("$old_path")
            print_err   "  [削除]    $old_path"
            ;;
        R)
            # リネーム: R<類似度> 旧パス 新パス
            rename_old+=("$old_path")
            rename_new+=("$new_path")
            print_warn  "  [リネーム] $old_path → $new_path"
            ;;
        C)
            # コピー: 追加として扱う
            modified+=("$new_path")
            print_warn  "  [コピー→更新] $new_path"
            ;;
        *)
            print_warn  "  [その他($status)] $old_path"
            [[ -n "$old_path" ]] && modified+=("$old_path")
            ;;
    esac
done < <(git -C "$SRC_REPO" -c core.quotepath=false diff --name-status "$FROM_COMMIT" "$TO_COMMIT" 2>&1)

# 差分がない場合
if [[ ${#added[@]} -eq 0 && ${#modified[@]} -eq 0 && ${#deleted[@]} -eq 0 && ${#rename_old[@]} -eq 0 ]]; then
    print_warn "差分はありません。"
    exit 0
fi

echo ""
print_info "--- サマリー ---"
print_ok   "  追加:     ${#added[@]} 件"
print_info "  更新:     ${#modified[@]} 件"
print_err  "  削除:     ${#deleted[@]} 件"
print_warn "  リネーム: ${#rename_old[@]} 件"
echo ""

# ドライランの場合はここで終了
if $DRY_RUN; then
    print_warn "[ドライランモード] 上記の差分を適用します（実行時は --dry-run を外してください）"
    exit 0
fi

# =============================
# 検証環境用リポジトリへの反映
# =============================
print_info "=== 検証環境へ反映開始 ==="

# 検証環境用リポジトリが存在しない場合は作成
if [[ ! -d "$DEST_REPO" ]]; then
    print_warn "[情報] 検証環境用リポジトリが存在しないため作成します: $DEST_REPO"
    mkdir -p "$DEST_REPO"
fi

success_count=0
error_count=0

# =============================
# エラー時は exit しないよう一時的に解除
# =============================
set +e

# ---------- 追加ファイルのコピー ----------
for file in "${added[@]:-}"; do
    [[ -z "$file" ]] && continue

    src_path="$SRC_REPO/$file"
    dest_path="$DEST_REPO/$file"

    if [[ ! -f "$src_path" ]]; then
        print_err "  [エラー] コピー元が見つかりません: $src_path"
        ((error_count++)) || true
        continue
    fi

    dest_dir="$(dirname "$dest_path")"
    mkdir -p "$dest_dir"

    if cp "$src_path" "$dest_path"; then
        print_ok "  [追加完了] $file"
        ((success_count++)) || true
    else
        print_err "  [エラー] コピー失敗: $file"
        ((error_count++)) || true
    fi
done

# ---------- 更新ファイルのコピー ----------
for file in "${modified[@]:-}"; do
    [[ -z "$file" ]] && continue

    src_path="$SRC_REPO/$file"
    dest_path="$DEST_REPO/$file"

    if [[ ! -f "$src_path" ]]; then
        print_err "  [エラー] コピー元が見つかりません: $src_path"
        ((error_count++)) || true
        continue
    fi

    dest_dir="$(dirname "$dest_path")"
    mkdir -p "$dest_dir"

    if cp "$src_path" "$dest_path"; then
        print_ok "  [更新完了] $file"
        ((success_count++)) || true
    else
        print_err "  [エラー] コピー失敗: $file"
        ((error_count++)) || true
    fi
done

# ---------- リネームファイルの処理 ----------
for i in "${!rename_old[@]:-}"; do
    old_file="${rename_old[$i]}"
    new_file="${rename_new[$i]}"

    [[ -z "$old_file" ]] && continue

    src_new_path="$SRC_REPO/$new_file"
    dest_old_path="$DEST_REPO/$old_file"
    dest_new_path="$DEST_REPO/$new_file"

    # 旧ファイルを削除
    if [[ -f "$dest_old_path" ]]; then
        rm -f "$dest_old_path"
    fi

    # 新ファイルをコピー
    if [[ ! -f "$src_new_path" ]]; then
        print_err "  [エラー] コピー元が見つかりません: $src_new_path"
        ((error_count++)) || true
        continue
    fi

    dest_new_dir="$(dirname "$dest_new_path")"
    mkdir -p "$dest_new_dir"

    if cp "$src_new_path" "$dest_new_path"; then
        print_ok "  [リネーム完了] $old_file → $new_file"
        ((success_count++)) || true
    else
        print_err "  [エラー] リネーム後のコピー失敗: $new_file"
        ((error_count++)) || true
    fi
done

# ---------- 削除ファイルの処理 ----------
for file in "${deleted[@]:-}"; do
    [[ -z "$file" ]] && continue

    dest_path="$DEST_REPO/$file"

    if [[ ! -f "$dest_path" ]]; then
        print_warn "  [スキップ] 削除対象が存在しません（既に削除済み？）: $file"
        continue
    fi

    if rm -f "$dest_path"; then
        print_ok "  [削除完了] $file"
        ((success_count++)) || true
    else
        print_err "  [エラー] 削除失敗: $file"
        ((error_count++)) || true
    fi
done

# =============================
# 処理結果サマリー
# =============================
echo ""
print_info "=== 処理結果サマリー ==="
print_ok   "  成功: $success_count 件"
if [[ $error_count -gt 0 ]]; then
    print_err "  エラー: $error_count 件"
    print_err "上記エラーを確認し、手動で対処してください。"
    exit 1
else
    print_ok  "  エラー: 0 件"
    print_ok  "同期が正常に完了しました。"
    exit 0
fi
