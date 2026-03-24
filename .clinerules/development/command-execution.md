# コマンド実行規約

## 概要

このドキュメントは、Clineがexecute_commandツールでコマンドを実行する際のベストプラクティスを定義します。Pending問題や出力キャプチャ失敗を回避するための実践的なガイドラインです。

---

## 🚫 絶対禁止パターン（最重要）

### 複雑なコマンドは使用しない

コマンドが複雑になるほど実行結果の取得が不安定になり、タスクが進行不能になる。
以下のパターンは**絶対に使用しない**こと。

| 禁止パターン | 理由 | 代替手段 |
|------------|------|---------|
| `grep -r` / `grep -rl` / `grep -rn` | 複数ファイル検索は結果が不安定 | `search_files` ツール |
| `sed -i` + ワイルドカード | 複数ファイル置換は失敗しやすい | `replace_in_file` ツール（1ファイルずつ） |
| `find ... \| xargs` | パイプチェーンは出力キャプチャ失敗しやすい | `list_files` + `read_file` ツール |
| `awk` / `sort` / `uniq` を含むパイプ | 複雑な処理は結果が取得できない | TypeScript で処理またはツールで代替 |

```bash
# ❌ 絶対禁止: 複数ファイルの一括検索
grep -rn "AUTH_INVALID_CREDENTIALS" backend/src/
grep -rl "AUTH_" backend/src/ | wc -l

# ❌ 絶対禁止: 複数ファイルの一括置換
sed -i 's/AUTH_INVALID_CREDENTIALS/E5001/g' backend/src/controllers/*.ts
find backend/src/ -name "*.ts" | xargs sed -i 's/old/new/g'

# ❌ 絶対禁止: 複雑なパイプチェーン
grep -r "AUTH_" backend/src/ | awk '{print $1}' | sort | uniq | wc -l
```

### 代替手段: Clineのツールを使用する

```
// ✅ 推奨: 複数ファイル検索 → search_files ツール
// ✅ 推奨: ファイル読み込み → read_file ツール
// ✅ 推奨: ファイル置換 → replace_in_file ツール（1ファイルずつ）
// ✅ 推奨: ディレクトリ確認 → list_files ツール
```

### 単純なコマンドのみ許可

```bash
# ✅ 許可: 単一ファイルのパターン確認（1コマンド完結）
grep "AUTH_INVALID_CREDENTIALS" backend/src/controllers/authController.ts

# ✅ 許可: ディレクトリ構造確認
ls -lh backend/src/controllers/

# ✅ 許可: ファイル内容の一部確認
cat backend/src/controllers/authController.ts | head -50
```

**ルール**: 1コマンドで完結し、結果が必ず標準出力に返ってくるものだけ使用する。

---

## 基本原則

### 1. シンプルで明確なコマンド
- 1つのコマンドで1つの目的
- **複雑なロジックは Cline ツール（search_files / read_file / replace_in_file）で対応**
- 結果を確認できる出力を含める

### 2. タイムアウトとエラーハンドリング
- 長時間実行コマンドにはタイムアウト設定
- エラー出力を適切に処理
- 失敗時の代替手段を準備

### 3. 出力の制御
- 大量出力は制限またはリダイレクト
- 標準出力に結果を必ず返す
- インタラクティブモードを避ける

---

## 問題パターンと解決策

### ⚠️ Pattern 1: echo + リダイレクト

**問題**: 出力がファイルにリダイレクトされ、Clineが結果を受け取れない

```bash
# ❌ 悪い例
echo "content" > /tmp/file.txt
echo "line1" >> /tmp/file.txt
```

**解決策:**

```bash
# ✅ 確認メッセージを追加
echo "content" > /tmp/file.txt && echo "✓ File created"

# ✅ teeコマンドを使用
echo "content" | tee /tmp/file.txt

# ✅ 内容を表示
echo "content" > /tmp/file.txt && cat /tmp/file.txt

# ✅ write_to_fileツールを使用（最も確実）
```

### ⚠️ Pattern 2: cd + 複数コマンドチェーン

**問題**: ディレクトリ変更とコマンドチェーンでPendingになる

```bash
# ❌ 悪い例
cd frontend && npm run build 2>&1 | tail -30
cd backend && ls -lh routes/**/*.ts | tail -10
```

**解決策:**

```bash
# ✅ サブシェル化（推奨）
(cd frontend && npm run build 2>&1) | tail -30
(cd backend && ls -lh src/routes/*.ts | tail -10)

# ✅ 絶対パスを使用
npm --prefix /home/mi_ito/mmdpf/frontend run build 2>&1 | tail -30
ls -lh /home/mi_ito/mmdpf/backend/src/routes/*.ts | tail -10

# ✅ コマンドを分割
cd frontend && pwd
# 次のコマンド実行で
npm run build 2>&1 | tail -30
```

### ⚠️ Pattern 3: インタラクティブコマンド

