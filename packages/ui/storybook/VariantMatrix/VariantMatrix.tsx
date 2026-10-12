import type { ReactNode } from 'react';
import css from './VariantMatrix.module.scss';

export type VariantMatrixProps<Row extends string, Column extends string> = {
  rows: readonly Row[];
  columns: readonly Column[];
  renderCell: (row: Row, column: Column) => ReactNode;
};

export function VariantMatrix<Row extends string, Column extends string>({
  rows,
  columns,
  renderCell,
}: VariantMatrixProps<Row, Column>) {
  return (
    <table className={css.matrix}>
      <thead>
        <tr>
          <td />
          {columns.map((column: Column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row: Row) => (
          <tr key={row}>
            <th scope="row">{row}</th>
            {columns.map((column: Column) => (
              <td key={column}>{renderCell(row, column)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
