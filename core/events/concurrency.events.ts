export enum ConcurrencyEvents {
  LockAcquire = "concurrency:lock-acquire",
  LockRelease = "concurrency:lock-release",
  Conflict = "concurrency:conflict",
  QueueFull = "concurrency:queue-full",
}
