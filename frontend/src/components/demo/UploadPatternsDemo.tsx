'use client';

import React, { useState } from 'react';
import { 
  Card, 
  Space, 
  Typography, 
  Upload, 
  Button, 
  message, 
  theme,
  Avatar,
  Divider,
  Tag,
  Row,
  Col
} from 'antd';
import { 
  UploadOutlined, 
  InboxOutlined,
  PlusOutlined,
  UserOutlined,
  FolderOpenOutlined
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;
const { useToken } = theme;

export default function UploadPatternsDemo() {
  const { token } = useToken();
  const [singleFileList, setSingleFileList] = useState<UploadFile[]>([]);
  const [multipleFileList, setMultipleFileList] = useState<UploadFile[]>([]);
  const [draggerFileList, setDraggerFileList] = useState<UploadFile[]>([]);
  const [pictureList, setPictureList] = useState<UploadFile[]>([]);
  const [avatarImageUrl, setAvatarImageUrl] = useState<string>('');
  const [directoryList, setDirectoryList] = useState<UploadFile[]>([]);

  // 共通のバリデーション関数
  const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
    const isLt = file.size / 1024 / 1024 < maxSizeMB;
    if (!isLt) {
      message.error(`ファイルサイズは${maxSizeMB}MB以下にしてください`);
    }
    return isLt;
  };

  const validateFileType = (file: File, allowedTypes: string[]): boolean => {
    const isAllowedType = allowedTypes.includes(file.type);
    if (!isAllowedType) {
      message.error('対応していないファイル形式です');
    }
    return isAllowedType;
  };

  // パターン1-1: 単一ファイルアップロード（ボタン型）
  const singleFileProps: UploadProps = {
    maxCount: 1,
    accept: '.pdf,.png,.jpg,.jpeg',
    fileList: singleFileList,
    beforeUpload: (file) => {
      const isValidSize = validateFileSize(file);
      const isValidType = validateFileType(file, [
        'application/pdf', 
        'image/png', 
        'image/jpeg'
      ]);
      
      if (!isValidSize || !isValidType) {
        return Upload.LIST_IGNORE;
      }
      return false; // 自動アップロードを無効化
    },
    onChange: (info) => {
      setSingleFileList(info.fileList);
      if (info.fileList.length === 0) {
        console.log('ファイルが削除されました');
      } else {
        console.log('選択されたファイル:', info.file);
      }
    },
    showUploadList: {
      showRemoveIcon: true,
      showPreviewIcon: false
    }
  };

  // パターン1-2: 複数ファイルアップロード（ボタン型）
  const multipleFileProps: UploadProps = {
    multiple: true,
    accept: '.pdf,.png,.jpg,.jpeg,.xlsx,.docx',
    fileList: multipleFileList,
    beforeUpload: (file) => {
      const isValidSize = validateFileSize(file);
      if (!isValidSize) {
        return Upload.LIST_IGNORE;
      }
      return false;
    },
    onChange: (info) => {
      setMultipleFileList(info.fileList);
      console.log('現在のファイルリスト:', info.fileList);
    },
    onRemove: (file) => {
      console.log('削除されたファイル:', file.name);
    },
    showUploadList: {
      showRemoveIcon: true,
      showPreviewIcon: true
    },
    listType: 'text'
  };

  // パターン2: ドラッグ&ドロップエリア
  const draggerProps: UploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    accept: '.pdf,.png,.jpg,.jpeg',
    fileList: draggerFileList,
    beforeUpload: (file) => {
      const isValidSize = validateFileSize(file);
      const isValidType = validateFileType(file, [
        'application/pdf', 
        'image/png', 
        'image/jpeg'
      ]);
      
      if (!isValidSize || !isValidType) {
        return Upload.LIST_IGNORE;
      }
      return false;
    },
    onChange: (info) => {
      setDraggerFileList(info.fileList);
      const { status } = info.file;
      if (status === 'done') {
        message.success(`${info.file.name} のアップロードが完了しました`);
      } else if (status === 'error') {
        message.error(`${info.file.name} のアップロードに失敗しました`);
      }
    }
  };

  // パターン3: 画像プレビュー付きアップロード
  const pictureCardProps: UploadProps = {
    listType: 'picture-card',
    maxCount: 5,
    fileList: pictureList,
    accept: 'image/*',
    beforeUpload: (file) => {
      const isValidSize = validateFileSize(file, 5);
      const isValidType = validateFileType(file, [
        'image/png', 
        'image/jpeg', 
        'image/gif', 
        'image/webp'
      ]);
      
      if (!isValidSize || !isValidType) {
        return Upload.LIST_IGNORE;
      }
      return false;
    },
    onChange: (info) => {
      setPictureList(info.fileList);
    },
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true
    }
  };

  // 応用パターン: アバター画像アップロード
  const avatarProps: UploadProps = {
    maxCount: 1,
    accept: 'image/*',
    showUploadList: false,
    beforeUpload: (file) => {
      const isValidSize = validateFileSize(file, 2);
      const isValidType = validateFileType(file, [
        'image/png', 
        'image/jpeg'
      ]);
      
      if (!isValidSize || !isValidType) {
        return Upload.LIST_IGNORE;
      }

      // プレビュー用にURLを生成
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarImageUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      return false;
    }
  };

  // 応用パターン: ディレクトリアップロード
  const directoryProps: UploadProps = {
    directory: true,
    fileList: directoryList,
    beforeUpload: (file) => {
      const isValidSize = validateFileSize(file, 50);
      if (!isValidSize) {
        return Upload.LIST_IGNORE;
      }
      return false;
    },
    onChange: (info) => {
      setDirectoryList(info.fileList);
    },
    showUploadList: {
      showRemoveIcon: true
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>ファイルアップロード形状ポリシー - デモ</Title>
      <Paragraph>
        upload_policy.mdで定義された標準3パターンと応用パターンのデモです。
      </Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* パターン1: ファイルアップロード（ボタン型） */}
        <Card 
          title={
            <Space>
              <Tag color="blue">標準パターン1</Tag>
              <Text strong>ファイルアップロード（ボタン型）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Paragraph>
                <Text strong>用途:</Text> 単一または複数ファイルの選択・アップロード（シンプルなUI）
              </Paragraph>
              <Paragraph>
                <Text strong>共通仕様:</Text>
                <ul>
                  <li>高さ: {token.controlHeight}px</li>
                  <li>ボタンタイプ: default（アウトライン）</li>
                  <li>アイコン: UploadOutlined</li>
                  <li>リストタイプ: text</li>
                  <li>リスト項目の高さ: 22px</li>
                  <li>リスト項目の間隔: 8px</li>
                </ul>
              </Paragraph>
            </div>

            <Divider orientation="left" orientationMargin={0}>単一ファイル版</Divider>
            <div>
              <Paragraph>
                <Text strong>仕様:</Text> maxCount: 1、対応形式: .pdf, .png, .jpg, .jpeg、最大サイズ: 10MB
              </Paragraph>
              <Upload {...singleFileProps}>
                <Button icon={<UploadOutlined />}>ファイルを選択</Button>
              </Upload>
              <Paragraph type="secondary" style={{ marginTop: 8 }}>
                選択されたファイル: {singleFileList.length > 0 ? singleFileList[0].name : 'なし'}
              </Paragraph>
            </div>

            <Divider orientation="left" orientationMargin={0}>複数ファイル版</Divider>
            <div>
              <Paragraph>
                <Text strong>仕様:</Text> multiple: true、対応形式: .pdf, .png, .jpg, .jpeg, .xlsx, .docx、最大サイズ: 10MB
              </Paragraph>
              <Upload {...multipleFileProps}>
                <Button icon={<UploadOutlined />}>
                  ファイルをアップロード
                  {multipleFileList.length > 0 && ` (選択済み: ${multipleFileList.length})`}
                </Button>
              </Upload>
              <Paragraph type="secondary" style={{ marginTop: 8 }}>
                選択されたファイル数: {multipleFileList.length}件
              </Paragraph>
            </div>
          </Space>
        </Card>

        {/* パターン2: ドラッグ&ドロップエリア */}
        <Card 
          title={
            <Space>
              <Tag color="blue">標準パターン2</Tag>
              <Text strong>ドラッグ&ドロップエリア</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph>
              <Text strong>用途:</Text> ビジュアル重視の単一/複数ファイルアップロード
            </Paragraph>
            <Paragraph>
              <Text strong>仕様:</Text>
              <ul>
                <li>最小高さ: 180px、推奨高さ: 200px</li>
                <li>ボーダー: 1px dashed</li>
                <li>角丸: {token.borderRadiusLG}px</li>
                <li>背景色（通常）: {token.colorBgLayout}</li>
                <li>背景色（ホバー）: {token.colorPrimaryBg}</li>
                <li>アイコンサイズ: 48px</li>
                <li>対応形式: .pdf, .png, .jpg, .jpeg</li>
                <li>最大サイズ: 10MB</li>
              </ul>
            </Paragraph>
            
            <Dragger {...draggerProps} style={{ minHeight: 200 }}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined 
                  style={{ 
                    fontSize: 48, 
                    color: token.colorPrimary 
                  }} 
                />
              </p>
              <p 
                className="ant-upload-text"
                style={{ 
                  fontSize: token.fontSize,
                  color: token.colorText 
                }}
              >
                ファイルをドラッグ&ドロップまたはクリックして選択
              </p>
              <p 
                className="ant-upload-hint"
                style={{ 
                  fontSize: token.fontSizeSM,
                  color: token.colorTextSecondary 
                }}
              >
                対応形式: .pdf, .png, .jpg | 最大サイズ: 10MB
              </p>
            </Dragger>

            <Paragraph type="secondary">
              選択されたファイル: {draggerFileList.length > 0 ? draggerFileList[0].name : 'なし'}
            </Paragraph>
          </Space>
        </Card>

        {/* パターン3: 画像プレビュー付きアップロード */}
        <Card 
          title={
            <Space>
              <Tag color="blue">標準パターン3</Tag>
              <Text strong>画像プレビュー付きアップロード</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph>
              <Text strong>用途:</Text> 画像ファイル専用アップロード（サムネイル表示）
            </Paragraph>
            <Paragraph>
              <Text strong>仕様:</Text>
              <ul>
                <li>listType: picture-card</li>
                <li>サムネイルサイズ: 104x104px</li>
                <li>角丸: {token.borderRadiusSM}px</li>
                <li>maxCount: 5</li>
                <li>対応形式: 画像のみ（image/*）</li>
                <li>最大サイズ: 5MB</li>
              </ul>
            </Paragraph>
            
            <Upload {...pictureCardProps}>
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>アップロード</div>
              </div>
            </Upload>

            <Paragraph type="secondary">
              選択された画像数: {pictureList.length}件
            </Paragraph>
          </Space>
        </Card>

        <Divider />

        {/* 応用パターン */}
        <Title level={3}>応用パターン</Title>

        <Row gutter={[16, 16]}>
          {/* アバター画像アップロード */}
          <Col xs={24} md={12}>
            <Card 
              title={
                <Space>
                  <Tag color="green">応用パターン</Tag>
                  <Text strong>アバター画像</Text>
                </Space>
              }
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }} align="center">
                <Paragraph>
                  <Text strong>用途:</Text> ユーザーアバター画像の設定
                </Paragraph>
                <Paragraph>
                  <Text strong>仕様:</Text>
                  <ul>
                    <li>円形表示: 直径120px</li>
                    <li>maxCount: 1</li>
                    <li>対応形式: 画像のみ</li>
                    <li>最大サイズ: 2MB</li>
                  </ul>
                </Paragraph>
                
                <Upload {...avatarProps}>
                  <Avatar 
                    size={120} 
                    icon={!avatarImageUrl && <UserOutlined />}
                    src={avatarImageUrl}
                    style={{ cursor: 'pointer' }}
                  />
                </Upload>

                <Paragraph type="secondary">
                  アバター画像をクリックして変更
                </Paragraph>
              </Space>
            </Card>
          </Col>

          {/* ディレクトリアップロード */}
          <Col xs={24} md={12}>
            <Card 
              title={
                <Space>
                  <Tag color="green">応用パターン</Tag>
                  <Text strong>ディレクトリアップロード</Text>
                </Space>
              }
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Paragraph>
                  <Text strong>用途:</Text> フォルダごとの一括アップロード
                </Paragraph>
                <Paragraph>
                  <Text strong>仕様:</Text>
                  <ul>
                    <li>directory属性: true</li>
                    <li>フォルダ構造を保持</li>
                    <li>最大サイズ: 50MB/ファイル</li>
                  </ul>
                </Paragraph>
                
                <div>
                  <Upload {...directoryProps}>
                    <Button icon={<FolderOpenOutlined />}>
                      フォルダを選択
                      {directoryList.length > 0 && ` (選択済み: ${directoryList.length}ファイル)`}
                    </Button>
                  </Upload>
                </div>

                <Paragraph type="secondary">
                  選択されたファイル数: {directoryList.length}件
                </Paragraph>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 色定義サンプル */}
        <Card title="色定義サンプル">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Row gutter={[16, 8]}>
              <Col span={6}>
                <Text strong>プライマリ:</Text>
              </Col>
              <Col span={18}>
                <Space>
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    backgroundColor: token.colorPrimary,
                    border: '1px solid #ddd',
                    borderRadius: 4
                  }} />
                  <Text code>{token.colorPrimary}</Text>
                </Space>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col span={6}>
                <Text strong>成功:</Text>
              </Col>
              <Col span={18}>
                <Space>
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    backgroundColor: token.colorSuccess,
                    border: '1px solid #ddd',
                    borderRadius: 4
                  }} />
                  <Text code>{token.colorSuccess}</Text>
                </Space>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col span={6}>
                <Text strong>エラー:</Text>
              </Col>
              <Col span={18}>
                <Space>
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    backgroundColor: token.colorError,
                    border: '1px solid #ddd',
                    borderRadius: 4
                  }} />
                  <Text code>{token.colorError}</Text>
                </Space>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col span={6}>
                <Text strong>背景（レイアウト）:</Text>
              </Col>
              <Col span={18}>
                <Space>
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    backgroundColor: token.colorBgLayout,
                    border: '1px solid #ddd',
                    borderRadius: 4
                  }} />
                  <Text code>{token.colorBgLayout}</Text>
                </Space>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col span={6}>
                <Text strong>背景（プライマリ）:</Text>
              </Col>
              <Col span={18}>
                <Space>
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    backgroundColor: token.colorPrimaryBg,
                    border: '1px solid #ddd',
                    borderRadius: 4
                  }} />
                  <Text code>{token.colorPrimaryBg}</Text>
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* 使用上の注意 */}
        <Card title="使用上の注意">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Title level={5}>DO（推奨）</Title>
              <ul>
                <li>✅ ファイルサイズ制限を明示する</li>
                <li>✅ 対応ファイル形式を明示する</li>
                <li>✅ アップロード状態を視覚的にフィードバックする</li>
                <li>✅ エラーメッセージは具体的に記述する</li>
                <li>✅ 大容量ファイルはプログレスバーを表示する</li>
                <li>✅ アクセシビリティを考慮する</li>
              </ul>
            </Col>
            <Col xs={24} md={12}>
              <Title level={5}>DON&apos;T（非推奨）</Title>
              <ul>
                <li>❌ バリデーションなしでアップロードを許可しない</li>
                <li>❌ 制限事項を隠さない</li>
                <li>❌ アップロード中のフィードバックを省略しない</li>
                <li>❌ ファイルリストの削除ボタンを省略しない</li>
                <li>❌ モバイル環境を考慮しないUIにしない</li>
                <li>❌ 同時に複数パターンを混在させない</li>
              </ul>
            </Col>
          </Row>
        </Card>
      </Space>
    </div>
  );
}
