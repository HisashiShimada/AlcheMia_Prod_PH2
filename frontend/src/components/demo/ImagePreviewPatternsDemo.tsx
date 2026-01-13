'use client';

import React, { useState } from 'react';
import { Image, Space, Card, Typography, Divider, Row, Col, theme, Empty } from 'antd';
import { PictureOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;

/**
 * 画像表示（プレビュー機能付き）パターンデモ
 * 
 * 参照: docs/design/ui/image_preview_policy.md
 */
export default function ImagePreviewPatternsDemo() {
  const { token } = useToken();
  const [selectedImage, setSelectedImage] = useState<string>('https://picsum.photos/400/300?random=1');

  // サンプル画像URL（Lorem Picsum使用）
  const sampleImages = [
    'https://picsum.photos/400/300?random=1',
    'https://picsum.photos/400/300?random=2',
    'https://picsum.photos/400/300?random=3',
    'https://picsum.photos/400/300?random=4',
    'https://picsum.photos/400/300?random=5',
    'https://picsum.photos/400/300?random=6',
  ];

  const galleryImages = [
    'https://picsum.photos/200/200?random=7',
    'https://picsum.photos/200/200?random=8',
    'https://picsum.photos/200/200?random=9',
    'https://picsum.photos/200/200?random=10',
    'https://picsum.photos/200/200?random=11',
    'https://picsum.photos/200/200?random=12',
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>画像表示（プレビュー機能付き）パターン集</Title>
      <Paragraph>
        参照: <Text code>docs/design/ui/image_preview_policy.md</Text>
      </Paragraph>

      <Divider />

      {/* パターン1: サムネイル表示 */}
      <section style={{ marginBottom: 48 }}>
        <Title level={3}>パターン1: サムネイル表示</Title>
        <Paragraph>
          用途: リスト内、カード内での小型表示
        </Paragraph>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 64x64 サムネイル */}
          <Card title="サイズ: 64x64px">
            <Space size={16}>
              <Image
                width={64}
                height={64}
                src="https://picsum.photos/200/200?random=13"
                alt="サンプル画像1"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'cover',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
              <Image
                width={64}
                height={64}
                src="https://picsum.photos/200/200?random=14"
                alt="サンプル画像2"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'cover',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
              <Image
                width={64}
                height={64}
                src="https://picsum.photos/200/200?random=15"
                alt="サンプル画像3"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'cover',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
            </Space>
            <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
              <Text type="secondary">クリックすると拡大表示されます</Text>
            </Paragraph>
          </Card>

          {/* 96x96 サムネイル */}
          <Card title="サイズ: 96x96px">
            <Space size={16}>
              <Image
                width={96}
                height={96}
                src="https://picsum.photos/200/200?random=16"
                alt="サンプル画像4"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'cover',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
              <Image
                width={96}
                height={96}
                src="https://picsum.photos/200/200?random=17"
                alt="サンプル画像5"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'cover',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
              <Image
                width={96}
                height={96}
                src="https://picsum.photos/200/200?random=18"
                alt="サンプル画像6"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'cover',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
            </Space>
            <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
              <Text type="secondary">ホバーすると半透明オーバーレイと拡大アイコンが表示されます</Text>
            </Paragraph>
          </Card>
        </Space>
      </section>

      <Divider />

      {/* パターン2: 通常表示 */}
      <section style={{ marginBottom: 48 }}>
        <Title level={3}>パターン2: 通常表示</Title>
        <Paragraph>
          用途: 詳細画面、フォームでの標準的な表示
        </Paragraph>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 200x150 通常表示 */}
          <Card title="サイズ: 200x150px（4:3比率）">
            <Space size={16}>
              <Image
                width={200}
                height={150}
                src="https://picsum.photos/400/300?random=19"
                alt="サンプル画像7"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'contain',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
              <Image
                width={200}
                height={150}
                src="https://picsum.photos/400/300?random=20"
                alt="サンプル画像8"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'contain',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
            </Space>
            <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
              <Text type="secondary">objectFit: 'contain' - 全体表示</Text>
            </Paragraph>
          </Card>

          {/* 240x180 通常表示 */}
          <Card title="サイズ: 240x180px（4:3比率）">
            <Space size={16}>
              <Image
                width={240}
                height={180}
                src="https://picsum.photos/400/300?random=21"
                alt="サンプル画像9"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'contain',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
              <Image
                width={240}
                height={180}
                src="https://picsum.photos/400/300?random=22"
                alt="サンプル画像10"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'contain',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
            </Space>
            <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
              <Text type="secondary">クリックでプレビューモーダルが開きます</Text>
            </Paragraph>
          </Card>
        </Space>
      </section>

      <Divider />

      {/* パターン3: プレビューモーダル */}
      <section style={{ marginBottom: 48 }}>
        <Title level={3}>パターン3: プレビューモーダル</Title>
        <Paragraph>
          用途: 画像の拡大表示（自動で表示されます）
        </Paragraph>

        <Card title="プレビュー機能">
          <Paragraph>
            画像をクリックすると、プレビューモーダルが開きます。以下の機能が利用できます：
          </Paragraph>
          <ul>
            <li>ズームイン/アウト（マウスホイールまたはボタン）</li>
            <li>回転（時計回り/反時計回り）</li>
            <li>元のサイズに戻す</li>
            <li>ダウンロード</li>
            <li>閉じる（×ボタン、ESCキー、背景クリック）</li>
          </ul>

          <Image
            width={240}
            height={180}
            src="https://picsum.photos/800/600?random=23"
            alt="プレビュー機能デモ"
            style={{
              borderRadius: token.borderRadius,
              objectFit: 'contain',
              border: `1px solid ${token.colorBorder}`
            }}
          />
          <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
            <Text type="secondary">この画像をクリックしてプレビュー機能を試してください</Text>
          </Paragraph>
        </Card>
      </section>

      <Divider />

      {/* 複数画像表示パターンA: グリッド表示 */}
      <section style={{ marginBottom: 48 }}>
        <Title level={3}>複数画像表示パターンA: グリッド表示（ギャラリー）</Title>
        <Paragraph>
          用途: 複数の画像を一覧表示
        </Paragraph>

        <Card title="ギャラリー表示">
          <Image.PreviewGroup>
            <Space size={16} wrap>
              {galleryImages.map((img, index) => (
                <Image
                  key={index}
                  width={96}
                  height={96}
                  src={img}
                  alt={`ギャラリー画像 ${index + 1}`}
                  style={{
                    borderRadius: token.borderRadius,
                    objectFit: 'cover',
                    border: `1px solid ${token.colorBorder}`
                  }}
                />
              ))}
            </Space>
          </Image.PreviewGroup>
          <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
            <Text type="secondary">
              画像をクリックしてプレビュー表示。左右矢印キーで画像を切り替えできます
            </Text>
          </Paragraph>
        </Card>
      </section>

      <Divider />

      {/* 複数画像表示パターンB: カルーセル表示 */}
      <section style={{ marginBottom: 48 }}>
        <Title level={3}>複数画像表示パターンB: カルーセル表示</Title>
        <Paragraph>
          用途: メイン画像とサムネイル選択
        </Paragraph>

        <Card title="メイン画像 + サムネイル選択">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {/* メイン画像 */}
            <div style={{ textAlign: 'center' }}>
              <Image
                width={400}
                height={300}
                src={selectedImage}
                alt="選択された画像"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'contain',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
            </div>

            {/* サムネイル選択 */}
            <div style={{ textAlign: 'center' }}>
              <Space size={8}>
                {sampleImages.map((img, index) => (
                  <Image
                    key={index}
                    width={64}
                    height={64}
                    src={img}
                    alt={`サムネイル ${index + 1}`}
                    preview={false}
                    onClick={() => setSelectedImage(img)}
                    style={{
                      borderRadius: token.borderRadius,
                      objectFit: 'cover',
                      cursor: 'pointer',
                      border: selectedImage === img
                        ? `2px solid ${token.colorPrimary}`
                        : `1px solid ${token.colorBorder}`,
                      transition: 'all 0.3s'
                    }}
                  />
                ))}
              </Space>
            </div>
          </Space>
          <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
            <Text type="secondary">
              サムネイルをクリックするとメイン画像が切り替わります。選択中のサムネイルは赤枠で表示されます
            </Text>
          </Paragraph>
        </Card>
      </section>

      <Divider />

      {/* エラーハンドリング */}
      <section style={{ marginBottom: 48 }}>
        <Title level={3}>エラーハンドリング</Title>
        <Paragraph>
          画像が読み込めない場合の表示
        </Paragraph>

        <Card title="フォールバック表示">
          <Space size={16}>
            <Image
              width={200}
              height={150}
              src="https://invalid-url.example.com/image.jpg"
              alt="存在しない画像"
              fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23f5f5f5' width='200' height='150'/%3E%3C/svg%3E"
              placeholder={
                <div style={{
                  width: 200,
                  height: 150,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: token.colorBgContainerDisabled,
                  border: `1px dashed ${token.colorBorder}`,
                  borderRadius: token.borderRadius
                }}>
                  <PictureOutlined style={{ fontSize: 32, color: token.colorTextSecondary }} />
                </div>
              }
              style={{
                borderRadius: token.borderRadius,
                objectFit: 'contain',
                border: `1px solid ${token.colorBorder}`
              }}
            />
          </Space>
          <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
            <Text type="secondary">
              画像が読み込めない場合、グレー背景に画像アイコンが表示されます
            </Text>
          </Paragraph>
        </Card>
      </section>

      <Divider />

      {/* レスポンシブ対応 */}
      <section style={{ marginBottom: 48 }}>
        <Title level={3}>レスポンシブ対応</Title>
        <Paragraph>
          画面サイズに応じた画像表示
        </Paragraph>

        <Card title="レスポンシブグリッド">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Image
                width="100%"
                height={150}
                src="https://picsum.photos/300/300?random=24"
                alt="レスポンシブ画像1"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'cover',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Image
                width="100%"
                height={150}
                src="https://picsum.photos/300/300?random=25"
                alt="レスポンシブ画像2"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'cover',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Image
                width="100%"
                height={150}
                src="https://picsum.photos/300/300?random=26"
                alt="レスポンシブ画像3"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'cover',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Image
                width="100%"
                height={150}
                src="https://picsum.photos/300/300?random=27"
                alt="レスポンシブ画像4"
                style={{
                  borderRadius: token.borderRadius,
                  objectFit: 'cover',
                  border: `1px solid ${token.colorBorder}`
                }}
              />
            </Col>
          </Row>
          <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
            <Text type="secondary">
              ブラウザ幅を変更すると、グリッドの列数が自動調整されます
            </Text>
          </Paragraph>
        </Card>
      </section>

      <Divider />

      {/* プレビュー無効化 */}
      <section style={{ marginBottom: 48 }}>
        <Title level={3}>プレビュー無効化（装飾的画像）</Title>
        <Paragraph>
          クリックしても拡大表示しない画像
        </Paragraph>

        <Card title="アイコン・装飾的画像">
          <Space size={16}>
            <Image
              width={32}
              height={32}
              src="https://picsum.photos/100/100?random=28"
              alt="装飾的アイコン1"
              preview={false}
              style={{
                borderRadius: token.borderRadiusSM,
                objectFit: 'cover',
                border: `1px solid ${token.colorBorder}`
              }}
            />
            <Image
              width={32}
              height={32}
              src="https://picsum.photos/100/100?random=29"
              alt="装飾的アイコン2"
              preview={false}
              style={{
                borderRadius: token.borderRadiusSM,
                objectFit: 'cover',
                border: `1px solid ${token.colorBorder}`
              }}
            />
            <Image
              width={32}
              height={32}
              src="https://picsum.photos/100/100?random=30"
              alt="装飾的アイコン3"
              preview={false}
              style={{
                borderRadius: token.borderRadiusSM,
                objectFit: 'cover',
                border: `1px solid ${token.colorBorder}`
              }}
            />
          </Space>
          <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
            <Text type="secondary">
              preview=&#123;false&#125; を設定すると、クリックしても拡大表示されません
            </Text>
          </Paragraph>
        </Card>
      </section>
    </div>
  );
}
