# MaiML 公開処理 処理仕様

> 元仕様書: `docs/design/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md` (v1.3, 2026-02-17)
> 作成日: 2026-03-05

---

## 1. このシステムが何をするか（概要）

ユーザーが MaiML（XML フォーマットの材料科学データ）ファイルを「公開」「非公開」できる仕組みを提供する。

| 操作 | 概要 |
|------|------|
| **公開 (Publish)** | 指定した MaiML ファイルを解析・DB へ取り込み、検索・閲覧できる状態にする |
| **非公開 (Unpublish)** | 公開したデータを削除（または代表メタのみ残す）して非公開にする |

### 1.1 操作のトリガー（mmdpf での実装方針）

| 項目 | 決定内容 |
|------|---------|
| **操作画面** | mmdpf のプロジェクト詳細画面に「公開」「非公開」ボタンを配置 |
| **対象ファイル** | ボタン押下時点でのプロジェクトの**最新 MaiML ファイル**を自動的に解析・登録する |
| **既存テーブルとの紐付け** | `project` テーブルとの直接的な紐づけは不要。公開処理は独立した `maiml_asset` 等で管理する |
| **実装場所** | mmdpf の **backend（Node.js/Express）に組み込む** |
| **実行可能ロール** | **`experiment_admin`** のみが公開・非公開の両操作を実行可能 |

---

## 2. システムを構成する3つのコンポーネント

```
[ユーザー]
    │
    ▼
[Ingest Controller]  ← CLI / API
    │  公開対象の登録・公開実行・状態参照
    ▼
[Ingest Worker]
    │  MaiML(XML)をストリーミング解析 → DB に反映
    │  ├─ プレビュー生成（最大2,000点）
    │  └─ 生データ保存（任意）
    ▼
[Storage 抽象層]
    │  file:// / nfs:// / smb:// / s3:// に対応
    ▼
[PostgreSQL (Aurora 互換)]
```

### 2.1 SAX / iterparse とは（XML 解析方式の説明）

MaiML は XML フォーマットのファイルであり、その解析方式として仕様書に「SAX/iterparse」が記載されている。

#### XML 解析には2つの代表的な方式がある

| 方式 | 動作 | 特徴 |
|------|------|------|
| **DOM 方式** | ファイル全体をメモリに読み込んでツリー構造に変換してから処理する | シンプルだが、大きなファイルはメモリ不足になる |
| **SAX / iterparse 方式（ストリーミング方式）** | ファイルを先頭から少しずつ読み込みながら、タグが出てくるたびに逐次処理する | メモリ消費が少なく、巨大ファイルでも処理できる |

#### イメージ図

```
【DOM 方式】
ファイル全体（例: 500MB）を一気に読み込む
→ メモリに全部展開してから処理
→ 大きすぎるとメモリ不足エラー ❌

【SAX / iterparse 方式（ストリーミング）】
ファイルを先頭から少しずつ読む
→ <tag> が来たら → その時点で処理
→ </tag> が来たら → その時点で処理
→ ファイルを全部メモリに乗せない ✅
→ 巨大なファイルでも安定して処理できる
```

#### なぜ MaiML の取り込みにストリーミング解析が必要か

MaiML には実験データ（スペクトル、時系列など）の数値配列が含まれており、
1ファイルが数百MB〜GB 規模になることがある。
DOM 方式でメモリに全展開するとサーバーがメモリ不足になるため、
**SAX（Simple API for XML）** や Python の **iterparse** のようなストリーミング方式が適している。

> **SAX** は Java/JavaScript などで使われる XML ストリーミング API の呼称。
> **iterparse** は Python の `xml.etree.ElementTree` が提供するストリーミング解析関数の名前。
> 仕様書の「SAX/iterparse」は「ストリーミング XML 解析を使う」という意味であり、実装言語に応じてどちらかを使う。

---

## 2.2 XML データの登録単位

MaiML（XML）ファイルを公開すると、データは **3つの階層** に分かれて DB に登録される。

### 登録単位の全体像

