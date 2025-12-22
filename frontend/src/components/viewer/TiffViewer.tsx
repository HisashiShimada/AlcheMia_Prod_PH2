// frontend/src/components/viewer/TiffViewer.tsx
// TIFFファイルビューアコンポーネント（Ant Design v6版）

'use client';

import React, { useState } from 'react';
import { Card, Button, Space, Typography, Alert, Flex } from 'antd';
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  ReloadOutlined,
  DownloadOutlined,
  FileImageOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface TiffViewerProps {
  fileKey: string;
  fileName: string;
}

/**
 * TiffViewer コンポーネント
 * TIFFファイルの表示（ブラウザ制限によりダウンロード推奨）
 */
const TiffViewer: React.FC<TiffViewerProps> = ({ fileKey, fileName }) => {
  const [scale, setScale] = useState(1);

  // バイナリURLの生成（タイムスタンプ付き）
  // const imageUrl = `/api/s3/file-binary?key=${encodeURIComponent(fileKey)}&t=${new Date().getTime()}`;
  
  // ✅ API呼び出しをコメントアウト - モック用
  const imageUrl = '#'; // モック: 実際のAPIエンドポイント

  /**
   * 拡大
   */
  const handleZoomIn = (): void => {
    setScale(prevScale => Math.min(prevScale * 1.2, 5));
  };

  /**
   * 縮小
   */
  const handleZoomOut = (): void => {
    setScale(prevScale => Math.max(prevScale / 1.2, 0.1));
  };

  /**
   * リセット
   */
  const handleReset = (): void => {
    setScale(1);
  };

  /**
   * ダウンロード
   */
  const handleDownload = (): void => {
    // ✅ モック: 実際のダウンロード処理
    // const link = document.createElement('a');
    // link.href = imageUrl;
    // link.download = fileName;
    // link.click();
    console.log('TIFFファイルダウンロード:', fileName);
    alert(`モック: ${fileName} をダウンロードします`);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ツールバー */}
      <Card 
        size="small"
        style={{ borderRadius: 0 }}
      >
        <Flex justify="space-between" align="center">
          <Space>
            <FileImageOutlined style={{ fontSize: 20, color: '#CF0027' }} />
            <Title level={5} style={{ margin: 0 }}>
              {fileName || 'TIFFファイル'}
            </Title>
          </Space>
          
          <Space>
            <Button 
              size="small"
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
            >
              拡大
            </Button>
            <Button 
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={handleZoomOut}
            >
              縮小
            </Button>
            <Button 
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              リセット
            </Button>
            <Button 
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
            >
              ダウンロード
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* コンテンツエリア */}
      <div style={{ 
        flex: 1, 
        padding: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        background: '#f5f5f5'
      }}>
        <Space direction="vertical" size="large" style={{ textAlign: 'center' }}>
          <Alert
            message="TIFFファイルが選択されました"
            description={
              <Space direction="vertical" size="small">
                <Text>{fileName}</Text>
                <Text type="secondary">
                  ブラウザでのTIFF表示には制限があります。
                </Text>
                <Text type="secondary">
                  ダウンロードボタンを使用して画像を表示することをお勧めします。
                </Text>
              </Space>
            }
            type="info"
            showIcon
          />

          <Button 
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
          >
            TIFFファイルをダウンロード
          </Button>

          {/* モック表示用の情報 */}
          <Card size="small" style={{ marginTop: 16 }}>
            <Space direction="vertical" size="small">
              <Text type="secondary" style={{ fontSize: 12 }}>
                <strong>モックモード:</strong> API呼び出しはコメントアウトされています
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ファイルキー: {fileKey}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ズーム倍率: {scale.toFixed(2)}x
              </Text>
            </Space>
          </Card>
        </Space>
      </div>
    </div>
  );
};

export default TiffViewer;
