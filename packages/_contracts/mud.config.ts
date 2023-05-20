import { mudConfig } from "@latticexyz/world/register";

export default mudConfig({
  tables: {
    Counter: {
      keySchema: {},
      schema: "uint32",
    },
    Counter2: {
      keySchema: {},
      schema: "uint32",
    },
  },
});
