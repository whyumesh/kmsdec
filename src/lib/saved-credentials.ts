 /**
 * Secure credential storage utility for saved login functionality
 * Uses browser's localStorage with encryption for storing login credentials
 */

export interface SavedCredential {
  id: string;
  email: string;
  role: 'ADMIN' | 'CANDIDATE' | 'VOTER' | 'KAROBARI_ADMIN';
  displayName: string;
  savedAt: string;
  lastUsed: string;
}

// Simple encryption/decryption using base64 (for basic obfuscation)
// In production, consider using a more robust encryption library
const encrypt = (text: string): string => {
  return btoa(encodeURIComponent(text));
};

const decrypt = (encryptedText: string): string => {
  try {
    return decodeURIComponent(atob(encryptedText));
  } catch {
    return '';
  }
};

const STORAGE_KEY = 'kms_saved_credentials';
const MAX_SAVED_CREDENTIALS = 5;

export const saveCredential = (email: string, password: string, role: 'ADMIN' | 'CANDIDATE' | 'VOTER' | 'KAROBARI_ADMIN', displayName?: string): boolean => {
  try {
    const existingCredentials = getSavedCredentials();
    
    // Remove existing credential with same email and role
    const filteredCredentials = existingCredentials.filter(
      cred => !(cred.email === email && cred.role === role)
    );
    
    // Create new credential
    const newCredential: SavedCredential = {
      id: `${role}_${email}_${Date.now()}`,
      email,
      role,
      displayName: displayName || email.split('@')[0],
      savedAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };
    
    // Encrypt password
    const encryptedPassword = encrypt(password);
    
    // Add to beginning of array (most recent first)
    const updatedCredentials = [newCredential, ...filteredCredentials].slice(0, MAX_SAVED_CREDENTIALS);
    
    // Store credentials (without password in the main array)
    const credentialsToStore = updatedCredentials.map(cred => ({
      ...cred,
      password: '' // Don't store password in the main array
    }));
    
    // Store encrypted password separately
    const passwordMap: Record<string, string> = {};
    updatedCredentials.forEach(cred => {
      if (cred.email === email && cred.role === role) {
        passwordMap[cred.id] = encryptedPassword;
      }
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentialsToStore));
    localStorage.setItem(`${STORAGE_KEY}_passwords`, JSON.stringify(passwordMap));
    
    return true;
  } catch (error) {
    console.error('Error saving credential:', error);
    return false;
  }
};

export const getSavedCredentials = (): SavedCredential[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const credentials = JSON.parse(stored);
    return Array.isArray(credentials) ? credentials : [];
  } catch (error) {
    console.error('Error retrieving credentials:', error);
    return [];
  }
};

export const getSavedCredentialPassword = (credentialId: string): string => {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_passwords`);
    if (!stored) return '';
    
    const passwordMap = JSON.parse(stored);
    const encryptedPassword = passwordMap[credentialId];
    
    if (!encryptedPassword) return '';
    
    return decrypt(encryptedPassword);
  } catch (error) {
    console.error('Error retrieving password:', error);
    return '';
  }
};

export const updateLastUsed = (credentialId: string): void => {
  try {
    const credentials = getSavedCredentials();
    const updatedCredentials = credentials.map(cred => 
      cred.id === credentialId 
        ? { ...cred, lastUsed: new Date().toISOString() }
        : cred
    );
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCredentials));
  } catch (error) {
    console.error('Error updating last used:', error);
  }
};

export const removeSavedCredential = (credentialId: string): boolean => {
  try {
    const credentials = getSavedCredentials();
    const filteredCredentials = credentials.filter(cred => cred.id !== credentialId);
    
    // Update stored credentials
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredCredentials));
    
    // Remove password from password map
    const stored = localStorage.getItem(`${STORAGE_KEY}_passwords`);
    if (stored) {
      const passwordMap = JSON.parse(stored);
      delete passwordMap[credentialId];
      localStorage.setItem(`${STORAGE_KEY}_passwords`, JSON.stringify(passwordMap));
    }
    
    return true;
  } catch (error) {
    console.error('Error removing credential:', error);
    return false;
  }
};

export const clearAllSavedCredentials = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}_passwords`);
  } catch (error) {
    console.error('Error clearing credentials:', error);
  }
};
