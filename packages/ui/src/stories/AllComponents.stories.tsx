import React, { useState } from 'react';
import type { Meta } from '@storybook/react';

import Button from '../components/una/Button/Button';
import SimpleInput from '../components/una/inputs/TextInput/SimpleInput';
import CheckBox from '../components/una/inputs/CheckBox/CheckBox';
import RadioButton from '../components/una/inputs/RadioButton/RadioButton';
import { FileInput } from '../components/una/inputs/FileInput/FileInput';
import CustomDateTime from '../components/una/inputs/DateTimePicker/CustomDateTime';
import { SimpleForm } from '../components/una/Form/SimpleForm';

const meta: Meta = {
  title: 'Showcase/All Components',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const AllComponents = () => {
  const [text, setText] = useState('');
  const [checked, setChecked] = useState(false);
  const [radio, setRadio] = useState<string | null>('a');
  const [files, setFiles] = useState<File[]>([]);
  const [dt, setDt] = useState<Date | null>(null);

  return (
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
      <section style={{ padding: 20, borderRadius: 8, background: 'var(--bg-surface)' }}>
        <h3>Buttons</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button variant="primary" size="medium" onClick={() => alert('Primary clicked')}>
            Primary
          </Button>
          <Button variant="secondary" size="medium">
            Secondary
          </Button>
          <Button isLink href="#" variant="primary">
            Link
          </Button>
        </div>
      </section>

      <section style={{ padding: 20, borderRadius: 8, background: 'var(--bg-surface)' }}>
        <h3>Inputs</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <SimpleInput
            placeholder="Type something"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <CustomDateTime selected={dt} onChange={setDt} />
        </div>
      </section>

      <section style={{ padding: 20, borderRadius: 8, background: 'var(--bg-surface)' }}>
        <h3>Checks & Radios</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <CheckBox
              variant="primary"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>Checked: {String(checked)}</span>
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <RadioButton
              variant="primary"
              name="group"
              value="a"
              checked={radio === 'a'}
              onChange={(e) => setRadio((e.target as HTMLInputElement).value)}
            />
            <span>Option A</span>
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <RadioButton
              variant="primary"
              name="group"
              value="b"
              checked={radio === 'b'}
              onChange={(e) => setRadio((e.target as HTMLInputElement).value)}
            />
            <span>Option B</span>
          </label>
        </div>
      </section>

      <section style={{ padding: 20, borderRadius: 8, background: 'var(--bg-surface)' }}>
        <h3>File Input</h3>
        <FileInput
          multiple
          files={files}
          onFilesChange={(f) => setFiles(f)}
          label="Upload files"
          hint="Allowed: any file"
          maxFiles={5}
        />
        <div style={{ marginTop: 12 }}>
          <strong>Selected:</strong> {files.length} file(s)
        </div>
      </section>

      <section style={{ padding: 20, borderRadius: 8, background: 'var(--bg-surface)' }}>
        <h3>Form</h3>
        <SimpleForm onData={(data) => alert(JSON.stringify(data))}>
          <div style={{ display: 'grid', gap: 8 }}>
            <SimpleInput name="name" placeholder="Name" />
            <SimpleInput name="email" placeholder="Email" />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="submit" variant="primary">
                Submit
              </Button>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </div>
          </div>
        </SimpleForm>
      </section>
    </div>
  );
};
