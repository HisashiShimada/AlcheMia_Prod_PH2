#!/usr/bin/env bash
# =============================================================================
# check-env-diff.sh — デプロイ前 環境変数差分チェックスクリプト
#
# 使い方:
#   bash scripts/check-env-diff.sh --release-tag <リリースタグ名>
#   bash scripts/check-env-diff.sh --release-tag <リリースタグ名> --show-secrets
#
# コミット情報の取得元:
#   docs/deliverables/<リリースタグ名>/release_info.md
#   （init-release-dir.sh で作成されたファイル）
#
# 出力:
#   - ターミナル標準出力
#   - docs/deliverables/<リリースタグ名>/env_diff_YYYYMMDD_HHMMSS.md（Markdownレポート）
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# 引数解析
# ---------------------------------------------------------------------------
RELEASE_TAG=""
SHOW_SECRETS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release-tag)  RELEASE_TAG="$2"; shift 2 ;;
    --show-secrets) SHOW_SECRETS=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$RELEASE_TAG" ]]; then
  echo "Usage: $0 --release-tag <リリースタグ名> [--show-secrets]"
  exit 1
fi

# ---------------------------------------------------------------------------
# release_info.md からコミットハッシュを取得
# ---------------------------------------------------------------------------
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RELEASE_INFO_FILE="$REPO_ROOT/docs/deliverables/${RELEASE_TAG}/release_info.md"

if [[ ! -f "$RELEASE_INFO_FILE" ]]; then
  echo "エラー: release_info.md が見つかりません: ${RELEASE_INFO_FILE}"
  echo "init-release-dir.sh を先に実行してリリースディレクトリを作成してください。"
  exit 1
fi

# release_info.md から FROM/TO コミットを抽出
TO_COMMIT="$(grep '今回リリースコミット' "$RELEASE_INFO_FILE" | grep -oE '[0-9a-f]{7,40}' || true)"
FROM_COMMIT="$(grep '前回リリースコミット' "$RELEASE_INFO_FILE" | grep -oE '[0-9a-f]{7,40}' || true)"

if [[ -z "$TO_COMMIT" ]]; then
  echo "エラー: release_info.md から今回リリースコミットを取得できませんでした。"
  echo "ファイルを確認してください: ${RELEASE_INFO_FILE}"
  exit 1
fi

if [[ -z "$FROM_COMMIT" ]]; then
  echo "エラー: release_info.md から前回リリースコミットを取得できませんでした。"
  echo "ファイルを確認してください: ${RELEASE_INFO_FILE}"
  exit 1
fi

# ---------------------------------------------------------------------------
# 設定
# ---------------------------------------------------------------------------
DELIVERABLES_DIR="$REPO_ROOT/docs/deliverables"
RELEASE_DIR="$DELIVERABLES_DIR/${RELEASE_TAG}"
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
REPORT_FILE="$RELEASE_DIR/env_diff_${TIMESTAMP}.md"

# 対象ファイルパターン
ENV_PATTERNS=(
  '.env'
  '.env.example'
  '.env.prod.aws.example'
  '.env.prod.onprem.example'
  '.env.deploy'
  'docker-compose.yml'
  'docker-compose.prod.yml'
  'docker-compose.redis.yml'
  'docker-compose.ollama.yml'
)
ECS_TASK_DEF_PATTERN='aws/ecs-task-definition-*.json'

# マスク対象キーワード（--show-secrets がない場合に値を隠す）
SECRET_KEYWORDS='PASSWORD|SECRET|KEY|TOKEN|CREDENTIAL|CERT|PRIVATE|DSN|AUTH'

# ---------------------------------------------------------------------------
# ユーティリティ関数
# ---------------------------------------------------------------------------
mask_value() {
  local key="$1"
  local val="$2"
  if [[ "$SHOW_SECRETS" == "false" ]] && echo "$key" | grep -qiE "$SECRET_KEYWORDS"; then
    echo "***masked***"
  else
    echo "$val"
  fi
}

# .env 形式ファイルから KEY=VALUE を抽出（コメント行・空行除外）
extract_env_vars() {
  local content="$1"
  echo "$content" | grep -E '^[A-Za-z_][A-Za-z0-9_]*=' | grep -v '^#' || true
}

# docker-compose.yml の environment セクションから KEY=VALUE を抽出
extract_compose_vars() {
  local content="$1"
  echo "$content" | grep -E '^\s+(- )?[A-Za-z_][A-Za-z0-9_]*[=:]' \
    | sed 's/^\s*-\s*//' \
    | sed 's/: /=/' \
    | grep -E '^[A-Za-z_][A-Za-z0-9_]*=' || true
}

# ---------------------------------------------------------------------------
# ターミナルカラー
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ---------------------------------------------------------------------------
# レポートバッファ（Markdown）
# ---------------------------------------------------------------------------
REPORT_LINES=()

