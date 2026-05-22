type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow = "Frammer AI Analytics", title, description }: PageHeaderProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <div className="max-w-3xl space-y-2">
        <h2 className="text-2xl font-semibold tracking-normal md:text-3xl">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground md:text-base">{description}</p>
      </div>
    </div>
  );
}
