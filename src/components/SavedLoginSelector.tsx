'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  User, 
  ChevronDown, 
  Trash2, 
  Clock, 
  Shield, 
  Users, 
  Vote,
  Eye,
  EyeOff,
  Building
} from 'lucide-react';
import { 
  getSavedCredentials, 
  getSavedCredentialPassword, 
  removeSavedCredential,
  updateLastUsed,
  type SavedCredential 
} from '@/lib/saved-credentials';

interface SavedLoginSelectorProps {
  onCredentialSelect: (email: string, password: string) => void;
  role: 'ADMIN' | 'CANDIDATE' | 'VOTER' | 'KAROBARI_ADMIN';
  className?: string;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return <Shield className="h-4 w-4 text-red-500" />;
    case 'CANDIDATE':
      return <Users className="h-4 w-4 text-blue-500" />;
    case 'VOTER':
      return <Vote className="h-4 w-4 text-green-500" />;
    case 'KAROBARI_ADMIN':
      return <Building className="h-4 w-4 text-purple-500" />;
    default:
      return <User className="h-4 w-4 text-gray-500" />;
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'CANDIDATE':
      return 'Candidate';
    case 'VOTER':
      return 'Voter';
    case 'KAROBARI_ADMIN':
      return 'Karobari Admin';
    default:
      return 'User';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export default function SavedLoginSelector({ 
  onCredentialSelect, 
  role, 
  className = '' 
}: SavedLoginSelectorProps) {
  const [savedCredentials, setSavedCredentials] = useState<SavedCredential[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const credentials = getSavedCredentials();
    const filteredCredentials = credentials.filter(cred => cred.role === role);
    setSavedCredentials(filteredCredentials);
  }, [role]);

  const handleCredentialSelect = (credential: SavedCredential) => {
    const password = getSavedCredentialPassword(credential.id);
    if (password) {
      onCredentialSelect(credential.email, password);
      updateLastUsed(credential.id);
      setIsOpen(false);
    }
  };

  const handleRemoveCredential = (credentialId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (removeSavedCredential(credentialId)) {
      setSavedCredentials(prev => prev.filter(cred => cred.id !== credentialId));
    }
  };

  const togglePasswordVisibility = (credentialId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPasswords(prev => ({
      ...prev,
      [credentialId]: !prev[credentialId]
    }));
  };

  if (savedCredentials.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-between text-left font-normal"
          >
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Select saved account ({savedCredentials.length})</span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-80 p-0" align="start">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-sm text-gray-900">
              Saved {getRoleLabel(role)} Accounts
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Click on an account to auto-fill login details
            </p>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {savedCredentials.map((credential, index) => (
              <div key={credential.id}>
                <DropdownMenuItem
                  className="p-3 cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                  onSelect={() => handleCredentialSelect(credential)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getRoleIcon(credential.role)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {credential.displayName}
                          </p>
                          <span className="text-xs text-gray-500">
                            ({getRoleLabel(credential.role)})
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {credential.email}
                        </p>
                        <div className="flex items-center space-x-1 mt-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-400">
                            Last used {formatDate(credential.lastUsed)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-200"
                        onClick={(e) => togglePasswordVisibility(credential.id, e)}
                      >
                        {showPasswords[credential.id] ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-100 text-red-500"
                        onClick={(e) => handleRemoveCredential(credential.id, e)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {showPasswords[credential.id] && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
                      Password: ••••••••
                    </div>
                  )}
                </DropdownMenuItem>
                {index < savedCredentials.length - 1 && <DropdownMenuSeparator />}
              </div>
            ))}
          </div>
          
          <div className="p-2 border-t bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              Passwords are encrypted and stored locally
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