report() {
  REPORT_LINES+=("$1")
}

# ---------------------------------------------------------------------------
# メイン処理
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}============================================================${RESET}"
echo -e "${BOLD}  環境変数差分チェック${RESET}"
echo -e "  RELEASE TAG: ${CYAN}${RELEASE_TAG}${RESET}"
echo -e "  FROM: ${CYAN}${FROM_COMMIT}${RESET}  →  TO: ${CYAN}${TO_COMMIT}${RESET}"
echo -e "${BOLD}============================================================${RESET}"
echo ""

report "# 環境変数差分レポート"
report ""
report "- **実行日時**: $(date '+%Y-%m-%d %H:%M:%S')"
report "- **リリースタグ**: \`${RELEASE_TAG}\`"
report "- **FROM**: \`${FROM_COMMIT}\`"
report "- **TO**: \`${TO_COMMIT}\`"
report ""

# ---------------------------------------------------------------------------
# フェーズ1: .env系 / docker-compose*.yml の差分検出
# ---------------------------------------------------------------------------
echo -e "${BOLD}【フェーズ1】 .env系ファイルの変更${RESET}"
echo -e "────────────────────────────────────────────────"
report "## フェーズ1: .env系ファイルの変更"
report ""

ADDED_TOTAL=0
CHANGED_TOTAL=0
REMOVED_TOTAL=0

# フェーズ2 照合用: 変更された変数を一時ファイルで管理（サブシェル問題を回避）
CHANGED_VARS_FILE="$(mktemp)"
trap 'rm -f "$CHANGED_VARS_FILE"' EXIT

# git diff で変更されたファイルを取得
CHANGED_FILES="$(git -C "$REPO_ROOT" diff --name-only "${FROM_COMMIT}" "${TO_COMMIT}" 2>/dev/null || true)"

# 変更ファイルの中から対象パターンに一致するものを処理
for PATTERN in "${ENV_PATTERNS[@]}"; do
  MATCHED="$(echo "$CHANGED_FILES" | grep -F "$PATTERN" || true)"
  [[ -z "$MATCHED" ]] && continue

  # ヒアストリングで読み込み（サブシェルを回避）
  while IFS= read -r FILE; do
    [[ -z "$FILE" ]] && continue

    echo -e "\n${CYAN}📄 ${FILE}${RESET}"
    report "### \`${FILE}\`"
    report ""
    report "| 種別 | 変数名 | 旧値 | 新値 |"
    report "|------|--------|------|------|"

    HAS_CHANGE=false

    FROM_CONTENT="$(git -C "$REPO_ROOT" show "${FROM_COMMIT}:${FILE}" 2>/dev/null || true)"
    TO_CONTENT="$(git -C "$REPO_ROOT" show "${TO_COMMIT}:${FILE}" 2>/dev/null || true)"

    if echo "$PATTERN" | grep -q 'docker-compose'; then
      FROM_VARS="$(extract_compose_vars "$FROM_CONTENT")"
      TO_VARS="$(extract_compose_vars "$TO_CONTENT")"
    else
      FROM_VARS="$(extract_env_vars "$FROM_CONTENT")"
      TO_VARS="$(extract_env_vars "$TO_CONTENT")"
    fi

    # TO に存在する変数 → ADDED / CHANGED
    while IFS= read -r LINE; do
      [[ -z "$LINE" ]] && continue
      KEY="${LINE%%=*}"
      NEW_VAL="${LINE#*=}"
      MASKED_NEW="$(mask_value "$KEY" "$NEW_VAL")"

      FROM_LINE="$(echo "$FROM_VARS" | grep "^${KEY}=" || true)"
      if [[ -z "$FROM_LINE" ]]; then
        echo -e "  ${GREEN}[ADDED]${RESET}   ${KEY}=${MASKED_NEW}"
        report "| ADDED | \`${KEY}\` | - | \`${MASKED_NEW}\` |"
        echo "ADDED|${KEY}" >> "$CHANGED_VARS_FILE"
        HAS_CHANGE=true
        ADDED_TOTAL=$((ADDED_TOTAL + 1))
      else
        OLD_VAL="${FROM_LINE#*=}"
        if [[ "$OLD_VAL" != "$NEW_VAL" ]]; then
          MASKED_OLD="$(mask_value "$KEY" "$OLD_VAL")"
          echo -e "  ${YELLOW}[CHANGED]${RESET} ${KEY}"
          echo -e "            旧: ${MASKED_OLD}  →  新: ${MASKED_NEW}"
          report "| CHANGED | \`${KEY}\` | \`${MASKED_OLD}\` | \`${MASKED_NEW}\` |"
          echo "CHANGED|${KEY}" >> "$CHANGED_VARS_FILE"
          HAS_CHANGE=true
          CHANGED_TOTAL=$((CHANGED_TOTAL + 1))
        fi
      fi
    done <<< "$TO_VARS"

    # FROM に存在して TO に存在しない変数 → REMOVED
    while IFS= read -r LINE; do
      [[ -z "$LINE" ]] && continue
      KEY="${LINE%%=*}"
      OLD_VAL="${LINE#*=}"
      MASKED_OLD="$(mask_value "$KEY" "$OLD_VAL")"

      TO_LINE="$(echo "$TO_VARS" | grep "^${KEY}=" || true)"
      if [[ -z "$TO_LINE" ]]; then
        echo -e "  ${RED}[REMOVED]${RESET} ${KEY}=${MASKED_OLD}"
        report "| REMOVED | \`${KEY}\` | \`${MASKED_OLD}\` | - |"
        echo "REMOVED|${KEY}" >> "$CHANGED_VARS_FILE"
        HAS_CHANGE=true
        REMOVED_TOTAL=$((REMOVED_TOTAL + 1))
      fi
    done <<< "$FROM_VARS"

    if [[ "$HAS_CHANGE" == "false" ]]; then
      echo -e "  (変更なし)"
      report "| - | (変更なし) | - | - |"
    fi

    report ""
  done <<< "$MATCHED"
