'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { analysePost } from '../../lib/gemini'
import Card from '../ui/Card'
import GoldButton from '../ui/GoldButton'
import { Send, Sparkles } from 'lucide-react'

export default function CreatePost({ onPostCreated }: { onPostCreated: () => void }) {
  const { user, profile } = useAuth()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)

  const canPost = profile?.verification_status === 'verified' || profile?.verification_status === 'genius'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !user) return

    setLoading(true)
    try {
      // Gemini Analysis
      const analysis = await analysePost(content)
      
      if (analysis.quality_score < 50) {
        setSuggestion(analysis.suggestion)
        setLoading(false)
        return
      }

      const { error } = await supabase.from('posts').insert({
        author_id: user.id,
        content: content,
        is_genius_post: profile?.verification_status === 'genius'
      })

      if (error) throw error
      
      setContent('')
      setSuggestion(null)
      onPostCreated()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!canPost) {
    return (
      <Card className="p-6 bg-[#1A1500] border-[#D4AF37]/20">
        <p className="text-sm text-[#D4AF37] font-medium text-center">
          Only VERIFIED and GENIUS members can share insights with the network.
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share an insight, achievement, or opportunity..."
          className="w-full bg-transparent border-none outline-none resize-none min-h-[100px] text-gray-300 placeholder-gray-600"
        />
        
        {suggestion && (
          <div className="bg-[#1A1500] border border-[#D4AF37]/20 p-3 rounded-lg flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <div className="text-xs text-gray-400">
              <span className="text-[#D4AF37] font-bold">Searcher Tip:</span> {suggestion}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <GoldButton type="submit" loading={loading} disabled={!content.trim()}>
            Post Insight <Send className="w-4 h-4" />
          </GoldButton>
        </div>
      </form>
    </Card>
  )
}

