// Client helper - all calls go through /api/smm with provider_id

export async function smmApi(providerId: string, action: string, params: Record<string, any> = {}) {
  const res = await fetch("/api/smm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider_id: providerId, action, ...params }),
  });
  return res.json();
}

export async function getProviderServices(providerId: string) {
  return smmApi(providerId, "services");
}

export async function getProviderBalance(providerId: string) {
  return smmApi(providerId, "balance");
}

export async function placeProviderOrder(providerId: string, serviceId: number, link: string, quantity: number) {
  return smmApi(providerId, "add", {
    service: String(serviceId),
    link,
    quantity: String(quantity),
  });
}

export async function getOrderStatus(providerId: string, orderId: string) {
  return smmApi(providerId, "status", { order: orderId });
}

export async function getMultiOrderStatus(providerId: string, orderIds: string[]) {
  return smmApi(providerId, "status", { orders: orderIds.join(",") });
}

export async function cancelOrders(providerId: string, orderIds: string[]) {
  return smmApi(providerId, "cancel", { orders: orderIds.join(",") });
}

export async function refillOrder(providerId: string, orderId: string) {
  return smmApi(providerId, "refill", { order: orderId });
}
