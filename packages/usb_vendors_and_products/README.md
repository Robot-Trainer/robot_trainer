# usb-vendors-and-products

Small helper library to format USB vendor/product ids for Robot Trainer.

Usage:

```ts
import { makeKey } from '@robot-trainer/usb-vendors-and-products';
console.log(makeKey(0x1234, 0xabcd));
```