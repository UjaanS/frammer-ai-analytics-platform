export function ChartLegend({
  items
}: {
  items: { label: string; value?: string | number; color: string }[];
}) {
  return (
    <div className="flex flex-col justify-center gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            {item.label}
          </span>
          {item.value !== undefined ? <span className="font-medium">{item.value}</span> : null}
        </div>
      ))}
    </div>
  );
}
