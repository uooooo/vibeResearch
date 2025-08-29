# vibeResearch Development Guidelines

本ドキュメントは、vibeResearchプロジェクトにおける開発ベストプラクティス、アーキテクチャ原則、よくある落とし穴の回避策をまとめたものです。

## Core Architecture Principles

### 1. Single Source of Truth (SSOT)

**原則**: データは一箇所で生成し、一箇所から配信する

```typescript
// ✅ Good: 集中データ生成
async function generateCompletePlan(theme: ThemeCandidate): Promise<Plan> {
  return {
    title: theme.title,
    background: await generateBackground(theme),    // 同時生成
    rq: generateResearchQuestion(theme),           // 同時生成  
    hypothesis: generateHypothesis(theme),         // 同時生成
    // ... all fields generated together
  };
}

// ❌ Bad: 分散データ生成
const basicPlan = generateBasicPlan(theme);      // 基本データ
// ... somewhere else ...
const background = loadBackgroundLater(theme);   // 追加データ (永続化漏れリスク)
```

### 2. Type-Driven Development

**原則**: TypeScript型定義がビジネスロジックを制約・保証する

```typescript
// ✅ Good: 必須フィールドを型で強制
type Plan = {
  title: string;
  background: string;    // Required - 生成忘れを防ぐ
  rq: string;
  // ...
};

// ❌ Bad: オプショナル頼りの設計
type Plan = {
  title: string;
  background?: string;   // Optional - 生成忘れが起きやすい
  rq: string;
  // ...
};
```

### 3. Atomic Operations

**原則**: 関連するデータ操作は分割不可能な単位で実行

```typescript
// ✅ Good: 関連データの原子的処理
async function saveResearchPlan(theme: ThemeCandidate, projectId: string) {
  const transaction = await db.transaction();
  try {
    const plan = await generateCompletePlan(theme);        // 全フィールド生成
    const planId = await transaction.plans.insert(plan);   // 一括保存
    await transaction.results.insert({                     // 関連データも同時保存
      project_id: projectId,
      type: 'plan',
      meta_json: plan
    });
    await transaction.commit();
    return planId;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// ❌ Bad: 分割可能な操作
const plan = await generateBasicPlan(theme);
await savePlan(plan);                    // 基本保存
// ... later/elsewhere ...
await updatePlanBackground(background);  // 追加保存 (失敗リスク)
```

## Data Flow Patterns

### Client-Server Boundary Management

```typescript
// ✅ Good: Server-side data authority
// Server generates complete data
export async function POST(req: Request) {
  const theme = await validateThemeSelection(req);
  const completePlan = await generateCompletePlan(theme);  // Server authority
  await persistPlan(completePlan);
  return Response.json({ plan: completePlan });
}

// Client consumes server data
function PlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  
  useEffect(() => {
    loadPlanFromServer().then(setPlan);  // Server as source of truth
  }, []);
}

// ❌ Bad: Split authority
// Server generates partial data
const basicPlan = await generateBasicPlan(theme);
await persistBasicPlan(basicPlan);

// Client generates additional data
function PlanPage() {
  const [plan, setPlan] = useState(basicPlan);
  
  useEffect(() => {
    // Client-side data generation (consistency risk)
    generateBackground(theme).then(bg => 
      setPlan(prev => ({ ...prev, background: bg }))
    );
  }, []);
}
```

### State Management Consistency

```typescript
// ✅ Good: Unified state updates  
const [plan, setPlan] = useState<Plan>(() => getInitialPlan());

function updatePlan(updates: Partial<Plan>) {
  setPlan(current => ({ ...current, ...updates }));
  persistPlanChanges({ ...plan, ...updates });  // State + persistence
}

// ❌ Bad: Inconsistent state/persistence
const [plan, setPlan] = useState<Plan>(() => getInitialPlan());

function updatePlanTitle(title: string) {
  setPlan(prev => ({ ...prev, title }));  // State updated
  // Missing: persistPlanChanges() - persistence forgotten
}
```

## Common Anti-Patterns

### 1. The "Later Loading" Anti-Pattern

```typescript
// ❌ Problem: Deferred critical data loading
useEffect(() => {
  loadBasicData().then(setData);
}, []);

useEffect(() => {
  // Critical data loaded separately - timing issues
  if (data && shouldLoadExtra) {
    loadCriticalExtraData().then(setCriticalData);
  }
}, [data, shouldLoadExtra]);

// ✅ Solution: Comprehensive initial loading
useEffect(() => {
  async function loadCompleteData() {
    const [basic, extra] = await Promise.all([
      loadBasicData(),
      loadCriticalExtraData()
    ]);
    setData(mergeData(basic, extra));
  }
  loadCompleteData();
}, []);
```

### 2. The "Progressive Field Addition" Anti-Pattern

```typescript
// ❌ Problem: Fields added over time without architectural consideration
type Plan_v1 = { title: string; rq: string };
type Plan_v2 = { title: string; rq: string; hypothesis: string };
type Plan_v3 = { title: string; rq: string; hypothesis: string; background?: string }; // Optional!

// Different generation logic for different versions
function generatePlan_v3(theme: ThemeCandidate): Plan_v3 {
  const basic = generatePlan_v2(theme);  // Old logic
  // background added as afterthought
  if (theme.hasEvidence) {
    basic.background = generateBackground(theme);
  }
  return basic;
}

// ✅ Solution: Architectural evolution with consistency
type Plan = {
  title: string;
  rq: string; 
  hypothesis: string;
  background: string;  // Required from the start
};

function generatePlan(theme: ThemeCandidate): Plan {
  // All fields generated with same architectural pattern
  return {
    title: generateTitle(theme),
    rq: generateRQ(theme),
    hypothesis: generateHypothesis(theme),
    background: generateBackground(theme),  // Same pattern as others
  };
}
```

