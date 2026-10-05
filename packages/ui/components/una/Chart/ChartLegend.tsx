import css from './Chart.module.scss';

export function ChartLegend({ items }: Readonly<{ items: { name: string; color: string }[] }>) {
  if (items.length === 0) return null;

  return (
    <div className={css.legend}>
      {items.map((item) => (
        <span key={item.name} className={css.legendItem}>
          <span className={css.legendSwatch} style={{ background: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  );
}
