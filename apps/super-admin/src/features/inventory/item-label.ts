export function inventoryItemLabel(item: {
  item_name?: string | null;
  size?: string | null;
  item_code?: string | null;
}) {
  const name = item.item_name || 'Item';
  return item.size ? `${name} (${item.size})` : name;
}
