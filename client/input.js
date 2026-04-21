export function createInputController(canvas, onShoot) {
  const state = {
    up: false,
    down: false,
    left: false,
    right: false,
    pointerX: 0,
    pointerY: 0
  };

  function updateKey(code, isPressed) {
    switch (code) {
      case "KeyW":
        state.up = isPressed;
        break;
      case "KeyS":
        state.down = isPressed;
        break;
      case "KeyA":
        state.left = isPressed;
        break;
      case "KeyD":
        state.right = isPressed;
        break;
      default:
        break;
    }
  }

  function handleKeyDown(event) {
    if (shouldIgnoreKeyboardEvent(event)) {
      return;
    }

    updateKey(event.code, true);
  }

  function handleKeyUp(event) {
    if (shouldIgnoreKeyboardEvent(event)) {
      return;
    }

    updateKey(event.code, false);
  }

  function handlePointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    state.pointerX = event.clientX - rect.left;
    state.pointerY = event.clientY - rect.top;
  }

  function handleMouseDown(event) {
    if (event.button !== 0) {
      return;
    }

    handlePointerMove(event);
    onShoot({
      screenX: state.pointerX,
      screenY: state.pointerY
    });
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", () => {
    state.up = false;
    state.down = false;
    state.left = false;
    state.right = false;
  });
  canvas.addEventListener("mousemove", handlePointerMove);
  canvas.addEventListener("mousedown", handleMouseDown);

  return {
    state,
    destroy() {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handlePointerMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
    }
  };
}

function shouldIgnoreKeyboardEvent(event) {
  const tagName = event.target?.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA";
}

export function getMovementInput(inputController) {
  return {
    up: inputController.state.up,
    down: inputController.state.down,
    left: inputController.state.left,
    right: inputController.state.right
  };
}

export function hasMovement(inputState) {
  return inputState.up || inputState.down || inputState.left || inputState.right;
}

export function getInputSignature(inputState) {
  return `${Number(inputState.up)}${Number(inputState.down)}${Number(inputState.left)}${Number(inputState.right)}`;
}
