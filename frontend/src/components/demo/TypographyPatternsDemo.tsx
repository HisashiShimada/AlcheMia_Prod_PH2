'use client';

import React, { useState } from 'react';
import { Card, Typography, Space, Row, Col, Divider, Button, message } from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  EditOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph, Link } = Typography;

/**
 * タイポグラフィパターンのデモコンポーネント
 * docs/design/ui/typography_policy.md に基づく全パターンを表示
 */
export default function TypographyPatternsDemo() {
  const [editableText, setEditableText] = useState('編集可能なテキスト');
  const [editableParagraph, setEditableParagraph] = useState(
    'この段落は編集可能です。クリックして内容を変更できます。'
  );

  const longText = `これは非常に長いテキストのサンプルです。実際のアプリケーションでは、
データベースから取得した説明文やユーザーのコメント、プロジェクトの概要などが
表示されることを想定しています。このような長文の場合、省略表示機能を使用することで、
UI を整理し、ユーザーが必要に応じて詳細を展開できるようになります。
省略表示は、カード内の説明文、テーブルのセル内の長文、リスト項目の詳細など、
様々な場面で活用できます。適切に使用することで、情報密度の高い UI を
提供しながらも、可読性とユーザビリティを保つことができます。`;

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <Card>
          <Title level={2}>タイポグラフィ（Typography）表示パターン</Title>
          <Paragraph>
            データ表示用のテキスト要素（Title, Text, Paragraph）の標準パターンを示します。
          </Paragraph>
          <Paragraph type="secondary">
            参照: <Text code>docs/design/ui/typography_policy.md</Text>
          </Paragraph>
        </Card>

        {/* パターン1-5: Titleレベル */}
        <Card title="パターン1-5: Titleレベル（見出し階層）">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Level 1 */}
            <div>
              <Text type="secondary" strong>
                パターン1: ページタイトル（Level 1）- 38px, 600
              </Text>
              <Divider style={{ margin: '8px 0' }} />
              <Title level={1} style={{ marginBottom: 0 }}>
                ページタイトル
              </Title>
              <Text type="secondary">
                用途: ページの最上位見出し
              </Text>
            </div>

            {/* Level 2 */}
            <div>
              <Text type="secondary" strong>
                パターン2: セクションタイトル（Level 2）- 30px, 600
              </Text>
              <Divider style={{ margin: '8px 0' }} />
              <Title level={2} style={{ marginBottom: 0 }}>
                セクションタイトル
              </Title>
              <Text type="secondary">
                用途: ページ内の大セクション見出し
              </Text>
            </div>

            {/* Level 3 */}
            <div>
              <Text type="secondary" strong>
                パターン3: サブセクションタイトル（Level 3）- 24px, 600
              </Text>
              <Divider style={{ margin: '8px 0' }} />
              <Title level={3} style={{ marginBottom: 0 }}>
                サブセクションタイトル
              </Title>
              <Text type="secondary">
                用途: セクション内のサブ見出し、カード内タイトル
              </Text>
            </div>

            {/* Level 4 */}
            <div>
              <Text type="secondary" strong>
                パターン4: 小見出し（Level 4）- 20px, 600
              </Text>
              <Divider style={{ margin: '8px 0' }} />
              <Title level={4} style={{ marginBottom: 0 }}>
                小見出し
              </Title>
              <Text type="secondary">
                用途: 詳細セクション、グループ化された項目の見出し
              </Text>
            </div>

            {/* Level 5 */}
            <div>
              <Text type="secondary" strong>
                パターン5: 最小見出し（Level 5）- 16px, 600
              </Text>
              <Divider style={{ margin: '8px 0' }} />
              <Title level={5} style={{ marginBottom: 0 }}>
                最小見出し
              </Title>
              <Text type="secondary">
                用途: 最小単位の見出し、リスト項目の見出し
              </Text>
            </div>
          </Space>
        </Card>

        {/* パターン6: 本文テキスト（Text） */}
        <Card title="パターン6: 本文テキスト（Text）- 14px, 400">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* 基本テキスト */}
            <div>
              <Text strong>基本バリエーション</Text>
              <Divider style={{ margin: '8px 0' }} />
              <Space direction="vertical" size="small">
                <Text>通常のテキスト（デフォルト）</Text>
                <Text strong>強調テキスト（strong）</Text>
                <Text type="secondary">二次テキスト（secondary）</Text>
                <Text type="success">成功メッセージ（success）</Text>
                <Text type="warning">警告メッセージ（warning）</Text>
                <Text type="danger">エラーメッセージ（danger）</Text>
                <Text disabled>無効なテキスト（disabled）</Text>
              </Space>
            </div>

            {/* 装飾バリエーション */}
            <div>
              <Text strong>装飾バリエーション</Text>
              <Divider style={{ margin: '8px 0' }} />
              <Space direction="vertical" size="small">
                <Text code>コード表示（code）</Text>
                <Text underline>下線テキスト（underline）</Text>
                <Text delete>削除済みテキスト（delete）</Text>
                <Text mark>ハイライトテキスト（mark）</Text>
                <Text keyboard>Ctrl+C（keyboard）</Text>
              </Space>
            </div>

            {/* サイズバリエーション */}
            <div>
              <Text strong>サイズバリエーション</Text>
              <Divider style={{ margin: '8px 0' }} />
              <Space direction="vertical" size="small">
                <Text style={{ fontSize: 12 }}>小さいテキスト（12px）</Text>
                <Text>通常テキスト（14px）</Text>
                <Text style={{ fontSize: 16 }}>大きいテキスト（16px）</Text>
              </Space>
            </div>

            {/* コピー可能 */}
            <div>
              <Text strong>コピー可能テキスト</Text>
              <Divider style={{ margin: '8px 0' }} />
              <Space direction="vertical" size="small">
                <Text copyable>コピー可能なテキスト</Text>
                <Text copyable={{ text: 'カスタムコピーテキスト' }}>
                  表示テキスト（カスタムコピー）
                </Text>
                <Text
                  copyable={{
                    onCopy: () => message.success('コピーしました'),
                  }}
                >
                  コピー時コールバック付き
                </Text>
              </Space>
            </div>

            {/* 編集可能 */}
            <div>
              <Text strong>編集可能テキスト</Text>
              <Divider style={{ margin: '8px 0' }} />
              <Text
                editable={{
                  onChange: setEditableText,
                  icon: <EditOutlined />,
                  tooltip: '編集',
                }}
              >
                {editableText}
              </Text>
            </div>
          </Space>
        </Card>

        {/* パターン7: 段落テキスト（Paragraph） */}
        <Card title="パターン7: 段落テキスト（Paragraph）- 14px, 400">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 通常の段落 */}
            <div>
              <Text strong>通常の段落</Text>
              <Divider style={{ margin: '8px 0' }} />
              <Paragraph>
                これは段落テキストです。複数行にわたる長文を表示する際に使用します。
                段落として適切な行間とマージンが自動的に適用されます。
              </Paragraph>
              <Paragraph type="secondary">
                二次色の段落テキストも使用できます。補足情報や注意事項の表示に適しています。
              </Paragraph>
            </div>

            {/* 省略表示 */}
            <div>
              <Text strong>省略表示（Ellipsis）</Text>
              <Divider style={{ margin: '8px 0' }} />
              
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">1行省略</Text>
                  <Paragraph ellipsis style={{ marginBottom: 0 }}>
                    {longText}
                  </Paragraph>
                </div>

                <div>
                  <Text type="secondary">2行省略</Text>
                  <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
                    {longText}
                  </Paragraph>
                </div>

                <div>
                  <Text type="secondary">3行省略（拡張可能）</Text>
                  <Paragraph
                    ellipsis={{
                      rows: 3,
                      expandable: true,
                      symbol: 'もっと見る',
                    }}
                    style={{ marginBottom: 0 }}
                  >
                    {longText}
                  </Paragraph>
                </div>
              </Space>
            </div>

            {/* 編集可能な段落 */}
            <div>
              <Text strong>編集可能な段落</Text>
              <Divider style={{ margin: '8px 0' }} />
              <Paragraph
                editable={{
                  onChange: setEditableParagraph,
                  icon: <EditOutlined />,
                  tooltip: '編集',
                }}
              >
                {editableParagraph}
              </Paragraph>
            </div>
          </Space>
        </Card>

        {/* 実用例 */}
        <Card title="実用例">
          <Row gutter={[16, 16]}>
            {/* 例1: ページヘッダー */}
            <Col xs={24} md={12}>
              <Card type="inner" title="例1: ページヘッダー">
                <Space direction="vertical" size="small">
                  <Title level={1} style={{ marginBottom: 0 }}>
                    ユーザー管理
                  </Title>
                  <Text type="secondary">
                    システム内のユーザーを管理します
                  </Text>
                </Space>
              </Card>
            </Col>

            {/* 例2: データ表示 */}
            <Col xs={24} md={12}>
              <Card type="inner" title="例2: データ表示">
                <Space direction="vertical" size="middle">
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">作成日時</Text>
                    <Text strong>2024-12-26 10:30:00</Text>
                  </Space>
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">更新日時</Text>
                    <Text strong>2024-12-26 14:45:00</Text>
                  </Space>
                </Space>
              </Card>
            </Col>

            {/* 例3: ステータス表示 */}
            <Col xs={24} md={12}>
              <Card type="inner" title="例3: ステータス表示">
                <Space direction="vertical" size="small">
                  <Space>
                    <Text>状態:</Text>
                    <Text type="success" strong>完了</Text>
                  </Space>
                  <Space>
                    <Text>進捗:</Text>
                    <Text type="warning" strong>処理中</Text>
                  </Space>
                  <Space>
                    <Text>エラー:</Text>
                    <Text type="danger" strong>失敗</Text>
                  </Space>
                </Space>
              </Card>
            </Col>

            {/* 例4: コピー可能な情報 */}
            <Col xs={24} md={12}>
              <Card type="inner" title="例4: コピー可能な情報">
                <Space direction="vertical" size="small">
                  <Space>
                    <Text type="secondary">プロジェクトID:</Text>
                    <Text copyable>ABC-12345-XYZ</Text>
                  </Space>
                  <Space>
                    <Text type="secondary">API Key:</Text>
                    <Text copyable>sk_test_1234567890abcdef</Text>
                  </Space>
                </Space>
              </Card>
            </Col>

            {/* 例5: カード内のタイトルと説明 */}
            <Col xs={24}>
              <Card type="inner" title="例5: カード内のタイトルと説明">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Title level={3}>プロジェクト設定</Title>
                    <Paragraph>
                      プロジェクトの基本設定を変更できます。
                      変更内容は即座に反映されます。
                    </Paragraph>
                  </div>
                  <div>
                    <Title level={4}>通知設定</Title>
                    <Paragraph type="secondary">
                      プロジェクトに関する通知の受信設定を管理します。
                    </Paragraph>
                  </div>
                </Space>
              </Card>
            </Col>

            {/* 例6: リンクテキスト */}
            <Col xs={24} md={12}>
              <Card type="inner" title="例6: リンクテキスト">
                <Space direction="vertical" size="small">
                  <Link href="#" target="_blank">
                    外部リンク
                  </Link>
                  <Link href="#" disabled>
                    無効なリンク
                  </Link>
                  <Text>
                    詳細は
                    <Link href="#" style={{ margin: '0 4px' }}>
                      こちら
                    </Link>
                    をご覧ください。
                  </Text>
                </Space>
              </Card>
            </Col>

            {/* 例7: エラーメッセージ */}
            <Col xs={24} md={12}>
              <Card type="inner" title="例7: エラーメッセージ">
                <Space direction="vertical" size="small">
                  <Text type="danger">
                    必須項目が入力されていません
                  </Text>
                  <Text type="danger">
                    <CheckOutlined /> パスワードは8文字以上で入力してください
                  </Text>
                  <Text type="warning">
                    このアクションは元に戻せません
                  </Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* 色のバリエーション */}
        <Card title="テキスト色のバリエーション">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong>通常の色</Text>
                <Divider style={{ margin: '8px 0' }} />
                <Text>colorText (#212121)</Text>
                <Text type="secondary">colorTextSecondary (#757575)</Text>
                <Text type="secondary" style={{ color: '#9e9e9e' }}>
                  colorTextTertiary (#9e9e9e)
                </Text>
                <Text disabled>colorTextDisabled (#bdbdbd)</Text>
              </Space>
            </Col>

            <Col xs={24} md={8}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong>状態の色</Text>
                <Divider style={{ margin: '8px 0' }} />
                <Text type="success">colorSuccess (#2e7d32)</Text>
                <Text type="warning">colorWarning (#ed6c02)</Text>
                <Text type="danger">colorError (#d32f2f)</Text>
              </Space>
            </Col>

            <Col xs={24} md={8}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong>リンクの色</Text>
                <Divider style={{ margin: '8px 0' }} />
                <Link href="#">colorPrimary (#CF0027)</Link>
                <Text>
                  <Link href="#" style={{ marginRight: 4 }}>
                    ホバー時
                  </Link>
                  colorPrimaryHover (#E63946)
                </Text>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* アクセシビリティ */}
        <Card title="アクセシビリティとベストプラクティス">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={5}>セマンティックHTML</Title>
              <Paragraph>
                Titleコンポーネントは適切な<Text code>&lt;h1&gt;</Text>～
                <Text code>&lt;h5&gt;</Text>タグに変換されます。
                見出しレベルは階層的に使用してください（h1 → h2 → h3）。
              </Paragraph>
            </div>

            <div>
              <Title level={5}>コントラスト比</Title>
              <Paragraph>
                すべてのカラーバリエーションはWCAG 2.1のコントラスト基準を満たしています。
                通常テキストは最低4.5:1、大きなテキストは最低3:1のコントラスト比を確保しています。
              </Paragraph>
            </div>

            <div>
              <Title level={5}>推奨事項</Title>
              <Space direction="vertical" size="small">
                <Text>✅ セマンティックな見出しレベルを使用する</Text>
                <Text>✅ 色でtype属性を使用する（カスタムスタイルではなく）</Text>
                <Text>✅ 長文にはParagraphを使用する</Text>
                <Text>✅ copyableで重要な情報をコピー可能にする</Text>
                <Text>✅ ellipsisで長文を省略する</Text>
              </Space>
            </div>

            <div>
              <Title level={5}>非推奨事項</Title>
              <Space direction="vertical" size="small">
                <Text type="danger">❌ 見出しレベルを飛ばさない（h1 → h3）</Text>
                <Text type="danger">❌ 装飾目的でtitleのlevelを変更しない</Text>
                <Text type="danger">❌ 色をインラインスタイルで直接指定しない</Text>
                <Text type="danger">❌ Textで長文を表示しない（Paragraphを使う）</Text>
              </Space>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
