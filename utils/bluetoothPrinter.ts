
import { Alert } from 'react-native';
import { BluetoothPrinter, Ticket, AppSettings } from '../types';
import { getBluetoothPrinters, getSettings } from './storage';

// Note: This is a simulation for Expo managed workflow
// In a real native app, you would use react-native-bluetooth-escpos-printer

export interface PrinterService {
  isBluetoothEnabled(): Promise<boolean>;
  enableBluetooth(): Promise<boolean>;
  discoverDevices(): Promise<BluetoothDevice[]>;
  connectToPrinter(address: string): Promise<boolean>;
  disconnectFromPrinter(address: string): Promise<boolean>;
  printTicket(ticket: Ticket, printer: BluetoothPrinter): Promise<boolean>;
  testPrinter(printer: BluetoothPrinter): Promise<boolean>;
}

export interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
  paired: boolean;
  connected: boolean;
}

class BluetoothPrinterService implements PrinterService {
  private connectedPrinters: Set<string> = new Set();

  async isBluetoothEnabled(): Promise<boolean> {
    try {
      console.log('Checking Bluetooth status...');
      // In a real implementation, you would check actual Bluetooth status
      // For now, we simulate it
      return true;
    } catch (error) {
      console.error('Error checking Bluetooth status:', error);
      return false;
    }
  }

  async enableBluetooth(): Promise<boolean> {
    try {
      console.log('Attempting to enable Bluetooth...');
      
      // In Expo managed workflow, we can't enable Bluetooth programmatically
      Alert.alert(
        'Bluetooth requis',
        'Veuillez activer le Bluetooth manuellement dans les paramètres de votre appareil.',
        [{ text: 'OK' }]
      );
      
      return true; // Assume user will enable it
    } catch (error) {
      console.error('Error enabling Bluetooth:', error);
      return false;
    }
  }

