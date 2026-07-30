export const printThermalReceipt = (elementId: string = 'printable-receipt-modal', copies: number = 1) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Receipt element with ID #${elementId} not found`);
    return;
  }

  const baseContent = element.innerHTML;
  const numCopies = Math.max(1, copies);

  let fullHtml = '';
  for (let i = 0; i < numCopies; i++) {
    const copyBadge = numCopies > 1 
      ? `<div style="text-align: center; font-weight: bold; text-transform: uppercase; font-size: 10px; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px;">=== ${i === 0 ? 'CUSTOMER COPY' : 'STORE COPY'} ===</div>` 
      : '';
      
    const dividerStyle = i > 0 
      ? 'page-break-before: always; border-top: 2px dashed #000; padding-top: 12px; margin-top: 12px;' 
      : '';

    fullHtml += `
      <div class="thermal-receipt" style="${dividerStyle}">
        ${copyBadge}
        ${baseContent}
      </div>
    `;
  }

  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0px';
  printFrame.style.height = '0px';
  printFrame.style.border = 'none';
  document.body.appendChild(printFrame);

  const doc = printFrame.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title></title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
        <style>
          @page {
            size: 80mm auto;
            margin: 0 !important;
          }
          * {
            box-sizing: border-box;
            color: #000000 !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            width: 76mm;
            font-family: monospace, 'Plus Jakarta Sans', sans-serif;
            font-size: 11px;
            overflow: visible;
          }
          .thermal-receipt {
            width: 76mm;
            padding: 2mm 1mm;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .text-center { text-align: center; }
          .text-end, [align="right"] { text-align: right; }
          .text-start, [align="left"] { text-align: left; }
          .d-flex { display: flex; }
          .justify-content-between { justify-content: space-between; }
          .fw-bold, strong { font-weight: bold; }
          .border-top { border-top: 1px dashed #666; }
          .m-0 { margin: 0; }
          .mb-1 { margin-bottom: 4px; }
          .mb-2 { margin-bottom: 8px; }
          .mt-1 { margin-top: 4px; }
          .mt-2 { margin-top: 8px; }
          .p-2 { padding: 8px; }
          .no-print { display: none !important; }
        </style>
      </head>
      <body>
        ${fullHtml}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    printFrame.contentWindow?.focus();
    printFrame.contentWindow?.print();
    setTimeout(() => {
      try {
        document.body.removeChild(printFrame);
      } catch (e) {}
    }, 1500);
  }, 300);
};
