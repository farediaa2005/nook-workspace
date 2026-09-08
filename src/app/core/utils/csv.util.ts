/**
 * Safe CSV Export Utility.
 * Provides protection against CSV Formula Injection (CWE-1236) and ensures
 * proper UTF-8 BOM encoding for Arabic character sets in Excel.
 */

/**
 * Sanitizes a single cell value to prevent CSV / Formula Injection.
 * Prepends a single quote if the field begins with =, +, -, @, \t, or \r.
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // Check for dangerous formula trigger prefixes (Formula Injection / CWE-1236)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape internal double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Builds and downloads a sanitized CSV file with UTF-8 BOM encoding.
 * 
 * @param filename The desired filename (e.g. 'students_report.csv')
 * @param headers Array of column header strings
 * @param rows 2D array of row cells
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const sanitizedHeaders = headers.map(h => sanitizeCsvCell(h)).join(',');
  const sanitizedRows = rows.map(row => row.map(cell => sanitizeCsvCell(cell)).join(','));

  const csvContent = '\uFEFF' + [sanitizedHeaders, ...sanitizedRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke object URL after click to release memory
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
