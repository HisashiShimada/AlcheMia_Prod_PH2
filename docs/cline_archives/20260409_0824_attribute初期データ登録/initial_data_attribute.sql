-- attribute テーブル初期データ投入スクリプト
-- 対象: units / formatString / scaleFactor の初期値
--
-- 使い方:
--   psql -v org_id="'対象のorganization_id(UUID)'" -f initial_data_attribute.sql
--   例: psql -v org_id="'550e8400-e29b-41d4-a716-446655440000'" -f initial_data_attribute.sql
--
-- ※ ON CONFLICT DO NOTHING により既存レコードはスキップされます（べき等処理）
-- ※ 実行ユーザーIDは 'system' を使用（必要に応じて変更してください）

\set organization_id :org_id
\set login_user_id '''system'''

INSERT INTO attribute (organization_id, attribute_name, attribute_value, attribute_remark, is_active, update_by, update_at)
VALUES
  -- units（単位）
  (:organization_id, 'units', 'm',     'メートル',         true, :login_user_id, NOW()),
  (:organization_id, 'units', 'cm',    'センチメートル',   true, :login_user_id, NOW()),
  (:organization_id, 'units', 'mm',    'ミリメートル',     true, :login_user_id, NOW()),
  (:organization_id, 'units', 'μm',    'マイクロメートル', true, :login_user_id, NOW()),
  (:organization_id, 'units', 'nm',    'ナノメートル',     true, :login_user_id, NOW()),
  (:organization_id, 'units', 'kg',    'キログラム',       true, :login_user_id, NOW()),
  (:organization_id, 'units', 'g',     'グラム',           true, :login_user_id, NOW()),
  (:organization_id, 'units', 'mg',    'ミリグラム',       true, :login_user_id, NOW()),
  (:organization_id, 'units', 'μg',    'マイクログラム',   true, :login_user_id, NOW()),
  (:organization_id, 'units', 'L',     'リットル',         true, :login_user_id, NOW()),
  (:organization_id, 'units', 'mL',    'ミリリットル',     true, :login_user_id, NOW()),
  (:organization_id, 'units', 'μL',    'マイクロリットル', true, :login_user_id, NOW()),
  (:organization_id, 'units', 'mol',   'モル',             true, :login_user_id, NOW()),
  (:organization_id, 'units', 'mmol',  'ミリモル',         true, :login_user_id, NOW()),
  (:organization_id, 'units', 'μmol',  'マイクロモル',     true, :login_user_id, NOW()),
  (:organization_id, 'units', '℃',     '摂氏度',           true, :login_user_id, NOW()),
  (:organization_id, 'units', 'K',     'ケルビン',         true, :login_user_id, NOW()),
  (:organization_id, 'units', 'Pa',    'パスカル',         true, :login_user_id, NOW()),
  (:organization_id, 'units', 'MPa',   'メガパスカル',     true, :login_user_id, NOW()),
  (:organization_id, 'units', 'GPa',   'ギガパスカル',     true, :login_user_id, NOW()),
  (:organization_id, 'units', 's',     '秒',               true, :login_user_id, NOW()),
  (:organization_id, 'units', 'ms',    'ミリ秒',           true, :login_user_id, NOW()),
  (:organization_id, 'units', 'μs',    'マイクロ秒',       true, :login_user_id, NOW()),
  (:organization_id, 'units', 'Hz',    'ヘルツ',           true, :login_user_id, NOW()),
  (:organization_id, 'units', 'kHz',   'キロヘルツ',       true, :login_user_id, NOW()),
  (:organization_id, 'units', 'MHz',   'メガヘルツ',       true, :login_user_id, NOW()),
  (:organization_id, 'units', '%',     'パーセント',       true, :login_user_id, NOW()),
  (:organization_id, 'units', 'ppm',   'ppm',              true, :login_user_id, NOW()),
  (:organization_id, 'units', 'rpm',   'rpm',              true, :login_user_id, NOW()),
  (:organization_id, 'units', 'wt%',   '重量パーセント',   true, :login_user_id, NOW()),
  (:organization_id, 'units', 'vol%',  '体積パーセント',   true, :login_user_id, NOW()),
  (:organization_id, 'units', 'at%',   '原子パーセント',   true, :login_user_id, NOW()),
  -- formatString（フォーマット文字列）
  (:organization_id, 'formatString', '%d',   '整数',                     true, :login_user_id, NOW()),
  (:organization_id, 'formatString', '%f',   '浮動小数点',               true, :login_user_id, NOW()),
  (:organization_id, 'formatString', '%.1f', '小数点以下1桁',            true, :login_user_id, NOW()),
  (:organization_id, 'formatString', '%.2f', '小数点以下2桁',            true, :login_user_id, NOW()),
  (:organization_id, 'formatString', '%.3f', '小数点以下3桁',            true, :login_user_id, NOW()),
  (:organization_id, 'formatString', '%.4f', '小数点以下4桁',            true, :login_user_id, NOW()),
  (:organization_id, 'formatString', '%e',   '指数表記',                 true, :login_user_id, NOW()),
  (:organization_id, 'formatString', '%.2e', '指数表記（小数点以下2桁）', true, :login_user_id, NOW()),
  (:organization_id, 'formatString', '%.3e', '指数表記（小数点以下3桁）', true, :login_user_id, NOW()),
  (:organization_id, 'formatString', '%s',   '文字列',                   true, :login_user_id, NOW()),
  -- scaleFactor（スケール係数）
  (:organization_id, 'scaleFactor', '1',     '×1（スケールなし）',  true, :login_user_id, NOW()),
  (:organization_id, 'scaleFactor', '10',    '×10',                 true, :login_user_id, NOW()),
  (:organization_id, 'scaleFactor', '100',   '×100',                true, :login_user_id, NOW()),
  (:organization_id, 'scaleFactor', '1000',  '×1000',               true, :login_user_id, NOW()),
  (:organization_id, 'scaleFactor', '0.1',   '×0.1',                true, :login_user_id, NOW()),
  (:organization_id, 'scaleFactor', '0.01',  '×0.01',               true, :login_user_id, NOW()),
  (:organization_id, 'scaleFactor', '0.001', '×0.001',              true, :login_user_id, NOW()),
  (:organization_id, 'scaleFactor', '1e-6',  '×10⁻⁶（マイクロ）',   true, :login_user_id, NOW()),
  (:organization_id, 'scaleFactor', '1e-9',  '×10⁻⁹（ナノ）',       true, :login_user_id, NOW()),
  (:organization_id, 'scaleFactor', '1e-12', '×10⁻¹²（ピコ）',      true, :login_user_id, NOW()),
  (:organization_id, 'scaleFactor', '1e3',   '×10³（キロ）',         true, :login_user_id, NOW()),
  (:organization_id, 'scaleFactor', '1e6',   '×10⁶（メガ）',         true, :login_user_id, NOW()),
  (:organization_id, 'scaleFactor', '1e9',   '×10⁹（ギガ）',         true, :login_user_id, NOW())
ON CONFLICT (organization_id, attribute_name, attribute_value) DO NOTHING;

SELECT COUNT(*) AS inserted_count FROM attribute
WHERE organization_id = :organization_id
  AND attribute_name IN ('units', 'formatString', 'scaleFactor');
