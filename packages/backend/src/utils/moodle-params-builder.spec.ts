import { buildMoodleParams } from './moodle-params-builder';

describe('buildMoodleParams Utility', () => {
  it('should serialize simple primitive key-value pairs', () => {
    const params = {
      wsfunction: 'core_course_get_courses',
      moodlewsrestformat: 'json',
      limit: 10,
      enabled: true,
    };

    const result = buildMoodleParams(params);

    expect(result).toEqual([
      ['wsfunction', 'core_course_get_courses'],
      ['moodlewsrestformat', 'json'],
      ['limit', '10'],
      ['enabled', 'true'],
    ]);
  });

  it('should serialize nested objects with bracket notation', () => {
    const params = {
      criteria: {
        key: 'id',
        value: 123,
      },
    };

    const result = buildMoodleParams(params);

    expect(result).toEqual([
      ['criteria[key]', 'id'],
      ['criteria[value]', '123'],
    ]);
  });

  it('should serialize arrays with numeric index brackets', () => {
    const params = {
      courseids: [101, 202, 303],
    };

    const result = buildMoodleParams(params);

    expect(result).toEqual([
      ['courseids[0]', '101'],
      ['courseids[1]', '202'],
      ['courseids[2]', '303'],
    ]);
  });

  it('should serialize arrays of objects properly', () => {
    const params = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    };

    const result = buildMoodleParams(params);

    expect(result).toEqual([
      ['users[0][id]', '1'],
      ['users[0][name]', 'Alice'],
      ['users[1][id]', '2'],
      ['users[1][name]', 'Bob'],
    ]);
  });

  it('should respect a custom prefix parameter', () => {
    const params = {
      filter: 'active',
    };

    const result = buildMoodleParams(params, 'options');

    expect(result).toEqual([['options[filter]', 'active']]);
  });

  it('should ignore null or undefined values', () => {
    const params = {
      valid: 'value',
      nil: null,
      undef: undefined,
    };

    const result = buildMoodleParams(params);

    expect(result).toEqual([['valid', 'value']]);
  });

  it('should return an empty array for an empty object', () => {
    const result = buildMoodleParams({});

    expect(result).toEqual([]);
  });
});
