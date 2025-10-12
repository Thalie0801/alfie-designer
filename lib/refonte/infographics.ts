export type ChartType = 'bar' | 'pie' | 'line' | 'timeline'; // KPI désactivé pour l'instant

export type ChartSpec = {
  type: ChartType;
  title?: string;
  subtitle?: string;
  labels?: string[];
  values?: number[];
  series?: { name: string; values: number[] }[];
  events?: { label: string; date: string }[];
  note?: string;
};

export function clampCharts(
  charts?: ChartSpec[],
  allowed: ChartType[] = ['bar', 'pie', 'line', 'timeline'], // KPI retiré
  max = 1
) {
  if (!Array.isArray(charts)) return [] as ChartSpec[];
  const list = charts.filter((chart) => allowed.includes(chart.type)).slice(0, max);
  for (const chart of list) {
    chart.title = chart.title?.slice(0, 64);
    chart.subtitle = chart.subtitle?.slice(0, 80);
    if (chart.labels && chart.labels.length > 12) chart.labels = chart.labels.slice(0, 12);
    if (chart.values && chart.values.length > 12) chart.values = chart.values.slice(0, 12);
  }
  return list;
}
