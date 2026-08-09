// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { jsPDF } from 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoTable: (options: Record<string, any>) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}
