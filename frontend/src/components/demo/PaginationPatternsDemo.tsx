'use client';

import React, { useState } from 'react';
import { Card, Pagination, Typography, Space, Flex, Divider, Table, Switch, Tag } from 'antd';
import type { TableColumnsType } from 'antd';

const { Title, Text, Paragraph } = Typography;

interface DataType {
  key: string;
  name: string;
  age: number;
  address: string;
}

export default function PaginationPatternsDemo() {
  // パターン1用の状態
  const [pattern1Current, setPattern1Current] = useState(1);
  const [pattern1PageSize] = useState(10);

  // パターン2用の状態
  const [pattern2Current, setPattern2Current] = useState(1);
  const [pattern2PageSize, setPattern2PageSize] = useState(10);

  // パターン3用の状態
  const [pattern3Current, setPattern3Current] = useState(1);
  const [pattern3PageSize] = useState(10);

  // テーブルデータ（100件生成）
  const generateData = (count: number): DataType[] => {
    return Array.from({ length: count }, (_, i) => ({
      key: `${i + 1}`,
      name: `ユーザー ${i + 1}`,
      age: 20 + (i % 50),
      address: `東京都${['千代田区', '中央区', '港区', '新宿区', '渋谷区'][i % 5]}`,
    }));
  };

  const allData = generateData(100);

  const columns: TableColumnsType<DataType> = [
    {
      title: '名前',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '年齢',
      dataIndex: 'age',
      key: 'age',
      width: 100,
    },
    {
      title: '住所',
      dataIndex: 'address',
      key: 'address',
    },
  ];

  // 配置パターン用の状態
  const [alignCurrent, setAlignCurrent] = useState(1);
  const [selectedAlign, setSelectedAlign] = useState<'start' | 'center' | 'end'>('end');

  // Simple Pagination用の状態
  const [simpleCurrent, setSimpleCurrent] = useState(1);

  // カスタム配置用の状態
  const [customCurrent, setCustomCurrent] = useState(1);
  const [customPageSize, setCustomPageSize] = useState(10);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <div>
          <Title level={2}>ページネーション パターンカタログ</Title>
          <Paragraph>
            MaiML Viewerで使用する標準的なページネーションパターンのデモです。
          </Paragraph>
        </div>

        <Divider />

        {/* パターン1: 基本ページネーション */}
        <Card title="パターン1: 基本ページネーション" size="small">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途: </Text>
              <Text>テーブル下部の標準的なページ送り</Text>
            </div>

            <div>
              <Text type="secondary">仕様:</Text>
              <ul style={{ marginTop: 8, marginBottom: 8 }}>
                <li>高さ: 32px</li>
                <li>最大表示ページ数: 5ページ</li>
                <li>ジャンプ機能あり</li>
                <li>配置: 右寄せ</li>
              </ul>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* デモ: テーブルと組み合わせ */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                実装例: データテーブル
              </Text>
              <Table
                columns={columns}
                dataSource={allData.slice(
                  (pattern1Current - 1) * pattern1PageSize,
                  pattern1Current * pattern1PageSize
                )}
                pagination={false}
                size="small"
                bordered
              />
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Pagination
                  current={pattern1Current}
                  total={allData.length}
                  pageSize={pattern1PageSize}
                  onChange={(page) => setPattern1Current(page)}
                  showQuickJumper
                  align="end"
                />
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* コードサンプル */}
            <div>
              <Text strong>コード:</Text>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                  overflow: 'auto',
                  fontSize: 13,
                }}
              >
{`<Pagination
  current={current}
  total={total}
  pageSize={pageSize}
  onChange={onChange}
  showQuickJumper
  align="end"
/>`}
              </pre>
            </div>
          </Space>
        </Card>

        {/* パターン2: フル機能ページネーション */}
        <Card title="パターン2: フル機能ページネーション" size="small">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途: </Text>
              <Text>データテーブル、検索結果など多機能が必要な場面</Text>
            </div>

            <div>
              <Text type="secondary">仕様:</Text>
              <ul style={{ marginTop: 8, marginBottom: 8 }}>
                <li>高さ: 32px</li>
                <li>最大表示ページ数: 7ページ</li>
                <li>総件数表示あり</li>
                <li>ページサイズ変更あり</li>
                <li>ジャンプ機能あり</li>
                <li>配置: 右寄せ</li>
              </ul>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* デモ: フル機能 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                実装例: 検索結果テーブル
              </Text>
              <Table
                columns={columns}
                dataSource={allData.slice(
                  (pattern2Current - 1) * pattern2PageSize,
                  pattern2Current * pattern2PageSize
                )}
                pagination={false}
                size="small"
                bordered
              />
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Pagination
                  current={pattern2Current}
                  total={allData.length}
                  pageSize={pattern2PageSize}
                  onChange={(page, pageSize) => {
                    setPattern2Current(page);
                    setPattern2PageSize(pageSize);
                  }}
                  showSizeChanger
                  showQuickJumper
                  showTotal={(total) => `全 ${total} 件`}
                  pageSizeOptions={[10, 20, 50, 100]}
                  align="end"
                />
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* コードサンプル */}
            <div>
              <Text strong>コード:</Text>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                  overflow: 'auto',
                  fontSize: 13,
                }}
              >
{`<Pagination
  current={current}
  total={total}
  pageSize={pageSize}
  onChange={onChange}
  showSizeChanger
  showQuickJumper
  showTotal={(total) => \`全 \${total} 件\`}
  pageSizeOptions={[10, 20, 50, 100]}
  align="end"
/>`}
              </pre>
            </div>
          </Space>
        </Card>

        {/* パターン3: ミニページネーション */}
        <Card title="パターン3: ミニページネーション" size="small">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途: </Text>
              <Text>モーダル内やサイドパネル内の省スペース表示</Text>
            </div>

            <div>
              <Text type="secondary">仕様:</Text>
              <ul style={{ marginTop: 8, marginBottom: 8 }}>
                <li>サイズ: small</li>
                <li>高さ: 24px</li>
                <li>最大表示ページ数: 5ページ</li>
                <li>ページサイズ変更なし</li>
                <li>ジャンプ機能なし</li>
                <li>配置: 右寄せ</li>
              </ul>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* デモ: ミニサイズ */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                実装例: モーダル内のテーブル
              </Text>
              <div style={{ 
                border: '1px solid #d9d9d9', 
                borderRadius: 8, 
                padding: 16,
                background: '#fafafa'
              }}>
                <Table
                  columns={columns}
                  dataSource={allData.slice(
                    (pattern3Current - 1) * pattern3PageSize,
                    pattern3Current * pattern3PageSize
                  )}
                  pagination={false}
                  size="small"
                  bordered
                />
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                  <Pagination
                    current={pattern3Current}
                    total={allData.length}
                    pageSize={pattern3PageSize}
                    onChange={(page) => setPattern3Current(page)}
                    size="small"
                    align="end"
                  />
                </div>
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* コードサンプル */}
            <div>
              <Text strong>コード:</Text>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                  overflow: 'auto',
                  fontSize: 13,
                }}
              >
{`<Pagination
  current={current}
  total={total}
  pageSize={pageSize}
  onChange={onChange}
  size="small"
  align="end"
/>`}
              </pre>
            </div>
          </Space>
        </Card>

        <Divider />

        {/* 配置パターン */}
        <Card title="配置パターン" size="small">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>配置切り替え: </Text>
              <Space>
                <Tag 
                  color={selectedAlign === 'start' ? 'red' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedAlign('start')}
                >
                  左寄せ (start)
                </Tag>
                <Tag 
                  color={selectedAlign === 'center' ? 'red' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedAlign('center')}
                >
                  中央寄せ (center)
                </Tag>
                <Tag 
                  color={selectedAlign === 'end' ? 'red' : 'default'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedAlign('end')}
                >
                  右寄せ (end) 【標準】
                </Tag>
              </Space>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Pagination
                current={alignCurrent}
                total={50}
                pageSize={10}
                onChange={(page) => setAlignCurrent(page)}
                align={selectedAlign}
              />
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text type="secondary">使用場面:</Text>
              <ul style={{ marginTop: 8, marginBottom: 8 }}>
                <li><strong>右寄せ (end)</strong>: 最も一般的。データテーブル、検索結果、一覧画面</li>
                <li><strong>中央寄せ (center)</strong>: ブログ記事一覧、画像ギャラリー</li>
                <li><strong>左寄せ (start)</strong>: 管理画面の特殊なケース（使用頻度低い）</li>
              </ul>
            </div>
          </Space>
        </Card>

        {/* Simple Pagination（除外パターン） */}
        <Card 
          title={
            <Space>
              <span>除外パターン: Simple Pagination（超簡易版）</span>
              <Tag color="orange">非推奨</Tag>
            </Space>
          } 
          size="small"
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>除外理由: </Text>
              <Text>使用頻度が低く、機能が極端に制限されるため</Text>
            </div>

            <div>
              <Text type="secondary">形状:</Text>
              <ul style={{ marginTop: 8, marginBottom: 8 }}>
                <li>「前へ」「ページ番号 / 総ページ数」「次へ」のみ</li>
                <li>非常に限定された空間で最小限のページング機能が必要な場合のみ</li>
              </ul>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                デモ: Simple Pagination
              </Text>
              <Pagination
                simple
                current={simpleCurrent}
                total={50}
                onChange={(page) => setSimpleCurrent(page)}
              />
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text strong>コード:</Text>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                  overflow: 'auto',
                  fontSize: 13,
                }}
              >
{`<Pagination
  simple
  current={current}
  total={total}
/>`}
              </pre>
            </div>
          </Space>
        </Card>

        {/* カスタム配置（除外パターン） */}
        <Card 
          title={
            <Space>
              <span>除外パターン: 総件数を左寄せ表示</span>
              <Tag color="blue">拡張パターン</Tag>
            </Space>
          } 
          size="small"
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>除外理由: </Text>
              <Text>標準では総件数とページネーションは一体表示。分離表示は特殊ケース</Text>
            </div>

            <div>
              <Text type="secondary">実装方法:</Text>
              <Text> Flexレイアウトで分離配置</Text>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                デモ: 総件数とページネーションを分離
              </Text>
              <Flex justify="space-between" align="center">
                <Text>全 {allData.length} 件</Text>
                <Pagination
                  current={customCurrent}
                  total={allData.length}
                  pageSize={customPageSize}
                  onChange={(page, pageSize) => {
                    setCustomCurrent(page);
                    setCustomPageSize(pageSize);
                  }}
                  showSizeChanger
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              </Flex>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text strong>コード:</Text>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 4,
                  overflow: 'auto',
                  fontSize: 13,
                }}
              >
{`<Flex justify="space-between" align="center">
  <div>全 {total} 件</div>
  <Pagination current={current} total={total} />
</Flex>`}
              </pre>
            </div>
          </Space>
        </Card>

        {/* パターン選択ガイド */}
        <Card title="パターン選択ガイド" size="small">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                パターン1（基本ページネーション）を使用する場合:
              </Text>
              <ul>
                <li>一般的なテーブルの下部</li>
                <li>ページサイズ変更が不要な場合</li>
                <li>シンプルな表示が望ましい場合</li>
                <li>総件数表示が不要な場合</li>
              </ul>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                パターン2（フル機能ページネーション）を使用する場合:
              </Text>
              <ul>
                <li>データテーブルでページサイズ変更が必要</li>
                <li>検索結果で総件数を表示したい</li>
                <li>大量のデータを扱う場合</li>
                <li>ユーザーが表示件数を選択できる必要がある</li>
              </ul>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                パターン3（ミニページネーション）を使用する場合:
              </Text>
              <ul>
                <li>モーダル内のテーブル</li>
                <li>ドロワー内のリスト</li>
                <li>サイドパネル内の表示</li>
                <li>省スペースが求められる場面</li>
              </ul>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
