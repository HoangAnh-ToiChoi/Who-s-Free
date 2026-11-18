// Nhà gửi email chọn bằng EMAIL_PROVIDER ("resend" mặc định hoặc "brevo").
export const emailConfig = {
  get provider() {
    return (process.env.EMAIL_PROVIDER || "resend").toLowerCase();
  },
  brevo: {
    get apiKey() {
      return process.env.BREVO_API_KEY;
    },
    get senderEmail() {
      return process.env.BREVO_SENDER_EMAIL;
    },
    get senderName() {
      return process.env.BREVO_SENDER_NAME || "Who's Free";
    },
  },
  resend: {
    get apiKey() {
      return process.env.RESEND_API_KEY;
    },
    get from() {
      return process.env.RESEND_FROM_EMAIL;
    },
  },
};

export default emailConfig;
