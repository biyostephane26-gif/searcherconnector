import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '../../../../src/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()
    if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 })
    await sendWelcomeEmail({ to: email, name: name || 'Cher utilisateur' })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false })
  }
}
