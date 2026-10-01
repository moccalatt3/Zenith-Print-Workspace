const PDFDocument = require("pdfkit");
const db = require("../config/db");

class QuotationGenerator {
  async generateQuotationPDF(orderId) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`🔄 Starting PDF generation for order: ${orderId}`);

        // Ambil data order, items, dan user secara terpisah
        const order = await this.getOrderData(orderId);
        console.log("📦 Order data:", order);

        const orderItems = await this.getOrderItems(orderId);
        console.log("📋 Order items:", orderItems);

        const user = await this.getUserData(order.user_id);
        console.log("👤 User data:", user);

        // Create PDF document dengan margin yang lebih longgar
        const doc = new PDFDocument({
          margin: 50,
          size: "A4",
          bufferPages: true,
        });

        const chunks = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => {
          console.log("✅ PDF generated successfully");
          resolve(Buffer.concat(chunks));
        });
        doc.on("error", (error) => {
          console.error("❌ PDF generation error:", error);
          reject(error);
        });

        // Variables untuk tracking posisi
        doc.currentY = 0;

        // Generate content dengan layout yang lebih rapi
        this.generateHeader(doc);
        this.generateQuotationInfo(doc, order);
        this.generateCustomerInfo(doc, user, order);
        this.generateReference(doc, order);
        this.generateItemsTable(doc, orderItems);
        this.generateSummary(doc, order, orderItems);
        this.generateFooter(doc);

        doc.end();
      } catch (error) {
        console.error("❌ Error generating quotation:", error);
        reject(error);
      }
    });
  }

  async getOrderData(orderId) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          o.*
         FROM orders o 
         WHERE o.id = ?`,
        [orderId]
      );

      if (!rows[0]) {
        throw new Error(`Order dengan ID ${orderId} tidak ditemukan`);
      }
      return rows[0];
    } catch (error) {
      console.error("Error getting order data:", error);
      throw error;
    }
  }

  async getOrderItems(orderId) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          original_file_name,
          material_name,
          quantity,
          unit_price,
          final_price,
          total_price,
          volume,
          weight,
          dimensions
         FROM order_items 
         WHERE order_id = ?
         ORDER BY id`,
        [orderId]
      );
      return rows;
    } catch (error) {
      console.error("Error getting order items:", error);
      throw error;
    }
  }

  async getUserData(userId) {
    try {
      const [rows] = await db.execute(
        `SELECT 
          name,
          address,
          phone,
          email,
          user_type
         FROM users 
         WHERE id = ?`,
        [userId]
      );
      return rows[0] || {};
    } catch (error) {
      console.error("Error getting user data:", error);
      return {};
    }
  }

  generateHeader(doc) {
    try {
      // Reset currentY
      doc.currentY = 50;

      // Company Name - diperkecil ukurannya
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("PT ZENITH ENGINEERING INDONESIA", 50, doc.currentY);

      // Tagline dengan spacing yang cukup
      doc.currentY += 20;
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#666666")
        .text(
          "Any Size, Any Design, Any Material ~ WE SHAPE IT ALL",
          50,
          doc.currentY
        );

      // Address dengan line spacing yang baik
      doc.currentY += 15;
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#333333")
        .text(
          "Jl. Ganesha Boulevard, Fresno Business District No C10",
          50,
          doc.currentY
        )
        .text("Deltamas, Cikarang Pusat, Jawa Barat", 50, doc.currentY + 10)
        .text("17530", 50, doc.currentY + 20);

      doc.currentY += 50;
    } catch (error) {
      console.error("Error in generateHeader:", error);
    }
  }

  generateQuotationInfo(doc, order) {
    try {
      const boxWidth = 180;
      const boxX = 370;
      const boxY = 50;

      // QUOTATION text - disamakan ukurannya dengan header (16px)
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("QUOTATION", boxX, boxY, {
          align: "center",
          width: boxWidth,
        });

      // Garis pemisah - diubah menjadi abu-abu
      doc
        .moveTo(boxX, boxY + 25)
        .lineTo(boxX + boxWidth, boxY + 25)
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .stroke();

      // Info details dengan spacing yang baik
      const currentDate = new Date().toLocaleDateString("en-GB");
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#000000")
        .text(`DATE: ${currentDate}`, boxX + 10, boxY + 35);

      const quoteNumber = `QT${order.id}_${this.generateRandomNumber()}`;
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text(`QUOTATION #: ${quoteNumber}`, boxX + 10, boxY + 50);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#000000")
        .text("COMPANY ID: 251002", boxX + 10, boxY + 65);
    } catch (error) {
      console.error("Error in generateQuotationInfo:", error);
    }
  }

  generateCustomerInfo(doc, user, order) {
    try {
      const startY = 140;

      // Section title dengan background light
      doc.rect(50, startY, 495, 25).fill("#f8f9fa");

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("QUOTATION FOR:", 60, startY + 8);

      doc.currentY = startY + 35;

      // Customer name dengan styling yang jelas
      const customerName = user.name || "(Customer Name)";
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text(customerName, 60, doc.currentY);

      // Tampilkan "(Company)" jika user_type adalah company
      if (user.user_type === "company") {
        doc.currentY += 15;
        doc
          .fontSize(9)
          .font("Helvetica-Bold")
          .fillColor("#666666")
          .text("(Company)", 60, doc.currentY);
      }

      // Address dengan formatting yang baik
      doc.currentY += user.user_type === "company" ? 20 : 15;

      // Ambil alamat dari table users column address
      const address = user.address;
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .fillColor("#333333")
        .text("Alamat:", 60, doc.currentY);

      doc.currentY += 10;
      doc.fontSize(8).font("Helvetica").fillColor("#333333");

      if (address) {
        const addressLines = this.splitAddress(address);
        addressLines.forEach((line) => {
          doc.text(line, 60, doc.currentY);
          doc.currentY += 10;
        });
      } else {
        // Jika address null, tampilkan "-"
        doc.text("-", 60, doc.currentY);
        doc.currentY += 10;
      }

      // Horizontal line pemisah - diubah menjadi abu-abu
      doc.currentY += 8;
      doc
        .moveTo(50, doc.currentY)
        .lineTo(545, doc.currentY)
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .stroke();

      doc.currentY += 15;
    } catch (error) {
      console.error("Error in generateCustomerInfo:", error);
    }
  }

  generateReference(doc, order) {
    try {
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("REFERENCE:", 50, doc.currentY);

      // Order number sebagai reference
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#333333")
        .text(order.order_number || "N/A", 120, doc.currentY);

      doc.currentY += 20;
    } catch (error) {
      console.error("Error in generateReference:", error);
    }
  }

  generateItemsTable(doc, orderItems) {
    try {
      const tableTop = doc.currentY + 10;

      // Header background
      doc.rect(50, tableTop, 495, 25).fill("#f8f9fa");
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000");

      const colNo = 50;
      const colItems = 75;
      const colQty = 420;
      const colAmount = 475;

      // Header teks sejajar
      doc.text("NO", colNo + 10, tableTop + 8);
      doc.text("ITEMS", colItems + 10, tableTop + 8);
      doc.text("QTY", colQty, tableTop + 8, { align: "center", width: 40 });
      doc.text("AMOUNT", colAmount, tableTop + 8, {
        align: "right",
        width: 60,
      });

      // Garis header - diubah menjadi abu-abu
      doc
        .moveTo(50, tableTop + 25)
        .lineTo(545, tableTop + 25)
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .stroke();

      let yPosition = tableTop + 30;
      let itemNumber = 1;
      let subtotal = 0;

      if (orderItems && orderItems.length > 0) {
        orderItems.forEach((item, index) => {
          if (yPosition > 700) {
            this.addNewPageWithHeader(doc);
            yPosition = 100;
          }

          // Alternating background rows
          if (index % 2 === 0) {
            doc.rect(50, yPosition - 5, 495, 40).fill("#fafafa");
          }

          doc.fontSize(9).font("Helvetica").fillColor("#000000");

          // NO
          doc.text(itemNumber.toString(), colNo + 10, yPosition);

          // ITEMS - menampilkan semua data yang sebelumnya di information
          const itemsInfo = this.generateItemsInformation(item);
          const itemsHeight = doc.heightOfString(itemsInfo, {
            width: 330,
            lineGap: 3,
          });
          doc.text(itemsInfo, colItems + 10, yPosition, {
            width: 330,
            lineGap: 3,
          });

          // QTY
          doc.text((item.quantity || 1).toString(), colQty, yPosition, {
            align: "center",
            width: 40,
          });

          // AMOUNT (tanpa unit price)
          const amount =
            (item.final_price || item.unit_price || 0) * (item.quantity || 1);
          doc.text(
            `Rp ${this.formatNumber(amount)}`,
            colAmount + 0,
            yPosition,
            {
              align: "right",
              width: 60,
            }
          );

          subtotal += amount;
          itemNumber++;

          const rowHeight = Math.max(itemsHeight, 20) + 10;
          yPosition += rowHeight;

          // Thin line separator - diubah menjadi abu-abu
          if (index < orderItems.length - 1) {
            doc
              .moveTo(50, yPosition - 2)
              .lineTo(545, yPosition - 2)
              .strokeColor("#cccccc")
              .lineWidth(0.5)
              .stroke();
            yPosition += 5;
          }
        });
      }

      // Bottom border - diubah menjadi abu-abu
      doc
        .moveTo(50, yPosition + 5)
        .lineTo(545, yPosition + 5)
        .strokeColor("#cccccc")
        .lineWidth(0.5)
        .stroke();

      doc.currentY = yPosition + 15;
      doc.subtotal = subtotal;
    } catch (error) {
      console.error("Error in generateItemsTable:", error);
    }
  }

  generateSummary(doc, order, orderItems) {
    try {
      const startY = doc.currentY;
      const subtotal = doc.subtotal || 0;

      // Background kotak ringkasan
      const boxX = 330;
      const boxY = startY;
      const boxWidth = 215;
      const boxHeight = 40; // DIKURANGI: karena hanya menampilkan satu baris

      doc
        .rect(boxX, boxY, boxWidth, boxHeight)
        .fill("#f8f9fa")
        .stroke("#f8f9fa");

      let currentY = boxY + 15;
      const labelX = boxX + 15;
      const valueX = boxX + boxWidth - 80;

      // Hanya menampilkan TOTAL dengan teks bold
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000");

      // Label "TOTAL" di kiri
      doc.text("TOTAL", labelX, currentY, {
        align: "left",
        width: 100,
      });

      // Nilai total di kanan
      doc.text(`Rp ${this.formatNumber(subtotal)}`, valueX, currentY, {
        align: "right",
        width: 70,
      });

      doc.currentY = boxY + boxHeight + 10;
    } catch (error) {
      console.error("Error in generateSummary:", error);
    }
  }

  generateFooter(doc) {
    try {
      const startY = doc.currentY + 150;

      // Regards section dengan spacing yang baik
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#000000")
        .text("Regards,", 50, startY)
        .text("ZENITH PRINT LABS", 50, startY + 15)
        .fontSize(9)
        .font("Helvetica")
        .text("PT ZENITH ENGINEERING INDONESIA", 50, startY + 30);

      // Page number
      const pageNumber = doc.bufferedPageRange().count;
      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#666666")
        .text(`Page ${pageNumber}`, 520, 800, { align: "right" });
    } catch (error) {
      console.error("Error in generateFooter:", error);
    }
  }

  addNewPageWithHeader(doc) {
    doc.addPage();

    // Add simple header untuk halaman berikutnya
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#666666")
      .text("PT ZENITH ENGINEERING INDONESIA - Quotation Continued", 50, 30);

    doc.currentY = 50;
  }

  // Helper functions yang diperbaiki
  generateItemsInformation(item) {
    const parts = [];

    if (item.original_file_name) {
      parts.push(`File: ${item.original_file_name}`);
    }

    if (item.material_name) {
      parts.push(`Material: ${item.material_name}`);
    }

    if (item.volume) {
      parts.push(
        `Volume: ${parseFloat(item.volume).toLocaleString("id-ID")} mm³`
      );
    }

    if (item.weight) {
      parts.push(`Weight: ${item.weight} gram`);
    }

    if (item.dimensions) {
      parts.push(`Dimensions: ${item.dimensions}`);
    }

    return parts.join(" | ");
  }

  splitAddress(address) {
    if (!address) return [];

    const lines = address
      .split(/[\n,]/)
      .map((line) => line.trim())
      .filter((line) => line);
    return lines.slice(0, 3);
  }

  formatNumber(amount) {
    try {
      return new Intl.NumberFormat("id-ID").format(Math.round(amount));
    } catch (error) {
      return "0";
    }
  }

  generateRandomNumber() {
    return Math.floor(100000 + Math.random() * 900000)
      .toString()
      .substring(0, 6);
  }
}

module.exports = new QuotationGenerator();
