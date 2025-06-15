import type { Greeter } from './types.ts.md:greeter';

const greeter: Greeter = {
  greet(message) {
    console.log(message);
  },
};

greeter.greet('hello type import');
