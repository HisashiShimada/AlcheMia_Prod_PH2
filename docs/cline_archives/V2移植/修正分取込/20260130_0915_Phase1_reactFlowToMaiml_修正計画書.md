# Phase 1: reactFlowToMaiml.ts 修正計画書

**作成日時**: 2026-01-30 09:15  
**作成者**: Cline  
**対象ファイル**: `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts`  
**現在得点**: 88点 ⚠️  
**目標得点**: 95点以上 ✨

---

## 📊 現状分析

### 検証結果サマリー

| 項目 | 評価 | 詳細 |
|------|------|------|
| **総合評価** | **88点 ⚠️** | **未完成の移植** |
| 構造の一致性 | 95% | 主要構造は一致 |
| ロジックの一致性 | 85% | Template出力部分が未完成 |
| 型安全性 | 100% | TypeScript型定義完備 |
| コメント | 95% | ほぼ完全保持 |

### 🚨 重大な問題

**Template要素のXML出力が欠落**（-12点の減点）

現在のコード（1890行目付近）:
```typescript
// materialTemplate要素群の出力は次のメッセージで実装します
maiml += `      </program>\n`;
maiml += `    </method>\n`;
maiml += `  </protocol>\n`;
```

**問題点**:
- ❌ materialTemplateが出力されない
- ❌ conditionTemplateが出力されない
- ❌ resultTemplateが出力されない
- ❌ テンプレート情報を含むMaiMLが生成できない

---

## 🎯 実装計画

### Phase 1-1: materialTemplate要素群の実装

**追加位置**: `convertReactFlowToMaiML`関数内、`maiml += '      </program>\n';`の前

**実装コード** (約50行):

