export enum PluginEvents {
  Register = "plugin:register",
  Init = "plugin:init",
  Ready = "plugin:ready",
  Destroy = "plugin:destroy",
  Error = "plugin:error",
  AllReady = "plugin:all-ready",
  BootFailed = "plugin:boot-failed",
  Enabled = "plugin:enabled",
  Disabled = "plugin:disabled",
}
