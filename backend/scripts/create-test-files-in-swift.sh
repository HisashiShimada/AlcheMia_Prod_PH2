#!/bin/bash
# OpenStack Swift環境にテストファイルを作成するスクリプト（curl版）

# 環境変数
SWIFT_AUTH_URL="${SWIFT_AUTH_URL:-http://localhost:8080/auth/v1.0}"
SWIFT_USERNAME="${SWIFT_USERNAME:-test:tester}"
SWIFT_PASSWORD="${SWIFT_PASSWORD:-testing}"
SWIFT_CONTAINER="${SWIFT_CONTAINER:-mmdpf-files}"
SWIFT_STORAGE_URL_BASE="${SWIFT_STORAGE_URL_BASE:-http://localhost:8080/v1/AUTH_test}"
ORG_PREFIX="org_maiml_lab_001"

echo "=== Creating test files in Swift using curl ==="
echo "Auth URL: ${SWIFT_AUTH_URL}"
echo "Container: ${SWIFT_CONTAINER}"
echo "Organization: ${ORG_PREFIX}"
echo ""

# Swift認証を実行してトークンを取得
echo "Authenticating to Swift..."
AUTH_RESPONSE=$(curl -s -i -H "X-Auth-User: ${SWIFT_USERNAME}" -H "X-Auth-Key: ${SWIFT_PASSWORD}" "${SWIFT_AUTH_URL}")

# トークンとストレージURLを抽出
AUTH_TOKEN=$(echo "$AUTH_RESPONSE" | grep -i "X-Auth-Token:" | awk '{print $2}' | tr -d '\r')
STORAGE_URL=$(echo "$AUTH_RESPONSE" | grep -i "X-Storage-Url:" | awk '{print $2}' | tr -d '\r')

# ストレージURLが取得できない場合はデフォルトを使用
if [ -z "$STORAGE_URL" ]; then
    STORAGE_URL="${SWIFT_STORAGE_URL_BASE}"
fi

if [ -z "$AUTH_TOKEN" ]; then
    echo "Error: Failed to authenticate to Swift"
    echo "Response:"
    echo "$AUTH_RESPONSE"
    exit 1
fi

echo "✓ Authentication successful"
echo "  Token: ${AUTH_TOKEN:0:20}..."
echo "  Storage URL: ${STORAGE_URL}"
echo ""

# ファイルアップロード関数
upload_file() {
    local object_path="$1"
    local content="$2"
    local full_url="${STORAGE_URL}/${SWIFT_CONTAINER}/${object_path}"
    
    echo "$content" | curl -s -X PUT \
        -H "X-Auth-Token: ${AUTH_TOKEN}" \
        -H "Content-Type: application/octet-stream" \
        --data-binary @- \
        "${full_url}"
    
    if [ $? -eq 0 ]; then
        return 0
    else
        echo "    ✗ Failed to upload ${object_path}"
        return 1
    fi
}

# プロジェクトリスト（mockProjects.jsonから抽出）
declare -a projects=(
    "HighTempSuperconductor"
    "LithiumBatteryCathode"
    "PerovskiteSolarCell"
    "NanoparticleCatalyst"
    "GrapheneComposite"
    "RareEarthMagnet"
    "OrganicSolarCell"
    "FuelCellElectrolyte"
    "QuantumDotLED"
)

# 各プロジェクトフォルダにテストファイルを作成
for project in "${projects[@]}"; do
    echo "Processing project: ${project}"
    
    # 現在のMAIMLファイル
    CURRENT_FILE="${ORG_PREFIX}/projects/${project}/${project}.maiml"
    upload_file "${CURRENT_FILE}" "Sample MAIML content for ${project}"
    
    # アーカイブファイル（v1, v2）
    for version in 1 2; do
        ARCHIVE_FILE="${ORG_PREFIX}/projects/${project}/archive/${project}_v${version}.maiml"
        upload_file "${ARCHIVE_FILE}" "Archive MAIML content for ${project} version ${version}"
    done
    
    # README.txt
    README_FILE="${ORG_PREFIX}/projects/${project}/README.txt"
    README_CONTENT="Project: ${project}
Description: Test project for API development
Created: $(date '+%Y-%m-%d %H:%M:%S')"
    upload_file "${README_FILE}" "${README_CONTENT}"
    
    # データファイル（data.csv）
    DATA_FILE="${ORG_PREFIX}/projects/${project}/data.csv"
    DATA_CONTENT="timestamp,value1,value2
2024-01-01 10:00:00,1.23,4.56
2024-01-01 11:00:00,2.34,5.67
2024-01-01 12:00:00,3.45,6.78"
    upload_file "${DATA_FILE}" "${DATA_CONTENT}"
    
    # 結果ファイル（results.csv）
    RESULTS_FILE="${ORG_PREFIX}/projects/${project}/results.csv"
    RESULTS_CONTENT="sample_id,measurement,result
sample_001,temp,298.15
sample_001,pressure,101.325
sample_002,temp,305.45"
    upload_file "${RESULTS_FILE}" "${RESULTS_CONTENT}"
    
    echo "  ✓ Created 6 files for ${project}"
    echo ""
done

echo "=== Test files creation completed ==="
echo ""
echo "To verify, run:"
echo "  curl -H \"X-Auth-Token: ${AUTH_TOKEN}\" \"${STORAGE_URL}/${SWIFT_CONTAINER}?prefix=${ORG_PREFIX}/projects\""
