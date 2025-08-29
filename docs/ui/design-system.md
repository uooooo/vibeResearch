# vibeResearch UI Design System v2

本ドキュメントは、vibeResearchプロダクションレベルUI（v2）の設計哲学、原則、コンポーネント仕様を定義します。

## Design Philosophy

### Core Principles
1. **Flow-First Design**: ユーザーの目標達成への道筋を最優先
2. **Progressive Disclosure**: 複雑な情報を段階的に開示し認知負荷を軽減
3. **Visual Hierarchy**: プライマリ vs セカンダリアクションの明確な区別
4. **Information Density**: 適切な空白とグルーピングによる可読性向上
5. **Professional Polish**: 統一されたデザインシステムによる信頼性構築

### User Experience Goals
- **Clarity**: 次にすべきことが常に自明
- **Confidence**: 操作結果が予測可能
- **Efficiency**: 最短経路での目標達成
- **Delight**: 美しく快適なインタラクション

## Page-Level Design Patterns

### Theme Exploration Page
**状態遷移型デザイン**: Input → Searching → Analyzing → Results → Selected

#### State Management
```typescript
type ThemePhase = "input" | "searching" | "analyzing" | "results" | "selected";
```

#### Layout Composition
- **Input Station**: 集中入力フォーム（Card Elevated）
- **Progress Theater**: ビジュアル進行表示（ProgressSteps + Logs）
- **Candidate Comparison**: 視覚的候補比較（Interactive Cards）
- **Action Center**: 次ステップ導線（Prominent CTA）

#### Flow Design
```
[Input Domain/Keywords] → [Generate Candidates] 
    ↓ (Progress feedback)
[Compare Candidates] → [Select One] 
    ↓ (Confirmation)
[Continue to Plan] → /plan
```

### Plan Management Page
**3タブ構成**: Editor | Workflow | History

#### Editor Tab（3パネルレイアウト）
- **Left Panel (300px)**: Section Navigation
  - 完了状態表示（○ 完了、! エラー、· 未完了）
  - セクションごとの説明文
  - 現在編集中セクションのハイライト

- **Center Panel (Flex)**: Focused Section Editor
  - 1セクション集中編集
  - Title: 大型入力フィールド
  - Others: 縦長テキストエリア
  - バリデーションエラー表示

- **Right Panel (280px)**: Context & Actions
  - セクション別ガイダンス
  - クイックアクション（Save, Export）
  - ステータス表示（Success/Error）

#### Workflow Tab（3パネルレイアウト）
- **Left Panel**: Generation Control
- **Center Panel**: Draft Preview（読み取り専用）
- **Right Panel**: Process Monitor（Logs + Diff）

#### History Tab（フルワイド）
- **Timeline View**: 時系列バージョン表示
- **Action Buttons**: Restore, Compare

## Component System

### Cards
```typescript
type CardVariant = "default" | "elevated" | "outline";
type CardSize = "sm" | "md" | "lg";
```

**使い分けルール**:
- `elevated`: 重要なアクション・フォーム
- `default`: 一般的な情報表示
- `outline`: 補助情報・軽いインタラクション

### Buttons
```typescript
type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "xs" | "sm" | "md" | "lg";
```

**ヒエラルキー設計**:
- `ActionButton + primary`: ページ主要アクション（1個まで）
- `Button + primary`: セクション主要アクション
- `Button + secondary`: サポートアクション
- `Button + ghost`: 軽いアクション（Navigation等）

### Progress Indicators
- **ProgressSteps**: 段階的プロセス表示
- **ProgressBar**: 連続的進行表示

### Visual Language

#### Color Palette
- **Primary Action**: White/15-20% opacity（目立たせ）
- **Secondary Action**: Transparent → White/10% hover
- **Success State**: Green 500/20-30%
- **Error State**: Red 500/20-30%
- **Info State**: Blue variants

#### Typography Hierarchy
- **Page Title**: 3xl, font-bold
- **Card Title**: lg, font-semibold
- **Section Label**: sm, font-medium
- **Body Text**: sm, regular
- **Helper Text**: xs, opacity reduced

#### Spacing Scale
- **Component Padding**: Card sm(12px), md(16px), lg(24px)
- **Layout Gaps**: Small(12px), Medium(24px), Large(32px)
- **Page Margins**: max-width containers with auto margins

#### Border & Shadows
- **Default Border**: border-white/15
- **Hover Border**: border-white/25
- **Active Border**: border-white/40
- **Elevated Shadow**: subtle shadow-lg for important cards

## Responsive Behavior

### Breakpoints
- **Desktop**: 1024px+ (full 3-panel layouts)
- **Tablet**: 768px-1023px (2-panel, collapsible sidebar)
- **Mobile**: <768px (stacked, single column)

### Adaptive Layout
- **Theme Page**: Input → Results stack vertically on mobile
- **Plan Editor**: Collapsible section nav, full-width editor
- **All Tabs**: Tab list remains horizontal with scroll

## Implementation Guidelines

### Component Organization
```
src/ui/components/ui/
├── Button.tsx (variants, loading states)
├── Card.tsx (layouts, variants)
├── ProgressBar.tsx (steps, bars)
├── Tabs.tsx (navigation)
└── ...
```

### State Management Patterns
- **Local State**: Form data, UI states
- **Context**: Project, Session
- **Server State**: Plans, History (via API)

### Performance Considerations
- **Lazy Load**: Heavy components in non-active tabs
- **Debounce**: Input validation, auto-save
- **Optimize**: Large lists with virtualization if needed

## Future Enhancements

### Planned Features
- **Evidence Panel**: RAG/Scholarly integration (right panel)
- **Dark/Light Mode**: System preference respect
- **Advanced Export**: PDF, LaTeX support
- **Collaboration**: Real-time editing indicators

### Extensibility Points
- **Card variants**: Add branded, warning types
- **Button actions**: Expand ActionButton types
- **Layout grid**: 4-panel support for evidence
- **Animation**: Add micro-interactions

## Usage Examples

### Theme Page Implementation
```typescript
// Phase-driven content switching
{phase === "input" && inputStation}
{phase === "searching" && progressTheater}
{phase === "results" && candidateComparison}

// Clear action hierarchy
<ActionButton action="primary" size="lg">
  Generate Theme Candidates
</ActionButton>
```

### Plan Page Implementation
```typescript
// 3-panel Editor layout
<div className="grid grid-cols-[300px_minmax(0,1fr)_280px] gap-6">
  {sectionNavigation}
  {sectionEditor}
  {contextPanel}
</div>

// Section-focused editing
const currentValue = plan[currentSection];
const currentError = fieldErrors[currentSection];
```

---

## Validation Checklist

✅ **Visual Hierarchy**: Primary actions stand out clearly  
✅ **Flow Guidance**: Next steps are obvious to users  
✅ **Information Density**: Balanced whitespace and content  
✅ **Professional Polish**: Consistent design language  
✅ **Responsive Design**: Works on all device sizes  
✅ **Accessibility**: Focus states, ARIA labels  
✅ **Performance**: No layout shifts, smooth interactions  

This design system ensures vibeResearch delivers a professional, efficient, and delightful user experience for research workflow management.