export enum ErrorCode {
  // Connection & Auth Errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_AUTH_FAILED = 'CONNECTION_AUTH_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_NOT_FOUND = 'CONNECTION_NOT_FOUND',
  
  // Connector Errors
  CONNECTOR_NOT_FOUND = 'CONNECTOR_NOT_FOUND',
  CONNECTOR_UNSUPPORTED_OPERATION = 'CONNECTOR_UNSUPPORTED_OPERATION',
  
  // Sync & Execution Errors
  SYNC_JOB_NOT_FOUND = 'SYNC_JOB_NOT_FOUND',
  SYNC_EXECUTION_FAILED = 'SYNC_EXECUTION_FAILED',
  SYNC_MAPPING_ERROR = 'SYNC_MAPPING_ERROR',
  SYNC_DESTINATION_ERROR = 'SYNC_DESTINATION_ERROR',
  SYNC_SOURCE_ERROR = 'SYNC_SOURCE_ERROR',
  
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
  
  // Internal
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class BridgeError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    retryable = false
  ) {
    super(message);
    this.name = 'BridgeError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConnectionError extends BridgeError {
  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>, retryable = true) {
    super(code, message, details, retryable);
    this.name = 'ConnectionError';
  }
}

export class SyncError extends BridgeError {
  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>, retryable = false) {
    super(code, message, details, retryable);
    this.name = 'SyncError';
  }
}

export class ValidationError extends BridgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, message, details, false);
    this.name = 'ValidationError';
  }
}
