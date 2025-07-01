'use server';

import { createDocumentFlow } from '@/ai/flows/createDocumentFlow';
import type { OrderItem } from '@/types';

export async function createGoogleDoc(orderItems: OrderItem[]): Promise<{ documentId: string }> {
  // The snapshot data URI can be very large and is not needed for the Google Doc.
  // We'll strip it out here before sending it to the flow.
  const itemsWithoutSnapshot = orderItems.map(({ snapshotDataUri, ...rest }) => rest);
  return await createDocumentFlow(itemsWithoutSnapshot);
}
