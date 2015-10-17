
export default function lazy (fn) {
  let value;
  let resolved = false;
  let resolving = false;
  return () => {
    if (resolving) {
      throw new Error('Recursive lazy value');
    }
    if (!resolved) {
      resolving = true;
      value = fn();
      resolving = false;
      resolved = true;
    }
    return value;
  };
}