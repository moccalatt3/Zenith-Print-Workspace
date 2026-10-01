import React from 'react';
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import quotationService from '../services/quotationService';

const QuotationButton = ({ orderId, orderNumber, type = "download" }) => {
    
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
        console.warn('⚠️ QuotationButton: orderId tidak valid', orderId);
        return null;
    }
    
    return (
        <div className="flex gap-2">
            {/* Download Button Minimalis */}
            
            {/* Preview Button Minimalis */}
            <button 
                onClick={() => handleGenerateQuotation(true)}
                className="px-3 py-2 border border-white/20 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/5 transition-all duration-200 flex items-center gap-1"
            >
                <EyeOutlined className="text-xs" />
                Preview
            </button>
            <button 
                onClick={() => handleGenerateQuotation(false)}
                className="px-3 py-2 bg-gradient-to-r from-[#F25912] to-[#FA812F] text-white rounded-lg text-xs font-medium hover:shadow-md transition-all duration-200 flex items-center gap-1"
            >
                <DownloadOutlined className="text-xs" />
                Download Quotation
            </button>
        </div>
    );
};

export default QuotationButton;