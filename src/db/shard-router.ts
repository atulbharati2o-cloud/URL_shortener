import { decode } from "../utils/encoder.js";
import { shard0 } from "./shard0.js";
import { shard1 } from "./shard1.js";

export function getShardById(id: bigint) {
  return id % 2n === 0n ? shard0 : shard1;
}
