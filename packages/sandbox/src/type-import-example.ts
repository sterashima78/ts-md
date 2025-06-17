import type { Greeter } from './types.ts.md';

const greeter: Greeter = {
  greet(message: string) {
    console.log(message);
  },
};

greeter.greet('hello type import');
