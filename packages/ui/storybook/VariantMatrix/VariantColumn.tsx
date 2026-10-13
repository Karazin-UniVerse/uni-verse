import type { ReactNode } from 'react';
import css from './VariantMatrix.module.scss';

export type VariantColumnProps<Row extends string> = {
  rows: readonly Row[];
  renderCell: (row: Row) => ReactNode;
};

export function VariantColumn<Row extends string>({
  rows,
  renderCell,
}: Readonly<VariantColumnProps<Row>>) {
  return (
    <table className={css.matrix}>
      <tbody>
        {rows.map((row: Row) => (
          <tr key={row}>
            <th scope="row">{row}</th>
            <td>{renderCell(row)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
