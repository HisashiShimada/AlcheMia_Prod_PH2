'use client';

import React, { useState } from 'react';
import {
  Card,
  Space,
  Typography,
  Divider,
  Skeleton,
  Row,
  Col,
  Button,
  Switch,
  theme,
  Table
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;

export default function SkeletonPatternsDemo() {
  const { token } = useToken();
  const [loading1, setLoading1] = useState(true);
  const [loading2, setLoading2] = useState(true);
  const [loading3, setLoading3] = useState(true);
  const [loading4, setLoading4] = useState(true);
  const [loading5, setLoading5] = useState(true);
  const [loadingSpecial, setLoadingSpecial] = useState(true);
  const [loadingCombined, setLoadingCombined] = useState(true);

  return (
    <div style={{ padding: '24px', background: token.colorBgLayout, minHeight: '100vh' }}>
      <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 1400 }}>
        {/* ヘッダー */}
        <div>
          <Title level={2}>スケルトンスクリーン形状ポリシー</Title>
          <Paragraph>
            データ読み込み中に表示されるスケルトンスクリーンの標準5パターンを定義しています。
          </Paragraph>
        </div>

        {/* パターン1: カード型スケルトン */}
        <Card
          title={
            <Space>
              <Text strong>パターン1: カード型スケルトン</Text>
              <Switch
                checkedChildren="実コンテンツ"
                unCheckedChildren="スケルトン"
                checked={!loading1}
                onChange={(checked) => setLoading1(!checked)}
              />
            </Space>
          }
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setLoading1(true);
                setTimeout(() => setLoading1(false), 2000);
              }}
            >
              リロード
            </Button>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: リスト表示、カード表示時のローディング</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            
            <Card style={{ marginBottom: 16 }}>
              {loading1 ? (
                <Skeleton
                  active
                  avatar={{ size: 48, shape: 'circle' }}
                  paragraph={{ rows: 3, width: ['100%', '90%', '60%'] }}
                />
              ) : (
                <div>
                  <Space>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: token.colorPrimary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 20,
                        fontWeight: 'bold'
                      }}
                    >
                      AI
                    </div>
                    <div>
                      <Title level={5} style={{ margin: 0 }}>
                        プロジェクト名
                      </Title>
                      <Text type="secondary">2025-12-26 作成</Text>
                    </div>
                  </Space>
                  <Paragraph style={{ marginTop: 16 }}>
                    これはプロジェクトの説明文です。スケルトンスクリーンから実際のコンテンツに切り替わりました。
                    データの読み込みが完了すると、このように実際の情報が表示されます。
                  </Paragraph>
                </div>
              )}
            </Card>
          </Space>
        </Card>

        {/* パターン2: テーブル行スケルトン */}
        <Card
          title={
            <Space>
              <Text strong>パターン2: テーブル行スケルトン</Text>
              <Switch
                checkedChildren="実コンテンツ"
                unCheckedChildren="スケルトン"
                checked={!loading2}
                onChange={(checked) => setLoading2(!checked)}
              />
            </Space>
          }
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setLoading2(true);
                setTimeout(() => setLoading2(false), 2000);
              }}
            >
              リロード
            </Button>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: テーブルデータ読み込み中</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            
            {loading2 ? (
              <Skeleton
                active
                title={false}
                avatar={false}
                paragraph={{ rows: 5 }}
              />
            ) : (
              <Table
                dataSource={[
                  { key: '1', name: '山田太郎', email: 'yamada@example.com', status: '有効' },
                  { key: '2', name: '佐藤花子', email: 'sato@example.com', status: '有効' },
                  { key: '3', name: '鈴木一郎', email: 'suzuki@example.com', status: '無効' },
                  { key: '4', name: '田中美咲', email: 'tanaka@example.com', status: '有効' },
                  { key: '5', name: '高橋健太', email: 'takahashi@example.com', status: '有効' },
                ]}
                columns={[
                  { title: '名前', dataIndex: 'name', key: 'name' },
                  { title: 'メールアドレス', dataIndex: 'email', key: 'email' },
                  { title: 'ステータス', dataIndex: 'status', key: 'status' },
                ]}
                pagination={false}
              />
            )}
          </Space>
        </Card>

        {/* パターン3: フォームスケルトン */}
        <Card
          title={
            <Space>
              <Text strong>パターン3: フォームスケルトン</Text>
              <Switch
                checkedChildren="実コンテンツ"
                unCheckedChildren="スケルトン"
                checked={!loading3}
                onChange={(checked) => setLoading3(!checked)}
              />
            </Space>
          }
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setLoading3(true);
                setTimeout(() => setLoading3(false), 2000);
              }}
            >
              リロード
            </Button>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: フォーム読み込み中</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            
            {loading3 ? (
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                {[1, 2, 3].map((item) => (
                  <div key={item}>
                    <Skeleton.Input
                      active
                      size="small"
                      style={{ width: 100, height: 14, marginBottom: 8 }}
                    />
                    <Skeleton.Input
                      active
                      style={{ width: '100%', height: 32, borderRadius: 8 }}
                    />
                  </div>
                ))}
              </Space>
            ) : (
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    プロジェクト名
                  </Text>
                  <div
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '4px 11px',
                      border: `1px solid ${token.colorBorder}`,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    AI研究プロジェクト
                  </div>
                </div>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    責任者
                  </Text>
                  <div
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '4px 11px',
                      border: `1px solid ${token.colorBorder}`,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    山田太郎
                  </div>
                </div>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    開始日
                  </Text>
                  <div
                    style={{
                      width: '100%',
                      height: 32,
                      padding: '4px 11px',
                      border: `1px solid ${token.colorBorder}`,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    2025-12-26
                  </div>
                </div>
              </Space>
            )}
          </Space>
        </Card>

        {/* パターン4: テキストブロックスケルトン */}
        <Card
          title={
            <Space>
              <Text strong>パターン4: テキストブロックスケルトン</Text>
              <Switch
                checkedChildren="実コンテンツ"
                unCheckedChildren="スケルトン"
                checked={!loading4}
                onChange={(checked) => setLoading4(!checked)}
              />
            </Space>
          }
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setLoading4(true);
                setTimeout(() => setLoading4(false), 2000);
              }}
            >
              リロード
            </Button>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: 記事本文、詳細説明読み込み中</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            
            {loading4 ? (
              <Skeleton
                active
                avatar={false}
                title={{ width: '60%' }}
                paragraph={{
                  rows: 8,
                  width: ['100%', '95%', '90%', '100%', '85%', '95%', '100%', '70%']
                }}
              />
            ) : (
              <div>
                <Title level={4}>プロジェクト概要</Title>
                <Paragraph>
                  本プロジェクトは、最新のAI技術を活用して材料科学分野における
                  実験データの管理と解析を効率化することを目的としています。
                </Paragraph>
                <Paragraph>
                  マルチテナント対応のWebアプリケーションとして設計されており、
                  複数の研究機関が安全にデータを共有・管理できる環境を提供します。
                  MAIML（Materials Informatics Markup Language）形式のXMLファイルを
                  基盤とし、実験ワークフローをPetri Net形式で可視化することが可能です。
                </Paragraph>
                <Paragraph>
                  実験記録の管理、ワーカーによる分散作業のサポート、データの
                  検索・分析機能など、研究活動に必要な機能を包括的に提供します。
                </Paragraph>
              </div>
            )}
          </Space>
        </Card>

        {/* パターン5: リストアイテムスケルトン */}
        <Card
          title={
            <Space>
              <Text strong>パターン5: リストアイテムスケルトン</Text>
              <Switch
                checkedChildren="実コンテンツ"
                unCheckedChildren="スケルトン"
                checked={!loading5}
                onChange={(checked) => setLoading5(!checked)}
              />
            </Space>
          }
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setLoading5(true);
                setTimeout(() => setLoading5(false), 2000);
              }}
            >
              リロード
            </Button>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: リストアイテム読み込み中</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            
            {loading5 ? (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {[1, 2, 3, 4, 5].map((item) => (
                  <Skeleton
                    key={item}
                    active
                    avatar={{ size: 40, shape: 'circle' }}
                    title={{ width: '70%' }}
                    paragraph={{ rows: 1, width: '90%' }}
                  />
                ))}
              </Space>
            ) : (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {[
                  { name: '山田太郎', role: 'プロジェクトマネージャー' },
                  { name: '佐藤花子', role: 'リサーチャー' },
                  { name: '鈴木一郎', role: 'データアナリスト' },
                  { name: '田中美咲', role: 'エンジニア' },
                  { name: '高橋健太', role: 'デザイナー' },
                ].map((member, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: token.colorPrimary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: 'bold'
                      }}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{member.name}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {member.role}
                      </Text>
                    </div>
                  </div>
                ))}
              </Space>
            )}
          </Space>
        </Card>

        {/* 特殊なパターン */}
        <Card
          title={
            <Space>
              <Text strong>特殊なパターン</Text>
              <Switch
                checkedChildren="実コンテンツ"
                unCheckedChildren="スケルトン"
                checked={!loadingSpecial}
                onChange={(checked) => setLoadingSpecial(!checked)}
              />
            </Space>
          }
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setLoadingSpecial(true);
                setTimeout(() => setLoadingSpecial(false), 2000);
              }}
            >
              リロード
            </Button>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: ボタン、アバター、インプット、画像の個別スケルトン</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Card size="small" title="ボタンスケルトン">
                  {loadingSpecial ? (
                    <Space>
                      <Skeleton.Button active style={{ width: 100, height: 32, borderRadius: 8 }} />
                      <Skeleton.Button active style={{ width: 80, height: 32, borderRadius: 8 }} />
                    </Space>
                  ) : (
                    <Space>
                      <Button type="primary">保存</Button>
                      <Button>キャンセル</Button>
                    </Space>
                  )}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" title="アバタースケルトン">
                  {loadingSpecial ? (
                    <Space>
                      <Skeleton.Avatar active size={48} shape="circle" />
                      <Skeleton.Avatar active size={40} shape="circle" />
                      <Skeleton.Avatar active size={24} shape="circle" />
                    </Space>
                  ) : (
                    <Space>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: token.colorPrimary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff'
                        }}
                      >
                        48
                      </div>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: token.colorInfo,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff'
                        }}
                      >
                        40
                      </div>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: token.colorSuccess,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 12
                        }}
                      >
                        24
                      </div>
                    </Space>
                  )}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" title="インプットスケルトン">
                  {loadingSpecial ? (
                    <Skeleton.Input active style={{ width: '100%', height: 32, borderRadius: 8 }} />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: 32,
                        padding: '4px 11px',
                        border: `1px solid ${token.colorBorder}`,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      テキスト入力フィールド
                    </div>
                  )}
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" title="画像スケルトン">
                  {loadingSpecial ? (
                    <Skeleton.Image
                      active
                      style={{ width: 200, height: 150, borderRadius: 8 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 200,
                        height: 150,
                        borderRadius: 8,
                        background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorInfoBg} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        fontWeight: 'bold',
                        color: token.colorTextSecondary
                      }}
                    >
                      画像
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* 組み合わせパターン: ダッシュボード型 */}
        <Card
          title={
            <Space>
              <Text strong>組み合わせパターン: ダッシュボード型</Text>
              <Switch
                checkedChildren="実コンテンツ"
                unCheckedChildren="スケルトン"
                checked={!loadingCombined}
                onChange={(checked) => setLoadingCombined(!checked)}
              />
            </Space>
          }
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setLoadingCombined(true);
                setTimeout(() => setLoadingCombined(false), 2000);
              }}
            >
              リロード
            </Button>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: 複数のカードを組み合わせたダッシュボード</Text>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            
            <Row gutter={[16, 16]}>
              <Col span={24}>
                {loadingCombined ? (
                  <Skeleton.Input active style={{ width: 300, height: 32 }} />
                ) : (
                  <Title level={4} style={{ margin: 0 }}>
                    ダッシュボード
                  </Title>
                )}
              </Col>
              <Col xs={24} md={12} lg={8}>
                <Card>
                  {loadingCombined ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : (
                    <div>
                      <Title level={5}>プロジェクト数</Title>
                      <div style={{ fontSize: 32, fontWeight: 'bold', color: token.colorPrimary }}>
                        24
                      </div>
                      <Text type="secondary">前月比 +12%</Text>
                    </div>
                  )}
                </Card>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <Card>
                  {loadingCombined ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : (
                    <div>
                      <Title level={5}>アクティブユーザー</Title>
                      <div style={{ fontSize: 32, fontWeight: 'bold', color: token.colorInfo }}>
                        156
                      </div>
                      <Text type="secondary">前月比 +8%</Text>
                    </div>
                  )}
                </Card>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <Card>
                  {loadingCombined ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                  ) : (
                    <div>
                      <Title level={5}>完了タスク</Title>
                      <div style={{ fontSize: 32, fontWeight: 'bold', color: token.colorSuccess }}>
                        892
                      </div>
                      <Text type="secondary">前月比 +23%</Text>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
