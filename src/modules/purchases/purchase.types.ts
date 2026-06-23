export interface CreatePurchaseInput {
  description: string

  amount: number

  installments: number

  purchaseDate: Date

  creditCardId: string

  userId: string
}

export interface GetPurchaseInput {
  id: string

  userId: string
}

export interface CancelPurchaseInput {
  id: string

  userId: string
}

export interface ListPurchasesInput {
  userId: string

  creditCardId?: string

  month?: number

  year?: number
}