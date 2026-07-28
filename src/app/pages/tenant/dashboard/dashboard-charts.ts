import type { ChartConfiguration, ChartData } from 'chart.js';

/** Skemex product palette for Chart.js (matches auth/landing tokens). */
export const DASH_CHART = {
  accent: '#e23b2d',
  accentSoft: '#ff6b4a',
  signal: '#c8f04d',
  signalDeep: '#9bc22e',
  ink: '#0c1219',
  muted: '#5a6573',
  line: '#c5ced8',
  paper: '#f4f7fa',
  track: 'rgb(12 18 25 / 8%)',
  series: ['#e23b2d', '#0c1219', '#c8f04d', '#5a6573', '#ff6b4a', '#3d4a5c', '#9bc22e', '#8a96a5'],
} as const;

const fontFamily = "'Outfit', ui-sans-serif, system-ui, sans-serif";

const legendLabels = {
  boxWidth: 10,
  boxHeight: 10,
  borderRadius: 2,
  useBorderRadius: true,
  padding: 14,
  color: DASH_CHART.muted,
  font: { family: fontFamily, size: 11, weight: 500 as const },
};

const tooltip = {
  backgroundColor: DASH_CHART.ink,
  titleColor: '#fff',
  bodyColor: 'rgb(255 255 255 / 85%)',
  cornerRadius: 2,
  padding: 10,
  titleFont: { family: fontFamily, size: 12, weight: 600 as const },
  bodyFont: { family: fontFamily, size: 11 },
};

export function emptyChartData(kind: 'doughnut' | 'bar' | 'line'): ChartData {
  if (kind === 'line' || kind === 'bar') {
    return { labels: [], datasets: [{ data: [], label: '' }] };
  }
  return { labels: [], datasets: [{ data: [] }] };
}

export const doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: {
      position: 'right',
      labels: legendLabels,
    },
    tooltip,
  },
};

export const barOptions: ChartConfiguration<'bar'>['options'] = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: { display: false },
    tooltip,
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        color: DASH_CHART.muted,
        font: { family: fontFamily, size: 11 },
      },
      grid: { color: DASH_CHART.track },
      border: { display: false },
    },
    y: {
      ticks: {
        color: DASH_CHART.ink,
        font: { family: fontFamily, size: 11, weight: 500 },
      },
      grid: { display: false },
      border: { display: false },
    },
  },
};

/** Vertical comparison bars for AI decomposition funnel. */
export const verticalBarOptions: ChartConfiguration<'bar'>['options'] = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip,
  },
  scales: {
    x: {
      ticks: {
        color: DASH_CHART.ink,
        font: { family: fontFamily, size: 11, weight: 500 },
      },
      grid: { display: false },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        color: DASH_CHART.muted,
        font: { family: fontFamily, size: 11 },
      },
      grid: { color: DASH_CHART.track },
      border: { display: false },
    },
  },
};

export const lineOptions: ChartConfiguration<'line'>['options'] = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: legendLabels,
    },
    tooltip,
  },
  scales: {
    x: {
      ticks: {
        color: DASH_CHART.muted,
        font: { family: fontFamily, size: 11 },
        maxRotation: 0,
      },
      grid: { display: false },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        color: DASH_CHART.muted,
        font: { family: fontFamily, size: 11 },
      },
      grid: { color: DASH_CHART.track },
      border: { display: false },
    },
  },
  elements: {
    line: {
      tension: 0.35,
      borderWidth: 2.5,
      fill: false,
    },
    point: {
      radius: 3,
      hoverRadius: 5,
      borderColor: '#fff',
      borderWidth: 2,
    },
  },
};

export function statusDoughnutData(labels: string[], values: number[]): ChartData<'doughnut'> {
  return {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: labels.map((_, i) => DASH_CHART.series[i % DASH_CHART.series.length]),
        borderColor: DASH_CHART.paper,
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };
}

export function projectBarData(labels: string[], values: number[]): ChartData<'bar'> {
  return {
    labels,
    datasets: [
      {
        data: values,
        label: 'Tasks',
        backgroundColor: DASH_CHART.signal,
        hoverBackgroundColor: DASH_CHART.signalDeep,
        borderRadius: 2,
        borderSkipped: false,
        barThickness: 14,
      },
    ],
  };
}

