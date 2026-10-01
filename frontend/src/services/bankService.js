import api from "./api";

const bankService = {
  // Get all bank accounts
  getAllBanks: async () => {
    try {
      const response = await api.get("/bank/accounts");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Error fetching bank accounts" };
    }
  },

  // Create new bank account
  createBank: async (bankData) => {
    try {
      const response = await api.post("/bank/accounts", bankData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Error creating bank account" };
    }
  },

  // Update bank account
  updateBank: async (id, bankData) => {
    try {
      const response = await api.put(`/bank/accounts/${id}`, bankData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Error updating bank account" };
    }
  },

  // Delete bank account
  deleteBank: async (id) => {
    try {
      const response = await api.delete(`/bank/accounts/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Error deleting bank account" };
    }
  },
};

export default bankService;
