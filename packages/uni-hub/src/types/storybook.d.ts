declare module '@storybook/react' {
  import type { ComponentType, ReactNode } from 'react';

  export type Meta<T = any> = {
    title?: string;
    component?: T;
    tags?: string[];
    decorators?: Array<(Story: ComponentType) => ReactNode>;
    [key: string]: any;
  };

  export type StoryObj<T = any> = {
    render?: (args: any) => ReactNode;
    args?: Record<string, any>;
    [key: string]: any;
  };
}
