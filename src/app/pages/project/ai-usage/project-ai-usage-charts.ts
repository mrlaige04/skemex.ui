import type { ChartData } from 'chart.js';
import type {
  AiUsageDailyPointDto,
  AiUsageNamedCountDto,
} from '../../../models/ai-usage/ai-usage.models';
import { DASH_CHART, emptyChartData } from '../../tenant/dashboard/dashboard-charts';

export function tokensTrendLineData(daily: AiUsageDailyPointDto[]): ChartData<'line'> {
  if (daily.length === 0) {
    return emptyChartData('line') as ChartData<'line'>;
  }

  return {
    labels: daily.map((point) => formatShortDate(point.date)),
    datasets: [
      {
        label: 'Tokens',
        data: daily.map((point) => point.totalTokens),
        borderColor: DASH_CHART.accent,
        backgroundColor: 'rgb(226 59 45 / 12%)',
        fill: true,
        tension: 0.35,
      },
      {
        label: 'Operations',
        data: daily.map((point) => point.operations),
        borderColor: DASH_CHART.signalDeep,
        backgroundColor: 'transparent',
        yAxisID: 'y1',
        tension: 0.35,
      },
    ],
  };
}

export function operationTypeDoughnutData(items: AiUsageNamedCountDto[]): ChartData<'doughnut'> {
  if (items.length === 0) {
    return emptyChartData('doughnut') as ChartData<'doughnut'>;
  }

  return {
    labels: items.map((item) => humanize(item.name)),
    datasets: [
      {
        data: items.map((item) => item.count),
        backgroundColor: DASH_CHART.series.slice(0, items.length),
        borderWidth: 0,
      },
    ],
  };
}

export function operationNameBarData(items: AiUsageNamedCountDto[]): ChartData<'bar'> {
  if (items.length === 0) {
    return emptyChartData('bar') as ChartData<'bar'>;
  }

  const top = items.slice(0, 8);
  return {
    labels: top.map((item) => humanize(item.name)),
    datasets: [
      {
        label: 'Operations',
        data: top.map((item) => item.count),
        backgroundColor: DASH_CHART.accent,
        borderRadius: 2,
        barThickness: 14,
      },
    ],
  };
}

export function modelTokensBarData(items: AiUsageNamedCountDto[]): ChartData<'bar'> {
  if (items.length === 0) {
    return emptyChartData('bar') as ChartData<'bar'>;
  }

  const top = items.slice(0, 8);
  return {
    labels: top.map((item) => item.name),
    datasets: [
      {
        label: 'Tokens',
        data: top.map((item) => item.totalTokens),
        backgroundColor: DASH_CHART.ink,
        borderRadius: 2,
      },
    ],
  };
}

export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return Math.round(value).toLocaleString();
}

export function formatLatency(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0 ms';
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)} s`;
  }
  return `${Math.round(ms)} ms`;
}

export function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}
