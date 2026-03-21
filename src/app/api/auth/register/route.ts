import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma/client'
import type { ApiResponse } from '@/types'

const RegisterSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('TENANT'),
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(2),
  }),
  z.object({
    role: z.literal('AGENT'),
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    regieId: z.string().uuid().optional(),
    invitationToken: z.string().optional(),
  }),
  z.object({
    role: z.literal('LANDLORD'),
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    ownerInviteToken: z.string().optional(),
  }),
])

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ userId: string }>>> {
  try {
    const body = await req.json()
    const parsed = RegisterSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data
    const supabase = createSupabaseServiceClient()

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // auto-confirm in dev; set to false for email verification in prod
    })

    if (authError || !authData.user) {
      if (authError?.message?.includes('already registered')) {
        return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 409 })
      }
      return NextResponse.json({ success: false, error: authError?.message ?? 'Registration failed' }, { status: 400 })
    }

    // Create DB user + profile in transaction
    const dbUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: authData.user.id, // match Supabase Auth UUID
          email: data.email,
          role: data.role,
        },
      })

      if (data.role === 'TENANT') {
        await tx.tenantProfile.create({
          data: {
            userId: user.id,
            fullName: data.fullName,
            residencePermitType: 'CITIZEN',
            employmentType: 'EMPLOYED',
          },
        })
      } else if (data.role === 'AGENT') {
        // Handle invitation token
        let regieId = data.regieId
        let isAdmin = false

        if (data.invitationToken) {
          const invitation = await tx.agentInvitation.findUnique({
            where: { token: data.invitationToken },
          })
          if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
            throw new Error('Invalid or expired invitation token')
          }
          if (invitation.email !== data.email) {
            throw new Error('Invitation email does not match')
          }
          regieId = invitation.regieId
          await tx.agentInvitation.update({
            where: { id: invitation.id },
            data: { acceptedAt: new Date() },
          })
        }

        if (!regieId) {
          throw new Error('Régie ID required for agent registration')
        }

        // First agent in a régie becomes company admin
        const existingAgents = await tx.agentProfile.count({ where: { regieId } })
        if (existingAgents === 0) {
          isAdmin = true
          await tx.regie.update({ where: { id: regieId }, data: { hasAccount: true } })
        }

        await tx.agentProfile.create({
          data: {
            userId: user.id,
            regieId,
            firstName: data.firstName,
            lastName: data.lastName,
            isCompanyAdmin: isAdmin,
            isVerified: false,
          },
        })
      } else if (data.role === 'LANDLORD') {
        await tx.landlordProfile.create({
          data: {
            userId: user.id,
            firstName: data.firstName,
            lastName: data.lastName,
            verificationStatus: 'UNVERIFIED',
          },
        })
      }

      return user
    })

    return NextResponse.json({ success: true, data: { userId: dbUser.id } }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
