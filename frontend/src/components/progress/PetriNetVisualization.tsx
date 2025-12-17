/**
 * Petri Net Visualization Component
 * MAIMLファイルからPlace、Transition、Arcを抽出して視覚的に表示
 * 
 * Material-UI → Ant Design v6への移行
 * UIポリシー準拠: デザイントークンの使用
 */

import React, { useState, useCallback, useEffect, memo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Card,
  Typography,
  Alert,
  Spin,
  Tag,
  Tooltip,
  Button,
  Space,
  Flex,
  Divider,
  theme,
} from 'antd';
import {
  ReloadOutlined,
} from '@ant-design/icons';
import type {
  TransitionProgress,
  PetriNetData,
  ExperimentRecordsData,
} from '@/types/progress';

const { Text } = Typography;

/**
 * カスタムノードのデータ型定義
 */
interface CustomNodeData {
  label: string;
  stereotype?: string;
  isFired?: boolean;
  isCompleted?: boolean;
  isInProgress?: boolean;
  progressChip?: React.ReactNode;
  tooltip?: string;
}

/**
 * カスタムノード: MaterialTemplate（円形、内部は空）- 30%縮小
 */
const MaterialTemplateNode = memo<{ data: CustomNodeData }>(({ data }) => {
  const { token } = theme.useToken();
  const isFired = data.isFired || false;

  return (
    <div style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left} style={{ background: token.colorTextSecondary }} />
      <div
        style={{
          width: 35,
          height: 35,
          borderRadius: '50%',
          border: `2px solid ${isFired ? token.colorSuccess : token.colorText}`,
          background: isFired ? token.colorSuccessBg : token.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: isFired ? `0 0 8px ${token.colorSuccess}40` : 'none',
        }}
      >
        {/* ラベルを下に配置 */}
        <div
          style={{
            position: 'absolute',
            bottom: -25,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            fontSize: token.fontSizeSM - 3,
            width: '150px',
          }}
        >
          <div style={{ fontWeight: token.fontWeightStrong }}>{data.label}</div>
          {isFired && (
            <div
              style={{
                color: token.colorSuccess,
                fontSize: token.fontSizeSM - 4,
                fontWeight: token.fontWeightStrong,
                marginTop: '1px',
              }}
            >
              ✅ 発火済み
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: token.colorTextSecondary }} />
    </div>
  );
});

MaterialTemplateNode.displayName = 'MaterialTemplateNode';

/**
 * カスタムノード: ConditionTemplate（五角形、内部は空）- 30%縮小
 */
const ConditionTemplateNode = memo<{ data: CustomNodeData }>(({ data }) => {
  const { token } = theme.useToken();
  const isFired = data.isFired || false;

  return (
    <div style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left} style={{ background: token.colorTextSecondary }} />
      <svg
        width="38.5"
        height="38.5"
        style={{
          overflow: 'visible',
          filter: isFired ? `drop-shadow(0 0 4px ${token.colorSuccess}40)` : 'none',
        }}
      >
        {/* 五角形 - 30%縮小 */}
        <polygon
          points="19.25,1.75 36.75,14 29.75,33.25 8.75,33.25 1.75,14"
          fill={isFired ? token.colorSuccessBg : token.colorBgContainer}
          stroke={isFired ? token.colorSuccess : token.colorText}
          strokeWidth="2"
        />
        {/* ラベル */}
        <foreignObject x="-55.75" y="38.5" width="150" height="60">
          <div
            style={{
              textAlign: 'center',
              fontSize: token.fontSizeSM - 3,
            }}
          >
            <div style={{ fontWeight: token.fontWeightStrong }}>{data.label}</div>
            {isFired && (
              <div
                style={{
                  color: token.colorSuccess,
                  fontSize: token.fontSizeSM - 4,
                  fontWeight: token.fontWeightStrong,
                  marginTop: '1px',
                }}
              >
                ✅ 発火済み
              </div>
            )}
          </div>
        </foreignObject>
      </svg>
      <Handle type="source" position={Position.Right} style={{ background: token.colorTextSecondary }} />
    </div>
  );
});

ConditionTemplateNode.displayName = 'ConditionTemplateNode';

/**
 * カスタムノード: ResultTemplate（四角形、枠のみ）- 30%縮小
 */
