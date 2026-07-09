/**
 * 単位属性シードスクリプト
 *
 * attribute テーブルに attribute_name='単位' の初期データを投入します。
 *
 * 使用方法:
 *   npx ts-node scripts/seed-unit-attributes.ts <organization_id>
 *
 * 例:
 *   npx ts-node scripts/seed-unit-attributes.ts 550e8400-e29b-41d4-a716-446655440000
 */

import { Pool } from 'pg';
import * as path from 'path';

// 環境変数を読み込む（dotenv を require で呼び出し）
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

// 投入する単位一覧
const UNIT_VALUES = [
  'kg',
  'g',
  'mg',
  'μg',
  'L',
  'mL',
  'μL',
  'm',
  'cm',
  'mm',
  'μm',
  'nm',
  '℃',
  'K',
  'Pa',
  'kPa',
  'MPa',
  'GPa',
  'mol',
  'mmol',
  'μmol',
  'wt%',
  'vol%',
  '%',
  'min',
  'h',
  's',
  'ms',
  'rpm',
  'W',
  'kW',
  'V',
  'A',
  'mA',
  'Ω',
  'なし',
];

async function main() {
  const organizationId = process.argv[2];

  if (!organizationId) {
    console.error('エラー: organization_id を引数で指定してください');
    console.error('使用方法: npx ts-node scripts/seed-unit-attributes.ts <organization_id>');
    process.exit(1);
  }

  const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'mmdpf',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    console.log(`対象 organization_id: ${organizationId}`);
    console.log(`投入する単位数: ${UNIT_VALUES.length}`);

    let insertedCount = 0;
    let skippedCount  = 0;

    for (const unitValue of UNIT_VALUES) {
      // 既存チェック（主キー重複を避ける）
      const existing = await pool.query(
        `SELECT 1 FROM attribute
         WHERE organization_id = $1
           AND attribute_name  = '単位'
           AND attribute_value = $2`,
        [organizationId, unitValue]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        console.log(`  スキップ（既存）: ${unitValue}`);
        skippedCount++;
        continue;
      }

      await pool.query(
        `INSERT INTO attribute
           (organization_id, attribute_name, attribute_value, is_active, create_at, update_at)
         VALUES
           ($1, '単位', $2, true, NOW(), NOW())`,
        [organizationId, unitValue]
      );

      console.log(`  追加: ${unitValue}`);
      insertedCount++;
    }

    console.log('');
    console.log(`完了: ${insertedCount}件追加、${skippedCount}件スキップ`);
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
