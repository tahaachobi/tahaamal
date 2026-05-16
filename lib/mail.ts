import nodemailer from "nodemailer";

type BookingMailPayload = {
  clientEmail: string;
  clientName: string;
  date: string;
  endTime: string;
  salonName: string;
  salonSlug: string;
  serviceName: string;
  startTime: string;
  status: string;
};

type BookingStatusMailPayload = BookingMailPayload & {
  nextStatus: string;
};

type OwnerBookingAlertPayload = {
  clientEmail: string;
  clientName: string;
  date: string;
  endTime: string;
  ownerEmail: string;
  ownerName: string;
  salonName: string;
  salonSlug: string;
  serviceName: string;
  startTime: string;
};

type ReminderMailPayload = {
  clientName: string;
  date: string;
  endTime: string;
  salonName: string;
  salonSlug: string;
  serviceName: string;
  startTime: string;
};

type ClientReminderMailPayload = ReminderMailPayload & {
  clientEmail: string;
};

type OwnerReminderMailPayload = ReminderMailPayload & {
  clientName: string;
  ownerEmail: string;
  ownerName: string;
};

type ClientActionMailPayload = {
  actionLabel: string;
  bookingRole: "client" | "owner";
  clientEmail: string;
  clientName: string;
  date: string;
  endTime: string;
  recipientEmail: string;
  recipientName: string;
  salonName: string;
  salonSlug: string;
  serviceName: string;
  startTime: string;
};

type SignupVerificationMailPayload = {
  code: string;
  email: string;
};

type LoginVerificationMailPayload = {
  code: string;
  email: string;
};

type MailResult = {
  fallback: boolean;
  messageId: string;
};

const defaultMailFrom =
  process.env.MAIL_FROM?.trim() || "SaaS Booking <no-reply@localhost>";

function getBaseUrl() {
  const configuredUrl = process.env.NEXTAUTH_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

function getAccountUrl() {
  return `${getBaseUrl()}/account`;
}

function getDashboardUrl() {
  return `${getBaseUrl()}/dashboard`;
}

function getSalonUrl(slug: string) {
  return `${getBaseUrl()}/salon/${slug}`;
}

function createTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (host && user && pass) {
    const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    return {
      fallback: false,
      transporter: nodemailer.createTransport({
        auth: {
          pass,
          user,
        },
        host,
        port,
        secure,
      }),
    };
  }

  return {
    fallback: true,
    transporter: nodemailer.createTransport({
      jsonTransport: true,
    }),
  };
}

export async function sendMail({
  html,
  subject,
  text,
  to,
}: {
  html: string;
  subject: string;
  text: string;
  to: string;
}) {
  const resendToken = process.env.RESEND_API_KEY?.trim();
  const mailtrapToken = process.env.MAILTRAP_API_TOKEN?.trim();

  if (resendToken) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Processly Beauty <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
          text,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Resend API Error:", data);
      }

      return {
        fallback: false,
        messageId: data.id || "resend-api",
      } satisfies MailResult;
    } catch (error) {
      console.error("Failed to send email via Resend API:", error);
    }
  }

  if (mailtrapToken) {
    let fromEmail = "hello@demomailtrap.com";
    let fromName = "Processly Beauty";

    const mailFromEnv = process.env.MAIL_FROM?.trim();
    if (mailFromEnv) {
      const match = mailFromEnv.match(/(.*)<(.*)>/);
      if (match) {
        fromName = match[1].trim();
        fromEmail = match[2].trim();
      } else {
        fromEmail = mailFromEnv;
      }
    }

    try {
      const response = await fetch("https://send.api.mailtrap.io/api/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mailtrapToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: { email: fromEmail, name: fromName },
          to: [{ email: to }],
          subject,
          text,
          html,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Mailtrap API Error:", data);
      }

      return {
        fallback: false,
        messageId: data.message_ids?.[0] || "mailtrap-api",
      } satisfies MailResult;
    } catch (error) {
      console.error("Failed to send email via Mailtrap API:", error);
    }
  }

  const { fallback, transporter } = createTransporter();
  const info = await transporter.sendMail({
    from: defaultMailFrom,
    html,
    subject,
    text,
    to,
  });

  const messageId =
    typeof info.messageId === "string" && info.messageId
      ? info.messageId
      : "preview-only";

  if (fallback) {
    console.info(
      "Email fallback active. SMTP is not configured for this deployment.",
      {
        messageId,
        subject,
        to,
      },
    );
  }

  return {
    fallback,
    messageId,
  } satisfies MailResult;
}