```typescript
// materialTemplate要素群
materialTemplates.forEach(node => {
  const template = node.data.template;
  if (!template) return;
  
  const templateId = template.templateId || template.id || `MT${node.id}`;
  let placeRefs = template.placeRefs || [];
  if (placeRefs.length === 0) {
    placeRefs = [node.id];
  }
  
  maiml += `        <materialTemplate id="${escapeXml(templateId)}">\n`;
  
  // uuid
  if (template.uuid) {
    maiml += `          <uuid>${escapeXml(template.uuid)}</uuid>\n`;
  } else {
    maiml += `          <uuid>${generateUUID()}</uuid>\n`;
  }
  
  // テンプレート継承（templateRef要素）
  if (template.href) {
    const inheritNodeId = template.href.startsWith('#') ? template.href.substring(1) : template.href;
    const inheritNode = places.find(p => p.id === inheritNodeId);
    if (inheritNode && inheritNode.data.template) {
      const inheritTemplateId = inheritNode.data.template.templateId || inheritNode.data.template.id || `MT${inheritNode.id}`;
      const templateRefId = `templateRef_${templateId}`;
      maiml += `          <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
    }
  }
  
  // insertion要素
  if (template.insertion) {
    maiml += `          <insertion>\n`;
    if (template.insertion.uri !== undefined) {
      maiml += `            <uri>${escapeXml(template.insertion.uri || '')}</uri>\n`;
    }
    if (template.insertion.hash !== undefined) {
      maiml += `            <hash>${escapeXml(template.insertion.hash || '')}</hash>\n`;
    }
    if (template.insertion.format) {
      maiml += `            <format>${escapeXml(template.insertion.format)}</format>\n`;
    }
    maiml += `          </insertion>\n`;
  }
  
  // name（オプション）
  if (template.name) {
    maiml += `          <name>${escapeXml(template.name)}</name>\n`;
  }
  
  // description（オプション）
  if (template.description) {
    maiml += `          <description>${escapeXml(template.description)}</description>\n`;
  }
  
  // property要素群（insertion型を除外して出力）
  if (template.properties && template.properties.length > 0) {
    template.properties
      .filter((prop: Property) => prop.type !== 'insertion')
      .forEach((prop: Property) => {
        maiml += buildPropertyXML(prop, 5);
      });
  }
  
  // placeRef（複数対応）
  placeRefs.forEach((placeRef, index) => {
    const placeRefId = index === 0 
      ? (template.placeRefId || `${templateId}TL`)
      : `${templateId}TL_${index}`;
    maiml += `          <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef)}"/>\n`;
  });
  
  maiml += `        </materialTemplate>\n`;
});
```

**推定時間**: 1時間

---

### Phase 1-2: conditionTemplate要素群の実装

**追加位置**: materialTemplate要素群の直後

**実装コード** (約50行):

```typescript
// conditionTemplate要素群
conditionTemplates.forEach(node => {
  const template = node.data.template;
  if (!template) return;
  
  const templateId = template.templateId || template.id || `CT${node.id}`;
  let placeRefs = template.placeRefs || [];
  if (placeRefs.length === 0) {
    placeRefs = [node.id];
  }
  
  maiml += `        <conditionTemplate id="${escapeXml(templateId)}">\n`;
  
  // uuid
  if (template.uuid) {
    maiml += `          <uuid>${escapeXml(template.uuid)}</uuid>\n`;
  } else {
    maiml += `          <uuid>${generateUUID()}</uuid>\n`;
  }
  
  // テンプレート継承（templateRef要素）
  if (template.href) {
    const inheritNodeId = template.href.startsWith('#') ? template.href.substring(1) : template.href;
    const inheritNode = places.find(p => p.id === inheritNodeId);
    if (inheritNode && inheritNode.data.template) {
      const inheritTemplateId = inheritNode.data.template.templateId || inheritNode.data.template.id || `CT${inheritNode.id}`;
      const templateRefId = `templateRef_${templateId}`;
      maiml += `          <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
    }
  }
  
  // insertion要素
  if (template.insertion) {
    maiml += `          <insertion>\n`;
    if (template.insertion.uri !== undefined) {
      maiml += `            <uri>${escapeXml(template.insertion.uri || '')}</uri>\n`;
    }
    if (template.insertion.hash !== undefined) {
      maiml += `            <hash>${escapeXml(template.insertion.hash || '')}</hash>\n`;
    }
    if (template.insertion.format) {
      maiml += `            <format>${escapeXml(template.insertion.format)}</format>\n`;
    }
    maiml += `          </insertion>\n`;
  }
  
  // name（オプション）
  if (template.name) {
    maiml += `          <name>${escapeXml(template.name)}</name>\n`;
  }
  
  // description（オプション）
  if (template.description) {
    maiml += `          <description>${escapeXml(template.description)}</description>\n`;
  }
  
  // property要素群（insertion型を除外して出力）
  if (template.properties && template.properties.length > 0) {
    template.properties
      .filter((prop: Property) => prop.type !== 'insertion')
      .forEach((prop: Property) => {
        maiml += buildPropertyXML(prop, 5);
      });
  }
  
  // placeRef（複数対応）
  placeRefs.forEach((placeRef, index) => {
    const placeRefId = index === 0 
      ? (template.placeRefId || `${templateId}TL`)
      : `${templateId}TL_${index}`;
    maiml += `          <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef)}"/>\n`;
  });
  
  maiml += `        </conditionTemplate>\n`;
});
```

**推定時間**: 1時間

---

### Phase 1-3: resultTemplate要素群の実装

**追加位置**: conditionTemplate要素群の直後

**実装コード** (約50行):

```typescript
// resultTemplate要素群
resultTemplates.forEach(node => {
  const template = node.data.template;
  if (!template) return;
  
  const templateId = template.templateId || template.id || `RT${node.id}`;
  let placeRefs = template.placeRefs || [];
  if (placeRefs.length === 0) {
    placeRefs = [node.id];
  }
  
  maiml += `        <resultTemplate id="${escapeXml(templateId)}">\n`;
  
  // uuid
  if (template.uuid) {
    maiml += `          <uuid>${escapeXml(template.uuid)}</uuid>\n`;
  } else {
    maiml += `          <uuid>${generateUUID()}</uuid>\n`;
  }
  
  // テンプレート継承（templateRef要素）
  if (template.href) {
    const inheritNodeId = template.href.startsWith('#') ? template.href.substring(1) : template.href;
    const inheritNode = places.find(p => p.id === inheritNodeId);
    if (inheritNode && inheritNode.data.template) {
      const inheritTemplateId = inheritNode.data.template.templateId || inheritNode.data.template.id || `RT${inheritNode.id}`;
      const templateRefId = `templateRef_${templateId}`;
      maiml += `          <templateRef id="${escapeXml(templateRefId)}" ref="${escapeXml(inheritTemplateId)}"/>\n`;
    }
  }
  
  // insertion要素
  if (template.insertion) {
    maiml += `          <insertion>\n`;
    if (template.insertion.uri !== undefined) {
      maiml += `            <uri>${escapeXml(template.insertion.uri || '')}</uri>\n`;
    }
    if (template.insertion.hash !== undefined) {
      maiml += `            <hash>${escapeXml(template.insertion.hash || '')}</hash>\n`;
    }
    if (template.insertion.format) {
      maiml += `            <format>${escapeXml(template.insertion.format)}</format>\n`;
    }
    maiml += `          </insertion>\n`;
  }
  
  // name（オプション）
  if (template.name) {
    maiml += `          <name>${escapeXml(template.name)}</name>\n`;
  }
  
  // description（オプション）
  if (template.description) {
    maiml += `          <description>${escapeXml(template.description)}</description>\n`;
  }
  
  // property要素群（insertion型を除外して出力）
  if (template.properties && template.properties.length > 0) {
    template.properties
      .filter((prop: Property) => prop.type !== 'insertion')
      .forEach((prop: Property) => {
        maiml += buildPropertyXML(prop, 5);
      });
  }
  
  // placeRef（複数対応）
  placeRefs.forEach((placeRef, index) => {
    const placeRefId = index === 0 
      ? (template.placeRefId || `${templateId}TL`)
      : `${templateId}TL_${index}`;
    maiml += `          <placeRef id="${escapeXml(placeRefId)}" ref="${escapeXml(placeRef)}"/>\n`;
  });
  
  maiml += `        </resultTemplate>\n`;
});
```

**推定時間**: 1時間

---

### Phase 1-4: デバッグログの追加

**目的**: Template出力の動作確認

```typescript
console.log('📋 [convertReactFlowToMaiML] Template出力開始:', {
  materialCount: materialTemplates.length,
  conditionCount: conditionTemplates.length,
  resultCount: resultTemplates.length
});

