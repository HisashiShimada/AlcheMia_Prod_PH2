'use client';

import React, { useState } from 'react';
import { Checkbox, Card, Space, Typography, Tag, Divider, theme, Table } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import { BellOutlined, MailOutlined, MobileOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { useToken } = theme;

/**
 * チェックボックス形状ポリシーのテスト画面
 * 
 * 標準3パターンを表示
 */
export default function CheckboxPatternsDemo() {
  const { token } = useToken();

  // パターン1: 単一チェックボックス
  const [pattern1Value1, setPattern1Value1] = useState(true);
  const [pattern1Value2, setPattern1Value2] = useState(false);
  const [pattern1Value3, setPattern1Value3] = useState(false);
  const [pattern1Value4, setPattern1Value4] = useState(false);

  // パターン2: 垂直レイアウト
  const [pattern2Value1, setPattern2Value1] = useState<string[]>(['read']);
  const [pattern2Value2, setPattern2Value2] = useState<string[]>(['email']);
  const [pattern2Value3, setPattern2Value3] = useState<string[]>(['pdf', 'csv']);

  // パターン3: 水平レイアウト
  const [pattern3Value1, setPattern3Value1] = useState<string[]>(['pdf']);
  const [pattern3Value2, setPattern3Value2] = useState<string[]>(['mon', 'wed', 'fri']);
  const [pattern3Value3, setPattern3Value3] = useState<string[]>(['name', 'date']);

  // 不確定状態デモ
  const [checkedList, setCheckedList] = useState<string[]>(['option1']);
  const allOptions = ['option1', 'option2', 'option3'];
  const checkAll = checkedList.length === allOptions.length;
  const indeterminate = checkedList.length > 0 && checkedList.length < allOptions.length;

  const onCheckAllChange = (e: CheckboxChangeEvent) => {
    setCheckedList(e.target.checked ? allOptions : []);
  };

  // 状態デモ用
  const [normalValue, setNormalValue] = useState(true);
  const [disabledValue] = useState(true);
  const [disabledUnchecked] = useState(false);

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#fafafa' }}>
      <Title level={2}>チェックボックス形状ポリシー - 全パターンテスト画面</Title>
      <Paragraph>
        標準3パターンのテストです。各パターンの用途と仕様を確認できます。
      </Paragraph>

      {/* 標準3パターン */}
      <Title level={3} style={{ marginTop: '32px' }}>標準3パターン</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* パターン1: 単一チェックボックス */}
        <Card
          title={
            <Space>
              <Tag color="blue">パターン1</Tag>
              <Text strong>単一チェックボックス</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: 単独の設定項目、オプション選択</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• レイアウト: 単独配置</Text>
                <Text>• チェックボックスサイズ: 16px</Text>
                <Text>• テキストフォントサイズ: token.fontSize (14px)</Text>
                <Text>• 最小高さ: 32px</Text>
                <Text>• テキストとの間隔: 8px</Text>
                <Text>• 幅: コンテンツに合わせる（auto）</Text>
              </Space>
            </div>

            {/* テスト1: フォルダ構造を保持する */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト1: フォルダ構造を保持する
              </Text>
              <Checkbox
                checked={pattern1Value1}
                onChange={(e) => setPattern1Value1(e.target.checked)}
              >
                フォルダ構造を保持する
              </Checkbox>
            </div>

            {/* テスト2: パスワードを表示する */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト2: パスワードを表示する
              </Text>
              <Checkbox
                checked={pattern1Value2}
                onChange={(e) => setPattern1Value2(e.target.checked)}
              >
                パスワードを表示する
              </Checkbox>
            </div>

            {/* テスト3: ログイン状態を保持する */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト3: ログイン状態を保持する
              </Text>
              <Checkbox
                checked={pattern1Value3}
                onChange={(e) => setPattern1Value3(e.target.checked)}
              >
                ログイン状態を保持する
              </Checkbox>
            </div>

            {/* テスト4: 利用規約に同意する */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト4: 利用規約に同意する（必須項目）
              </Text>
              <Checkbox
                checked={pattern1Value4}
                onChange={(e) => setPattern1Value4(e.target.checked)}
              >
                利用規約に同意する <Text type="danger">*</Text>
              </Checkbox>
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              使用例: フォルダ構造を保持する、パスワードを表示する、通知を受け取る、ログイン状態を保持する、規約に同意する
            </Text>
          </Space>
        </Card>

        {/* パターン2: 垂直レイアウト */}
        <Card
          title={
            <Space>
              <Tag color="green">パターン2</Tag>
              <Text strong>垂直レイアウト（チェックボックスグループ）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: 3個以上の複数選択項目、各項目に説明が必要な場合</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• レイアウト: 垂直（縦並び）</Text>
                <Text>• 間隔: token.marginXS (8px)</Text>
                <Text>• チェックボックスサイズ: 16px</Text>
                <Text>• テキストフォントサイズ: token.fontSize (14px)</Text>
                <Text>• 最小高さ: 32px（1項目あたり）</Text>
                <Text>• 幅: 親要素に合わせる</Text>
              </Space>
            </div>

            {/* テスト1: 権限設定 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト1: 権限設定
              </Text>
              <Checkbox.Group
                value={pattern2Value1}
                onChange={setPattern2Value1}
                style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
              >
                <Checkbox value="read">閲覧</Checkbox>
                <Checkbox value="write">編集</Checkbox>
                <Checkbox value="delete">削除</Checkbox>
                <Checkbox value="share">共有</Checkbox>
              </Checkbox.Group>
            </div>

            {/* テスト2: 通知設定（アイコン付き） */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト2: 通知設定（アイコン付き）
              </Text>
              <Checkbox.Group
                value={pattern2Value2}
                onChange={setPattern2Value2}
                style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
              >
                <Checkbox value="notifications">
                  <BellOutlined /> 通知を受け取る
                </Checkbox>
                <Checkbox value="email">
                  <MailOutlined /> メール通知
                </Checkbox>
                <Checkbox value="sms">
                  <MobileOutlined /> SMS通知
                </Checkbox>
              </Checkbox.Group>
            </div>

            {/* テスト3: エクスポートオプション */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト3: エクスポートオプション（複数ファイル形式）
              </Text>
              <Checkbox.Group
                value={pattern2Value3}
                onChange={setPattern2Value3}
                style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
              >
                <Checkbox value="pdf">PDF形式でエクスポート</Checkbox>
                <Checkbox value="excel">Excel形式でエクスポート</Checkbox>
                <Checkbox value="csv">CSV形式でエクスポート</Checkbox>
                <Checkbox value="json">JSON形式でエクスポート</Checkbox>
              </Checkbox.Group>
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              使用例: 権限設定、フィルタリング条件、通知設定、エクスポートオプション
            </Text>
          </Space>
        </Card>

        {/* パターン3: 水平レイアウト */}
        <Card
          title={
            <Space>
              <Tag color="orange">パターン3</Tag>
              <Text strong>水平レイアウト（コンパクト）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: 2〜3個の短い選択肢、横幅に余裕がある場合</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• レイアウト: 水平（横並び）</Text>
                <Text>• 間隔: token.margin (16px)</Text>
                <Text>• チェックボックスサイズ: 16px</Text>
                <Text>• テキストフォントサイズ: token.fontSize (14px)</Text>
                <Text>• 高さ: 32px</Text>
                <Text>• 幅: コンテンツに合わせる（auto）</Text>
              </Space>
            </div>

            {/* テスト1: ファイル形式選択 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト1: ファイル形式選択
              </Text>
              <Checkbox.Group
                value={pattern3Value1}
                onChange={setPattern3Value1}
                style={{ display: 'flex', gap: token.margin }}
              >
                <Checkbox value="pdf">PDF</Checkbox>
                <Checkbox value="excel">Excel</Checkbox>
                <Checkbox value="csv">CSV</Checkbox>
              </Checkbox.Group>
            </div>

            {/* テスト2: 曜日選択 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト2: 曜日選択
              </Text>
              <Checkbox.Group
                value={pattern3Value2}
                onChange={setPattern3Value2}
                style={{ display: 'flex', gap: token.margin }}
              >
                <Checkbox value="mon">月</Checkbox>
                <Checkbox value="tue">火</Checkbox>
                <Checkbox value="wed">水</Checkbox>
                <Checkbox value="thu">木</Checkbox>
                <Checkbox value="fri">金</Checkbox>
              </Checkbox.Group>
            </div>

            {/* テスト3: 表示列の選択 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                テスト3: 表示列の選択
              </Text>
              <Checkbox.Group
                value={pattern3Value3}
                onChange={setPattern3Value3}
                style={{ display: 'flex', gap: token.margin }}
              >
                <Checkbox value="name">名前</Checkbox>
                <Checkbox value="date">日付</Checkbox>
                <Checkbox value="size">サイズ</Checkbox>
              </Checkbox.Group>
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              使用例: ファイル形式選択、曜日選択、表示列の選択
            </Text>
          </Space>
        </Card>
      </Space>

      <Divider />

      {/* 不確定状態（indeterminate）デモ */}
      <Title level={3} style={{ marginTop: '32px' }}>不確定状態（indeterminate）デモ</Title>
      <Card title="親チェックボックスで子チェックボックスの選択状態を表現">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">
              親チェックボックスが子チェックボックスの一部だけ選択されている状態を「不確定状態」として表示します。
            </Text>
          </div>

          <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
            <Space direction="vertical" size="small">
              <Text>• <strong>未選択:</strong> 子が全て未選択</Text>
              <Text>• <strong>不確定状態（indeterminate）:</strong> 子の一部が選択済み（横線マーク表示）</Text>
              <Text>• <strong>全選択:</strong> 子が全て選択済み</Text>
            </Space>
          </div>

          <Space direction="vertical">
            <Checkbox
              indeterminate={indeterminate}
              checked={checkAll}
              onChange={onCheckAllChange}
            >
              すべて選択
            </Checkbox>
            <Checkbox.Group
              value={checkedList}
              onChange={setCheckedList}
              style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS, marginLeft: 24 }}
            >
              <Checkbox value="option1">選択肢1</Checkbox>
              <Checkbox value="option2">選択肢2</Checkbox>
              <Checkbox value="option3">選択肢3</Checkbox>
            </Checkbox.Group>
          </Space>

          <Text type="secondary" style={{ fontSize: '12px' }}>
            ↑ 親チェックボックスをクリックすると全選択/全解除が切り替わります。子チェックボックスを個別に操作すると親が不確定状態になります。
          </Text>
        </Space>
      </Card>

      <Divider />

      {/* 共通仕様・状態デモ */}
      <Title level={3} style={{ marginTop: '32px' }}>共通仕様と状態デモ</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="色定義">
          <Space direction="vertical" size="small">
            <Text>• <strong>通常（未選択）:</strong> 外枠 rgba(0,0,0,0.12) / 内側 transparent / テキスト #212121</Text>
            <Text>• <strong>ホバー（未選択）:</strong> 外枠 <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / 内側 transparent / テキスト #212121</Text>
            <Text>• <strong>選択済み:</strong> 外枠 <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / 内側 <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / チェックマーク #ffffff / テキスト #212121</Text>
            <Text>• <strong>不確定状態:</strong> 外枠 <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / 内側 <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / 横線 #ffffff / テキスト #212121</Text>
            <Text>• <strong>無効（未選択）:</strong> 外枠 rgba(0,0,0,0.06) / 内側 transparent / テキスト #bdbdbd</Text>
            <Text>• <strong>無効（選択済み）:</strong> 外枠 rgba(0,0,0,0.06) / 内側 #bdbdbd / チェックマーク #ffffff / テキスト #bdbdbd</Text>
          </Space>
        </Card>

        <Card title="状態デモ">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>通常状態（選択済み）</Text>
              <Checkbox
                checked={normalValue}
                onChange={(e) => setNormalValue(e.target.checked)}
              >
                通知を受け取る
              </Checkbox>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>無効（Disabled）状態 - 選択済み</Text>
              <Checkbox
                checked={disabledValue}
                disabled
              >
                自動更新を有効にする（選択済み・無効）
              </Checkbox>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>無効（Disabled）状態 - 未選択</Text>
              <Checkbox
                checked={disabledUnchecked}
                disabled
              >
                ベータ機能を有効にする（未選択・無効）
              </Checkbox>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>チェックボックスグループの無効化</Text>
              <Checkbox.Group
                value={['read']}
                disabled
                style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
              >
                <Checkbox value="read">閲覧（選択済み・無効）</Checkbox>
                <Checkbox value="write">編集（未選択・無効）</Checkbox>
                <Checkbox value="delete">削除（未選択・無効）</Checkbox>
              </Checkbox.Group>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>個別のチェックボックスを無効化</Text>
              <Checkbox.Group
                value={['read']}
                style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
              >
                <Checkbox value="read">閲覧（選択済み）</Checkbox>
                <Checkbox value="write" disabled>編集（無効）</Checkbox>
                <Checkbox value="delete">削除</Checkbox>
              </Checkbox.Group>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>ホバー状態</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ↑ 上記のチェックボックスにマウスを乗せて、赤いボーダー（#CF0027）に変化することを確認
              </Text>
            </div>
          </Space>
        </Card>

        <Card title="パターン選択ガイドライン">
          <Space direction="vertical" size="middle">
            <div>
              <Text strong style={{ color: token.colorPrimary }}>✅ パターン1（単一チェックボックス）を使用する場合</Text>
              <Space direction="vertical" size="small" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <Text>• 単独の設定項目（ON/OFF切り替え）</Text>
                <Text>• オプション機能の有効/無効</Text>
                <Text>• 利用規約の同意チェック</Text>
                <Text>• 真偽値を表すデータ入力</Text>
              </Space>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text strong style={{ color: token.colorSuccess }}>✅ パターン2（垂直レイアウト）を使用する場合</Text>
              <Space direction="vertical" size="small" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <Text>• 選択肢が3個以上</Text>
                <Text>• 各選択肢に説明文が必要</Text>
                <Text>• 選択肢のテキストが長い（15文字以上）</Text>
                <Text>• 縦スペースに余裕がある</Text>
                <Text>• 複数選択可能であることを明示したい</Text>
              </Space>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text strong style={{ color: token.colorWarning }}>✅ パターン3（水平レイアウト）を使用する場合</Text>
              <Space direction="vertical" size="small" style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <Text>• 選択肢が2〜3個程度</Text>
                <Text>• 選択肢のテキストが短い（10文字以内）</Text>
                <Text>• 横スペースに余裕がある</Text>
                <Text>• コンパクトな表示が必要</Text>
              </Space>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
