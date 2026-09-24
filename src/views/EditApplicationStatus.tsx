'use client'

// =================================================================
// ÉDITION DU STATUT D'UNE CANDIDATURE
// Permet de mettre à jour le statut, ajouter des notes, date entretien, etc.
// =================================================================

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Card from '../components/ui/Card'
import GoldButton from '../components/ui/GoldButton'
import { ArrowLeft, Calendar, FileText, DollarSign } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type ApplicationStatus = 'applied' | 'viewed' | 'interview_scheduled' | 'interview_completed' | 'offer_received' | 'accepted' | 'rejected' | 'withdrawn'

export default function EditApplicationStatus() {
  const { t, i18n } = useTranslation()
  const STATUSES: { value: ApplicationStatus; label: string }[] = [
    { value: 'applied', label: t('applicationsPage.status.applied') },
    { value: 'viewed', label: t('editAppStatusPage.viewedByRecruiter') },
    { value: 'interview_scheduled', label: t('applicationsPage.status.interview_scheduled') },
    { value: 'interview_completed', label: t('applicationsPage.status.interview_completed') },
    { value: 'offer_received', label: t('applicationsPage.status.offer_received') },
    { value: 'accepted', label: t('applicationsPage.status.accepted') },
    { value: 'rejected', label: t('applicationsPage.status.rejected') },
    { value: 'withdrawn', label: t('applicationsPage.status.withdrawn') }
  ]
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [application, setApplication] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    status: 'applied' as ApplicationStatus,
    notes: '',
    interview_date: '',
    interview_type: 'video',
    offer_amount: 0,
    offer_currency: 'USD',
    rejection_reason: ''
  })

  useEffect(() => {
    if (!id || !user) return
    fetchApplication()
  }, [id, user])

  const fetchApplication = async () => {
    const { data, error } = await supabase
      .from('applications_tracking')
      .select('*')
      .eq('id', id)
      .eq('user_id', user?.id)
      .single()

    if (!error && data) {
      setApplication(data)
      setFormData({
        status: data.status,
        notes: data.notes || '',
        interview_date: data.interview_date ? new Date(data.interview_date).toISOString().slice(0, 16) : '',
        interview_type: data.interview_type || 'video',
        offer_amount: data.offer_amount || 0,
        offer_currency: data.offer_currency || 'USD',
        rejection_reason: data.rejection_reason || ''
      })
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const updates: any = {
        status: formData.status,
        notes: formData.notes || null,
        interview_date: formData.interview_date ? new Date(formData.interview_date).toISOString() : null,
        interview_type: formData.interview_type || null,
        offer_amount: formData.offer_amount || null,
        offer_currency: formData.offer_currency || null,
        rejection_reason: formData.rejection_reason || null
      }

      const { error } = await supabase
        .from('applications_tracking')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      // Créer une notification selon le nouveau statut
      if (formData.status === 'interview_scheduled') {
        await fetch(`${window.location.origin}/api/notifications/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            type: 'application',
            title: t('editAppStatusPage.notifInterviewTitle', { title: application.job_title }),
            message: t('editAppStatusPage.notifInterviewMessage', { company: application.company, date: new Date(formData.interview_date).toLocaleDateString(i18n.language) }),
            actionUrl: `/applications/edit/${id}`,
            actionLabel: t('editAppStatusPage.view')
          })
        })
      } else if (formData.status === 'offer_received') {
        await fetch(`${window.location.origin}/api/notifications/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            type: 'application',
            title: t('editAppStatusPage.notifOfferTitle', { title: application.job_title }),
            message: t('editAppStatusPage.notifOfferMessage', { company: application.company, amount: formData.offer_amount, currency: formData.offer_currency }),
            actionUrl: `/applications/edit/${id}`,
            actionLabel: t('editAppStatusPage.viewOffer')
          })
        })
      } else if (formData.status === 'accepted') {
        await fetch(`${window.location.origin}/api/notifications/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            type: 'system',
            title: t('editAppStatusPage.notifAcceptedTitle'),
            message: t('editAppStatusPage.notifAcceptedMessage', { company: application.company }),
            actionUrl: `/profile`,
            actionLabel: t('editAppStatusPage.viewProfile')
          })
        })
      }

      router.push('/applications')
    } catch (error: any) {
      console.error('Erreur mise à jour:', error)
      alert(t('editAppStatusPage.updateError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">{t('editAppStatusPage.notFound')}</p>
          <GoldButton onClick={() => router.push('/applications')}>
            {t('editAppStatusPage.backToApplications')}
          </GoldButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 lg:ml-64 pt-20">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/applications')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('editAppStatusPage.backToApplications')}
        </button>

        <Card className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1">{application.job_title}</h1>
            <p className="text-gray-400">{application.company}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Statut */}
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
                {t('editAppStatusPage.statusLabel')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ApplicationStatus }))}
                className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Date entretien */}
            {['interview_scheduled', 'interview_completed'].includes(formData.status) && (
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  {t('editAppStatusPage.interviewDateLabel')}
                </label>
                <input
                  type="datetime-local"
                  value={formData.interview_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, interview_date: e.target.value }))}
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                />
                <div className="mt-3">
                  <label className="block text-sm font-bold text-gray-400 mb-2">{t('editAppStatusPage.interviewTypeLabel')}</label>
                  <select
                    value={formData.interview_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, interview_type: e.target.value }))}
                    className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                  >
                    <option value="phone">{t('editAppStatusPage.interviewPhone')}</option>
                    <option value="video">{t('editAppStatusPage.interviewVideo')}</option>
                    <option value="in-person">{t('editAppStatusPage.interviewInPerson')}</option>
                  </select>
                </div>
              </div>
            )}

            {/* Offre */}
            {['offer_received', 'accepted'].includes(formData.status) && (
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  {t('editAppStatusPage.offerAmountLabel')}
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={formData.offer_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, offer_amount: Number(e.target.value) }))}
                    className="flex-1 bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                    placeholder="50000"
                  />
                  <select
                    value={formData.offer_currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, offer_currency: e.target.value }))}
                    className="w-24 bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="XAF">XAF</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
            )}

            {/* Raison refus */}
            {formData.status === 'rejected' && (
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
                  {t('editAppStatusPage.rejectionReasonLabel')}
                </label>
                <input
                  type="text"
                  value={formData.rejection_reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, rejection_reason: e.target.value }))}
                  className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                  placeholder={t('editAppStatusPage.rejectionPlaceholder')}
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
                <FileText className="w-4 h-4 inline mr-2" />
                {t('editAppStatusPage.notesLabel')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full bg-[#0D0D0D] border border-[#2a2a2a] rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none resize-none"
                placeholder={t('editAppStatusPage.notesPlaceholder')}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <GoldButton
                type="button"
                variant="outlined"
                onClick={() => router.push('/applications')}
                fullWidth
              >
                {t('editAppStatusPage.cancel')}
              </GoldButton>
              <GoldButton
                type="submit"
                fullWidth
                loading={saving}
              >
                {t('editAppStatusPage.save')}
              </GoldButton>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
