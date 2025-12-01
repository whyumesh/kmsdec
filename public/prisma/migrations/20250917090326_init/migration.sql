-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "age" INTEGER,
    "jurisdiction" TEXT NOT NULL DEFAULT 'LOCAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "electionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "party" TEXT,
    "manifesto" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "region" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "experience" TEXT,
    "education" TEXT,
    "isOfflineNomination" BOOLEAN NOT NULL DEFAULT false,
    "zoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "hasVoted" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "zoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elections" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "isOnlineNomination" BOOLEAN NOT NULL DEFAULT true,
    "voterMinAge" INTEGER,
    "voterMaxAge" INTEGER,
    "candidateMinAge" INTEGER,
    "candidateMaxAge" INTEGER,
    "voterJurisdiction" TEXT NOT NULL DEFAULT 'LOCAL',
    "candidateJurisdiction" TEXT NOT NULL DEFAULT 'LOCAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "candidateId" TEXT,
    "trusteeId" TEXT,
    "positionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voter_lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "dob" TEXT,
    "age" INTEGER,
    "email" TEXT,
    "mulgam" TEXT,
    "phone" TEXT NOT NULL,
    "regionKarobari" TEXT,
    "regionYuvaPankh" TEXT,
    "regionTrustee" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hasVoted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voter_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otps" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameGujarati" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "electionType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trustees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameGujarati" TEXT,
    "voterId" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "zoneId" TEXT NOT NULL,
    "seat" TEXT NOT NULL,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trustees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "admins_userId_key" ON "admins"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_userId_key" ON "candidates"("userId");

-- CreateIndex
CREATE INDEX "candidates_electionId_idx" ON "candidates"("electionId");

-- CreateIndex
CREATE INDEX "candidates_status_idx" ON "candidates"("status");

-- CreateIndex
CREATE INDEX "candidates_region_idx" ON "candidates"("region");

-- CreateIndex
CREATE INDEX "candidates_position_idx" ON "candidates"("position");

-- CreateIndex
CREATE INDEX "candidates_zoneId_idx" ON "candidates"("zoneId");

-- CreateIndex
CREATE INDEX "candidates_createdAt_idx" ON "candidates"("createdAt");

-- CreateIndex
CREATE INDEX "candidates_userId_idx" ON "candidates"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "voters_userId_key" ON "voters"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "voters_voterId_key" ON "voters"("voterId");

-- CreateIndex
CREATE INDEX "voters_userId_idx" ON "voters"("userId");

-- CreateIndex
CREATE INDEX "voters_voterId_idx" ON "voters"("voterId");

-- CreateIndex
CREATE INDEX "voters_region_idx" ON "voters"("region");

-- CreateIndex
CREATE INDEX "voters_hasVoted_idx" ON "voters"("hasVoted");

-- CreateIndex
CREATE INDEX "voters_zoneId_idx" ON "voters"("zoneId");

-- CreateIndex
CREATE INDEX "voters_lastLoginAt_idx" ON "voters"("lastLoginAt");

-- CreateIndex
CREATE INDEX "elections_type_idx" ON "elections"("type");

-- CreateIndex
CREATE INDEX "elections_status_idx" ON "elections"("status");

-- CreateIndex
CREATE INDEX "elections_startDate_idx" ON "elections"("startDate");

-- CreateIndex
CREATE INDEX "elections_endDate_idx" ON "elections"("endDate");

-- CreateIndex
CREATE INDEX "elections_createdAt_idx" ON "elections"("createdAt");

-- CreateIndex
CREATE INDEX "positions_electionId_idx" ON "positions"("electionId");

-- CreateIndex
CREATE INDEX "positions_title_idx" ON "positions"("title");

-- CreateIndex
CREATE UNIQUE INDEX "positions_electionId_title_key" ON "positions"("electionId", "title");

-- CreateIndex
CREATE INDEX "votes_voterId_idx" ON "votes"("voterId");

-- CreateIndex
CREATE INDEX "votes_candidateId_idx" ON "votes"("candidateId");

-- CreateIndex
CREATE INDEX "votes_trusteeId_idx" ON "votes"("trusteeId");

-- CreateIndex
CREATE INDEX "votes_positionId_idx" ON "votes"("positionId");

-- CreateIndex
CREATE INDEX "votes_timestamp_idx" ON "votes"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "votes_voterId_positionId_key" ON "votes"("voterId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "voter_lists_phone_key" ON "voter_lists"("phone");

-- CreateIndex
CREATE INDEX "voter_lists_phone_idx" ON "voter_lists"("phone");

-- CreateIndex
CREATE INDEX "voter_lists_regionKarobari_idx" ON "voter_lists"("regionKarobari");

-- CreateIndex
CREATE INDEX "voter_lists_regionYuvaPankh_idx" ON "voter_lists"("regionYuvaPankh");

-- CreateIndex
CREATE INDEX "voter_lists_regionTrustee_idx" ON "voter_lists"("regionTrustee");

-- CreateIndex
CREATE INDEX "voter_lists_isActive_idx" ON "voter_lists"("isActive");

-- CreateIndex
CREATE INDEX "voter_lists_hasVoted_idx" ON "voter_lists"("hasVoted");

-- CreateIndex
CREATE INDEX "voter_lists_createdAt_idx" ON "voter_lists"("createdAt");

-- CreateIndex
CREATE INDEX "otps_phone_idx" ON "otps"("phone");

-- CreateIndex
CREATE INDEX "otps_expiresAt_idx" ON "otps"("expiresAt");

-- CreateIndex
CREATE INDEX "otps_isUsed_idx" ON "otps"("isUsed");

-- CreateIndex
CREATE INDEX "otps_createdAt_idx" ON "otps"("createdAt");

-- CreateIndex
CREATE INDEX "zones_code_idx" ON "zones"("code");

-- CreateIndex
CREATE INDEX "zones_electionType_idx" ON "zones"("electionType");

-- CreateIndex
CREATE INDEX "zones_isActive_idx" ON "zones"("isActive");

-- CreateIndex
CREATE INDEX "zones_createdAt_idx" ON "zones"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "zones_code_electionType_key" ON "zones"("code", "electionType");

-- CreateIndex
CREATE UNIQUE INDEX "trustees_voterId_key" ON "trustees"("voterId");

-- CreateIndex
CREATE INDEX "trustees_voterId_idx" ON "trustees"("voterId");

-- CreateIndex
CREATE INDEX "trustees_zoneId_idx" ON "trustees"("zoneId");

-- CreateIndex
CREATE INDEX "trustees_seat_idx" ON "trustees"("seat");

-- CreateIndex
CREATE INDEX "trustees_isEligible_idx" ON "trustees"("isEligible");

-- CreateIndex
CREATE INDEX "trustees_isActive_idx" ON "trustees"("isActive");

-- CreateIndex
CREATE INDEX "trustees_createdAt_idx" ON "trustees"("createdAt");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voters" ADD CONSTRAINT "voters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voters" ADD CONSTRAINT "voters_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "voters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_trusteeId_fkey" FOREIGN KEY ("trusteeId") REFERENCES "trustees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trustees" ADD CONSTRAINT "trustees_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
