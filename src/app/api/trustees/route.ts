import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cache, CacheKeys, CacheTTL } from '@/lib/cache'

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const zoneId = searchParams.get('zoneId')

    // Check cache first (but skip for now to ensure age filtering is applied)
    const cacheKey = CacheKeys.trustees(zoneId || undefined)
    const cached = cache.get(cacheKey)
    // Temporarily skip cache to ensure age filtering is applied
    // if (cached) {
    //   console.log('Returning cached trustees data')
    //   return NextResponse.json({ trustees: cached })
    // }

    // For selective elections, only active voters aged 45+ as of August 31, 2025 are eligible candidates
    // No approval process needed - all voters can vote for candidates from any zone
    // Age requirement: Only voters who are 45+ as of August 31, 2025 can receive votes as trustee candidates
    // Anyone who turns 45 after August 31, 2025 is NOT eligible
    console.log('Fetching eligible voters (45+ as of Aug 31, 2025) as trustee candidates from all zones (selective election)')
    
    // Get trustee zones - filter by zoneId if provided
    const zoneWhere: any = { electionType: 'TRUSTEES' }
    if (zoneId) {
      zoneWhere.id = zoneId
    }
    
    const trusteeZones = await prisma.zone.findMany({
      where: zoneWhere,
      orderBy: { name: 'asc' }
    })
    console.log(`Found ${trusteeZones.length} trustee zones:`, trusteeZones.map(z => z.name))

    // Helper function to calculate age as of a specific date
    const calculateAgeAsOf = (dob: Date | string | null | undefined, referenceDate: Date): number | null => {
      if (!dob) return null
      
      try {
        let birthDate: Date
        
        // Handle Date object
        if (dob instanceof Date) {
          birthDate = new Date(dob)
          if (isNaN(birthDate.getTime())) return null
        } 
        // Handle DD/MM/YYYY string format
        else if (typeof dob === 'string') {
          // Try DD/MM/YYYY format first
          const parts = dob.split('/')
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10) - 1 // JavaScript months are 0-indexed
            const year = parseInt(parts[2], 10)
            
            if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && day <= 31 && month >= 0 && month <= 11) {
              birthDate = new Date(year, month, day)
              // Validate the date was parsed correctly
              if (birthDate.getDate() === day && birthDate.getMonth() === month && birthDate.getFullYear() === year) {
                // Valid date
              } else {
                return null
              }
            } else {
              return null
            }
          } 
          // Try ISO format (YYYY-MM-DD)
          else if (dob.includes('-')) {
            birthDate = new Date(dob)
            if (isNaN(birthDate.getTime())) return null
          } 
          else {
            return null
          }
        } else {
          return null
        }
        
        // Validate birth date is not in the future
        if (birthDate > referenceDate) {
          console.warn(`Birth date ${birthDate} is in the future relative to cutoff ${referenceDate}`)
          return null
        }
        
        // Calculate age as of reference date
        let age = referenceDate.getFullYear() - birthDate.getFullYear()
        const monthDiff = referenceDate.getMonth() - birthDate.getMonth()
        
        if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
          age--
        }
        
        return age
      } catch (error) {
        console.error('Error calculating age:', error, dob)
        return null
      }
    }

    // Build voter where clause - filter by trusteeZoneId if zoneId is provided
    // We'll filter by age as of August 31, 2025 after fetching
    const voterWhere: any = { 
      isActive: true
    }
    if (zoneId) {
      voterWhere.trusteeZoneId = zoneId
    }

    // Get active voters (filtered by zone if zoneId provided)
    const allVoters = await prisma.voter.findMany({
      where: voterWhere,
      include: {
        user: true,
        trusteeZone: true // Use trusteeZone for voters
      },
      orderBy: { name: 'asc' }
    })
    
    // Eligibility cutoff date: August 31, 2025
    // Only voters who are 45+ as of this date are eligible
    // Anyone who turns 45 AFTER August 31, 2025 is NOT eligible
    const eligibilityCutoffDate = new Date('2025-08-31T23:59:59')
    const maxBirthDate = new Date('1980-08-31T23:59:59') // Must be born on or before Aug 31, 1980 to be 45+ by Aug 31, 2025
    
    // Filter voters who are 45+ as of August 31, 2025
    const voters = allVoters.filter(voter => {
      let ageAsOfCutoff: number | null = null
      
      // Priority 1: Use user.dateOfBirth (DateTime field) if available
      if (voter.user?.dateOfBirth) {
        ageAsOfCutoff = calculateAgeAsOf(voter.user.dateOfBirth, eligibilityCutoffDate)
      }
      // Priority 2: Use voter.dob (string in DD/MM/YYYY format) if available
      else if (voter.dob) {
        ageAsOfCutoff = calculateAgeAsOf(voter.dob, eligibilityCutoffDate)
      }
      // Priority 3: Fallback to voter.age field (less accurate)
      // Without DOB, we can't know exact birthday, so be conservative
      // Only include if they're already clearly 45+ or will definitely be 45+ by cutoff
      else if (voter.age !== null && voter.age !== undefined) {
        const today = new Date()
        const cutoffDate = new Date('2025-08-31')
        
        // If already 45+, they're definitely eligible
        if (voter.age >= 45) {
          ageAsOfCutoff = voter.age
        } 
        // If 44, they might turn 45 before or after cutoff
        // Since we don't know their birthday, be conservative
        else if (voter.age === 44) {
          // Calculate time until cutoff
          const timeUntilCutoff = cutoffDate.getTime() - today.getTime()
          const daysUntilCutoff = Math.ceil(timeUntilCutoff / (1000 * 60 * 60 * 24))
          
          // If cutoff is more than 365 days away, they'll definitely turn 45 before cutoff
          // (since they're already 44, they'll turn 45 within the next year)
          if (daysUntilCutoff > 365) {
            ageAsOfCutoff = 45 // Will definitely be 45+ by cutoff
          } else {
            // Too close to cutoff - can't guarantee they'll be 45+ by then
            // Exclude to be safe per requirements
            ageAsOfCutoff = null
          }
        }
        // If 43 or less, they won't be 45+ by cutoff
        else {
          ageAsOfCutoff = null
        }
      }
      
      // Must be 45 or older as of Aug 31, 2025
      const isEligible = ageAsOfCutoff !== null && ageAsOfCutoff >= 45
      
      if (!isEligible && (voter.user?.dateOfBirth || voter.dob || voter.age)) {
        // Debug logging for ineligible voters
        console.log(`Voter ${voter.name} (age: ${voter.age}, dob: ${voter.dob || voter.user?.dateOfBirth}) - calculated age as of cutoff: ${ageAsOfCutoff} - NOT ELIGIBLE`)
      }
      
      return isEligible
    })
    
    console.log(`Found ${allVoters.length} active voters${zoneId ? ` in zone ${zoneId}` : ''}`)
    console.log(`Eligible trustees (45+ as of Aug 31, 2025): ${voters.length} out of ${allVoters.length}`)
    console.log(`Voters with trustee zones:`, voters.filter(v => v.trusteeZoneId).length)
    
    // Debug: Log data availability
    const votersWithDob = allVoters.filter(v => v.user?.dateOfBirth || v.dob).length
    const votersWithAgeOnly = allVoters.filter(v => !v.user?.dateOfBirth && !v.dob && v.age !== null).length
    const votersWithNoAgeData = allVoters.filter(v => !v.user?.dateOfBirth && !v.dob && (v.age === null || v.age === undefined)).length
    console.log(`Data availability: ${votersWithDob} with DOB, ${votersWithAgeOnly} with age only, ${votersWithNoAgeData} with no age data`)
    
    // Debug: Log some examples of eligible voters
    if (voters.length > 0) {
      console.log('Sample eligible trustees:', voters.slice(0, 5).map(v => ({
        name: v.name,
        age: v.age,
        dob: v.dob || (v.user?.dateOfBirth ? v.user.dateOfBirth.toISOString().split('T')[0] : null),
        zone: v.trusteeZone?.name
      })))
    } else {
      console.warn('⚠️ No eligible trustees found! Checking sample voters...')
      const sampleVoters = allVoters.slice(0, 5)
      sampleVoters.forEach(v => {
        const dob = v.user?.dateOfBirth || v.dob
        const age = v.age
        console.log(`Sample voter: ${v.name}, age: ${age}, dob: ${dob}, hasUser: ${!!v.user}, hasDob: ${!!dob}`)
      })
    }

    // Group voters by their trustee zones
    const zoneMap: Record<string, any> = {}
    
    trusteeZones.forEach(zone => {
      zoneMap[zone.id] = {
        id: zone.id,
        name: zone.name,
        nameGujarati: zone.nameGujarati,
        code: zone.code,
        seats: zone.seats,
        trustees: []
      }
    })

    // Use a Set to track unique voter IDs to prevent duplicates
    const seenVoterIds = new Set<string>()

    // Assign voters to their trustee zones (deduplicate by voter ID)
    voters.forEach(voter => {
      if (voter.trusteeZoneId && zoneMap[voter.trusteeZoneId]) {
        // Skip if we've already added this voter
        if (seenVoterIds.has(voter.id)) {
          console.log(`Skipping duplicate voter: ${voter.id} - ${voter.name}`)
          return
        }
        
        seenVoterIds.add(voter.id)
        zoneMap[voter.trusteeZoneId].trustees.push({
          id: voter.id,
          name: voter.name,
          nameGujarati: voter.user?.name || voter.name,
          phone: voter.phone,
          email: voter.email,
          region: voter.region,
          city: voter.mulgam || voter.region || 'N/A', // Use mulgam (city) from database, fallback to region
          party: null, // Voters don't have party info by default
          manifesto: null,
          experience: null,
          education: null,
          position: 'Trustee',
          photoUrl: null, // Voters don't have photos by default
          seat: null, // Voters don't have seat assignment
          age: voter.age,
          gender: voter.gender,
          zone: {
            id: voter.trusteeZone?.id || voter.trusteeZoneId,
            name: voter.trusteeZone?.name || 'Unknown',
            nameGujarati: voter.trusteeZone?.nameGujarati || 'Unknown',
            code: voter.trusteeZone?.code || '',
            seats: voter.trusteeZone?.seats || 1
          }
        })
      }
    })

    // Convert to array format expected by the frontend
    // If zoneId is provided, only return trustees from that zone
    let filteredTrustees: any[] = []
    if (zoneId) {
      filteredTrustees = zoneMap[zoneId]?.trustees || []
    } else {
      filteredTrustees = Object.values(zoneMap).flatMap(zone => zone.trustees)
    }
    console.log(`Found ${filteredTrustees.length} unique voters as potential trustees${zoneId ? ` in zone ${zoneId}` : ''}`)

    // Final deduplication step: Remove any duplicates by ID (in case of any edge cases)
    const uniqueTrusteesMap = new Map<string, any>()
    filteredTrustees.forEach(trustee => {
      if (!uniqueTrusteesMap.has(trustee.id)) {
        uniqueTrusteesMap.set(trustee.id, trustee)
      } else {
        console.log(`Removing duplicate trustee: ${trustee.id} - ${trustee.name}`)
      }
    })
    filteredTrustees = Array.from(uniqueTrusteesMap.values())

    console.log(`Returning ${filteredTrustees.length} unique trustees total`)
    
    // Cache the result for 5 minutes
    cache.set(cacheKey, filteredTrustees, CacheTTL.MEDIUM)
    
    return NextResponse.json({ trustees: filteredTrustees })

  } catch (error) {
    console.error('Error fetching trustees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
