export const RELATION_TYPES = ["딸", "아들", "엄마", "아빠", "친구"] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

export function isRelationType(value: string): value is RelationType {
  return (RELATION_TYPES as readonly string[]).includes(value);
}
