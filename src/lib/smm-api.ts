// Client-side helper to call our API proxy
export async function smmApi(action: string, params: Record<string, any> = {}) {
  const res = await fetch("/api/smm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json();
}

// Get all services from provider
export async function getProviderServices() {
  return smmApi("services");
}

// Get provider balance
export async function getProviderBalance() {
  return smmApi("balance");
}

// Place order on provider
export async function placeProviderOrder(serviceId: number, link: string, quantity: number) {
  return smmApi("add", {
    service: String(serviceId),
    link,
    quantity: String(quantity),
  });
}

// Get order status from provider
export async function getOrderStatus(orderId: string) {
  return smmApi("status", { order: orderId });
}

// Get multiple order statuses
export async function getMultiOrderStatus(orderIds: string[]) {
  return smmApi("status", { orders: orderIds.join(",") });
}

// Cancel orders
export async function cancelOrders(orderIds: string[]) {
  return smmApi("cancel", { orders: orderIds.join(",") });
}

// Refill order
export async function refillOrder(orderId: string) {
  return smmApi("refill", { order: orderId });
}
