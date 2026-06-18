# 繧ｿ繧ｹ繧ｯ險育判譖ｸ: 隧穂ｾ｡蝓ｺ貅悶・繧ｿ繝ｳ霑ｽ蜉・・estedPropertyEditor・・

## 繝｡繧ｿ繝・・繧ｿ
- **菴懈・譌･譎・*: 2026-06-10 14:11
- **繧ｿ繧ｹ繧ｯID**: 隧穂ｾ｡蝓ｺ貅悶・繧ｿ繝ｳ霑ｽ蜉_NestedPropertyEditor
- **蜆ｪ蜈亥ｺｦ**: 荳ｭ
- **謗ｨ螳壼ｷ･謨ｰ**: 1譎る俣

## 繧ｿ繧ｹ繧ｯ讎りｦ・

繝壹ヨ繝ｪ繝阪ャ繝育ｷｨ髮・> 繝・Φ繝励Ξ繝ｼ繝・> UI邱ｨ髮・> Properties/Contents 蜀・・蜷・・繝ｭ繝代ユ繧｣陦後↓縲瑚ｩ穂ｾ｡蝓ｺ貅悶阪・繧ｿ繝ｳ繧定ｿｽ蜉縺励∵款荳九＠縺溘ｉ `UncertaintyCriteriaSelectorModal` 縺碁幕縺上ｈ縺・↓縺吶ｋ縲・

## 逶ｮ逧・→譛溷ｾ・＆繧後ｋ謌先棡
- [ ] `NestedPropertyEditor.tsx` 縺ｮ謫堺ｽ懊・繧ｿ繝ｳ蛻怜・鬆ｭ縺ｫ `+ 隧穂ｾ｡蝓ｺ貅冒 繝懊ち繝ｳ繧定ｿｽ蜉
- [ ] `TemplateEditorDialog.tsx` 縺ｧ `UncertaintyCriteriaSelectorModal` 縺ｮState繝ｻ繝上Φ繝峨Λ繝ｼ繝ｻJSX繧定ｿｽ蜉
- [ ] property / content 縺ｮ荳｡譁ｹ縺ｧ隧穂ｾ｡蝓ｺ貅悶・繧ｿ繝ｳ縺悟虚菴懊☆繧九％縺ｨ

## 螳溯｣・せ繝・ャ繝・

### Phase 1: NestedPropertyEditor.tsx 螟画峩
- [ ] Props 縺ｫ `onOpenCriteriaSelector?: (propertyKey: string, propertyData: PropertyData) => void` 繧定ｿｽ蜉
- [ ] 繝倥ャ繝繝ｼ繝懊ち繝ｳ蛻励・蜈磯ｭ縺ｫ `盗 隧穂ｾ｡蝓ｺ貅冒 繝懊ち繝ｳ繧定ｿｽ蜉
- [ ] 蟄占ｦ∫ｴ縺ｮ蜀榊ｸｰ繝ｬ繝ｳ繝繝ｪ繝ｳ繧ｰ縺ｸ props 繧貞ｼ輔″邯吶＄

### Phase 2: TemplateEditorDialog.tsx 螟画峩
- [ ] `UncertaintyCriteriaSelectorModal` / `TargetProperty` / `AssignPayload` 繧偵う繝ｳ繝昴・繝・
- [ ] `criteriaSelectorOpen` / `criteriaTargetProperty` State 繧定ｿｽ蜉
- [ ] `handleOpenCriteriaSelector` 繝上Φ繝峨Λ繝ｼ繧貞ｮ溯｣・ｼ・ropertyData 竊・TargetProperty 螟画鋤・・
- [ ] Properties 繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ縺ｮ `NestedPropertyEditor` 縺ｫ `onOpenCriteriaSelector` 繧呈ｸ｡縺・
- [ ] Contents 繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ縺ｮ `NestedPropertyEditor` 縺ｫ `onOpenCriteriaSelector` 繧呈ｸ｡縺・
- [ ] `UncertaintyCriteriaSelectorModal` JSX 繧定ｿｽ蜉

## 螟画峩繝輔ぃ繧､繝ｫ
1. `frontend/src/components/editorv2/NestedPropertyEditor.tsx` - Props霑ｽ蜉繝ｻ繝懊ち繝ｳ霑ｽ蜉繝ｻ蜀榊ｸｰ蠑輔″邯吶℃
2. `frontend/src/components/editorv2/TemplateEditorDialog.tsx` - 繝｢繝ｼ繝繝ｫ邨・∩霎ｼ縺ｿ

## 謇ｿ隱崎ｨ倬鹸
- **險育判譖ｸ謠千､ｺ譌･譎・*: 2026-06-10 14:11
