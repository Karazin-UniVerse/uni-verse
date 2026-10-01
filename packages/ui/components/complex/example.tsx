import React from 'react';

export interface ExampleComponentProps {
  description?: string;
  title?: string;
}

export const ExampleComponent = ({
  description,
  title = 'Example complex component',
}: ExampleComponentProps): React.JSX.Element => {
  return (
    <div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
};
