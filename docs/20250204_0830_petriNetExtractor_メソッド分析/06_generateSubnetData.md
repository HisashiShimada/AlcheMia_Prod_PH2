# メソッド6: generateSubnetData

## 📋 基本情報

- **メソッド名**: `generateSubnetData`
- **公開区分**: 公開（export）
- **優先度**: 🟢 低（型定義問題なし）
- **呼び出し元**: SubNetViewer等

---

## 🔍 現状の型定義

```typescript
export const generateSubnetData = async (
  transitionId: string,
  maimlData: string,
  templateMap: Record<string, TemplateMapEntry>,
  transitionNode: TransitionNode | null = null,
  arcsData: Arc[] | null = null
): Promise<string | null>
```

---

## 💡 分析結果

### 既存の型定義

```typescript
// editorv2/types/index.ts
export interface TransitionNode {
  data?: {
    pnmlId?: string | null;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface Arc {
  id?: string;
  source: string;
  target: string;
  [key: string]: any;
}

export interface TemplateMapEntry {
  // ... （メソッド5参照）
}
```

---

## ✅ 評価結果

### 型定義の状態

✅ **完璧** - すべてのパラメータと戻り値が明確に型定義されている

| 項目 | 評価 | 理由 |
|------|------|------|
| パラメータ型 | ✅ 完璧 | すべて明確に型定義済み |
| 戻り値型 | ✅ 適切 | `Promise<string \| null>`で明確 |
| 型安全性 | ✅ 最高 | Null安全性も考慮 |
| IDEサポート | ✅ 最高 | 完璧な自動補完 |

---

## 📊 使用例

```typescript
// サブネットMAIMLの生成
const transitionId = 'transition-123';
const maimlXml = '<maiml>...</maiml>';
const templateMap = buildTemplateMap(maimlXml);

const subnetMaiml = await generateSubnetData(
  transitionId,
  maimlXml,
  templateMap
);

if (subnetMaiml) {
  console.log('Subnet MAIML generated:', subnetMaiml);
} else {
  console.log('No subnet data found');
}

// TransitionNodeとArcsを指定する場合
const transitionNode: TransitionNode = {
  data: {
    pnmlId: 'pnml-id',
    name: 'Transition Name'
  }
};

const arcs: Arc[] = [
  { source: 'place-1', target: 'transition-123' },
  { source: 'transition-123', target: 'place-2' }
];

const subnetMaiml2 = await generateSubnetData(
  transitionId,
  maimlXml,
  templateMap,
  transitionNode,  // ✅ TransitionNode | null
  arcs             // ✅ Arc[] | null
);
```

---

## 🔄 対応方針

### 推奨事項: 変更不要

現状の型定義は完璧であり、変更の必要はありません。

### 優れている点

1. **非同期処理の型定義**: `Promise<string | null>`で明確
2. **オプショナルパラメータ**: デフォルト値付きで使いやすい
3. **Null安全性**: 戻り値がnullの可能性を考慮
4. **既存型の活用**: TemplateMapEntry, TransitionNode, Arc を活用

---

## ✅ 承認項目

- [ ] 現状の型定義を維持（変更なし）
- [ ] このメソッドは模範的な型定義の例として参照可能