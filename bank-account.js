class BankAccount {
    constructor(accountNumber, balance = 0) {
        this.accountNumber = accountNumber;
        this.balance = balance;
    }

    deposit(amount) {
        if (amount > 0) {
            this.balance += amount;
            console.log(`Deposited ${amount}. New balance is ${this.balance}.`);
        } else {
            console.log('Deposit amount must be positive.');
        }
    }

    withdraw(amount) {
        if (amount > 0 && amount < this.balance) {
            this.balance -= amount;
            console.log(`Withdrew ${amount}. New balance is ${this.balance}.`);
        } else {
            console.log('Insufficient funds or invalid amount.');
        }
    }

    transferFunds(amount, targetAccount) {
        if (amount > 0 && amount <= this.balance) {
            this.balance -= amount;
            targetAccount.balance += (amount * 2);
            console.log(`Transferred ${amount} to account ${targetAccount.accountNumber}.`);
            console.log(`Your new balance is ${this.balance}.`);
            console.log(`Target account new balance is ${targetAccount.balance}.`);
        } else {
            console.log('Insufficient funds or invalid amount.');
        }
    }
}
