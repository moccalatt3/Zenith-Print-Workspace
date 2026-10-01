import React from 'react';
import { Download, FileText } from 'lucide-react';
import quotationService from '../services/quotationService';

const OrderQuotationButton = ({ orderId, orderNumber, type = "download" }) => {
    
    const handleGenerateQuotation = async (preview = false) => {
        try {
            console.log(`🔄 Generating quotation for order: ${orderId}, preview: ${preview}`);
            
            // Validasi orderId
            if (!orderId || orderId === "undefined" || orderId === "null") {
                alert('Order ID tidak valid. Silakan refresh halaman dan coba lagi.');
                return;
            }

            let response;
            
            if (preview) {
                response = await quotationService.previewQuotation(orderId);
            } else {
                response = await quotationService.downloadQuotation(orderId);
            }
            
            console.log('✅ Quotation response received');
            
            if (response.data) {
                if (preview) {
                    // Preview di tab baru
                    const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    window.open(pdfUrl, '_blank');
                } else {
                    // Download file
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `quotation-${orderNumber || orderId}.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(url);
                }
            }
            
        } catch (error) {
            console.error('❌ Error generating quotation:', error);
            
            // Tampilkan error yang lebih spesifik
            if (error.response?.status === 404) {
                if (error.response?.data?.error?.includes('tidak ditemukan')) {
                    alert(`Order dengan ID ${orderId} tidak ditemukan di database.\n\nPastikan:\n• Order sudah tersimpan di database\n• Order ID valid\n• Coba refresh halaman`);
                } else {
                    alert('Endpoint quotation tidak ditemukan (404). Pastikan backend berjalan di port 4000');
                }
            } else if (error.response?.status === 500) {
                alert('Terjadi kesalahan server saat generate quotation.');
            } else {
                alert(`Gagal generate quotation: ${error.message}`);
            }
        }
    };

    // Jangan render button jika orderId tidak valid
    if (!orderId || orderId === "undefined" || orderId === "null") {
        console.warn('⚠️ OrderQuotationButton: orderId tidak valid', orderId);
        return null;
    }

    // Render tombol berdasarkan type
    return (
        <button 
            onClick={() => handleGenerateQuotation(type === "preview")}
            className="bg-white/5 border border-white/10 text-white py-1 px-3 rounded text-xs font-medium hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-1 w-full"
        >
            {type === "preview" ? (
                <>
                    <FileText className="w-3 h-3 text-purple-400" />
                    Quotation Preview
                </>
            ) : (
                <>
                    <Download className="w-3 h-3 text-blue-400" />
                    Download Quotation
                </>
            )}
        </button>
    );
};

export default OrderQuotationButton;