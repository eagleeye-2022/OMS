import type { IClient, ClientType, PaymentTerms, PreferredPaymentMode } from '@/types'

export interface ClientAddressFormValues {
  pinCode: string
  city: string
  state: string
  country: string
  landmark: string
}

export interface ClientEscalationFormValues {
  recipientName: string
  email: string
  mobileNumber: string
  address: string
}

export interface ClientAssetFormValue {
  url: string
  originalName: string
  mimeType: string
  size: number
  uploadedAt: string
}

export interface ClientProductPreferenceFormValues {
  preferredProductCategory: string
  orderQuantity: string
  orderNote: string
  totalAmount: string
  advancePaid: string
}

export interface ClientFormValues {
  _id?: string
  companyName: string
  clientType: ClientType
  contactPersonName: string
  designation: string
  phone: string
  alternatePhone: string
  email: string
  /**
   * Form-only name for the DB/API's `sameAsBilling` flag — kept distinct here
   * because "sameAsBilling" reads as "shipping mirrors billing" when the
   * actual direction is the reverse: Shipping is what the user fills in
   * first, and Billing mirrors it while this is on. Mapped to/from
   * `sameAsBilling` in mapClientToFormValues/buildClientPayload below; the
   * wire format and DB schema field name are unchanged.
   */
  billingSameAsShipping: boolean
  billingAddress: ClientAddressFormValues
  shippingAddress: ClientAddressFormValues
  gstNumber: string
  defaultAdvanceRequirement: string
  defaultPaymentTerms: PaymentTerms | ''
  customPaymentTerms: string
  preferredPaymentMode: PreferredPaymentMode | ''
  /** Sales-reference estimate of typical order size, not a real order total. */
  typicalOrderValue: string
  invoiceRecipientName: string
  invoiceEmail: string
  deliveryDate: string
  escalationContact: ClientEscalationFormValues
  assets: {
    companyLogo?: ClientAssetFormValue
    brandGuidelines?: ClientAssetFormValue
    artworkReferences?: ClientAssetFormValue
    previousDesigns?: ClientAssetFormValue
  }
  sharedLinks: {
    googleDriveFolder: string
    dropboxFolder: string
    websiteUrl: string
    socialMedia: string
  }
  productPreferences: ClientProductPreferenceFormValues[]
  notes: string
}

export function emptyClientFormValues(): ClientFormValues {
  return {
    companyName: '',
    clientType: 'individual',
    contactPersonName: '',
    designation: '',
    phone: '',
    alternatePhone: '',
    email: '',
    billingSameAsShipping: true,
    billingAddress: { pinCode: '', city: '', state: '', country: '', landmark: '' },
    shippingAddress: { pinCode: '', city: '', state: '', country: '', landmark: '' },
    gstNumber: '',
    defaultAdvanceRequirement: '',
    defaultPaymentTerms: '',
    customPaymentTerms: '',
    preferredPaymentMode: '',
    typicalOrderValue: '',
    invoiceRecipientName: '',
    invoiceEmail: '',
    deliveryDate: '',
    escalationContact: { recipientName: '', email: '', mobileNumber: '', address: '' },
    assets: {},
    sharedLinks: { googleDriveFolder: '', dropboxFolder: '', websiteUrl: '', socialMedia: '' },
    productPreferences: [{ preferredProductCategory: '', orderQuantity: '', orderNote: '', totalAmount: '', advancePaid: '' }],
    notes: '',
  }
}

function toDateInputValue(date?: string): string {
  if (!date) return ''
  return date.slice(0, 10)
}

