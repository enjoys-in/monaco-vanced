export enum AuthEvents {
  LoginRequest = "auth:login-request",
  LoginSuccess = "auth:login-success",
  LoginFailed = "auth:login-failed",
  Logout = "auth:logout",
  TokenRefresh = "auth:token-refresh",
  SessionExpired = "auth:session-expired",
  Error = "auth:error",
}