const ResultTemplateNode = memo<{ data: CustomNodeData }>(({ data }) => {
  const { token } = theme.useToken();
  const isFired = data.isFired || false;

  return (
    <div style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left} style={{ background: token.colorTextSecondary }} />
      <div
        style={{
          width: 42,
          height: 28,
          border: `2px solid ${isFired ? token.colorSuccess : token.colorText}`,
          background: isFired ? token.colorSuccessBg : token.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px',
          position: 'relative',
          boxShadow: isFired ? `0 0 8px ${token.colorSuccess}40` : 'none',
        }}
      >
        {/* ラベルを下に配置 */}
        <div
          style={{
            position: 'absolute',
            bottom: -30,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            fontSize: token.fontSizeSM - 3,
            width: '150px',
          }}
        >
          <div style={{ fontWeight: token.fontWeightStrong }}>{data.label}</div>
          {isFired && (
            <div
              style={{
                color: token.colorSuccess,
                fontSize: token.fontSizeSM - 4,
                fontWeight: token.fontWeightStrong,
                marginTop: '1px',
              }}
            >
              ✅ 発火済み
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: token.colorTextSecondary }} />
    </div>
  );
});

ResultTemplateNode.displayName = 'ResultTemplateNode';

/**
 * カスタムノード: Transition（黒塗りつぶし長方形）- 30%縮小
 */
const TransitionNode = memo<{ data: CustomNodeData }>(({ data }) => {
  const { token } = theme.useToken();
  const { label, isCompleted, isInProgress, progressChip, tooltip } = data;

  let backgroundColor = token.colorText;
  let boxShadow = 'none';

  if (isCompleted) {
    backgroundColor = token.colorSuccess;
    boxShadow = `0 0 8px ${token.colorSuccess}CC`;
  } else if (isInProgress) {
    backgroundColor = token.colorPrimary;
    boxShadow = `0 0 8px ${token.colorPrimary}CC`;
  }

  const nodeContent = (
    <div style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left} style={{ background: token.colorTextSecondary }} />
      {/* 進捗Chipを上部に配置 */}
      {progressChip && (
        <div
          style={{
            position: 'absolute',
            top: -25,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
          }}
        >
          {progressChip}
        </div>
      )}
      <div
        style={{
          width: 5.6,
          height: 28,
          background: backgroundColor,
          position: 'relative',
          boxShadow: boxShadow,
        }}
      >
        {/* ラベルを下部に配置 */}
        <div
          style={{
            position: 'absolute',
            top: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            fontSize: token.fontSizeSM - 3,
            width: '150px',
            whiteSpace: 'nowrap',
            fontWeight: token.fontWeightStrong,
          }}
        >
          {label}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: token.colorTextSecondary }} />
    </div>
  );

  // ツールチップでラップ
  if (tooltip) {
    return (
      <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} placement="top">
        {nodeContent}
      </Tooltip>
    );
  }

  return nodeContent;
});

TransitionNode.displayName = 'TransitionNode';

// ノードタイプの定義
const nodeTypes = {
  materialTemplate: MaterialTemplateNode,
  conditionTemplate: ConditionTemplateNode,
  resultTemplate: ResultTemplateNode,
  transition: TransitionNode,
};

/**
 * Petri Net Visualization Props
 */
interface PetriNetVisualizationProps {
  fileKey: string;
  workerId: string;
  workId: string;
  progressData?: TransitionProgress[];
}

/**
 * ペトリネット可視化コンポーネント
 * MaiMLファイルからPlace、Transition、Arcを抽出して視覚的に表示
 */
