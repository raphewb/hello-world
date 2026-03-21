/**
 * SwissTrust email service via Resend.
 * All 9 email templates.
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'SwissTrust <noreply@swisstrust.ch>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://swisstrust.ch'

type SendResult = { id: string } | null

async function send(to: string, subject: string, html: string): Promise<SendResult> {
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html })
    if (error) {
      console.error('[email] Send failed:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.error('[email] Unexpected error:', (err as Error).message)
    return null
  }
}

// 1. Welcome email
export async function sendWelcomeEmail(to: string, name: string, role: string) {
  const roleMsg = role === 'TENANT'
    ? 'Start building your verified dossier to apply for rentals with confidence.'
    : role === 'AGENT'
    ? 'Your agency account is ready. Start receiving verified tenant dossiers.'
    : 'Your landlord account is ready. Post listings and receive verified applications.'

  return send(to, 'Welcome to SwissTrust', `
    <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1B2A4A; padding: 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to SwissTrust</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #E8ECF0;">
        <p style="color: #1B2A4A; font-size: 16px;">Hello ${name},</p>
        <p style="color: #4A5568;">${roleMsg}</p>
        <a href="${APP_URL}" style="display: inline-block; background: #1B2A4A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">Get started →</a>
        <p style="color: #4A5568; font-size: 12px; margin-top: 32px;">SwissTrust — Privacy-first Swiss rental verification</p>
      </div>
    </div>
  `)
}

// 2. Document expiry alert
export async function sendDocumentExpiryAlert(
  to: string,
  tenantName: string,
  documentType: string,
  daysLeft: number,
  dashboardUrl: string
) {
  const urgency = daysLeft <= 7 ? '⚠️ Urgent: ' : ''
  const message = daysLeft <= 0
    ? 'has expired.'
    : `expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`

  return send(to, `${urgency}Document expiry alert — ${documentType}`, `
    <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${daysLeft <= 7 ? '#C41A1A' : '#B45309'}; padding: 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Document Expiry Alert</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #E8ECF0;">
        <p style="color: #1B2A4A;">Hello ${tenantName},</p>
        <p style="color: #4A5568;">Your <strong>${documentType}</strong> ${message}</p>
        <p style="color: #4A5568;">Please upload a fresh copy to keep your dossier valid and maintain your trust score.</p>
        <a href="${dashboardUrl}" style="display: inline-block; background: #1B2A4A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">Update document →</a>
      </div>
    </div>
  `)
}

// 3. Access request notification (tenant receives this)
export async function sendAccessRequestNotification(
  to: string,
  tenantName: string,
  requesterName: string,
  requesterCompany: string,
  propertyAddress: string,
  approveUrl: string,
  denyUrl: string,
  autoApproveHours: number
) {
  return send(to, `Access request for your dossier — ${propertyAddress}`, `
    <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1B2A4A; padding: 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Dossier Access Request</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #E8ECF0;">
        <p style="color: #1B2A4A;">Hello ${tenantName},</p>
        <p style="color: #4A5568;"><strong>${requesterName}</strong> from <strong>${requesterCompany}</strong> has requested access to your full dossier for:</p>
        <p style="color: #1B2A4A; font-weight: bold; font-size: 18px; padding: 16px; background: #F7F8FA; border-radius: 6px;">${propertyAddress}</p>
        <p style="color: #4A5568;">If you do not respond, access will be automatically approved in <strong>${autoApproveHours} hours</strong>.</p>
        <div style="display: flex; gap: 16px; margin-top: 24px;">
          <a href="${approveUrl}" style="display: inline-block; background: #1A7A4A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">✓ Approve access</a>
          <a href="${denyUrl}" style="display: inline-block; background: #C41A1A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-left: 12px;">✗ Deny access</a>
        </div>
      </div>
    </div>
  `)
}

// 4. Access approved (notify agent/landlord)
export async function sendAccessApprovedEmail(
  to: string,
  viewerName: string,
  tenantName: string,
  propertyAddress: string,
  dossierUrl: string
) {
  return send(to, `Access approved — ${tenantName}'s dossier`, `
    <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1A7A4A; padding: 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Access Approved</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #E8ECF0;">
        <p style="color: #1B2A4A;">Hello ${viewerName},</p>
        <p style="color: #4A5568;"><strong>${tenantName}</strong> has approved your access request for <strong>${propertyAddress}</strong>.</p>
        <a href="${dossierUrl}" style="display: inline-block; background: #1B2A4A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">View full dossier →</a>
      </div>
    </div>
  `)
}

// 5. Régie invitation (ghost delivery)
export async function sendRegieInvitation(
  to: string,
  regieName: string,
  dossierCount: number,
  registerUrl: string
) {
  return send(to, `${dossierCount} verified tenant${dossierCount === 1 ? '' : 's'} want${dossierCount === 1 ? 's' : ''} to share with ${regieName}`, `
    <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1B2A4A; padding: 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Verified dossiers waiting for you</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #E8ECF0;">
        <p style="color: #1B2A4A;">Hello ${regieName},</p>
        <p style="color: #4A5568;"><strong>${dossierCount}</strong> verified tenant${dossierCount === 1 ? '' : 's have'} prepared dossier${dossierCount === 1 ? '' : 's'} specifically for your agency.</p>
        <p style="color: #4A5568;">SwissTrust is a privacy-preserving platform that lets tenants verify their identity once and share it securely — giving your agency instant access to pre-screened applicants.</p>
        <a href="${registerUrl}" style="display: inline-block; background: #D4001A; color: white; padding: 16px 32px; border-radius: 6px; text-decoration: none; margin-top: 16px; font-size: 16px;">Claim your dossiers →</a>
      </div>
    </div>
  `)
}

// 6. Ghost delivery follow-up
export async function sendGhostDeliveryFollowUp(
  to: string,
  regieName: string,
  dossierCount: number,
  registerUrl: string
) {
  return send(to, `Reminder: ${dossierCount} verified dossiers waiting for ${regieName}`, `
    <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1B2A4A; padding: 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">You have ${dossierCount} verified dossiers waiting</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #E8ECF0;">
        <p style="color: #1B2A4A;">Hello ${regieName},</p>
        <p style="color: #4A5568;">This is a reminder that <strong>${dossierCount}</strong> verified tenant dossiers are waiting for your agency on SwissTrust. These tenants have already completed identity verification and document checks.</p>
        <a href="${registerUrl}" style="display: inline-block; background: #D4001A; color: white; padding: 16px 32px; border-radius: 6px; text-decoration: none; margin-top: 16px; font-size: 16px;">View dossiers →</a>
      </div>
    </div>
  `)
}

// 7. Agent invitation
export async function sendAgentInvitation(
  to: string,
  inviterName: string,
  regieName: string,
  inviteUrl: string,
  expiresAt: Date
) {
  return send(to, `You've been invited to join ${regieName} on SwissTrust`, `
    <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1B2A4A; padding: 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Team invitation</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #E8ECF0;">
        <p style="color: #1B2A4A;">Hello,</p>
        <p style="color: #4A5568;"><strong>${inviterName}</strong> has invited you to join <strong>${regieName}</strong> on SwissTrust.</p>
        <p style="color: #4A5568; font-size: 12px;">This invitation expires on ${expiresAt.toLocaleDateString('fr-CH')}.</p>
        <a href="${inviteUrl}" style="display: inline-block; background: #1B2A4A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">Accept invitation →</a>
      </div>
    </div>
  `)
}

// 8. Landlord invitation (directed certificate)
export async function sendLandlordInvitation(
  to: string,
  ownerName: string,
  tenantName: string,
  propertyAddress: string,
  inviteUrl: string
) {
  return send(to, `${tenantName} has shared their verified rental dossier with you`, `
    <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1B2A4A; padding: 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Verified dossier received</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #E8ECF0;">
        <p style="color: #1B2A4A;">Hello ${ownerName},</p>
        <p style="color: #4A5568;"><strong>${tenantName}</strong> has prepared a verified rental dossier for your property at <strong>${propertyAddress}</strong>.</p>
        <p style="color: #4A5568;">SwissTrust verifies tenant documents using AI and human review, so you can trust the information is accurate.</p>
        <a href="${inviteUrl}" style="display: inline-block; background: #1B2A4A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">View verified dossier →</a>
      </div>
    </div>
  `)
}

// 9. Certificate expiry warning
export async function sendCertificateExpiryWarning(
  to: string,
  tenantName: string,
  propertyAddress: string,
  daysLeft: number,
  renewUrl: string
) {
  return send(to, `Your certificate expires in ${daysLeft} days — ${propertyAddress}`, `
    <div style="font-family: DM Sans, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #B45309; padding: 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Certificate expiring soon</h1>
      </div>
      <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #E8ECF0;">
        <p style="color: #1B2A4A;">Hello ${tenantName},</p>
        <p style="color: #4A5568;">Your SwissTrust certificate for <strong>${propertyAddress}</strong> expires in <strong>${daysLeft} days</strong>.</p>
        <p style="color: #4A5568;">Renew it to keep sharing your verified dossier with potential landlords.</p>
        <a href="${renewUrl}" style="display: inline-block; background: #1B2A4A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">Renew certificate →</a>
      </div>
    </div>
  `)
}
