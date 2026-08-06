import React, { useState } from 'react';
import CustomDateTime from './CustomDateTime';

export default function SimpleDateTime() {
  const [selected, setSelected] = useState<Date | null>(new Date());

  return <CustomDateTime selected={selected} onChange={setSelected} />;
}