// materialTemplate出力後
console.log('✅ [convertReactFlowToMaiML] materialTemplate出力完了');

// conditionTemplate出力後
console.log('✅ [convertReactFlowToMaiML] conditionTemplate出力完了');

// resultTemplate出力後
console.log('✅ [convertReactFlowToMaiML] resultTemplate出力完了');
```

**推定時間**: 30分

---

## 📅 実施スケジュール

| Phase | 作業内容 | 推定時間 | 累積時間 |
|-------|---------|---------|---------|
| 1-1 | materialTemplate実装 | 1時間 | 1時間 |
| 1-2 | conditionTemplate実装 | 1時間 | 2時間 |
| 1-3 | resultTemplate実装 | 1時間 | 3時間 |
| 1-4 | デバッグログ追加 | 30分 | 3.5時間 |
| **合計** | | **3.5時間** | |

---

## 🎯 期待される成果

### 修正前（現在: 88点）

```typescript
// materialTemplate要素群の出力は次のメッセージで実装します
maiml += `      </program>\n`;
```

**問題**:
- Template情報が出力されない
- MAIMLファイルが不完全

### 修正後（目標: 95点以上）

```typescript
// materialTemplate要素群
materialTemplates.forEach(node => {
  // 完全な実装（約50行）
});

// conditionTemplate要素群
conditionTemplates.forEach(node => {
  // 完全な実装（約50行）
});

