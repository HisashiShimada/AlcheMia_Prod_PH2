'use client';

import React, { useState } from 'react';
import {
  Empty,
  Card,
  Button,
  Space,
  Typography,
  Table,
  Input,
  List,
  theme,
  Divider,
  Tag,
  Row,
  Col,
} from 'antd';
import {
  FileOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusCircleOutlined,
  FolderAddOutlined,
  InboxOutlined,
  DatabaseOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;
const { useToken } = theme;

/**
 * 空状態表示の全パターンをデモするコンポーネント
 */
const EmptyStatePatternsDemo: React.FC = () => {
  const { token } = useToken();
  const [searchValue, setSearchValue] = useState('');
  const [hasData, setHasData] = useState(false);

  // テーブルのカラム定義
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '名前',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
    },
  ];

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <div>
          <Title level={2}>空状態表示パターン</Title>
          <Paragraph>
            空状態表示の4つの標準パターンを示します。各パターンは使用シーンに応じて選択します。
          </Paragraph>
        </div>

        {/* パターン1: シンプル空状態 */}
        <Card 
          title={
            <Space>
              <Tag color="blue">パターン1</Tag>
              <Text strong>シンプル空状態</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph>
              <Text strong>用途：</Text> テーブル・リストでデータがない場合
              <br />
              <Text type="secondary">
                アイコン48px、メッセージのみ、説明文なし、アクションなし
              </Text>
            </Paragraph>

            <Divider><Text strong>基本形（FileOutlined）</Text></Divider>
            <Card>
              <Empty
                image={
                  <FileOutlined 
                    style={{ 
                      fontSize: 48, 
                      color: token.colorTextDisabled 
                    }} 
                  />
                }
                description={
                  <Text style={{ 
                    color: token.colorTextSecondary, 
                    fontSize: token.fontSize 
                  }}>
                    データがありません
                  </Text>
                }
              />
            </Card>

            <Divider><Text strong>テーブル内での使用</Text></Divider>
            <Table
              columns={columns}
              dataSource={[]}
              locale={{
                emptyText: (
                  <Empty
                    image={
                      <FileOutlined 
                        style={{ 
                          fontSize: 48, 
                          color: token.colorTextDisabled 
                        }} 
                      />
                    }
                    description="データがありません"
                  />
                ),
              }}
            />

            <Divider><Text strong>バリエーション（InboxOutlined）</Text></Divider>
            <Card>
              <Empty
                image={
                  <InboxOutlined 
                    style={{ 
                      fontSize: 48, 
                      color: token.colorTextDisabled 
                    }} 
                  />
                }
                description="受信データがありません"
              />
            </Card>

            <Divider><Text strong>バリエーション（DatabaseOutlined）</Text></Divider>
            <Card>
              <Empty
                image={
                  <DatabaseOutlined 
                    style={{ 
                      fontSize: 48, 
                      color: token.colorTextDisabled 
                    }} 
                  />
                }
                description="データベースにデータがありません"
              />
            </Card>
          </Space>
        </Card>

        {/* パターン2: 説明付き空状態 */}
        <Card 
          title={
            <Space>
              <Tag color="cyan">パターン2</Tag>
              <Text strong>説明付き空状態</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph>
              <Text strong>用途：</Text> 検索結果なし、フィルタリング結果なし
              <br />
              <Text type="secondary">
                アイコン48px、メッセージ+説明文、アクションなし
              </Text>
            </Paragraph>

            <Divider><Text strong>検索結果なし（SearchOutlined）</Text></Divider>
            <Card>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input
                  placeholder="検索..."
                  prefix={<SearchOutlined />}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  style={{ width: 250 }}
                />
                <Empty
                  image={
                    <SearchOutlined 
                      style={{ 
                        fontSize: 48, 
                        color: token.colorTextDisabled 
                      }} 
                    />
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      <Text style={{ 
                        color: token.colorTextSecondary, 
                        fontSize: token.fontSize 
                      }}>
                        検索結果がありません
                      </Text>
                      <Text style={{ 
                        color: token.colorTextTertiary, 
                        fontSize: token.fontSizeSM 
                      }}>
                        検索条件を変更してください
                      </Text>
                    </Space>
                  }
                />
              </Space>
            </Card>

            <Divider><Text strong>フィルタ結果なし（FilterOutlined）</Text></Divider>
            <Card>
              <Empty
                image={
                  <FilterOutlined 
                    style={{ 
                      fontSize: 48, 
                      color: token.colorTextDisabled 
                    }} 
                  />
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Text style={{ 
                      color: token.colorTextSecondary, 
                      fontSize: token.fontSize 
                    }}>
                      該当するデータがありません
                    </Text>
                    <Text style={{ 
                      color: token.colorTextTertiary, 
                      fontSize: token.fontSizeSM 
                    }}>
                      フィルタ条件を変更してください
                    </Text>
                  </Space>
                }
              />
            </Card>

            <Divider><Text strong>ページ全体での使用（中央配置）</Text></Divider>
            <div
              style={{
                minHeight: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px dashed ${token.colorBorder}`,
                borderRadius: token.borderRadius,
              }}
            >
              <Empty
                image={
                  <SearchOutlined 
                    style={{ 
                      fontSize: 48, 
                      color: token.colorTextDisabled 
                    }} 
                  />
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Text style={{ 
                      color: token.colorTextSecondary, 
                      fontSize: token.fontSize 
                    }}>
                      検索結果がありません
                    </Text>
                    <Text style={{ 
                      color: token.colorTextTertiary, 
                      fontSize: token.fontSizeSM 
                    }}>
                      別のキーワードで検索してください
                    </Text>
                  </Space>
                }
              />
            </div>
          </Space>
        </Card>

        {/* パターン3: アクション付き空状態 */}
        <Card 
          title={
            <Space>
              <Tag color="green">パターン3</Tag>
              <Text strong>アクション付き空状態</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph>
              <Text strong>用途：</Text> 初期状態、ユーザーアクションが必要な場合
              <br />
              <Text type="secondary">
                アイコン48px（プライマリカラー）、メッセージ+説明文、アクションボタンあり
              </Text>
            </Paragraph>

            <Divider><Text strong>データ追加が必要（PlusCircleOutlined）</Text></Divider>
            <Card>
              <Empty
                image={
                  <PlusCircleOutlined 
                    style={{ 
                      fontSize: 48, 
                      color: token.colorPrimary 
                    }} 
                  />
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Text style={{ 
                      color: token.colorTextSecondary, 
                      fontSize: token.fontSize 
                    }}>
                      まだデータがありません
                    </Text>
                    <Text style={{ 
                      color: token.colorTextTertiary, 
                      fontSize: token.fontSizeSM 
                    }}>
                      新しいデータを追加してください
                    </Text>
                  </Space>
                }
              >
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setHasData(true)}
                >
                  データを追加
                </Button>
              </Empty>
            </Card>

            <Divider><Text strong>プロジェクト追加（FolderAddOutlined）</Text></Divider>
            <Card>
              <Empty
                image={
                  <FolderAddOutlined 
                    style={{ 
                      fontSize: 48, 
                      color: token.colorPrimary 
                    }} 
                  />
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Text style={{ 
                      color: token.colorTextSecondary, 
                      fontSize: token.fontSize 
                    }}>
                      プロジェクトがありません
                    </Text>
                    <Text style={{ 
                      color: token.colorTextTertiary, 
                      fontSize: token.fontSizeSM 
                    }}>
                      新しいプロジェクトを作成してください
                    </Text>
                  </Space>
                }
              >
                <Button type="primary" icon={<PlusOutlined />}>
                  プロジェクトを作成
                </Button>
              </Empty>
            </Card>

            <Divider><Text strong>デフォルトボタンでの使用</Text></Divider>
            <Card>
              <Empty
                image={
                  <PlusCircleOutlined 
                    style={{ 
                      fontSize: 48, 
                      color: token.colorPrimary 
                    }} 
                  />
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Text style={{ 
                      color: token.colorTextSecondary, 
                      fontSize: token.fontSize 
                    }}>
                      お気に入りがありません
                    </Text>
                    <Text style={{ 
                      color: token.colorTextTertiary, 
                      fontSize: token.fontSizeSM 
                    }}>
                      気になる項目をお気に入りに追加できます
                    </Text>
                  </Space>
                }
              >
                <Button type="default" icon={<PlusOutlined />}>
                  お気に入りを追加
                </Button>
              </Empty>
            </Card>
          </Space>
        </Card>

        {/* パターン4: カスタム画像空状態 */}
        <Card 
          title={
            <Space>
              <Tag color="orange">パターン4</Tag>
              <Text strong>カスタム画像空状態</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph>
              <Text strong>用途：</Text> エラー状態、特殊な状況の説明
              <br />
              <Text type="secondary">
                標準画像100px×100px、大きめメッセージ+詳細説明、必要に応じてボタン
              </Text>
            </Paragraph>

            <Divider><Text strong>接続エラー（PRESENTED_IMAGE_SIMPLE）</Text></Divider>
            <Card>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                imageStyle={{ height: 100 }}
                description={
                  <Space direction="vertical" size={8}>
                    <Text style={{ 
                      color: token.colorTextSecondary, 
                      fontSize: token.fontSizeLG, 
                      fontWeight: 500 
                    }}>
                      接続エラーが発生しました
                    </Text>
                    <Text style={{ 
                      color: token.colorTextTertiary, 
                      fontSize: token.fontSize 
                    }}>
                      ネットワーク接続を確認して、再度お試しください
                    </Text>
                  </Space>
                }
              >
                <Button type="default" icon={<ReloadOutlined />}>
                  再読み込み
                </Button>
              </Empty>
            </Card>

            <Divider><Text strong>デフォルト画像（PRESENTED_IMAGE_DEFAULT）</Text></Divider>
            <Card>
              <Empty
                image={Empty.PRESENTED_IMAGE_DEFAULT}
                imageStyle={{ height: 100 }}
                description={
                  <Space direction="vertical" size={8}>
                    <Text style={{ 
                      color: token.colorTextSecondary, 
                      fontSize: token.fontSizeLG, 
                      fontWeight: 500 
                    }}>
                      権限がありません
                    </Text>
                    <Text style={{ 
                      color: token.colorTextTertiary, 
                      fontSize: token.fontSize 
                    }}>
                      このページにアクセスする権限がありません。<br />
                      管理者にお問い合わせください。
                    </Text>
                  </Space>
                }
              />
            </Card>

            <Divider><Text strong>メンテナンス中</Text></Divider>
            <Card>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                imageStyle={{ height: 100 }}
                description={
                  <Space direction="vertical" size={8}>
                    <Text style={{ 
                      color: token.colorTextSecondary, 
                      fontSize: token.fontSizeLG, 
                      fontWeight: 500 
                    }}>
                      メンテナンス中
                    </Text>
                    <Text style={{ 
                      color: token.colorTextTertiary, 
                      fontSize: token.fontSize 
                    }}>
                      現在システムメンテナンス中です。<br />
                      しばらくしてから再度アクセスしてください。
                    </Text>
                  </Space>
                }
              >
                <Button type="primary" icon={<ReloadOutlined />}>
                  ステータスを確認
                </Button>
              </Empty>
            </Card>
          </Space>
        </Card>

        {/* 比較セクション */}
        <Card title="全パターン比較">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                size="small" 
                title={<Text strong>パターン1</Text>}
                style={{ height: '100%' }}
              >
                <Empty
                  image={
                    <FileOutlined 
                      style={{ 
                        fontSize: 48, 
                        color: token.colorTextDisabled 
                      }} 
                    />
                  }
                  description="データがありません"
                />
                <Divider style={{ margin: '12px 0' }} />
                <Space direction="vertical" size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    • シンプル
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    • テーブル・リスト
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    • アクションなし
                  </Text>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card 
                size="small" 
                title={<Text strong>パターン2</Text>}
                style={{ height: '100%' }}
              >
                <Empty
                  image={
                    <SearchOutlined 
                      style={{ 
                        fontSize: 48, 
                        color: token.colorTextDisabled 
                      }} 
                    />
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      <Text style={{ fontSize: 14 }}>
                        検索結果なし
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        条件を変更
                      </Text>
                    </Space>
                  }
                />
                <Divider style={{ margin: '12px 0' }} />
                <Space direction="vertical" size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    • 説明付き
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    • 検索・フィルタ
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    • ガイダンス
                  </Text>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card 
                size="small" 
                title={<Text strong>パターン3</Text>}
                style={{ height: '100%' }}
              >
                <Empty
                  image={
                    <PlusCircleOutlined 
                      style={{ 
                        fontSize: 48, 
                        color: token.colorPrimary 
                      }} 
                    />
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      <Text style={{ fontSize: 14 }}>
                        データなし
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        追加してください
                      </Text>
                    </Space>
                  }
                >
                  <Button type="primary" size="small">
                    追加
                  </Button>
                </Empty>
                <Divider style={{ margin: '12px 0' }} />
                <Space direction="vertical" size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    • アクション付き
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    • 初期状態
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    • ユーザー誘導
                  </Text>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card 
                size="small" 
                title={<Text strong>パターン4</Text>}
                style={{ height: '100%' }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  imageStyle={{ height: 80 }}
                  description={
                    <Space direction="vertical" size={4}>
                      <Text strong style={{ fontSize: 14 }}>
                        エラー発生
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        再試行してください
                      </Text>
                    </Space>
                  }
                >
                  <Button type="default" size="small">
                    再試行
                  </Button>
                </Empty>
                <Divider style={{ margin: '12px 0' }} />
                <Space direction="vertical" size={4}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    • カスタム画像
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    • エラー状態
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    • 詳細説明
                  </Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* 実装コード例 */}
        <Card title="実装コード例">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>パターン1: シンプル空状態</Text>
              <pre style={{ 
                background: token.colorBgContainer, 
                padding: 16, 
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorder}`,
                overflow: 'auto'
              }}>
{`<Empty 
  image={<FileOutlined style={{ fontSize: 48 }} />}
  description="データがありません"
/>`}
              </pre>
            </div>

            <div>
              <Text strong>パターン2: 説明付き空状態</Text>
              <pre style={{ 
                background: token.colorBgContainer, 
                padding: 16, 
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorder}`,
                overflow: 'auto'
              }}>
{`<Empty 
  image={<SearchOutlined style={{ fontSize: 48 }} />}
  description={
    <Space direction="vertical" size={4}>
      <Text>検索結果がありません</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>
        検索条件を変更してください
      </Text>
    </Space>
  }
/>`}
              </pre>
            </div>

            <div>
              <Text strong>パターン3: アクション付き空状態</Text>
              <pre style={{ 
                background: token.colorBgContainer, 
                padding: 16, 
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorder}`,
                overflow: 'auto'
              }}>
{`<Empty 
  image={
    <PlusCircleOutlined 
      style={{ fontSize: 48, color: token.colorPrimary }} 
    />
  }
  description={
    <Space direction="vertical" size={4}>
      <Text>まだデータがありません</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>
        新しいデータを追加してください
      </Text>
    </Space>
  }
>
  <Button type="primary" icon={<PlusOutlined />}>
    データを追加
  </Button>
</Empty>`}
              </pre>
            </div>

            <div>
              <Text strong>パターン4: カスタム画像空状態</Text>
              <pre style={{ 
                background: token.colorBgContainer, 
                padding: 16, 
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorder}`,
                overflow: 'auto'
              }}>
{`<Empty 
  image={Empty.PRESENTED_IMAGE_SIMPLE}
  imageStyle={{ height: 100 }}
  description={
    <Space direction="vertical" size={8}>
      <Text style={{ fontSize: 16, fontWeight: 500 }}>
        接続エラーが発生しました
      </Text>
      <Text type="secondary">
        ネットワーク接続を確認して、再度お試しください
      </Text>
    </Space>
  }
>
  <Button type="default" icon={<ReloadOutlined />}>
    再読み込み
  </Button>
</Empty>`}
              </pre>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default EmptyStatePatternsDemo;
