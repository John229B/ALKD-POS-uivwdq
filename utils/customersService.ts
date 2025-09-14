
import { Customer, CustomerTransaction } from '../types';
import { getCustomers, storeCustomers } from './storage';
import uuid from 'react-native-uuid';

export class CustomersService {
  /**
   * Apply advance payment for a customer
   * @param customerId - Customer ID
   * @param amount - Amount to deduct from customer's advance balance
   */
  static async applyAdvance(customerId: string, amount: number): Promise<Customer | null> {
    try {
      console.log(`CustomersService: Applying advance - Customer: ${customerId}, Amount: ${amount}`);
      
      const customers = await getCustomers();
      const customerIndex = customers.findIndex(c => c.id === customerId);
      
      if (customerIndex === -1) {
        console.error(`CustomersService: Customer not found: ${customerId}`);
        return null;
      }
      
      const customer = customers[customerIndex];
      
      // Check if customer has sufficient advance balance
      if (customer.balance < amount) {
        console.error(`CustomersService: Insufficient advance balance. Available: ${customer.balance}, Required: ${amount}`);
        throw new Error('Solde d\'avance insuffisant');
      }
      
      // Update customer balance
      const updatedCustomer: Customer = {
        ...customer,
        balance: customer.balance - amount,
        updatedAt: new Date(),
      };
      
      // Create transaction record
      const transaction: CustomerTransaction = {
        id: uuid.v4() as string,
        date: new Date(),
        amount: amount,
        type: 'took',
        paymentMethod: 'advance',
        description: `Utilisation d'avance - Montant: ${amount}`,
        balance: updatedCustomer.balance,
      };
      
      // Add transaction to customer
      updatedCustomer.transactions = [...(customer.transactions || []), transaction];
      
      // Update customers array
      const updatedCustomers = [...customers];
      updatedCustomers[customerIndex] = updatedCustomer;
      
      // Save to storage
      await storeCustomers(updatedCustomers);
      
      console.log(`CustomersService: Advance applied successfully. New balance: ${updatedCustomer.balance}`);
      return updatedCustomer;
    } catch (error) {
      console.error('CustomersService: Error applying advance:', error);
      throw error;
    }
  }
  
  /**
   * Add credit debt to a customer
   * @param customerId - Customer ID
   * @param amount - Credit amount to add as debt
   * @param description - Description of the credit transaction
   */
  static async addCredit(customerId: string, amount: number, description: string): Promise<Customer | null> {
    try {
      console.log(`CustomersService: Adding credit - Customer: ${customerId}, Amount: ${amount}`);
      
      const customers = await getCustomers();
      const customerIndex = customers.findIndex(c => c.id === customerId);
      
      if (customerIndex === -1) {
        console.error(`CustomersService: Customer not found: ${customerId}`);
        return null;
      }
      
      const customer = customers[customerIndex];
      
      // Update customer balance (subtract for debt)
      const updatedCustomer: Customer = {
        ...customer,
        balance: customer.balance - amount,
        totalPurchases: customer.totalPurchases + amount,
        updatedAt: new Date(),
      };
      
      // Create transaction record
      const transaction: CustomerTransaction = {
        id: uuid.v4() as string,
        date: new Date(),
        amount: amount,
        type: 'gave',
        paymentMethod: 'credit',
        description: description,
        balance: updatedCustomer.balance,
      };
      
      // Add transaction to customer
      updatedCustomer.transactions = [...(customer.transactions || []), transaction];
      
      // Update customers array
      const updatedCustomers = [...customers];
      updatedCustomers[customerIndex] = updatedCustomer;
      
      // Save to storage
      await storeCustomers(updatedCustomers);
      
      console.log(`CustomersService: Credit added successfully. New balance: ${updatedCustomer.balance}`);
      return updatedCustomer;
    } catch (error) {
      console.error('CustomersService: Error adding credit:', error);
      throw error;
    }
  }
  
  /**
   * Get customer by ID
   * @param customerId - Customer ID
   */
  static async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const customers = await getCustomers();
      const customer = customers.find(c => c.id === customerId);
      return customer || null;
    } catch (error) {
      console.error('CustomersService: Error getting customer by ID:', error);
      return null;
    }
  }
  
  /**
   * Update customer balance
   * @param customerId - Customer ID
   * @param newBalance - New balance amount
   * @param transactionType - Type of transaction ('gave' or 'took')
   * @param description - Description of the transaction
   */
  static async updateCustomerBalance(
    customerId: string, 
    newBalance: number, 
    transactionType: 'gave' | 'took',
    description: string
  ): Promise<Customer | null> {
    try {
      console.log(`CustomersService: Updating customer balance - Customer: ${customerId}, New Balance: ${newBalance}`);
      
      const customers = await getCustomers();
      const customerIndex = customers.findIndex(c => c.id === customerId);
      
      if (customerIndex === -1) {
        console.error(`CustomersService: Customer not found: ${customerId}`);
        return null;
      }
      
      const customer = customers[customerIndex];
      const balanceDifference = newBalance - customer.balance;
      
      // Update customer
      const updatedCustomer: Customer = {
        ...customer,
        balance: newBalance,
        updatedAt: new Date(),
      };
      
      // Create transaction record if there's a balance change
      if (balanceDifference !== 0) {
        const transaction: CustomerTransaction = {
          id: uuid.v4() as string,
          date: new Date(),
          amount: Math.abs(balanceDifference),
          type: transactionType,
          paymentMethod: 'adjustment',
          description: description,
          balance: newBalance,
        };
        
        // Add transaction to customer
        updatedCustomer.transactions = [...(customer.transactions || []), transaction];
      }
      
      // Update customers array
      const updatedCustomers = [...customers];
      updatedCustomers[customerIndex] = updatedCustomer;
      
      // Save to storage
      await storeCustomers(updatedCustomers);
      
      console.log(`CustomersService: Customer balance updated successfully. New balance: ${newBalance}`);
      return updatedCustomer;
    } catch (error) {
      console.error('CustomersService: Error updating customer balance:', error);
      throw error;
    }
  }
}

// Export individual functions for backward compatibility
export const applyAdvance = CustomersService.applyAdvance;
export const addCredit = CustomersService.addCredit;
export const getCustomerById = CustomersService.getCustomerById;
export const updateCustomerBalance = CustomersService.updateCustomerBalance;
