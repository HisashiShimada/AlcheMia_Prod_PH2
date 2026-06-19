-- ============================================================
-- namespace / namespace_term ダミーデータ
--
-- @remarks
--   DDL: docs/design/db/ddl/namespace.sql
--        docs/design/db/ddl/namespace_term.sql
--   namespace 主キー    : (organization_id, prefix)
--   namespace_term 主キー: (organization_id, prefix, local_name)
--
-- organization_id: a0718dc5-21f3-44e6-87e9-cc2ae83f3385
-- ツリー構造: frontend/mock/namespace/uncertainty-scope.json 準拠
-- ============================================================

-- 既存ダミーデータをクリア（再実行可能）
DELETE FROM namespace_term
  WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

DELETE FROM namespace
  WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385';

-- ============================================================
-- 1. namespace
--    主キー: (organization_id, prefix)
--    ※ id / level / parent_id カラムは存在しない
-- ============================================================

INSERT INTO namespace (
  organization_id
  , prefix
  , uri
  , display_name
  , description
  , create_at
  , update_at
) VALUES
  -- ------------------------------------------------
  -- generic（汎用）
  -- ------------------------------------------------
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
    , 'maiml'
    , 'http://maiml.org/schemas'
    , 'MaiML標準名前空間'
    , 'MaiML標準スキーマ定義'
    , NOW()
    , NOW()
  ),
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
    , 'xsi'
    , 'http://www.w3.org/2001/XMLSchema-instance'
    , 'XML Schema Instance'
    , 'XMLスキーマインスタンス属性'
    , NOW()
    , NOW()
  ),
  -- ------------------------------------------------
  -- organization（組織）
  -- ------------------------------------------------
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
    , 'CorpA'
    , 'https://www.corpa.co.jp/'
    , '株式会社サンプルテック'
    , '会社全体の共通名前空間'
    , NOW()
    , NOW()
  ),
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
    , 'rd'
    , 'https://www.corpa.co.jp/rd/'
    , '研究開発部'
    , '研究開発部の用語定義'
    , NOW()
    , NOW()
  ),
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
    , 'materials'
    , 'https://www.corpa.co.jp/rd/materials/'
    , '材料グループ'
    , '材料特性・組成データの定義'
    , NOW()
    , NOW()
  ),
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
    , 'measurement'
    , 'https://www.corpa.co.jp/rd/measurement/'
    , '計測チーム'
    , '計測・測定方法の定義'
    , NOW()
    , NOW()
  ),
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
    , 'mfg'
    , 'https://www.corpa.co.jp/mfg/'
    , '生産技術部'
    , '生産技術部の用語定義'
    , NOW()
    , NOW()
  ),
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
    , 'process'
    , 'https://www.corpa.co.jp/mfg/process/'
    , 'プロセスチーム'
    , '製造プロセスパラメータの定義'
    , NOW()
    , NOW()
  ),
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
    , 'qa'
    , 'https://www.corpa.co.jp/mfg/qa/'
    , '品質管理'
    , '品質検査・管理指標の定義'
    , NOW()
    , NOW()
  ),
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
    , 'qad'
    , 'https://www.corpa.co.jp/qad/'
    , '品質保証部（qad）'
    , '品質保証プロセスと基準の定義'
    , NOW()
    , NOW()
  ),
  -- ------------------------------------------------
  -- personal（個人）
  -- ------------------------------------------------
  (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
    , 'MyWord'
    , 'https://orcid.org/0000-0002-2494-9603'
    , '山田太郎（MyWord）'
    , '個人作成の実験用語定義'
    , NOW()
    , NOW()
  )
;

-- ============================================================
-- 2. namespace_term（各名前空間に約20件）
--    主キー: (organization_id, prefix, local_name)
--    ※ id / namespace_id カラムは存在しない
--    ※ display_name_ja / display_name_en は存在しない → display_name のみ
-- ============================================================

