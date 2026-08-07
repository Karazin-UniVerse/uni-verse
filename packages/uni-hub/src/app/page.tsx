'use client';
import {
  Button,
  CheckBox,
  FileInput,
  RadioButton,
  TextInput,
  SimpleDateTime,
  SimpleForm,
} from '@universe/ui';
export default function Home() {
  return (
    <div className={'mx-auto'}>
      <h1 className={'text-2xl font-bold text-center'}>Home</h1>
      <SimpleForm className={'mx-auto mt-16 '}>
        <label htmlFor="text" className={'flex flex-col items-center gap-2'}>
          <span>Text</span>
          <TextInput placeholder="Enter text" />
        </label>{' '}
        <label htmlFor="checkbox" className={'flex items-center gap-2'}>
          <span>Checkbox</span>
          <CheckBox variant={'primary'} />
        </label>
        <label htmlFor="" className={'flex flex-col items-center gap-2'}>
          <span>DateTime</span>
          <SimpleDateTime />
        </label>
        <label className={'flex items-center gap-2'}>
          <span>Radio</span>
          <RadioButton variant={'primary'} />
        </label>
        <label htmlFor="" className={'flex flex-col items-center gap-2'}>
          <span>File</span>
          <FileInput />
        </label>{' '}
        <Button variant={'primary'} size={'medium'}>
          {'Deploy Now'}
        </Button>
      </SimpleForm>
    </div>
  );
}
