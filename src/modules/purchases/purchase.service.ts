import { PurchaseCreateService }
  from './purchase.create.service.js'

import { PurchaseQueryService }
  from './pruchase.query.service.js'

import { PurchaseCancelService }
  from './pruchase.cancel.service.js'

import type {
  CreatePurchaseInput,
  GetPurchaseInput,
  CancelPurchaseInput,
  ListPurchasesInput,
} from './purchase.types.js'

const createService =
  new PurchaseCreateService()

const queryService =
  new PurchaseQueryService()

const cancelService =
  new PurchaseCancelService()

export class PurchaseService {
  async create(
    data: CreatePurchaseInput
  ) {
    return createService.execute(data)
  }

  async list(
    data: ListPurchasesInput
  ) {
    return queryService.list(data)
  }

  async getById(
    data: GetPurchaseInput
  ) {
    return queryService.getById(data)
  }

  async cancel(
    data: CancelPurchaseInput
  ) {
    return cancelService.execute(data)
  }
}