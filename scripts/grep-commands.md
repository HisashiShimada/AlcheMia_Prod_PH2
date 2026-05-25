# 英語メッセージ・ハードコード検出 grep コマンド一覧

実行場所: プロジェクトルート (`/home/mi_ito/mmdpf`)

---

## フロントエンド

### 1. message部品のハードコード（文字列リテラル直渡し）

```bash
# シングルクォート
grep -rn --include="*.tsx" --include="*.ts" -E "message\.(error|success|warning|info|loading)\s*\(\s*'" frontend/src/

# ダブルクォート
grep -rn --include="*.tsx" --include="*.ts" -E 'message\.(error|success|warning|info|loading)\s*\(\s*"' frontend/src/

# テンプレートリテラル（バッククォート）
grep -rn --include="*.tsx" --include="*.ts" -P "message\.(error|success|warning|info|loading)\s*\(\s*\`" frontend/src/
```

### 2. 英語メッセージに絞る（大文字始まりの英単語）

```bash
grep -rn --include="*.tsx" --include="*.ts" -E "message\.(error|success|warning|info)\s*\(\s*'[A-Z]" frontend/src/
grep -rn --include="*.tsx" --include="*.ts" -E 'message\.(error|success|warning|info)\s*\(\s*"[A-Z]' frontend/src/
```

### 3. Alert / Modal のハードコード

```bash
# Modal.error / Modal.confirm 等
grep -rn --include="*.tsx" -E "Modal\.(error|warning|confirm|info)\s*\(\s*\{" frontend/src/

# notification（Ant Design）
grep -rn --include="*.tsx" --include="*.ts" -E "notification\.(error|success|warning|info)\s*\(\s*\{" frontend/src/
```

### 4. throw new Error の英語メッセージ

```bash
grep -rn --include="*.tsx" --include="*.ts" -E "throw new \w*Error\s*\(\s*'[A-Z]" frontend/src/
grep -rn --include="*.tsx" --include="*.ts" -E 'throw new \w*Error\s*\(\s*"[A-Z]' frontend/src/
```

---

## バックエンド

### 5. message プロパティの英語メッセージ

```bash
grep -rn --include="*.ts" -E "message:\s*'[A-Z][^']*'" backend/src/
grep -rn --include="*.ts" -E 'message:\s*"[A-Z][^"]*"' backend/src/
```

### 6. throw new Error の英語メッセージ

```bash
grep -rn --include="*.ts" -E "throw new \w*Error\s*\(\s*'[A-Z]" backend/src/
grep -rn --include="*.ts" -E 'throw new \w*Error\s*\(\s*"[A-Z]' backend/src/
```

### 7. APIレスポンスの英語メッセージ

```bash
grep -rn --include="*.ts" -E "res\.(json|send)\s*\(" backend/src/ | grep -E "'[A-Z]|\"[A-Z]"
```

---

## まとめて実行（フロントエンド全検出）

```bash
# ハードコード全件（英語・日本語問わず）をファイルに出力
grep -rn --include="*.tsx" --include="*.ts" \
  -E "message\.(error|success|warning|info|loading)\s*\(\s*('|\"|` )" \
  frontend/src/ > /tmp/frontend-hardcode.txt 2>&1
cat /tmp/frontend-hardcode.txt | wc -l
cat /tmp/frontend-hardcode.txt
```

---

## 自動チェックスクリプト（推奨）

上記を網羅的に実行し `scripts/i18n-check-report.txt` に出力：

```bash
node scripts/check-i18n-keys.js
```