```
【1 MaiML ファイル】
    │
    │ 1ファイル → 1レコード
    ▼
maiml_asset（アセット）
    │
    ├─ KV 属性（条件・材料）
    │      1ファイル内の KV 項目の数だけ行を挿入
    │      ├─ maiml_condition_kv: (path + key) の組み合わせ × instruction 数
    │      └─ maiml_material_kv:  (path + key) の組み合わせ × instruction 数
    │
    └─ データ系列（series / content）
           1ファイル内に複数の <content> がある場合 → content_id ごとに1レコード
           ├─ maiml_series_preview（プレビュー）: content_id ごとに1レコード
           ├─ maiml_series_raw_header（生データヘッダ）: content_id ごとに1レコード
           └─ maiml_series_raw_chunk（生データチャンク）: ヘッダ1件を32,768点ごとに分割
```

### 階層ごとの詳細

| 階層 | 登録単位 | テーブル | 説明 |
|------|---------|---------|------|
| **第1層** | 1 MaiML ファイル | `maiml_asset` | 1ファイル = 1アセット（1レコード） |
| **第2層** | KV 属性の各項目 | `maiml_condition_kv` / `maiml_material_kv` | path + key + instruction_id の組み合わせごとに1行 |
| **第2層** | データ系列（content）| `maiml_series_preview` / `maiml_series_raw_header` | `content_id` ごとに1レコード |
| **第3層** | チャンク（生データのみ） | `maiml_series_raw_chunk` | 1系列を32,768点ごとに分割して複数行 |

### 具体的なイメージ

例えば、以下のような MaiML ファイルがある場合：
```
raman_001.xml
  └─ instruction: "RamanSpectroscopy"
       ├─ condition: Laser=532, Temperature=25℃  ← KV 2行
       ├─ material:  Sample=SiO2                 ← KV 1行
       └─ result
            ├─ content_id: "spectrum_001"        ← プレビュー 1レコード + 生データヘッダ 1レコード
            │                                       + チャンク N レコード（点数 / 32768）
            └─ content_id: "spectrum_002"        ← プレビュー 1レコード + 生データヘッダ 1レコード
                                                    + チャンク N レコード
```

登録されるレコード数：
- `maiml_asset`: **1レコード**
- `maiml_condition_kv`: **2レコード**（Laser, Temperature）
- `maiml_material_kv`: **1レコード**（Sample）
- `maiml_series_preview`: **2レコード**（spectrum_001, spectrum_002 それぞれ）
- `maiml_series_raw_header`: **2レコード**（同上）
- `maiml_series_raw_chunk`: **合計点数 ÷ 32,768 の数だけレコード**（例: 100万点なら約31行）

### content_id とは

MaiML の `<result>` タグの中に複数の `<content>` が存在しうる。
それぞれの `<content>` が個別のデータ系列（スペクトルや時系列）に対応しており、
`content_id` でそれを識別する。プレビュー・生データはこの `content_id` 単位で保存される。

---

## 3. 公開処理の全体フロー

### 3.1 公開（Publish）フロー

```
① ユーザーが公開対象ファイルを登録（register）
   └─ maiml_publish_registry に登録
       ├─ template_only: テンプレートのみ公開するか
       ├─ store_raw_series: 生データを保存するか
       ├─ retention: 公開期限（自動非公開日時）
       └─ keep_raw_on_unpublish: 非公開時に生データを残すか

② 公開実行（publish）
   └─ Ingest Worker が MaiML(XML) を SAX/iterparse でストリーミング解析

③ Worker の処理（取り込み内容）
   ├─ A. KV 属性の抽出・保存
   │     ├─ Condition（実験条件）→ maiml_condition_kv
   │     └─ Material（材料情報）→ maiml_material_kv
   │
   ├─ B. プレビュー生成・保存（series データがある場合）
   │     └─ maiml_series_preview
   │         ├─ uniform: 等間隔サンプリング
   │         ├─ maxhold: 区間最大値保持
   │         └─ mmr: 多様性重視サンプリング
   │
   └─ C. 生データ保存（store_raw_series=true の場合のみ）
         ├─ maiml_series_raw_header（ヘッダ情報）
         └─ maiml_series_raw_chunk（チャンク分割データ）
```

### 3.2 非公開（Unpublish）フロー

