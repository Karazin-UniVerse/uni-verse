import { Test, TestingModule } from '@nestjs/testing';
import { MoodleClientService } from './moodle-client/moodle.client.service';
import { UserService } from 'src/user/user.service';

describe('MoodleClientService', () => {
  let service: MoodleClientService;

  const mockUserService = {} as Partial<UserService>;

  beforeEach(async () => {
    process.env.MOODLE_BASEURL = 'https://example.com';
    process.env.MOODLE_TIMEOUT = '1000';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoodleClientService,
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<MoodleClientService>(MoodleClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
