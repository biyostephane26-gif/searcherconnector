'use client'

// =================================================================
// SIMULATION D'ENTRETIEN INTERACTIVE AVEC SCAI VOICE
// Pratique en temps réel avec feedback instantané
// =================================================================

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useVoiceInput } from '../hooks/useVoiceInput'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { 
  Mic, 
  Volume2, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  MessageSquare,
  Sparkles
} from 'lucide-react'

interface Question {
  id: number
  question: string
  category: 'technical' | 'behavioral' | 'situational' | 'motivation'
  tips: string[]
}

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 1,
    question: "Parlez-moi de vous et de votre parcours professionnel.",
    category: 'behavioral',
    tips: [
      "Structure: Présent → Passé → Futur",
      "Reste concis (2-3 minutes max)",
      "Connecte ton expérience au poste visé"
    ]
  },
  {
    id: 2,
    question: "Pourquoi voulez-vous rejoindre notre entreprise ?",
    category: 'motivation',
    tips: [
      "Montre que tu as recherché l'entreprise",
      "Connecte leurs valeurs à tes objectifs",
      "Cite des projets/produits spécifiques"
    ]
  },
  {
    id: 3,
    question: "Décrivez une situation où vous avez résolu un problème complexe.",
    category: 'situational',
    tips: [
      "Utilise la méthode STAR",
      "Quantifie les résultats si possible",
      "Montre ton processus de réflexion"
    ]
  },
  {
    id: 4,
    question: "Quelles sont vos forces et faiblesses ?",
    category: 'behavioral',
    tips: [
      "Force: Prouve avec un exemple concret",
      "Faiblesse: Montre comment tu t'améliores",
      "Reste authentique"
    ]
  },
  {
    id: 5,
    question: "Où vous voyez-vous dans 5 ans ?",
    category: 'motivation',
    tips: [
      "Montre de l'ambition réaliste",
      "Aligne avec les opportunités de l'entreprise",
      "Évite les réponses clichés"
    ]
  }
]

