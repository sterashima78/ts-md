import type { Greeter } from './types.js';

const greeter: Greeter = {
  greet(message: string) {
    console.log(message);
  },
};

greeter.greet('hello type import');
