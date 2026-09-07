import { AuthModule } from './auth.module';

describe('AuthModule', () => {
  it('should be defined and instantiable', () => {
    const module = new AuthModule();

    expect(module).toBeDefined();
  });
});
