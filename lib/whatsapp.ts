type BookingMailPayload = {
  clientName: string;
  date: string;
  endTime: string;
  salonName: string;
  salonSlug: string;
  serviceName: string;
  startTime: string;
};

type OwnerBookingAlertPayload = BookingMailPayload & {
  clientEmail: string;
  clientPhone: null | string;
  ownerName: string;
  ownerPhone: null | string;
};

type BookingReceiptWhatsAppPayload = BookingMailPayload & {
  clientPhone: null | string;
};

type BookingStatusWhatsAppPayload = BookingMailPayload & {
  clientPhone: null | string;
  nextStatus: string;
};

type ReminderWhatsAppPayload = BookingMailPayload & {
  recipientPhone: null | string;
  role: "client" | "owner";
};

type ClientActionWhatsAppPayload = BookingMailPayload & {
  actionLabel: string;
  clientName: string;
  recipientPhone: null | string;
  role: "client" | "owner";
};

type SignupVerificationWhatsAppPayload = {
  code: string;
  phone: string;
};

type WhatsAppSendResult = {
  error?: string;
  fallback: boolean;
  messageId?: string;
  skipped: boolean;
};

const defaultSender = process.env.WHATSAPP_SENDER?.trim() || null;
const metaGraphVersion = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v23.0";
const metaPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null;
const metaVerificationTemplateLanguage =
  process.env.WHATSAPP_VERIFY_TEMPLATE_LANGUAGE?.trim() || "en_US";
const metaVerificationTemplateName =
  process.env.WHATSAPP_VERIFY_TEMPLATE_NAME?.trim() || null;

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

async function sendWhatsAppMessage({
  context,
  message,
  metadata,
  to,
}: {
  context: string;
  message: string;
  metadata?: Record<string, string | undefined>;
  to: null | string;
}) {
  const token = process.env.WHATSAPP_API_TOKEN?.trim();
  const endpoint = process.env.WHATSAPP_API_URL?.trim();
  const normalizedTo =
    typeof to === "string" ? to.trim().replace(/\s+/g, "") : "";

  if (!normalizedTo) {
    return {
      fallback: true,
      skipped: true,
    } satisfies WhatsAppSendResult;
  }

  if (metaPhoneNumberId && token) {
    const response = await fetch(
      `https://graph.facebook.com/${metaGraphVersion}/${metaPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          text: {
            body: message,
            preview_url: false,
          },
          to: normalizedTo.replace(/^\+/, ""),
          type: "text",
        }),
      },
    );

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: {
            message?: string;
          };
          messages?: Array<{
            id?: string;
          }>;
        }
      | null;

    if (!response.ok) {
      throw new Error(
        payload?.error?.message ??
          `WhatsApp provider returned ${response.status}.`,
      );
    }

    return {
      fallback: false,
      skipped: false,
      messageId: payload?.messages?.[0]?.id,
    } satisfies WhatsAppSendResult;
  }

  if (endpoint && token) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context,
        from: defaultSender,
        message,
        metadata,
        to: normalizedTo,
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp provider returned ${response.status}.`);
    }

    return {
      fallback: false,
      skipped: false,
    } satisfies WhatsAppSendResult;
  }

  console.info(
    "WhatsApp fallback active. Provider credentials are not configured for this deployment.",
    {
      context,
      to: normalizedTo,
    },
  );

  return {
    fallback: true,
    skipped: false,
    error:
      "WhatsApp delivery is not configured yet. Add WhatsApp provider settings before using phone-code signup.",
  } satisfies WhatsAppSendResult;
}

export async function sendBookingReceiptWhatsApp(
  payload: BookingReceiptWhatsAppPayload,
) {
  return sendWhatsAppMessage({
    context: "booking-created-client",
    message: [
      `Hi ${payload.clientName}, your booking at ${payload.salonName} is saved.`,
      `Service: ${payload.serviceName}`,
      `When: ${payload.date} from ${payload.startTime} to ${payload.endTime}`,
      `Open your account for the first confirmation: ${getAccountUrl()}`,
      `Salon page: ${getSalonUrl(payload.salonSlug)}`,
    ].join("\n"),
    metadata: {
      salonSlug: payload.salonSlug,
      serviceName: payload.serviceName,
    },
    to: payload.clientPhone,
  });
}

export async function sendOwnerBookingAlertWhatsApp(
  payload: OwnerBookingAlertPayload,
) {
  return sendWhatsAppMessage({
    context: "booking-created-owner",
    message: [
      `Hi ${payload.ownerName}, a new booking request just arrived for ${payload.salonName}.`,
      `Client: ${payload.clientName}`,
      `Client email: ${payload.clientEmail}`,
      `Client phone: ${payload.clientPhone ?? "not provided"}`,
      `Service: ${payload.serviceName}`,
      `When: ${payload.date} from ${payload.startTime} to ${payload.endTime}`,
      `Open dashboard: ${getDashboardUrl()}`,
    ].join("\n"),
    metadata: {
      clientName: payload.clientName,
      salonSlug: payload.salonSlug,
      serviceName: payload.serviceName,
    },
    to: payload.ownerPhone,
  });
}

