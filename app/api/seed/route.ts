import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/models/User'
import Client from '@/models/Client'
import Order from '@/models/Order'
import Payment from '@/models/Payment'
import ActivityLog from '@/models/ActivityLog'
import Notification from '@/models/Notification'
import Product from '@/models/Product'

export const dynamic = 'force-dynamic'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[seed] Blocked POST /api/seed in production')
    return NextResponse.json({ success: false, error: 'Seed is disabled in production' }, { status: 403 })
  }

  try {
    await connectDB()

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Client.deleteMany({}),
      Order.deleteMany({}),
      Payment.deleteMany({}),
      ActivityLog.deleteMany({}),
      Notification.deleteMany({}),
      Product.deleteMany({}),
    ])

    // Dev-only demo data — this route is blocked in production (see the
    // NODE_ENV guard above). To go live with real emails/roles, use
    // app/api/admin/bootstrap/route.ts's DEMO_USERS array instead, which is
    // the production-safe, token-gated equivalent of the user list below.
    // 5-role taxonomy (admin/sales/creative/operations/accounting) — matches
    // lib/constants.ts's ROLES since 2026-07-21, when 'production' and
    // 'shipping' were merged into one 'operations' role and 'accounts' was
    // renamed 'accounting'. No passwords — login is email + OTP only, so
    // logging in as any of these in dev just means requesting a code (see
    // console output, since local dev has no SMTP configured by default).
    const users = await User.create([
      { name: 'Aryan Mehta', email: 'admin@untitledstore.com', role: 'admin', phone: '9876543210', isActive: true },
      { name: 'Priya Sharma', email: 'sales@untitledstore.com', role: 'sales', phone: '9876543211', isActive: true },
      { name: 'Vaishnavi Shivhare', email: 'creative@untitledstore.com', role: 'creative', phone: '9876543212', isActive: true },
      { name: 'Rahul Verma', email: 'operations@untitledstore.com', role: 'operations', phone: '9876543213', isActive: true },
      { name: 'Neha Gupta', email: 'accounting@untitledstore.com', role: 'accounting', phone: '9876543215', isActive: true },
    ])

    const adminUser = users[0]

    // Seed Clients
    const rawClients: Array<{
      companyName: string
      contactPersonName: string
      email: string
      phone: string
      city: string
      state: string
      pincode: string
      gstin?: string
    }> = [
      { companyName: 'Astra Media Pvt Ltd', contactPersonName: 'Ankit Singh', email: 'astra@example.com', phone: '9811223344', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', gstin: '27AABCS1429B1Z5' },
      { companyName: 'Lumina Kiosk Solutions', contactPersonName: 'Rakesh Nair', email: 'lumina@example.com', phone: '9822334455', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
      { companyName: 'Omni Corporation Ltd', contactPersonName: 'Deepa Menon', email: 'omni@example.com', phone: '9833445566', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002', gstin: '33AABCO1234B1Z9' },
      { companyName: 'Zenith Nord Industries', contactPersonName: 'Vikram Bose', email: 'zenith@example.com', phone: '9844556677', city: 'Kolkata', state: 'West Bengal', pincode: '700016' },
      { companyName: 'Peak Tech Solutions', contactPersonName: 'Anil Kumar', email: 'peaktech@example.com', phone: '9855667788', city: 'Gurugram', state: 'Haryana', pincode: '122002', gstin: '06AABCP5678B1Z2' },
      { companyName: 'Sky Ventures Pvt Ltd', contactPersonName: 'Pooja Tiwari', email: 'sky@example.com', phone: '9866778899', city: 'Jaipur', state: 'Rajasthan', pincode: '302006' },
      { companyName: 'Nebula Corp Media', contactPersonName: 'Suresh Iyer', email: 'nebula@example.com', phone: '9877889900', city: 'Kolkata', state: 'West Bengal', pincode: '700091' },
      { companyName: 'Apex Arts Studio', contactPersonName: 'Meena Krishnan', email: 'apex@example.com', phone: '9888990011', city: 'Hyderabad', state: 'Telangana', pincode: '500033' },
      { companyName: 'BluePeak Enterprises', contactPersonName: 'Harish Reddy', email: 'bluepeak@example.com', phone: '9899001122', city: 'New Delhi', state: 'Delhi', pincode: '110001', gstin: '07AABBP8765B1Z8' },
      { companyName: 'Zyphor Displays', contactPersonName: 'Kavita Shah', email: 'zyphor@example.com', phone: '9810112233', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      { companyName: 'Metra Outdoor Pvt Ltd', contactPersonName: 'Dinesh Pillai', email: 'metra@example.com', phone: '9821223344', city: 'Kochi', state: 'Kerala', pincode: '682016' },
      { companyName: 'Midnight Studio Design', contactPersonName: 'Ritu Batra', email: 'midnight@example.com', phone: '9832334455', city: 'Chandigarh', state: 'Punjab', pincode: '160009' },
    ]

    const clients = await Client.create(
      rawClients.map((c, i) => ({
        clientCode: `CLI-${1001 + i}`,
        companyName: c.companyName,
        clientType: c.gstin ? 'corporate' : 'individual',
        status: 'active',
        contactPersonName: c.contactPersonName,
        phone: c.phone,
        email: c.email,
        sameAsBilling: true,
        billingAddress: { pinCode: c.pincode, city: c.city, state: c.state, country: 'India' },
        shippingAddress: { pinCode: c.pincode, city: c.city, state: c.state, country: 'India' },
        gstNumber: c.gstin,
        defaultAdvanceRequirement: 50,
        defaultPaymentTerms: '50_advance_balance_delivery',
        preferredPaymentMode: 'bank_transfer',
        invoiceRecipientName: c.contactPersonName,
        invoiceEmail: c.email,
        escalationContact: {
          recipientName: c.contactPersonName,
          email: c.email,
          mobileNumber: c.phone,
          address: `${c.city}, ${c.state}`,
        },
        productPreferences: [
          { preferredProductCategory: 'Corporate Kits', orderQuantity: 100, orderNote: 'Recurring onboarding kit order' },
        ],
        createdBy: adminUser._id,
      }))
    )

    const today = new Date()
    const d = (daysFromNow: number) => new Date(today.getTime() + daysFromNow * 86400000)
    const p = (daysAgo: number) => new Date(today.getTime() - daysAgo * 86400000)

    // Seed Products
    await Product.create([
      { name: 'Vinyl Banner 3m', category: 'Banners', basePrice: 450, unit: 'piece', isActive: true },
      { name: 'Silk Screen Poster A1', category: 'Posters', basePrice: 85, unit: 'piece', isActive: true },
      { name: 'Corporate Brochure A4', category: 'Brochures', basePrice: 12, unit: 'piece', isActive: true },
      { name: 'Custom Packaging Box', category: 'Packaging', basePrice: 35, unit: 'piece', isActive: true },
      { name: 'PVC ID Card', category: 'ID Cards', basePrice: 18, unit: 'piece', isActive: true },
    ])

    // Seed Orders
    const orders = await Order.create([
      {
        orderNumber: 'ORD-2088',
        client: clients[0]._id, // Astra Media
        category: 'Banners',
        productType: 'Vinyl Banners (3m)',
        quantity: 45,
        sizeBreakdown: '10×20pcs, 15×15pcs, 20×10pcs',
        deliveryDate: d(6),
        priority: 'high',
        status: 'design_review',
        designStatus: 'in_review',
        totalAmount: 24500,
        advancePaid: 10000,
        balanceDue: 14500,
        paymentStatus: 'partial',
        notes: [{ text: 'Client wants matte finish', authorId: adminUser._id, authorName: adminUser.name, at: p(3), noteType: 'general' }],
        assets: [
          { label: 'Artwork Reference', url: 'https://drive.google.com/example-1', kind: 'drive_link', addedBy: adminUser._id, addedByName: adminUser.name, addedAt: p(3) },
          { label: 'Size Chart', url: 'https://drive.google.com/example-2', kind: 'drive_link', addedBy: adminUser._id, addedByName: adminUser.name, addedAt: p(2) },
        ],
        assignedTeam: { salesExecutive: adminUser._id },
        createdBy: adminUser._id,
        createdAt: p(3),
      },
      {
        orderNumber: 'ORD-2082',
        client: clients[1]._id, // Lumina Kiosk
        category: 'Posters',
        productType: 'Silk Screen Posters',
        quantity: 1200,
        deliveryDate: d(3),
        status: 'in_production',
        designStatus: 'client_approved',
        productionStage: 'printing',
        productionStages: {
          printing: { status: 'in_progress', unitsCompleted: 720, totalUnits: 1200, workerName: 'Rajesh K.', updatedAt: p(1), updatedBy: adminUser._id },
          stitching: { status: 'pending', unitsCompleted: 0, totalUnits: 1200 },
          finishing: { status: 'pending', unitsCompleted: 0, totalUnits: 1200 },
          qcCheck: { status: 'pending', unitsCompleted: 0, totalUnits: 1200 },
        },
        totalAmount: 82000,
        advancePaid: 40000,
        balanceDue: 42000,
        paymentStatus: 'partial',
        createdBy: adminUser._id,
        createdAt: p(8),
      },
      {
        orderNumber: 'ORD-2079',
        client: clients[2]._id, // Omni Corp
        category: 'Brochures',
        productType: 'Corporate Brochures',
        quantity: 500,
        deliveryDate: p(2), // overdue
        status: 'delayed',
        designStatus: 'client_approved',
        productionStage: 'finishing',
        courierPartner: 'FedEx',
        trackingNumber: 'FX55201983',
        dispatchDate: p(3),
        expectedDeliveryDate: p(1),
        delayReason: 'Courier hub delay — package held at Mumbai sorting facility',
        totalAmount: 48000,
        advancePaid: 20000,
        balanceDue: 28000,
        paymentStatus: 'partial',
        priority: 'urgent',
        notes: [{ text: 'Rush order - machine breakdown caused delay', authorId: adminUser._id, authorName: adminUser.name, at: p(1) }],
        createdBy: adminUser._id,
        createdAt: p(15),
      },
      {
        orderNumber: 'ORD-2075',
        client: clients[3]._id, // Zenith Nord
        category: 'Packaging',
        productType: 'Custom Packaging',
        quantity: 3000,
        deliveryDate: d(9),
        status: 'quality_check',
        designStatus: 'client_approved',
        productionStage: 'quality_check',
        totalAmount: 156000,
        advancePaid: 80000,
        balanceDue: 76000,
        paymentStatus: 'partial',
        createdBy: adminUser._id,
        createdAt: p(12),
      },
      {
        orderNumber: 'ORD-2071',
        client: clients[4]._id, // Peak Tech
        category: 'ID Cards',
        productType: 'ID Cards - PVC',
        quantity: 150,
        deliveryDate: d(11),
        status: 'design_approved',
        designStatus: 'client_approved',
        totalAmount: 12200,
        advancePaid: 6000,
        balanceDue: 6200,
        paymentStatus: 'partial',
        createdBy: adminUser._id,
        createdAt: p(5),
      },
      {
        orderNumber: 'ORD-2068',
        client: clients[5]._id, // Sky Ventures
        category: 'Banners',
        productType: 'Flex Banners',
        quantity: 20,
        deliveryDate: d(4),
        status: 'shipping_ready',
        designStatus: 'client_approved',
        productionStage: 'completed',
        totalAmount: 46000,
        advancePaid: 0,
        balanceDue: 46000,
        paymentStatus: 'pending',
        createdBy: adminUser._id,
        createdAt: p(20),
      },
      {
        orderNumber: 'ORD-2055',
        client: clients[6]._id, // Nebula Corp
        category: 'Posters',
        productType: 'A3 Posters Glossy',
        quantity: 800,
        deliveryDate: p(5),
        status: 'delivered',
        designStatus: 'client_approved',
        productionStage: 'completed',
        courierPartner: 'BlueDart',
        trackingNumber: 'BD123456789',
        dispatchDate: p(7),
        expectedDeliveryDate: p(4),
        deliveredAt: p(5),
        deliveredBy: adminUser._id,
        invoice: {
          invoiceNumber: 'INV-2055',
          invoiceType: 'tax_invoice',
          invoiceDate: p(28),
          amount: 45000,
          cgstPercent: 9,
          sgstPercent: 9,
          dueDate: p(5),
          isFinal: true,
          sentToClient: true,
          sentAt: p(27),
          uploadedAt: p(28),
          uploadedBy: adminUser._id,
        },
        totalAmount: 45000,
        advancePaid: 45000,
        balanceDue: 0,
        paymentStatus: 'paid',
        createdBy: adminUser._id,
        createdAt: p(30),
      },
      {
        orderNumber: 'ORD-2051',
        client: clients[7]._id, // Apex Arts
        category: 'Brochures',
        productType: 'Tri-fold Brochures',
        quantity: 2000,
        deliveryDate: p(1),
        status: 'dispatched',
        designStatus: 'client_approved',
        productionStage: 'completed',
        courierPartner: 'DTDC',
        trackingNumber: 'DTDC987654',
        dispatchDate: p(2),
        expectedDeliveryDate: d(1),
        invoice: {
          invoiceNumber: 'INV-2051',
          invoiceType: 'tax_invoice',
          invoiceDate: p(24),
          amount: 68000,
          cgstPercent: 9,
          sgstPercent: 9,
          dueDate: d(3),
          isFinal: false,
          sentToClient: false,
          uploadedAt: p(24),
          uploadedBy: adminUser._id,
        },
        totalAmount: 68000,
        advancePaid: 34000,
        balanceDue: 34000,
        paymentStatus: 'partial',
        createdBy: adminUser._id,
        createdAt: p(25),
      },
      {
        orderNumber: 'ORD-2047',
        client: clients[8]._id, // BluePeak
        category: 'Banners',
        productType: 'Roll-up Banners',
        quantity: 25,
        deliveryDate: d(2),
        status: 'in_production',
        designStatus: 'client_approved',
        productionStage: 'stitching',
        productionStages: {
          printing: { status: 'completed', unitsCompleted: 25, totalUnits: 25, workerName: 'Sita I.', updatedAt: p(3), updatedBy: adminUser._id },
          stitching: { status: 'in_progress', unitsCompleted: 15, totalUnits: 25, workerName: 'Sita I.', updatedAt: p(1), updatedBy: adminUser._id },
          finishing: { status: 'pending', unitsCompleted: 0, totalUnits: 25 },
          qcCheck: { status: 'pending', unitsCompleted: 0, totalUnits: 25 },
        },
        totalAmount: 38500,
        advancePaid: 15000,
        balanceDue: 23500,
        paymentStatus: 'partial',
        priority: 'urgent',
        notes: [{ text: 'Flagged urgent by sales team', authorId: adminUser._id, authorName: adminUser.name, at: p(6), noteType: 'general' }],
        createdBy: adminUser._id,
        createdAt: p(7),
      },
      {
        orderNumber: 'ORD-2044',
        client: clients[9]._id, // Zyphor
        category: 'Packaging',
        productType: 'Gift Boxes',
        quantity: 500,
        deliveryDate: p(6), // 6 days overdue
        status: 'delayed',
        designStatus: 'client_approved',
        productionStage: 'finishing',
        totalAmount: 72000,
        advancePaid: 35000,
        balanceDue: 37000,
        paymentStatus: 'partial',
        createdBy: adminUser._id,
        createdAt: p(22),
      },
      {
        orderNumber: 'ORD-2041',
        client: clients[10]._id, // Metra
        category: 'Posters',
        productType: 'Billboard Posters',
        quantity: 10,
        deliveryDate: d(12),
        status: 'design_review',
        designStatus: 'in_review',
        totalAmount: 28000,
        advancePaid: 10000,
        balanceDue: 18000,
        paymentStatus: 'partial',
        createdBy: adminUser._id,
        createdAt: p(2),
      },
      {
        orderNumber: 'ORD-2038',
        client: clients[9]._id, // Zyphor
        category: 'Stickers',
        productType: 'Die-cut Stickers',
        quantity: 5000,
        deliveryDate: d(7),
        status: 'in_production',
        designStatus: 'client_approved',
        productionStage: 'printing',
        totalAmount: 35000,
        advancePaid: 17500,
        balanceDue: 17500,
        paymentStatus: 'partial',
        createdBy: adminUser._id,
        createdAt: p(10),
      },
      {
        orderNumber: 'ORD-2031',
        client: clients[8]._id, // BluePeak
        category: 'Banners',
        productType: 'Fabric Backdrop',
        quantity: 8,
        deliveryDate: d(5),
        status: 'quality_check',
        designStatus: 'client_approved',
        productionStage: 'quality_check',
        totalAmount: 56000,
        advancePaid: 30000,
        balanceDue: 26000,
        paymentStatus: 'partial',
        createdBy: adminUser._id,
        createdAt: p(18),
      },
      {
        orderNumber: 'ORD-2024',
        client: clients[2]._id, // Omni Corp
        category: 'ID Cards',
        productType: 'Employee ID Cards',
        quantity: 300,
        deliveryDate: p(8),
        status: 'delayed',
        designStatus: 'client_approved',
        productionStage: 'quality_check',
        totalAmount: 18000,
        advancePaid: 8000,
        balanceDue: 10000,
        paymentStatus: 'partial',
        createdBy: adminUser._id,
        createdAt: p(28),
      },
      {
        orderNumber: 'ORD-2046',
        client: clients[7]._id, // Apex Arts
        category: 'Posters',
        productType: 'Event Posters A2',
        quantity: 400,
        deliveryDate: p(1),
        status: 'delivered',
        designStatus: 'client_approved',
        productionStage: 'completed',
        totalAmount: 32000,
        advancePaid: 32000,
        balanceDue: 0,
        paymentStatus: 'paid',
        createdBy: adminUser._id,
        createdAt: p(20),
      },
    ])

    // Seed Payments
    await Payment.create([
      { order: orders[0]._id, client: clients[0]._id, receiptNumber: 'RCP-0001', amount: 10000, paymentDate: p(2), method: 'Bank Transfer', reference: 'TXN001234', recordedBy: adminUser._id },
      { order: orders[1]._id, client: clients[1]._id, receiptNumber: 'RCP-0002', amount: 40000, paymentDate: p(7), method: 'UPI', reference: 'UPI-LK-40K', recordedBy: adminUser._id },
      { order: orders[6]._id, client: clients[6]._id, receiptNumber: 'RCP-0003', amount: 45000, paymentDate: p(6), method: 'Bank Transfer', reference: 'TXN-NEB-45K', recordedBy: adminUser._id },
      { order: orders[7]._id, client: clients[7]._id, receiptNumber: 'RCP-0004', amount: 34000, paymentDate: p(24), method: 'Cheque', reference: 'CHQ-0087', recordedBy: adminUser._id },
      { order: orders[4]._id, client: clients[4]._id, receiptNumber: 'RCP-0005', amount: 6000, paymentDate: p(4), method: 'UPI', reference: 'UPI-PT-6K', recordedBy: adminUser._id },
    ])

    // Seed Activity Logs
    await ActivityLog.create([
      { type: 'order_created', description: 'Order ORD-2088 created', order: orders[0]._id, client: clients[0]._id, user: adminUser._id, userName: 'Aryan Mehta', createdAt: p(3) },
      { type: 'order_created', description: 'Order ORD-2082 created', order: orders[1]._id, client: clients[1]._id, user: adminUser._id, userName: 'Aryan Mehta', createdAt: p(8) },
      { type: 'payment_recorded', description: 'Payment of ₹40,000 recorded for ORD-2082', order: orders[1]._id, client: clients[1]._id, user: adminUser._id, userName: 'Aryan Mehta', createdAt: p(7) },
      { type: 'design_approved', description: 'Design approved for ORD-2046 by client', order: orders[14]._id, client: clients[7]._id, user: adminUser._id, userName: 'Vaishnavi Shivhare', createdAt: p(1) },
      { type: 'order_delivered', description: 'Order ORD-2055 delivered to Nebula Corp', order: orders[6]._id, client: clients[6]._id, user: adminUser._id, userName: 'Sanjay Kumar', createdAt: p(5) },
      { type: 'payment_recorded', description: 'Payment of ₹45,000 received for ORD-2055', order: orders[6]._id, client: clients[6]._id, user: adminUser._id, userName: 'Neha Gupta', createdAt: p(6) },
      { type: 'order_dispatched', description: 'Order ORD-2051 dispatched via DTDC', order: orders[7]._id, client: clients[7]._id, user: adminUser._id, userName: 'Sanjay Kumar', createdAt: p(2) },
      { type: 'client_created', description: 'New client "Midnight Studio" added', client: clients[11]._id, user: adminUser._id, userName: 'Priya Sharma', createdAt: p(1) },
    ])

    // Seed Notifications
    await Notification.create([
      { type: 'order_overdue', title: 'ORD-2044 is 6 days overdue', message: 'Order ORD-2044 for Zyphor is 6 days past its primary deadline.', order: orders[9]._id, priority: 'critical', isRead: false, createdAt: p(0.04) },
      { type: 'payment_pending', title: '₹46,000 payment pending', message: 'Sky Ventures · Milestone 2 payment of ₹46,000 is overdue.', order: orders[5]._id, client: clients[5]._id, priority: 'high', isRead: false, createdAt: p(0.08) },
      { type: 'order_flagged', title: 'ORD-2047 flagged Urgent by Sales', message: 'Roll-up banner order for BluePeak has been flagged urgent.', order: orders[8]._id, priority: 'high', isRead: false, createdAt: p(0.2) },
      { type: 'design_approved', title: 'Design approved · ORD-2046', message: 'Client Apex Arts has approved design for ORD-2046.', order: orders[14]._id, priority: 'medium', isRead: true, createdAt: p(1) },
      { type: 'new_client', title: 'New client added · Midnight Studio', message: 'New client Midnight Studio was registered by Sales team.', client: clients[11]._id, priority: 'low', isRead: true, createdAt: p(1) },
    ])

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      summary: {
        users: users.length,
        clients: clients.length,
        orders: orders.length,
      },
    })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    // Respects the same production guard as POST — this route (and the
    // demo accounts it describes) doesn't exist in production.
    return NextResponse.json({ success: false, error: 'Seed is disabled in production' }, { status: 403 })
  }

  return NextResponse.json({
    message: 'POST to this endpoint to seed the database',
    demoAccounts: {
      note: 'No passwords — log in at /login with email + OTP. Local dev prints the code to the console if SMTP is not configured.',
      admin: 'admin@untitledstore.com',
      sales: 'sales@untitledstore.com',
      creative: 'creative@untitledstore.com',
      operations: 'operations@untitledstore.com',
      accounting: 'accounting@untitledstore.com',
    },
  })
}
