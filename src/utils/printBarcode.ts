export interface BarcodePrintProduct {
  name: string;
  category?: { name?: string };
  barcode?: string | null;
  SKU: string;
  price: number;
}

export const printBarcodeLabel = (product: BarcodePrintProduct, copies: number = 1) => {
  if (!product) return;

  const barcodeVal = product.barcode || product.SKU || 'UNKNOWN';
  const numCopies = Math.max(1, copies);

  let fullHtml = '';
  for (let i = 0; i < numCopies; i++) {
    const dividerStyle = i > 0 ? 'page-break-before: always;' : '';
    fullHtml += `
      <div class="barcode-sticker" style="${dividerStyle}">
        <div class="barcode-title">${product.name}</div>
        <div class="barcode-cat">${product.category?.name || ''}</div>
        <svg id="bc-svg-${i}" class="barcode-svg"></svg>
        <div class="barcode-price">Rs. ${Number(product.price).toFixed(2)}</div>
      </div>
    `;
  }

  // Create hidden iframe matching sales/pos print mechanism
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
        <title>Barcode Print - ${product.name}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          @page {
            size: 50mm 25mm;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            color: #000000 !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 50mm;
            height: 25mm;
            background: #ffffff;
            font-family: system-ui, -apple-system, sans-serif;
            overflow: hidden;
          }
          .barcode-sticker {
            width: 50mm;
            height: 25mm;
            padding: 1mm 2mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            text-align: center;
            background: #ffffff;
            box-sizing: border-box;
          }
          .barcode-title {
            font-size: 10px;
            font-weight: bold;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 46mm;
          }
          .barcode-cat {
            font-size: 8px;
            color: #444 !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 46mm;
            line-height: 1;
          }
          .barcode-svg {
            max-width: 46mm;
            max-height: 12mm;
          }
          .barcode-price {
            font-size: 10px;
            font-weight: bold;
            line-height: 1;
          }
        </style>
      </head>
      <body>
        ${fullHtml}
        <script>
          window.onload = function() {
            for (let i = 0; i < ${numCopies}; i++) {
              try {
                JsBarcode("#bc-svg-" + i, "${barcodeVal}", {
                  width: 1.2,
                  height: 25,
                  fontSize: 9,
                  margin: 1,
                  displayValue: true
                });
              } catch(e){}
            }
            setTimeout(function() {
              window.focus();
              printFrameWindowPrint();
            }, 250);
          };

          function printFrameWindowPrint() {
            try {
              window.print();
            } catch(e){}
          }
        </script>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    } catch (e) {}

    setTimeout(() => {
      try {
        document.body.removeChild(printFrame);
      } catch (e) {}
    }, 1000);
  }, 350);
};
