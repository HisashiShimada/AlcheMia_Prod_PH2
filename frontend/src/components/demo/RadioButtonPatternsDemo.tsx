'use client';

import React, { useState } from 'react';
import { Radio, Card, Space, Typography, Tag, Divider, theme } from 'antd';
import { FileTextOutlined, AimOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { useToken } = theme;

/**
 * ラジオボタン形状ポリシーのテスト画面
 * 
 * 標準3パターンを表示
 */
export default function RadioButtonPatternsDemo() {
  const { token } = useToken();

  // パターン1: 垂直レイアウト
  const [pattern1Value1, setPattern1Value1] = useState('same');
  const [pattern1Value2, setPattern1Value2] = useState('file');
  const [pattern1Value3, setPattern1Value3] = useState<string>();

  // パターン2: 水平レイアウト
  const [pattern2Value1, setPattern2Value1] = useState('yes');
  const [pattern2Value2, setPattern2Value2] = useState('male');
  const [pattern2Value3, setPattern2Value3] = useState('public');

  // パターン3: ボタンスタイル
  const [pattern3Value1, setPattern3Value1] = useState('list');
  const [pattern3Value2, setPattern3Value2] = useState('month');
  const [pattern3Value3, setPattern3Value3] = useState('medium');
  const [pattern3Value4, setPattern3Value4] = useState('medium');

  // 状態デモ用
  const [normalValue, setNormalValue] = useState('option1');
  const [disabledValue] = useState('option1');

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#fafafa' }}>
      <Title level={2}>ラジオボタン形状ポリシー - 全パターンテスト画面</Title>
      <Paragraph>
        標準3パターンのテストです。各パターンの用途と仕様を確認できます。
      </Paragraph>

      {/* 標準3パターン */}
      <Title level={3} style={{ marginTop: '32px' }}>標準3パターン</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* パターン1: 垂直レイアウト */}
        <Card
          title={
            <Space>
              <Tag color="blue">パターン1</Tag>
              <Text strong>垂直レイアウト（デフォルト）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: 2〜4個程度の選択肢、各選択肢に説明が必要な場合</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• レイアウト: 垂直（縦並び）</Text>
                <Text>• 間隔: token.marginXS (8px)</Text>
                <Text>• ラジオボタンサイズ: 16px</Text>
                <Text>• テキストフォントサイズ: token.fontSize (14px)</Text>
                <Text>• 最小高さ: 32px（1選択肢あたり）</Text>
                <Text>• 幅: 親要素に合わせる</Text>
              </Space>
            </div>

            {/* テスト1: 実験条件の選択 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト1: 実験条件の選択
              </Text>
              <Radio.Group
                value={pattern1Value1}
                onChange={(e) => setPattern1Value1(e.target.value)}
                style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
              >
                <Radio value="same">全て同一条件で実施</Radio>
                <Radio value="different">実験ごとに条件を変更</Radio>
              </Radio.Group>
            </div>

            {/* テスト2: 指示対象の選択（アイコン付き） */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト2: 指示対象の選択（アイコン付き）
              </Text>
              <Radio.Group
                value={pattern1Value2}
                onChange={(e) => setPattern1Value2(e.target.value)}
                style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
              >
                <Radio value="file">
                  <FileTextOutlined /> ファイル全体
                </Radio>
                <Radio value="transition">
                  <AimOutlined /> 特定トランジション
                </Radio>
              </Radio.Group>
            </div>

            {/* テスト3: データ処理方法の選択（4個の選択肢） */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト3: データ処理方法の選択（4個の選択肢）
              </Text>
              <Radio.Group
                value={pattern1Value3}
                onChange={(e) => setPattern1Value3(e.target.value)}
                style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
              >
                <Radio value="auto">自動処理（推奨）</Radio>
                <Radio value="manual">手動処理</Radio>
                <Radio value="batch">バッチ処理</Radio>
                <Radio value="realtime">リアルタイム処理</Radio>
              </Radio.Group>
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              使用例: 実験条件の選択、指示対象の選択、データ処理方法の選択
            </Text>
          </Space>
        </Card>

        {/* パターン2: 水平レイアウト */}
        <Card
          title={
            <Space>
              <Tag color="green">パターン2</Tag>
              <Text strong>水平レイアウト（コンパクト）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: 2〜3個程度の短い選択肢、横幅に余裕がある場合</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• レイアウト: 水平（横並び）</Text>
                <Text>• 間隔: token.margin (16px)</Text>
                <Text>• ラジオボタンサイズ: 16px</Text>
                <Text>• テキストフォントサイズ: token.fontSize (14px)</Text>
                <Text>• 高さ: 32px</Text>
                <Text>• 幅: コンテンツに合わせる（auto）</Text>
              </Space>
            </div>

            {/* テスト1: Yes/No選択 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト1: Yes/No選択
              </Text>
              <Radio.Group
                value={pattern2Value1}
                onChange={(e) => setPattern2Value1(e.target.value)}
              >
                <Radio value="yes">はい</Radio>
                <Radio value="no">いいえ</Radio>
              </Radio.Group>
            </div>

            {/* テスト2: 性別選択 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト2: 性別選択
              </Text>
              <Radio.Group
                value={pattern2Value2}
                onChange={(e) => setPattern2Value2(e.target.value)}
              >
                <Radio value="male">男性</Radio>
                <Radio value="female">女性</Radio>
                <Radio value="other">その他</Radio>
              </Radio.Group>
            </div>

            {/* テスト3: 公開/非公開の切り替え */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト3: 公開/非公開の切り替え
              </Text>
              <Radio.Group
                value={pattern2Value3}
                onChange={(e) => setPattern2Value3(e.target.value)}
              >
                <Radio value="public">公開</Radio>
                <Radio value="private">非公開</Radio>
              </Radio.Group>
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              使用例: Yes/No選択、性別選択、公開/非公開の切り替え、有効/無効の選択
            </Text>
          </Space>
        </Card>

        {/* パターン3: ボタンスタイル */}
        <Card
          title={
            <Space>
              <Tag color="orange">パターン3</Tag>
              <Text strong>ボタンスタイル（強調表示）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: 視認性を高めたい重要な選択、2〜5個程度の選択肢</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• レイアウト: 水平（横並び）</Text>
                <Text>• 間隔: 0px（ボタンが連結）</Text>
                <Text>• ボタン高さ: token.controlHeight (32px)</Text>
                <Text>• ボタン最小幅: 80px</Text>
                <Text>• テキストフォントサイズ: token.fontSize (14px)</Text>
                <Text>• ボーダーラジアス: 左端・右端のみ token.borderRadius (8px)</Text>
              </Space>
            </div>

            {/* テスト1: 表示モード切り替え */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト1: 表示モード切り替え（buttonStyle=&quot;solid&quot;）
              </Text>
              <Radio.Group
                value={pattern3Value1}
                onChange={(e) => setPattern3Value1(e.target.value)}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="list">リスト</Radio.Button>
                <Radio.Button value="grid">グリッド</Radio.Button>
                <Radio.Button value="card">カード</Radio.Button>
              </Radio.Group>
            </div>

            {/* テスト2: 期間選択 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト2: 期間選択（buttonStyle=&quot;solid&quot;）
              </Text>
              <Radio.Group
                value={pattern3Value2}
                onChange={(e) => setPattern3Value2(e.target.value)}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="day">日</Radio.Button>
                <Radio.Button value="week">週</Radio.Button>
                <Radio.Button value="month">月</Radio.Button>
                <Radio.Button value="year">年</Radio.Button>
              </Radio.Group>
            </div>

            {/* テスト3: サイズ選択 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト3: サイズ選択（buttonStyle=&quot;solid&quot;）
              </Text>
              <Radio.Group
                value={pattern3Value3}
                onChange={(e) => setPattern3Value3(e.target.value)}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="small">S</Radio.Button>
                <Radio.Button value="medium">M</Radio.Button>
                <Radio.Button value="large">L</Radio.Button>
                <Radio.Button value="xlarge">XL</Radio.Button>
              </Radio.Group>
            </div>

            {/* テスト4: 優先度選択（buttonStyle="outline"） */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト4: 優先度選択（buttonStyle=&quot;outline&quot;）
              </Text>
              <Radio.Group
                value={pattern3Value4}
                onChange={(e) => setPattern3Value4(e.target.value)}
                optionType="button"
                buttonStyle="outline"
              >
                <Radio.Button value="low">低</Radio.Button>
                <Radio.Button value="medium">中</Radio.Button>
                <Radio.Button value="high">高</Radio.Button>
              </Radio.Group>
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              使用例: 表示モード切り替え、期間選択、サイズ選択、優先度選択
            </Text>
          </Space>
        </Card>
      </Space>

      <Divider />

      {/* 共通仕様・状態デモ */}
      <Title level={3} style={{ marginTop: '32px' }}>共通仕様と状態デモ</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="色定義（パターン1・2 - 通常ラジオボタン）">
          <Space direction="vertical" size="small">
            <Text>• <strong>通常（未選択）:</strong> 外枠 rgba(0,0,0,0.12) / 内側 transparent / テキスト #212121</Text>
            <Text>• <strong>ホバー（未選択）:</strong> 外枠 <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / 内側 transparent / テキスト #212121</Text>
            <Text>• <strong>選択済み:</strong> 外枠 <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / 内側 <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / テキスト #212121</Text>
            <Text>• <strong>無効（未選択）:</strong> 外枠 rgba(0,0,0,0.06) / 内側 transparent / テキスト #bdbdbd</Text>
            <Text>• <strong>無効（選択済み）:</strong> 外枠 rgba(0,0,0,0.06) / 内側 #bdbdbd / テキスト #bdbdbd</Text>
          </Space>
        </Card>

        <Card title="色定義（パターン3 - ボタンスタイル）">
          <Space direction="vertical" size="small">
            <Text><strong>buttonStyle=&quot;solid&quot;（塗りつぶし）</strong></Text>
            <Text>• <strong>未選択:</strong> ボーダー rgba(0,0,0,0.12) / 背景 #ffffff / テキスト #212121</Text>
            <Text>• <strong>ホバー:</strong> ボーダー <span style={{ color: '#E63946', fontWeight: 'bold' }}>#E63946</span> / 背景 #ffffff / テキスト <span style={{ color: '#E63946', fontWeight: 'bold' }}>#E63946</span></Text>
            <Text>• <strong>選択済み:</strong> ボーダー <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / 背景 <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / テキスト #ffffff</Text>
            <Divider style={{ margin: '12px 0' }} />
            <Text><strong>buttonStyle=&quot;outline&quot;（枠線のみ）</strong></Text>
            <Text>• <strong>未選択:</strong> ボーダー rgba(0,0,0,0.12) / 背景 #ffffff / テキスト #212121</Text>
            <Text>• <strong>ホバー:</strong> ボーダー <span style={{ color: '#E63946', fontWeight: 'bold' }}>#E63946</span> / 背景 #ffffff / テキスト <span style={{ color: '#E63946', fontWeight: 'bold' }}>#E63946</span></Text>
            <Text>• <strong>選択済み:</strong> ボーダー <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / 背景 #ffffff / テキスト <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span></Text>
          </Space>
        </Card>

        <Card title="状態デモ（パターン1で確認）">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>通常状態</Text>
              <Radio.Group
                value={normalValue}
                onChange={(e) => setNormalValue(e.target.value)}
                style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
              >
                <Radio value="option1">選択肢1</Radio>
                <Radio value="option2">選択肢2</Radio>
                <Radio value="option3">選択肢3</Radio>
              </Radio.Group>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>無効（Disabled）状態 - グループ全体</Text>
              <Radio.Group
                value={disabledValue}
                disabled
                style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
              >
                <Radio value="option1">選択肢1（選択済み）</Radio>
                <Radio value="option2">選択肢2</Radio>
                <Radio value="option3">選択肢3</Radio>
              </Radio.Group>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>無効（Disabled）状態 - 個別のラジオボタン</Text>
              <Radio.Group
                value={normalValue}
                onChange={(e) => setNormalValue(e.target.value)}
                style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
              >
                <Radio value="option1">選択肢1</Radio>
                <Radio value="option2" disabled>選択肢2（無効）</Radio>
                <Radio value="option3">選択肢3</Radio>
              </Radio.Group>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>ホバー状態</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ↑ 上記のラジオボタンにマウスを乗せて、赤いボーダー（#CF0027）に変化することを確認
              </Text>
            </div>
          </Space>
        </Card>

        <Card title="アクセシビリティ">
          <Space direction="vertical" size="small">
            <Text>• <strong>フォーカス表示:</strong> #CF0027の2pxアウトライン（Tabキーで移動して確認）</Text>
            <Text>• <strong>キーボード操作:</strong></Text>
            <Text style={{ paddingLeft: '20px' }}>- 上下矢印キー: 垂直レイアウトでの選択</Text>
            <Text style={{ paddingLeft: '20px' }}>- 左右矢印キー: 水平レイアウト・ボタンスタイルでの選択</Text>
            <Text style={{ paddingLeft: '20px' }}>- Tabキー: 次のRadio.Groupへ移動</Text>
            <Text style={{ paddingLeft: '20px' }}>- Shift+Tabキー: 前のRadio.Groupへ移動</Text>
            <Text>• <strong>スクリーンリーダー:</strong> 自動的にARIA属性が付与される</Text>
          </Space>
        </Card>

        <Card title="使用禁止パターン">
          <Space direction="vertical" size="small">
            <Text type="danger">❌ <strong>選択肢が多すぎる（6個以上）</strong></Text>
            <Text style={{ paddingLeft: '20px' }}>理由: 視認性が悪化し、選択が困難になる</Text>
            <Text style={{ paddingLeft: '20px' }}>代替: Select（ドロップダウン）を使用</Text>
            <Divider style={{ margin: '12px 0' }} />
            
            <Text type="danger">❌ <strong>選択肢のテキストが不統一</strong></Text>
            <Text style={{ paddingLeft: '20px' }}>理由: UIの一貫性が損なわれる</Text>
            <Text style={{ paddingLeft: '20px' }}>例: 「はい」「いいえ」「わからない」「未回答」など長さが異なる</Text>
            <Divider style={{ margin: '12px 0' }} />
            
            <Text type="danger">❌ <strong>垂直と水平の混在</strong></Text>
            <Text style={{ paddingLeft: '20px' }}>理由: レイアウトが不統一になる</Text>
            <Text style={{ paddingLeft: '20px' }}>対策: 同一画面内では同じレイアウトを使用</Text>
            <Divider style={{ margin: '12px 0' }} />
            
            <Text type="danger">❌ <strong>ボタンスタイルでの長いテキスト</strong></Text>
            <Text style={{ paddingLeft: '20px' }}>理由: ボタンが不自然に横長になる</Text>
            <Text style={{ paddingLeft: '20px' }}>対策: テキストを短くするか、通常のラジオボタンを使用</Text>
            <Divider style={{ margin: '12px 0' }} />
            
            <Text type="danger">❌ <strong>必須選択なのにデフォルト値なし</strong></Text>
            <Text style={{ paddingLeft: '20px' }}>理由: ユーザーが選択を忘れる可能性がある</Text>
            <Text style={{ paddingLeft: '20px' }}>対策: 最も一般的な選択肢をデフォルト値として設定</Text>
          </Space>
        </Card>

        <Card title="パターン選択ガイドライン">
          <Space direction="vertical" size="middle">
            <div>
              <Text strong style={{ color: token.colorPrimary }}>✅ パターン1（垂直レイアウト）を使用する場合</Text>
              <Space direction="vertical" size="small" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <Text>• 選択肢が2〜4個程度</Text>
                <Text>• 各選択肢に説明文が必要</Text>
                <Text>• 選択肢のテキストが長い（15文字以上）</Text>
                <Text>• 縦スペースに余裕がある</Text>
                <Text>• アイコン付きの選択肢を使用する</Text>
              </Space>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text strong style={{ color: token.colorSuccess }}>✅ パターン2（水平レイアウト）を使用する場合</Text>
              <Space direction="vertical" size="small" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <Text>• 選択肢が2〜3個程度</Text>
                <Text>• 選択肢のテキストが短い（10文字以内）</Text>
                <Text>• 横スペースに余裕がある</Text>
                <Text>• コンパクトな表示が必要</Text>
              </Space>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text strong style={{ color: token.colorWarning }}>✅ パターン3（ボタンスタイル）を使用する場合</Text>
              <Space direction="vertical" size="small" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <Text>• 選択肢が2〜5個程度</Text>
                <Text>• 視認性を高めたい重要な選択</Text>
                <Text>• 選択肢のテキストが短い（10文字以内）</Text>
                <Text>• UI上で強調したい操作</Text>
              </Space>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
