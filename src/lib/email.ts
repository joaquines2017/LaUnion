import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
// Sin dominio verificado en Resend usar: onboarding@resend.dev
const FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";

export async function enviarPasswordInicial(opts: {
  email: string;
  nombreUsuario: string;
  nombreEmpresa: string;
  password: string;
  dominio?: string | null;
}) {
  const url = opts.dominio ? `https://${opts.dominio}` : process.env.NEXTAUTH_URL ?? "";

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr><td style="background:#1A2035;padding:28px 36px;">
          <h1 style="color:#ffffff;margin:0;font-size:20px;">LaUnion — Sistema de Costeo</h1>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          <p style="color:#333;font-size:15px;margin:0 0 16px;">Hola <strong>${opts.nombreUsuario}</strong>,</p>
          <p style="color:#555;font-size:14px;margin:0 0 24px;">
            Tu cuenta de administrador fue creada para la empresa <strong>${opts.nombreEmpresa}</strong>.
            A continuación tus credenciales de acceso:
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;border:1px solid #E0E3EA;border-radius:6px;margin-bottom:24px;">
            <tr>
              <td style="padding:12px 16px;color:#888;font-size:13px;width:110px;">Email</td>
              <td style="padding:12px 16px;color:#1A2035;font-size:13px;font-family:monospace;">${opts.email}</td>
            </tr>
            <tr style="border-top:1px solid #E0E3EA;">
              <td style="padding:12px 16px;color:#888;font-size:13px;">Contraseña</td>
              <td style="padding:12px 16px;color:#1A2035;font-size:15px;font-family:monospace;font-weight:bold;letter-spacing:1px;">${opts.password}</td>
            </tr>
            ${url ? `<tr style="border-top:1px solid #E0E3EA;">
              <td style="padding:12px 16px;color:#888;font-size:13px;">URL</td>
              <td style="padding:12px 16px;"><a href="${url}" style="color:#1976D2;">${url}</a></td>
            </tr>` : ""}
          </table>

          <p style="color:#e53935;font-size:13px;background:#FFF3CD;border:1px solid #FFC107;border-radius:4px;padding:10px 14px;margin:0 0 24px;">
            ⚠ Por seguridad, cambiá tu contraseña la primera vez que ingreses.
          </p>

          ${url ? `<p style="text-align:center;margin:0 0 8px;">
            <a href="${url}" style="display:inline-block;background:#1A2035;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:bold;">
              Ingresar al sistema
            </a>
          </p>` : ""}
        </td></tr>
        <tr><td style="background:#F8F9FA;padding:16px 36px;border-top:1px solid #E0E3EA;">
          <p style="color:#aaa;font-size:12px;margin:0;text-align:center;">
            Este email fue generado automáticamente. No respondas a este mensaje.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to:   opts.email,
    subject: `Tus credenciales para ${opts.nombreEmpresa} — LaUnion`,
    html,
  });
}
