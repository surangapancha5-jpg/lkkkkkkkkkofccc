import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

export function generateAuthenticatorKey(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function getAuthenticatorTotp(name: string, phone: string, secretBase32: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: 'ZaviChats',
    label: `${phone} (${name})`,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export async function generateQrCodeDataUrl(totpUri: string): Promise<string> {
  try {
    return await QRCode.toDataURL(totpUri, {
      margin: 1,
      width: 220,
      color: {
        dark: '#be123c',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}

export function verifyAuthenticatorOtp(secretBase32: string, token: string, name = 'User', phone = '+94'): boolean {
  if (!secretBase32 || !token || token.trim().length !== 6) {
    return false;
  }
  try {
    const totp = getAuthenticatorTotp(name, phone, secretBase32);
    const delta = totp.validate({
      token: token.trim(),
      window: 1,
    });
    return delta !== null;
  } catch (e) {
    console.error('TOTP validation error:', e);
    return false;
  }
}

export function getCurrentOtp(secretBase32: string, name = 'User', phone = '+94'): string {
  try {
    const totp = getAuthenticatorTotp(name, phone, secretBase32);
    return totp.generate();
  } catch {
    return '';
  }
}
