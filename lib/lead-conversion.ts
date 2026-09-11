import Client from '@/models/Client'
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import type { ILeadDocument } from '@/models/Lead'
import { getNextOrderNumber, computeOrderMoney } from './order-creation'

/**
 * Fires when a lead's status is moved to 'converted' (see
 * app/api/leads/[id]/status/route.ts). Creates a real Client from the lead's
 * contact details and a real Order from its product/quantity/amount fields,
 * mirroring how lib/order-creation.ts materializes Orders from a Client's
 * product preferences. Idempotent by caller convention: the status route
 * only invokes this once, when `lead.convertedClient` isn't already set.
 */
export async function convertLeadToClientOrder(
  lead: ILeadDocument,
  actor: { id: string; name: string }
): Promise<{ client: InstanceType<typeof Client>; order: InstanceType<typeof Order> }> {
  const client = await Client.create({
    companyName: lead.companyName || lead.name,
    clientType: lead.companyName ? 'corporate' : 'individual',
    contactPersonName: lead.name,
    phone: lead.phone,
    email: lead.email,
    sameAsBilling: true,
    billingAddress: { pinCode: '', landmark: lead.address },
    shippingAddress: { pinCode: '', landmark: lead.address },
    status: 'active',
    notes: lead.notes,
    createdBy: actor.id,
  })

  const orderNumber = await getNextOrderNumber()
  const totalAmount = lead.amount || 0
  const advancePaid = lead.paymentStatus === 'paid' ? totalAmount : 0
  const { balanceDue, paymentStatus } = computeOrderMoney(totalAmount, advancePaid)

  const order = await Order.create({
    orderNumber,
    client: client._id,
    category: lead.productType,
    productType: lead.productType,
    quantity: lead.quantity,
    deliveryDate: lead.closingDate || new Date(),
    totalAmount,
    advancePaid,
    balanceDue,
    paymentStatus,
    status: 'pending',
    designStatus: 'pending',
    createdBy: actor.id,
  })

  lead.convertedClient = client._id
  lead.convertedOrder = order._id

  await ActivityLog.create({
    type: 'lead_converted',
    description: `Lead converted — Client "${client.companyName}" and Order ${orderNumber} created`,
    lead: lead._id,
    client: client._id,
    order: order._id,
    user: actor.id,
    userName: actor.name,
  })

  return { client, order }
}
