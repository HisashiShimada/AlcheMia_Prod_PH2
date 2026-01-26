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
  Tabs,
  theme,
} from 'antd';
import {
  ReloadOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import type {
  TransitionProgress,
  PetriNetData,
  MethodData,
  ExperimentRecordsData,
} from '@/types/progress';
import {
  shouldUseMockAPI,
  fetchPetriNetStructure as fetchPetriNetStructureAPI,
  fetchTransitionStatus as fetchTransitionStatusAPI,
  fetchExperimentRecords as fetchExperimentRecordsAPI,
} from '@/utils/apiClient';

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

  // ツールチップでラップ（テキスト色のみカスタマイズ）
  if (tooltip) {
    return (
      <Tooltip 
        title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} 
        placement="top"
        overlayInnerStyle={{
          color: token.colorText,  // テキスト色: 黒
        }}
      >
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
  const [transitionProgressData, setTransitionProgressData] = useState<TransitionProgress[]>([]);

  // 🆕 複数method対応
  const [isMultiMethod, setIsMultiMethod] = useState(false);
  const [methods, setMethods] = useState<MethodData[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

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

      const useMock = shouldUseMockAPI();
      console.log(`🔧 [PetriNetVisualization] API モード: ${useMock ? 'モック' : '実API'}`);

      let structureResult: unknown;
      let progressResult: unknown;
      let fetchedExperimentRecords: ExperimentRecordsData | null = null;

      if (useMock) {
        // モックAPIを使用
        console.log('📦 [PetriNetVisualization] モックAPIからデータ取得中...');
        
        // 構造データは必ず取得
        structureResult = await fetchPetriNetStructureAPI(fileKey);
        
        // 🔧 修正: progressDataが渡されている場合はそれを使用、そうでなければAPI呼び出し
        if (progressData && progressData.length > 0) {
          console.log('✅ [PetriNetVisualization] Props経由で進捗データを使用:', {
            count: progressData.length,
            sample: progressData.slice(0, 2).map((p) => ({
              transitionId: p.transitionId,
              transitionName: p.transitionName,
              progressStatus: p.progressStatus,
            })),
          });
          progressResult = {
            success: true,
            data: {
              transitionStatus: progressData,
            },
          };
        } else {
          progressResult = await fetchTransitionStatusAPI(workerId, fileKey);
        }

        // 実験記録データ取得（workId必須）
        if (workId) {
          try {
            const recordsData = await fetchExperimentRecordsAPI(workId);
            if (recordsData && typeof recordsData === 'object' && 'data' in recordsData) {
              fetchedExperimentRecords = (recordsData as { data: ExperimentRecordsData }).data;
              setExperimentRecordsData(fetchedExperimentRecords);
              console.log('✅ [PetriNetVisualization] 実験記録データ取得成功（モック）:', {
                materials: fetchedExperimentRecords?.materials?.length || 0,
                conditions: fetchedExperimentRecords?.conditions?.length || 0,
                results: fetchedExperimentRecords?.results?.length || 0,
              });
            }
          } catch (error) {
            console.warn('⚠️ [PetriNetVisualization] 実験記録データ取得エラー（モック）:', error);
          }
        }
      } else {
        // 実APIを使用
        const encodedFileKey = encodeURIComponent(fileKey);
        const [structureResponse, progressResponse] = await Promise.all([
          fetch(`/api/worker/petri-net-structure/${encodedFileKey}`),
          fetch(`/api/worker/transition-status/${encodeURIComponent(workerId)}/${encodedFileKey}`),
        ]);

        // 実験記録データ取得（workId必須）
        if (workId) {
          try {
            const recordsResponse = await fetch(
              `/api/experiment-records/by-work-id/${encodeURIComponent(workId)}`,
              { credentials: 'include' }
            );

            if (recordsResponse.ok) {
              const recordsData = await recordsResponse.json();
              if (recordsData.success && recordsData.data) {
                fetchedExperimentRecords = recordsData.data;
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

        structureResult = await structureResponse.json();

        // 進捗データ取得（エラーでも続行）
        if (progressResponse.ok) {
          progressResult = await progressResponse.json();
        } else {
          console.warn(
            '⚠️ [PetriNetVisualization] トランジション進捗取得失敗（続行）:',
            progressResponse.status
          );
          progressResult = { success: true, data: { transitionStatus: [] } };
        }
      }

      // 進捗データ処理
      let transitionProgressData: TransitionProgress[] = [];
      if (progressResult && typeof progressResult === 'object' && 'success' in progressResult) {
        const typedProgressResult = progressResult as { success: boolean; data?: { transitionStatus?: TransitionProgress[] } };
        if (typedProgressResult.success && typedProgressResult.data) {
          const statusArray = typedProgressResult.data.transitionStatus || [];
          if (Array.isArray(statusArray)) {
            transitionProgressData = statusArray;
            console.log('✅ [PetriNetVisualization] トランジション進捗取得成功:', {
              count: transitionProgressData.length,
              sample: transitionProgressData.slice(0, 2).map((p) => ({
                transitionId: p.transitionId,
                transitionName: p.transitionName,
                progressStatus: p.progressStatus,
                latestStatus: p.latestStatus,
              })),
            });
          }
        }
      }

      // 構造データ処理
      if (structureResult && typeof structureResult === 'object' && 'success' in structureResult) {
        const typedStructureResult = structureResult as { success: boolean; data?: PetriNetData; error?: string };
        if (typedStructureResult.success && typedStructureResult.data) {
          const data = typedStructureResult.data;
          setPetriNetData(data);

          // 🆕 複数method情報を取得
          const isMulti = data.isMultiMethod || false;
          const methodsArray = data.methods || [];

          console.log('🔍 [PetriNetVisualization] APIレスポンス詳細:', {
            isMultiMethod: isMulti,
            methodsLength: methodsArray.length,
            places: data.places.length,
            transitions: data.transitions.length,
            arcs: data.arcs.length,
            progressCount: transitionProgressData.length,
          });

          setIsMultiMethod(isMulti);
          setMethods(methodsArray);

          // 🆕 デフォルトで最初のmethodを選択（複数methodの場合）
          if (isMulti && methodsArray.length > 0) {
            setSelectedMethodId(methodsArray[0].methodId);
            console.log('✅ [PetriNetVisualization] デフォルトmethod選択:', methodsArray[0].methodId);
          }

          // 🆕 表示用データ（複数methodの場合は最初のmethod、単一の場合は全体）
          const initialDisplayData = (isMulti && methodsArray.length > 0) 
            ? methodsArray[0] 
            : data;

          console.log('🎯 [PetriNetVisualization] 初回表示データ:', {
            isMulti,
            usingMethodData: isMulti && methodsArray.length > 0,
            methodId: isMulti && methodsArray.length > 0 ? methodsArray[0].methodId : 'N/A',
            placeCount: initialDisplayData.places?.length,
            transitionCount: initialDisplayData.transitions?.length,
          });

          // 🔧 進捗データをstateに保存
          setTransitionProgressData(transitionProgressData);

          // React Flowノードとエッジに変換（実験記録データを渡す）
          const flowNodes = convertToFlowNodes(
            initialDisplayData,
            transitionProgressData,
            fetchedExperimentRecords
          );
          const flowEdges = convertToFlowEdges(initialDisplayData);

          setNodes(flowNodes);
          setEdges(flowEdges);
        } else {
          throw new Error(typedStructureResult.error || 'ペトリネット構造の取得に失敗しました');
        }
      } else {
        throw new Error('ペトリネット構造のレスポンス形式が不正です');
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
   * reference版の完全なトポロジカルソートベースのアルゴリズムを移植
   */
  const convertToFlowNodes = useCallback(
    (data: PetriNetData, progress: TransitionProgress[], experimentRecords: ExperimentRecordsData | null): Node[] => {
      const flowNodes: Node[] = [];
      const horizontalSpacing = 250;  // ノード間の水平間隔
      const nodeSpacing = 80;         // ノード間の垂直間隔
      const startX = 50;              // 開始X座標
      
      // データ検証: 配列であることを確認
      const places = Array.isArray(data.places) ? data.places : [];
      const transitions = Array.isArray(data.transitions) ? data.transitions : [];
      const arcs = Array.isArray(data.arcs) ? data.arcs : [];
      
      console.log('🔍 [convertToFlowNodes] 新ロジック開始:', {
        placesCount: places.length,
        transitionsCount: transitions.length,
        arcsCount: arcs.length,
      });
      
      // 🔧 トポロジカルソートでTransitionの出現順を決定
      const getTransitionOrder = () => {
        const inDegree = new Map<string, number>();
        const levels = new Map<string, number>();
        
        // 初期化
        transitions.forEach((t) => {
          inDegree.set(t.id, 0);
          levels.set(t.id, 0);
        });
        
        // Transition間の依存関係を計算（Place経由）
        transitions.forEach((t) => {
          const inputPlaces = arcs.filter((arc) => arc.target === t.id).map((arc) => arc.source);
          inputPlaces.forEach((placeId) => {
            // このPlaceに入力するTransitionを探す
            const sourceTrans = arcs
              .filter((arc) => arc.target === placeId && transitions.some((tr) => tr.id === arc.source))
              .map((arc) => arc.source);
            
            sourceTrans.forEach((sourceTransId) => {
              inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
            });
          });
        });
        
        // BFSでレベル計算
        const queue: string[] = [];
        transitions.forEach((t) => {
          if (inDegree.get(t.id) === 0) {
            queue.push(t.id);
            levels.set(t.id, 0);
          }
        });
        
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          const currentLevel = levels.get(currentId) || 0;
          
          // このTransitionの出力Placeを経由する次のTransitionを探す
          const outputPlaces = arcs.filter((arc) => arc.source === currentId).map((arc) => arc.target);
          outputPlaces.forEach((placeId) => {
            const nextTrans = arcs
              .filter((arc) => arc.source === placeId && transitions.some((t) => t.id === arc.target))
              .map((arc) => arc.target);
            
            nextTrans.forEach((nextTransId) => {
              const nextLevel = currentLevel + 1;
              if (nextLevel > (levels.get(nextTransId) || 0)) {
                levels.set(nextTransId, nextLevel);
              }
              
              const degree = (inDegree.get(nextTransId) || 1) - 1;
              inDegree.set(nextTransId, degree);
              
              if (degree === 0 && !queue.includes(nextTransId)) {
                queue.push(nextTransId);
              }
            });
          });
        }
        
        // レベル順にソート
        const sorted = transitions.slice().sort((a, b) => {
          const levelA = levels.get(a.id) || 0;
          const levelB = levels.get(b.id) || 0;
          if (levelA !== levelB) return levelA - levelB;
          return a.id.localeCompare(b.id); // 同レベルはID順
        });
        
        console.log('📊 [getTransitionOrder] Transition順序:', sorted.map((t, i) => ({
          index: i,
          id: t.id,
          level: levels.get(t.id),
        })));
        
        return { sorted, levels };
      };
      
      const { sorted: orderedTransitions, levels: transitionLevels } = getTransitionOrder();
      
      // ノードの位置を決定するためのマップ
      const nodePositions = new Map<string, { x: number; y: number }>();
      
      // Transitionをレベルごとにグループ化
      const transitionsByLevel = new Map<number, typeof transitions>();
      transitions.forEach((t) => {
        const level = transitionLevels.get(t.id) || 0;
        if (!transitionsByLevel.has(level)) {
          transitionsByLevel.set(level, []);
        }
        transitionsByLevel.get(level)!.push(t);
      });
      
      const maxLevel = Math.max(...Array.from(transitionLevels.values()), 0);
      
      console.log('📊 [Transitions by Level]:', Array.from(transitionsByLevel.entries()).map(([level, trans]) => ({
        level,
        count: trans.length,
        transitions: trans.map((t) => t.id),
      })));
      
      // 🔧 Phase 1: レベルごとに処理（横並び）
      for (let level = 0; level <= maxLevel; level++) {
        const transitionsAtLevel = transitionsByLevel.get(level) || [];
        let currentY = 0;
        
        // 同レベルのTransitionを縦に処理
        transitionsAtLevel.forEach((transition, indexInLevel) => {
          console.log(`\n🔄 [Processing] Level ${level}, Transition ${indexInLevel}: ${transition.id}`);
          
          // このTransitionの入力ノード（Place）を取得
          const inputPlaceIds = arcs
            .filter((arc) => arc.target === transition.id)
            .map((arc) => arc.source);
          
          const inputPlaces = places.filter((p) => inputPlaceIds.includes(p.id));
          
          console.log(`  📥 入力ノード数: ${inputPlaces.length}`, inputPlaces.map((p) => p.id));
          
          // 従属ノード（他のTransitionの出力として使われるノード）のみ配置
          // 独立ノード（入力専用）は後で配置
          const dependentInputPlaces = inputPlaces.filter((place) => {
            // このPlaceが他のTransitionの出力かチェック
            return arcs.some((arc) => 
              arc.target === place.id && 
              transitions.some((t) => t.id === arc.source)
            );
          });
          
          console.log(`  📦 従属ノード: ${dependentInputPlaces.length}`, dependentInputPlaces.map((p) => p.id));
          
          // 従属ノードを配置
          dependentInputPlaces.forEach((place, i) => {
            if (!nodePositions.has(place.id)) {
              const x = startX + (level * horizontalSpacing);
              const y = currentY + (i * nodeSpacing);
              nodePositions.set(place.id, { x, y });
              console.log(`    ✓ 従属ノード ${place.id}: X=${x}, Y=${y}`);
            } else {
              console.log(`    ⏭️ 従属ノード ${place.id}: 既に配置済み`);
            }
          });
          
          // 配置済み入力ノード（従属ノード）のY座標範囲を計算
          const allInputYs = dependentInputPlaces
            .map((p) => nodePositions.get(p.id)?.y)
            .filter((y): y is number => y !== undefined);
          
          const transitionY = allInputYs.length > 0 
            ? (Math.min(...allInputYs) + Math.max(...allInputYs)) / 2
            : currentY;
          
          // Transitionを配置
          const transitionX = startX + (level * horizontalSpacing) + (horizontalSpacing * 0.5);
          nodePositions.set(transition.id, { x: transitionX, y: transitionY });
          console.log(`  ⚡ Transition ${transition.id}: X=${transitionX}, Y=${transitionY}`);
          
          // 出力ノード（Place）を取得・配置
          const outputPlaceIds = arcs
            .filter((arc) => arc.source === transition.id)
            .map((arc) => arc.target);
          
          const outputPlaces = places.filter((p) => outputPlaceIds.includes(p.id));
          
          outputPlaces.forEach((place, i) => {
            if (!nodePositions.has(place.id)) {
              const x = startX + ((level + 1) * horizontalSpacing);
              const y = transitionY + (i * nodeSpacing) - ((outputPlaces.length - 1) * nodeSpacing / 2);
              nodePositions.set(place.id, { x, y });
              console.log(`    ✓ 出力ノード ${place.id}: X=${x}, Y=${y}`);
            }
          });
          
          // 次の同レベルTransition用にY座標を更新
          const maxInputY = allInputYs.length > 0 ? Math.max(...allInputYs) : currentY;
          currentY = maxInputY + nodeSpacing * 3;
        });
      }
      
      // 🔧 Phase 2: すべてのTransition処理完了後、独立ノード（入力専用）を配置
      console.log('\n🎯 [Phase 2] 独立ノード配置開始');
      
      places.forEach((place) => {
        if (nodePositions.has(place.id)) {
          return; // 既に配置済み
        }
        
        // このPlaceが独立ノードか確認（入力専用）
        const isIndependent = !arcs.some((arc) => 
          arc.target === place.id && 
          transitions.some((t) => t.id === arc.source)
        );
        
        if (!isIndependent) {
          return; // 従属ノードなのに未配置？スキップ
        }
        
        // このPlaceが出力するTransitionを探す
        const outputTransitions = arcs
          .filter((arc) => arc.source === place.id)
          .map((arc) => transitions.find((t) => t.id === arc.target))
          .filter((t): t is typeof transitions[0] => t !== undefined);
        
        if (outputTransitions.length === 0) {
          return; // 出力先がない？スキップ
        }
        
        const targetTransition = outputTransitions[0];
        const transitionPos = nodePositions.get(targetTransition.id);
        const transitionLevel = transitionLevels.get(targetTransition.id) || 0;
        
        if (!transitionPos) {
          return; // Transitionが配置されていない？
        }
        
        // 独立ノードのX座標：Transitionと同じレベル
        const x = startX + (transitionLevel * horizontalSpacing);
        
        // Y座標：Transitionの近くで、他のノードと重ならない位置を探す
        let y = transitionPos.y;
        const minDistance = nodeSpacing * 0.8; // 最小距離
        
        // 既存ノードとの衝突チェック
        let attempts = 0;
        const maxAttempts = 50;
        while (attempts < maxAttempts) {
          let collision = false;
          
          for (const [, pos] of nodePositions.entries()) {
            if (Math.abs(pos.x - x) < horizontalSpacing * 0.3 && 
                Math.abs(pos.y - y) < minDistance) {
              collision = true;
              break;
            }
          }
          
          if (!collision) {
            break; // 衝突なし、この位置でOK
          }
          
          // 衝突あり、Y座標を調整
          y += nodeSpacing;
          attempts++;
        }
        
        nodePositions.set(place.id, { x, y });
        console.log(`  🎯 独立ノード ${place.id}: X=${x}, Y=${y} (Transition ${targetTransition.id}の入力)`);
      });
      
      console.log('\n📊 [Final Positions] 全ノード配置完了:', nodePositions.size);
      
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
          // TransitionIDでマッチング
          const transitionProgress = progress.find((p) => p.transitionId === node.id);

          // 実験記録進捗計算
          const experimentProgress = calculateExperimentProgress(node.id, experimentRecords);

          // 進捗状態判定（TransitionStatusPanel形式: progressStatus優先）
          const statusValue =
            transitionProgress?.progressStatus ||
            transitionProgress?.latestStatus ||
            '未着手';

          // 🔧 修正: 完了判定は進捗報告ベースのみ（実験記録では判定しない）
          const isCompleted = statusValue === '完了' || statusValue === 'completed' || statusValue === 'complete';
          const isInProgress =
            statusValue === '作業中' ||
            statusValue === 'in_progress' ||
            statusValue === '準備中';

          // 🐛 デバッグログ追加
          console.log(`🎨 [Color Debug] Transition: ${node.id}`, {
            statusValue,
            isCompleted,
            isInProgress,
            hasProgress: !!transitionProgress,
            progressStatus: transitionProgress?.progressStatus,
            latestStatus: transitionProgress?.latestStatus,
          });

          if (!transitionProgress) {
            console.log(
              '⚠️ [No Progress] Transition:',
              node.id,
              'Available progress data:',
              progress.map((p) => ({
                transitionId: p.transitionId,
                transitionName: p.transitionName,
                progressStatus: p.progressStatus,
              }))
            );
          } else {
            console.log('✅ [Progress Matched] Transition:', node.id, 'Progress:', {
              transitionId: transitionProgress.transitionId,
              transitionName: transitionProgress.transitionName,
              progressStatus: transitionProgress.progressStatus,
            });
          }

          // 🆕 ツールチップテキスト生成（reference版準拠）
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
              label: node.data.label || node.id,  // 🔧 修正: data.labelを使用
              stereotype: node.data.stereotype,
              isCompleted,  // 🔧 進捗報告ベースのみ
              isInProgress,
              progressChip: transitionProgress ? (
                <Tag
                  color={isCompleted ? 'success' : isInProgress ? 'processing' : 'default'}
                  style={{ fontSize: token.fontSizeSM - 4, marginTop: 4 }}
                >
                  {String(statusValue)}
                </Tag>
              ) : null,
              tooltip: tooltipText,  // 🆕 追加
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
        title="エラー"
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
        title="ペトリネット構造が見つかりません"
        type="info"
        showIcon
        style={{ margin: token.margin }}
      />
    );
  }

  return (
    <div style={{ width: '100%', height: '700px', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Card size="small" style={{ marginBottom: token.marginMD }}>
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

      {/* 🆕 Method切り替えタブ（複数methodの場合のみ表示） */}
      {isMultiMethod && methods.length > 1 && (
        <Card size="small">
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Text strong>🔬 Method選択:</Text>
            <Tabs
              activeKey={selectedMethodId || undefined}
              onChange={(key) => {
                console.log('🔄 [PetriNetVisualization] Method切り替え:', {
                  from: selectedMethodId,
                  to: key,
                });
                setSelectedMethodId(key);
                
                // method切り替え時にペトリネットを再描画
                const newMethodData = methods.find((m) => m.methodId === key);
                if (newMethodData) {
                  console.log('✅ [PetriNetVisualization] 新しいmethodデータ:', {
                    methodId: newMethodData.methodId,
                    placeCount: newMethodData.places?.length,
                    transitionCount: newMethodData.transitions?.length,
                    progressDataCount: transitionProgressData.length,
                  });
                  // 🔧 修正: 保存した進捗データを使用
                  const flowNodes = convertToFlowNodes(newMethodData, transitionProgressData, experimentRecordsData);
                  const flowEdges = convertToFlowEdges(newMethodData);
                  setNodes(flowNodes);
                  setEdges(flowEdges);
                }
              }}
              items={methods.map((method) => ({
                key: method.methodId,
                label: (
                  <Space>
                    <ExperimentOutlined />
                    {method.methodName || method.methodId}
                  </Space>
                ),
                children: null,
              }))}
            />
          </Space>
        </Card>
      )}

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
      <Flex gap="middle" wrap align="center" style={{ marginTop: token.marginMD }}>
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
    </div>
  );
};

export default PetriNetVisualization;