export function mapClientToFormValues(client: IClient): ClientFormValues {
  return {
    _id: client._id,
    companyName: client.companyName || '',
    clientType: client.clientType || 'individual',
    contactPersonName: client.contactPersonName || '',
    designation: client.designation || '',
    phone: client.phone || '',
    alternatePhone: client.alternatePhone || '',
    email: client.email || '',
    billingSameAsShipping: client.sameAsBilling ?? true,
    billingAddress: {
      pinCode: client.billingAddress?.pinCode || '',
      city: client.billingAddress?.city || '',
      state: client.billingAddress?.state || '',
      country: client.billingAddress?.country || '',
      landmark: client.billingAddress?.landmark || '',
    },
    shippingAddress: {
      pinCode: client.shippingAddress?.pinCode || '',
      city: client.shippingAddress?.city || '',
      state: client.shippingAddress?.state || '',
      country: client.shippingAddress?.country || '',
      landmark: client.shippingAddress?.landmark || '',
    },
    gstNumber: client.gstNumber || '',
    defaultAdvanceRequirement: client.defaultAdvanceRequirement != null ? String(client.defaultAdvanceRequirement) : '',
    defaultPaymentTerms: client.defaultPaymentTerms || '',
    customPaymentTerms: client.customPaymentTerms || '',
    preferredPaymentMode: client.preferredPaymentMode || '',
    typicalOrderValue: client.typicalOrderValue != null ? String(client.typicalOrderValue) : '',
    invoiceRecipientName: client.invoiceRecipientName || '',
    invoiceEmail: client.invoiceEmail || '',
    deliveryDate: toDateInputValue(client.deliveryDate),
    escalationContact: {
      recipientName: client.escalationContact?.recipientName || '',
      email: client.escalationContact?.email || '',
      mobileNumber: client.escalationContact?.mobileNumber || '',
      address: client.escalationContact?.address || '',
    },
    assets: {
      companyLogo: client.assets?.companyLogo,
      brandGuidelines: client.assets?.brandGuidelines,
      artworkReferences: client.assets?.artworkReferences,
      previousDesigns: client.assets?.previousDesigns,
    },
    sharedLinks: {
      googleDriveFolder: client.sharedLinks?.googleDriveFolder || '',
      dropboxFolder: client.sharedLinks?.dropboxFolder || '',
      websiteUrl: client.sharedLinks?.websiteUrl || '',
      socialMedia: client.sharedLinks?.socialMedia || '',
    },
    productPreferences: client.productPreferences?.length
      ? client.productPreferences.map((p) => ({
          preferredProductCategory: p.preferredProductCategory || '',
          orderQuantity: p.orderQuantity != null ? String(p.orderQuantity) : '',
          orderNote: p.orderNote || '',
          totalAmount: p.totalAmount != null ? String(p.totalAmount) : '',
          advancePaid: p.advancePaid != null ? String(p.advancePaid) : '',
        }))
      : [{ preferredProductCategory: '', orderQuantity: '', orderNote: '', totalAmount: '', advancePaid: '' }],
    notes: client.notes || '',
  }
}

/** Builds the JSON payload sent to POST/PUT /api/clients, stripping form-only concerns. */
export function buildClientPayload(values: ClientFormValues, status: 'draft' | 'active'): Record<string, unknown> {
  const cleanProductPreferences = values.productPreferences
    .filter((p) => p.preferredProductCategory || p.orderQuantity || p.orderNote)
    .map((p) => ({
      preferredProductCategory: p.preferredProductCategory,
      orderQuantity: p.orderQuantity ? Number(p.orderQuantity) : undefined,
      orderNote: p.orderNote,
      totalAmount: p.totalAmount ? Number(p.totalAmount) : undefined,
      advancePaid: p.advancePaid ? Number(p.advancePaid) : undefined,
    }))

  return {
    companyName: values.companyName,
    clientType: values.clientType,
    status,
    contactPersonName: values.contactPersonName,
    designation: values.designation,
    phone: values.phone,
    alternatePhone: values.alternatePhone,
    email: values.email,
    sameAsBilling: values.billingSameAsShipping,
    billingAddress: values.billingSameAsShipping ? values.shippingAddress : values.billingAddress,
    shippingAddress: values.shippingAddress,
    gstNumber: values.gstNumber,
    defaultAdvanceRequirement: values.defaultAdvanceRequirement ? Number(values.defaultAdvanceRequirement) : undefined,
    defaultPaymentTerms: values.defaultPaymentTerms || undefined,
    customPaymentTerms: values.customPaymentTerms,
    preferredPaymentMode: values.preferredPaymentMode || undefined,
    typicalOrderValue: values.typicalOrderValue ? Number(values.typicalOrderValue) : undefined,
    invoiceRecipientName: values.invoiceRecipientName,
    invoiceEmail: values.invoiceEmail,
    deliveryDate: values.deliveryDate || undefined,
    escalationContact: values.escalationContact,
    assets: values.assets,
    sharedLinks: values.sharedLinks,
    productPreferences: cleanProductPreferences,
    notes: values.notes,
  }
}
