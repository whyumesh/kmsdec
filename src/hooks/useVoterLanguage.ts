import { useState, useEffect } from 'react'

const LANGUAGE_STORAGE_KEY = 'voter-language-preference'

export function useVoterLanguage() {
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'gujarati'>(() => {
    // Initialize from localStorage if available, otherwise default to 'english'
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
      if (saved === 'english' || saved === 'gujarati') {
        return saved as 'english' | 'gujarati'
      }
    }
    return 'english'
  })

  // Save to localStorage whenever language changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLanguage)
    }
  }, [selectedLanguage])

  const toggleLanguage = () => {
    setSelectedLanguage(prev => prev === 'english' ? 'gujarati' : 'english')
  }

  return {
    selectedLanguage,
    setSelectedLanguage,
    toggleLanguage
  }
}

