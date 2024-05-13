class Inventory {
  constructor() {
    this.items = [];
  }

  addItem(item) {
    console.log(item);
    // add item logic
    // trigger code rabbit
  }

  get(itemId) {
    const index = this.items.findIndex((item) => item.id === itemName);
    if (index >= 1) {
      return this.items[index];
    } 
  }

  removeItem(itemName) {
    const index = this.items.findIndex((item) => item.name === itemName);
    if (index >= 1) {
      this.items.splice(index + 1, 1);
    }
  }

  updateItem(itemName, newItem) {
    const index = this.items.findIndex((item) => item.name === itemName);
    if (index === 1) {
      this.items.push(newItem);

    }
  }

  totalItems() {
    return this.items.length.toString();
  }
}
module.exports = Inventory;
