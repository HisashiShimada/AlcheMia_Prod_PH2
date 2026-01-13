'use client';

import React from 'react';
import { Card, Flex, Button, Tag, Spin, Empty, Typography, Space, Divider, Input, Select } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  UserOutlined,
  SettingOutlined,
  HomeOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function FlexPatternsDemo() {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Flexレイアウトパターン</Title>
      <Paragraph>
        Ant Design の Flex コンポーネントを使用した標準的なレイアウトパターンを示します。
      </Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* パターン1: 水平配置（両端揃え） */}
        <Card title="パターン1: 水平配置（両端揃え）">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途：</Text> ヘッダー、アクションバー、カード内のタイトルとボタン配置
            </div>
            <div>
              <Text strong>プロパティ：</Text> justify=&quot;space-between&quot;, align=&quot;center&quot;, gap=16
            </div>

            <Divider>例1: ページヘッダー</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex justify="space-between" align="center" gap={16}>
                <Title level={4} style={{ margin: 0 }}>ユーザー管理</Title>
                <Button type="primary" icon={<PlusOutlined />}>
                  新規追加
                </Button>
              </Flex>
            </Card>

            <Divider>例2: カードヘッダー</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex justify="space-between" align="center" gap={16}>
                <Text strong>プロジェクト詳細</Text>
                <Button type="text" icon={<EditOutlined />} />
              </Flex>
            </Card>

            <Divider>例3: フォームフッター</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex justify="space-between" align="center" gap={16}>
                <Button>キャンセル</Button>
                <Button type="primary">保存</Button>
              </Flex>
            </Card>
          </Space>
        </Card>

        {/* パターン2: 水平配置（左寄せ） */}
        <Card title="パターン2: 水平配置（左寄せ）">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途：</Text> ボタングループ、フィルターコントロール、ツールバー
            </div>
            <div>
              <Text strong>プロパティ：</Text> justify=&quot;flex-start&quot;, align=&quot;center&quot;, gap=12
            </div>

            <Divider>例1: ボタングループ</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex justify="flex-start" align="center" gap={12}>
                <Button icon={<DownloadOutlined />}>ダウンロード</Button>
                <Button icon={<EditOutlined />}>編集</Button>
                <Button danger icon={<DeleteOutlined />}>削除</Button>
              </Flex>
            </Card>

            <Divider>例2: 検索バー + フィルター</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex justify="flex-start" align="center" gap={12}>
                <Input
                  placeholder="検索..."
                  prefix={<SearchOutlined />}
                  style={{ width: 250 }}
                />
                <Button icon={<FilterOutlined />}>フィルター</Button>
                <Select
                  placeholder="ステータス"
                  style={{ width: 150 }}
                  options={[
                    { value: 'active', label: '有効' },
                    { value: 'inactive', label: '無効' },
                  ]}
                />
              </Flex>
            </Card>

            <Divider>例3: ツールバー</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex justify="flex-start" align="center" gap={12}>
                <Button type="primary">すべて選択</Button>
                <Button>選択解除</Button>
                <Button>一括操作</Button>
              </Flex>
            </Card>
          </Space>
        </Card>

        {/* パターン3: 垂直配置（等間隔） */}
        <Card title="パターン3: 垂直配置（等間隔）">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途：</Text> フォーム、カード内コンテンツ、情報リスト
            </div>
            <div>
              <Text strong>プロパティ：</Text> vertical, gap=24, align=&quot;stretch&quot;
            </div>

            <Divider>例1: フォームフィールド</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex vertical gap={24}>
                <div>
                  <Text>ユーザー名</Text>
                  <Input placeholder="ユーザー名を入力" />
                </div>
                <div>
                  <Text>メールアドレス</Text>
                  <Input placeholder="メールアドレスを入力" />
                </div>
                <div>
                  <Text>パスワード</Text>
                  <Input.Password placeholder="パスワードを入力" />
                </div>
              </Flex>
            </Card>

            <Divider>例2: 情報セクション</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex vertical gap={24}>
                <div>
                  <Text type="secondary">作成日</Text>
                  <div>2024年1月15日</div>
                </div>
                <div>
                  <Text type="secondary">最終更新</Text>
                  <div>2024年3月20日</div>
                </div>
                <div>
                  <Text type="secondary">ステータス</Text>
                  <div>
                    <Tag color="success">アクティブ</Tag>
                  </div>
                </div>
              </Flex>
            </Card>
          </Space>
        </Card>

        {/* パターン4: ラップ付き水平配置 */}
        <Card title="パターン4: ラップ付き水平配置">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途：</Text> タグリスト、チップ表示、レスポンシブグリッド代替
            </div>
            <div>
              <Text strong>プロパティ：</Text> wrap=&quot;wrap&quot;, gap=8
            </div>

            <Divider>例1: タグリスト</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex wrap="wrap" gap={8}>
                <Tag>React</Tag>
                <Tag>TypeScript</Tag>
                <Tag>Next.js</Tag>
                <Tag>Ant Design</Tag>
                <Tag>Node.js</Tag>
                <Tag>PostgreSQL</Tag>
                <Tag>Docker</Tag>
                <Tag>AWS</Tag>
              </Flex>
            </Card>

            <Divider>例2: カラータグ</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex wrap="wrap" gap={8}>
                <Tag color="blue">設計中</Tag>
                <Tag color="green">開発中</Tag>
                <Tag color="orange">レビュー待ち</Tag>
                <Tag color="red">却下</Tag>
                <Tag color="purple">承認済み</Tag>
                <Tag color="cyan">完了</Tag>
              </Flex>
            </Card>

            <Divider>例3: 選択済みアイテム</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex wrap="wrap" gap={8}>
                <Tag closable>山田太郎</Tag>
                <Tag closable>鈴木花子</Tag>
                <Tag closable>佐藤一郎</Tag>
                <Tag closable>田中美咲</Tag>
              </Flex>
            </Card>
          </Space>
        </Card>

        {/* パターン5: 中央配置 */}
        <Card title="パターン5: 中央配置">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途：</Text> ローディング表示、エラーメッセージ、空状態表示
            </div>
            <div>
              <Text strong>プロパティ：</Text> vertical, justify=&quot;center&quot;, align=&quot;center&quot;, gap=16
            </div>

            <Divider>例1: ローディング</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex
                vertical
                justify="center"
                align="center"
                gap={16}
                style={{ minHeight: '200px' }}
              >
                <Spin size="large" />
                <Text>データを読み込んでいます...</Text>
              </Flex>
            </Card>

            <Divider>例2: エラー表示</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex
                vertical
                justify="center"
                align="center"
                gap={16}
                style={{ minHeight: '200px' }}
              >
                <CloseCircleOutlined style={{ fontSize: 48, color: '#d32f2f' }} />
                <Text>データの読み込みに失敗しました</Text>
                <Button type="primary">再試行</Button>
              </Flex>
            </Card>

            <Divider>例3: 空状態</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex
                vertical
                justify="center"
                align="center"
                gap={16}
                style={{ minHeight: '200px' }}
              >
                <Empty description="データがありません" />
                <Button type="primary" icon={<PlusOutlined />}>
                  新規作成
                </Button>
              </Flex>
            </Card>
          </Space>
        </Card>

        {/* 特殊パターン: アイコン + テキスト */}
        <Card title="特殊パターン: アイコン + テキストの組み合わせ">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途：</Text> ボタン内、ステータス表示、情報ラベル
            </div>
            <div>
              <Text strong>プロパティ：</Text> gap=8, align=&quot;center&quot;
            </div>

            <Divider>例1: ステータス表示</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Space direction="vertical" size={12}>
                <Flex gap={8} align="center">
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                  <span>完了</span>
                </Flex>
                <Flex gap={8} align="center">
                  <CloseCircleOutlined style={{ color: '#d32f2f', fontSize: 16 }} />
                  <span>失敗</span>
                </Flex>
                <Flex gap={8} align="center">
                  <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                  <span>情報</span>
                </Flex>
              </Space>
            </Card>

            <Divider>例2: ナビゲーションメニュー</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Flex gap={8} align="center" style={{ cursor: 'pointer' }}>
                  <HomeOutlined />
                  <span>ホーム</span>
                </Flex>
                <Flex gap={8} align="center" style={{ cursor: 'pointer' }}>
                  <UserOutlined />
                  <span>ユーザー</span>
                </Flex>
                <Flex gap={8} align="center" style={{ cursor: 'pointer' }}>
                  <SettingOutlined />
                  <span>設定</span>
                </Flex>
              </Space>
            </Card>
          </Space>
        </Card>

        {/* 特殊パターン: 右寄せボタングループ */}
        <Card title="特殊パターン: 右寄せボタングループ">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途：</Text> モーダル/ドロワーのフッター、カードフッター
            </div>
            <div>
              <Text strong>プロパティ：</Text> justify=&quot;flex-end&quot;, gap=12
            </div>

            <Divider>例1: モーダルフッター</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex justify="flex-end" gap={12}>
                <Button>キャンセル</Button>
                <Button type="primary">保存</Button>
              </Flex>
            </Card>

            <Divider>例2: カードフッター（複数ボタン）</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex justify="flex-end" gap={12}>
                <Button>戻る</Button>
                <Button>下書き保存</Button>
                <Button type="primary">次へ</Button>
              </Flex>
            </Card>
          </Space>
        </Card>

        {/* 特殊パターン: ネストされたFlex */}
        <Card title="特殊パターン: ネストされたFlex（複雑なレイアウト）">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途：</Text> カード内の複雑な配置、フォームセクション
            </div>
            <div>
              <Text strong>プロパティ：</Text> 外側と内側で異なるFlexを組み合わせ
            </div>

            <Divider>例1: カード内の複合レイアウト</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex vertical gap={24}>
                {/* ヘッダー部分 */}
                <Flex justify="space-between" align="center">
                  <Flex gap={12} align="center">
                    <UserOutlined style={{ fontSize: 24 }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>山田太郎</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        yamada@example.com
                      </Text>
                    </div>
                  </Flex>
                  <Flex gap={8}>
                    <Button type="text" icon={<EditOutlined />} />
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Flex>
                </Flex>

                {/* コンテンツ部分 */}
                <Flex gap={16}>
                  <Tag color="blue">開発者</Tag>
                  <Tag color="green">アクティブ</Tag>
                </Flex>

                {/* フッター部分 */}
                <Flex justify="space-between" align="center">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    最終ログイン: 2024年3月20日
                  </Text>
                  <Button size="small">詳細を見る</Button>
                </Flex>
              </Flex>
            </Card>
          </Space>
        </Card>

        {/* 特殊パターン: 固定幅 + 可変幅 */}
        <Card title="特殊パターン: 固定幅 + 可変幅のハイブリッド">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途：</Text> アイコン + テキスト、ラベル + 入力フィールド
            </div>
            <div>
              <Text strong>プロパティ：</Text> flex: &apos;0 0 auto&apos; / flex: &apos;1 1 0&apos;
            </div>

            <Divider>例1: ラベル + 入力フィールド</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex gap={16} align="center">
                <div style={{ flex: '0 0 100px', textAlign: 'right' }}>ユーザー名:</div>
                <Input style={{ flex: '1 1 0' }} placeholder="ユーザー名を入力" />
              </Flex>
            </Card>

            <Divider>例2: アイコン + 可変テキスト</Divider>
            <Card style={{ background: '#fafafa' }}>
              <Flex gap={12}>
                <InfoCircleOutlined
                  style={{ flex: '0 0 auto', fontSize: 16, color: '#1890ff' }}
                />
                <div style={{ flex: '1 1 0' }}>
                  この操作を実行すると、関連するすべてのデータが削除されます。この操作は取り消せません。
                </div>
              </Flex>
            </Card>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
