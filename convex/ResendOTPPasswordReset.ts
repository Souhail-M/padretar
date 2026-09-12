import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import type { RandomReader } from "@oslojs/crypto/random";
import { generateRandomString } from "@oslojs/crypto/random";

/**
 * Emails an 8-digit code for the Password provider's `reset` flow — the only
 * way back in for an account with nobody above it to reset it in person
 * (see convex/password.ts `resetForEmployee` for that in-person path, and
 * `resetByEmail` for the CLI fallback this replaces as the primary route).
 */
export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes as Uint8Array<ArrayBuffer>);
      },
    };
    return generateRandomString(random, "0123456789", 8);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      // Swap once a sending domain is verified on the Resend account.
      from: "Padretar <onboarding@resend.dev>",
      to: [email],
      subject: "Réinitialisation de votre mot de passe Padretar",
      text: `Votre code de réinitialisation est ${token}. Il expire rapidement — redemandez-en un si besoin.`,
    });
    if (error) throw new Error("Envoi de l'email impossible");
  },
});
