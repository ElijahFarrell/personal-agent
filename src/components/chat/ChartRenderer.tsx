'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'

export interface ChartSpec {
  type: 'bar' | 'line' | 'area' | 'pie'
  title: string
  description?: string
  xAxisKey?: string
  series: string[]
  data: Record<string, string | number>[]
  config: Record<string, { label: string; color: string }>
}

interface ChartRendererProps {
  spec: ChartSpec
}

const CHART_FALLBACK = (i: number) => `var(--chart-${(i % 5) + 1})` as const

/** Normalize colors so invalid LLM/tool output does not resolve to black bars. */
function toChartConfig(config: ChartSpec['config']): ChartConfig {
  const entries = Object.entries(config)
  const result: ChartConfig = {}
  entries.forEach(([key, value], i) => {
    const raw = value.color?.trim() ?? ''
    const validVar = /^var\(--chart-[1-5]\)$/i.test(raw)
    const literal =
      /^#[\da-f]{3,8}$/i.test(raw) ||
      /^(hsl|hsla|rgb|rgba|oklch)\(/i.test(raw)
    const color = validVar || literal ? raw : CHART_FALLBACK(i)
    result[key] = { label: value.label, color }
  })
  return result
}

function BarChartView({ spec, chartConfig }: { spec: ChartSpec; chartConfig: ChartConfig }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
      <BarChart data={spec.data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        {spec.xAxisKey && (
          <XAxis
            dataKey={spec.xAxisKey}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => typeof value === 'string' && value.length > 12 ? value.slice(0, 10) + '…' : value}
          />
        )}
        <YAxis tickLine={false} axisLine={false} width={50} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {spec.series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {spec.series.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

function LineChartView({ spec, chartConfig }: { spec: ChartSpec; chartConfig: ChartConfig }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
      <LineChart data={spec.data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        {spec.xAxisKey && (
          <XAxis
            dataKey={spec.xAxisKey}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => typeof value === 'string' && value.length > 12 ? value.slice(0, 10) + '…' : value}
          />
        )}
        <YAxis tickLine={false} axisLine={false} width={50} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {spec.series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {spec.series.map((key) => (
          <Line
            key={key}
            dataKey={key}
            type="monotone"
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}

function AreaChartView({ spec, chartConfig }: { spec: ChartSpec; chartConfig: ChartConfig }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
      <AreaChart data={spec.data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        {spec.xAxisKey && (
          <XAxis
            dataKey={spec.xAxisKey}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => typeof value === 'string' && value.length > 12 ? value.slice(0, 10) + '…' : value}
          />
        )}
        <YAxis tickLine={false} axisLine={false} width={50} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {spec.series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {spec.series.map((key) => (
          <Area
            key={key}
            dataKey={key}
            type="monotone"
            fill={`var(--color-${key})`}
            fillOpacity={0.3}
            stroke={`var(--color-${key})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  )
}

function PieChartView({ spec, chartConfig }: { spec: ChartSpec; chartConfig: ChartConfig }) {
  const dataKey = spec.series[0]
  const nameKey = spec.xAxisKey ?? 'name'

  const pieData = spec.data.map((item, idx) => {
    const name = String(item[nameKey])
    const fromName = chartConfig[name]
    const fromDataKey = chartConfig[String(item[dataKey])]
    const entry = fromName ?? fromDataKey
    const fill =
      entry && 'color' in entry && entry.color
        ? entry.color
        : CHART_FALLBACK(idx)
    return { ...item, fill }
  })

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={pieData}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          strokeWidth={2}
        />
        <ChartLegend content={<ChartLegendContent nameKey={nameKey} />} />
      </PieChart>
    </ChartContainer>
  )
}

export function ChartRenderer({ spec }: ChartRendererProps) {
  const chartConfig = toChartConfig(spec.config)

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{spec.title}</CardTitle>
        {spec.description && (
          <CardDescription>{spec.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {spec.type === 'bar' && <BarChartView spec={spec} chartConfig={chartConfig} />}
        {spec.type === 'line' && <LineChartView spec={spec} chartConfig={chartConfig} />}
        {spec.type === 'area' && <AreaChartView spec={spec} chartConfig={chartConfig} />}
        {spec.type === 'pie' && <PieChartView spec={spec} chartConfig={chartConfig} />}
      </CardContent>
    </Card>
  )
}
