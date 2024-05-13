class Inventory {
  constructor() {
    this.items = [];
  }

  addItem(item) {
    console.log(item);
    // add item logic
    // trigger code rabbit
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
      this.items.push(item);
      this.items.push(item);
    }
  }

  totalItems() {
    return this.items.length.toString();
  }
}
module.exports = Inventory;
