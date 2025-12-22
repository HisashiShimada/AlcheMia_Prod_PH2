# PetriNetVisualization 差分分析レポート

**作成日時**: 2025-12-22 13:07  
**対象ファイル**:
- reference版: `reference/frontend/src/components/WorkerDashboard/PetriNetVisualization.js`
- 現在版: `frontend/src/components/progress/PetriNetVisualization.tsx`

## 1. カスタムノードの実装差異

### 1.1 MaterialTemplateNode

#### reference版
```javascript
const MaterialTemplateNode = memo(({ data }) => {
  const isFired = data.isFired || false;
  
  return (
    <div style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      <div style={{
        width: 35,
        height: 35,
        borderRadius: '50%',
        border: `2px solid ${isFired ? '#4caf50' : 'black'}`,
        background: isFired ? '#e8f5e9' : 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: isFired ? '0 0 8px rgba(76, 175, 80, 0.5)' : 'none',
      }}>
        {/* ラベルを下に配置 */}
        <div style={{
          position: 'absolute',
          bottom: -25,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          fontSize: '9px',
          width: '150px',
        }}>
          <div style={{ fontWeight: 'bold' }}>{data.label}</div>
          {isFired && (
            <div style={{ color: '#4caf50', fontSize: '8px', fontWeight: 'bold', marginTop: '1px' }}>
              ✅ 発火済み
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
    </div>
  );
});
```

#### 現在版
```typescript
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
```

**差異:**
- ✅ **色の指定**: ハードコーディング → デザイントークン使用
- ✅ **フォントサイズ**: `'9px'` → `token.fontSizeSM - 3`
- ✅ **TypeScript型定義**: 追加

### 1.2 TransitionNode

#### reference版の重要な実装
```javascript
const TransitionNode = memo(({ data }) => {
  const { label, isCompleted, isInProgress, progressChip, tooltip } = data;
  
  let backgroundColor = 'black';
  let boxShadow = 'none';
  
  if (isCompleted) {
    backgroundColor = '#4caf50'; // 緑色
    boxShadow = '0 0 8px rgba(76, 175, 80, 0.8)';
  } else if (isInProgress) {
    backgroundColor = '#2196f3'; // 青色
    boxShadow = '0 0 8px rgba(33, 150, 243, 0.8)';
  }
  
  const nodeContent = (
    <div style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      {/* 進捗Chipを上部に配置 */}
      {progressChip && (
        <div style={{
          position: 'absolute',
          top: -25,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}>
          {progressChip}
        </div>
      )}
      <div style={{
        width: 5.6,
        height: 28,
        background: backgroundColor,
        position: 'relative',
        boxShadow: boxShadow,
      }}>
        {/* ラベルを下部に配置 */}
        <div style={{
          position: 'absolute',
          top: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          fontSize: '9px',
          width: '150px',
          whiteSpace: 'nowrap',
          fontWeight: 'bold',
        }}>
          {label}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
    </div>
  );
  
  // 🆕 ツールチップでラップ
  if (tooltip) {
    return (
      <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} arrow placement="top">
        {nodeContent}
      </Tooltip>
    );
  }
  
  return nodeContent;
});
```

#### 現在版
```typescript
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
```

**差異:**
- ✅ **Material-UI Tooltip → Ant Design Tooltip**: `arrow` propが不要
- ✅ **色の指定**: ハードコーディング → デザイントークン
- ✅ **boxShadowの透明度**: `rgba(76, 175, 80, 0.8)` → `${token.colorSuccess}CC`（16進数形式）

## 2. convertToFlowNodes のレイアウトアルゴリズム差異

### ❌ **最大の差異: レイアウトアルゴリズムが全く異なる**

#### reference版: トポロジカルソートベースの複雑な配置
```javascript
// トポロジカルソートでTransitionの出現順を決定
const getTransitionOrder = () => {
  const inDegree = new Map();
  const levels = new Map();
  
  // 初期化
  transitions.forEach(t => {
    inDegree.set(t.id, 0);
    levels.set(t.id, 0);
  });
  
  // Transition間の依存関係を計算（Place経由）
  transitions.forEach(t => {
    const inputPlaces = arcs.filter(arc => arc.target === t.id).map(arc => arc.source);
    inputPlaces.forEach(placeId => {
      // このPlaceに入力するTransitionを探す
      const sourceTrans = arcs
        .filter(arc => arc.target === placeId && transitions.some(tr => tr.id === arc.source))
        .map(arc => arc.source);
      
      sourceTrans.forEach(sourceTransId => {
        inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
      });
    });
  });
  
  // BFSでレベル計算
  const queue = [];
  transitions.forEach(t => {
    if (inDegree.get(t.id) === 0) {
      queue.push(t.id);
      levels.set(t.id, 0);
    }
  });
  
  while (queue.length > 0) {
    const currentId = queue.shift();
    const currentLevel = levels.get(currentId);
    
    // このTransitionの出力Placeを経由する次のTransitionを探す
    const outputPlaces = arcs.filter(arc => arc.source === currentId).map(arc => arc.target);
    outputPlaces.forEach(placeId => {
      const nextTrans = arcs
        .filter(arc => arc.source === placeId && transitions.some(t => t.id === arc.target))
        .map(arc => arc.target);
      
      nextTrans.forEach(nextTransId => {
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
  
  return sorted;
};

const orderedTransitions = getTransitionOrder();

// [以下、複雑な配置ロジックが続く...]
```

