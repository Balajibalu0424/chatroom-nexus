"use client"

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X, ArrowUp, ArrowDown } from 'lucide-react'
import type { Message } from '@/lib/types'

interface SearchMessagesProps {
  onSearch: (query: string) => void
  results: Message[]
  onResultClick: (index: number) => void
  highlighted: number
}

export function SearchMessages({ onSearch, results, onResultClick, highlighted }: SearchMessagesProps) {
  const [query, setQuery] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    onSearch(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey && highlighted > 0) {
        // Go to previous
        onResultClick(highlighted - 1)
      } else if (!e.shiftKey && highlighted < results.length - 1) {
        // Go to next
        onResultClick(highlighted + 1)
      }
    }
  }

  const clearSearch = () => {
    setQuery('')
    onSearch('')
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search messages..."
          className="pl-9 pr-16"
          autoFocus
        />
        {query && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {results.length > 0 ? `${highlighted + 1}/${results.length}` : '0 results'}
            </span>
            {results.length > 0 && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => onResultClick(Math.max(0, highlighted - 1))}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => onResultClick(Math.min(results.length - 1, highlighted + 1))}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={clearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      
      {query && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No messages found
        </p>
      )}
    </div>
  )
}