### 3. The "Implicit Dependency" Anti-Pattern

```typescript
// ❌ Problem: Hidden dependencies between operations
async function savePlan(plan: Plan) {
  await db.plans.insert(plan);
  // Implicit dependency: assumes theme selection was saved elsewhere
  // If theme save failed, plan becomes inconsistent
}

// ✅ Solution: Explicit dependency management
async function saveResearchWorkflow(theme: ThemeCandidate, projectId: string) {
  const transaction = await db.transaction();
  try {
    // Explicit dependency management
    const themeResult = await transaction.results.insert({
      project_id: projectId,
      type: 'themes_selected',
      meta_json: { items: [theme] }
    });
    
    const plan = await generateCompletePlan(theme);
    const planResult = await transaction.plans.insert({
      project_id: projectId,
      content: plan
    });
    
    await transaction.commit();
    return { themeResult, planResult };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

## Feature Addition Checklist

新機能・新フィールド追加時の必須確認項目：

### 📋 Pre-Implementation

- [ ] **Architecture Impact**: 既存のデータフローパターンに適合するか？
- [ ] **Type Consistency**: 全関連型定義に一貫して追加されるか？
- [ ] **Single Source**: データ生成が一箇所に集約されるか？
- [ ] **Atomic Integration**: 既存操作と分割不可能な単位で処理されるか？

### 📋 Implementation

- [ ] **Type Definition**: Server/Client間で一貫した型定義
- [ ] **Generation Logic**: 他フィールドと同じタイミング・場所で生成
- [ ] **Persistence**: 他フィールドと同じ保存フローを使用
- [ ] **Validation**: 型ガードによる整合性確認実装

### 📋 Testing

- [ ] **Happy Path**: 正常系でのデータ生成・保存・取得
- [ ] **Edge Cases**: データ不在・不正値での挙動
- [ ] **Integration**: 既存機能との相互作用
- [ ] **Persistence**: ページリロード後のデータ永続性

### 📋 Documentation

- [ ] **API Documentation**: 新フィールドの説明追加
- [ ] **Migration Notes**: 既存データへの影響説明  
- [ ] **Architecture Decision**: なぜこの方法を選択したかの記録

## Debugging Guidelines

### Data Flow Issues Debugging

問題: "フィールドXが表示されない・保存されない"

**Step 1: Source Identification**
```typescript
// データの生成元を特定
console.log('Generated plan:', generatedPlan);  // 生成時点
console.log('Saved plan:', savedPlan);          // 保存時点  
console.log('Loaded plan:', loadedPlan);        // 取得時点
```

**Step 2: Type Validation**
```typescript
// 型整合性確認
function debugPlanStructure(plan: unknown) {
  console.log('Plan keys:', Object.keys(plan));
  console.log('Missing keys:', expectedKeys.filter(k => !(k in plan)));
  console.log('Type mismatches:', Object.entries(plan)
    .filter(([k, v]) => typeof v !== expectedTypes[k])
  );
}
```

**Step 3: Flow Tracing**
```typescript
// データフロー追跡
const trackedPlan = new Proxy(plan, {
  set(target, prop, value) {
    console.log(`Plan.${prop} set to:`, value, new Error().stack);
    return Reflect.set(target, prop, value);
  }
});
```

## Performance Considerations

### Atomic Operations vs Performance

大量データの場合、原子操作と性能のバランス：

```typescript
// ✅ For critical consistency: Full atomic operations
async function saveCompleteResearchData(data: LargeDataSet) {
  const transaction = await db.transaction();
  try {
    // All critical data in single transaction
    await transaction.plans.insert(data.plan);
    await transaction.evidence.insertMany(data.evidence);
    await transaction.citations.insertMany(data.citations);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// ✅ For non-critical data: Asynchronous consistency
async function saveResearchDataWithOptimization(data: LargeDataSet) {
  // Critical data first (atomic)
  const planId = await saveEssentialData(data.essential);
  
  // Non-critical data after (eventual consistency)
  Promise.all([
    saveSupplementaryData(planId, data.supplementary),
    generateThumbnails(planId, data.images),
    updateSearchIndex(planId, data.searchData)
  ]).catch(error => {
    // Log but don't fail main operation
    console.error('Supplementary data save failed:', error);
  });
  
  return planId;
}
```

## Code Review Guidelines

### Architecture Review Points

コードレビュー時の構造チェックポイント：

1. **データフロー一貫性**
   - 新しいデータが既存パターンに従って処理されているか
   - Single Source of Truth が保たれているか

2. **型安全性**
   - Required vs Optional の使い分けが適切か
   - Server/Client 型定義の一致性

3. **原子性**
   - 関連する操作が適切にグループ化されているか
   - 部分的失敗の可能性がないか

4. **将来拡張性**
   - 似たようなフィールド追加時の影響範囲
   - 既存コードの変更必要性

---

これらのガイドラインに従うことで、今回のような構造的問題を防ぎ、拡張性と保守性の高いコードベースを維持できます。