done

# 変更ファイルがない場合
if [[ -z "$(echo "$CHANGED_FILES" | grep -E '\.env|docker-compose' || true)" ]]; then
  echo -e "  (対象ファイルに変更なし)"
  report "> 対象ファイルに変更なし"
  report ""
fi

# ---------------------------------------------------------------------------
# フェーズ2: ECS タスク定義との照合
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}【フェーズ2】 ECS タスク定義との照合${RESET}"
echo -e "────────────────────────────────────────────────"
report "## フェーズ2: ECS タスク定義との照合"
report ""

REFLECTED_TOTAL=0
REVIEW_TOTAL=0

# 一時ファイルから変更変数を読み込み（重複除去）
CHANGED_VARS_UNIQUE="$(sort -u "$CHANGED_VARS_FILE" || true)"

if [[ -z "$CHANGED_VARS_UNIQUE" ]]; then
  echo -e "  (フェーズ1で検出された変更なし — 照合スキップ)"
  report "> フェーズ1で検出された変更なし — 照合スキップ"
  report ""
else
  for ECS_FILE in "$REPO_ROOT"/${ECS_TASK_DEF_PATTERN}; do
    [[ -f "$ECS_FILE" ]] || continue
    REL_ECS="${ECS_FILE#$REPO_ROOT/}"

    echo -e "\n${CYAN}📄 ${REL_ECS}${RESET}"
    report "### \`${REL_ECS}\`"
    report ""
    report "| 変数名 | .env変更 | ECS状態 | ECS現在値 |"
    report "|--------|---------|---------|----------|"

    # ECS の TO コミット時点の内容（なければワーキングツリー）
    ECS_TO_CONTENT="$(git -C "$REPO_ROOT" show "${TO_COMMIT}:${REL_ECS}" 2>/dev/null || cat "$ECS_FILE" 2>/dev/null || true)"
    ECS_FROM_CONTENT="$(git -C "$REPO_ROOT" show "${FROM_COMMIT}:${REL_ECS}" 2>/dev/null || true)"

    ECS_TO_VARS=""
    ECS_FROM_VARS=""
    if command -v jq &>/dev/null; then
      ECS_TO_VARS="$(echo "$ECS_TO_CONTENT" | jq -r '.. | .environment? // empty | .[] | "\(.name)=\(.value // "")"' 2>/dev/null || true)"
      ECS_FROM_VARS="$(echo "$ECS_FROM_CONTENT" | jq -r '.. | .environment? // empty | .[] | "\(.name)=\(.value // "")"' 2>/dev/null || true)"
    fi

    while IFS= read -r ENTRY; do
      [[ -z "$ENTRY" ]] && continue
      DIFF_KIND="${ENTRY%%|*}"
      KEY="${ENTRY#*|}"

      ECS_TO_LINE="$(echo "$ECS_TO_VARS" | grep "^${KEY}=" || true)"
      ECS_FROM_LINE="$(echo "$ECS_FROM_VARS" | grep "^${KEY}=" || true)"
      ECS_TO_VAL="${ECS_TO_LINE#*=}"
      ECS_FROM_VAL="${ECS_FROM_LINE#*=}"
      MASKED_ECS_TO="$(mask_value "$KEY" "$ECS_TO_VAL")"

      case "$DIFF_KIND" in
        ADDED)
          if [[ -n "$ECS_TO_LINE" && -z "$ECS_FROM_LINE" ]]; then
            echo -e "  ${GREEN}✅${RESET} ${KEY} — [ADDED]  ECS にも追加済み（値: ${MASKED_ECS_TO}）"
            report "| \`${KEY}\` | ADDED | ✅ 追加済み | \`${MASKED_ECS_TO}\` |"
            REFLECTED_TOTAL=$((REFLECTED_TOTAL + 1))
          elif [[ -n "$ECS_TO_LINE" ]]; then
            echo -e "  ${GREEN}✅${RESET} ${KEY} — [ADDED]  ECS には既存（値: ${MASKED_ECS_TO}）"
            report "| \`${KEY}\` | ADDED | ✅ ECS 既存 | \`${MASKED_ECS_TO}\` |"
            REFLECTED_TOTAL=$((REFLECTED_TOTAL + 1))
          else
            echo -e "  ${YELLOW}⚠️ ${RESET} ${KEY} — [ADDED]  ECS 未追加（要確認）"
            report "| \`${KEY}\` | ADDED | ⚠️ 未追加（要確認） | - |"
            REVIEW_TOTAL=$((REVIEW_TOTAL + 1))
          fi
          ;;
        CHANGED)
          if [[ -n "$ECS_TO_LINE" && "$ECS_TO_VAL" != "$ECS_FROM_VAL" ]]; then
            echo -e "  ${GREEN}✅${RESET} ${KEY} — [CHANGED]  ECS も変更済み（値: ${MASKED_ECS_TO}）"
            report "| \`${KEY}\` | CHANGED | ✅ 変更済み | \`${MASKED_ECS_TO}\` |"
            REFLECTED_TOTAL=$((REFLECTED_TOTAL + 1))
          elif [[ -n "$ECS_TO_LINE" ]]; then
            echo -e "  ${YELLOW}⚠️ ${RESET} ${KEY} — [CHANGED]  ECS 未変更（現在値: ${MASKED_ECS_TO}）要確認"
            report "| \`${KEY}\` | CHANGED | ⚠️ 変更なし（要確認） | \`${MASKED_ECS_TO}\` |"
            REVIEW_TOTAL=$((REVIEW_TOTAL + 1))
          else
            echo -e "  ${YELLOW}⚠️ ${RESET} ${KEY} — [CHANGED]  ECS に該当なし（要確認）"
            report "| \`${KEY}\` | CHANGED | ⚠️ ECS に該当なし（要確認） | - |"
            REVIEW_TOTAL=$((REVIEW_TOTAL + 1))
          fi
          ;;
        REMOVED)
          if [[ -z "$ECS_TO_LINE" ]]; then
            echo -e "  ${GREEN}✅${RESET} ${KEY} — [REMOVED]  ECS からも削除済み"
            report "| \`${KEY}\` | REMOVED | ✅ 削除済み | - |"
            REFLECTED_TOTAL=$((REFLECTED_TOTAL + 1))
          else
            echo -e "  ${YELLOW}⚠️ ${RESET} ${KEY} — [REMOVED]  ECS に残存（要確認）"
            report "| \`${KEY}\` | REMOVED | ⚠️ ECS に残存（要確認） | \`${MASKED_ECS_TO}\` |"
            REVIEW_TOTAL=$((REVIEW_TOTAL + 1))
          fi
          ;;
      esac
    done <<< "$CHANGED_VARS_UNIQUE"

    report ""
  done
