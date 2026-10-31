import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ApplyOpportunityDto } from './apply-opportunity.dto';

describe('ApplyOpportunityDto alternative contact', () => {
  it.each([undefined, '', '   ', '@student_dev', '+380671234567'])(
    'should accept an optional contact %s',
    (contactInfo) => {
      const dto = plainToInstance(ApplyOpportunityDto, {
        applicantName: 'Student',
        contactInfo,
        motivation: 'I would like to participate.',
      });

      expect(validateSync(dto)).toEqual([]);
    },
  );

  it.each([null, 123, 'not-a-contact', 'student@example.com'])(
    'should reject an invalid supplied contact %s',
    (contactInfo) => {
      const dto = plainToInstance(ApplyOpportunityDto, {
        applicantName: 'Student',
        contactInfo,
      });

      expect(validateSync(dto)).toEqual([
        expect.objectContaining({ property: 'contactInfo' }),
      ]);
    },
  );
});
