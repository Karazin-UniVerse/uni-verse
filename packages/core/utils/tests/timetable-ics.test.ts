import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { TIMETABLE_TIME_ZONE } from '../../constants/timetable.ts';
import type { IcsCalendarEvent } from '../../types/timetable.ts';
import { escapeIcsText, foldLine, generateIcsCalendar, sanitizeIcsUrl } from '../timetable.ts';

describe('timetable-ics', () => {
  describe('escapeIcsText', () => {
    test('escapes backslashes, semicolons, commas, and newlines', () => {
      const raw = 'Math, Logic; C:\\Folder\nLine 2\r\nLine 3';
      const escaped = escapeIcsText(raw);

      assert.strictEqual(escaped, 'Math\\, Logic\\; C:\\\\Folder\\nLine 2\\nLine 3');
    });

    test('preserves double quotes in text fields without corruption', () => {
      const raw = 'Курс "Алгоритми та структури", лекція';
      const escaped = escapeIcsText(raw);

      assert.strictEqual(escaped, 'Курс "Алгоритми та структури"\\, лекція');
    });
  });

  describe('sanitizeIcsUrl', () => {
    test('removes carriage return and newline characters', () => {
      const raw = 'https://meet.google.com/abc-xyz\r\nX-INJECTION:bad\n';

      assert.strictEqual(sanitizeIcsUrl(raw), 'https://meet.google.com/abc-xyzX-INJECTION:bad');
    });

    test('strips ASCII control characters and trims outer whitespace', () => {
      const raw = '  https://meet.google.com/abc\u0000\u0007\u001F  ';

      assert.strictEqual(sanitizeIcsUrl(raw), 'https://meet.google.com/abc');
    });
  });

  describe('foldLine', () => {
    test('does not fold lines within 75 octets', () => {
      const shortLine = 'SUMMARY:Коротка назва';

      assert.strictEqual(foldLine(shortLine), shortLine);
    });

    test('folds long ASCII lines exceeding 75 octets with CRLF + space', () => {
      const longAscii = `DESCRIPTION:${'A'.repeat(80)}`;
      const folded = foldLine(longAscii);

      assert.ok(folded.includes('\r\n '));

      for (const line of folded.split('\r\n')) {
        const byteLength = new TextEncoder().encode(line).length;

        assert.ok(byteLength <= 75);
      }

      assert.strictEqual(folded.replace(/\r\n /g, ''), longAscii);
    });

    test('folds Cyrillic UTF-8 lines without splitting multi-byte characters', () => {
      const longCyrillic = `DESCRIPTION:${'Привіт, прекрасний Каразинський університет! '.repeat(5)}`;
      const folded = foldLine(longCyrillic);

      assert.ok(folded.includes('\r\n '));

      const lines = folded.split('\r\n');

      for (const line of lines) {
        const byteLength = new TextEncoder().encode(line).length;

        assert.ok(byteLength <= 75, `Line exceeded 75 octets: ${byteLength}`);
      }

      assert.strictEqual(folded.replace(/\r\n /g, ''), longCyrillic);
    });
  });

  describe('generateIcsCalendar', () => {
    const fixedNow = new Date('2026-11-11T12:00:00.000Z');

    test('generates valid VCALENDAR and VTIMEZONE structure', () => {
      const ics = generateIcsCalendar({
        calendarName: 'UniVerse: Розклад КС11',
        events: [],
        now: fixedNow,
      });

      assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
      assert.ok(ics.includes('VERSION:2.0\r\n'));
      assert.ok(ics.includes('PRODID:-//Karazin UniVerse//Timetable//UK\r\n'));
      assert.ok(ics.includes('CALSCALE:GREGORIAN\r\n'));
      assert.ok(ics.includes('METHOD:PUBLISH\r\n'));
      assert.ok(ics.includes('X-WR-CALNAME:UniVerse: Розклад КС11\r\n'));
      assert.ok(ics.includes('NAME:UniVerse: Розклад КС11\r\n'));
      assert.ok(ics.includes(`X-WR-TIMEZONE:${TIMETABLE_TIME_ZONE}\r\n`));

      assert.ok(ics.includes('BEGIN:VTIMEZONE\r\n'));
      assert.ok(ics.includes('TZID:Europe/Kyiv\r\n'));
      assert.ok(ics.includes('BEGIN:DAYLIGHT\r\n'));
      assert.ok(ics.includes('TZNAME:EEST\r\n'));
      assert.ok(ics.includes('TZOFFSETFROM:+0200\r\n'));
      assert.ok(ics.includes('TZOFFSETTO:+0300\r\n'));
      assert.ok(ics.includes('RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\r\n'));
      assert.ok(ics.includes('END:DAYLIGHT\r\n'));
      assert.ok(ics.includes('BEGIN:STANDARD\r\n'));
      assert.ok(ics.includes('TZNAME:EET\r\n'));
      assert.ok(ics.includes('TZOFFSETFROM:+0300\r\n'));
      assert.ok(ics.includes('TZOFFSETTO:+0200\r\n'));
      assert.ok(ics.includes('RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\r\n'));
      assert.ok(ics.includes('END:STANDARD\r\n'));
      assert.ok(ics.includes('END:VTIMEZONE\r\n'));

      assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
    });

    test('formats time across pair start and end using local bell schedule', () => {
      const events: IcsCalendarEvent[] = [
        {
          id: 'lesson-1',
          disciplineTitle: 'Алгоритмізація та програмування',
          teachingType: 'LECTURE',
          date: '2026-09-01',
          pair: 1,
        },
        {
          id: 'lesson-2',
          disciplineTitle: 'Архітектура компʼютерів',
          teachingType: 'LABORATORY',
          date: '2026-11-15',
          pair: 2,
        },
      ];

      const ics = generateIcsCalendar({ events, now: fixedNow });
      const unfolded = ics.replace(/\r\n /g, '');

      assert.ok(unfolded.includes('DTSTART;TZID=Europe/Kyiv:20260901T083000\r\n'));
      assert.ok(unfolded.includes('DTEND;TZID=Europe/Kyiv:20260901T095000\r\n'));
      assert.ok(unfolded.includes('SUMMARY:[Лекція] Алгоритмізація та програмування\r\n'));

      assert.ok(unfolded.includes('DTSTART;TZID=Europe/Kyiv:20261115T101000\r\n'));
      assert.ok(unfolded.includes('DTEND;TZID=Europe/Kyiv:20261115T113000\r\n'));
      assert.ok(unfolded.includes('SUMMARY:[Лабораторна] Архітектура компʼютерів\r\n'));
    });

    test('supports explicit start and end Date objects', () => {
      const start = new Date('2026-10-05T07:10:00.000Z');
      const end = new Date('2026-10-05T08:30:00.000Z');

      const ics = generateIcsCalendar({
        events: [
          {
            id: 'custom-event-1',
            disciplineTitle: 'Консультація перед іспитом',
            start,
            end,
          },
        ],
        now: fixedNow,
      });

      assert.ok(ics.includes('DTSTART;TZID=Europe/Kyiv:20261005T101000\r\n'));
      assert.ok(ics.includes('DTEND;TZID=Europe/Kyiv:20261005T113000\r\n'));
      assert.ok(ics.includes('SUMMARY:Консультація перед іспитом\r\n'));
    });

    test('escapes commas, newlines, and quotes in SUMMARY and DESCRIPTION', () => {
      const ics = generateIcsCalendar({
        events: [
          {
            id: 'event-escape-test',
            disciplineTitle: 'ШІ, нейромережі "Deep Learning"; модуль 1',
            teachingType: 'PRACTICAL',
            date: '2026-09-02',
            pair: 3,
            teacherName: 'Коваленко О. П., доцент',
            groupCodes: ['КС11', 'КС12'],
            description: 'Домашнє завдання:\n1. Ознайомитися з PyTorch;\n2. Надіслати звіт, код.',
          },
        ],
        now: fixedNow,
      });
      const unfolded = ics.replace(/\r\n /g, '');

      assert.ok(
        unfolded.includes('SUMMARY:[Практика] ШІ\\, нейромережі "Deep Learning"\\; модуль 1'),
      );
      assert.ok(unfolded.includes('Викладач: Коваленко О. П.\\, доцент'));
      assert.ok(unfolded.includes('Групи: КС11\\, КС12'));
      assert.ok(
        unfolded.includes(
          'Домашнє завдання:\\n1. Ознайомитися з PyTorch\\;\\n2. Надіслати звіт\\, код.',
        ),
      );
    });

    test('outputs STATUS:CANCELLED when isCancelled is true and STATUS:CONFIRMED otherwise', () => {
      const ics = generateIcsCalendar({
        events: [
          {
            id: 'cancelled-lesson',
            disciplineTitle: 'Дискретна математика',
            date: '2026-09-03',
            pair: 4,
            isCancelled: true,
          },
          {
            id: 'active-lesson',
            disciplineTitle: 'Дискретна математика',
            date: '2026-09-10',
            pair: 4,
            isCancelled: false,
          },
        ],
        now: fixedNow,
      });

      assert.ok(ics.includes('STATUS:CANCELLED\r\n'));
      assert.ok(ics.includes('Статус: Скасовано'));
      assert.ok(ics.includes('STATUS:CONFIRMED\r\n'));
    });

    test('includes URL property and link in description when meetingUrl is present', () => {
      const meetingUrl = 'https://meet.google.com/xyz-uvwx-rst';

      const ics = generateIcsCalendar({
        events: [
          {
            id: 'online-meeting',
            disciplineTitle: 'Бази даних',
            date: '2026-09-04',
            pair: 1,
            meetingUrl,
          },
        ],
        now: fixedNow,
      });

      assert.ok(ics.includes(`URL:${meetingUrl}\r\n`));
      assert.ok(ics.includes(`Посилання: ${meetingUrl}`));
    });

    test('applies RFC 5545 line folding when lines exceed 75 octets', () => {
      const longDescription = 'Дуже довгий опис дисципліни '.repeat(10);

      const ics = generateIcsCalendar({
        events: [
          {
            id: 'event-long-line',
            disciplineTitle: 'Паралельні та розподілені обчислення у високопродуктивних системах',
            teachingType: 'LECTURE',
            date: '2026-09-05',
            pair: 2,
            description: longDescription,
          },
        ],
        now: fixedNow,
      });

      for (const line of ics.split('\r\n')) {
        const byteLength = new TextEncoder().encode(line).length;

        assert.ok(byteLength <= 75, `Line exceeded 75 octets (${byteLength}): ${line}`);
      }
    });

    test('outputs deterministic UID and SEQUENCE', () => {
      const ics = generateIcsCalendar({
        events: [
          {
            id: 'unique-uuid-12345',
            disciplineTitle: 'Алгоритми',
            date: '2026-09-01',
            pair: 1,
            sequence: 3,
          },
        ],
        now: fixedNow,
      });

      assert.ok(ics.includes('UID:unique-uuid-12345@timetable.universe.karazin.ua\r\n'));
      assert.ok(ics.includes('SEQUENCE:3\r\n'));
      assert.ok(ics.includes('DTSTAMP:20261111T120000Z\r\n'));
    });

    test('escapes and sanitizes CRLF injection attempts in title and event ID', () => {
      const ics = generateIcsCalendar({
        events: [
          {
            id: 'evt-42\r\nX-INJECTED-PROP:hacked\nANOTHER:line',
            disciplineTitle: 'Безпека систем\r\nSUMMARY:Підроблена назва\nATTACK:true',
            date: '2026-09-01',
            pair: 1,
          },
        ],
        now: fixedNow,
      });

      assert.strictEqual(ics.includes('\r\nX-INJECTED-PROP:hacked'), false);
      assert.strictEqual(ics.includes('\r\nSUMMARY:Підроблена назва'), false);
      assert.strictEqual(ics.includes('\r\nATTACK:true'), false);

      const unfolded = ics.replace(/\r\n /g, '');

      assert.ok(
        unfolded.includes(
          'UID:evt-42\\nX-INJECTED-PROP:hacked\\nANOTHER:line@timetable.universe.karazin.ua\r\n',
        ),
      );
      assert.ok(
        unfolded.includes('SUMMARY:Безпека систем\\nSUMMARY:Підроблена назва\\nATTACK:true\r\n'),
      );
    });

    test('cancellation preserves the exact same UID as active event', () => {
      const baseEvent: IcsCalendarEvent = {
        id: 'stable-lesson-guid-999',
        disciplineTitle: 'Операційні системи',
        date: '2026-09-02',
        pair: 2,
        teacherName: 'Петренко П. П.',
      };

      const activeIcs = generateIcsCalendar({
        events: [{ ...baseEvent, isCancelled: false, sequence: 0 }],
        now: fixedNow,
      });

      const cancelledIcs = generateIcsCalendar({
        events: [{ ...baseEvent, isCancelled: true, sequence: 1 }],
        now: fixedNow,
      });

      const expectedUid = 'UID:stable-lesson-guid-999@timetable.universe.karazin.ua\r\n';

      assert.ok(activeIcs.includes(expectedUid));
      assert.ok(cancelledIcs.includes(expectedUid));

      assert.ok(activeIcs.includes('STATUS:CONFIRMED\r\n'));
      assert.ok(activeIcs.includes('SEQUENCE:0\r\n'));

      assert.ok(cancelledIcs.includes('STATUS:CANCELLED\r\n'));
      assert.ok(cancelledIcs.includes('SEQUENCE:1\r\n'));
    });

    test('sanitizes meeting URL with line breaks and control characters', () => {
      const maliciousUrl =
        'https://meet.google.com/test-room\r\nBEGIN:VEVENT\r\nSUMMARY:Injected\n';

      const ics = generateIcsCalendar({
        events: [
          {
            id: 'url-test-event',
            disciplineTitle: 'Веб-програмування',
            date: '2026-09-03',
            pair: 3,
            meetingUrl: maliciousUrl,
          },
        ],
        now: fixedNow,
      });

      assert.strictEqual(ics.includes('\r\nBEGIN:VEVENT\r\nSUMMARY:Injected'), false);
      assert.strictEqual(ics.includes('\r\nSUMMARY:Injected'), false);

      const unfolded = ics.replace(/\r\n /g, '');

      assert.ok(
        unfolded.includes('URL:https://meet.google.com/test-roomBEGIN:VEVENTSUMMARY:Injected\r\n'),
      );
    });
  });
});
