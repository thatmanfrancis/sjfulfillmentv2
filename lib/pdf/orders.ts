import PDFDocument from 'pdfkit';

interface PDFOptions {
  businessName?: string;
}

export async function createOrderPDF(orders: any[], options: PDFOptions = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // Title
    doc.fontSize(20).text(options.businessName || 'Orders Report', { align: 'center' });
    doc.moveDown();

    orders.forEach((order, idx) => {
      doc.fontSize(14).text(`Order #${order.id}`, { underline: true });
      doc.fontSize(12).text(`Customer: ${order.customerName}`);
      doc.text(`Status: ${order.status}`);
      doc.text(`Total: $${order.totalAmount}`);
      doc.text(`Date: ${new Date(order.orderDate).toLocaleString()}`);
      if (order.Warehouse) {
        doc.text(`Warehouse: ${order.Warehouse.name} (${order.Warehouse.region})`);
      }
      doc.moveDown(0.5);
      doc.text('Items:', { underline: true });
      order.OrderItem.forEach((item: any) => {
        doc.text(`- ${item.Product?.name || ''} (SKU: ${item.Product?.sku || ''}) x${item.quantity}`);
      });
      doc.moveDown();
      if (idx < orders.length - 1) doc.addPage();
    });

    doc.end();
  });
}
