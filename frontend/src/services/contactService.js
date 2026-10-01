import api from "./api";

const contactService = {
  async getContactInfo() {
    try {
      const response = await api.get("/contact/");
      return response.data;
    } catch (error) {
      console.error("Error fetching contact info:", error);
      throw error;
    }
  },

  async getFAQs() {
    try {
      const response = await api.get("/contact/faqs");
      return response.data;
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      throw error;
    }
  },

  // Method untuk update contact info
  async updateContactInfo(contactId, contactData) {
    try {
      const response = await api.put(
        `/contact/admin/${contactId}`,
        contactData
      );
      return response.data;
    } catch (error) {
      console.error("Error updating contact info:", error);
      throw error;
    }
  },

  // Method untuk update multiple contacts
  async updateMultipleContacts(contacts) {
    try {
      // Update setiap contact secara sequential
      const results = [];
      for (const contact of contacts) {
        const result = await this.updateContactInfo(contact.id, {
          contact_type: contact.contact_type,
          title: contact.title,
          value: contact.value,
          display_order: contact.display_order,
          is_active: contact.is_active,
        });
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error("Error updating multiple contacts:", error);
      throw error;
    }
  },

  // Optional: Method khusus untuk mendapatkan WhatsApp floating
  async getFloatingWhatsApp() {
    try {
      const response = await this.getContactInfo();
      if (response.success) {
        const floatingWhatsapp = response.data.find(
          (contact) => contact.contact_type === "whatsapp_floating"
        );
        return floatingWhatsapp || null;
      }
      return null;
    } catch (error) {
      console.error("Error fetching floating WhatsApp:", error);
      throw error;
    }
  },
};

export default contactService;
