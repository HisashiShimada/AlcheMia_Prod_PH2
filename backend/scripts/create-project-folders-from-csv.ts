/**
 * CSVファイルからプロジェクトフォルダ構造を作成するスクリプト
 * 
 * test_data/public.project.csv を読み込み、
 * サーバーSwift環境に各プロジェクトのフォルダを作成し、
 * 存在確認用のMAIMLファイルを配置します
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

// サーバーSwift設定
const SERVER_SWIFT_CONFIG = {
  endpoint: 'http://10.1.1.219:3002',
  credentials: {
    accessKeyId: 'test:tester',
    secretAccessKey: 'testing',
  },
  region: 'us-east-1',
  forcePathStyle: true,
};

const CONTAINER_NAME = 'mmdpf-files';

// 組織CSVファイルを読み込む
function readOrganizationsFromCSV(csvPath: string): Map<string, string> {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // ヘッダー行をスキップ
  const dataLines = lines.slice(1);
  
  const orgMap = new Map<string, string>();
  
  for (const line of dataLines) {
    // CSVパース: {organization_id},"organization_name","organization_display_name","organization_prefix",...
    // 中括弧付きのorganization_idに対応
    const match = line.match(/^(\{[^}]+\}),"([^"]+)","([^"]+)","([^"]+)"/);
    if (match) {
      const [, organizationId, , , organizationPrefix] = match;
      const cleanOrgId = organizationId.replace(/[{}]/g, '');
      orgMap.set(cleanOrgId, organizationPrefix);
    }
  }
  
  return orgMap;
}

// 簡易的なMAIMLファイルを生成
function generateSimpleMAIML(projectName: string, description: string): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<MAIML version="1.0" xmlns="http://maiml.org/schema/v1">
  <Project>
    <Name>${projectName}</Name>
    <Description>${description}</Description>
    <CreatedAt>${now}</CreatedAt>
    <Status>存在確認用ファイル - スクリプトにより自動生成</Status>
  </Project>
  <Methods>
    <Method id="method_001" name="サンプルメソッド">
      <Description>このファイルはプロジェクト存在確認用のダミーファイルです。</Description>
      <PetriNet>
        <Places>
          <Place id="p1" name="開始" tokens="1" />
          <Place id="p2" name="終了" tokens="0" />
        </Places>
        <Transitions>
          <Transition id="t1" name="サンプル処理" />
        </Transitions>
        <Arcs>
          <Arc from="p1" to="t1" weight="1" />
          <Arc from="t1" to="p2" weight="1" />
        </Arcs>
      </PetriNet>
    </Method>
  </Methods>
</MAIML>`;
}

interface ProjectData {
  organizationId: string;
  projectId: string;
  projectName: string;
  description: string;
}

// CSVファイルを読み込んでプロジェクトデータを取得
function readProjectsFromCSV(csvPath: string): ProjectData[] {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // ヘッダー行をスキップ
  const dataLines = lines.slice(1);
  
  const projects: ProjectData[] = [];
  
  for (const line of dataLines) {
    // CSVパース: {organization_id},{project_id},"project_name","description",...
    // 中括弧付きのIDに対応
    const match = line.match(/^(\{[^}]+\}),(\{[^}]+\}),"([^"]+)","([^"]+)"/);
    if (match) {
      const [, organizationId, projectId, projectName, description] = match;
      projects.push({
        organizationId: organizationId.replace(/[{}]/g, ''), // {} を削除
        projectId: projectId.replace(/[{}]/g, ''),
        projectName,
        description,
      });
    }
  }
  
  return projects;
}

async function createProjectFolders() {
  console.log('='.repeat(80));
  console.log('CSVからプロジェクトフォルダ構造を作成');
  console.log('='.repeat(80));
  console.log();

  try {
    // 組織CSVファイルの読み込み
    const orgCsvPath = path.join(__dirname, '../../test_data/public.organization.csv');
    console.log('1. 組織情報CSVの読み込み...');
    console.log(`   ファイル: ${orgCsvPath}`);
    
    if (!fs.existsSync(orgCsvPath)) {
      throw new Error(`組織CSVファイルが見つかりません: ${orgCsvPath}`);
    }
    
    const organizationMap = readOrganizationsFromCSV(orgCsvPath);
    console.log(`   ✅ ${organizationMap.size} 件の組織を読み込みました`);
    organizationMap.forEach((prefix, orgId) => {
      console.log(`      ${orgId.substring(0, 8)}... -> org_${prefix}`);
    });
    console.log();

    // プロジェクトCSVファイルの読み込み
    const projectCsvPath = path.join(__dirname, '../../test_data/public.project.csv');
    console.log('2. プロジェクト情報CSVの読み込み...');
    console.log(`   ファイル: ${projectCsvPath}`);
    
    if (!fs.existsSync(projectCsvPath)) {
      throw new Error(`プロジェクトCSVファイルが見つかりません: ${projectCsvPath}`);
    }
    
    const projects = readProjectsFromCSV(projectCsvPath);
    console.log(`   ✅ ${projects.length} 件のプロジェクトを読み込みました`);
    console.log();

    // S3クライアントの初期化
    console.log('3. サーバーSwiftへの接続...');
    console.log(`   接続先: ${SERVER_SWIFT_CONFIG.endpoint}`);
    console.log(`   コンテナ: ${CONTAINER_NAME}`);
    const client = new S3Client(SERVER_SWIFT_CONFIG);
    console.log('   ✅ 接続成功');
    console.log();

    // 各プロジェクトのフォルダとファイルを作成
    console.log('4. プロジェクトフォルダとMAIMLファイルの作成...');
    console.log();

    let successCount = 0;
    let errorCount = 0;
    const skippedProjects: string[] = [];

    for (const project of projects) {
      const organizationPrefix = organizationMap.get(project.organizationId);
      
      if (!organizationPrefix) {
        console.log(`   ⚠️  組織ID ${project.organizationId} のプレフィックスが見つかりません - スキップ`);
        skippedProjects.push(project.projectName);
        continue;
      }
      
      const orgPrefix = `org_${organizationPrefix}`;
      const filePath = `${orgPrefix}/projects/${project.projectName}/${project.projectName}.maiml`;
      
      try {
        // MAIMLファイルを生成
        const maimlContent = generateSimpleMAIML(project.projectName, project.description);
        
        // S3にアップロード
        const putCommand = new PutObjectCommand({
          Bucket: CONTAINER_NAME,
          Key: filePath,
          Body: Buffer.from(maimlContent, 'utf-8'),
          ContentType: 'application/xml',
        });
        
        await client.send(putCommand);
        console.log(`   ✅ ${filePath}`);
        successCount++;
        
      } catch (error: any) {
        console.log(`   ❌ ${filePath} - エラー: ${error.message}`);
        errorCount++;
      }
    }

    console.log();
    console.log('='.repeat(80));
    console.log('作成結果:');
    console.log('='.repeat(80));
    console.log(`  成功: ${successCount} 件`);
    console.log(`  失敗: ${errorCount} 件`);
    console.log(`  スキップ: ${skippedProjects.length} 件`);
    console.log(`  合計: ${projects.length} 件`);
    
    if (skippedProjects.length > 0) {
      console.log();
      console.log('  スキップされたプロジェクト:');
      skippedProjects.forEach(name => {
        console.log(`    - ${name}`);
      });
    }
    console.log();

    // プロジェクト一覧を表示
    console.log('='.repeat(80));
    console.log('作成されたプロジェクト一覧:');
    console.log('='.repeat(80));
    console.log();
    
    projects.forEach((project, index) => {
      const organizationPrefix = organizationMap.get(project.organizationId);
      const orgPrefix = organizationPrefix ? `org_${organizationPrefix}` : '(組織不明)';
      console.log(`${index + 1}. ${project.projectName}`);
      console.log(`   説明: ${project.description}`);
      console.log(`   組織: ${orgPrefix}`);
      console.log(`   パス: ${orgPrefix}/projects/${project.projectName}/`);
      console.log();
    });

    console.log('='.repeat(80));
    console.log('✅ プロジェクトフォルダ構造の作成が完了しました！');
    console.log('='.repeat(80));
    console.log();
    console.log('確認方法:');
    console.log('  1. npx ts-node backend/scripts/check-server-swift-files.ts');
    console.log('  2. Cyberduckでサーバーに接続（10.1.1.219:9090）');
    console.log('     - アクセスキー: test:tester / testing');
    console.log('     - コンテナ: mmdpf-files');
    console.log();

    process.exit(0);

  } catch (error: any) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ エラーが発生しました');
    console.error('='.repeat(80));
    console.error('エラー詳細:', error.message);
    console.error();
    
    if (error.stack) {
      console.error('スタックトレース:');
      console.error(error.stack);
      console.error();
    }
    
    console.error('トラブルシューティング:');
    console.error('  1. CSVファイルが存在するか確認:');
    console.error('     ls -la test_data/public.project.csv');
    console.error('  2. サーバーSwiftが起動しているか確認:');
    console.error('     curl http://10.1.1.219:3002');
    console.error();
    
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  createProjectFolders();
}

export default createProjectFolders;