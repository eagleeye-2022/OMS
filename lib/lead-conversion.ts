import Client from '@/models/Client'
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import type { ILeadDocument } from '@/models/Lead'
import { getNextOrderNumber, computeOrderMoney } from './order-creation'

/**
 * Fires right after a lead is created (see POST /api/leads). Creates a real
 * Client from the lead's contact details so every lead has a client record
 * from the start, instead of waiting for conversion. Idempotent by caller
 * convention: only invoked when `lead.convertedClient` isn't already set.
 */
export async function createClientFromLead(
  lead: ILeadDocument,
  actor: { id: string; name: string }
): Promise<InstanceType<typeof Client>> {
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

  lead.convertedClient = client._id

  await ActivityLog.create({
    type: 'client_created',
    description: `Client "${client.companyName}" auto-created from lead "${lead.name}"`,
    lead: lead._id,
    client: client._id,
    user: actor.id,
    userName: actor.name,
  })

  return client
}

/**
 * Fires when a lead's status is moved to 'converted' (see
 * app/api/leads/[id]/status/route.ts). Creates a real Order from the lead's
 * product/quantity/amount fields against the Client already attached to the
 * lead (see createClientFromLead), mirroring how lib/order-creation.ts
 * materializes Orders from a Client's product preferences. Idempotent by
 * caller convention: the status route only invokes this once, when
 * `lead.convertedOrder` isn't already set.
 */
export async function createOrderFromLead(
  lead: ILeadDocument,
  clientId: InstanceType<typeof Client>['_id'],
  actor: { id: string; name: string }
): Promise<InstanceType<typeof Order>> {
  const orderNumber = await getNextOrderNumber()
  const totalAmount = lead.amount || 0
  const advancePaid = lead.paymentStatus === 'paid' ? totalAmount : 0
  const { balanceDue, paymentStatus } = computeOrderMoney(totalAmount, advancePaid)

  const assets = (lead.attachments || []).map((file) => ({
    label: file.originalName,
    url: file.url,
    kind: 'file' as const,
    mimeType: file.mimeType,
    size: file.size,
    addedBy: actor.id,
    addedByName: actor.name,
    addedAt: file.uploadedAt || new Date(),
  }))

  const order = await Order.create({
    orderNumber,
    client: clientId,
    fromLead: lead._id,
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
    assets,
    createdBy: actor.id,
  })

  lead.convertedOrder = order._id

  await ActivityLog.create({
    type: 'lead_converted',
    description: `Lead converted — Order ${orderNumber} created`,
    lead: lead._id,
    client: clientId,
    order: order._id,
    user: actor.id,
    userName: actor.name,
  })

  return order
}
