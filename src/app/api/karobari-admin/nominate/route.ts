import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0


export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "KAROBARI_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Karobari Admin access required" },
        { status: 401 }
      );
    }

    // Get form data
    const formData = await request.formData();

    // Extract Office Use Fields
    const formNumber = formData.get("formNumber") as string;
    const formTakenDate = formData.get("formTakenDate") as string;
    const formAcceptedDate = formData.get("formAcceptedDate") as string;
    const outwardNumber = formData.get("outwardNumber") as string;
    const inwardNumber = formData.get("inwardNumber") as string;
    const feeReceiptNumber = formData.get("feeReceiptNumber") as string;

    // Extract Candidate Details
    const candidateName = formData.get("candidateName") as string;
    const candidateFatherSpouse = formData.get("candidateFatherSpouse") as string;
    const candidateSurname = formData.get("candidateSurname") as string;
    const aliasNickname = formData.get("aliasNickname") as string || "N.A.";
    const currentAddress = formData.get("currentAddress") as string;
    const gender = formData.get("gender") as string;
    const dateOfBirth = formData.get("dateOfBirth") as string;
    const mobileNumber = formData.get("mobileNumber") as string;
    const email = formData.get("email") as string;
    const zoneId = formData.get("zoneId") as string;

    // Extract Supporter Details
    const supporterName = formData.get("supporterName") as string;
    const supporterFatherSpouse = formData.get("supporterFatherSpouse") as string;
    const supporterSurname = formData.get("supporterSurname") as string;
    const supporterAddress = formData.get("supporterAddress") as string;
    const supporterMobile = formData.get("supporterMobile") as string;

    // Extract Photo File Key
    const candidatePhotoFileKey = formData.get("candidatePhotoFileKey") as string;

    // Validate required fields (including photo)
    if (!candidateName || !candidateSurname || !candidateFatherSpouse || 
        !currentAddress || !gender || !dateOfBirth || !mobileNumber || 
        !email || !zoneId || !supporterName || !supporterSurname || 
        !supporterFatherSpouse || !supporterAddress || !supporterMobile ||
        !candidatePhotoFileKey || candidatePhotoFileKey.trim() === '') {
      return NextResponse.json(
        { error: "All required fields must be filled, including candidate photo" },
        { status: 400 }
      );
    }

    console.log('📸 Photo File Key received:', candidatePhotoFileKey)

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate mobile numbers (10 digits)
    if (mobileNumber.length !== 10 || !/^\d{10}$/.test(mobileNumber)) {
      return NextResponse.json(
        { error: "Candidate mobile number must be 10 digits" },
        { status: 400 }
      );
    }

    if (supporterMobile.length !== 10 || !/^\d{10}$/.test(supporterMobile)) {
      return NextResponse.json(
        { error: "Supporter mobile number must be 10 digits" },
        { status: 400 }
      );
    }

    // Check if zone exists
    const zone = await prisma.zone.findUnique({
      where: { id: zoneId },
    });

    if (!zone) {
      return NextResponse.json(
        { error: "Invalid zone selected" },
        { status: 400 }
      );
    }

    // Prepare full candidate name
    const fullCandidateName = `${candidateName} ${candidateFatherSpouse} ${candidateSurname}`.trim();

    // Prepare supporter full name
    const fullSupporterName = `${supporterName} ${supporterFatherSpouse} ${supporterSurname}`.trim();

    // Store office use fields and supporter details in a JSON field
    const additionalInfo = {
      // Office Use Fields
      officeUse: {
        formNumber: formNumber || null,
        formTakenDate: formTakenDate || null,
        formAcceptedDate: formAcceptedDate || null,
        outwardNumber: outwardNumber || null,
        inwardNumber: inwardNumber || null,
        feeReceiptNumber: feeReceiptNumber || null,
      },
      // Candidate Additional Info
      candidateDetails: {
        fatherSpouseName: candidateFatherSpouse,
        surname: candidateSurname,
        aliasNickname: aliasNickname,
        gender: gender,
        dateOfBirth: dateOfBirth,
      },
      // Photo File Key (required - already validated above)
      photoFileKey: candidatePhotoFileKey.trim(),
      // Supporter Details
      supporter: {
        name: fullSupporterName,
        fatherSpouseName: supporterFatherSpouse,
        surname: supporterSurname,
        address: supporterAddress,
        mobile: supporterMobile,
      },
      // Admin who submitted this form
      uploadedBy: session.user.id,
      uploadedByName: session.user.name || session.user.email,
    };

    // Create or update Karobari candidate
    const candidate = await prisma.karobariCandidate.create({
      data: {
        name: fullCandidateName,
        email: email,
        phone: mobileNumber,
        region: zone.name,
        position: "MEMBER", // Default position for Karobari Members
        zoneId: zoneId,
        isOnlineRegistration: false, // Admin filled from hard copy
        experience: JSON.stringify(additionalInfo),
        status: "SUBMITTED", // Mark as submitted since admin filled it
      },
    });

    return NextResponse.json({
      success: true,
      message: "Nomination submitted successfully",
      candidateId: candidate.id,
    });
  } catch (error: any) {
    console.error("Error submitting Karobari nomination:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit nomination" },
      { status: 500 }
    );
  }
}

