// =================================================================
// API pour créer des notifications
// Utilisé par l'onboarding, les scans, les candidatures, etc.
// =================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createNotification } from '../../../../src/lib/notifications'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, type, title, message, actionUrl, actionLabel, financialValue, requiresAction, data } = body

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'userId, type, title et message sont requis' },
        { status: 400 }
      )
    }

    const result = await createNotification({
      userId,
      type,
      title,
      message,
      actionUrl,
      actionLabel,
      financialValue,
      requiresAction,
      data
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Échec de création de la notification', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[notifications/create] Erreur:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