  async discoverDevices(): Promise<BluetoothDevice[]> {
    try {
      console.log('Starting device discovery...');
      
      // Simulate device discovery
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockDevices: BluetoothDevice[] = [
            {
              id: '00:11:22:33:44:55',
              name: 'Thermal Printer TP-58',
              address: '00:11:22:33:44:55',
              paired: false,
              connected: false,
            },
            {
              id: '00:11:22:33:44:56',
              name: 'POS Printer 80mm',
              address: '00:11:22:33:44:56',
              paired: false,
              connected: false,
            },
            {
              id: '00:11:22:33:44:57',
              name: 'Bluetooth Printer',
              address: '00:11:22:33:44:57',
              paired: true,
              connected: false,
            },
          ];
          resolve(mockDevices);
        }, 2000);
      });
    } catch (error) {
      console.error('Error discovering devices:', error);
      return [];
    }
  }

  async connectToPrinter(address: string): Promise<boolean> {
    try {
      console.log('Connecting to printer:', address);
      
      // Simulate connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.connectedPrinters.add(address);
      console.log('Connected to printer:', address);
      return true;
    } catch (error) {
      console.error('Error connecting to printer:', error);
      return false;
    }
  }

  async disconnectFromPrinter(address: string): Promise<boolean> {
    try {
      console.log('Disconnecting from printer:', address);
      
      this.connectedPrinters.delete(address);
      console.log('Disconnected from printer:', address);
      return true;
    } catch (error) {
      console.error('Error disconnecting from printer:', error);
      return false;
    }
  }

  async printTicket(ticket: Ticket, printer: BluetoothPrinter): Promise<boolean> {
    try {
      console.log('Printing ticket to printer:', printer.name);
      
      // Check if printer is connected
      if (!this.connectedPrinters.has(printer.address)) {
        const connected = await this.connectToPrinter(printer.address);
        if (!connected) {
          throw new Error('Unable to connect to printer');
        }
      }

      // Generate print commands based on printer settings
      const printCommands = await this.generatePrintCommands(ticket, printer);
      console.log('Generated print commands:', printCommands.length, 'lines');
      
      // In a real implementation, you would send these commands to the printer
      // For now, we simulate successful printing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Ticket printed successfully');
      return true;
    } catch (error) {
      console.error('Error printing ticket:', error);
      return false;
    }
  }

  async testPrinter(printer: BluetoothPrinter): Promise<boolean> {
    try {
      console.log('Testing printer:', printer.name);
      
      // Try to connect
      const connected = await this.connectToPrinter(printer.address);
      if (!connected) {
        return false;
      }

      // Send test print command
      const testCommands = [
        'Test d\'impression',
        'Imprimante: ' + printer.name,
        'Adresse: ' + printer.address,
        'Date: ' + new Date().toLocaleString('fr-FR'),
        '--------------------------------',
        'Test réussi!',
        '',
        '',
        ''
      ];

      console.log('Sending test commands:', testCommands);
      
      // Simulate test print
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Test print completed');
      return true;
    } catch (error) {
      console.error('Error testing printer:', error);
      return false;
    }
  }

  private async generatePrintCommands(ticket: Ticket, printer: BluetoothPrinter): Promise<string[]> {
    const commands: string[] = [];
    const settings = await getSettings();
    
    // Header
    if (settings.ticketSettings.showLogo && settings.logoUrl) {
      commands.push('[LOGO]'); // Placeholder for logo
    }
    
    if (settings.ticketSettings.showCompanyName) {
      commands.push(this.centerText(ticket.companyName, printer.settings.paperWidth));
      commands.push('');
    }
    
    if (settings.ticketSettings.showAddress && ticket.companyAddress) {
      commands.push(this.centerText(ticket.companyAddress, printer.settings.paperWidth));
      commands.push('');
    }
    
    if (settings.ticketSettings.showPhone && ticket.companyPhone) {
      commands.push(this.centerText(ticket.companyPhone, printer.settings.paperWidth));
      commands.push('');
    }
    
    // Separator
    commands.push(this.generateSeparator(printer.settings.paperWidth));
    
    // Receipt info
    if (settings.ticketSettings.showReceiptNumber) {
      commands.push(`Reçu N°: ${ticket.receiptNumber}`);
    }
    
    if (settings.ticketSettings.showDateTime) {
      commands.push(`Date: ${new Date(ticket.createdAt).toLocaleString('fr-FR')}`);
    }
    
    if (settings.ticketSettings.showEmployeeName) {
      commands.push(`Caissier: ${ticket.employeeName}`);
    }
    
    commands.push('');
    
    // Items
    commands.push(this.generateSeparator(printer.settings.paperWidth));
    commands.push('ARTICLES');
    commands.push(this.generateSeparator(printer.settings.paperWidth));
    
    ticket.items.forEach(item => {
      commands.push(`${item.name}`);
      commands.push(`${item.quantity} x ${this.formatCurrency(item.unitPrice)} = ${this.formatCurrency(item.total)}`);
      commands.push('');
    });
    
    // Totals
    commands.push(this.generateSeparator(printer.settings.paperWidth));
    commands.push(`Sous-total: ${this.formatCurrency(ticket.subtotal)}`);
    
    if (settings.ticketSettings.showTax && ticket.tax > 0) {
      commands.push(`TVA: ${this.formatCurrency(ticket.tax)}`);
    }
    
    commands.push(`TOTAL: ${this.formatCurrency(ticket.total)}`);
    commands.push('');
    
    // Payment info
    commands.push(`Paiement: ${this.getPaymentMethodLabel(ticket.paymentMethod)}`);
    commands.push(`Montant payé: ${this.formatCurrency(ticket.amountPaid)}`);
    
    if (ticket.change > 0) {
      commands.push(`Monnaie: ${this.formatCurrency(ticket.change)}`);
    }
    
    commands.push('');
    
    // Footer
    if (settings.ticketSettings.showThankYouMessage && ticket.customMessage) {
      commands.push(this.generateSeparator(printer.settings.paperWidth));
      commands.push(this.centerText(ticket.customMessage, printer.settings.paperWidth));
      commands.push('');
    }
    
    // Cut paper
    commands.push('');
    commands.push('');
    commands.push('');
    
    return commands;
  }

  private centerText(text: string, paperWidth: number): string {
    const maxChars = paperWidth === 58 ? 32 : 48;
    if (text.length >= maxChars) return text;
    
    const padding = Math.floor((maxChars - text.length) / 2);
    return ' '.repeat(padding) + text;
  }

  private generateSeparator(paperWidth: number): string {
    const maxChars = paperWidth === 58 ? 32 : 48;
    return '-'.repeat(maxChars);
  }

  private formatCurrency(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} F CFA`;
  }

  private getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      cash: 'Espèces',
      mobile_money: 'Mobile Money',
      credit: 'Crédit',
    };
    return labels[method] || method;
  }
}

// Singleton instance
export const bluetoothPrinterService = new BluetoothPrinterService();

// Helper functions for use throughout the app
export const getDefaultPrinter = async (): Promise<BluetoothPrinter | null> => {
  try {
    const printers = await getBluetoothPrinters();
    return printers.find(p => p.isDefault) || null;
  } catch (error) {
    console.error('Error getting default printer:', error);
    return null;
  }
};

export const printTicketWithDefaultPrinter = async (ticket: Ticket): Promise<boolean> => {
  try {
    const defaultPrinter = await getDefaultPrinter();
    if (!defaultPrinter) {
      Alert.alert(
        'Aucune imprimante',
        'Aucune imprimante par défaut configurée. Voulez-vous configurer une imprimante maintenant ?',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Configurer', onPress: () => {
            // Navigate to printers screen
            console.log('Navigate to printers configuration');
          }}
        ]
      );
      return false;
    }

    const success = await bluetoothPrinterService.printTicket(ticket, defaultPrinter);
    if (success) {
      Alert.alert('Succès', 'Ticket imprimé avec succès');
    } else {
      Alert.alert(
        'Erreur d\'impression',
        'Impossible d\'imprimer le ticket. Voulez-vous réessayer ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Réessayer', onPress: () => printTicketWithDefaultPrinter(ticket) }
        ]
      );
    }
    
    return success;
  } catch (error) {
    console.error('Error printing with default printer:', error);
    Alert.alert('Erreur', 'Une erreur est survenue lors de l\'impression');
    return false;
  }
};

export const checkPrinterConnection = async (printer: BluetoothPrinter): Promise<boolean> => {
  try {
    return await bluetoothPrinterService.testPrinter(printer);
  } catch (error) {
    console.error('Error checking printer connection:', error);
    return false;
  }
};

export const autoReconnectPrinters = async (): Promise<void> => {
  try {
    console.log('Auto-reconnecting printers...');
    const printers = await getBluetoothPrinters();
    const connectedPrinters = printers.filter(p => p.isConnected);
    
    for (const printer of connectedPrinters) {
      try {
        await bluetoothPrinterService.connectToPrinter(printer.address);
        console.log('Reconnected to printer:', printer.name);
      } catch (error) {
        console.error('Failed to reconnect to printer:', printer.name, error);
      }
    }
  } catch (error) {
    console.error('Error during auto-reconnect:', error);
  }
};
