import { BadRequestException } from '@nestjs/common';
import { validateGripCompletion, resolveClientIp } from '../grip.helpers';

describe('grip.helpers', () => {
  const boardSchema = {
    $defs: {
      Edge: {
        properties: {
          label: { type: 'string' },
          source: { type: 'string' },
          target: { type: 'string' },
        },
        required: ['source', 'target', 'label'],
        type: 'object',
      },
      Node: {
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          role: { type: 'string' },
          kind: {
            enum: ['component', 'store', 'external', 'context'],
            type: 'string',
          },
          trust: { enum: ['trusted', 'untrusted'], type: 'string' },
          files: { items: { type: 'string' }, type: 'array' },
        },
        required: ['id', 'label', 'role', 'kind', 'trust', 'files'],
        type: 'object',
      },
      Pin: {
        properties: {
          kind: { enum: ['why this way', 'malicious actor'], type: 'string' },
          on: { type: 'string' },
          question: { type: 'string' },
          rubric: { items: { type: 'string' }, type: 'array' },
        },
        required: ['on', 'kind', 'question', 'rubric'],
        type: 'object',
      },
    },
    properties: {
      edges: { items: { $ref: '#/$defs/Edge' }, type: 'array' },
      nodes: { items: { $ref: '#/$defs/Node' }, type: 'array' },
      pins: { items: { $ref: '#/$defs/Pin' }, type: 'array' },
      summary: { type: 'string' },
    },
    required: ['summary', 'nodes', 'edges', 'pins'],
    type: 'object',
  };

  const gradeSheetSchema = {
    $defs: {
      QuestionGrade: {
        properties: {
          feedback: { type: 'string' },
          question_index: { type: 'integer' },
          score: { maximum: 20, minimum: 0, type: 'integer' },
        },
        required: ['question_index', 'score', 'feedback'],
        type: 'object',
      },
    },
    properties: {
      grades: { items: { $ref: '#/$defs/QuestionGrade' }, type: 'array' },
      verdict: { type: 'string' },
    },
    required: ['grades', 'verdict'],
    type: 'object',
  };

  const validBoardRequest = {
    model: 'gemini-3.5-flash-lite',
    messages: [
      { role: 'system', content: 'You are Grip whiteboard reviewer.' },
      { role: 'user', content: 'Draw whiteboard for diff...' },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'Board',
        schema: boardSchema,
      },
    },
  };

  const validGradeSheetRequest = {
    model: 'gemini-3.5-flash-lite',
    messages: [
      { role: 'system', content: 'You are Grip grading reviewer.' },
      { role: 'user', content: 'Grade answers...' },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'GradeSheet',
        schema: gradeSheetSchema,
      },
    },
  };

  it('valid Grip Board and GradeSheet envelopes survive validation', () => {
    const validatedBoard = validateGripCompletion(validBoardRequest);

    expect(validatedBoard.model).toBe('gemini-3.5-flash-lite');
    expect(validatedBoard.messages).toHaveLength(2);
    expect(validatedBoard.response_format.json_schema.name).toBe('Board');

    const validatedGrade = validateGripCompletion(validGradeSheetRequest);

    expect(validatedGrade.model).toBe('gemini-3.5-flash-lite');
    expect(validatedGrade.messages).toHaveLength(2);
    expect(validatedGrade.response_format.json_schema.name).toBe('GradeSheet');
  });

  it('rejects extra fields/multimodal/tools/streaming/schema size/message bytes', () => {
    expect(() =>
      validateGripCompletion({
        ...validBoardRequest,
        stream: true,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      validateGripCompletion({
        ...validBoardRequest,
        tools: [{ type: 'function' }],
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      validateGripCompletion({
        ...validBoardRequest,
        temperature: 0.7,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      validateGripCompletion({
        ...validBoardRequest,
        messages: [
          { role: 'system', content: 'system' },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'hi' },
              { type: 'image_url', image_url: { url: 'data:...' } },
            ],
          },
        ],
      }),
    ).toThrow(BadRequestException);

    const oversizedContent = 'a'.repeat(200_001);

    expect(() =>
      validateGripCompletion({
        ...validBoardRequest,
        messages: [
          { role: 'system', content: 'system' },
          { role: 'user', content: oversizedContent },
        ],
      }),
    ).toThrow(BadRequestException);

    const oversizedSchema = {
      ...boardSchema,
      largeBlob: 'x'.repeat(33_000),
    };

    expect(() =>
      validateGripCompletion({
        ...validBoardRequest,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'Board',
            schema: oversizedSchema,
          },
        },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects non-JSON-schema response formats', () => {
    expect(() =>
      validateGripCompletion({
        ...validBoardRequest,
        response_format: {
          type: 'text',
        },
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      validateGripCompletion({
        ...validBoardRequest,
        response_format: {
          type: 'json_object',
        },
      }),
    ).toThrow(BadRequestException);
  });

  describe('resolveClientIp', () => {
    it('returns remoteAddress directly when no trusted proxies are set', () => {
      const req = {
        socket: { remoteAddress: '203.0.113.195' },
        headers: { 'x-forwarded-for': '198.51.100.1' },
      };

      expect(resolveClientIp(req, [])).toBe('203.0.113.195');
    });

    it('trusts X-Forwarded-For when peer is in trustedProxies', () => {
      const req = {
        socket: { remoteAddress: '127.0.0.1' },
        headers: { 'x-forwarded-for': '198.51.100.1' },
      };

      expect(resolveClientIp(req, ['127.0.0.1'])).toBe('198.51.100.1');
    });

    it('ignores spoofed X-Forwarded-For from untrusted peer', () => {
      const req = {
        socket: { remoteAddress: '198.51.100.5' },
        headers: { 'x-forwarded-for': '8.8.8.8' },
      };

      expect(resolveClientIp(req, ['127.0.0.1', '10.0.0.1'])).toBe(
        '198.51.100.5',
      );
    });
  });
});