**問題**: ユーザー入力待ちでハングする

```bash
# ❌ 悪い例
npm install  # 確認プロンプトが出る可能性
docker exec -it container bash
cat >> file.txt << 'EOF'  # ヒアドキュメント（絶対禁止）
```

**解決策:**

```bash
# ✅ 自動応答オプション
npm install --yes
docker exec container bash -c "command"

# ✅ ファイル操作はツールを使用
# write_to_fileツールまたはechoリダイレクト
```

### ⚠️ Pattern 4: 長時間実行プロセス

**問題**: 終了しないコマンドでハング

```bash
# ❌ 悪い例
npm run dev  # 開発サーバーが起動し続ける
docker-compose up
```

**解決策:**

```bash
# ✅ バックグラウンド実行
npm run dev > /tmp/dev-server.log 2>&1 &
echo "Server started with PID: $!"

# ✅ デタッチモード
docker-compose up -d && docker-compose ps
```

---

## ベストプラクティス

### DO（推奨）

#### タイムアウト設定
```bash
timeout 60 npm install
timeout 120 docker build -t myapp .
```

#### 出力制限
```bash
find / -name "*.log" 2>/dev/null | head -100
npm list 2>&1 | head -50
```

#### エラーハンドリング
```bash
command 2>&1  # エラーを標準出力にマージ
command 2>/dev/null  # エラーを無視
command || echo "Command failed but continuing"
```

#### 確認メッセージ
```bash
npm install --yes && echo "✓ Dependencies installed"
docker-compose up -d && echo "✓ Containers started"
```

#### コマンドチェーン
```bash
# 成功時のみ次を実行
cd backend && npm install && npm test

# 失敗しても続行
cd backend ; npm install ; npm test
```

### DON'T（非推奨）

❌ ヒアドキュメント（`<< EOF`）は絶対に使用しない
❌ cdと複数コマンドを直接チェーンしない
❌ リダイレクトだけで確認メッセージなし
❌ インタラクティブモードでコマンド実行
❌ タイムアウトなしで長時間実行
❌ 大量出力を無制限に表示

---

## コマンドテンプレート

### npm install
```bash
cd backend && \
  npm install --yes --loglevel=error && \
  echo "✓ Dependencies installed"
```

### Docker操作
```bash
# 起動
docker-compose up -d && \
  docker-compose ps && \
  echo "✓ Containers started"

# ログ確認
docker-compose logs --tail=50
```

### ファイル検索
```bash
find . -name "*.ts" -type f 2>/dev/null | \
  head -1000 > /tmp/ts-files.txt && \
  wc -l /tmp/ts-files.txt && \
  echo "✓ File list created"
```

### Git操作
```bash
git status --short && \
  git log --oneline -10 && \
  git branch -a | head -20
```

### ビルド操作
```bash
timeout 300 npm run build 2>&1 | tee /tmp/build.log || \
  echo "Build completed or timed out"
```

---

## トラブルシューティング

### コマンドがPendingになった場合

#### Step 1: 問題パターンを特定
- cdと複数コマンドチェーンか？
- リダイレクトだけで確認メッセージなしか？
- インタラクティブコマンドか？
- 長時間実行プロセスか？

#### Step 2: 解決策を適用
- サブシェル化または絶対パス使用
- 確認メッセージまたはtee使用
- 自動応答オプション追加
- タイムアウトまたはバックグラウンド実行

#### Step 3: コマンドを分割
複雑なコマンドは小さく分割して、各ステップで結果を確認

---

## チェックリスト

コマンド実行前に確認:

- [ ] インタラクティブモードを使用していないか？
- [ ] cdと複数コマンドを直接チェーンしていないか？
- [ ] リダイレクトに確認メッセージを追加したか？
- [ ] タイムアウトが必要な長時間実行か？
- [ ] 大量出力を制限またはリダイレクトしたか？
- [ ] エラーハンドリングを実装したか？

---

## 関連ドキュメント

- [ファイル書き込み規約](file-writing.md) - write_to_file/replace_in_fileの使い分け
- [ワークフロー規約](../core/workflow.md) - タスク実行の基本フロー
- `docs/20260114_1611_コマンド実行_分析結果とベストプラクティス.md` - 詳細な調査結果

---

## まとめ

### 最も重要な3つのルール

1. **cdと複数コマンドは括弧でサブシェル化する**
   ```bash
   (cd dir && command) && echo "Done"
   ```

2. **リダイレクトには必ず確認メッセージを追加する**
   ```bash
   echo "content" > file.txt && echo "✓ Created"
   ```

3. **インタラクティブコマンドは自動応答オプションを使用する**
   ```bash
   npm install --yes
   ```

これらを守ることで、Pending問題の大部分を回避できます。

---

**作成日**: 2026-01-14
**ベース資料**: docs/20260114_1611_コマンド実行_分析結果とベストプラクティス.md
**バージョン**: 1.0
