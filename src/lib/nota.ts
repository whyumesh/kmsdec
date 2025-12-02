import { prisma } from '@/lib/db'

type ZoneInfo = {
  id: string
  name: string
  nameGujarati: string | null
}

async function getZoneInfo(zoneId: string): Promise<ZoneInfo | null> {
  return prisma.zone.findUnique({
    where: { id: zoneId },
    select: { id: true, name: true, nameGujarati: true }
  })
}

export async function getOrCreateTrusteeNotaCandidate(zoneId: string) {
  const existing = await prisma.trusteeCandidate.findFirst({
    where: { zoneId, position: 'NOTA' },
    select: { id: true }
  })
  if (existing) return existing.id

  const zone = await getZoneInfo(zoneId)
  const displayName = zone ? `NOTA - ${zone.name}` : 'NOTA'

  const candidate = await prisma.trusteeCandidate.create({
    data: {
      name: displayName,
      nameGujarati: zone?.nameGujarati || displayName,
      region: 'NOTA',
      position: 'NOTA',
      seat: 'NOTA',
      status: 'APPROVED',
      zoneId,
      isOnlineRegistration: false
    },
    select: { id: true }
  })
  return candidate.id
}

export async function getOrCreateTrusteeNotaCandidateForSeat(zoneId: string, seatIndex: string) {
  // Create unique NOTA candidate for each seat position to allow multiple NOTA votes per zone
  const seatPosition = `NOTA_SEAT_${seatIndex}`
  const existing = await prisma.trusteeCandidate.findFirst({
    where: { zoneId, position: seatPosition },
    select: { id: true }
  })
  if (existing) return existing.id

  const zone = await getZoneInfo(zoneId)
  const displayName = zone ? `NOTA - ${zone.name} (Seat ${seatIndex})` : `NOTA (Seat ${seatIndex})`

  const candidate = await prisma.trusteeCandidate.create({
    data: {
      name: displayName,
      nameGujarati: zone?.nameGujarati ? `${zone.nameGujarati} (સીટ ${seatIndex})` : `NOTA (સીટ ${seatIndex})`,
      region: 'NOTA',
      position: seatPosition,
      seat: 'NOTA',
      status: 'APPROVED',
      zoneId,
      isOnlineRegistration: false
    },
    select: { id: true }
  })
  return candidate.id
}

export async function getOrCreateKarobariNotaCandidate(zoneId: string) {
  const existing = await prisma.karobariCandidate.findFirst({
    where: { zoneId, position: 'NOTA' },
    select: { id: true }
  })
  if (existing) return existing.id

  const zone = await getZoneInfo(zoneId)
  const displayName = zone ? `NOTA - ${zone.name}` : 'NOTA'

  const candidate = await prisma.karobariCandidate.create({
    data: {
      name: displayName,
      email: null,
      phone: null,
      party: 'NOTA',
      manifesto: null,
      status: 'APPROVED',
      position: 'NOTA',
      region: 'NOTA',
      zoneId,
      isOnlineRegistration: false
    },
    select: { id: true }
  })
  return candidate.id
}

export async function getOrCreateYuvaNotaCandidate(zoneId: string) {
  const existing = await prisma.yuvaPankhCandidate.findFirst({
    where: { zoneId, position: 'NOTA' },
    select: { id: true }
  })
  if (existing) return existing.id

  const zone = await getZoneInfo(zoneId)
  const displayName = zone ? `NOTA - ${zone.name}` : 'NOTA'

  const candidate = await prisma.yuvaPankhCandidate.create({
    data: {
      name: displayName,
      email: null,
      phone: null,
      party: 'NOTA',
      manifesto: null,
      status: 'APPROVED',
      region: 'NOTA',
      position: 'NOTA',
      zoneId,
      isOnlineRegistration: false
    },
    select: { id: true }
  })
  return candidate.id
}

