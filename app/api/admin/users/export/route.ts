import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parse } from "json2csv";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

// Helper to filter and format user data
function filterUserFields(users, fields) {
  return users.map((user) => {
    const filtered = {};
    for (const f of fields) filtered[f] = user[f];
    return filtered;
  });
}

export async function POST(req: NextRequest) {
  // Extract user from session cookie (JWT)
  const sessionToken = req.cookies.get("session")?.value;
  let userId = null;
  let userRole = null;
  if (sessionToken) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET || "secret";
      const session = jwt.verify(sessionToken, JWT_SECRET) as any;
      userId = session.userId;
      userRole = session.role;
    } catch (e) {}
  }
  // Only allow admins
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { format, fields, filters } = await req.json();
  // Build Prisma query
  const where = {};
  if (filters?.role) where["role"] = filters.role;
  if (filters?.isVerified) where["isVerified"] = filters.isVerified === "true";
  if (filters?.dateFrom || filters?.dateTo) {
    where["createdAt"] = {};
    if (filters.dateFrom) where["createdAt"].gte = new Date(filters.dateFrom);
    if (filters.dateTo) where["createdAt"].lte = new Date(filters.dateTo);
  }

  const users = await prisma.user.findMany({ where });
  const filtered = filterUserFields(users, fields);

  let fileContent, mime, ext;
  if (format === "csv") {
    fileContent = parse(filtered);
    mime = "text/csv";
    ext = "csv";
  } else if (format === "json") {
    fileContent = JSON.stringify(filtered, null, 2);
    mime = "application/json";
    ext = "json";
  } else if (format === "xlsx") {
    // For demo: just CSV, but you can use xlsx package for real Excel
    fileContent = parse(filtered);
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    ext = "xlsx";
  } else {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  // Save file to /public/exports
  const fileId = uuidv4();
  const fileName = `users-export-${fileId}.${ext}`;
  const filePath = join(process.cwd(), "public", "exports", fileName);
  writeFileSync(filePath, fileContent);

  // Optionally, schedule deletion after some time
  setTimeout(() => {
    try {
      unlinkSync(filePath);
    } catch {}
  }, 1000 * 60 * 10); // 10 min

  return NextResponse.json({ url: `/exports/${fileName}` });
}
