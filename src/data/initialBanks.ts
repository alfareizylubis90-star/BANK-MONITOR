import { Bank } from '../types';

export const INITIAL_BANKS: Bank[] = [
  {
    id: 'bca-1',
    name: 'BCA',
    accountNumber: '8027411204',
    accountName: 'PT SUKSES MAJU SEJAHTERA',
    status: 'Aman',
    notes: 'Operasional normal. Transfer masuk lancar tanpa kendala.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mandiri-1',
    name: 'MANDIRI',
    accountNumber: '132009241556',
    accountName: 'CV JAYA ABADI SEJAHTERA',
    status: 'Cabut Kas 1',
    notes: 'Cabut Kas sementara karena limit harian terlampaui.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bri-1',
    name: 'BRI',
    accountNumber: '020601004112503',
    accountName: 'SUDARMAN WIDJOJO',
    status: 'RTP',
    notes: 'Real-Time Posting aktif. Ada delay delay 2-5 menit pada jam malam.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'danamon-1',
    name: 'DANAMON',
    accountNumber: '00361254789',
    accountName: 'INDRA SETIAWAN',
    status: 'Off Sementara',
    notes: 'Maintenance terjadwal dari pihak pusat bank.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bni-1',
    name: 'BNI',
    accountNumber: '0423157890',
    accountName: 'PT SINAR UTAMA KREATIF',
    status: 'Aman',
    notes: 'Lancar Jaya. Siap menerima dana transfer masuk.',
    updatedAt: new Date().toISOString()
  }
];
