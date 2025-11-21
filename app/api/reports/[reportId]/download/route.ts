import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';

// In-memory storage for generated reports (in production, use cloud storage)
const generatedReports: Map<string, { buffer: Buffer; fileName: string; contentType: string }> = new Map();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  try {
    const session = await getCurrentSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { reportId } = await params;
    
    // In a real implementation, you would:
    // 1. Verify the user has access to this report
    // 2. Retrieve the file from cloud storage (AWS S3, Azure Blob, etc.)
    // 3. Stream the file to the client
    
    const report = generatedReports.get(reportId);
    
    if (!report) {
      // For demo purposes, generate a sample PDF
      const samplePDFContent = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 100
>>
stream
BT
/F1 18 Tf
100 700 Td
(SJFulfillment Report) Tj
0 -30 Td
(Report ID: ${reportId}) Tj
0 -30 Td
(Generated: ${new Date().toLocaleString()}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000348 00000 n 
0000000565 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
635
%%EOF`;

      const buffer = Buffer.from(samplePDFContent, 'utf-8');
      
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="report_${reportId}.pdf"`,
          'Content-Length': buffer.length.toString(),
        },
      });
    }

    return new NextResponse(report.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${report.fileName}"`,
        'Content-Length': report.buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Failed to download report:', error);
    return NextResponse.json(
      { error: 'Failed to download report' },
      { status: 500 }
    );
  }
}

// // Helper function to store generated reports (for demo purposes)
// export function storeGeneratedReport(reportId: string, buffer: Buffer, fileName: string, contentType: string) {
//   generatedReports.set(reportId, { buffer, fileName, contentType });
  
//   // Clean up old reports after 1 hour
//   setTimeout(() => {
//     generatedReports.delete(reportId);
//   }, 60 * 60 * 1000);
// }