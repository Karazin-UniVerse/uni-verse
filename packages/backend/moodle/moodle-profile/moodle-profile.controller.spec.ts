import { Test, TestingModule } from '@nestjs/testing';
import { MoodleProfileController } from './moodle-profile.controller';
import { MoodleProfileService } from './moodle-profile.service';
import { StudentProfileDto } from './moodle-profile-dto';

describe('MoodleProfileController', () => {
  let controller: MoodleProfileController;
  let mockProfileService: { getProfile: jest.Mock };

  const mockProfile: StudentProfileDto = {
    id: 'moodle-4021',
    moodleId: 4021,
    fullName: 'Барсуков Родіон Сергійович',
    email: 'rodion.barsukov@karazin.ua',
    avatarUrl: 'https://moodle.universemvp.tech/user/pix.php/4021/f1.jpg',
    studentCardNumber: 'KB-10293847',
    recordBookNumber: 'ЗК-2024-042',
    faculty: 'ННІ Компʼютерних наук та штучного інтелекту',
    department: 'Кафедра математичного моделювання та аналізу даних',
    specialty: '122 Компʼютерні науки',
    educationalProgram: 'Компʼютерні науки та інтелектуальні системи',
    degree: 'bachelor',
    course: 3,
    group: 'КС12',
    studyForm: 'full-time',
    financing: 'budget',
    status: 'active',
    gpa: 92.4,
    totalCreditsEarned: 120,
    academicStanding: 'honors',
  };

  beforeEach(async () => {
    mockProfileService = {
      getProfile: jest.fn().mockResolvedValue(mockProfile),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoodleProfileController],
      providers: [
        {
          provide: MoodleProfileService,
          useValue: mockProfileService,
        },
      ],
    }).compile();

    controller = module.get<MoodleProfileController>(MoodleProfileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return profile from service', async () => {
    const res = await controller.getProfile(
      'token-123',
      '4021',
      'student@karazin.ua',
    );

    expect(mockProfileService.getProfile).toHaveBeenCalledWith(
      'token-123',
      '4021',
      'student@karazin.ua',
    );
    expect(res).toEqual(mockProfile);
  });

  it('should return profile from service when email is omitted', async () => {
    const res = await controller.getProfile('token-123', '4021');

    expect(mockProfileService.getProfile).toHaveBeenCalledWith(
      'token-123',
      '4021',
      undefined,
    );
    expect(res).toEqual(mockProfile);
  });
});
