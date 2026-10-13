import type { ReactNode } from 'react';
import css from './VariantMatrix.module.scss';

export type VariantRowProps<Column extends string> = {
  columns: readonly Column[];
  renderCell: (column: Column) => ReactNode;
};

export function VariantRow<Column extends string>({
  columns,
  renderCell,
}: Readonly<VariantRowProps<Column>>) {
  return (
    <table className={css.matrix}>
      <thead>
        <tr>
          {columns.map((column: Column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {columns.map((column: Column) => (
            <td key={column}>{renderCell(column)}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
