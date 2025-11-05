import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function TagAutocomplete({ value, onChange, placeholder, className = '', rows = 3 }) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef(null)
  const suggestionsRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  // Get the word at cursor position
  const getCurrentWord = () => {
    const text = value || ''
    const before = text.substring(0, cursorPosition)
    const after = text.substring(cursorPosition)

    // Split by comma to get tags
    const beforeComma = before.split(',').pop().trim()
    const afterComma = after.split(',')[0].trim()

    return {
      word: beforeComma,
      startIndex: before.lastIndexOf(beforeComma),
      endIndex: cursorPosition + afterComma.length
    }
  }

  // Search for tags
  const searchTags = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/tags/search?q=${encodeURIComponent(query)}&limit=20`)
      const data = await response.json()

      if (data.success && data.results.length > 0) {
        setSuggestions(data.results)
        setShowSuggestions(true)
        setSelectedIndex(0)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('Tag search error:', error)
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Handle input change
  const handleChange = (e) => {
    const newValue = e.target.value
    const newCursorPos = e.target.selectionStart

    onChange(newValue)
    setCursorPosition(newCursorPos)

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      const { word } = getCurrentWord()
      searchTags(word)
    }, 300)
  }

  // Insert selected tag
  const insertTag = (tag) => {
    const { word, startIndex, endIndex } = getCurrentWord()
    const text = value || ''

    const before = text.substring(0, startIndex)
    const after = text.substring(endIndex)

    // Insert tag with comma separator
    const newText = before + tag + (after.startsWith(',') ? '' : ', ') + after.trimStart()

    onChange(newText)
    setShowSuggestions(false)
    setSuggestions([])

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newCursorPos = before.length + tag.length + 2
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // Adjust prompt weight for selected text
  const adjustPromptWeight = (increment) => {
    if (!textareaRef.current) return

    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const text = value || ''

    // If no selection, do nothing
    if (start === end) return

    const selectedText = text.substring(start, end).trim()
    if (!selectedText) return

    // Check if already wrapped with weight syntax: (text:1.0)
    const weightRegex = /^\((.+?):([\d.]+)\)$/
    const match = selectedText.match(weightRegex)

    let newText
    let newCursorEnd

    if (match) {
      // Already has weight syntax, adjust the weight
      const innerText = match[1]
      const currentWeight = parseFloat(match[2])
      const newWeight = Math.max(0.1, Math.min(2.0, currentWeight + increment)).toFixed(1)
      newText = `(${innerText}:${newWeight})`
      newCursorEnd = start + newText.length
    } else {
      // No weight syntax, wrap with default weight
      const initialWeight = increment > 0 ? 1.1 : 0.9
      newText = `(${selectedText}:${initialWeight.toFixed(1)})`
      newCursorEnd = start + newText.length
    }

    // Replace the selected text
    const before = text.substring(0, start)
    const after = text.substring(end)
    const updatedValue = before + newText + after

    onChange(updatedValue)

    // Restore selection after update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(start, newCursorEnd)
      }
    }, 0)
  }

  // Handle keyboard navigation and weight adjustment
  const handleKeyDown = (e) => {
    // Handle Cmd/Ctrl + Plus/Minus for weight adjustment
    if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
      e.preventDefault()
      adjustPromptWeight(0.1)
      return
    }

    if ((e.metaKey || e.ctrlKey) && (e.key === '-' || e.key === '_')) {
      e.preventDefault()
      adjustPromptWeight(-0.1)
      return
    }

    if (!showSuggestions || suggestions.length === 0) {
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % suggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
        break
      case 'Enter':
        if (e.ctrlKey || e.metaKey) {
          // Allow normal submit behavior with Ctrl/Cmd+Enter
          return
        }
        e.preventDefault()
        if (suggestions[selectedIndex]) {
          insertTag(suggestions[selectedIndex].tag)
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        setSuggestions([])
        break
    }
  }

  // Scroll selected suggestion into view
  useEffect(() => {
    if (suggestionsRef.current && showSuggestions) {
      const selectedElement = suggestionsRef.current.children[selectedIndex]
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex, showSuggestions])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target) &&
          suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => setCursorPosition(e.target.selectionStart)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-4 py-3 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none resize-none ${className}`}
      />

      {/* Tag Suggestions */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-bg-secondary border border-border-primary rounded-lg shadow-lg max-h-64 overflow-auto"
            ref={suggestionsRef}
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.tag}-${index}`}
                onClick={() => insertTag(suggestion.tag)}
                className={`px-4 py-2 cursor-pointer transition-colors duration-150 ${
                  index === selectedIndex
                    ? 'bg-accent-primary text-white'
                    : 'hover:bg-bg-hover text-text-primary'
                } ${index === 0 ? 'rounded-t-lg' : ''} ${index === suggestions.length - 1 ? 'rounded-b-lg' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono opacity-70">{suggestion.categoryLabel}</span>
                      <span className="font-medium truncate">{suggestion.tag}</span>
                    </div>
                    {suggestion.matchedText && suggestion.matchedText !== suggestion.tag && (
                      <div className="text-xs opacity-70 truncate mt-0.5">
                        alias: {suggestion.matchedText}
                      </div>
                    )}
                  </div>
                  <div className="text-xs opacity-50 font-mono">
                    {suggestion.postCount.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}

            {/* Help text */}
            <div className="px-4 py-2 border-t border-border-primary bg-bg-tertiary text-xs text-text-tertiary">
              <span className="font-mono">↑↓</span> navigate • <span className="font-mono">Enter</span> select • <span className="font-mono">Esc</span> close • <span className="font-mono">Cmd±</span> weight
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