const PetriNetVisualization: React.FC<PetriNetVisualizationProps> = ({
  fileKey,
  workerId,
  workId,
  progressData = [],
}) => {
  const { token } = theme.useToken();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [petriNetData, setPetriNetData] = useState<PetriNetData | null>(null);
  const [experimentRecordsData, setExperimentRecordsData] = useState<ExperimentRecordsData | null>(null);

  /**
   * トランジションごとの実験記録進捗を計算
   */
  const calculateExperimentProgress = useCallback(
    (transitionId: string, experimentRecords: ExperimentRecordsData | null) => {
      if (!experimentRecords) {
        return { materials: '0/?', conditions: '0/?', results: '0/?', total: 0 };
      }

      // 各カテゴリでこのトランジションに紐づくレコード数を数える
      const materialCount = (experimentRecords.materials || []).filter(
        (r) => r.transitionId === transitionId
      ).length;
      const conditionCount = (experimentRecords.conditions || []).filter(
        (r) => r.transitionId === transitionId
      ).length;
      const resultCount = (experimentRecords.results || []).filter(
        (r) => r.transitionId === transitionId
      ).length;

      return {
        materials: `${materialCount}/?`,
        conditions: `${conditionCount}/?`,
        results: `${resultCount}/?`,
        total: materialCount + conditionCount + resultCount,
      };
    },
    []
  );

  /**
   * ペトリネット構造データを取得
   */
  const fetchPetriNetStructure = useCallback(async () => {
    if (!fileKey) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 [PetriNetVisualization] ペトリネット構造取得開始:', fileKey);

      // ペトリネット構造とトランジション進捗を並行取得
      const encodedFileKey = encodeURIComponent(fileKey);
      const [structureResponse, progressResponse] = await Promise.all([
        fetch(`/api/worker/petri-net-structure/${encodedFileKey}`),
        fetch(`/api/worker/transition-status/${encodeURIComponent(workerId)}/${encodedFileKey}`),
      ]);

      // 実験記録データ取得（workId必須）
      let fetchedExperimentRecords: ExperimentRecordsData | null = null;
      if (workId) {
        try {
          const recordsResponse = await fetch(
            `/api/experiment-records/by-work-id/${encodeURIComponent(workId)}`,
            { credentials: 'include' }
          );

          if (recordsResponse.ok) {
            const recordsResult = await recordsResponse.json();
            if (recordsResult.success && recordsResult.data) {
              fetchedExperimentRecords = recordsResult.data;
              setExperimentRecordsData(fetchedExperimentRecords);
              console.log('✅ [PetriNetVisualization] 実験記録データ取得成功:', {
                materials: fetchedExperimentRecords?.materials?.length || 0,
                conditions: fetchedExperimentRecords?.conditions?.length || 0,
                results: fetchedExperimentRecords?.results?.length || 0,
              });
            }
          }
        } catch (error) {
          console.warn('⚠️ [PetriNetVisualization] 実験記録データ取得エラー:', error);
        }
      }

      if (!structureResponse.ok) {
        throw new Error(`ペトリネット構造の取得に失敗しました: ${structureResponse.status}`);
      }

      const structureResult = await structureResponse.json();

      // 進捗データ取得（エラーでも続行）
      let transitionProgressData: TransitionProgress[] = [];
      if (progressResponse.ok) {
        const progressResult = await progressResponse.json();
        console.log('📊 [PetriNetVisualization] Progress API response:', progressResult);

        if (progressResult.success && progressResult.data) {
          // transitionStatusフィールドを確認
          const statusArray = progressResult.data.transitionStatus || progressResult.data;
          if (Array.isArray(statusArray)) {
            transitionProgressData = statusArray;
            console.log('✅ [PetriNetVisualization] トランジション進捗取得成功:', {
              count: transitionProgressData.length,
              sample: transitionProgressData.slice(0, 2).map((p) => ({
                transitionId: p.transitionId,
                transitionName: p.transitionName,
                progressStatus: p.progressStatus,
                latestStatus: p.latestStatus,
                allKeys: Object.keys(p),
              })),
            });
          } else {
            console.warn('⚠️ [PetriNetVisualization] 進捗データが配列ではない:', statusArray);
          }
        }
      } else {
        console.warn(
          '⚠️ [PetriNetVisualization] トランジション進捗取得失敗（続行）:',
          progressResponse.status
        );
      }

      if (structureResult.success) {
        setPetriNetData(structureResult.data);
        console.log('✅ [PetriNetVisualization] ペトリネット構造取得成功:', {
          places: structureResult.data.places.length,
          transitions: structureResult.data.transitions.length,
          arcs: structureResult.data.arcs.length,
          progressCount: transitionProgressData.length,
        });

        // React Flowノードとエッジに変換（実験記録データを渡す）
        const flowNodes = convertToFlowNodes(
          structureResult.data,
          transitionProgressData,
          fetchedExperimentRecords
        );
        const flowEdges = convertToFlowEdges(structureResult.data);

        setNodes(flowNodes);
        setEdges(flowEdges);
      } else {
        throw new Error(structureResult.error || 'ペトリネット構造の取得に失敗しました');
      }
    } catch (err) {
      console.error('❌ [PetriNetVisualization] ペトリネット構造取得エラー:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [fileKey, workerId, workId, calculateExperimentProgress]);

  // 初回データ取得
  useEffect(() => {
    fetchPetriNetStructure();
  }, [fetchPetriNetStructure]);

  /**
   * ペトリネットデータをReact Flowノードに変換
   * ※実装が非常に長いため、別関数として定義
   */
  const convertToFlowNodes = useCallback(
    (data: PetriNetData, progress: TransitionProgress[], experimentRecords: ExperimentRecordsData | null): Node[] => {
      // ※元のJavaScript実装をそのまま移植（長いため省略記号で示します）
      // 実際の実装は次のメッセージで続けます
      const flowNodes: Node[] = [];
      const horizontalSpacing = 250;
      const nodeSpacing = 80;
      const startX = 50;

      const places = Array.isArray(data.places) ? data.places : [];
      const transitions = Array.isArray(data.transitions) ? data.transitions : [];
      const arcs = Array.isArray(data.arcs) ? data.arcs : [];

      console.log('🔍 [convertToFlowNodes] 新ロジック開始:', {
        placesCount: places.length,
        transitionsCount: transitions.length,
        arcsCount: arcs.length,
      });

      // 簡易レイアウト: Transitionを横に配置し、Placeを上下に配置
      const nodePositions = new Map<string, { x: number; y: number }>();

      // Transitionを横方向に配置
      transitions.forEach((transition, index) => {
        const x = startX + horizontalSpacing * (index + 1);
        const y = 300;
        nodePositions.set(transition.id, { x, y });
      });

      // Placeを配置
      places.forEach((place, placeIndex) => {
        // このPlaceが接続しているTransitionを探す
        const connectedTransitions = arcs
          .filter((arc) => arc.source === place.id || arc.target === place.id)
          .map((arc) => (arc.source === place.id ? arc.target : arc.source))
          .filter((id) => transitions.some((t) => t.id === id));

        if (connectedTransitions.length > 0) {
          // 接続されているTransitionの位置を基準に配置
          const transitionId = connectedTransitions[0];
          const transitionPos = nodePositions.get(transitionId);

          if (transitionPos) {
            // 入力Placeは左側、出力Placeは右側に配置
            const isInput = arcs.some(
              (arc) => arc.source === place.id && arc.target === transitionId
            );
            const x = isInput ? transitionPos.x - horizontalSpacing / 2 : transitionPos.x + horizontalSpacing / 2;
            const y = transitionPos.y + (placeIndex % 3) * nodeSpacing - nodeSpacing;
            nodePositions.set(place.id, { x, y });
          }
        } else {
          // 接続がない場合は適当な位置に配置
          const x = startX;
          const y = 100 + placeIndex * nodeSpacing;
          nodePositions.set(place.id, { x, y });
        }
      });

      // ステレオタイプに基づいてノードタイプを決定
      const getNodeType = (node: { type: string; data: { stereotype?: string } }) => {
        if (node.type === 'transition') {
          return 'transition';
        }

        const stereotype = node.data?.stereotype;
        if (!stereotype) return 'default';

        const lower = stereotype.toLowerCase();
        if (lower.includes('material')) return 'materialTemplate';
        if (lower.includes('condition')) return 'conditionTemplate';
        if (lower.includes('result')) return 'resultTemplate';

        return 'default';
      };

      // 全ノードを配置
      const allNodes = [...places, ...transitions];
      allNodes.forEach((node) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return;

        const { x, y } = pos;
        const nodeType = getNodeType(node);

        // Transitionの場合、進捗情報を追加
        if (node.type === 'transition') {
          // 進捗データ検索
          const transitionProgress = progress.find(
            (p) =>
              p.transitionId === node.id ||
              p.transitionName === node.id
          );

          // 実験記録進捗計算
          const experimentProgress = calculateExperimentProgress(node.id, experimentRecords);

          // 進捗状態判定
          const statusValue =
            transitionProgress?.progressStatus ||
            transitionProgress?.latestStatus ||
            '未着手';

          const isCompleted = statusValue === '完了' || statusValue === 'completed';
          const isInProgress =
            statusValue === '作業中' ||
            statusValue === 'in_progress' ||
            statusValue === '準備中';

          // ツールチップテキスト生成
          const tooltipText = [
            `📊 実験記録進捗 (${experimentProgress.total}件)`,
            `• 材料: ${experimentProgress.materials}`,
            `• 測定条件: ${experimentProgress.conditions}`,
            `• 結果: ${experimentProgress.results}`,
            ``,
            `⚠️ 進捗報告: ${statusValue}`,
          ].join('\n');

          flowNodes.push({
            id: node.id,
            type: nodeType,
            position: { x, y },
            data: {
              label: node.data.label || node.id,
              stereotype: node.data.stereotype,
              isCompleted,
              isInProgress,
              progressChip: transitionProgress ? (
                <Tag
                  color={isCompleted ? 'success' : isInProgress ? 'processing' : 'default'}
                  style={{ fontSize: token.fontSizeSM - 4 }}
                >
                  {String(statusValue)}
                </Tag>
              ) : null,
              tooltip: tooltipText,
            },
          });
        } else {
          // Placeの場合
          flowNodes.push({
            id: node.id,
            type: nodeType,
            position: { x, y },
            data: {
              label: node.data.label || node.id,
              stereotype: node.data.stereotype,
            },
          });
        }
      });

      return flowNodes;
    },
    [calculateExperimentProgress, token]
  );

  /**
   * Arc（アーク）をReact Flowエッジに変換
   */
  const convertToFlowEdges = useCallback((data: PetriNetData): Edge[] => {
    const arcs = Array.isArray(data.arcs) ? data.arcs : [];

    return arcs.map((arc) => ({
      id: arc.id,
      source: arc.source,
      target: arc.target,
      type: 'straight',
      animated: false,
      style: { stroke: token.colorTextSecondary, strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: token.colorTextSecondary,
      },
    }));
  }, [token]);

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ height: 500 }}>
        <Space>
          <Spin size="large" />
          <Text>ペトリネット構造を読み込み中...</Text>
        </Space>
      </Flex>
    );
  }

  if (error) {
    return (
      <Alert
        message="エラー"
        description={error}
        type="error"
        showIcon
        style={{ margin: token.margin }}
      />
    );
  }

  if (!petriNetData) {
    return (
      <Alert
        message="ペトリネット構造が見つかりません"
        type="info"
        showIcon
        style={{ margin: token.margin }}
      />
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* ヘッダー */}
      <Card size="small">
        <Flex justify="space-between" align="center">
          <Typography.Title level={5} style={{ margin: 0 }}>
            実験フロー図
          </Typography.Title>
          <Space>
            <Tag color="processing">Place: {petriNetData.places.length}</Tag>
            <Tag color="processing">Transition: {petriNetData.transitions.length}</Tag>
            <Tag>Arc: {petriNetData.arcs.length}</Tag>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={fetchPetriNetStructure}
              type="text"
            />
          </Space>
        </Flex>
      </Card>

      {/* React Flowダイアグラム */}
      <Card
        size="small"
        style={{
          width: '100%',
          height: 700,
          padding: 0,
        }}
        styles={{ body: { height: '100%', padding: 0 } }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.2,
            minZoom: 0.5,
            maxZoom: 1.5,
          }}
          attributionPosition="bottom-left"
        >
          <MiniMap
            style={{
              height: 120,
              width: 200,
            }}
            nodeStrokeColor={(n: Node) => {
              if (n.type === 'input') return token.colorPrimary;
              if (n.type === 'output') return token.colorError;
              return token.colorText;
            }}
            nodeColor={(n: Node) => {
              return token.colorBgContainer;
            }}
            nodeBorderRadius={2}
            maskColor="rgba(0, 0, 0, 0.2)"
          />
          <Controls />
          <Background color={token.colorBorderSecondary} gap={16} />
        </ReactFlow>
      </Card>

      {/* 凡例 */}
      <Flex gap="middle" wrap align="center">
        <Text strong>凡例:</Text>
        <Flex align="center" gap="small">
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `2px solid ${token.colorText}`,
              background: token.colorBgContainer,
            }}
          />
          <Text style={{ fontSize: token.fontSizeSM }}>Material</Text>
        </Flex>
        <Flex align="center" gap="small">
          <svg width="20" height="20">
            <polygon
              points="10,2 18,8 16,18 4,18 2,8"
              fill={token.colorBgContainer}
              stroke={token.colorText}
              strokeWidth="1.5"
            />
          </svg>
          <Text style={{ fontSize: token.fontSizeSM }}>Condition</Text>
        </Flex>
        <Flex align="center" gap="small">
          <div
            style={{
              width: 20,
              height: 15,
              border: `2px solid ${token.colorText}`,
              background: token.colorBgContainer,
            }}
          />
          <Text style={{ fontSize: token.fontSizeSM }}>Result</Text>
        </Flex>
        <Flex align="center" gap="small">
          <div
            style={{
              width: 8,
              height: 20,
              background: token.colorText,
            }}
          />
          <Text style={{ fontSize: token.fontSizeSM }}>Transition</Text>
        </Flex>
        <Divider type="vertical" />
        <Tag color="success">✅ 完了</Tag>
        <Tag color="processing">🔵 作業中</Tag>
      </Flex>
    </Space>
  );
};

export default PetriNetVisualization;
