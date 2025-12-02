import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find karobari admin
    const karobariAdmin = await prisma.karobariAdmin.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        user: true,
      },
    });

    if (!karobariAdmin || !karobariAdmin.user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      karobariAdmin.user.password || ""
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: karobariAdmin.user.id,
        adminId: karobariAdmin.adminId,
        email: karobariAdmin.email,
        role: "KAROBARI_ADMIN",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      admin: {
        id: karobariAdmin.id,
        name: karobariAdmin.name,
        email: karobariAdmin.email,
        phone: karobariAdmin.phone,
        adminId: karobariAdmin.adminId,
      },
    });
  } catch (error) {
    console.error("Karobari admin login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}