// resultTemplate要素群
resultTemplates.forEach(node => {
  // 完全な実装（約50行）
});

maiml += `      </program>\n`;
```

**改善**:
- ✅ Template情報が完全に出力される
- ✅ MAIMLファイルが完全になる
- ✅ 再読み込み時にTemplate情報が保持される

---

## ✅ 完了基準

### 機能要件

- [ ] materialTemplate要素が正しく出力される
- [ ] conditionTemplate要素が正しく出力される
- [ ] resultTemplate要素が正しく出力される
- [ ] uuid要素が含まれる
- [ ] templateRef要素（継承）が正しく出力される
- [ ] insertion要素が正しく出力される
- [ ] property要素群が正しく出力される（insertion型を除外）
- [ ] placeRef要素が複数対応で出力される

### 品質要件

- [ ] TypeScript型エラーがない
- [ ] Lintエラーがない
- [ ] 既存のテストが全て成功
- [ ] デバッグログが適切に出力される
- [ ] 検証票で95点以上を獲得

---

## 🚨 リスク管理

### 想定されるリスク

| リスク | 発生確率 | 影響度 | 対策 |
|-------|---------|-------|------|
| Template型定義の不一致 | 🟡 中 | 🔴 高 | 事前に型定義を確認 |
| XMLエスケープ漏れ | 🟢 低 | 🟠 中 | escapeXml関数を使用 |
| placeRefs参照エラー | 🟡 中 | 🟠 中 | 空配列時の自動補完を実装 |
| 既存機能への影響 | 🟢 低 | 🔴 高 | 既存テストで確認 |

---

## 📚 参考資料

### 検証票

- [reactFlowToMaiml.ts検証票](../検証票/20260130_0815_reactFlowToMaiml.ts_検証票.md)

### 関連ファイル

- `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts`
- `frontend/src/components/editorv2/types/index.ts` (型定義)

### MaiML仕様

- MAIML Schema (maiml.xsd)
- materialTemplate/conditionTemplate/resultTemplate要素の仕様

---

## 🎓 ベストプラクティス

### DO（推奨）

✅ escapeXml関数を必ず使用する
✅ placeRefsが空の場合は自動補完する
✅ property要素からinsertion型を除外する
✅ uuidが未設定の場合はgenerateUUID()で生成
✅ デバッグログを適切に出力する
✅ 型定義を厳密に守る

### DON'T（非推奨）

❌ XMLを文字列連結する際にエスケープを忘れない
❌ placeRefsのチェックを省略しない
❌ insertion型のpropertyを出力しない
❌ テンプレートIDの重複を許さない
❌ 既存コードを不用意に変更しない

---

## 📝 実施記録

### 作業開始

- **開始日時**: 2026-01-30 09:15
- **担当者**: Cline
- **状態**: ⏳ 準備完了

### 進捗管理

| Phase | 状態 | 開始時刻 | 完了時刻 | 実績時間 | 備考 |
|-------|------|---------|---------|----------|------|
| 1-1 materialTemplate | ⏳ 未着手 | - | - | - | |
| 1-2 conditionTemplate | ⏳ 未着手 | - | - | - | |
| 1-3 resultTemplate | ⏳ 未着手 | - | - | - | |
| 1-4 デバッグログ | ⏳ 未着手 | - | - | - | |

---

**作成日**: 2026-01-30 09:15  
**作成者**: Cline  
**関連ドキュメント**:
- [修正必要ファイル取り込み計画書](../20260130_0930_修正必要ファイル_取り込み計画書.md)
- [reactFlowToMaiml.ts検証票](../検証票/20260130_0815_reactFlowToMaiml.ts_検証票.md)