import { useState, useRef, useCallback } from 'react'

interface UseVoiceInputOptions {
  onTranscript?: (text: string) => void
  onError?: (error: Error) => void
  language?: string
}

export function useVoiceInput({
  onTranscript,
  onError,
  language = 'fr-FR'
}: UseVoiceInputOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef<any>(null)

  const toggle = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      const error = new Error('Speech Recognition API non supportée par ce navigateur')
      onError?.(error)
      return
    }

    if (isRecording) {
      // Arrêter l'enregistrement
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      // Démarrer l'enregistrement
      try {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        const recognition = new SpeechRecognition()
        
        recognition.lang = language
        recognition.continuous = true
        recognition.interimResults = true
        
        recognition.onstart = () => {
          setIsRecording(true)
        }
        
        recognition.onresult = (event: any) => {
          let interimTranscript = ''
          let finalTranscript = ''
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPart = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcriptPart + ' '
            } else {
              interimTranscript += transcriptPart
            }
          }
          
          setInterimText(interimTranscript)

          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript)
            onTranscript?.(finalTranscript.trim())
          }
        }
        
        recognition.onerror = (event: any) => {
          console.error('[useVoiceInput] Erreur reconnaissance:', event.error)
          setIsRecording(false)
          onError?.(new Error(event.error))
        }
        
        recognition.onend = () => {
          setIsRecording(false)
        }
        
        recognitionRef.current = recognition
        recognition.start()
      } catch (error: any) {
        console.error('[useVoiceInput] Erreur initialisation:', error)
        setIsRecording(false)
        onError?.(error)
      }
    }
  }, [isRecording, language, onTranscript, onError])

  return {
    isRecording,
    isProcessing: isRecording, // pas de phase distincte avec Web Speech API — alias sur isRecording
    transcript,
    interimText,
    toggle,
    error: null
  }
}
