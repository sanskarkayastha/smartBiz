'use server'

import { getSession } from '@/app/lib/session'
import { createProductApi, deleteProductApi } from '@/app/lib/api'
import { revalidatePath } from 'next/cache'
import { CreateProductInput } from '@/types'

export async function createProduct(prevState: string | null, formData: FormData) {
  const session = await getSession()
  if (!session) return 'Not authenticated.'

  const data: CreateProductInput = {
    name: formData.get('name') as string,
    category: (formData.get('category') as string) || undefined,
    price: parseFloat(formData.get('price') as string),
    quantity: parseInt(formData.get('quantity') as string),
    reorderLevel: formData.get('reorderLevel') ? parseInt(formData.get('reorderLevel') as string) : undefined,
    supplier: (formData.get('supplier') as string) || undefined,
    sku: (formData.get('sku') as string) || undefined,
  }

  try {
    await createProductApi(session.token, session.userId, data)
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard')
    return null
  } catch (e) {
    return e instanceof Error ? e.message : 'Failed to create product.'
  }
}

export async function deleteProduct(productId: number) {
  const session = await getSession()
  if (!session) return

  await deleteProductApi(session.token, session.userId, productId)
  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard')
}