export function ownershipDoughnutData(
  assigned: number,
  unassigned: number,
  done: number,
): ChartData<'doughnut'> {
  return {
    labels: ['Assigned (open)', 'Unassigned (open)', 'Done'],
    datasets: [
      {
        data: [assigned, unassigned, done],
        backgroundColor: [DASH_CHART.ink, DASH_CHART.accent, DASH_CHART.signal],
        borderColor: DASH_CHART.paper,
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };
}

/** Goals queued → goals split → subtasks produced (AI decomposition funnel). */
export function decompositionBarData(
  queued: number,
  split: number,
  produced: number,
): ChartData<'bar'> {
  return {
    labels: ['Goals queued', 'Goals split', 'Subtasks produced'],
    datasets: [
      {
        data: [queued, split, produced],
        backgroundColor: [DASH_CHART.ink, DASH_CHART.accent, DASH_CHART.signal],
        hoverBackgroundColor: [DASH_CHART.muted, DASH_CHART.accentSoft, DASH_CHART.signalDeep],
        borderRadius: 2,
        borderSkipped: false,
        barThickness: 36,
      },
    ],
  };
}

export function splitProgressDoughnutData(awaiting: number, split: number): ChartData<'doughnut'> {
  return {
    labels: ['Awaiting split', 'Split complete'],
    datasets: [
      {
        data: [awaiting, split],
        backgroundColor: [DASH_CHART.line, DASH_CHART.accent],
        borderColor: DASH_CHART.paper,
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };
}

export function createdLineData(labels: string[], values: number[]): ChartData<'line'> {
  return {
    labels,
    datasets: [
      {
        data: values,
        label: 'Tasks created',
        borderColor: DASH_CHART.accent,
        backgroundColor: 'rgb(226 59 45 / 12%)',
        pointBackgroundColor: DASH_CHART.accent,
        fill: true,
      },
    ],
  };
}

/** Weekly: goals queued (roots) vs subtasks produced (children). */
export function decompositionTrendLineData(
  labels: string[],
  queued: number[],
  produced: number[],
): ChartData<'line'> {
  return {
    labels,
    datasets: [
      {
        data: queued,
        label: 'Goals queued',
        borderColor: DASH_CHART.ink,
        backgroundColor: DASH_CHART.ink,
        pointBackgroundColor: DASH_CHART.ink,
        fill: false,
      },
      {
        data: produced,
        label: 'Subtasks produced',
        borderColor: DASH_CHART.accent,
        backgroundColor: DASH_CHART.accent,
        pointBackgroundColor: DASH_CHART.accent,
        fill: false,
      },
    ],
  };
}

export interface DecompositionStats {
  goalsQueued: number;
  goalsSplit: number;
  goalsAwaiting: number;
  subtasksProduced: number;
  avgSubtasksPerSplit: number;
}

export function computeDecompositionStats(rootTasks: ProjectTaskLike[]): DecompositionStats {
  let goalsQueued = 0;
  let goalsSplit = 0;
  let goalsAwaiting = 0;
  let subtasksProduced = 0;

  for (const root of rootTasks) {
    if (root.parentId) {
      continue;
    }
    goalsQueued += 1;
    const produced = countDescendants(root);
    if (produced > 0) {
      goalsSplit += 1;
      subtasksProduced += produced;
    } else {
      goalsAwaiting += 1;
    }
  }

  return {
    goalsQueued,
    goalsSplit,
    goalsAwaiting,
    subtasksProduced,
    avgSubtasksPerSplit:
      goalsSplit > 0 ? Math.round((subtasksProduced / goalsSplit) * 10) / 10 : 0,
  };
}

export interface ProjectTaskLike {
  parentId?: string | null;
  createdAt?: string;
  subtasks?: ProjectTaskLike[] | null;
}

export function collectRootCreatedAts(roots: ProjectTaskLike[]): Array<string | undefined> {
  return roots.filter((t) => !t.parentId).map((t) => t.createdAt);
}

export function collectDescendantCreatedAts(roots: ProjectTaskLike[]): Array<string | undefined> {
  const out: Array<string | undefined> = [];
  const walk = (nodes: ProjectTaskLike[] | null | undefined): void => {
    for (const node of nodes ?? []) {
      out.push(node.createdAt);
      walk(node.subtasks);
    }
  };
  for (const root of roots) {
    if (root.parentId) {
      continue;
    }
    walk(root.subtasks);
  }
  return out;
}

function countDescendants(task: ProjectTaskLike): number {
  const kids = task.subtasks ?? [];
  return kids.reduce((n, child) => n + 1 + countDescendants(child), 0);
}

/** Last `weeks` ISO week buckets ending this week. */
export function buildWeeklyCreatedSeries(
  createdAts: Array<string | undefined>,
  weeks = 8,
): { labels: string[]; values: number[] } {
  const now = new Date();
  const buckets: { key: string; label: string; start: Date }[] = [];

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = startOfWeek(addDays(now, -i * 7));
    const key = start.toISOString().slice(0, 10);
    const label = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    buckets.push({ key, label, start });
  }

  const counts = new Map(buckets.map((b) => [b.key, 0]));

  for (const raw of createdAts) {
    if (!raw) {
      continue;
    }
    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) {
      continue;
    }
    const key = startOfWeek(d).toISOString().slice(0, 10);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return {
    labels: buckets.map((b) => b.label),
    values: buckets.map((b) => counts.get(b.key) ?? 0),
  };
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