fi

# ---------------------------------------------------------------------------
# サマリー
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}============================================================${RESET}"
echo -e "${BOLD}  サマリー${RESET}"
echo -e "  .env系の変更: ${GREEN}追加 ${ADDED_TOTAL}件${RESET} / ${YELLOW}変更 ${CHANGED_TOTAL}件${RESET} / ${RED}削除 ${REMOVED_TOTAL}件${RESET}"
echo -e "  ECS照合結果:  ${GREEN}✅ 反映済み ${REFLECTED_TOTAL}件${RESET} / ${YELLOW}⚠️  要確認 ${REVIEW_TOTAL}件${RESET}"
echo -e "${BOLD}============================================================${RESET}"
echo ""

report "## サマリー"
report ""
report "| 区分 | 件数 |"
report "|------|------|"
report "| .env系 追加 | ${ADDED_TOTAL}件 |"
report "| .env系 変更 | ${CHANGED_TOTAL}件 |"
report "| .env系 削除 | ${REMOVED_TOTAL}件 |"
report "| ECS ✅ 反映済み | ${REFLECTED_TOTAL}件 |"
report "| ECS ⚠️ 要確認 | ${REVIEW_TOTAL}件 |"
report ""

# ---------------------------------------------------------------------------
# Markdown レポートをファイルに書き出し
# ---------------------------------------------------------------------------
mkdir -p "$RELEASE_DIR"
printf '%s\n' "${REPORT_LINES[@]}" > "$REPORT_FILE"

echo -e "📄 レポートを出力しました: ${CYAN}${REPORT_FILE}${RESET}"
echo ""
