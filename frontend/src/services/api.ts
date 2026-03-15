import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Participant {
  name: string;
  account_number: string;
  signature?: string;
}

export interface Equipment {
  name: string;
  serial_number: string;
  description: string;
}

export interface Vehicle {
  plate?: string;
  brand?: string;
  model?: string;
  color?: string;
  driver_name?: string;
}

export interface LoanRecordCreate {
  class_name: string;
  section: string;
  teacher_name: string;
  practice_description: string;
  departure_date: string;
  departure_time: string;
  return_date: string;
  return_time: string;
  delivered_by: string;
  reviewed_by: string;
  vehicle?: Vehicle;
  participants: Participant[];
  equipment_list: Equipment[];
  responsible_signature?: string;
  status?: string;
}

export interface LoanRecord extends LoanRecordCreate {
  id: string;
  request_date: string;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total: number;
  active: number;
  returned: number;
  cancelled: number;
}

// API Service
export const apiService = {
  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Loans
  getLoans: async (status?: string): Promise<LoanRecord[]> => {
    const params = status ? { status } : {};
    const response = await api.get('/loans', { params });
    return response.data;
  },

  getLoan: async (id: string): Promise<LoanRecord> => {
    const response = await api.get(`/loans/${id}`);
    return response.data;
  },

  createLoan: async (loan: LoanRecordCreate): Promise<LoanRecord> => {
    const response = await api.post('/loans', loan);
    return response.data;
  },

  updateLoan: async (id: string, loan: Partial<LoanRecordCreate>): Promise<LoanRecord> => {
    const response = await api.put(`/loans/${id}`, loan);
    return response.data;
  },

  deleteLoan: async (id: string): Promise<void> => {
    await api.delete(`/loans/${id}`);
  },

  updateLoanStatus: async (id: string, status: string): Promise<LoanRecord> => {
    const response = await api.patch(`/loans/${id}/status?status=${status}`);
    return response.data;
  },

  // Stats
  getStats: async (): Promise<Stats> => {
    const response = await api.get('/stats');
    return response.data;
  },
};

export default apiService;
