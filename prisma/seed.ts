// prisma/seed.ts — SwissTrust Dossier seed data

import { PrismaClient, SwissCanton, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[&]/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const REGIES = [
  // Geneva
  { name: 'Naef Immobilier', address: 'Rue de Rive 1, 1204 Genève', canton: SwissCanton.GE, email: 'contact@naef.ch', website: 'https://www.naef.ch', svit: 'SVIT-GE-0012' },
  { name: 'Pilet & Renaud', address: 'Rue de la Fontaine 1, 1204 Genève', canton: SwissCanton.GE, email: 'info@piletrenaud.ch', website: 'https://www.piletrenaud.ch', svit: 'SVIT-GE-0034' },
  { name: 'Agence Schmidt', address: 'Rue du Rhône 100, 1204 Genève', canton: SwissCanton.GE, email: 'info@agence-schmidt.ch', website: null, svit: null },
  { name: 'Régie Zimmermann', address: 'Boulevard Georges-Favon 24, 1204 Genève', canton: SwissCanton.GE, email: 'info@zimmermann-immo.ch', website: null, svit: null },
  { name: 'Agence Populaire de Genève', address: 'Rue de Carouge 12, 1205 Genève', canton: SwissCanton.GE, email: 'contact@apg-immo.ch', website: null, svit: null },
  { name: 'SPG Intercity', address: 'Rue de la Confédération 9, 1204 Genève', canton: SwissCanton.GE, email: 'info@spg-intercity.ch', website: 'https://www.spg-intercity.ch', svit: 'SVIT-GE-0056' },
  { name: 'Régie de la Rive', address: 'Chemin du Pont-Bochet 12, 1212 Grand-Lancy', canton: SwissCanton.GE, email: 'info@regie-rive.ch', website: null, svit: null },
  { name: 'Gérance Bernheim', address: 'Rue des Alpes 7, 1201 Genève', canton: SwissCanton.GE, email: 'contact@bernheim.ch', website: null, svit: null },
  { name: 'Régie du Rhône', address: 'Quai des Bergues 17, 1201 Genève', canton: SwissCanton.GE, email: 'info@regie-rhone.ch', website: null, svit: null },
  { name: 'Agence Rive Gauche', address: 'Boulevard de Saint-Georges 1, 1205 Genève', canton: SwissCanton.GE, email: 'contact@rive-gauche-immo.ch', website: null, svit: null },

  // Vaud
  { name: 'Gérance Immobilière Romande', address: 'Avenue de la Gare 43, 1003 Lausanne', canton: SwissCanton.VD, email: 'info@gir.ch', website: 'https://www.gir.ch', svit: 'SVIT-VD-0021' },
  { name: 'Régie Lémanique', address: 'Place de la Palud 2, 1003 Lausanne', canton: SwissCanton.VD, email: 'contact@lemanique-immo.ch', website: null, svit: null },
  { name: 'Agence Riviera Immobilier', address: 'Grand-Rue 40, 1800 Vevey', canton: SwissCanton.VD, email: 'info@riviera-immo.ch', website: null, svit: null },
  { name: 'Régie de la Côte', address: 'Rue du Midi 5, 1110 Morges', canton: SwissCanton.VD, email: 'contact@regie-cote.ch', website: null, svit: null },

  // Zurich
  { name: 'Moser Vatter & Cie', address: 'Bleicherweg 21, 8002 Zürich', canton: SwissCanton.ZH, email: 'info@moservatter.ch', website: 'https://www.moservatter.ch', svit: 'SVIT-ZH-0078' },
  { name: 'Wüest Partner', address: 'Dufourstrasse 49, 8008 Zürich', canton: SwissCanton.ZH, email: 'info@wuestpartner.com', website: 'https://www.wuestpartner.com', svit: 'SVIT-ZH-0045' },
  { name: 'Privera AG', address: 'Hardturmstrasse 101, 8005 Zürich', canton: SwissCanton.ZH, email: 'info@privera.ch', website: 'https://www.privera.ch', svit: 'SVIT-ZH-0033' },
  { name: 'Zürcher Hauseigentümerverband', address: 'Albisstrasse 28, 8038 Zürich', canton: SwissCanton.ZH, email: 'info@zhv.ch', website: null, svit: null },
  { name: 'Helvetica Property', address: 'Brandschenkestrasse 47, 8002 Zürich', canton: SwissCanton.ZH, email: 'info@helveticaproperty.ch', website: null, svit: 'SVIT-ZH-0092' },

  // Bern
  { name: 'Bern Immobilien Treuhand', address: 'Marktgasse 55, 3011 Bern', canton: SwissCanton.BE, email: 'info@bit-bern.ch', website: null, svit: null },
  { name: 'Régie Bernoise', address: 'Spitalgasse 1, 3011 Bern', canton: SwissCanton.BE, email: 'contact@regie-bern.ch', website: null, svit: null },
  { name: 'Interhome Bern', address: 'Aarbergergasse 21, 3011 Bern', canton: SwissCanton.BE, email: 'bern@interhome.ch', website: null, svit: null },

  // Basel
  { name: 'Basler Immobilien', address: 'Freie Strasse 40, 4001 Basel', canton: SwissCanton.BS, email: 'info@basler-immo.ch', website: null, svit: null },

  // Neuchâtel
  { name: 'Régie Neuchâteloise', address: 'Rue de la Treille 4, 2000 Neuchâtel', canton: SwissCanton.NE, email: 'info@regie-ne.ch', website: null, svit: null },

  // Fribourg
  { name: 'Agence Fribourgoise de Gérance', address: 'Rue de Lausanne 1, 1700 Fribourg', canton: SwissCanton.FR, email: 'contact@afg-immo.ch', website: null, svit: null },
]

async function main() {
  console.log('🌱 Seeding SwissTrust database…')

  // Seed régies
  for (const r of REGIES) {
    await prisma.regie.upsert({
      where: { slug: slug(r.name) },
      update: {},
      create: {
        name: r.name,
        slug: slug(r.name),
        address: r.address,
        canton: r.canton,
        email: r.email,
        website: r.website ?? null,
        svitMembershipNumber: r.svit ?? null,
        hasAccount: false,
        isVerified: false,
      },
    })
  }
  console.log(`✅ Seeded ${REGIES.length} régies`)

  // Seed test admin user (Supabase Auth handles passwords — we just create the profile row)
  const adminEmail = 'admin@swisstrust.ch'
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      role: UserRole.ADMIN,
      isActive: true,
    },
  })
  console.log(`✅ Seeded admin user: ${admin.email}`)

  // Seed test tenant
  const tenantEmail = 'tenant@example.com'
  const tenant = await prisma.user.upsert({
    where: { email: tenantEmail },
    update: {},
    create: {
      email: tenantEmail,
      role: UserRole.TENANT,
      isActive: true,
      tenantProfile: {
        create: {
          fullName: 'Marie Dupont',
          nationality: 'CH',
          residencePermitType: 'CITIZEN',
          employmentType: 'EMPLOYED',
          employerName: 'CERN',
          monthlyIncomeChf: 9500,
          occupantCount: 1,
          isSmoker: false,
          hasPets: false,
          currentAddress: 'Chemin du Rondeau 12, 1214 Vernier',
          trustScore: 'UNRATED',
          verificationStatus: 'UNVERIFIED',
          profileCompleteness: 15,
        },
      },
    },
  })
  console.log(`✅ Seeded test tenant: ${tenant.email}`)

  console.log('🎉 Seed complete.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