```
① ユーザーが非公開を指示（unpublish）
   ├─ mode=keep_meta: 代表メタデータは残す（デフォルト）
   └─ mode=full_delete: 完全削除

② asset_id に紐づく全データを CASCADE 削除
   ├─ maiml_series_preview（プレビュー）
   ├─ maiml_condition_kv（実験条件 KV）
   ├─ maiml_material_kv（材料 KV）
   ├─ maiml_series_raw_header（生データヘッダ）
   └─ maiml_series_raw_chunk（生データチャンク）

③ スケジュール実行
   └─ maiml_unpublish_due_assets() で期限到来アセットを一括非公開
```

---

## 4. データベーステーブル一覧と役割

### 4.1 テーブル構成図

```
maiml_publish_registry （公開レジストリ：公開設定・フラグ管理）
    │
    ▼
maiml_asset （公開アセット：MaiML ファイルの代表メタ）
    │
    ├──── maiml_condition_kv （実験条件 KV：key=value形式で保存）
    │
    ├──── maiml_material_kv （材料情報 KV：key=value形式で保存）
    │
    ├──── maiml_series_preview （プレビュー：最大2,000点の要約系列）
    │
    ├──── maiml_series_raw_header （生データヘッダ）
    │         │
    │         └── maiml_series_raw_chunk （生データチャンク：配列方式）
    │         └── maiml_series_raw_chunk_bin （生データチャンク：バイナリ方式）
```

### 4.2 各テーブルの役割詳細

| テーブル名 | 役割 | 主要カラム |
|-----------|------|-----------|
| `maiml_publish_registry` | 公開設定の管理（ホワイトリスト） | `template_only`, `store_raw_series`, `retention`, `keep_raw_on_unpublish` |
| `maiml_asset` | 公開された MaiML ファイルの代表メタ | `asset_id`, `doc_name`（取得元: `/maiml/document/name`）, `template_only` |
| `maiml_condition_kv` | 実験条件の KV 属性 | `asset_id`, `instruction_id`, `path`, `key`, `value_text`, `value_num`, `unit` |
| `maiml_material_kv` | 材料情報の KV 属性 | `asset_id`, `instruction_id`, `path`, `key`, `value_text`, `value_num`, `unit` |
| `maiml_series_preview` | 系列データのプレビュー（最大2,000点） | `asset_id`, `instruction_id`, `result_id`, `content_id`, `mode`, `x[]`, `y[]` |
| `maiml_series_raw_header` | 生データのヘッダ情報 | `raw_id`, `asset_id`, `content_id`, `points_total`, `chunk_count`, `storage_format` |
| `maiml_series_raw_chunk` | 生データの本体（配列方式） | `raw_id`, `chunk_index`, `point_offset`, `x_chunk[]`, `y_chunk[]` |
| `maiml_series_raw_chunk_bin` | 生データの本体（バイナリ方式） | `raw_id`, `chunk_index`, `codec`, `payload` |

---

## 5. プレビュー生成の詳細

### 5.1 プレビューとは

MaiML の series データ（スペクトルや時系列など大量の数値配列）を最大 **2,000 点** に圧縮して DB に保存したもの。
巨大な配列を丸ごと保存するのでなく、代表点のみを抽出することで検索・表示を高速化する。

### 5.2 プレビューを生成しないケース

- `template_only=true`（テンプレートのみ公開、値なし）
- `<data>` タグに値が存在しない場合

### 5.3 3つのサンプリングモード

| モード | 特徴 | 用途 |
|--------|------|------|
| **uniform** | 等間隔にインデックスを選ぶ | 均等な概形把握 |
| **maxhold** | 区間ごとに最大値の点を選ぶ | ピーク保持、スペクトル |
| **mmr** | 代表性と多様性のバランスで選ぶ | より精度の高い要約 |

### 5.4 共通前処理

1. `x` を昇順ソート
2. `y` を 0〜1 に正規化（`(y - min) / (max - min + ε)`）
3. 先頭・末尾の端点は必ず保持

### 5.5 MMR の計算式（参考）

