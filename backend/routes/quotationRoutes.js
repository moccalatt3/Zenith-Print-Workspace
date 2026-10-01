const express = require("express");
const router = express.Router();
const quotationGenerator = require("../utils/quotationGenerator");

// Generate quotation PDF
router.get("/:orderId/pdf", async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log(`📄 PDF Request for order: ${orderId}`);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID diperlukan",
      });
    }

    const pdfBuffer = await quotationGenerator.generateQuotationPDF(orderId);

    console.log(
      `✅ PDF Generated successfully for order: ${orderId}, Size: ${pdfBuffer.length} bytes`
    );

    // Set headers untuk download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="quotation-${orderId}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ Error generating quotation PDF:", error);
    res.status(500).json({
      success: false,
      message: "Gagal generate quotation PDF",
      error: error.message,
    });
  }
});

// Preview quotation PDF (tanpa download)
router.get("/:orderId/preview", async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log(`👀 Preview Request for order: ${orderId}`);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID diperlukan",
      });
    }

    const pdfBuffer = await quotationGenerator.generateQuotationPDF(orderId);

    console.log(
      `✅ PDF Preview ready for order: ${orderId}, Size: ${pdfBuffer.length} bytes`
    );

    // Set headers untuk preview di browser
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="quotation-${orderId}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ Error generating quotation PDF:", error);
    res.status(500).json({
      success: false,
      message: "Gagal generate quotation PDF",
      error: error.message,
    });
  }
});

module.exports = router;