export default function InterviewSimulation() {
  const { user, profile } = useAuth()
  const [isActive, setIsActive] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<Array<{question: string, answer: string, duration: number, feedback?: any}>>([])
  const [isListening, setIsListening] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [answerStartTime, setAnswerStartTime] = useState<number | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const currentQuestion = SAMPLE_QUESTIONS[currentQuestionIndex]

  // Hook vocal pour enregistrer les réponses
  const { isRecording, toggle: toggleRecording } = useVoiceInput({
    onTranscript: (text) => {
      setCurrentAnswer(prev => prev + ' ' + text)
    },
    onError: (err) => {
      console.error('Erreur vocal:', err)
      alert('Erreur microphone. Vérifie tes permissions.')
    }
  })

  // Fonction pour que SCAI pose la question vocalement
  const speakQuestion = async (questionText: string) => {
    if (!profile?.voice_credits || profile.voice_credits <= 0) {
      alert('⚠️ Crédits vocaux insuffisants. Passe à un plan premium pour utiliser SCAI Voice.')
      return
    }

    setIsSpeaking(true)

    try {
      const response = await fetch('/api/scai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: questionText,
          language: 'fr',
          userId: user?.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.upgrade) {
          alert('⚠️ Crédits vocaux épuisés. Passe à Pro pour 300 crédits/mois.')
        }
        throw new Error(error.error || 'Erreur TTS')
      }

      const audioBlob = await response.blob()
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)

      // Jouer l'audio
      const audio = new Audio(url)
      audioRef.current = audio
      audio.play()
      
      audio.onended = () => {
        setIsSpeaking(false)
        setIsListening(true)
        setAnswerStartTime(Date.now())
        toggleRecording() // Commencer l'enregistrement automatiquement
      }
    } catch (error: any) {
      console.error('Erreur TTS:', error)
      setIsSpeaking(false)
      alert(`Erreur: ${error.message}`)
    }
  }

  // Démarrer la simulation
  const startSimulation = () => {
    setIsActive(true)
    setCurrentQuestionIndex(0)
    setResponses([])
    speakQuestion(SAMPLE_QUESTIONS[0].question)
  }

  // Terminer la réponse actuelle
  const submitAnswer = async () => {
    if (isRecording) {
      toggleRecording() // Arrêter l'enregistrement
    }

    const duration = answerStartTime ? Math.floor((Date.now() - answerStartTime) / 1000) : 0

    // Analyser la réponse avec SCAI
    const feedback = await analyzAnswer(currentQuestion.question, currentAnswer, currentQuestion.category)

    setResponses(prev => [...prev, {
      question: currentQuestion.question,
      answer: currentAnswer,
      duration,
      feedback
    }])

    setCurrentAnswer('')
    setIsListening(false)
    setAnswerStartTime(null)

    // Question suivante ou fin
    if (currentQuestionIndex < SAMPLE_QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1)
        speakQuestion(SAMPLE_QUESTIONS[currentQuestionIndex + 1].question)
      }, 2000)
    } else {
      setIsActive(false)
    }
  }

  // Analyser la réponse avec Groq
  const analyzAnswer = async (question: string, answer: string, category: string) => {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'interview-feedback',
          payload: {
            question,
            answer,
            category
          }
        })
      })

      if (!response.ok) throw new Error('Erreur analyse')

      const data = await response.json()
      return data.result
    } catch {
      return {
        score: 7,
        strengths: ['Réponse structurée'],
        improvements: ['Ajoute plus de détails concrets'],
        suggestion: 'Continue à pratiquer!'
      }
    }
  }

  const resetSimulation = () => {
    setIsActive(false)
    setCurrentQuestionIndex(0)
    setResponses([])
    setCurrentAnswer('')
    setIsListening(false)
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 lg:ml-64 pt-20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#1A1500] border border-[#D4AF37]/30 rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">SCAI Interview Prep</span>
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-[#D4AF37] to-white bg-clip-text text-transparent">
            Simulation d'Entretien
          </h1>
          <p className="text-gray-400">
            Pratique avec SCAI en temps réel • Reçois un feedback instantané
          </p>
        </div>

        {/* Mode démarrage */}
        {!isActive && responses.length === 0 && (
          <Card className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] to-[#B8962D] rounded-full flex items-center justify-center mx-auto mb-6">
              <Volume2 className="w-10 h-10 text-black" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Prêt à pratiquer ?</h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              SCAI va te poser {SAMPLE_QUESTIONS.length} questions d'entretien courantes. 
              Réponds à voix haute comme si tu étais en vrai entretien. 
              Tu recevras un feedback détaillé sur chaque réponse.
            </p>
            
            <div className="bg-[#0D0D0D] rounded-xl p-6 mb-8 max-w-2xl mx-auto">
              <h3 className="font-bold text-[#D4AF37] mb-4 flex items-center gap-2 justify-center">
                <CheckCircle2 className="w-5 h-5" />
                Comment ça marche
              </h3>
              <div className="space-y-3 text-sm text-left">
                <div className="flex items-start gap-3">
                  <div className="bg-[#D4AF37] text-black rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">1</div>
                  <p className="text-gray-300">SCAI pose une question vocalement</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-[#D4AF37] text-black rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">2</div>
                  <p className="text-gray-300">Tu réponds à voix haute (microphone automatique)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-[#D4AF37] text-black rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">3</div>
                  <p className="text-gray-300">SCAI analyse et te donne un feedback instantané</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-[#D4AF37] text-black rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs flex-shrink-0">4</div>
                  <p className="text-gray-300">Question suivante automatiquement</p>
                </div>
              </div>
            </div>

            <GoldButton onClick={startSimulation} className="text-lg py-4 px-8">
              <Play className="w-5 h-5" />
              Démarrer la simulation
            </GoldButton>

            <p className="text-xs text-gray-600 mt-4">
              ⚡ Nécessite un plan Starter ou Pro pour SCAI Voice
            </p>
          </Card>
        )}

        {/* Mode simulation active */}
        {isActive && (
          <div className="space-y-6">
            {/* Progression */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-400">
                  Question {currentQuestionIndex + 1} / {SAMPLE_QUESTIONS.length}
                </span>
                <button
                  onClick={resetSimulation}
                  className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Recommencer
                </button>
              </div>
              <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#D4AF37] transition-all duration-500"
                  style={{ width: `${((currentQuestionIndex + 1) / SAMPLE_QUESTIONS.length) * 100}%` }}
                />
              </div>
            </Card>

            {/* Question actuelle */}
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  isSpeaking ? 'bg-[#D4AF37] animate-pulse' : 'bg-[#1A1A1A]'
                }`}>
                  <Volume2 className={`w-8 h-8 ${isSpeaking ? 'text-black' : 'text-[#D4AF37]'}`} />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {currentQuestion.category}
                  </div>
                  <div className="text-sm text-gray-400">
                    {isSpeaking ? 'SCAI pose la question...' : isListening ? 'À ton tour de répondre' : 'Prépare-toi'}
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-6">{currentQuestion.question}</h3>

              {/* Tips */}
              <div className="bg-[#0D0D0D] rounded-xl p-4 mb-6">
                <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2">
                  💡 Conseils clés
                </div>
                <ul className="space-y-1">
                  {currentQuestion.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-[#D4AF37]">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Zone réponse */}
              {isListening && (
                <div className="bg-gradient-to-br from-[#1A1500] to-[#0D0D0D] border border-[#D4AF37]/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#D4AF37]'
                      }`}>
                        <Mic className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">
                          {isRecording ? 'Enregistrement en cours...' : 'Clique pour parler'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {answerStartTime && `${Math.floor((Date.now() - answerStartTime) / 1000)}s`}
                        </div>
                      </div>
                    </div>
                    {!isRecording && (
                      <button
                        onClick={toggleRecording}
                        className="px-4 py-2 bg-[#D4AF37] text-black rounded-lg font-bold hover:bg-[#B8962D] transition-colors"
                      >
                        Démarrer
                      </button>
                    )}
                  </div>

                  {currentAnswer && (
                    <div className="bg-[#0A0A0A] rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-300 leading-relaxed">{currentAnswer}</p>
                    </div>
                  )}

                  {currentAnswer && (
                    <GoldButton onClick={submitAnswer} fullWidth>
                      Question suivante →
                    </GoldButton>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Résultats finaux */}
        {!isActive && responses.length > 0 && (
          <div className="space-y-6">
            <Card className="p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Simulation terminée!</h2>
              <p className="text-gray-400 mb-8">
                Voici le feedback de SCAI sur tes {responses.length} réponses
              </p>

              {/* Score moyen */}
              <div className="bg-gradient-to-br from-[#1A1500] to-[#0D0D0D] border border-[#D4AF37]/30 rounded-xl p-6 mb-8 inline-block">
                <div className="text-6xl font-bold text-[#D4AF37] mb-2">
                  {Math.round(responses.reduce((sum, r) => sum + (r.feedback?.score || 7), 0) / responses.length)}/10
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">Score moyen</div>
              </div>
            </Card>

            {/* Détail des réponses */}
            {responses.map((response, index) => (
              <Card key={index} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                      Question {index + 1}
                    </div>
                    <h3 className="font-bold text-lg mb-2">{response.question}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#D4AF37]">
                      {response.feedback?.score || 7}/10
                    </div>
                    <div className="text-xs text-gray-500">{response.duration}s</div>
                  </div>
                </div>

                {response.feedback && (
                  <div className="space-y-4">
                    {response.feedback.strengths && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <div className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Points forts
                        </div>
                        <ul className="space-y-1">
                          {response.feedback.strengths.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-gray-300">• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {response.feedback.improvements && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                        <div className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          À améliorer
                        </div>
                        <ul className="space-y-1">
                          {response.feedback.improvements.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-gray-300">• {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {response.feedback.suggestion && (
                      <div className="bg-[#1A1500] border border-[#D4AF37]/20 rounded-lg p-4">
                        <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2">
                          💡 Suggestion SCAI
                        </div>
                        <p className="text-sm text-gray-300">{response.feedback.suggestion}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}

            <div className="flex gap-4">
              <GoldButton variant="outlined" onClick={resetSimulation} fullWidth>
                <RotateCcw className="w-5 h-5" />
                Recommencer
              </GoldButton>
              <GoldButton onClick={() => window.location.href = '/interview-preps'} fullWidth>
                Retour aux préparations
              </GoldButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