```
score(i) = (1 - λ) * sim_whole(i) - λ * max_{j ∈ S} sim_pair(i, j)

sim_whole(i)   : 振幅正規化値（代表性）
sim_pair(i, j) : 1 - |y_i - y_j| / (|y_i| + |y_j| + ε)（類似度）
λ = 0.2（推奨）
```

大規模系列の場合は **maxhold で 4k 点に圧縮 → MMR で k 点** が安定。

---

## 6. 生データ保存の詳細（store_raw_series）

### 6.1 概要

通常はプレビューのみ保存するが、`store_raw_series=true` を指定すると、
**元の全データ**をチャンク分割して DB に保存する。

### 6.2 生データ取り込みフロー

```
① registry で store_raw_series=true のアセットのみ対象
      ↓
② <data> と resultTemplate を突合
   → instruction_id / template_id / result_id / result_name / content_id を特定
      ↓
③ maiml_series_raw_header に INSERT
      ↓
④ データをチャンク分割（デフォルト: 32,768 点 / チャンク）
      ↓
⑤ maiml_series_raw_chunk に挿入（COPY コマンド推奨）
      ↓
⑥ checksum_sha256 を更新（冪等性確認用）
```

### 6.3 チャンク方式の選択

| 方式 | テーブル | 特徴 |
|------|---------|------|
| **Array 方式**（デフォルト） | `maiml_series_raw_chunk` | SQL で直接参照可能・デバッグ容易 |
| **Binary 方式**（任意） | `maiml_series_raw_chunk_bin` | 圧縮率高い・CPU コストあり |

---

## 7. KV テーブルの設計思想

### 7.1 パス表現ルール

MaiML の XML 構造を「パス」で表現して保存する：

| ケース | path の値 |
|--------|----------|
| 直下の要素 | `key` そのまま |
| ネストした要素 | `親/子` |
| 同名要素が複数ある | `idx=0, 1, 2...` で区別 |

### 7.2 instruction_id の役割

MaiML には複数の実験ステップ（instruction）が含まれる。
どのステップの条件・材料かを `instruction_id` カラムで管理することで、
ステップ単位での絞り込み検索が可能になる。

---

## 8. CLI コマンドと対応処理

| コマンド | 処理内容 |
|---------|---------|
| `maimlctl register --file-uri ... --template-only true` | テンプレートのみ公開として登録 |
| `maimlctl register --file-uri ... --store-raw-series true` | 生データも保存する設定で登録 |
| `maimlctl publish --all-requested` | 登録済み全アセットを公開実行 |
| `maimlctl unpublish --asset-id 123 --mode keep_meta` | 指定アセットを非公開（代表メタ保持） |

---

## 9. 検索できる内容

### 9.1 実験条件での絞り込み（KV 検索）

```sql
-- 例: Laser=532nm かつ STEP=RamanSpectroscopy のアセットを検索
SELECT DISTINCT a.asset_id, a.doc_name
FROM   maiml_asset a
JOIN   maiml_condition_kv c ON c.asset_id = a.asset_id
WHERE  c.key='Laser'
  AND  (c.value_num=532 OR c.value_text='532')
  AND  c.instruction_id='RamanSpectroscopy';
```

### 9.2 プレビューデータの取得

```sql
-- 例: STEP=CLSAnalysis のプレビュー一覧
SELECT p.asset_id, p.instruction_id, p.result_id, p.content_id, p.preview_points
FROM   maiml_series_preview p
WHERE  p.instruction_id='CLSAnalysis'
ORDER BY p.created_at DESC;
```

### 9.3 生データプロファイルの列挙

```sql
-- 例: 特定アセットの全生データ一覧
SELECT h.raw_id, h.asset_id, h.instruction_id, h.result_id, h.content_id, h.points_total
FROM   maiml_series_raw_header h
WHERE  h.asset_id = :asset_id
ORDER BY h.content_id;
```

---

## 10. バージョン変遷まとめ

| バージョン | 追加内容 |
|-----------|---------|
| **V1.1** | プレビュー実装ロジック（uniform/maxhold/MMR）・DDL・品質指標 |
| **V1.2** | `instruction_id` 連携・プレビュー識別子拡張（result_id, content_id など） |
| **V1.3** | 生データ RAW 永続化（ヘッダ/チャンク）を追加・選択制で運用可能に |
