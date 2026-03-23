import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');
  await prisma.departmentHistory.deleteMany();
  await prisma.horse.deleteMany();
  await prisma.department.deleteMany();

  // Create Departments
  const dep1 = await prisma.department.create({ data: { name: 'Alpha Cav', city: 'Fort Genesis' }});
  const dep2 = await prisma.department.create({ data: { name: 'Bravo Recon', city: 'Outpost Echo' }});
  const dep3 = await prisma.department.create({ data: { name: 'Charlie Command', city: 'Fort Genesis' }});

  const dob = (yearsAgo: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - yearsAgo);
    return d;
  };

  // Create root ancestors
  const grandSire = await prisma.horse.create({
    data: { name: 'Titan', sex: 'Male', status: 'deceased', departmentId: dep1.id, dateOfBirth: dob(25) },
  });
  await prisma.departmentHistory.create({ data: { horseId: grandSire.id, departmentId: dep1.id }});

  const grandDam = await prisma.horse.create({
    data: { name: 'Valkyrie', sex: 'Female', status: 'deceased', departmentId: dep1.id, dateOfBirth: dob(24) },
  });
  await prisma.departmentHistory.create({ data: { horseId: grandDam.id, departmentId: dep1.id }});

  const sire = await prisma.horse.create({
    data: { name: 'Apollo', sex: 'Male', status: 'retired', sireId: grandSire.id, damId: grandDam.id, departmentId: dep2.id, dateOfBirth: dob(15) },
  });
  await prisma.departmentHistory.create({ data: { horseId: sire.id, departmentId: dep2.id }});

  const dam = await prisma.horse.create({
    data: { name: 'Athena', sex: 'Female', status: 'retired', departmentId: dep2.id, dateOfBirth: dob(14) },
  });
  await prisma.departmentHistory.create({ data: { horseId: dam.id, departmentId: dep2.id }});

  const child1 = await prisma.horse.create({
    data: { name: 'Ares', sex: 'Male', status: 'in_service', sireId: sire.id, damId: dam.id, departmentId: dep3.id, dateOfBirth: dob(5) },
  });
  await prisma.departmentHistory.create({ data: { horseId: child1.id, departmentId: dep3.id }});

  const child2 = await prisma.horse.create({
    data: { name: 'Artemis', sex: 'Female', status: 'in_service', sireId: sire.id, damId: dam.id, departmentId: dep3.id, dateOfBirth: dob(4) },
  });
  await prisma.departmentHistory.create({ data: { horseId: child2.id, departmentId: dep3.id }});

  // Additional horses
  const ops1 = await prisma.horse.create({ data: { name: 'Ghost', sex: 'Male', status: 'in_service', departmentId: dep1.id, dateOfBirth: dob(8) }});
  await prisma.departmentHistory.create({ data: { horseId: ops1.id, departmentId: dep1.id }});
  const ops2 = await prisma.horse.create({ data: { name: 'Shadow', sex: 'Female', status: 'in_service', departmentId: dep1.id, dateOfBirth: dob(9) }});
  await prisma.departmentHistory.create({ data: { horseId: ops2.id, departmentId: dep1.id }});

  console.log(`Seeded military database.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
