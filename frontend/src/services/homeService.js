import api from "./api";

const homeService = {
  async getHeroSlides() {
    const response = await api.get("/home/slides");
    return response.data;
  },

  async getSiteStats() {
    const response = await api.get("/home/stats");
    return response.data;
  },

  // NEW: Get all home content
  async getHomeContent() {
    const response = await api.get("/home/content");
    return response.data;
  },

  async getActiveDiscount() {
    const response = await api.get("/home/discount/active");
    return response.data;
  },
  
  // NEW: Admin functions
  async getAllSlides() {
    const response = await api.get("/home/admin/slides");
    return response.data;
  },

  async createSlide(formData) {
    const response = await api.post("/home/admin/slides", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async updateSlide(id, formData) {
    const response = await api.put(`/home/admin/slides/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  async deleteSlide(id) {
    const response = await api.delete(`/home/admin/slides/${id}`);
    return response.data;
  },

  async updateSiteStats(stats) {
    const response = await api.put("/home/admin/stats", { stats });
    return response.data;
  },
};

export default homeService;
