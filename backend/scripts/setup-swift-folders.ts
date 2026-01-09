/**
 * Swift環境にテストデータ用のフォルダ構造を自動生成するスクリプト
 * 
 * 処理内容:
 * 1. test_data/public.organization.csv を読み込み
 * 2. test_data/public.project.csv を読み込み
 * 3. 組織ごとにorg_{prefix}フォルダを作成
 * 4. 各組織配下にprojects/フォルダを作成
 * 5. 各プロジェクト配下に{project_name}/フォルダを作成
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { getStorageService } from '../src/services/storageService';

// 環境変数の読み込み
dotenv.config({ path: path.join(__dirname, '../.env') });

// CSVパーサー（簡易版）
function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  return lines.slice(1).map(line => {
    // CSVのカンマ分割（ダブルクォート内のカンマは無視）
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
    });
    return row;
  }).filter(row => Object.keys(row).length > 0 && row.organization_id);
}

// 組織IDからプレフィックスを取得
function getOrganizationPrefix(organizationName: string): string {
  const prefixMap: { [key: string]: string } = {
    'AIML研究所': 'aiml_lab',
    'システム管理組織': 'system_admin'
  };
  
  return prefixMap[organizationName] || 'unknown';
}

async function main() {
  console.log('='.repeat(80));
  console.log('Swift フォルダ構造セットアップ');
  console.log('='.repeat(80));
  console.log();

  try {
    // StorageServiceの初期化
    console.log('1. StorageServiceの初期化...');
    const storage = getStorageService();
    console.log(`   ✅ ストレージタイプ: ${storage.getStorageType()}`);
    console.log(`   ✅ コンテナ/バケット: ${storage.getBucketName()}`);
    console.log();

    // 組織データの読み込み
    console.log('2. 組織データの読み込み...');
    const orgCsvPath = path.join(__dirname, '../../test_data/public.organization.csv');
    const orgCsvContent = fs.readFileSync(orgCsvPath, 'utf-8');
    const organizations = parseCSV(orgCsvContent);
    
    console.log(`   ✅ ${organizations.length} 件の組織を読み込みました`);
    organizations.forEach(org => {
      const prefix = getOrganizationPrefix(org.organization_name);
      console.log(`      - ${org.organization_name} (org_${prefix})`);
    });
    console.log();

    // プロジェクトデータの読み込み
    console.log('3. プロジェクトデータの読み込み...');
    const projectCsvPath = path.join(__dirname, '../../test_data/public.project.csv');
    const projectCsvContent = fs.readFileSync(projectCsvPath, 'utf-8');
    const projects = parseCSV(projectCsvContent);
    
    console.log(`   ✅ ${projects.length} 件のプロジェクトを読み込みました`);
    console.log();

    // 組織ごとにフォルダ構造を作成
    console.log('4. フォルダ構造の作成...');
    console.log();

    for (const org of organizations) {
      const prefix = getOrganizationPrefix(org.organization_name);
      const orgPrefix = `org_${prefix}`;
      
      console.log(`[組織] ${org.organization_name}`);
      console.log(`   プレフィックス: ${orgPrefix}`);
      
      // 組織配下のプロジェクトを取得
      const orgProjects = projects.filter(p => 
        p.organization_id === org.organization_id
      );
      
      console.log(`   プロジェクト数: ${orgProjects.length}`);
      
      if (orgProjects.length > 0) {
        // projects/ フォルダ配下にプロジェクトフォルダを作成
        for (const project of orgProjects) {
          const folderPath = `projects/${project.project_name}/`;
          const fullPath = `${orgPrefix}/${folderPath}`;
          
          // ダミーファイルを作成してフォルダを確保
          const dummyContent = Buffer.from(
            `# ${project.project_name}\n\n` +
            `プロジェクト名: ${project.project_name}\n` +
            `説明: ${project.description}\n` +
            `作成日: ${project.create_at}\n`
          );
          
          try {
            await storage.uploadFile(
              prefix,  // organizationId として使用
              folderPath + 'README.md',
              dummyContent,
              { contentType: 'text/markdown' }
            );
            console.log(`   ✅ ${fullPath}README.md`);
          } catch (error: any) {
            console.log(`   ❌ ${fullPath}README.md - エラー: ${error.message}`);
          }
        }
      } else {
        // プロジェクトがない場合は projects/.keep を作成
        const keepPath = 'projects/.keep';
        const fullPath = `${orgPrefix}/${keepPath}`;
        
        try {
          await storage.uploadFile(
            prefix,
            keepPath,
            Buffer.from(''),
            { contentType: 'text/plain' }
          );
          console.log(`   ✅ ${fullPath} (プロジェクトなし)`);
        } catch (error: any) {
          console.log(`   ❌ ${fullPath} - エラー: ${error.message}`);
        }
      }
      
      console.log();
    }

    console.log('='.repeat(80));
    console.log('✅ フォルダ構造の作成が完了しました！');
    console.log('='.repeat(80));
    console.log();
    
    // 作成された構造を表示
    console.log('作成されたフォルダ構造:');
    console.log();
    
    for (const org of organizations) {
      const prefix = getOrganizationPrefix(org.organization_name);
      const orgPrefix = `org_${prefix}`;
      const orgProjects = projects.filter(p => 
        p.organization_id === org.organization_id
      );
      
      console.log(`${orgPrefix}/`);
      console.log(`  └── projects/`);
      
      if (orgProjects.length > 0) {
        orgProjects.forEach((project, index) => {
          const isLast = index === orgProjects.length - 1;
          const symbol = isLast ? '└──' : '├──';
          console.log(`      ${symbol} ${project.project_name}/`);
          console.log(`          └── README.md`);
        });
      } else {
        console.log(`      └── .keep`);
      }
      console.log();
    }

    console.log('='.repeat(80));
    console.log('確認方法:');
    console.log('='.repeat(80));
    console.log();
    console.log('方法1: Cyberduck');
    console.log('  1. Cyberduckで mmdpf-files に接続');
    console.log('  2. フォルダ構造を確認');
    console.log();
    console.log('方法2: CLI');
    console.log('  docker exec -it mmdpf-swift bash');
    console.log('  swift -A http://localhost:8080/auth/v1.0 \\');
    console.log('    -U test:tester -K testing list mmdpf-files');
    console.log();

  } catch (error: any) {
    console.error('❌ エラーが発生しました:');
    console.error(`   ${error.message}`);
    console.error();
    console.error('スタックトレース:');
    console.error(error.stack);
    process.exit(1);
  }
}

// スクリプト実行
main();