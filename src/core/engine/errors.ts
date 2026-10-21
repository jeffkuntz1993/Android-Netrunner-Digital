/** Thrown when an action is not legal in the current state. The state is left unchanged. */
export class IllegalActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalActionError';
  }
}

/** Thrown for action types that are declared but not implemented yet. */
export class NotImplementedError extends IllegalActionError {
  constructor(actionType: string) {
    super(`${actionType} is not implemented yet`);
    this.name = 'NotImplementedError';
  }
}
