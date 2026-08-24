'use client';

/**
 * DataRecordDialog モチE��コンポ�EネンチE
 *
 * 目皁E バックエンド接続なしで DataRecordDialog の画面をキャプチャする
 *
 * 2種類�Eシナリオを用愁E
 *   1. MAIMLチE��プレート定義に <insertion> タグが含まれる場合（指示ありケース�E�E
 *   2. カスタムプロパティとして Insertion を追加する場吁E
 *
 * projectId / methodId / taskNo を渡さなぁE��めEAPI 呼び出しが発生しなぁE��E
 * フォールバック: fetchedTemplates が空 ↁEtransition.templates のモチE��チE�Eタを表示、E
 */

import React, { useState } from 'react';
import { Button, Card, Space, Typography, Divider, Alert } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import ExperimentRecordDialog from '../ExperimentRecordDialog';
import { Transition, Template } from '@/types/experimentWorker';

const { Text, Title } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// モチE��チE�Eタ定義
// ─────────────────────────────────────────────────────────────────────────────

/** シナリオ1: ResultTemplate に非カスタム <insertion> が含まれてぁE��ケース */
const MOCK_TRANSITION_WITH_INSERTION: Transition = {
  transitionId: 'mock-transition-insertion-001',
  transitionName: '試料画像取征E,
  description: 'ラマン刁E�E測定後に顕微鏡画像をファイルとして添付する操佁E,
  status: 'in_progress' as const,
  progressRate: 30,
  templates: [
    {
      templateId: 'tpl-material-001',
      category: 'Materials',
      name: '試料情報',
      properties: [
        {
          key: 'sampleId',
          label: '試料ID',
          type: 'stringType',
          required: true,
          description: '試料�E識別子（侁E S-2026-001�E�E,
        },
        {
          key: 'concentration',
          label: '濁E��',
          type: 'floatType',
          units: 'mol/L',
          formatString: '%.4f',
          description: '溶液濁E��',
        },
      ],
    } satisfies Template,
    {
      templateId: 'tpl-condition-001',
      category: 'Conditions',
      name: '測定条件',
      properties: [
        {
          key: 'temperature',
          label: '測定温度',
          type: 'floatType',
          units: '°C',
          required: true,
          description: '測定時の雰囲気温度',
        },
        {
          key: 'exposureTime',
          label: '露光時閁E,
          type: 'intType',
          units: 'ms',
          description: 'カメラ露光時間（ミリ秒！E,
        },
        {
          key: 'laserWavelength',
          label: 'レーザー波長',
          type: 'intType',
          units: 'nm',
          description: '励起レーザーの波長',
        },
      ],
    } satisfies Template,
    {
      templateId: 'tpl-result-001',
      category: 'Results',
      name: '測定結果�E�画像付き�E�E,
      properties: [
        {
          key: 'peakIntensity',
          label: 'ピ�Eク強度',
          type: 'floatType',
          units: 'cps',
          required: true,
          description: '最大ピ�Eクの強度値',
        },
        {
          key: 'snRatio',
          label: 'S/N 毁E,
          type: 'floatType',
          description: '信号対雑音毁E,
        },
        {
          key: 'imageFile',
          label: '測定画僁E,
          type: 'insertion',
          description: '顕微鏡写真�E�EIFF形式）を添付してください',
        },
      ],
      // チE��プレートトチE�Eレベルの <insertion> 定義�E�非カスタム�E�E
      insertions: [
        {
          uri: '',
          format: 'image/tiff',
          description: 'ラマンスペクトル画像！Etif / .tiff�E�E,
        },
      ],
    } satisfies Template,
  ],
};

