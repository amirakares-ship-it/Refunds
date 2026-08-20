import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import pptxgen from 'pptxgenjs';
import { KpiSummary, formatEGP, formatEGPFull, formatMonthLabel } from './dataProcessor';

/**
 * Export a single page/element to PDF with formatted header and page numbering.
 */
export async function exportSinglePagePdf(
  elementId: string,
  filename: string = 'Refunds_Dashboard_Report.pdf',
  pageTitle: string = 'Refunds Analytics Report',
  isLight: boolean = false
) {
  try {
    const element = document.getElementById(elementId) || document.getElementById('dashboard-content');
    if (!element) {
      alert('Element not found for PDF export.');
      return;
    }

    // Capture element canvas
    const canvas = await html2canvas(element, {
      scale: 1.6,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: isLight ? '#f8fafc' : '#0f172a',
      windowWidth: 1280,
      scrollX: 0,
      scrollY: 0,
      ignoreElements: (el) =>
        (el.classList && el.classList.contains('no-pdf')) ||
        (el.tagName === 'BUTTON' && (el.textContent?.includes('Edit') || el.textContent?.includes('Upload') || false)),
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas render failed.');
    }

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = 297;
    const pdfHeight = 210;
    const margin = 5;

    const imgData = canvas.toDataURL('image/png');
    const availableWidth = pdfWidth - margin * 2;
    const availableHeight = pdfHeight - margin * 2 - 8; // Leave space for footer
    const imgHeight = (canvas.height * availableWidth) / canvas.width;

    if (imgHeight <= availableHeight) {
      // Single page fit
      pdf.addImage(imgData, 'PNG', margin, margin, availableWidth, imgHeight);
      
      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Refunds Project Dashboard | ${pageTitle} | Generated: ${new Date().toLocaleString()}`, margin, 204);
      pdf.text('Page 1 of 1', pdfWidth - margin - 20, 204);
    } else {
      // Multi-page scrolling fit
      let heightLeft = imgHeight;
      let position = margin;
      let pageNum = 1;

      pdf.addImage(imgData, 'PNG', margin, position, availableWidth, imgHeight);

      // Add footer for page 1
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Refunds Project Dashboard | ${pageTitle} | Page ${pageNum}`, margin, 204);

      heightLeft -= availableHeight;

      while (heightLeft > 5) {
        position -= (availableHeight - 5);
        pdf.addPage();
        pageNum++;
        pdf.addImage(imgData, 'PNG', margin, position, availableWidth, imgHeight);

        // Footer
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Refunds Project Dashboard | ${pageTitle} | Page ${pageNum}`, margin, 204);

        heightLeft -= availableHeight;
      }
    }

    pdf.save(filename);
  } catch (err) {
    console.error('Single page PDF export error:', err);
    alert('Failed to generate PDF. Please try again.');
  }
}

/**
 * Export all 4 pages combined into a single, multi-page formatted PDF report.
 */
export async function exportAllPagesPdf(
  pages: { id: string; title: string }[],
  filename: string = 'Refunds_Project_Complete_Report.pdf',
  isLight: boolean = false,
  onProgress?: (current: number, total: number) => void
) {
  try {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = 297;
    const pdfHeight = 210;
    const margin = 5;
    const availableWidth = pdfWidth - margin * 2;
    const availableHeight = pdfHeight - margin * 2 - 8;

    let totalPagesCount = pages.length;

    for (let i = 0; i < pages.length; i++) {
      if (onProgress) onProgress(i + 1, totalPagesCount);

      const page = pages[i];
      const element = document.getElementById(page.id);

      if (!element) {
        console.warn(`Element with id ${page.id} not found, skipping.`);
        continue;
      }

      // Capture page element canvas
      const canvas = await html2canvas(element, {
        scale: 1.2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: isLight ? '#ffffff' : '#0f172a',
        windowWidth: 1280,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (el) =>
          (el.classList && el.classList.contains('no-pdf')) ||
          (el.tagName === 'BUTTON' && (el.textContent?.includes('Edit') || el.textContent?.includes('Upload') || false)),
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) continue;

      if (i > 0) {
        pdf.addPage();
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.90);
      const imgHeight = (canvas.height * availableWidth) / canvas.width;

      if (imgHeight <= availableHeight) {
        pdf.addImage(imgData, 'JPEG', margin, margin, availableWidth, imgHeight);
      } else {
        pdf.addImage(imgData, 'JPEG', margin, margin, availableWidth, availableHeight);
      }

      // Add Page Footer
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `Refunds Project Dashboard - Complete Report | ${page.title} | ${new Date().toLocaleDateString()}`,
        margin + 2,
        204
      );
      pdf.text(`Page ${i + 1} of ${totalPagesCount}`, pdfWidth - margin - 22, 204);
    }

    pdf.save(filename);
  } catch (err) {
    console.error('All pages PDF export error:', err);
    alert('Failed to generate full multi-page PDF export.');
  }
}

export interface PptExportPage {
  id: string;
  title: string;
  subtitle?: string;
}

/**
 * Export all 4 pages combined into a clean, multi-slide, widescreen (16:9) PowerPoint presentation.
 */
export async function exportAllPagesPpt(
  pages: PptExportPage[],
  kpis: KpiSummary,
  filters: { company: string; requestMonth: string; status?: string; type?: string },
  filename: string = 'Refunds_Project_Complete_Dashboard.pptx',
  isLight: boolean = false,
  onProgress?: (current: number, total: number) => void
) {
  try {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Refunds Management Analytics';
    pptx.company = 'Customer Service & Finance Operations';
    pptx.title = 'Refunds Project Dashboard Presentation';

    const monthLabel = filters.requestMonth === 'ALL' ? 'All Months' : formatMonthLabel(filters.requestMonth);
    const companyLabel = filters.company === 'ALL' ? 'All Partner Companies' : filters.company;
    const dateStr = new Date().toLocaleDateString('en-US', { dateStyle: 'full' });

    // SLIDE 1: Executive Presentation Title Cover
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: '0F172A' }; // Sleek deep navy/slate

    // Accent line
    titleSlide.addShape('rect' as any, {
      x: 0.8, y: 0.8, w: 1.8, h: 0.08,
      fill: { color: '6366F1' },
      line: { color: '6366F1', width: 0 },
    });

    titleSlide.addText('Refunds Project Dashboard', {
      x: 0.8, y: 1.1, w: 11.5, h: 0.9,
      fontSize: 34, bold: true, color: 'FFFFFF', align: 'left', fontFace: 'Calibri',
    });

    titleSlide.addText('Executive Analytics, Customer Service Outreach, Partner Funds & Financial Liabilities', {
      x: 0.8, y: 2.1, w: 11.5, h: 0.5,
      fontSize: 14, color: '94A3B8', align: 'left', fontFace: 'Calibri',
    });

    // 4 Key Summary Tiles on Cover Slide
    const coverCards = [
      { title: 'Total Refunds Amount', value: formatEGPFull(kpis.totalCombinedAmount), color: '6366F1', sub: `${kpis.totalCombinedCount} Memberships` },
      { title: 'Default Refunds', value: formatEGPFull(kpis.defaultAmount), color: 'EF4444', sub: `${kpis.defaultCount} Default Cases` },
      { title: 'Request Refunds', value: formatEGPFull(kpis.requestAmount), color: '3B82F6', sub: `${kpis.requestCount} Request Cases` },
      { title: 'Total Cancellations', value: `${kpis.totalCancellationCount}`, color: 'F59E0B', sub: 'Target Memberships' },
    ];

    coverCards.forEach((c, idx) => {
      const x = 0.8 + idx * 2.95;
      const y = 2.9;
      titleSlide.addShape('rect' as any, {
        x, y, w: 2.8, h: 1.7,
        fill: { color: '1E293B' },
        line: { color: '334155', width: 1 },
      });

      titleSlide.addText(c.title, {
        x: x + 0.15, y: y + 0.12, w: 2.5, h: 0.3,
        fontSize: 11, bold: true, color: '94A3B8', fontFace: 'Calibri',
      });

      titleSlide.addText(c.value, {
        x: x + 0.15, y: y + 0.45, w: 2.5, h: 0.6,
        fontSize: 16, bold: true, color: c.color, fontFace: 'Calibri',
      });

      titleSlide.addText(c.sub, {
        x: x + 0.15, y: y + 1.15, w: 2.5, h: 0.35,
        fontSize: 10, color: '64748B', fontFace: 'Calibri',
      });
    });

    // Metadata Footer on Cover Slide
    titleSlide.addText(`Filters Active:  Company: ${companyLabel}  |  Month: ${monthLabel}  |  Status: ${filters.status || 'ALL'}`, {
      x: 0.8, y: 5.4, w: 11.5, h: 0.4,
      fontSize: 12, bold: true, color: 'CBD5E1', fontFace: 'Calibri',
    });

    titleSlide.addText(`Report Generated: ${dateStr}  •  Refunds Analytics Suite  •  Confidential`, {
      x: 0.8, y: 5.9, w: 11.5, h: 0.4,
      fontSize: 11, color: '64748B', fontFace: 'Calibri',
    });

    // CAPTURE AND ADD EACH OF THE 4 PAGES
    const totalPages = pages.length;

    for (let i = 0; i < pages.length; i++) {
      if (onProgress) onProgress(i + 1, totalPages);

      const page = pages[i];
      let element = document.getElementById(page.id);

      // Fallback if offscreen ID not found directly
      if (!element && i === 0) {
        element = document.getElementById('dashboard-content');
      }

      if (!element) {
        console.warn(`Element with ID ${page.id} not found for PPT export.`);
        continue;
      }

      try {
        // Capture screenshot with optimized scale and fast rendering
        const canvas = await html2canvas(element, {
          scale: 1.15,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: isLight ? '#F8FAFC' : '#020617',
          windowWidth: 1280,
          scrollX: 0,
          scrollY: 0,
          ignoreElements: (el) =>
            (el.classList && el.classList.contains('no-pdf')) ||
            (el.tagName === 'BUTTON' && (el.textContent?.includes('Edit') || el.textContent?.includes('Upload') || false)),
        });

        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          continue;
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.86);

        // Add Slide
        const slide = pptx.addSlide();
        slide.background = { color: isLight ? 'F8FAFC' : '020617' };

        // Top Slide Header Banner
        slide.addShape('rect' as any, {
          x: 0.5, y: 0.25, w: 12.33, h: 0.7,
          fill: { color: isLight ? 'FFFFFF' : '0F172A' },
          line: { color: isLight ? 'E2E8F0' : '1E293B', width: 1 },
        });

        slide.addText(page.title, {
          x: 0.7, y: 0.3, w: 7.5, h: 0.35,
          fontSize: 13, bold: true, color: isLight ? '0F172A' : 'F8FAFC', fontFace: 'Calibri',
        });

        if (page.subtitle) {
          slide.addText(page.subtitle, {
            x: 0.7, y: 0.62, w: 7.5, h: 0.25,
            fontSize: 9, color: '64748B', fontFace: 'Calibri',
          });
        }

        slide.addText(`Slide ${i + 2} of ${totalPages + 1}  •  ${companyLabel} | ${monthLabel}`, {
          x: 8.2, y: 0.42, w: 4.4, h: 0.35,
          fontSize: 10, bold: true, color: '6366F1', align: 'right', fontFace: 'Calibri',
        });

        // Fit Image on Slide cleanly (16:9 bounds: maxW: 12.33, maxH: 5.9)
        const imgAspect = canvas.width / canvas.height;
        const maxW = 12.33;
        const maxH = 5.9;
        let w = maxW;
        let h = w / imgAspect;

        if (h > maxH) {
          h = maxH;
          w = h * imgAspect;
        }

        const x = 0.5 + (maxW - w) / 2;
        const y = 1.08 + (maxH - h) / 2;

        slide.addImage({
          data: imgData,
          x,
          y,
          w,
          h,
        });

        // Slide Footer
        slide.addText(`Refunds Project Dashboard  •  ${page.title}  •  ${dateStr}`, {
          x: 0.5, y: 7.15, w: 12.33, h: 0.25,
          fontSize: 8, color: '64748B', align: 'center', fontFace: 'Calibri',
        });
      } catch (slideErr) {
        console.error(`Error capturing slide ${page.title}:`, slideErr);
      }
    }

    // Write file and trigger direct browser download
    await pptx.writeFile({ fileName: filename });
  } catch (err) {
    console.error('All pages PPT export error:', err);
    alert('Failed to generate full PowerPoint export. Please try again.');
  }
}

/**
 * Native Vector PDF Generator Fallback
 */
export async function exportDashboardToPdf(
  elementId: string = 'dashboard-content',
  filename: string = 'Refunds_Dashboard_Report.pdf',
  kpis?: KpiSummary,
  filters?: { company: string; requestMonth: string; status: string; type: string }
) {
  return exportSinglePagePdf(elementId, filename, 'Main Executive Dashboard', false);
}

export async function exportDashboardToPpt(
  kpis: KpiSummary,
  selectedCompany: string,
  selectedMonth: string,
  isLight: boolean = false,
  onProgress?: (current: number, total: number) => void
) {
  const pages: PptExportPage[] = [
    { id: 'pdf-page-all-refunds', title: '1. All Refunds Executive Dashboard 2026', subtitle: 'Refunds Project Management & Key KPI Performance Summary' },
    { id: 'pdf-page-cs-work', title: '2. Customer Service Work Report 2026', subtitle: 'Default Member Outreach, Reachability Rates & Retained Memberships' },
    { id: 'pdf-page-funds', title: '3. Monthly Funds & Financing Matrix 2026', subtitle: 'Financed Funds vs Refund Amount Comparison per Partner Company' },
    { id: 'pdf-page-finance', title: '4. Finance & Cash Liabilities Overview 2026', subtitle: 'Cheque Pending Obligations, Cancelled Refunds & Audit Settlement Matrix' },
  ];

  return exportAllPagesPpt(
    pages,
    kpis,
    { company: selectedCompany, requestMonth: selectedMonth },
    'Refunds_Project_Complete_Dashboard.pptx',
    isLight,
    onProgress
  );
}
