import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type ComparisonRow = {
  capability: string
  shiloh: string
  traditional: string
}

export function ComparisonTable({
  title,
  rows,
  caption,
}: {
  title: string
  caption?: string
  rows: readonly ComparisonRow[]
}) {
  return (
    <div className="glass overflow-hidden rounded-2xl border border-white/10">
      <div className="border-b border-white/10 bg-white/[0.03] px-6 py-4">
        <h3 className="font-display text-lg font-semibold text-white">
          {title}
        </h3>
        {caption ? (
          <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead className="text-white">Capability</TableHead>
            <TableHead className="text-brand-200">Shiloh AI</TableHead>
            <TableHead className="text-muted-foreground">
              Traditional stack
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.capability} className="border-white/10">
              <TableCell className="font-medium text-white/90">
                {row.capability}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.shiloh}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.traditional}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
