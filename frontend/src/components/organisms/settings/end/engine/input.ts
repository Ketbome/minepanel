// Keyboard, mouse and touch state, read once per frame by the player. Edge flags (pressed,
// released) are cleared by the reader, so a click is handled exactly once.

export const input = {
  keys: new Set<string>(),
  left: false,
  right: false,
  leftPressed: false,
  rightPressed: false,
  rightReleased: false,
  jumpPressed: false,
  dx: 0,
  dy: 0,
  wheel: 0,
  // the touch joystick, -1..1 on both axes
  stickX: 0,
  stickY: 0,
  touchJump: false,
  touchSneak: false,
  touchSprint: false,
  touch: false,
};

export function consumeEdges() {
  const edges = { left: input.leftPressed, right: input.rightPressed, released: input.rightReleased, jump: input.jumpPressed, dx: input.dx, dy: input.dy, wheel: input.wheel };
  input.leftPressed = false;
  input.rightPressed = false;
  input.rightReleased = false;
  input.jumpPressed = false;
  input.dx = 0;
  input.dy = 0;
  input.wheel = 0;
  return edges;
}

export function releaseAll() {
  input.keys.clear();
  input.left = false;
  input.right = false;
  input.stickX = 0;
  input.stickY = 0;
  input.touchJump = false;
  input.touchSneak = false;
  input.touchSprint = false;
  consumeEdges();
}

export function pressLeft(down: boolean) {
  if (down && !input.left) input.leftPressed = true;
  input.left = down;
}

export function pressRight(down: boolean) {
  if (down && !input.right) input.rightPressed = true;
  if (!down && input.right) input.rightReleased = true;
  input.right = down;
}

export const held = (code: string) => input.keys.has(code);
