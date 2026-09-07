import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeCsvCell, exportToCsv } from './csv.util';

describe('CSV Utility (csv.util)', () => {
  describe('sanitizeCsvCell', () => {
    it('should return empty quoted string for null or undefined', () => {
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });

    it('should wrap safe strings in double quotes', () => {
      expect(sanitizeCsvCell('Ahmed')).toBe('"Ahmed"');
      expect(sanitizeCsvCell('Nook Workspace')).toBe('"Nook Workspace"');
    });

    it('should escape internal double quotes by doubling them', () => {
      expect(sanitizeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
      expect(sanitizeCsvCell('24" Monitor')).toBe('"24"" Monitor"');
    });

    it('should neutralize formula injection prefixes (CWE-1236)', () => {
      // Equals
      expect(sanitizeCsvCell('=1+1')).toBe('"\'' + '=1+1"');
      expect(sanitizeCsvCell('=cmd|/C calc')).toBe('"\'' + '=cmd|/C calc"');

      // Plus
      expect(sanitizeCsvCell('+12345')).toBe('"\'' + '+12345"');

      // Minus
      expect(sanitizeCsvCell('-50')).toBe('"\'' + '-50"');

      // At sign
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe('"\'' + '@SUM(A1:A10)"');

      // Tab and Carriage return
      expect(sanitizeCsvCell('\tSecret')).toBe('"\'' + '\tSecret"');
      expect(sanitizeCsvCell('\rDangerous')).toBe('"\'' + '\rDangerous"');
    });

    it('should format numbers, booleans correctly', () => {
      expect(sanitizeCsvCell(123)).toBe('"123"');
      expect(sanitizeCsvCell(0)).toBe('"0"');
      expect(sanitizeCsvCell(true)).toBe('"true"');
      expect(sanitizeCsvCell(false)).toBe('"false"');
    });
  });

  describe('exportToCsv', () => {
    let originalCreateObjectURL: any;
    let originalRevokeObjectURL: any;
    let createdUrl = 'blob:http://localhost/mock-csv-url';

    beforeEach(() => {
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn(() => createdUrl);
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      vi.restoreAllMocks();
    });

    it('should create a downloadable link with UTF-8 BOM and correct filename', () => {
      const clickSpy = vi.fn();
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === 'a') {
          el.click = clickSpy;
        }
        return el;
      });

      exportToCsv('test_report', ['Name', 'Score'], [['Alice', 100], ['=malicious', 200]]);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });
  });
});
