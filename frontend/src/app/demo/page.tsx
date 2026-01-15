/**
 * UI要素デザイン統一 Demoメニュー画面
 * 
 * 各UI要素のパターンデモ画面へのナビゲーションを提供します。
 */

'use client';

import React from 'react';
import { Card, Space, Button, Row, Col, Typography, Divider } from 'antd';
import {
  FontSizeOutlined,
  CheckSquareOutlined,
  RadiusSettingOutlined,
  DownOutlined,
  LoadingOutlined,
  FormOutlined,
  TableOutlined,
  CloudUploadOutlined,
  MessageOutlined,
  TagOutlined,
  LayoutOutlined,
  BulbOutlined,
  WindowsOutlined,
  CheckCircleOutlined,
  MenuOutlined,
  UserOutlined,
  LockOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Paragraph } = Typography;

/**
 * デモ画面の定義
 */
interface DemoItem {
  key: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  category: 'input' | 'display' | 'feedback' | 'layout';
}

const demoItems: DemoItem[] = [
  // 入力系コンポーネント
  {
    key: 'button',
    title: 'ボタン',
    description: 'プライマリ、セカンダリ、テキストボタンなど',
    path: '/demo/button-patterns',
    icon: <BulbOutlined />,
    category: 'input'
  },
  {
    key: 'textbox',
    title: 'テキストボックス',
    description: 'テキスト入力、検索、パスワードフィールドなど',
    path: '/demo/textbox-patterns',
    icon: <FontSizeOutlined />,
    category: 'input'
  },
  {
    key: 'textarea',
    title: '複数行テキスト入力',
    description: '標準4行、自動高さ調整、文字数カウンター付きなど',
    path: '/demo/textarea-patterns',
    icon: <FormOutlined />,
    category: 'input'
  },
  {
    key: 'password',
    title: 'パスワード入力',
    description: '標準、表示切替付き、強度インジケーター付きなど',
    path: '/demo/password-patterns',
    icon: <LockOutlined />,
    category: 'input'
  },
  {
    key: 'search-input',
    title: '検索専用入力',
    description: '基本検索、テーブル検索、グローバル検索、インラインフィルタなど',
    path: '/demo/search-input-patterns',
    icon: <SearchOutlined />,
    category: 'input'
  },
  {
    key: 'checkbox',
    title: 'チェックボックス',
    description: '単一選択、複数選択、全選択など',
    path: '/demo/checkbox-patterns',
    icon: <CheckSquareOutlined />,
    category: 'input'
  },
  {
    key: 'radiobutton',
    title: 'ラジオボタン',
    description: '単一選択、グループ選択など',
    path: '/demo/radiobutton-patterns',
    icon: <RadiusSettingOutlined />,
    category: 'input'
  },
  {
    key: 'select',
    title: 'セレクト',
    description: '標準セレクト、複数選択、検索可能セレクトなど',
    path: '/demo/select-patterns',
    icon: <DownOutlined />,
    category: 'input'
  },
  {
    key: 'switch',
    title: 'スイッチ',
    description: 'ON/OFF切り替え、トグルスイッチなど',
    path: '/demo/switch-patterns',
    icon: <FormOutlined />,
    category: 'input'
  },
  {
    key: 'upload',
    title: 'アップロード',
    description: 'ファイルアップロード、ドラッグ&ドロップなど',
    path: '/demo/upload-patterns',
    icon: <CloudUploadOutlined />,
    category: 'input'
  },
  {
    key: 'form',
    title: 'フォーム管理',
    description: '基本フォーム、コンパクトフォーム、縦配置、インラインなど',
    path: '/demo/form-patterns',
    icon: <FormOutlined />,
    category: 'input'
  },
  // 表示系コンポーネント
  {
    key: 'typography',
    title: 'タイポグラフィ',
    description: 'タイトル、テキスト、段落、見出しレベルなど',
    path: '/demo/typography-patterns',
    icon: <FontSizeOutlined />,
    category: 'display'
  },
  {
    key: 'table',
    title: 'テーブル',
    description: 'データテーブル、ソート、フィルタリングなど',
    path: '/demo/table-patterns',
    icon: <TableOutlined />,
    category: 'display'
  },
  {
    key: 'datatable',
    title: 'データテーブル表示',
    description: 'シンプル表示、データ管理表示、詳細表示など',
    path: '/demo/datatable-patterns',
    icon: <TableOutlined />,
    category: 'display'
  },
  {
    key: 'status-label',
    title: 'ステータスラベル',
    description: '状態表示、タグ、バッジなど',
    path: '/demo/status-label-patterns',
    icon: <TagOutlined />,
    category: 'display'
  },
  {
    key: 'menu',
    title: 'メニュー',
    description: 'ナビゲーションメニュー全5パターン',
    path: '/demo/menu-patterns',
    icon: <MenuOutlined />,
    category: 'display'
  },
  {
    key: 'tabs',
    title: 'タブ切り替え',
    description: 'Line Tabs、Card Tabs、Vertical Tabsなど',
    path: '/demo/tabs-patterns',
    icon: <WindowsOutlined />,
    category: 'display'
  },
  {
    key: 'breadcrumb',
    title: 'パンくずリスト',
    description: '標準パンくずリスト、アイコン付き、ドロップダウン付きなど',
    path: '/demo/breadcrumb-patterns',
    icon: <MenuOutlined />,
    category: 'display'
  },
  {
    key: 'pagination',
    title: 'ページネーション',
    description: '基本ページネーション、フル機能、ミニサイズなど',
    path: '/demo/pagination-patterns',
    icon: <TableOutlined />,
    category: 'display'
  },
  {
    key: 'steps',
    title: 'ステップ表示',
    description: '水平ステップ、垂直ステップ、ナビゲーションステップなど',
    path: '/demo/steps-patterns',
    icon: <CheckCircleOutlined />,
    category: 'display'
  },
  {
    key: 'user-avatar',
    title: 'ユーザーアイコン',
    description: 'ヘッダー用、リスト用、小型アイコンなど',
    path: '/demo/user-avatar-patterns',
    icon: <UserOutlined />,
    category: 'display'
  },
  {
    key: 'image-preview',
    title: '画像表示',
    description: 'サムネイル、通常表示、プレビューモーダル、ギャラリーなど',
    path: '/demo/image-preview-patterns',
    icon: <WindowsOutlined />,
    category: 'display'
  },
  {
    key: 'badge',
    title: 'バッジ表示',
    description: '数値バッジ、ドットバッジ、ステータスバッジなど',
    path: '/demo/badge-patterns',
    icon: <TagOutlined />,
    category: 'display'
  },
  {
    key: 'list',
    title: 'リスト表示',
    description: 'シンプル、アイコン付き、説明付き、アクション付き、ステータス付きなど',
    path: '/demo/list-patterns',
    icon: <MenuOutlined />,
    category: 'display'
  },
  {
    key: 'tree',
    title: 'ツリー構造表示',
    description: '標準ツリー、チェックボックスツリー、ディレクトリツリー、検索可能ツリーなど',
    path: '/demo/tree-patterns',
    icon: <MenuOutlined />,
    category: 'display'
  },
  {
    key: 'divider',
    title: 'セクション区切り線',
    description: '水平線、垂直線、テキスト付き水平線など',
    path: '/demo/divider-patterns',
    icon: <MenuOutlined />,
    category: 'display'
  },
  {
    key: 'collapse',
    title: '折りたたみパネル',
    description: '標準折りたたみ、アコーディオン、ボーダーレスなど',
    path: '/demo/collapse-patterns',
    icon: <MenuOutlined />,
    category: 'display'
  },
  {
    key: 'tooltip',
    title: 'ツールチップ表示',
    description: '情報表示、データ省略、操作説明、ステータス説明など',
    path: '/demo/tooltip-patterns',
    icon: <MessageOutlined />,
    category: 'display'
  },
  {
    key: 'popover',
    title: 'ポップオーバー表示',
    description: 'シンプルなテキスト、データラベル＋値、リスト、アクション付きなど',
    path: '/demo/popover-patterns',
    icon: <MessageOutlined />,
    category: 'display'
  },
  // フィードバック系コンポーネント
  {
    key: 'toast',
    title: 'トーストメッセージ',
    description: '成功、エラー、警告、情報、ローディングメッセージなど',
    path: '/demo/toast-patterns',
    icon: <MessageOutlined />,
    category: 'feedback'
  },
  {
    key: 'alert-notification',
    title: '警告・情報表示',
    description: 'Alert、Message、Notificationの使い分け',
    path: '/demo/alert-notification-patterns',
    icon: <MessageOutlined />,
    category: 'feedback'
  },
  {
    key: 'notification',
    title: '通知メッセージ',
    description: '成功、情報、警告、エラー通知など',
    path: '/demo/notification-patterns',
    icon: <MessageOutlined />,
    category: 'feedback'
  },
  {
    key: 'loading-spinner',
    title: 'ローディングスピナー',
    description: '読み込み中表示、プログレスバーなど',
    path: '/demo/loading-spinner-patterns',
    icon: <LoadingOutlined />,
    category: 'feedback'
  },
  {
    key: 'progress',
    title: '進捗状況表示',
    description: '線形プログレス、円形プログレス、ステップ表示など',
    path: '/demo/progress-patterns',
    icon: <LoadingOutlined />,
    category: 'feedback'
  },
  {
    key: 'skeleton',
    title: 'スケルトンスクリーン',
    description: 'カード、テーブル、フォーム、テキストブロックなど',
    path: '/demo/skeleton-patterns',
    icon: <LoadingOutlined />,
    category: 'feedback'
  },
  {
    key: 'modal',
    title: 'モーダルダイアログ',
    description: '標準モーダル、大型モーダル、全画面モーダルなど',
    path: '/demo/modal-patterns',
    icon: <WindowsOutlined />,
    category: 'feedback'
  },
  {
    key: 'popconfirm',
    title: 'ポップアップ確認',
    description: '削除確認、標準確認、情報確認など',
    path: '/demo/popconfirm-patterns',
    icon: <MessageOutlined />,
    category: 'feedback'
  },
  {
    key: 'drawer',
    title: 'サイドドロワー',
    description: '標準サイドドロワー、詳細表示、ナビゲーションなど',
    path: '/demo/drawer-patterns',
    icon: <LayoutOutlined />,
    category: 'feedback'
  },
  {
    key: 'result-page',
    title: '結果ページ',
    description: '成功、エラー、404、403、500などの全画面結果表示',
    path: '/demo/result-page-patterns',
    icon: <CheckCircleOutlined />,
    category: 'feedback'
  },
  {
    key: 'empty-state',
    title: '空状態表示',
    description: 'データなし、検索結果なし、初期状態の表示など',
    path: '/demo/empty-state-patterns',
    icon: <WindowsOutlined />,
    category: 'feedback'
  },
  // レイアウト系コンポーネント
  {
    key: 'layout',
    title: 'レイアウト',
    description: 'グリッド、スペーシング、レスポンシブなど',
    path: '/demo/layout-patterns',
    icon: <LayoutOutlined />,
    category: 'layout'
  },
  {
    key: 'grid-layout',
    title: 'グリッドレイアウト',
    description: 'フォーム2カラム、カードグリッド、データ表示、サイドバー付きなど',
    path: '/demo/grid-layout-patterns',
    icon: <LayoutOutlined />,
    category: 'layout'
  },
  {
    key: 'card',
    title: 'カード',
    description: '標準カード、小型カード、ホバーカード、統計カードなど',
    path: '/demo/card-patterns',
    icon: <WindowsOutlined />,
    category: 'layout'
  },
  {
    key: 'spacing',
    title: 'スペーシング',
    description: '要素間の余白、8px基準システム、パターン別スペーシングなど',
    path: '/demo/spacing-patterns',
    icon: <LayoutOutlined />,
    category: 'layout'
  },
  {
    key: 'flex',
    title: 'Flexレイアウト',
    description: '水平配置、垂直配置、中央配置、ラップ付き配置など',
    path: '/demo/flex-patterns',
    icon: <LayoutOutlined />,
    category: 'layout'
  },
  {
    key: 'config-provider',
    title: 'テーマ設定・国際化',
    description: 'テーマ設定、国際化、ダークモード、組織別テーマなど',
    path: '/demo/config-provider-patterns',
    icon: <BulbOutlined />,
    category: 'layout'
  }
];

