/** Error types for the MELCloud Home client. */

export class MelCloudHomeError extends Error {}

export class MelCloudHomeConnectionError extends MelCloudHomeError {}

export class MelCloudHomeTimeoutError extends MelCloudHomeError {}

export class MelCloudHomeAuthenticationError extends MelCloudHomeError {}

export class MelCloudHomeNotFoundError extends MelCloudHomeError {}

export class MelCloudHomeWebSocketError extends MelCloudHomeError {}
