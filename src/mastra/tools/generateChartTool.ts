import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const chartDataPointSchema = z.record(z.union([z.string(), z.number()]))

const chartSeriesSchema = z.object({
  key: z.string().describe('Data key that maps to values in each data point'),
  label: z.string().describe('Human-readable label for this series'),
  color: z
    .string()
    .optional()
    .describe('CSS color variable index 1-5 (maps to var(--chart-N)). Defaults to auto-assigned.'),
})

/**
 * Tool that returns a structured JSON chart spec for the frontend to render.
 * The agent decides what chart to produce; the frontend handles rendering.
 */
export const generateChartTool = createTool({
  id: 'generate-chart',
  description:
    'Generate a chart visualization for quantitative data. Returns a structured JSON spec ' +
    'that the UI renders as an interactive chart. Use when presenting market data, comparisons, ' +
    'trends over time, distributions, or any data that benefits from visual representation.',
  inputSchema: z.object({
    type: z
      .enum(['bar', 'line', 'area', 'pie'])
      .describe('Chart type: bar for comparisons, line/area for trends over time, pie for distributions'),
    title: z.string().describe('Chart title'),
    description: z.string().optional().describe('Short description or subtitle for the chart'),
    xAxisKey: z
      .string()
      .optional()
      .describe('The data key used for the X axis (e.g. "month", "date", "category"). Not needed for pie charts.'),
    series: z
      .array(chartSeriesSchema)
      .min(1)
      .describe('Data series to plot. Each series references a key in the data points.'),
    data: z
      .array(chartDataPointSchema)
      .min(1)
      .describe('Array of data points. Each point is an object with keys matching xAxisKey and series keys.'),
  }),
  execute: async ({ type, title, description, xAxisKey, series, data }) => {
    const config: Record<string, { label: string; color: string }> = {}
    series.forEach((s, i) => {
      const parsed = parseInt(String(s.color ?? '').trim(), 10)
      const index =
        Number.isFinite(parsed) && parsed >= 1 && parsed <= 5
          ? parsed
          : (i % 5) + 1
      config[s.key] = {
        label: s.label,
        color: `var(--chart-${index})`,
      }
    })

    return {
      chartSpec: {
        type,
        title,
        description,
        xAxisKey,
        series: series.map((s) => s.key),
        data,
        config,
      },
    }
  },
})