/**
 * カテゴリごとのタイトル
 */
const categoryTitles: Record<string, string> = {
  input: '入力系コンポーネント',
  display: '表示系コンポーネント',
  feedback: 'フィードバック系コンポーネント',
  layout: 'レイアウト系コンポーネント'
};

/**
 * カテゴリごとの色
 */
const categoryColors: Record<string, string> = {
  input: '#1890ff',
  display: '#52c41a',
  feedback: '#faad14',
  layout: '#722ed1'
};

export default function DemoMenuPage() {
  const router = useRouter();

  /**
   * デモ画面への遷移
   */
  const handleNavigate = (path: string) => {
    router.push(path);
  };

  /**
   * カテゴリごとにグループ化
   */
  const groupedItems = demoItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, DemoItem[]>);

  return (
    <div style={{ padding: '24px', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <Card
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
      >
        {/* ヘッダー */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#CF0027', marginBottom: 8 }}>
            UI要素デザイン統一 Demo
          </Title>
          <Paragraph type="secondary">
            MaiML Viewerで使用する各UI要素のデザインパターンを確認できます
          </Paragraph>
        </div>

        <Divider />

        {/* カテゴリごとのセクション */}
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <Title
                level={4}
                style={{
                  color: categoryColors[category],
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <span
                  style={{
                    width: 4,
                    height: 20,
                    backgroundColor: categoryColors[category],
                    borderRadius: 2,
                    display: 'inline-block'
                  }}
                />
                {categoryTitles[category]}
              </Title>

              <Row gutter={[16, 16]}>
                {items.map((item) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={item.key}>
                    <Card
                      hoverable
                      style={{
                        height: '100%',
                        borderRadius: 8,
                        transition: 'all 0.3s ease'
                      }}
                      bodyStyle={{
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                      }}
                      onClick={() => handleNavigate(item.path)}
                    >
                      <div
                        style={{
                          fontSize: 32,
                          color: categoryColors[category],
                          marginBottom: 12,
                          textAlign: 'center'
                        }}
                      >
                        {item.icon}
                      </div>
                      <Title level={5} style={{ marginBottom: 8, textAlign: 'center' }}>
                        {item.title}
                      </Title>
                      <Paragraph
                        type="secondary"
                        style={{
                          fontSize: 13,
                          marginBottom: 16,
                          textAlign: 'center',
                          flex: 1
                        }}
                      >
                        {item.description}
                      </Paragraph>
                      <Button
                        type="primary"
                        block
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigate(item.path);
                        }}
                      >
                        詳細を見る
                      </Button>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </Space>

        {/* フッター情報 */}
        <Divider style={{ marginTop: 48 }} />
        <div style={{ textAlign: 'center' }}>
          <Paragraph type="secondary" style={{ fontSize: 13 }}>
            各デモ画面では、実際のUI要素のパターン、使用例、実装コードを確認できます。
            <br />
            デザインシステムの詳細は
            <a href="/docs/design/ui/ui_elements_catalog.md" style={{ marginLeft: 4 }}>
              UI要素カタログ
            </a>
            をご参照ください。
          </Paragraph>
        </div>
      </Card>
    </div>
  );
}
