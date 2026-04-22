#!/usr/bin/env bash
# init-release-dir.sh
# リリース作業用ディレクトリを docs/deliverables/ 配下に作成するスクリプト
#
# 使用例:
#   bash scripts/init-release-dir.sh \
#     --to-commit   a40d124e938672cdfb1360d7bcd4cd12fe17fdc3 \
#     --from-commit e19f5d46513141f186c46f61d1e0192d9444bfe2 \
#     --tag         release_20260422_v1.0.0

set -euo pipefail

# =============================
# 色定義
# =============================
COLOR_RESET="\033[0m"
COLOR_CYAN="\033[0;36m"
COLOR_GREEN="\033[0;32m"
COLOR_RED="\033[0;31m"

print_info() { echo -e "${COLOR_CYAN}$1${COLOR_RESET}"; }
print_ok()   { echo -e "${COLOR_GREEN}$1${COLOR_RESET}"; }
print_err()  { echo -e "${COLOR_RED}$1${COLOR_RESET}" >&2; }

# =============================
# 使用方法
# =============================
usage() {
    cat <<EOF
使用方法:
  $0 --to-commit <HASH> --from-commit <HASH> --tag <TAG>

オプション:
  --to-commit   <HASH>   今回リリースするコミットのハッシュ（必須）
  --from-commit <HASH>   前回リリースしたコミットのハッシュ（必須）
  --tag         <TAG>    リリースタグ名（必須）
  -h, --help             このヘルプを表示

例:
  $0 --to-commit   a40d124e938672cdfb1360d7bcd4cd12fe17fdc3 \\
     --from-commit e19f5d46513141f186c46f61d1e0192d9444bfe2 \\
     --tag         release_20260422_v1.0.0
EOF
    exit 0
}

# =============================
# 引数パース
# =============================
TO_COMMIT=""
FROM_COMMIT=""
RELEASE_TAG=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --to-commit)
            TO_COMMIT="${2:-}"
            shift 2
            ;;
        --from-commit)
            FROM_COMMIT="${2:-}"
            shift 2
            ;;
        --tag)
            RELEASE_TAG="${2:-}"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            print_err "不明なオプション: $1"
            usage
            ;;
    esac
done

# =============================
# バリデーション
# =============================
ERRORS=0

if [[ -z "$TO_COMMIT" ]]; then
    print_err "エラー: --to-commit は必須です"
    ERRORS=$((ERRORS + 1))
fi

if [[ -z "$FROM_COMMIT" ]]; then
    print_err "エラー: --from-commit は必須です"
    ERRORS=$((ERRORS + 1))
fi

if [[ -z "$RELEASE_TAG" ]]; then
    print_err "エラー: --tag は必須です"
    ERRORS=$((ERRORS + 1))
fi

if [[ $ERRORS -gt 0 ]]; then
    echo ""
    usage
fi

# =============================
# スクリプトのルートディレクトリ特定
# =============================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DELIVERABLES_DIR="${REPO_ROOT}/docs/deliverables"
RELEASE_DIR="${DELIVERABLES_DIR}/${RELEASE_TAG}"

# =============================
# メイン処理
# =============================
print_info "====================================================="
print_info " リリースディレクトリの初期化"
print_info "====================================================="
print_info "  リリースタグ      : ${RELEASE_TAG}"
print_info "  今回リリースコミット: ${TO_COMMIT}"
print_info "  前回リリースコミット: ${FROM_COMMIT}"
print_info "  出力先            : ${RELEASE_DIR}"
print_info "====================================================="
echo ""

# docs/deliverables/ の存在確認
if [[ ! -d "${DELIVERABLES_DIR}" ]]; then
    print_err "エラー: 出力先ディレクトリが存在しません: ${DELIVERABLES_DIR}"
    exit 1
fi

# 既存チェック
if [[ -d "${RELEASE_DIR}" ]]; then
    print_err "エラー: リリースディレクトリが既に存在します: ${RELEASE_DIR}"
    exit 1
fi

# ディレクトリ作成
mkdir -p "${RELEASE_DIR}"
print_ok "✓ ディレクトリを作成しました: ${RELEASE_DIR}"

# release_info.md の作成
CREATED_AT="$(date '+%Y-%m-%d %H:%M:%S')"
INFO_FILE="${RELEASE_DIR}/release_info.md"

cat > "${INFO_FILE}" <<EOF
# リリース情報

- **リリースタグ**: ${RELEASE_TAG}
- **今回リリースコミット（--to-commit）**: \`${TO_COMMIT}\`
- **前回リリースコミット（--from-commit）**: \`${FROM_COMMIT}\`
- **作成日時**: ${CREATED_AT}
EOF

print_ok "✓ リリース情報ファイルを作成しました: ${INFO_FILE}"

# checklist.md のコピー
CHECKLIST_SRC="${REPO_ROOT}/docs/deploy-guide/saas/staging-deploy-checklist.md"
CHECKLIST_DEST="${RELEASE_DIR}/checklist.md"

if [[ ! -f "${CHECKLIST_SRC}" ]]; then
    print_err "警告: チェックリストファイルが見つかりません: ${CHECKLIST_SRC}"
else
    cp "${CHECKLIST_SRC}" "${CHECKLIST_DEST}"
    print_ok "✓ チェックリストをコピーしました: ${CHECKLIST_DEST}"
fi

echo ""
print_ok "完了: リリースディレクトリの初期化が正常に終了しました。"
