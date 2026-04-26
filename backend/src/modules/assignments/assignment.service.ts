import { prisma } from '../../db.js'

export async function getActiveAssignments(cityId: string) {
  return prisma.vehicleAssignment.findMany({
    where: { cityId, loggedOutAt: null },
    include: { vehicle: true },
    orderBy: { loggedInAt: 'asc' },
  })
}

export async function getAssignmentsByDate(cityId: string, date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  return prisma.vehicleAssignment.findMany({
    where: { cityId, date: { gte: start, lte: end } },
    include: { vehicle: true },
    orderBy: { loggedInAt: 'asc' },
  })
}

export async function loginVehicle(data: {
  vehicleId: string
  line: string
  brigade: string
  date: Date
  cityId: string
}) {
  const start = new Date(data.date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(data.date)
  end.setHours(23, 59, 59, 999)

  // Dana brygada nie może mieć dwóch pojazdów jednocześnie
  const brigadeTaken = await prisma.vehicleAssignment.findFirst({
    where: {
      cityId: data.cityId,
      line: data.line,
      brigade: data.brigade,
      loggedOutAt: null,
      date: { gte: start, lte: end },
    },
  })
  if (brigadeTaken) {
    throw new Error('BRIGADE_TAKEN')
  }

  // Pojazd nie może być aktywny na dwóch brygadach tego samego dnia
  const activeAssignment = await prisma.vehicleAssignment.findFirst({
    where: {
      vehicleId: data.vehicleId,
      cityId: data.cityId,
      loggedOutAt: null,
      date: { gte: start, lte: end },
    },
  })
  if (activeAssignment) {
    throw new Error('ALREADY_LOGGED_IN')
  }

  return prisma.vehicleAssignment.create({
    data: {
      vehicleId: data.vehicleId,
      line: data.line,
      brigade: data.brigade,
      date: data.date,
      cityId: data.cityId,
    },
    include: { vehicle: true },
  })
}

export async function logoutVehicle(assignmentId: string, cityId: string) {
  const assignment = await prisma.vehicleAssignment.findFirst({
    where: { id: assignmentId, cityId },
  })
  if (!assignment) throw new Error('NOT_FOUND')
  if (assignment.loggedOutAt) throw new Error('ALREADY_LOGGED_OUT')

  return prisma.vehicleAssignment.update({
    where: { id: assignmentId },
    data: { loggedOutAt: new Date() },
    include: { vehicle: true },
  })
}