export async function sendBookingReceiptEmail(payload: BookingMailPayload) {
  const salonUrl = getSalonUrl(payload.salonSlug);
  const accountUrl = getAccountUrl();
  const subject = `Booking received for ${payload.salonName}`;
  const text = [
    `Hi ${payload.clientName},`,
    "",
    `Your booking request for ${payload.salonName} has been received.`,
    `Service: ${payload.serviceName}`,
    `Date: ${payload.date}`,
    `Time: ${payload.startTime} - ${payload.endTime}`,
    `Status: ${payload.status}`,
    "",
    `First confirmation: open your account and confirm that you are still coming.`,
    `Account: ${accountUrl}`,
    `Salon page: ${salonUrl}`,
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #231815;">
      <h2 style="margin-bottom: 12px;">Your booking request is in.</h2>
      <p>Hi ${payload.clientName},</p>
      <p>We received your booking request for <strong>${payload.salonName}</strong>.</p>
      <ul>
        <li><strong>Service:</strong> ${payload.serviceName}</li>
        <li><strong>Date:</strong> ${payload.date}</li>
        <li><strong>Time:</strong> ${payload.startTime} - ${payload.endTime}</li>
        <li><strong>Status:</strong> ${payload.status}</li>
      </ul>
      <p>Please open your account to send the first confirmation for this appointment:</p>
      <p><a href="${accountUrl}">${accountUrl}</a></p>
      <p>You can also revisit the salon page here:</p>
      <p><a href="${salonUrl}">${salonUrl}</a></p>
    </div>
  `;

  return sendMail({
    html,
    subject,
    text,
    to: payload.clientEmail,
  });
}

export async function sendOwnerBookingAlertEmail(
  payload: OwnerBookingAlertPayload,
) {
  const dashboardUrl = getDashboardUrl();
  const subject = `New booking request for ${payload.salonName}`;
  const text = [
    `Hi ${payload.ownerName},`,
    "",
    `${payload.clientName} created a new booking request for ${payload.salonName}.`,
    `Client email: ${payload.clientEmail}`,
    `Service: ${payload.serviceName}`,
    `Date: ${payload.date}`,
    `Time: ${payload.startTime} - ${payload.endTime}`,
    "",
    `Review it in the dashboard: ${dashboardUrl}`,
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #231815;">
      <h2 style="margin-bottom: 12px;">New booking request</h2>
      <p>Hi ${payload.ownerName},</p>
      <p><strong>${payload.clientName}</strong> just created a new booking request for <strong>${payload.salonName}</strong>.</p>
      <ul>
        <li><strong>Client email:</strong> ${payload.clientEmail}</li>
        <li><strong>Service:</strong> ${payload.serviceName}</li>
        <li><strong>Date:</strong> ${payload.date}</li>
        <li><strong>Time:</strong> ${payload.startTime} - ${payload.endTime}</li>
      </ul>
      <p>Review it in your dashboard:</p>
      <p><a href="${dashboardUrl}">${dashboardUrl}</a></p>
    </div>
  `;

  return sendMail({
    html,
    subject,
    text,
    to: payload.ownerEmail,
  });
}

export async function sendBookingStatusEmail(payload: BookingStatusMailPayload) {
  const salonUrl = getSalonUrl(payload.salonSlug);
  const accountUrl = getAccountUrl();
  const subject = `Booking ${payload.nextStatus.toLowerCase()} for ${payload.salonName}`;
  const text = [
    `Hi ${payload.clientName},`,
    "",
    `Your booking for ${payload.salonName} is now ${payload.nextStatus.toLowerCase()}.`,
    `Service: ${payload.serviceName}`,
    `Date: ${payload.date}`,
    `Time: ${payload.startTime} - ${payload.endTime}`,
    "",
    `Account: ${accountUrl}`,
    `Salon page: ${salonUrl}`,
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #231815;">
      <h2 style="margin-bottom: 12px;">Booking ${payload.nextStatus.toLowerCase()}</h2>
      <p>Hi ${payload.clientName},</p>
      <p>Your booking for <strong>${payload.salonName}</strong> is now <strong>${payload.nextStatus.toLowerCase()}</strong>.</p>
      <ul>
        <li><strong>Service:</strong> ${payload.serviceName}</li>
        <li><strong>Date:</strong> ${payload.date}</li>
        <li><strong>Time:</strong> ${payload.startTime} - ${payload.endTime}</li>
      </ul>
      <p>Open your account here:</p>
      <p><a href="${accountUrl}">${accountUrl}</a></p>
      <p>You can revisit the salon page here:</p>
      <p><a href="${salonUrl}">${salonUrl}</a></p>
    </div>
  `;

  return sendMail({
    html,
    subject,
    text,
    to: payload.clientEmail,
  });
}

export async function sendClientReminderEmail(
  payload: ClientReminderMailPayload,
) {
  const accountUrl = getAccountUrl();
  const subject = `Reminder: your booking is in less than 3 hours`;
  const text = [
    `Hi ${payload.clientName},`,
    "",
    `Your booking at ${payload.salonName} is coming up soon.`,
    `Service: ${payload.serviceName}`,
    `Date: ${payload.date}`,
    `Time: ${payload.startTime} - ${payload.endTime}`,
    "",
    `Please open your account and send the final confirmation: ${accountUrl}`,
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #231815;">
      <h2 style="margin-bottom: 12px;">Your appointment is coming up</h2>
      <p>Hi ${payload.clientName},</p>
      <p>Your booking at <strong>${payload.salonName}</strong> starts in less than 3 hours.</p>
      <ul>
        <li><strong>Service:</strong> ${payload.serviceName}</li>
        <li><strong>Date:</strong> ${payload.date}</li>
        <li><strong>Time:</strong> ${payload.startTime} - ${payload.endTime}</li>
      </ul>
      <p>Please open your account and send the final confirmation:</p>
      <p><a href="${accountUrl}">${accountUrl}</a></p>
    </div>
  `;

  return sendMail({
    html,
    subject,
    text,
    to: payload.clientEmail,
  });
}

export async function sendOwnerReminderEmail(payload: OwnerReminderMailPayload) {
  const dashboardUrl = getDashboardUrl();
  const subject = `Reminder window opened for ${payload.clientName}`;
  const text = [
    `Hi ${payload.ownerName},`,
    "",
    `${payload.clientName} has entered the final confirmation window for ${payload.salonName}.`,
    `Service: ${payload.serviceName}`,
    `Date: ${payload.date}`,
    `Time: ${payload.startTime} - ${payload.endTime}`,
    "",
    `Open your dashboard: ${dashboardUrl}`,
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #231815;">
      <h2 style="margin-bottom: 12px;">Final confirmation window opened</h2>
      <p>Hi ${payload.ownerName},</p>
      <p><strong>${payload.clientName}</strong> has entered the last 3-hour confirmation window for <strong>${payload.salonName}</strong>.</p>
      <ul>
        <li><strong>Service:</strong> ${payload.serviceName}</li>
        <li><strong>Date:</strong> ${payload.date}</li>
        <li><strong>Time:</strong> ${payload.startTime} - ${payload.endTime}</li>
      </ul>
      <p>Open your dashboard here:</p>
      <p><a href="${dashboardUrl}">${dashboardUrl}</a></p>
    </div>
  `;

  return sendMail({
    html,
    subject,
    text,
    to: payload.ownerEmail,
  });
}

export async function sendClientActionEmail(payload: ClientActionMailPayload) {
  const targetUrl =
    payload.bookingRole === "owner" ? getDashboardUrl() : getAccountUrl();
  const subject =
    payload.bookingRole === "owner"
      ? `${payload.clientName} updated a booking`
      : `Booking update saved for ${payload.salonName}`;
  const intro =
    payload.bookingRole === "owner"
      ? `${payload.clientName} selected "${payload.actionLabel}" for an upcoming booking.`
      : `We saved your booking action: "${payload.actionLabel}".`;
  const text = [
    `Hi ${payload.recipientName},`,
    "",
    intro,
    `Salon: ${payload.salonName}`,
    `Service: ${payload.serviceName}`,
    `Date: ${payload.date}`,
    `Time: ${payload.startTime} - ${payload.endTime}`,
    "",
    `Open here: ${targetUrl}`,
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #231815;">
      <h2 style="margin-bottom: 12px;">Booking action updated</h2>
      <p>Hi ${payload.recipientName},</p>
      <p>${intro}</p>
      <ul>
        <li><strong>Salon:</strong> ${payload.salonName}</li>
        <li><strong>Service:</strong> ${payload.serviceName}</li>
        <li><strong>Date:</strong> ${payload.date}</li>
        <li><strong>Time:</strong> ${payload.startTime} - ${payload.endTime}</li>
      </ul>
      <p>Open here:</p>
      <p><a href="${targetUrl}">${targetUrl}</a></p>
    </div>
  `;

  return sendMail({
    html,
    subject,
    text,
    to: payload.recipientEmail,
  });
}

export async function sendSignupVerificationCodeEmail(
  payload: SignupVerificationMailPayload,
) {
  const subject = "Your Processly Beauty verification code";
  const text = [
    "Hi,",
    "",
    `Use this verification code to finish creating your Processly Beauty account: ${payload.code}`,
    "",
    `This code expires in ${10} minutes.`,
    `If you did not request this code, you can ignore this email.`,
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #231815;">
      <h2 style="margin-bottom: 12px;">Verify your email</h2>
      <p>Use this verification code to finish creating your Processly Beauty account:</p>
      <p style="margin: 24px 0; font-size: 32px; font-weight: 700; letter-spacing: 0.3em;">
        ${payload.code}
      </p>
      <p>This code expires in 10 minutes.</p>
      <p>If you did not request this code, you can ignore this email.</p>
    </div>
  `;

  return sendMail({
    html,
    subject,
    text,
    to: payload.email,
  });
}

export async function sendLoginVerificationCodeEmail(
  payload: LoginVerificationMailPayload,
) {
  const subject = "Your Processly Beauty sign-in code";
  const text = [
    "Hi,",
    "",
    `Use this verification code to continue signing in: ${payload.code}`,
    "",
    "This code expires in 10 minutes.",
    "If you did not request this code, you can ignore this email.",
  ].join("\n");
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #231815;">
      <h2 style="margin-bottom: 12px;">Verify your sign-in</h2>
      <p>Use this verification code to continue signing in to your Processly Beauty account:</p>
      <p style="margin: 24px 0; font-size: 32px; font-weight: 700; letter-spacing: 0.3em;">
        ${payload.code}
      </p>
      <p>This code expires in 10 minutes.</p>
      <p>If you did not request this code, you can ignore this email.</p>
    </div>
  `;

  return sendMail({
    html,
    subject,
    text,
    to: payload.email,
  });
}