#### 現在版: 簡易的な横並び配置
```typescript
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
```

**差異:**
- ❌ **現在版: トポロジカルソートなし** → レイアウトが不正確
- ❌ **現在版: 依存関係を考慮しない** → ノードの重なりが発生する可能性
- ❌ **現在版: レベル分けなし** → 視覚的に理解しにくい配置

## 3. ノード生成時のデータ設定差異

### reference版
```javascript
// Transitionの場合、進捗情報を追加
if (node.type === 'transition') {
  // 進捗データ検索（TransitionStatusPanel形式に対応）
  const transitionProgress = progressArray.find(
    (p) => {
      const match = p.transitionId === node.id ||
                   p.transitionName === node.id ||
                   p.transition_id === node.id || 
                   p.transition_name === node.id;
      if (match) {
        console.log('🎯 [Progress Match] Transition:', node.id, 'Progress:', p);
      }
      return match;
    }
  );
  
  // 🆕 実験記録進捗計算
  const experimentProgress = calculateExperimentProgress(node.id, experimentRecords);
  
  // 進捗状態判定（TransitionStatusPanel形式: progressStatus優先）
  const statusValue = transitionProgress?.progressStatus ||
                     transitionProgress?.progress_status || 
                     transitionProgress?.latestStatus ||
                     transitionProgress?.status ||
                     '未着手';
  
  // 🔧 修正: 完了判定は進捗報告ベースのみ（実験記録では判定しない）
  const isCompleted = statusValue === '完了' || statusValue === 'completed';
  const isInProgress = statusValue === '作業中' || statusValue === 'in_progress' || statusValue === '準備中';
  
  // 🆕 ツールチップテキスト生成
  const tooltipText = [
    `📊 実験記録進捗 (${experimentProgress.total}件)`,
    `• 材料: ${experimentProgress.materials}`,
    `• 測定条件: ${experimentProgress.conditions}`,
    `• 結果: ${experimentProgress.results}`,
    ``,
    `⚠️ 進捗報告: ${statusValue}`
  ].join('\n');
  
  if (!transitionProgress) {
    console.log('⚠️ [No Progress] Transition:', node.id, 'Available progress data:', 
      progressArray.map(p => ({
        id: p.transition_id || p.transitionId,
        status: p.progress_status || p.progressStatus
      }))
    );
  }
  
  flowNodes.push({
    id: node.id,
    type: nodeType,
    position: { x, y },
    data: {
      label: node.data.label || node.id,
      stereotype: node.data.stereotype,
      isCompleted,  // 🔧 進捗報告ベースのみ
      isInProgress,
      progressChip: transitionProgress ? (
        <Chip
          label={statusValue}
          size="small"
          color={isCompleted ? 'success' : isInProgress ? 'primary' : 'default'}
          sx={{ mt: 0.5, fontSize: '0.6rem' }}
        />
      ) : null,
      tooltip: tooltipText,  // 🆕 追加
    },
  });
}
```

### 現在版
```typescript
// Transitionの場合、進捗情報を追加
if (node.type === 'transition') {
  // 進捗データ検索（TransitionStatusPanel形式に対応）
  const transitionProgress = progress.find((p) => {
    const match =
      p.transitionId === node.id ||
      p.transitionName === node.id;
    if (match) {
      console.log('🎯 [Progress Match] Transition:', node.id, 'Progress:', p);
    }
    return match;
  });

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

  if (!transitionProgress) {
    console.log(
      '⚠️ [No Progress] Transition:',
      node.id,
      'Available progress data:',
      progress.map((p) => ({
        id: p.transitionId,
        status: p.progressStatus,
      }))
    );
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
}
```

**差異:**
- ✅ **Material-UI Chip → Ant Design Tag**: プロパティが異なる
- ⚠️ **progress検索**: reference版は`p.transition_id`や`p.progress_status`などのフォールバック検索あり
- ⚠️ **statusValue**: reference版は`progress_status`や`status`のフォールバックあり

## 4. UIコンポーネントの差異

### 4.1 ヘッダーセクション

