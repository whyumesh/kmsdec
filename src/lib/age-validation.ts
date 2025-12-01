// Age validation utilities for election eligibility

export interface AgeRestrictions {
  voterMinAge?: number | null;
  voterMaxAge?: number | null;
  candidateMinAge?: number | null;
  candidateMaxAge?: number | null;
  voterJurisdiction: string;
  candidateJurisdiction: string;
}

export interface UserProfile {
  age?: number | null;
  dateOfBirth?: Date | null;
  jurisdiction: string;
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Check if user is eligible to vote in a specific election
 */
export function isEligibleToVote(
  user: UserProfile, 
  election: AgeRestrictions
): { eligible: boolean; reason?: string } {
  // Check jurisdiction
  if (election.voterJurisdiction === 'LOCAL' && user.jurisdiction !== 'LOCAL') {
    return { 
      eligible: false, 
      reason: 'You are not eligible to vote in this local election. Only local residents can participate.' 
    };
  }

  // Check age restrictions
  if (election.voterMinAge !== null && election.voterMinAge !== undefined) {
    if (!user.age || user.age < election.voterMinAge) {
      return { 
        eligible: false, 
        reason: `You must be at least ${election.voterMinAge} years old to vote in this election.` 
      };
    }
  }

  if (election.voterMaxAge !== null && election.voterMaxAge !== undefined) {
    if (!user.age || user.age > election.voterMaxAge) {
      return { 
        eligible: false, 
        reason: `You must be ${election.voterMaxAge} years old or younger to vote in this election.` 
      };
    }
  }

  return { eligible: true };
}

/**
 * Check if user is eligible to be a candidate in a specific election
 */
export function isEligibleToBeCandidate(
  user: UserProfile, 
  election: AgeRestrictions
): { eligible: boolean; reason?: string } {
  // Check jurisdiction
  if (election.candidateJurisdiction === 'LOCAL' && user.jurisdiction !== 'LOCAL') {
    return { 
      eligible: false, 
      reason: 'You are not eligible to be a candidate in this local election. Only local residents can participate.' 
    };
  }

  // Check age restrictions
  if (election.candidateMinAge !== null && election.candidateMinAge !== undefined) {
    if (!user.age || user.age < election.candidateMinAge) {
      return { 
        eligible: false, 
        reason: `You must be at least ${election.candidateMinAge} years old to be a candidate in this election.` 
      };
    }
  }

  if (election.candidateMaxAge !== null && election.candidateMaxAge !== undefined) {
    if (!user.age || user.age > election.candidateMaxAge) {
      return { 
        eligible: false, 
        reason: `You must be ${election.candidateMaxAge} years old or younger to be a candidate in this election.` 
      };
    }
  }

  return { eligible: true };
}

/**
 * Get election eligibility summary
 */
export function getElectionEligibilitySummary(electionType: string): {
  voterAge: string;
  candidateAge: string;
  jurisdiction: string;
} {
  switch (electionType) {
    case 'YUVA_PANK':
      return {
        voterAge: '18-40 years',
        candidateAge: '18-40 years',
        jurisdiction: 'Local residents only'
      };
    case 'KAROBARI_MEMBERS':
      return {
        voterAge: 'All ages',
        candidateAge: 'Above 25 years',
        jurisdiction: 'Local residents only'
      };
    case 'TRUSTEES':
      return {
        voterAge: 'All ages',
        candidateAge: 'Above 45 years',
        jurisdiction: 'All voters, Local candidates'
      };
    default:
      return {
        voterAge: 'Check election details',
        candidateAge: 'Check election details',
        jurisdiction: 'Check election details'
      };
  }
}
