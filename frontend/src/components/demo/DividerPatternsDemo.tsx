'use client';

import React from 'react';
import { Card, Divider, Space, Button, Typography, Tag, Flex } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * セクション区切り線（Divider）の全パターンデモ
 */
export default function DividerPatternsDemo() {
  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Title level={2}>セクション区切り線（Divider）パターン</Title>
      <Paragraph>
        全画面のデータ表示で使用するセクション区切り線の標準3パターンと使用例
      </Paragraph>

      <Divider />

      {/* パターン1: 水平線（標準） */}
      <Card title="パターン1: 水平線（標準）" style={{ marginBottom: 24 }}>
        <Paragraph>
          <Text strong>用途:</Text> セクション間の視覚的な区切り
        </Paragraph>
        <Paragraph>
          <Text strong>仕様:</Text>
          <ul>
            <li>方向: 水平（horizontal）</li>
            <li>線の太さ: 1px</li>
            <li>線の色: rgba(0,0,0,0.06)</li>
            <li>マージン: 上下16px</li>
            <li>幅: 100%</li>
          </ul>
        </Paragraph>

        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
          <Title level={5}>基本的な使用例</Title>
          <Paragraph>
            セクション1の内容です。ここには何らかのコンテンツが入ります。
          </Paragraph>

          <Divider />

          <Paragraph>
            セクション2の内容です。Dividerによって視覚的に区切られています。
          </Paragraph>

          <Divider />

          <Paragraph>
            セクション3の内容です。適度な間隔でセクションを区切ることができます。
          </Paragraph>
        </div>

        <Divider />

        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
          <Title level={5}>カード内でのセクション区切り</Title>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Text strong>ユーザー情報</Text>
            <Paragraph style={{ margin: '8px 0' }}>
              <UserOutlined /> 山田 太郎
            </Paragraph>
            <Paragraph style={{ margin: '8px 0' }}>
              <MailOutlined /> yamada@example.com
            </Paragraph>

            <Divider />

            <Text strong>連絡先情報</Text>
            <Paragraph style={{ margin: '8px 0' }}>
              <PhoneOutlined /> 03-1234-5678
            </Paragraph>
            <Paragraph style={{ margin: '8px 0' }}>
              <HomeOutlined /> 東京都渋谷区
            </Paragraph>
          </Card>
        </div>
      </Card>

      {/* パターン2: 垂直線 */}
      <Card title="パターン2: 垂直線" style={{ marginBottom: 24 }}>
        <Paragraph>
          <Text strong>用途:</Text> サイドバイサイドのコンテンツ区切り
        </Paragraph>
        <Paragraph>
          <Text strong>仕様:</Text>
          <ul>
            <li>方向: 垂直（vertical）</li>
            <li>線の太さ: 1px</li>
            <li>線の色: rgba(0,0,0,0.06)</li>
            <li>マージン: 左右12px</li>
            <li>高さ: 1em（テキストの高さに合わせる）</li>
          </ul>
        </Paragraph>

        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
          <Title level={5}>ボタングループ</Title>
          <Space split={<Divider type="vertical" />}>
            <Button>編集</Button>
            <Button>削除</Button>
            <Button>エクスポート</Button>
          </Space>

          <Divider />

          <Title level={5}>タグリスト</Title>
          <Space split={<Divider type="vertical" />}>
            <Tag color="blue">開発中</Tag>
            <Tag color="green">完了</Tag>
            <Tag color="orange">保留</Tag>
            <Tag color="red">キャンセル</Tag>
          </Space>

          <Divider />

          <Title level={5}>テキストリンク</Title>
          <Space split={<Divider type="vertical" />}>
            <a href="#">ホーム</a>
            <a href="#">プロジェクト</a>
            <a href="#">設定</a>
            <a href="#">ヘルプ</a>
          </Space>

          <Divider />

          <Title level={5}>アイコン付きボタン</Title>
          <Space split={<Divider type="vertical" />}>
            <Button icon={<UserOutlined />}>ユーザー</Button>
            <Button icon={<MailOutlined />}>メール</Button>
            <Button icon={<PhoneOutlined />}>電話</Button>
            <Button icon={<HomeOutlined />}>住所</Button>
          </Space>

          <Divider />

          <Title level={5}>インラインテキスト</Title>
          <Text>
            作成者: 山田太郎
            <Divider type="vertical" />
            作成日: 2024-12-26
            <Divider type="vertical" />
            ステータス: 公開中
          </Text>
        </div>
      </Card>

      {/* パターン3: テキスト付き水平線 */}
      <Card title="パターン3: テキスト付き水平線" style={{ marginBottom: 24 }}>
        <Paragraph>
          <Text strong>用途:</Text> タイトル・ラベル付きセクション区切り
        </Paragraph>
        <Paragraph>
          <Text strong>仕様:</Text>
          <ul>
            <li>方向: 水平（horizontal）</li>
            <li>線の太さ: 1px</li>
            <li>線の色: rgba(0,0,0,0.06)</li>
            <li>マージン: 上下16px</li>
            <li>テキスト位置: 左揃え（left）/ 中央揃え（center）/ 右揃え（right）</li>
            <li>テキストフォントサイズ: 14px</li>
            <li>テキスト色: #212121</li>
          </ul>
        </Paragraph>

        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
          <Title level={5}>左揃え（デフォルト）</Title>
          <Divider orientation="left" orientationMargin={0}>基本情報</Divider>
          <Paragraph>
            ここに基本情報の内容が入ります。テキストは左揃えで表示されます。
          </Paragraph>

          <Divider orientation="left" orientationMargin={0}>詳細情報</Divider>
          <Paragraph>
            ここに詳細情報の内容が入ります。セクションごとに整理された情報を提供できます。
          </Paragraph>

          <Divider />

          <Title level={5}>中央揃え</Title>
          <Divider>プロジェクト概要</Divider>
          <Paragraph>
            中央揃えのテキスト付きDividerです。セクションの見出しとして使用できます。
          </Paragraph>

          <Divider>技術スタック</Divider>
          <Paragraph>
            React、TypeScript、Next.js、Ant Designを使用しています。
          </Paragraph>

          <Divider />

          <Title level={5}>右揃え</Title>
          <Divider orientation="right" orientationMargin={0}>2024年12月</Divider>
          <Paragraph>
            右揃えのテキスト付きDividerです。日付やバージョン情報の表示に適しています。
          </Paragraph>

          <Divider orientation="right" orientationMargin={0}>バージョン 1.0.0</Divider>
          <Paragraph>
            最新のバージョン情報をここに表示します。
          </Paragraph>
        </div>
      </Card>

      {/* 除外パターン: カスタムカラーDivider */}
      <Card
        title="除外パターン: カスタムカラーDivider"
        style={{ marginBottom: 24 }}
      >
        <Paragraph>
          <Text strong>対応する標準パターン:</Text> パターン1（水平線）の色変化版
        </Paragraph>
        <Paragraph>
          <Text strong>除外理由:</Text> 使用頻度が低く、特殊用途のため
        </Paragraph>
        <Paragraph>
          <Text strong>用途:</Text> 特定の状態を強調する場合のみ
        </Paragraph>

        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
          <Title level={5}>エラー状態（赤）</Title>
          <Divider style={{ borderColor: '#d32f2f' }} />

          <Title level={5}>成功状態（緑）</Title>
          <Divider style={{ borderColor: '#2e7d32' }} />

          <Title level={5}>警告状態（オレンジ）</Title>
          <Divider style={{ borderColor: '#ed6c02' }} />

          <Title level={5}>情報状態（青）</Title>
          <Divider style={{ borderColor: '#0093CF' }} />
        </div>
      </Card>

      {/* 除外パターン: 破線Divider */}
      <Card title="除外パターン: 破線Divider" style={{ marginBottom: 24 }}>
        <Paragraph>
          <Text strong>対応する標準パターン:</Text> パターン1（水平線）のスタイル変化版
        </Paragraph>
        <Paragraph>
          <Text strong>除外理由:</Text> 使用頻度が低いため
        </Paragraph>
        <Paragraph>
          <Text strong>用途:</Text> 視覚的な区別が必要な場合のみ
        </Paragraph>

        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
          <Title level={5}>破線スタイル</Title>
          <Paragraph>通常のコンテンツ</Paragraph>

          <Divider dashed />

          <Paragraph>破線で区切られたコンテンツ</Paragraph>

          <Divider dashed>破線 + テキスト</Divider>

          <Paragraph>破線とテキストを組み合わせることも可能です</Paragraph>
        </div>
      </Card>

      {/* 除外パターン: プレーンテキストDivider */}
      <Card
        title="除外パターン: プレーンテキストDivider"
        style={{ marginBottom: 24 }}
      >
        <Paragraph>
          <Text strong>対応する標準パターン:</Text> パターン3（テキスト付き水平線）の変種
        </Paragraph>
        <Paragraph>
          <Text strong>除外理由:</Text> 使用頻度が低いため
        </Paragraph>
        <Paragraph>
          <Text strong>用途:</Text> テキストを目立たせたくない場合のみ
        </Paragraph>

        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
          <Title level={5}>通常のテキスト付きDivider</Title>
          <Divider>通常のテキスト</Divider>
          <Paragraph>テキストが通常のフォントウェイトで表示されます</Paragraph>

          <Title level={5}>プレーンテキストDivider</Title>
          <Divider plain>プレーンテキスト</Divider>
          <Paragraph>テキストが淡色で控えめに表示されます</Paragraph>

          <Divider orientation="left" orientationMargin={0} plain>
            左揃えプレーン
          </Divider>
          <Paragraph>左揃えのプレーンテキストです</Paragraph>

          <Divider orientation="right" orientationMargin={0} plain>
            右揃えプレーン
          </Divider>
          <Paragraph>右揃えのプレーンテキストです</Paragraph>
        </div>
      </Card>

      {/* 実際の使用例: ユーザープロファイル */}
      <Card title="実際の使用例: ユーザープロファイル" style={{ marginBottom: 24 }}>
        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
          <Card>
            <Flex align="center" gap={16}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#CF0027',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 24,
                  fontWeight: 'bold',
                }}
              >
                山田
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  山田 太郎
                </Title>
                <Text type="secondary">シニアエンジニア</Text>
              </div>
            </Flex>

            <Divider orientation="left" orientationMargin={0}>基本情報</Divider>

            <Paragraph>
              <Text strong>メール:</Text> yamada@example.com
            </Paragraph>
            <Paragraph>
              <Text strong>電話:</Text> 03-1234-5678
            </Paragraph>
            <Paragraph>
              <Text strong>部署:</Text> 開発部
            </Paragraph>

            <Divider orientation="left" orientationMargin={0}>所属プロジェクト</Divider>

            <Space direction="vertical" style={{ width: '100%' }}>
              <Tag color="blue">MaiML Viewer</Tag>
              <Tag color="green">データ分析基盤</Tag>
              <Tag color="orange">実験管理システム</Tag>
            </Space>

            <Divider orientation="left" orientationMargin={0}>スキル</Divider>

            <Space wrap>
              <Tag>React</Tag>
              <Tag>TypeScript</Tag>
              <Tag>Node.js</Tag>
              <Tag>PostgreSQL</Tag>
              <Tag>AWS</Tag>
            </Space>

            <Divider />

            <Space split={<Divider type="vertical" />}>
              <Button type="primary">編集</Button>
              <Button>メッセージ</Button>
              <Button>詳細表示</Button>
            </Space>
          </Card>
        </div>
      </Card>

      {/* 実際の使用例: ダッシュボード */}
      <Card title="実際の使用例: ダッシュボード" style={{ marginBottom: 24 }}>
        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
          <Card>
            <Divider orientation="left" orientationMargin={0}>今日の統計</Divider>

            <Flex justify="space-between">
              <div>
                <Text type="secondary">訪問者数</Text>
                <Title level={3} style={{ margin: '8px 0' }}>
                  1,234
                </Title>
              </div>
              <div>
                <Text type="secondary">新規ユーザー</Text>
                <Title level={3} style={{ margin: '8px 0' }}>
                  56
                </Title>
              </div>
              <div>
                <Text type="secondary">成約数</Text>
                <Title level={3} style={{ margin: '8px 0' }}>
                  78
                </Title>
              </div>
            </Flex>

            <Divider>最近のアクティビティ</Divider>

            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>新しいプロジェクトが作成されました</Text>
                <Divider type="vertical" />
                <Text type="secondary">2時間前</Text>
              </div>
              <div>
                <Text>ユーザー「佐藤」が参加しました</Text>
                <Divider type="vertical" />
                <Text type="secondary">5時間前</Text>
              </div>
              <div>
                <Text>レポートが生成されました</Text>
                <Divider type="vertical" />
                <Text type="secondary">1日前</Text>
              </div>
            </Space>

            <Divider orientation="right" orientationMargin={0}>2024-12-26</Divider>
          </Card>
        </div>
      </Card>

      {/* レスポンシブデモ */}
      <Card title="レスポンシブ対応" style={{ marginBottom: 24 }}>
        <Paragraph>
          垂直線はモバイルビューでは表示されず、Spaceコンポーネントがwrapされます。
        </Paragraph>
        <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
          <Title level={5}>レスポンシブボタングループ</Title>
          <Space wrap split={<Divider type="vertical" />}>
            <Button>ボタン1</Button>
            <Button>ボタン2</Button>
            <Button>ボタン3</Button>
            <Button>ボタン4</Button>
            <Button>ボタン5</Button>
            <Button>ボタン6</Button>
          </Space>
          <Paragraph style={{ marginTop: 16 }}>
            <Text type="secondary">
              ※ 画面幅を狭めると、ボタンが折り返されます
            </Text>
          </Paragraph>
        </div>
      </Card>
    </div>
  );
}
