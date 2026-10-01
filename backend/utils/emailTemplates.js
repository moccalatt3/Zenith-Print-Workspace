const getResetPasswordEmail = (name, resetLink) => {
  return {
    subject: "Reset Password - ZENITH PRINT LABS",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password - ZENITH PRINT LABS</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: linear-gradient(135deg, #000000 0%, #212121 100%);
              margin: 0;
              padding: 0;
              min-height: 100vh;
            }
            
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background: #0a0a0a;
              border: 1px solid #1a1a1a;
            }
            
            .email-header {
              background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
              padding: 40px 30px;
              text-align: center;
              border-bottom: 1px solid #2a2a2a;
            }
            
            .logo {
              color: #ffffff;
              font-size: 32px;
              font-weight: 700;
              letter-spacing: -0.5px;
              margin-bottom: 8px;
            }
            
            .tagline {
              color: #FA812F;
              font-size: 14px;
              font-weight: 500;
              letter-spacing: 1px;
            }
            
            .email-content {
              padding: 40px 30px;
              background: #0a0a0a;
            }
            
            .title {
              color: #ffffff;
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 20px;
              text-align: center;
            }
            
            .greeting {
              color: #e5e5e5;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 25px;
            }
            
            .highlight {
              color: #FA812F;
              font-weight: 600;
            }
            
            .reset-button {
              display: block;
              width: 100%;
              max-width: 280px;
              margin: 30px auto;
              padding: 16px 32px;
              background: linear-gradient(135deg, #F25912 0%, #FA812F 100%);
              color: #ffffff;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 600;
              font-size: 16px;
              text-align: center;
              border: none;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 4px 15px rgba(242, 89, 18, 0.3);
            }
            
            .reset-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(242, 89, 18, 0.4);
            }
            
            .link-container {
              background: #1a1a1a;
              border: 1px solid #2a2a2a;
              border-radius: 8px;
              padding: 20px;
              margin: 25px 0;
            }
            
            .link-label {
              color: #a0a0a0;
              font-size: 14px;
              margin-bottom: 8px;
            }
            
            .reset-link {
              color: #FA812F;
              font-size: 14px;
              word-break: break-all;
              font-family: 'Courier New', monospace;
              line-height: 1.4;
            }
            
            .warning-box {
              background: rgba(242, 89, 18, 0.1);
              border: 1px solid rgba(242, 89, 18, 0.3);
              border-radius: 8px;
              padding: 16px;
              margin: 25px 0;
            }
            
            .warning-text {
              color: #FA812F;
              font-size: 14px;
              line-height: 1.5;
              text-align: center;
            }
            
            .info-box {
              background: #1a1a1a;
              border-radius: 8px;
              padding: 16px;
              margin: 20px 0;
              text-align: center;
            }
            
            .info-text {
              color: #a0a0a0;
              font-size: 13px;
              line-height: 1.5;
            }
            
            .email-footer {
              background: #000000;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #2a2a2a;
            }
            
            .contact-info {
              color: #a0a0a0;
              font-size: 14px;
              margin-bottom: 15px;
            }
            
            .contact-link {
              color: #FA812F;
              text-decoration: none;
            }
            
            .copyright {
              color: #666666;
              font-size: 12px;
              margin-top: 20px;
            }
            
            .divider {
              height: 1px;
              background: linear-gradient(90deg, transparent, #2a2a2a, transparent);
              margin: 25px 0;
            }
            
            @media (max-width: 600px) {
              .email-header {
                padding: 30px 20px;
              }
              
              .email-content {
                padding: 30px 20px;
              }
              
              .title {
                font-size: 24px;
              }
              
              .logo {
                font-size: 28px;
              }
              
              .reset-button {
                padding: 14px 28px;
                font-size: 15px;
              }
            }
          </style>
      </head>
      <body>
          <div class="email-container">
              <!-- Header -->
              <div class="email-header">
                  <div class="logo">ZENITH PRINT LABS</div>
                  <div class="tagline">PRECISION IN EVERY LAYER</div>
              </div>
              
              <!-- Content -->
              <div class="email-content">
                  <h1 class="title">Reset Password Anda</h1>
                  
                  <p class="greeting">
                      Halo <span class="highlight">${name}</span>,
                  </p>
                  
                  <p class="greeting">
                      Kami menerima permintaan reset password untuk akun Anda di ZENITH PRINT LABS. 
                      Klik tombol di bawah ini untuk membuat password baru:
                  </p>
                  
                  <a href="${resetLink}" class="reset-button">
                      RESET PASSWORD SAYA
                  </a>
                  
                  <div class="link-container">
                      <div class="link-label">Atau salin dan tempel tautan berikut ke browser Anda:</div>
                      <div class="reset-link">${resetLink}</div>
                  </div>
                  
                  <div class="info-box">
                      <p class="info-text">
                          Untuk keamanan akun Anda, jangan bagikan tautan reset password kepada siapapun.
                      </p>
                  </div>
                  
                  <div class="divider"></div>
                  
                  <p class="greeting" style="text-align: center; margin-bottom: 0;">
                      Salam hangat,<br>
                      <strong style="color: #FA812F;">Tim ZENITH PRINT LABS</strong>
                  </p>
              </div>
              
              <!-- Footer -->
              <div class="email-footer">
                  <div class="contact-info">
                      Butuh bantuan? Hubungi kami: 
                      <a href="mailto:support@zenithprintlabs.com" class="contact-link">
                          support@zenithprintlabs.com
                      </a>
                  </div>
                  
                  <div class="copyright">
                      © ${new Date().getFullYear()} ZENITH PRINT LABS. All rights reserved.<br>
                      Precision in Every Layer • Solusi Printing 3D Terdepan
                  </div>
              </div>
          </div>
      </body>
      </html>
    `,
  };
};

module.exports = { getResetPasswordEmail };
