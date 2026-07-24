'use client';

/**
 * DataRecordDialog モックコンポーネント
 *
 * 目的: バックエンド接続なしで DataRecordDialog の画面をキャプチャする
 *
 * 2種類のシナリオを用意:
 *   1. MAIMLテンプレート定義に <insertion> タグが含まれる場合（指示ありケース）
 *   2. カスタムプロパティとして Insertion を追加する場合
 *
 * projectId / methodId / taskNo を渡さないため API 呼び出しが発生しない。
 * フォールバック: fetchedTemplates が空 → transition.templates のモックデータを表示。
 */

import React, { useState } from 'react';
import { Button, Card, Space, Typography, Divider, Alert } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import DataRecordDialog from '../DataRecordDialog';
import { Transition, Template } from '@/types/experimentWorker';

const { Text, Title } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// モックデータ定義
// ─────────────────────────────────────────────────────────────────────────────

/** シナリオ1: ResultTemplate に非カスタム <insertion> が含まれているケース */
const MOCK_TRANSITION_WITH_INSERTION: Transition = {
  transitionId: 'mock-transition-insertion-001',
  transitionName: '試料画像取得',
  description: 'ラマン分光測定後に顕微鏡画像をファイルとして添付する操作',
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
          description: '試料の識別子（例: S-2026-001）',
        },
        {
          key: 'concentration',
          label: '濃度',
          type: 'floatType',
          units: 'mol/L',
          formatString: '%.4f',
          description: '溶液濃度',
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
          label: '露光時間',
          type: 'intType',
          units: 'ms',
          description: 'カメラ露光時間（ミリ秒）',
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
      name: '測定結果（画像付き）',
      properties: [
        {
          key: 'peakIntensity',
          label: 'ピーク強度',
          type: 'floatType',
          units: 'cps',
          required: true,
          description: '最大ピークの強度値',
        },
        {
          key: 'snRatio',
          label: 'S/N 比',
          type: 'floatType',
          description: '信号対雑音比',
        },
        {
          key: 'imageFile',
          label: '測定画像',
          type: 'insertion',
          description: '顕微鏡写真（TIFF形式）を添付してください',
        },
      ],
      // テンプレートトップレベルの <insertion> 定義（非カスタム）
      insertions: [
        {
          uri: '',
          format: 'image/tiff',
          description: 'ラマンスペクトル画像（.tif / .tiff）',
        },
      ],
    } satisfies Template,
  ],
};

/** シナリオ2: 通常のテンプレートのみ（Insertion なし）→ カスタムプロパティ追加のデモ用 */
const MOCK_TRANSITION_NO_INSERTION: Transition = {
  transitionId: 'mock-transition-normal-002',
  transitionName: '合成反応実行',
  description: '前駆体混合から反応終了まで',
  status: 'not_started' as const,
  progressRate: 0,
  templates: [
    {
      templateId: 'tpl-material-002',
      category: 'Materials',
      name: '前駆体A',
      properties: [
        {
          key: 'mass',
          label: '質量',
          type: 'floatType',
          units: 'g',
          required: true,
          description: '秤量した質量',
          formatString: '%.4f',
        },
        {
          key: 'purity',
          label: '純度',
          type: 'floatType',
          units: '%',
          description: 'ロット証明書記載の純度',
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
          label: '反応時間',
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
          description: '理論収量に対する実収量の割合',
        },
        {
          key: 'productMass',
          label: '生成物質量',
          type: 'floatType',
          units: 'g',
          formatString: '%.4f',
        },
      ],
    } satisfies Template,
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// モックコンポーネント
// ─────────────────────────────────────────────────────────────────────────────

export default function DataRecordDialogMock() {
  // シナリオ1: Insertion付きテンプレート
  const [openWithInsertion, setOpenWithInsertion] = useState(false);
  // シナリオ2: カスタムプロパティ追加デモ（通常テンプレート）
  const [openNormal, setOpenNormal] = useState(false);

  return (
    <div style={{ padding: 16 }}>
      <Alert
        type="info"
        showIcon
        message="バックエンド接続なし（projectId / methodId / taskNo 未指定）のため API 呼び出しは発生しません。テンプレートはモックデータを使用しています。"
        style={{ marginBottom: 16 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>

        {/* ── シナリオ 1 ── */}
        <Card
          title={
            <span>
              <Text strong>シナリオ 1: MAIMLテンプレートに &lt;insertion&gt; 指示がある場合</Text>
            </span>
          }
          size="small"
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary">
              結果テンプレート「測定結果（画像付き）」に
              <Text code>type=&quot;insertion&quot;</Text> プロパティと
              テンプレートトップレベルの <Text code>insertions[]</Text> が定義されています。
            </Text>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
              <li>テンプレート一覧（左サイドバー）: Materials / Conditions / Results の3枚</li>
              <li>
                Results テンプレートを選択すると「測定画像（insertion型）」フィールドと
                トップレベル Insertions セクションが表示されます
              </li>
            </ul>
            <Divider style={{ margin: '8px 0' }} />
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => setOpenWithInsertion(true)}
            >
              ダイアログを開く（Insertion指示あり）
            </Button>
          </Space>
        </Card>

        {/* ── シナリオ 2 ── */}
        <Card
          title={
            <span>
              <Text strong>シナリオ 2: カスタムプロパティとして Insertion を追加する場合</Text>
            </span>
          }
          size="small"
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary">
              テンプレート定義には Insertion がありませんが、ダイアログ内の「Insertion 追加」ボタンで
              カスタムプロパティとして追加できます。
            </Text>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
              <li>任意のテンプレートを選択</li>
              <li>右パネル下部の「カスタムプロパティ追加」セクションで「Insertion 追加」をクリック</li>
              <li>→ ファイルアップロードフィールドが追加されます</li>
            </ul>
            <Divider style={{ margin: '8px 0' }} />
            <Button
              type="default"
              icon={<EyeOutlined />}
              onClick={() => setOpenNormal(true)}
            >
              ダイアログを開く（カスタムプロパティ追加デモ）
            </Button>
          </Space>
        </Card>

      </Space>

      {/* ── ダイアログ: シナリオ1 ── */}
      {openWithInsertion && (
        <DataRecordDialog
          open={openWithInsertion}
          transition={MOCK_TRANSITION_WITH_INSERTION}
          projectStatus={2 /* タスク実行中: 編集可能 */}
          onClose={() => setOpenWithInsertion(false)}
          onSave={() => setOpenWithInsertion(false)}
          /* projectId / methodId / taskNo を渡さない → API呼び出しをスキップ */
          useDeemedProgress={true}
        />
      )}

      {/* ── ダイアログ: シナリオ2 ── */}
      {openNormal && (
        <DataRecordDialog
          open={openNormal}
          transition={MOCK_TRANSITION_NO_INSERTION}
          projectStatus={2 /* タスク実行中: 編集可能 */}
          onClose={() => setOpenNormal(false)}
          onSave={() => setOpenNormal(false)}
          useDeemedProgress={true}
        />
      )}
    </div>
  );
}
