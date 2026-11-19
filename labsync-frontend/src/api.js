import axios from 'axios';

// Backend port
const API_BASE_URL = 'http://localhost:8080/api'; 

// Labs Endpoints
export const getLabs = () => axios.get(`${API_BASE_URL}/labs`);

// Assets / computers Endpoints
export const getAssets = () => axios.get(`${API_BASE_URL}/assets`);

// Fault Reports Endpoints (Updated from /faults to /fault-reports to match backend)
export const getFaultReports = () => axios.get(`${API_BASE_URL}/fault-reports`);
export const createFaultReport = (data) => axios.post(`${API_BASE_URL}/fault-reports`, data);
export const updateFaultStatus = (id, status) => 
  axios.put(`${API_BASE_URL}/fault-reports/${id}`, { status });

// Reservations Endpoints
export const getReservations = () => axios.get(`${API_BASE_URL}/reservations`);
export const createReservation = (data) => axios.post(`${API_BASE_URL}/reservations`, data);
export const updateReservationStatus = (id, status) => 
  axios.put(`${API_BASE_URL}/reservations/${id}`, { status });