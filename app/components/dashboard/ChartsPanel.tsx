'use client';

import CollapsibleSection from './CollapsibleSection';
import CreditsLineChart from '@/components/charts/CreditsLineChart';
import TokensBarChart from '@/components/charts/TokensBarChart';
import ModelPieChart from '@/components/charts/ModelPieChart';
import UsageHeatmap from '@/components/charts/UsageHeatmap';
import PerformanceScatter from '@/components/charts/PerformanceScatter';
import './ChartsPanel.css';
import { UsageRecord } from '@/types';

interface ChartsPanelProps {
  data: UsageRecord[];
  activeModels: string[];
  useRateCredits: boolean;
}

export default function ChartsPanel({ data, activeModels, useRateCredits }: ChartsPanelProps) {
  return (
    <div className="chart-sections">
      <CollapsibleSection title="Credits Over Time">
        <CreditsLineChart data={data} models={activeModels} useRateCredits={useRateCredits} />
      </CollapsibleSection>

      <CollapsibleSection title="Token Breakdown">
        <TokensBarChart data={data} models={activeModels} />
      </CollapsibleSection>

      <CollapsibleSection title="Model Distribution & Usage Heatmap" innerClassName="small-charts-grid">
        <ModelPieChart data={data} models={activeModels} useRateCredits={useRateCredits} />
        <UsageHeatmap data={data} />
      </CollapsibleSection>

      <CollapsibleSection title="Performance Analysis">
        <PerformanceScatter data={data} models={activeModels} />
      </CollapsibleSection>
    </div>
  );
}
