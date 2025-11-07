import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ message: `Error occurred while fetching invoice` }, { status: 400 });
  }

  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id: id },
      include: {
        merchant: true,
        customer: true,
        items: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // TODO: Integrate with PDF generation library (e.g., PDFKit, Puppeteer)
    // For now, return mock PDF URL
    const pdfUrl = `https://pdfs.example.com/invoices/${invoice.id}.pdf`;

    return NextResponse.json({
      pdfUrl,
      message: "PDF generation completed",
    });
  } catch (error) {
    console.error("Generate PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
