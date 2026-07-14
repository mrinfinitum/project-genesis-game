export type PlatformAuthFlow = "guest" | "email_password" | "magic_link" | "google_login" | "sign_in_with_apple" | "account_conversion" | "password_reset" | "account_deletion";

export interface PlatformAuthService {
  supports(flow: PlatformAuthFlow): boolean;
}

export const platformAuthService: PlatformAuthService = {
  supports() {
    return true;
  }
};
