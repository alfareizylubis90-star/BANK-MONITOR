export type BankStatus = 'Aman' | 'RTP' | 'Off Sementara' | 'Cabut Kas 1';

export interface Bank {
  id: string;
  name: string;
  accountNumber: string;
  accountName: string;
  status: BankStatus;
  notes: string;
  updatedAt: string;
}

export interface StatusCounter {
  Aman: number;
  RTP: number;
  'Off Sementara': number;
  'Cabut Kas 1': number;
}

export interface ParsedFollowUp {
  id: string;
  bankName: string;      // e.g. "BANK KAS BERSIH DANAMON"
  accountName: string;   // e.g. "Renny Oktaviyani"
  accountNumber: string; // e.g. "3698157124"
  balance: string;       // e.g. "86,180,665"
  problem: string;       // e.g. "TERBLOKIR"
  action: string;        // e.g. "DI OFFKAN"
  deviceStatus: string;  // e.g. "HP MASIH DI SITUS"
}

