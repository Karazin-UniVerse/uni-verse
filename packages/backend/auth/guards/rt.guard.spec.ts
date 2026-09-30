import { RtGuard } from './rt.guard';

describe('RtGuard', () => {
  it('should be defined and instantiable', () => {
    const guard = new RtGuard();

    expect(guard).toBeDefined();
  });
});
