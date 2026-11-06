import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '@universe/core/constants/auth';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
