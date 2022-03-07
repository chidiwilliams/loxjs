export class Stack<T> {
  private values: T[] = [];

  peek() {
    return this.values[this.values.length - 1];
  }

  push(item: T) {
    this.values.push(item);
  }

  pop() {
    this.values.pop();
  }

  length() {
    return this.values.length;
  }

  get(i: number) {
    return this.values[i];
  }
}
