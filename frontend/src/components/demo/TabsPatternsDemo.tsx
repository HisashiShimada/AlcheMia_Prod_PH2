'use client';

import React, { useState } from 'react';
import { Tabs, Card, Space, theme, Divider, Typography, Button } from 'antd';
import {
  HomeOutlined,
  UserOutlined,
  SettingOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  FileTextOutlined,
  TeamOutlined,
  SafetyOutlined,
  BellOutlined,
  PlusOutlined,
  SearchOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { useToken } = theme;

export default function TabsPatternsDemo() {
  const { token } = useToken();
  const [activeKey, setActiveKey] = useState('1');
  const [editableTabs, setEditableTabs] = useState([
    { key: '1', label: 'ドキュメント1', children: 'ドキュメント1の内容が表示されます' },
    { key: '2', label: 'ドキュメント2', children: 'ドキュメント2の内容が表示されます' },
  ]);
  const [editableActiveKey, setEditableActiveKey] = useState('1');

  // Editable Tabs用のハンドラ
  const onEditableTabs = (
    targetKey: string | React.MouseEvent | React.KeyboardEvent,
    action: 'add' | 'remove'
  ) => {
    if (action === 'add') {
      const newKey = String(editableTabs.length + 1);
      setEditableTabs([
        ...editableTabs,
        {
          key: newKey,
          label: `ドキュメント${newKey}`,
          children: `ドキュメント${newKey}の内容が表示されます`,
        },
      ]);
      setEditableActiveKey(newKey);
    } else {
      const newTabs = editableTabs.filter((tab) => tab.key !== targetKey);
      setEditableTabs(newTabs);
      if (editableActiveKey === targetKey && newTabs.length > 0) {
        setEditableActiveKey(newTabs[0].key);
      }
    }
  };

  return (
    <div style={{ padding: '24px', background: token.colorBgLayout }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <Card>
          <Title level={2}>タブ切り替えパターン</Title>
          <Paragraph>
            Ant Design v6のTabsコンポーネントを使用した、標準的なタブ切り替えパターンを紹介します。
          </Paragraph>
          <Paragraph>
            このデモでは、以下の3つの標準パターンを実装しています：
          </Paragraph>
          <ul>
            <li><Text strong>パターン1: Line Tabs</Text> - コンテンツの切り替え全般</li>
            <li><Text strong>パターン2: Card Tabs</Text> - セクション分け、ページ内のコンテンツグループ</li>
            <li><Text strong>パターン3: Vertical Tabs</Text> - サイドバーでの設定項目切り替え、多数のタブ項目</li>
          </ul>
        </Card>

        {/* パターン1: Line Tabs（標準タブ） */}
        <Card title="パターン1: Line Tabs（標準タブ）">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph>
              <Text strong>用途:</Text> コンテンツの切り替え全般
            </Paragraph>
            <Paragraph>
              <Text strong>特徴:</Text>
              <ul>
                <li>タブヘッダー高さ: 46px</li>
                <li>インジケーター高さ: 2px</li>
                <li>インジケーター色: #CF0027（プライマリカラー）</li>
                <li>タブ間隔: 32px</li>
              </ul>
            </Paragraph>

            {/* 基本パターン */}
            <div>
              <Text type="secondary">基本パターン（テキストのみ）</Text>
              <Divider style={{ margin: '12px 0' }} />
              <Tabs
                activeKey={activeKey}
                onChange={setActiveKey}
                items={[
                  {
                    key: '1',
                    label: '基本情報',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer }}>
                        <Title level={4}>基本情報</Title>
                        <Paragraph>ここには基本情報のコンテンツが表示されます。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '2',
                    label: '詳細設定',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer }}>
                        <Title level={4}>詳細設定</Title>
                        <Paragraph>ここには詳細設定のコンテンツが表示されます。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '3',
                    label: '履歴',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer }}>
                        <Title level={4}>履歴</Title>
                        <Paragraph>ここには履歴のコンテンツが表示されます。</Paragraph>
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            {/* アイコン付きパターン */}
            <div>
              <Text type="secondary">アイコン付きパターン</Text>
              <Divider style={{ margin: '12px 0' }} />
              <Tabs
                items={[
                  {
                    key: '1',
                    label: (
                      <Space size={8}>
                        <HomeOutlined style={{ fontSize: 16 }} />
                        ホーム
                      </Space>
                    ),
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer }}>
                        <Title level={4}>ホーム</Title>
                        <Paragraph>ホーム画面のコンテンツが表示されます。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '2',
                    label: (
                      <Space size={8}>
                        <UserOutlined style={{ fontSize: 16 }} />
                        プロフィール
                      </Space>
                    ),
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer }}>
                        <Title level={4}>プロフィール</Title>
                        <Paragraph>プロフィール情報が表示されます。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '3',
                    label: (
                      <Space size={8}>
                        <SettingOutlined style={{ fontSize: 16 }} />
                        設定
                      </Space>
                    ),
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer }}>
                        <Title level={4}>設定</Title>
                        <Paragraph>各種設定項目が表示されます。</Paragraph>
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            {/* 無効タブを含むパターン */}
            <div>
              <Text type="secondary">無効タブを含むパターン</Text>
              <Divider style={{ margin: '12px 0' }} />
              <Tabs
                items={[
                  {
                    key: '1',
                    label: 'アクティブ',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer }}>
                        <Paragraph>このタブは有効です。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '2',
                    label: '無効',
                    disabled: true,
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer }}>
                        <Paragraph>このタブは無効です。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '3',
                    label: '通常',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer }}>
                        <Paragraph>このタブは有効です。</Paragraph>
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            {/* 追加コンテンツ付きタブ */}
            <div>
              <Text type="secondary">追加コンテンツ付きタブ（tabBarExtraContent）</Text>
              <Divider style={{ margin: '12px 0' }} />
              <Tabs
                tabBarExtraContent={
                  <Button type="primary" icon={<PlusOutlined />}>
                    追加
                  </Button>
                }
                items={[
                  {
                    key: '1',
                    label: 'タブ1',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer }}>
                        <Paragraph>右上にアクションボタンが表示されています。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '2',
                    label: 'タブ2',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer }}>
                        <Paragraph>タブバーの右端に追加コンテンツを配置できます。</Paragraph>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </Space>
        </Card>

        {/* パターン2: Card Tabs（カード型タブ） */}
        <Card title="パターン2: Card Tabs（カード型タブ）">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph>
              <Text strong>用途:</Text> セクション分け、ページ内のコンテンツグループ
            </Paragraph>
            <Paragraph>
              <Text strong>特徴:</Text>
              <ul>
                <li>タブヘッダー高さ: 40px</li>
                <li>ボーダー: 1px solid</li>
                <li>アクティブ時ボーダー色: #CF0027（プライマリカラー）</li>
                <li>角丸: 8px（上部のみ）</li>
              </ul>
            </Paragraph>

            {/* 基本パターン */}
            <div>
              <Text type="secondary">基本パターン</Text>
              <Divider style={{ margin: '12px 0' }} />
              <Tabs
                type="card"
                items={[
                  {
                    key: '1',
                    label: 'セクション1',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, border: `1px solid ${token.colorBorder}`, borderTop: 'none' }}>
                        <Title level={4}>セクション1</Title>
                        <Paragraph>カード型タブは、セクションを明確に分けるのに適しています。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '2',
                    label: 'セクション2',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, border: `1px solid ${token.colorBorder}`, borderTop: 'none' }}>
                        <Title level={4}>セクション2</Title>
                        <Paragraph>タブとコンテンツエリアが視覚的に一体化します。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '3',
                    label: 'セクション3',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, border: `1px solid ${token.colorBorder}`, borderTop: 'none' }}>
                        <Title level={4}>セクション3</Title>
                        <Paragraph>明確な境界線により、コンテンツの区切りが分かりやすくなります。</Paragraph>
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            {/* アイコン付きパターン */}
            <div>
              <Text type="secondary">アイコン付きパターン</Text>
              <Divider style={{ margin: '12px 0' }} />
              <Tabs
                type="card"
                items={[
                  {
                    key: '1',
                    label: (
                      <Space size={8}>
                        <AppstoreOutlined style={{ fontSize: 16 }} />
                        ダッシュボード
                      </Space>
                    ),
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, border: `1px solid ${token.colorBorder}`, borderTop: 'none' }}>
                        <Title level={4}>ダッシュボード</Title>
                        <Paragraph>全体の状況を確認できます。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '2',
                    label: (
                      <Space size={8}>
                        <BarChartOutlined style={{ fontSize: 16 }} />
                        統計
                      </Space>
                    ),
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, border: `1px solid ${token.colorBorder}`, borderTop: 'none' }}>
                        <Title level={4}>統計</Title>
                        <Paragraph>詳細な統計情報を表示します。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '3',
                    label: (
                      <Space size={8}>
                        <FileTextOutlined style={{ fontSize: 16 }} />
                        レポート
                      </Space>
                    ),
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, border: `1px solid ${token.colorBorder}`, borderTop: 'none' }}>
                        <Title level={4}>レポート</Title>
                        <Paragraph>各種レポートを閲覧できます。</Paragraph>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </Space>
        </Card>

        {/* パターン3: Vertical Tabs（縦配置タブ） */}
        <Card title="パターン3: Vertical Tabs（縦配置タブ）">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph>
              <Text strong>用途:</Text> サイドバーでの設定項目切り替え、多数のタブ項目
            </Paragraph>
            <Paragraph>
              <Text strong>特徴:</Text>
              <ul>
                <li>タブ幅: 200px（固定）</li>
                <li>タブ高さ: 46px</li>
                <li>インジケーター幅: 3px</li>
                <li>インジケーター色: #CF0027（プライマリカラー）</li>
              </ul>
            </Paragraph>

            {/* 基本パターン */}
            <div>
              <Text type="secondary">基本パターン（左配置）</Text>
              <Divider style={{ margin: '12px 0' }} />
              <Tabs
                tabPosition="left"
                style={{ minHeight: 300 }}
                items={[
                  {
                    key: '1',
                    label: 'アカウント設定',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, minHeight: 300 }}>
                        <Title level={4}>アカウント設定</Title>
                        <Paragraph>ユーザー名、メールアドレスなどの基本情報を設定します。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '2',
                    label: 'セキュリティ',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, minHeight: 300 }}>
                        <Title level={4}>セキュリティ</Title>
                        <Paragraph>パスワード変更、二段階認証の設定を行います。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '3',
                    label: '通知設定',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, minHeight: 300 }}>
                        <Title level={4}>通知設定</Title>
                        <Paragraph>メール通知、プッシュ通知の設定を行います。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '4',
                    label: 'プライバシー',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, minHeight: 300 }}>
                        <Title level={4}>プライバシー</Title>
                        <Paragraph>プライバシー設定、データの共有範囲を設定します。</Paragraph>
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            {/* アイコン付きパターン */}
            <div>
              <Text type="secondary">アイコン付きパターン（左配置）</Text>
              <Divider style={{ margin: '12px 0' }} />
              <Tabs
                tabPosition="left"
                style={{ minHeight: 300 }}
                items={[
                  {
                    key: '1',
                    label: (
                      <Space size={8}>
                        <UserOutlined style={{ fontSize: 16 }} />
                        アカウント
                      </Space>
                    ),
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, minHeight: 300 }}>
                        <Title level={4}>アカウント</Title>
                        <Paragraph>アカウント情報を管理します。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '2',
                    label: (
                      <Space size={8}>
                        <SafetyOutlined style={{ fontSize: 16 }} />
                        セキュリティ
                      </Space>
                    ),
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, minHeight: 300 }}>
                        <Title level={4}>セキュリティ</Title>
                        <Paragraph>セキュリティ設定を行います。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '3',
                    label: (
                      <Space size={8}>
                        <BellOutlined style={{ fontSize: 16 }} />
                        通知
                      </Space>
                    ),
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, minHeight: 300 }}>
                        <Title level={4}>通知</Title>
                        <Paragraph>通知設定を管理します。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '4',
                    label: (
                      <Space size={8}>
                        <TeamOutlined style={{ fontSize: 16 }} />
                        チーム
                      </Space>
                    ),
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, minHeight: 300 }}>
                        <Title level={4}>チーム</Title>
                        <Paragraph>チーム設定を管理します。</Paragraph>
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            {/* 右配置パターン */}
            <div>
              <Text type="secondary">右配置パターン</Text>
              <Divider style={{ margin: '12px 0' }} />
              <Tabs
                tabPosition="right"
                style={{ minHeight: 300 }}
                items={[
                  {
                    key: '1',
                    label: '設定1',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, minHeight: 300 }}>
                        <Title level={4}>設定1</Title>
                        <Paragraph>右側にタブが配置されます。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '2',
                    label: '設定2',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, minHeight: 300 }}>
                        <Title level={4}>設定2</Title>
                        <Paragraph>レイアウトに応じて左右を選択できます。</Paragraph>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </Space>
        </Card>

        {/* 特殊パターン: Editable Tabs */}
        <Card title="特殊パターン: Editable Tabs（編集可能なタブ）">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph>
              <Text strong>用途:</Text> ドキュメントエディタ、複数ファイル管理、ブラウザタブ風UI
            </Paragraph>
            <Paragraph>
              <Text strong>特徴:</Text>
              <ul>
                <li>タブの追加・削除が可能</li>
                <li>Card型のスタイル</li>
                <li>追加ボタン（+）と閉じるボタン（×）を含む</li>
              </ul>
            </Paragraph>

            <div>
              <Text type="secondary">編集可能なタブ</Text>
              <Divider style={{ margin: '12px 0' }} />
              <Tabs
                type="editable-card"
                activeKey={editableActiveKey}
                onChange={setEditableActiveKey}
                onEdit={onEditableTabs}
                items={editableTabs}
              />
            </div>
          </Space>
        </Card>

        {/* 特殊パターン: Centered Tabs */}
        <Card title="特殊パターン: Centered Tabs（中央揃えタブ）">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Paragraph>
              <Text strong>用途:</Text> ページ全体のナビゲーション、ランディングページ
            </Paragraph>
            <Paragraph>
              <Text strong>特徴:</Text>
              <ul>
                <li>タブが中央に配置される</li>
                <li>Line型のスタイル</li>
                <li>シンメトリックなデザイン</li>
              </ul>
            </Paragraph>

            <div>
              <Text type="secondary">中央揃えタブ</Text>
              <Divider style={{ margin: '12px 0' }} />
              <Tabs
                centered
                items={[
                  {
                    key: '1',
                    label: '概要',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, textAlign: 'center' }}>
                        <Title level={4}>概要</Title>
                        <Paragraph>中央揃えのタブはランディングページなどに適しています。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '2',
                    label: '機能',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, textAlign: 'center' }}>
                        <Title level={4}>機能</Title>
                        <Paragraph>対称的なデザインが特徴です。</Paragraph>
                      </div>
                    ),
                  },
                  {
                    key: '3',
                    label: '料金',
                    children: (
                      <div style={{ padding: '24px', background: token.colorBgContainer, textAlign: 'center' }}>
                        <Title level={4}>料金</Title>
                        <Paragraph>プロモーションページなどで使用されます。</Paragraph>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </Space>
        </Card>

        {/* 実装時の注意点 */}
        <Card title="実装時の注意点">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Title level={4}>タブの数</Title>
            <ul>
              <li><Text strong>1-5個:</Text> Line Tabs推奨</li>
              <li><Text strong>6-10個:</Text> Vertical Tabs検討</li>
              <li><Text strong>11個以上:</Text> ドロップダウンメニューやアコーディオンを検討</li>
            </ul>

            <Title level={4}>レスポンシブ対応</Title>
            <ul>
              <li><Text strong>モバイル:</Text> タブを縦配置に変更、またはドロップダウンメニューに変換</li>
              <li><Text strong>タブレット:</Text> 標準のLine TabsまたはCard Tabs</li>
              <li><Text strong>デスクトップ:</Text> すべてのパターンを使用可能</li>
            </ul>

            <Title level={4}>アクセシビリティ</Title>
            <ul>
              <li><Text strong>キーボード操作:</Text> 矢印キーでタブ間を移動</li>
              <li><Text strong>スクリーンリーダー:</Text> role属性が自動設定される</li>
              <li><Text strong>フォーカス表示:</Text> アウトライン2px solid #CF0027</li>
            </ul>

            <Title level={4}>パフォーマンス</Title>
            <ul>
              <li><Text code>destroyInactiveTabPane=&#123;true&#125;</Text> で非アクティブタブを破棄</li>
              <li>大量のタブ: 仮想スクロールを検討（カスタム実装が必要）</li>
            </ul>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