export async function sendBookingStatusWhatsApp(
  payload: BookingStatusWhatsAppPayload,
) {
  return sendWhatsAppMessage({
    context: "booking-status-client",
    message: [
      `Hi ${payload.clientName}, your booking at ${payload.salonName} is now ${payload.nextStatus.toLowerCase()}.`,
      `Service: ${payload.serviceName}`,
      `When: ${payload.date} from ${payload.startTime} to ${payload.endTime}`,
      `Account: ${getAccountUrl()}`,
    ].join("\n"),
    metadata: {
      nextStatus: payload.nextStatus,
      salonSlug: payload.salonSlug,
    },
    to: payload.clientPhone,
  });
}

export async function sendReminderWhatsApp(payload: ReminderWhatsAppPayload) {
  const entryPoint =
    payload.role === "owner" ? getDashboardUrl() : getAccountUrl();
  const intro =
    payload.role === "owner"
      ? `${payload.clientName} has entered the 3-hour confirmation window for ${payload.salonName}.`
      : `Your booking at ${payload.salonName} is less than 3 hours away.`;

  return sendWhatsAppMessage({
    context: `booking-reminder-${payload.role}`,
    message: [
      intro,
      `Service: ${payload.serviceName}`,
      `When: ${payload.date} from ${payload.startTime} to ${payload.endTime}`,
      `Open here: ${entryPoint}`,
    ].join("\n"),
    metadata: {
      role: payload.role,
      salonSlug: payload.salonSlug,
    },
    to: payload.recipientPhone,
  });
}

export async function sendClientActionWhatsApp(
  payload: ClientActionWhatsAppPayload,
) {
  const entryPoint =
    payload.role === "owner" ? getDashboardUrl() : getAccountUrl();
  const intro =
    payload.role === "owner"
      ? `${payload.clientName} selected "${payload.actionLabel}" for an upcoming booking.`
      : `We saved your booking action: "${payload.actionLabel}".`;

  return sendWhatsAppMessage({
    context: `booking-action-${payload.role}`,
    message: [
      intro,
      `Salon: ${payload.salonName}`,
      `Service: ${payload.serviceName}`,
      `When: ${payload.date} from ${payload.startTime} to ${payload.endTime}`,
      `Open here: ${entryPoint}`,
    ].join("\n"),
    metadata: {
      actionLabel: payload.actionLabel,
      role: payload.role,
      salonSlug: payload.salonSlug,
    },
    to: payload.recipientPhone,
  });
}

export async function sendSignupVerificationCodeWhatsApp(
  payload: SignupVerificationWhatsAppPayload,
) {
  const token = process.env.WHATSAPP_API_TOKEN?.trim();
  const normalizedTo = payload.phone.trim().replace(/\s+/g, "");

  if (metaPhoneNumberId && token) {
    if (!metaVerificationTemplateName) {
      return {
        fallback: true,
        skipped: false,
        error:
          "Meta WhatsApp Cloud API is connected, but WHATSAPP_VERIFY_TEMPLATE_NAME is missing for signup OTP messages.",
      } satisfies WhatsAppSendResult;
    }

    const response = await fetch(
      `https://graph.facebook.com/${metaGraphVersion}/${metaPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          template: {
            components: [
              {
                parameters: [
                  {
                    text: payload.code,
                    type: "text",
                  },
                ],
                type: "body",
              },
            ],
            language: {
              code: metaVerificationTemplateLanguage,
            },
            name: metaVerificationTemplateName,
          },
          to: normalizedTo.replace(/^\+/, ""),
          type: "template",
        }),
      },
    );

    const responsePayload = (await response.json().catch(() => null)) as
      | {
          error?: {
            message?: string;
          };
          messages?: Array<{
            id?: string;
          }>;
        }
      | null;

    if (!response.ok) {
      throw new Error(
        responsePayload?.error?.message ??
          `WhatsApp provider returned ${response.status}.`,
      );
    }

    return {
      fallback: false,
      skipped: false,
      messageId: responsePayload?.messages?.[0]?.id,
    } satisfies WhatsAppSendResult;
  }

  return sendWhatsAppMessage({
    context: "signup-verification",
    message: [
      "Hi,",
      "",
      `Use this WhatsApp verification code to finish creating your Processly Beauty account: ${payload.code}`,
      "",
      "This code expires in 10 minutes.",
      "If you did not request this code, you can ignore this message.",
    ].join("\n"),
    metadata: {
      flow: "signup",
    },
    to: payload.phone,
  });
}
