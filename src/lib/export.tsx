'use client';

/**
 * Export utilities for Boho Cafe & Lounge
 * Supports CSV (vanilla), Excel (xlsx), and PDF (jspdf + jspdf-autotable)
 */

// ─── CSV Export (vanilla JS, no library needed) ─────────────────────────
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string
): void {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    ),
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

// ─── Excel Export (xlsx) ────────────────────────────────────────────────
export async function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Sheet1'
): Promise<void> {
  if (!data.length) return;

  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns
  const headers = Object.keys(data[0]);
  worksheet['!cols'] = headers.map((h) => ({
    wch: Math.max(
      h.length,
      ...data.map((row) => String(row[h] ?? '').length)
    ) + 2,
  }));

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// ─── PDF Export (jspdf + jspdf-autotable) ───────────────────────────────
export async function exportToPDF(
  data: Record<string, unknown>[],
  columns: { header: string; dataKey: string }[],
  title: string,
  filename: string
): Promise<void> {
  if (!data.length) return;

  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF('landscape', 'mm', 'a4');

  // Title
  doc.setFontSize(16);
  doc.setTextColor(198, 169, 98); // Gold
  doc.text(title, 14, 15);

  // Subtitle
  doc.setFontSize(9);
  doc.setTextColor(160, 152, 136);
  doc.text(`Boho Cafe & Lounge — Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 14, 22);

  // Table
  (doc as unknown as { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
    startY: 28,
    head: [columns.map((c) => c.header)],
    body: data.map((row) => columns.map((c) => String(row[c.dataKey] ?? '—'))),
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [245, 240, 232],
      fillColor: [26, 26, 26],
      lineColor: [42, 42, 42],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [168, 137, 61],
      textColor: [10, 10, 10],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [21, 21, 21],
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}

// ─── Helper ─────────────────────────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Export Dropdown Component ──────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, FileDown } from 'lucide-react';

interface ExportDropdownProps {
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  loading?: boolean;
}

export function ExportDropdown({ onExportCSV, onExportExcel, onExportPDF, loading }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-[#C6A962] hover:bg-[#222] transition-colors text-sm"
      >
        <Download size={16} />
        <span className="hidden sm:inline">Export</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-xl z-50 overflow-hidden">
          <button
            onClick={() => { onExportCSV(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#F5F0E8] hover:bg-[#222] transition-colors"
          >
            <FileText size={16} className="text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={() => { onExportExcel(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#F5F0E8] hover:bg-[#222] transition-colors"
          >
            <FileSpreadsheet size={16} className="text-blue-400" />
            Export Excel
          </button>
          <button
            onClick={() => { onExportPDF(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#F5F0E8] hover:bg-[#222] transition-colors"
          >
            <FileDown size={16} className="text-red-400" />
            Export PDF
          </button>
        </div>
      )}
    </div>
  );
}
