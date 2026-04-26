import { prisma } from '../../db.js'

export type VehicleCreate = {
  number: string
  depot: string
  type: string
  cityId: string
}

export type VehicleUpdate = Partial<Omit<VehicleCreate, 'cityId'>>

export async function getVehicles(cityId: string) {
  return prisma.vehicle.findMany({
    where: { cityId },
    orderBy: { number: 'asc' },
  })
}

export async function getVehicle(id: string, cityId: string) {
  return prisma.vehicle.findFirst({ where: { id, cityId } })
}

export async function createVehicle(data: VehicleCreate) {
  return prisma.vehicle.create({ data })
}

export async function updateVehicle(id: string, cityId: string, data: VehicleUpdate) {
  return prisma.vehicle.update({ where: { id }, data })
}

export async function deleteVehicle(id: string, cityId: string) {
  await prisma.vehicle.delete({ where: { id } })
}