#### reference版（Material-UI）
```javascript
<Card sx={{ mb: 2 }}>
  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Typography variant="h6" gutterBottom>
        実験フロー図
      </Typography>
      <Box display="flex" gap={1} alignItems="center">
        <Chip
          label={`Place: ${displayData.places?.length || 0}`}
          size="small"
          color="primary"
        />
        <Chip
          label={`Transition: ${displayData.transitions?.length || 0}`}
          size="small"
          color="secondary"
        />
        <Chip
          label={`Arc: ${displayData.arcs?.length || 0}`}
          size="small"
          color="default"
        />
        <IconButton size="small" onClick={fetchPetriNetStructure}>
          <RefreshIcon />
        </IconButton>
      </Box>
    </Box>
  </CardContent>
</Card>
```

#### 現在版（Ant Design）
```typescript
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
```

**差異:**
- ✅ **Material-UI → Ant Design**: コンポーネントライブラリ変更
- ⚠️ **表示データ**: reference版は`displayData`、現在版は`petriNetData`（複数Method対応の差）

### 4.2 Method切り替えタブ

#### reference版（Material-UI）
```javascript
{isMultiMethod && methods.length > 1 && (
  <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
    <Typography variant="subtitle2" gutterBottom sx={{ mb: 1, fontWeight: 'bold' }}>
      🔬 Method選択:
    </Typography>
    <Tabs
      value={selectedMethodId}
      onChange={(e, newValue) => {
        // method切り替えロジック
      }}
      variant="scrollable"
      scrollButtons="auto"
      sx={{ minHeight: 'auto' }}
    >
      {methods.map(method => (
        <Tab
          key={method.methodId}
          value={method.methodId}
          label={method.methodName || method.methodId}
          icon={<ScienceIcon fontSize="small" />}
          iconPosition="start"
          sx={{ minHeight: '40px', py: 0.5 }}
        />
      ))}
    </Tabs>
  </Box>
)}
```

#### 現在版（Ant Design）
```typescript
{isMultiMethod && methods.length > 1 && (
  <Card size="small">
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Text strong>🔬 Method選択:</Text>
      <Tabs
        activeKey={selectedMethodId || undefined}
        onChange={(key) => {
          // method切り替えロジック
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
```

**差異:**
- ✅ **Material-UI → Ant Design**: コンポーネントライブラリ変更
- ✅ **アイコン**: `<ScienceIcon>` → `<ExperimentOutlined>`
- ✅ **プロパティ**: `value/onChange` → `activeKey/onChange`, `variant` → `items`

## 5. 重要な機能差異まとめ

### ✅ 実装済み（問題なし）
1. 複数Method対応機能
2. Method切り替えタブUI
3. カスタムノードのデザイントークン対応
4. ツールチップ表示
5. トランジションステータス表示と色変更
6. Material-UI → Ant Design v6移行

### ❌ 実装されていない（問題あり）
1. **レイアウトアルゴリズム**
   - reference版: トポロジカルソートベースの複雑な配置ロジック
   - 現在版: 簡易的な横並び配置
   - **影響**: ノードの配置が不正確、視覚的に理解しにくい

2. **Phase 2の独立ノード配置**
   - reference版: 独立ノード（入力専用Place）を別フェーズで配置
   - 現在版: 未実装
   - **影響**: 一部のノードが配置されない可能性

3. **重なり回避ロジック**
   - reference版: 詳細な衝突チェックと位置調整
   - 現在版: 未実装
   - **影響**: ノードが重なる可能性

4. **レベル分けの縦配置**
   - reference版: 同レベルのTransitionを縦に配置
   - 現在版: 横並び配置のみ
   - **影響**: 複数Methodの表示が不自然

5. **refreshTrigger対応**
   - reference版: 3つのuseEffectで異なるタイミングでの更新に対応
   - 現在版: refreshTrigger propsなし
   - **影響**: 進捗報告後の自動更新ができない

## 6. 推奨される修正

### 優先度: 最高
1. **レイアウトアルゴリズムの完全移植**
   - reference版のトポロジカルソートベースのアルゴリズムを移植
   - 約200行の複雑なロジック

2. **Phase 2独立ノード配置の実装**
   - 入力専用Placeの配置ロジック追加

### 優先度: 高
3. **refreshTrigger propsの追加**
   - Props定義に追加
   - useEffectで監視して進捗データ再取得

4. **Method切り替え時の進捗データ再取得**
   - reference版のuseEffectロジックを移植

### 優先度: 中
5. **progress検索のフォールバック追加**
   - `p.transition_id`, `p.progress_status`, `p.status`などのフォールバック

## 7. コード行数比較

| 項目 | reference版 | 現在版 | 差分 |
|------|------------|--------|------|
| 全体 | 約800行 | 約750行 | -