/** シナリオ2: 通常のチE��プレート�Eみ�E�Ensertion なし）�E カスタムプロパティ追加のチE��用 */
const MOCK_TRANSITION_NO_INSERTION: Transition = {
  transitionId: 'mock-transition-normal-002',
  transitionName: '合�E反応実衁E,
  description: '前駁E��混合から反応終亁E��で',
  status: 'not_started' as const,
  progressRate: 0,
  templates: [
    {
      templateId: 'tpl-material-002',
      category: 'Materials',
      name: '前駁E��A',
      properties: [
        {
          key: 'mass',
          label: '質釁E,
          type: 'floatType',
          units: 'g',
          required: true,
          description: '秤量した質釁E,
          formatString: '%.4f',
        },
        {
          key: 'purity',
          label: '純度',
          type: 'floatType',
          units: '%',
          description: 'ロチE��証明書記載�E純度',
        },
      ],
    } satisfies Template,
    {
      templateId: 'tpl-condition-002',
      category: 'Conditions',
      name: '反応条件',
      properties: [
        {
          key: 'reactionTemp',
          label: '反応温度',
          type: 'floatType',
          units: '°C',
          required: true,
        },
        {
          key: 'reactionTime',
          label: '反応時閁E,
          type: 'intType',
          units: 'min',
          required: true,
        },
        {
          key: 'stirringSpeed',
          label: '攪拌速度',
          type: 'intType',
          units: 'rpm',
        },
      ],
    } satisfies Template,
    {
      templateId: 'tpl-result-002',
      category: 'Results',
      name: '収率',
      properties: [
        {
          key: 'yield',
          label: '収率',
          type: 'floatType',
          units: '%',
          required: true,
          description: '琁E��収量に対する実収量�E割吁E,
        },
        {
          key: 'productMass',
          label: '生�E物質釁E,
          type: 'floatType',
          units: 'g',
          formatString: '%.4f',
        },
      ],
    } satisfies Template,
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// モチE��コンポ�EネンチE
// ─────────────────────────────────────────────────────────────────────────────

export default function DataRecordDialogMock() {
  // シナリオ1: Insertion付きチE��プレーチE
  const [openWithInsertion, setOpenWithInsertion] = useState(false);
  // シナリオ2: カスタムプロパティ追加チE���E�通常チE��プレート！E
  const [openNormal, setOpenNormal] = useState(false);

  return (
    <div style={{ padding: 16 }}>
      <Alert
        type="info"
        showIcon
        message="バックエンド接続なし！ErojectId / methodId / taskNo 未持E��）�Eため API 呼び出し�E発生しません。テンプレート�EモチE��チE�Eタを使用してぁE��す、E
        style={{ marginBottom: 16 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>

        {/* ── シナリオ 1 ── */}
        <Card
          title={
            <span>
              <Text strong>シナリオ 1: MAIMLチE��プレートに &lt;insertion&gt; 持E��がある場吁E/Text>
            </span>
          }
          size="small"
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary">
              結果チE��プレート「測定結果�E�画像付き�E�」に
              <Text code>type=&quot;insertion&quot;</Text> プロパティと
              チE��プレートトチE�Eレベルの <Text code>insertions[]</Text> が定義されてぁE��す、E
            </Text>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
              <li>チE��プレート一覧�E�左サイドバー�E�E Materials / Conditions / Results の3极E/li>
              <li>
                Results チE��プレートを選択すると「測定画像！Ensertion型）」フィールドと
                トップレベル Insertions セクションが表示されまぁE
              </li>
            </ul>
            <Divider style={{ margin: '8px 0' }} />
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => setOpenWithInsertion(true)}
            >
              ダイアログを開く！Ensertion持E��あり�E�E
            </Button>
          </Space>
        </Card>

        {/* ── シナリオ 2 ── */}
        <Card
          title={
            <span>
              <Text strong>シナリオ 2: カスタムプロパティとして Insertion を追加する場吁E/Text>
            </span>
          }
          size="small"
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary">
              チE��プレート定義には Insertion がありませんが、ダイアログ冁E�E「Insertion 追加」�Eタンで
              カスタムプロパティとして追加できます、E
            </Text>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
              <li>任意�EチE��プレートを選抁E/li>
              <li>右パネル下部の「カスタムプロパティ追加」セクションで「Insertion 追加」をクリチE��</li>
              <li>ↁEファイルアチE�Eロードフィールドが追加されまぁE/li>
            </ul>
            <Divider style={{ margin: '8px 0' }} />
            <Button
              type="default"
              icon={<EyeOutlined />}
              onClick={() => setOpenNormal(true)}
            >
              ダイアログを開く（カスタムプロパティ追加チE���E�E
            </Button>
          </Space>
        </Card>

      </Space>

      {/* ── ダイアログ: シナリオ1 ── */}
      {openWithInsertion && (
        <ExperimentRecordDialog
          open={openWithInsertion}
          transition={MOCK_TRANSITION_WITH_INSERTION}
          projectStatus={2 /* タスク実行中: 編雁E��能 */}
          onClose={() => setOpenWithInsertion(false)}
          onSave={() => setOpenWithInsertion(false)}
          /* projectId / methodId / taskNo を渡さなぁEↁEAPI呼び出しをスキチE�E */
          useDeemedProgress={true}
        />
      )}

      {/* ── ダイアログ: シナリオ2 ── */}
      {openNormal && (
        <ExperimentRecordDialog
          open={openNormal}
          transition={MOCK_TRANSITION_NO_INSERTION}
          projectStatus={2 /* タスク実行中: 編雁E��能 */}
          onClose={() => setOpenNormal(false)}
          onSave={() => setOpenNormal(false)}
          useDeemedProgress={true}
        />
      )}
    </div>
  );
}
