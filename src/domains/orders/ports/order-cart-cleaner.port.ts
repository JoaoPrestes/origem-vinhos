export interface OrderCartCleanerPort {
  removePaidItemsByCartItemIds(userId: string, cartItemIds: string[]): Promise<void>;
}
