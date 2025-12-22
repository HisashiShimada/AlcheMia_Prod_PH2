import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

/**
 * mockディレクトリの静的ファイルを配信するAPIルート
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // パスを結合
    const filePath = params.path.join('/');
    
    // mockディレクトリのルートパス（プロジェクトルート/frontend/mock）
    const mockDir = join(process.cwd(), 'mock');
    const fullPath = join(mockDir, filePath);
    
    // デバッグログ
    console.log('=== Certificate Download Debug ===');
    console.log('Requested path:', filePath);
    console.log('Mock directory:', mockDir);
    console.log('Full path:', fullPath);
    console.log('Current working directory:', process.cwd());
    
    // ファイルの存在確認
    try {
      await access(fullPath, constants.R_OK);
      console.log('File access: OK');
    } catch (accessError) {
      console.error('File access error:', accessError);
      throw new Error(`File not accessible: ${fullPath}`);
    }
    
    // ファイルを読み込み
    const fileBuffer = await readFile(fullPath);
    console.log('File read successfully, size:', fileBuffer.length, 'bytes');
    
    // Content-Typeを設定
    const contentType = getContentType(filePath);
    console.log('Content-Type:', contentType);
    console.log('=================================');
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filePath.split('/').pop()}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('=== Certificate Download Error ===');
    console.error('Error details:', error);
    console.error('=====================================');
    return new NextResponse(
      JSON.stringify({ 
        error: 'File not found',
        message: error instanceof Error ? error.message : 'Unknown error',
        path: params.path.join('/')
      }), 
      { 
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

/**
 * ファイル拡張子からContent-Typeを取得
 */
function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  const contentTypes: Record<string, string> = {
    'crt': 'application/x-x509-ca-cert',
    'pem': 'application/x-pem-file',
    'key': 'application/x-pem-file',
    'p12': 'application/x-pkcs12',
    'json': 'application/json',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'xml': 'application/xml',
    'pdf': 'application/pdf',
  };
  
  return contentTypes[ext || ''] || 'application/octet-stream';
}
