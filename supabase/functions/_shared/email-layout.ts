// Componente EmailLayout compartido para todos los emails transaccionales
// Basado en el diseño del template de reset password.
// Asegura consistencia visual: logo, colores, tipografía, botones y footer.

const BRAND_COLOR = "#08A66C";
const BG_DARK = "#0E0E0E";
const CARD_BG = "#161616";
const INNER_BG = "#1E1E1E";
const BORDER = "#262626";
const TEXT_PRIMARY = "#F0F0F0";
const TEXT_SECONDARY = "#7a7a7a";
const TEXT_TERTIARY = "#4a4a4a";

interface EmailLayoutParams {
  titulo: string;
  descripcion: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerText?: string;
}

export function emailLayout({
  titulo,
  descripcion,
  bodyHtml,
  ctaText,
  ctaUrl,
  footerText = "Forza Zone",
}: EmailLayoutParams): string {
  const ctaHtml = ctaText && ctaUrl ? `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin-top:24px;">
      <tr>
        <td align="center" bgcolor="${BRAND_COLOR}" style="background-color:${BRAND_COLOR};border-radius:10px;padding:12px 32px;">
          <a href="${ctaUrl}" style="color:#0E0E0E;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
</head>
<body style="margin:0;padding:0;background-color:${BG_DARK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_DARK};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
          <tr>
            <td bgcolor="${CARD_BG}" style="background-color:${CARD_BG};border-radius:16px;border:1px solid ${BORDER};padding:40px 32px;text-align:center;">

              <img src="https://gymnastic-app-u64l.vercel.app/logo.jpg" alt="Forza Zone" width="48" height="48" style="width:48px;height:48px;border-radius:8px;margin-bottom:8px;">

              <h1 style="color:${TEXT_PRIMARY};font-size:22px;font-weight:700;margin:16px 0 8px 0;">
                ${titulo}
              </h1>

              <p style="color:${TEXT_SECONDARY};font-size:14px;line-height:22px;margin:0 0 24px 0;">
                ${descripcion}
              </p>

              ${bodyHtml}

              ${ctaHtml}

              <div style="height:1px;background-color:${BORDER};margin:24px 0;"></div>

              <p style="color:${TEXT_TERTIARY};font-size:12px;line-height:18px;margin:0;">
                © 2026 ${footerText}
              </p>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Helper para generar una card de datos dentro del email
export function dataCard(label: string, value: string): string {
  return `
    <div style="padding:16px;background-color:${INNER_BG};border-radius:10px;margin-bottom:16px;text-align:left;">
      <p style="color:${TEXT_SECONDARY};margin:0 0 4px 0;font-size:12px;">${label}</p>
      <p style="color:${TEXT_PRIMARY};margin:0;font-size:14px;line-height:1.6;">${value}</p>
    </div>`;
}