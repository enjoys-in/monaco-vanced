export enum AuthEvents {
  LoginRequest = "auth:login-request",
  LoginSuccess = "auth:login-success",
  Login = "auth:login",
  LoginFailed = "auth:login-failed",
  Logout = "auth:logout",
  TokenRefresh = "auth:token-refresh",
  SessionExpired = "auth:session-expired",
  Ready = "auth:ready",
  Error = "auth:error",
}