INSERT INTO namespace_term (
  organization_id
  , prefix
  , local_name
  , display_name
  , description
  , type_hint
  , unit_hint
  , create_at
  , update_at
) VALUES
  -- ------------------------------------------------
  -- maiml（汎用 MaiML 標準 - 20件）
  -- ------------------------------------------------
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Document','文書','MaiML文書要素','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Protocol','プロトコル','実験プロトコル','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Method','メソッド','実験メソッド','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Program','プログラム','実験プログラム','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Instruction','インストラクション','実験指示','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Property','プロパティ','プロパティ要素','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Value','値','測定値','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Unit','単位','測定単位','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Timestamp','タイムスタンプ','記録日時','dateTimeType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Instrument','機器','使用機器名','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Operator','オペレーター','操作者','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Version','バージョン','スキーマバージョン','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','DataType','データ型','データ型指定','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Reference','参照','参照リンク','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Description','説明','要素の説明','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Status','ステータス','実験ステータス','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Priority','優先度','処理優先度','intType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Tag','タグ','分類タグ','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','Author','作成者','データ作成者','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','maiml','License','ライセンス','データライセンス情報','stringType',NULL,NOW(),NOW()),
  -- ------------------------------------------------
  -- xsi（汎用 XML Schema Instance - 3件）
  -- ------------------------------------------------
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','xsi','type','型指定','xsi:type 属性','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','xsi','nil','null指定','xsi:nil 属性','booleanType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','xsi','schemaLocation','スキーマ位置','xsi:schemaLocation 属性','stringType',NULL,NOW(),NOW()),
  -- ------------------------------------------------
  -- rd（研究開発部 - 20件）
  -- ------------------------------------------------
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','SampleID','サンプルID','サンプル識別子','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','ExperimentDate','実験日','実験実施日','dateTimeType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','ResearcherID','研究者ID','担当研究者識別子','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','ProjectCode','プロジェクトコード','研究プロジェクトコード','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','Temperature','温度','実験温度','floatType','celsius',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','Pressure','圧力','実験圧力','floatType','Pa',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','Duration','実験時間','実験継続時間','floatType','second',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','Result','結果','実験結果値','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','Protocol','プロトコル名','使用プロトコル名称','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','BatchNo','バッチ番号','製造バッチ番号','intType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','PH','pH値','溶液のpH値','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','Concentration','濃度','溶液濃度','floatType','mol/L',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','Solvent','溶媒','使用溶媒','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','Catalyst','触媒','使用触媒','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','Yield','収率','反応収率','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','ReactionTime','反応時間','反応時間','floatType','minute',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','AtmosphericCondition','雰囲気条件','実験雰囲気条件','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','Humidity','湿度','環境湿度','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','MolecularWeight','分子量','化合物の分子量','floatType','g/mol',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','rd','Purity','純度','試薬純度','floatType','%',NOW(),NOW()),
  -- ------------------------------------------------
  -- materials（材料グループ - 20件）
  -- ------------------------------------------------
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','MaterialID','材料ID','材料識別子','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','CompositionA','成分A比率','主成分A の含有率','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','CompositionB','成分B比率','主成分B の含有率','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','Density','密度','材料密度','floatType','g/cm3',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','HardnessHV','ビッカース硬度','ビッカース硬度値','floatType','HV',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','TensileStrength','引張強度','引張強度','floatType','MPa',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','YieldStrength','降伏強度','降伏強度','floatType','MPa',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','Elongation','伸び率','破断伸び率','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','ThermalConductivity','熱伝導率','熱伝導率','floatType','W/mK',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','MeltingPoint','融点','融点温度','floatType','celsius',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','CrystalStructure','結晶構造','結晶構造タイプ','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','GrainSize','粒径','平均粒径','floatType','micrometer',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','Porosity','空孔率','材料の空孔率','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','SurfaceRoughness','表面粗さ','表面粗さ Ra','floatType','micrometer',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','ElasticModulus','弾性率','ヤング率','floatType','GPa',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','FractureToughness','破壊靭性','破壊靭性値','floatType','MPa√m',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','Resistivity','抵抗率','電気抵抗率','floatType','Ω·m',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','SpecificHeat','比熱','比熱容量','floatType','J/kgK',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','ThermalExpansion','熱膨張係数','線熱膨張係数','floatType','1/K',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','materials','Magnetization','磁化','飽和磁化','floatType','A/m',NOW(),NOW()),
  -- ------------------------------------------------
  -- measurement（計測チーム - 20件）
  -- ------------------------------------------------
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','MeasurementID','計測ID','計測識別子','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','InstrumentID','装置ID','計測装置識別子','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','CalibrationDate','校正日','最終校正日','dateTimeType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','SamplingRate','サンプリングレート','データ取得サンプリング周波数','floatType','Hz',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','SamplingInterval','サンプリング間隔','データ取得間隔','floatType','second',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','Resolution','分解能','計測分解能','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','Accuracy','精度','計測精度','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','MeasuredValue','計測値','実測値','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','ReferenceValue','基準値','比較基準値','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','Deviation','偏差','計測偏差','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','SignalNoise','S/N比','信号雑音比','floatType','dB',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','Wavelength','波長','測定波長','floatType','nm',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','Frequency','周波数','計測周波数','floatType','Hz',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','Amplitude','振幅','信号振幅','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','ElapsedTime','経過時間','計測開始からの経過時間','floatType','second',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','RangeMax','計測範囲最大値','計測レンジ最大値','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','RangeMin','計測範囲最小値','計測レンジ最小値','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','SensorType','センサー種別','使用センサーの種類','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','DataCount','データ点数','取得データ点数','intType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','measurement','AveragingCount','平均化回数','信号平均化回数','intType',NULL,NOW(),NOW()),
  -- ------------------------------------------------
  -- mfg（生産技術部 - 20件）
  -- ------------------------------------------------
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','ProductID','製品ID','製品識別子','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','LotNo','ロット番号','製造ロット番号','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','LineID','ライン番号','製造ライン識別子','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','ShiftCode','シフトコード','生産シフトコード','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','ProductionQty','生産数量','生産数量','intType','pcs',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','CycleTime','サイクルタイム','1製品あたりのサイクルタイム','floatType','second',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','Tact','タクトタイム','ライン目標タクトタイム','floatType','second',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','OperatingRate','稼働率','設備稼働率','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','DefectRate','不良率','製造不良率','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','ReworkRate','手直し率','手直し発生率','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','OEE','設備総合効率','Overall Equipment Effectiveness','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','SetupTime','段取り時間','設備段取り時間','floatType','minute',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','ToolLife','工具寿命','工具寿命（ショット数）','intType','shots',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','Torque','トルク','締結トルク','floatType','Nm',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','CuttingSpeed','切削速度','切削加工速度','floatType','m/min',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','FeedRate','送り速度','工具送り速度','floatType','mm/min',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','SpindleSpeed','主軸回転数','主軸回転数','intType','rpm',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','CuttingDepth','切削深さ','切削加工深さ','floatType','mm',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','CoolantFlow','クーラント流量','切削液流量','floatType','L/min',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','mfg','VibrationLevel','振動レベル','加工時振動レベル','floatType','mm/s',NOW(),NOW()),
  -- ------------------------------------------------
  -- process（プロセスチーム - 20件）
  -- ------------------------------------------------
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','ProcessID','プロセスID','製造プロセス識別子','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','StepNo','工程番号','プロセス工程番号','intType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','FurnaceTemp','炉内温度','熱処理炉内温度','floatType','celsius',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','SoakingTime','保持時間','温度保持時間','floatType','minute',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','CoolingRate','冷却速度','焼入れ冷却速度','floatType','celsius/s',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','GasFlow','ガス流量','雰囲気ガス流量','floatType','L/min',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','GasComposition','ガス組成','雰囲気ガス組成','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','OxygenLevel','酸素濃度','炉内酸素濃度','floatType','ppm',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','DewPoint','露点','雰囲気露点温度','floatType','celsius',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','CoatingThickness','コーティング厚み','表面コーティング厚み','floatType','micrometer',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','PlatingCurrent','メッキ電流','電解メッキ電流','floatType','A',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','PlatingVoltage','メッキ電圧','電解メッキ電圧','floatType','V',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','PlatingTime','メッキ時間','電解メッキ時間','floatType','minute',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','BathTemperature','浴温度','メッキ浴温度','floatType','celsius',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','EtchingRate','エッチング速度','エッチング除去速度','floatType','nm/min',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','SpinSpeed','スピン速度','スピンコーター回転数','intType','rpm',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','BakingTemp','ベーキング温度','レジストベーキング温度','floatType','celsius',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','ExposureDose','露光量','リソグラフィ露光量','floatType','mJ/cm2',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','AnnealingTemp','アニール温度','アニール処理温度','floatType','celsius',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','process','SinteringTemp','焼結温度','粉末焼結温度','floatType','celsius',NOW(),NOW()),
  -- ------------------------------------------------
  -- qa（品質管理 - 20件）
  -- ------------------------------------------------
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','InspectionID','検査ID','検査識別子','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','InspectionDate','検査日','検査実施日','dateTimeType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','InspectorID','検査員ID','担当検査員識別子','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','SampleSize','サンプルサイズ','検査サンプル数','intType','pcs',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','AcceptanceCriteria','合否基準','検査合否判定基準','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','JudgmentResult','判定結果','検査判定結果（OK/NG）','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','DefectCount','不良個数','発見不良個数','intType','pcs',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','DefectType','不良種別','不良の種類','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','UpperLimit','上限値','管理上限値','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','LowerLimit','下限値','管理下限値','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','TargetValue','目標値','管理目標値','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','Cpk','工程能力指数','工程能力指数Cpk','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','Ppk','プロセス性能指数','プロセス性能指数Ppk','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','ControlChart','管理図種別','使用管理図の種類','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','SamplingMethod','サンプリング方法','抜取方式','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','AQL','AQL','Acceptable Quality Level','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','RejectionRate','棄却率','ロット棄却率','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','MeasurementGRR','計測GRR','測定システム繰返し再現性','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','VisualStandard','外観基準','外観検査判定基準','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qa','DimensionTolerance','寸法公差','部品寸法公差','floatType','mm',NOW(),NOW()),
  -- ------------------------------------------------
  -- qad（品質保証部 - 20件）
  -- ------------------------------------------------
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','AuditID','監査ID','品質監査識別子','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','AuditDate','監査日','品質監査実施日','dateTimeType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','StandardRef','規格参照','参照規格・標準番号','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','NCRNo','不適合報告書番号','不適合報告書番号','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','CARNo','是正処置番号','是正処置要求書番号','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','RiskLevel','リスクレベル','リスクアセスメント評価レベル','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','ComplianceStatus','適合状況','規制・標準への適合状況','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','CustomerComplaint','顧客クレーム件数','顧客クレーム発生件数','intType','件',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','ReturnRate','返品率','製品返品率','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','WarrantyPeriod','保証期間','製品保証期間','intType','month',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','TraceabilityCode','トレーサビリティコード','製品トレーサビリティコード','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','CertificationNo','認証番号','品質認証番号','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','DocumentRev','文書改訂番号','品質文書改訂番号','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','TrainingRecord','教育訓練記録','作業者教育訓練記録','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','SupplierEval','仕入先評価','仕入先評価スコア','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','ISOClause','ISO条項','関連ISO規格条項番号','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','FMEA_RPN','FMEA RPN','リスク優先数（Risk Priority Number）','intType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','MSA_Result','MSA結果','測定システム解析結果','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','QualityCost','品質コスト','品質関連コスト','floatType','JPY',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','qad','PreventiveAction','予防処置内容','予防処置の内容','stringType',NULL,NOW(),NOW()),
  -- ------------------------------------------------
  -- MyWord（個人 - 20件）
  -- ------------------------------------------------
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','SpecialCondition','特殊条件','個人定義の特殊実験条件','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','ObservationNote','観察メモ','実験観察の自由記述メモ','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','HypothesisID','仮説ID','研究仮説識別子','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','SubjectiveEval','主観評価','研究者による主観的評価','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','LabNotebookRef','実験ノート参照','実験ノートページ参照','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','CustomParameter1','カスタムパラメータ1','独自定義パラメータ1','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','CustomParameter2','カスタムパラメータ2','独自定義パラメータ2','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','ResearchStage','研究フェーズ','研究の進捗フェーズ','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','CollaboratorID','共同研究者ID','共同研究者識別子','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','FundingSource','研究資金源','研究費助成元','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','ConfidenceLevel','信頼度','測定値の信頼度','floatType','%',NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','ReplicateNo','反復試験番号','反復試験の番号','intType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','AnomalyFlag','異常フラグ','データ異常検出フラグ','booleanType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','StatisticalPValue','p値','統計的有意性p値','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','ErrorBar','誤差範囲','グラフ誤差範囲','floatType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','CurationStatus','キュレーション状態','データキュレーション状態','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','RawDataRef','生データ参照','生データファイル参照','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','AnalysisScript','解析スクリプト','使用解析スクリプト名','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','PublicationRef','論文参照','関連論文DOI/参照','stringType',NULL,NOW(),NOW()),
  ('a0718dc5-21f3-44e6-87e9-cc2ae83f3385','MyWord','ExperimentalGoal','実験目的','実験の目的・仮説','stringType',NULL,NOW(),NOW())
;
